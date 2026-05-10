import { corsHeaders } from "@supabase/supabase-js/cors";

const SYSTEM_PROMPT = `You are Pixcellor's senior landing-page art director. Generate ONE photorealistic, pixel-perfect screenshot of a complete DESKTOP landing page (1440x900 viewport, browser chrome NOT included) based on the user's description.

Hard rules — never break:
- Output a single tall full-page mockup that includes: top navigation, hero section, a features/value section, a social-proof or showcase section, and a footer. Stack them vertically as one cohesive page screenshot.
- Modern, premium, conversion-focused design. Generous whitespace. Strong visual hierarchy. Real-looking copy in English (NEVER use lorem ipsum, placeholder text, or gibberish).
- Crisp, legible typography. Clear primary CTA button in the hero. Consistent spacing, alignment, and a tight color palette (max 3 colors + neutrals).
- Use real-looking imagery, icons, and UI components appropriate to the user's industry.
- Match the vibe (minimal / bold / playful / luxury / techy) inferred from the prompt. If the user names colors or a brand feel, honour them.
- Desktop layout only — multi-column where appropriate, never a mobile-stacked layout.
- No watermarks, no Pixcellor branding, no fictional logos that look like real companies.
- The page must look like a finished, ready-to-ship product, not a wireframe or sketch.

If the user description is vague, fill the gaps with tasteful, on-trend SaaS/agency choices.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Please describe your dream landing page (at least a few words)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Design brief from the prospect:\n"""${prompt.trim()}"""\n\nRender ONE full desktop landing page mockup matching the brief. Tall vertical screenshot, ~1440px wide.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "We're getting too many requests right now. Please try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Vision credits exhausted. Please contact us." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Vision generation failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("No image in AI response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "No image was returned. Please try a different description." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-vision error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
