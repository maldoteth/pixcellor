import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function uploadDataUrlToStorage(supabase: any, dataUrl: string): Promise<{ publicUrl: string | null; path: string | null }> {
  try {
    if (!dataUrl?.startsWith("data:")) {
      return { publicUrl: dataUrl ?? null, path: null };
    }
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
    const ext = mime.split("/")[1]?.split("+")[0] || "png";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const path = `vision-samples/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage.from("submission-attachments").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      console.error("vision upload failed", error);
      return { publicUrl: null, path: null };
    }
    const publicUrl = supabase.storage.from("submission-attachments").getPublicUrl(path).data.publicUrl;
    return { publicUrl, path };
  } catch (e) {
    console.error("uploadDataUrlToStorage error", e);
    return { publicUrl: null, path: null };
  }
}

const SYSTEM_PROMPT = `You are Pixcellor's senior landing-page art director. Generate ONE photorealistic, pixel-perfect screenshot of a complete DESKTOP landing page (1440x900 viewport, browser chrome NOT included) based on the user's description.

Hard rules — never break:
- Output a single tall full-page mockup that ALWAYS includes, in this order: top navigation, a strong HERO SECTION at the top (large headline, supporting subheadline, primary CTA button, and a hero visual or product mockup on the right or as a backdrop), a features/value section, a social-proof or showcase section, and a footer. Stack them vertically as one cohesive page screenshot.
- The HERO is mandatory in every output, even if the brief does not mention it. Treat it as the most important section — give it the most visual weight.
- Modern, premium, conversion-focused design. Generous whitespace. Strong visual hierarchy. Real-looking copy in English (NEVER use lorem ipsum, placeholder text, or gibberish). The hero headline must be specific to the business and industry — not generic.
- Crisp, legible typography. Clear primary CTA button in the hero with action-oriented text. Consistent spacing, alignment, and a tight color palette (max 3 colors + neutrals).
- Use real-looking imagery, icons, and UI components appropriate to the user's industry.
- Match the vibe (minimal / bold / playful / luxury / techy etc.) inferred from the prompt. If the user names colors or a brand feel, honour them precisely.
- Desktop layout only — multi-column where appropriate, never a mobile-stacked layout.
- No watermarks, no Pixcellor branding, no fictional logos that look like real companies.
- The page must look like a finished, ready-to-ship product, not a wireframe or sketch.

If the user description is vague, fill the gaps with tasteful, on-trend choices that fit their industry.`;

// Parse the structured brief produced by VisionGenerator (lines like "Company / brand name: X").
function parseBrief(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (val) out[key] = val;
  }
  return out;
}

function embellishBrief(raw: string): string {
  const f = parseBrief(raw);
  const company = f["company / brand name"] || f["company"] || f["brand"] || "";
  const industry = f["business"] || f["industry"] || "";
  const vibe = f["vibe"] || "";
  const colours = f["colours"] || f["colors"] || "";
  const headline = f["headline"] || "";
  const sections = f["sections"] || "";

  const lines: string[] = [];
  lines.push("DESIGN BRIEF — render a polished, ready-to-ship desktop landing page.");
  if (company) lines.push(`Brand name: "${company}". Display this prominently in the top-left logo, the hero, and the footer.`);
  if (industry) lines.push(`Industry / what they sell: ${industry}. Imagery, icons, product mockups, copy and example testimonials must all reflect this industry authentically.`);
  if (vibe) lines.push(`Vibe / mood: ${vibe}. Let this drive typography choice, image style, spacing, and overall feel.`);
  if (colours) lines.push(`Colour palette: ${colours}. Build the entire page around this palette — buttons, accents, backgrounds and section dividers all coordinated.`);
  if (headline) {
    lines.push(`Hero headline (use this as a starting point and polish it into a punchy, on-brand line): "${headline}".`);
  } else if (company || industry) {
    lines.push(`Write a punchy, original hero headline tailored to ${company || "the brand"}${industry ? ` (a ${industry})` : ""} — short, benefit-led, never generic.`);
  } else {
    lines.push("Write a short, punchy, benefit-led hero headline.");
  }
  lines.push("Hero must include: large headline, 1-line supporting subheadline that explains the value, a primary CTA button with confident action copy, and a relevant visual (product mockup, lifestyle photo, or illustrated scene).");
  if (sections) {
    lines.push(`Additional sections to include after the hero: ${sections}. Order them sensibly for conversion (value -> proof -> details -> contact).`);
  } else {
    lines.push("Include sensible follow-up sections after the hero: features/value, social proof or testimonials, a showcase or gallery, and a contact / footer block.");
  }
  if (raw && !company && !industry && !vibe && !colours && !headline && !sections) {
    // fallback: user freeform brief
    lines.push(`Additional notes from the user: ${raw}`);
  }
  lines.push("Keep copy real and specific — no lorem ipsum, no placeholder text. Make it look like a real shipped website.");
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prompt, imageUrl: inputImageUrl, instruction } = await req.json();
    const isEdit = !!inputImageUrl && typeof instruction === "string" && instruction.trim().length > 2;

    if (!isEdit && (!prompt || typeof prompt !== "string" || prompt.trim().length < 5)) {
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

    const enrichedBrief = isEdit ? "" : embellishBrief(prompt.trim());

    const messages = isEdit
      ? [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Refine this landing page mockup with the following changes, keeping the overall structure cohesive and high quality. The page must still include a strong hero section at the top:\n"""${instruction.trim()}"""\n\nReturn ONE updated full desktop landing page mockup (~1440px wide).` },
              { type: "image_url", image_url: { url: inputImageUrl } },
            ],
          },
        ]
      : [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${enrichedBrief}\n\nRender ONE full desktop landing page mockup matching this brief. Tall vertical screenshot, ~1440px wide. The HERO section is mandatory at the top.` },
        ];


    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
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
