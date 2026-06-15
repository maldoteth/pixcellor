/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHORT_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
function shortRef(len = 6) {
  let s = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += SHORT_ID_ALPHABET[buf[i] % SHORT_ID_ALPHABET.length];
  return s;
}

const SECTION_SCHEMA = `
Return strictly valid JSON matching this TypeScript type. No prose, no markdown fences.

type SiteDoc = {
  brand: {
    logo_url?: string;
    colors: { primary: string; accent: string; bg: string; surface: string; text: string; muted: string };
    fonts: { title: string; subtitle: string; body: string };
  };
  sections: Array<
    | { type: "hero"; eyebrow?: string; headline: string; sub: string; cta_label: string; cta_href: string }
    | { type: "features"; title: string; items: { icon: string; title: string; text: string }[] }
    | { type: "pricing"; title: string; tiers: { name: string; price: string; per?: string; blurb: string; features: string[]; featured?: boolean }[] }
    | { type: "faq"; title: string; items: { q: string; a: string }[] }
    | { type: "contact"; title: string; sub?: string; email: string }
    | { type: "footer"; tagline?: string; links: { label: string; href: string }[] }
  >;
};

Rules:
- Sections MUST appear in this order: hero, features, pricing, faq, contact, footer.
- features.items: 3–6 entries. icon is a lucide-react icon name in PascalCase (e.g. "Zap", "Sparkles", "Shield").
- pricing.tiers: 2–3 entries, one with featured:true.
- faq.items: 4–6 entries.
- All copy must be specific to the business brief — no lorem ipsum, no "your business name" placeholders.
- Keep tone confident, modern, conversion-focused.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("Missing LOVABLE_API_KEY");

    const body = await req.json();
    const {
      ref: existingRef,
      brief,
      display_name,
      business_type,
      email,
      brand,
      template_key,
      template_seed,
    } = body as {
      ref?: string;
      brief: string;
      display_name: string;
      business_type?: string;
      email?: string;
      brand: {
        logo_url?: string;
        colors: Record<string, string>;
        fonts: { title: string; subtitle: string; body: string };
      };
      template_key?: string;
      template_seed?: unknown;
    };

    if (!brief || !display_name || !brand?.colors || !brand?.fonts) {
      return new Response(JSON.stringify({ error: "Missing brief, display_name, or brand" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const prompt = `
You are generating the content for a high-conversion single-page marketing website.

BUSINESS BRIEF:
- Name: ${display_name}
- Type: ${business_type || "Not specified"}
- Description: ${brief}
${template_key ? `- Starter template: ${template_key} (use it as structural inspiration; rewrite all copy)` : "- No template selected — generate fresh."}
${template_seed ? `- Template hint JSON: ${JSON.stringify(template_seed).slice(0, 1500)}` : ""}

BRAND:
- Colors: ${JSON.stringify(brand.colors)}
- Fonts: title=${brand.fonts.title}, subtitle=${brand.fonts.subtitle}, body=${brand.fonts.body}

${SECTION_SCHEMA}

Return ONLY the JSON object (no \`\`\`json fences). Start with {.
`.trim();

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You produce strictly-typed JSON for a website generator." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway error ${aiRes.status}: ${t.slice(0, 300)}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI returned non-JSON");
      parsed = JSON.parse(m[0]);
    }

    // Merge user-supplied brand over AI brand (user wins)
    const doc = {
      ...parsed,
      brand: {
        ...(parsed.brand || {}),
        ...brand,
        colors: { ...(parsed.brand?.colors || {}), ...brand.colors },
        fonts: { ...(parsed.brand?.fonts || {}), ...brand.fonts },
      },
    };

    // Upsert
    let ref = existingRef;
    let id: string | undefined;

    if (ref) {
      const { data: existing } = await admin
        .from("byow_generated_sites")
        .select("id")
        .eq("ref", ref)
        .maybeSingle();
      if (existing) {
        const { error } = await admin
          .from("byow_generated_sites")
          .update({ doc, brief, display_name, email: email ?? undefined, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
        id = existing.id;
      } else {
        ref = undefined;
      }
    }

    if (!ref) {
      // Generate unique ref
      for (let i = 0; i < 5; i++) {
        const candidate = shortRef(6);
        const { data, error } = await admin
          .from("byow_generated_sites")
          .insert({
            ref: candidate,
            display_name,
            brief,
            email: email ?? null,
            doc,
            status: "draft",
          })
          .select("id, ref")
          .maybeSingle();
        if (!error && data) {
          id = data.id;
          ref = data.ref;
          break;
        }
      }
      if (!ref) throw new Error("Could not allocate a unique ref");
    }

    return new Response(JSON.stringify({ ref, id, doc }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("byow-generate-site error", e);
    return new Response(JSON.stringify({ error: e.message || "Failed to generate" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
