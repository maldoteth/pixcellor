/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Candidate = {
  name: string;
  trade?: string;
  phone?: string;
  email?: string;
  location?: string;
  source_url?: string;
  evidence?: string;
  has_standalone_website?: boolean;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const cleanEmail = (value: unknown) => {
  const email = cleanText(value, 255).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const normalize = (value: unknown) => cleanText(value, 200).toLowerCase().replace(/[^a-z0-9]+/g, "");
const normalizePhone = (value: unknown) => cleanText(value, 40).replace(/\D/g, "");

function isLikelyDuplicate(candidate: Candidate, existing: Array<Record<string, unknown>>) {
  const name = normalize(candidate.name);
  const phone = normalizePhone(candidate.phone);
  const email = cleanEmail(candidate.email);
  const location = normalize(candidate.location);

  return existing.some((contact) => {
    const contactPhone = normalizePhone(contact.phone);
    const contactEmail = cleanEmail(contact.email);
    if (email && contactEmail && email === contactEmail) return true;
    if (phone && contactPhone && phone.length >= 8 && phone === contactPhone) return true;
    const contactName = normalize(contact.name);
    const contactLocation = normalize(contact.location);
    return name && contactName && name === contactName && (!location || !contactLocation || location === contactLocation);
  });
}

async function requireAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Admin sign-in required");
  const { data: hasAdminRole } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!hasAdminRole) throw new Error("Admin access required");
}

async function searchFirecrawl(apiKey: string, query: string, limit: number) {
  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      country: "gb",
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firecrawl search failed (${response.status}): ${data?.error ?? "unknown error"}`);
  const results = Array.isArray(data?.data) ? data.data : Array.isArray(data?.web) ? data.web : [];
  return results.slice(0, limit).map((item: Record<string, unknown>) => ({
    url: cleanText(item.url, 500),
    title: cleanText(item.title, 180),
    description: cleanText(item.description, 300),
    markdown: cleanText(item.markdown, 2500),
  }));
}

async function extractCandidates(apiKey: string, trade: string, location: string, targetCount: number, searchResults: unknown[]) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: "Extract CRM leads for Pixcellor. Return only JSON: {\"businesses\":[{\"name\":string,\"trade\":string,\"phone\":string,\"email\":string,\"location\":string,\"source_url\":string,\"evidence\":string,\"has_standalone_website\":boolean}]}. Only include real local businesses that appear NOT to have their own standalone website. Reject directory pages that clearly show a website/domain for the business. Do not include raw scrape clutter, ratings, followers, UI labels, or long bios. Use empty strings for missing phone/email. Evidence must be short.",
        },
        {
          role: "user",
          content: JSON.stringify({ trade, location, targetCount, searchResults }),
        },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Lead extraction failed (${response.status})`);
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.businesses) ? parsed.businesses as Candidate[] : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trade: rawTrade, location: rawLocation, limit: rawLimit } = await req.json();
    const trade = cleanText(rawTrade, 80);
    const location = cleanText(rawLocation, 120);
    const limit = Math.min(Math.max(Number(rawLimit) || 10, 1), 25);
    if (!trade || !location) throw new Error("Trade and location are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey) throw new Error("Firecrawl connector is not configured");
    if (!lovableKey) throw new Error("Lovable AI is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    await requireAdmin(req, supabase);

    const query = `${trade} ${location} local business no website OR Facebook OR Instagram OR Yell OR Checkatrade OR Google Business`;
    const searchResults = await searchFirecrawl(firecrawlKey, query, Math.min(limit * 5, 60));
    const extracted = await extractCandidates(lovableKey, trade, location, limit, searchResults);

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name, phone, email, location")
      .limit(1000);

    const added: Candidate[] = [];
    const skippedDuplicates: Candidate[] = [];
    const rejectedWithWebsites: Candidate[] = [];
    const rejectedInvalid: Candidate[] = [];

    for (const candidate of extracted) {
      const name = cleanText(candidate.name, 100);
      if (!name) {
        rejectedInvalid.push(candidate);
        continue;
      }
      if (candidate.has_standalone_website === true) {
        rejectedWithWebsites.push(candidate);
        continue;
      }
      if (isLikelyDuplicate(candidate, [...(existing ?? []), ...added])) {
        skippedDuplicates.push(candidate);
        continue;
      }
      added.push({ ...candidate, name });
      if (added.length >= limit) break;
    }

    const rows = added.map((candidate) => ({
      name: cleanText(candidate.name, 100),
      phone: cleanText(candidate.phone, 40) || null,
      email: cleanEmail(candidate.email) || null,
      location: cleanText(candidate.location, 160) || location,
      notes: [
        `Trade: ${cleanText(candidate.trade, 80) || trade}`,
        "No standalone website found.",
        cleanText(candidate.evidence, 220),
        candidate.source_url ? `Source: ${cleanText(candidate.source_url, 400)}` : "",
      ].filter(Boolean).join("\n"),
      source: "lead_agent",
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("contacts").insert(rows);
      if (error) throw new Error(error.message);
    }

    return new Response(JSON.stringify({
      ok: true,
      query,
      searched: searchResults.length,
      extracted: extracted.length,
      added: rows.length,
      skipped_duplicates: skippedDuplicates.length,
      rejected_with_websites: rejectedWithWebsites.length,
      rejected_invalid: rejectedInvalid.length,
      contacts: rows.map((row) => ({ name: row.name, phone: row.phone, email: row.email, location: row.location, notes: row.notes })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: /required|invalid/i.test(message) ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});