import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_FONTS_SHORTLIST = `Use ONLY Google Fonts. Pick ONE heading font + ONE body font that match the mockup.

- Modern / SaaS / tech: Inter, Manrope, Plus Jakarta Sans, Space Grotesk, DM Sans, Geist
- Editorial / luxury / fashion: Playfair Display, Cormorant Garamond, Fraunces, Libre Caslon Text, DM Serif Display
- Bold / display / agency: Bricolage Grotesque, Archivo, Unbounded, Syne, Anton
- Friendly / playful / lifestyle: Outfit, Poppins, Quicksand, Nunito, Rubik
- Premium serif body: Lora, Source Serif 4, Merriweather, Crimson Pro
- Mono accents: JetBrains Mono, IBM Plex Mono, Space Mono`;

const BRAND_KIT_SYSTEM = `You are a senior brand designer. Inspect the supplied landing-page mockup and brief, return the precise brand kit visible in the design.

Rules:
- palette: 3–5 entries { name, hex } where hex is a real hex like "#0F172A". Names describe role ("Primary", "Accent", "Surface", "Ink").
- fonts: heading + body — must be valid Google Fonts from this shortlist:
${GOOGLE_FONTS_SHORTLIST}
- Never invent fonts. Always return all fields.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const slug: string | undefined = body?.slug;
    const imageUrl: string | undefined = body?.imageUrl;
    const brief: string = String(body?.brief ?? "").slice(0, 4000);
    if (!slug || !imageUrl) {
      return new Response(JSON.stringify({ error: "slug and imageUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const kitRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BRAND_KIT_SYSTEM },
          { role: "user", content: [
            { type: "text", text: `Brief:\n${brief}\n\nReturn the brand kit visible in the attached mockup.` },
            { type: "image_url", image_url: { url: imageUrl } },
          ] },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_brand_kit",
            description: "Return the brand kit for the generated mockup.",
            parameters: {
              type: "object",
              properties: {
                palette: {
                  type: "array", minItems: 3, maxItems: 5,
                  items: {
                    type: "object",
                    properties: { name: { type: "string" }, hex: { type: "string" } },
                    required: ["name", "hex"], additionalProperties: false,
                  },
                },
                fonts: {
                  type: "object",
                  properties: {
                    heading: { type: "object", properties: { family: { type: "string" }, weights: { type: "array", items: { type: "number" } } }, required: ["family"], additionalProperties: false },
                    body: { type: "object", properties: { family: { type: "string" }, weights: { type: "array", items: { type: "number" } } }, required: ["family"], additionalProperties: false },
                  },
                  required: ["heading", "body"], additionalProperties: false,
                },
              },
              required: ["palette", "fonts"], additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_brand_kit" } },
      }),
    });
    if (!kitRes.ok) {
      const txt = await kitRes.text();
      console.error("brand kit gateway error", kitRes.status, txt);
      return new Response(JSON.stringify({ error: "brand kit failed", detail: txt }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const kitData = await kitRes.json();
    const argsStr = kitData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) {
      return new Response(JSON.stringify({ error: "no kit args" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(argsStr);
    const palette = parsed?.palette ?? null;
    const fonts = parsed?.fonts ?? null;

    const { error: updErr } = await supabase
      .from("vision_previews")
      .update({ palette, fonts })
      .eq("slug", slug);
    if (updErr) {
      console.error("vision_previews update failed", updErr);
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, palette, fonts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-vision-brand-kit error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
