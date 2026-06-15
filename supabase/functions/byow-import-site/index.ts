import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function normalizeUrl(input: string): string | null {
  let raw = (input || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  try {
    const u = new URL(raw);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ ok: false, error: "firecrawl_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url = normalizeUrl(String(body?.url || ""));
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Scrape with Firecrawl — markdown + branding in one call
    const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "branding"],
        onlyMainContent: true,
      }),
    });
    const fcJson = await fcRes.json().catch(() => ({}));
    if (!fcRes.ok) {
      console.error("firecrawl error", fcRes.status, fcJson);
      const status = fcRes.status === 402 ? 402 : 502;
      return new Response(JSON.stringify({
        ok: false, error: "scrape_failed", detail: fcJson?.error || fcRes.statusText,
      }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const doc = fcJson?.data ?? fcJson;
    const markdown: string = doc?.markdown || "";
    const metadata = doc?.metadata || {};
    const branding = doc?.branding || {};

    if (!markdown) {
      return new Response(JSON.stringify({ ok: false, error: "no_content" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Use AI gateway to summarize into brief + business_type + suggested name
    let aiResult: { display_name?: string; brief: string; business_type: string } = {
      brief: "",
      business_type: "",
    };

    if (lovableKey) {
      const trimmed = markdown.length > 8000 ? markdown.slice(0, 8000) : markdown;
      const prompt = `You are summarizing a website to seed a new website builder.

Source page title: ${metadata?.title || "(unknown)"}
Source URL: ${url}

Page content (markdown, may be truncated):
"""
${trimmed}
"""

Return strict JSON with keys:
- "display_name": short business name (max 60 chars).
- "business_type": one short phrase describing the industry/type (e.g. "Bakery", "SaaS for HR teams", "Pet salon"). Max 60 chars.
- "brief": 2–4 sentence plain-language description of what the business does, who they serve, what makes them different. No marketing fluff, no headings, no lists. 280–800 characters.
Only return the JSON object, no prose.`;

      try {
        const aiRes = await fetch(AI_GATEWAY, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You output only valid JSON." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        const aiJson = await aiRes.json().catch(() => ({}));
        if (aiRes.ok) {
          const content = aiJson?.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(content);
          aiResult = {
            display_name: typeof parsed.display_name === "string" ? parsed.display_name.slice(0, 60) : undefined,
            brief: String(parsed.brief || "").slice(0, 1500),
            business_type: String(parsed.business_type || "").slice(0, 60),
          };
        } else {
          console.warn("AI gateway error", aiRes.status, aiJson);
        }
      } catch (e) {
        console.warn("AI summarize failed", e);
      }
    }

    // Fallback brief from metadata if AI unavailable
    if (!aiResult.brief) {
      aiResult.brief = String(metadata?.description || markdown.slice(0, 400)).trim();
    }

    // 3. Map branding → wizard brand object
    const colors = branding?.colors || {};
    const fonts = branding?.fonts || [];
    const images = branding?.images || {};
    const brand = {
      logo_url: images?.logo || branding?.logo || undefined,
      colors: {
        primary: colors?.primary || "#111111",
        accent: colors?.accent || colors?.secondary || "#FF6B35",
        bg: colors?.background || "#FFFFFF",
        surface: "#F6F6F6",
        text: colors?.textPrimary || "#0A0A0A",
        muted: colors?.textSecondary || "#6B6B6B",
      },
      fonts: {
        title: fonts?.[0]?.family || "system-ui",
        subtitle: fonts?.[1]?.family || fonts?.[0]?.family || "system-ui",
        body: fonts?.[1]?.family || fonts?.[0]?.family || "system-ui",
      },
    };

    return new Response(JSON.stringify({
      ok: true,
      url,
      display_name: aiResult.display_name || metadata?.title || "",
      business_type: aiResult.business_type || "",
      brief: aiResult.brief || "",
      brand,
      chars: markdown.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("byow-import-site error", e);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
