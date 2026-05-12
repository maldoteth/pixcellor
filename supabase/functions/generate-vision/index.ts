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
    const { error } = await supabase.storage.from("vision-previews").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      console.error("vision upload failed", error);
      return { publicUrl: null, path: null };
    }
    const publicUrl = supabase.storage.from("vision-previews").getPublicUrl(path).data.publicUrl;
    return { publicUrl, path };
  } catch (e) {
    console.error("uploadDataUrlToStorage error", e);
    return { publicUrl: null, path: null };
  }
}

const GOOGLE_FONTS_SHORTLIST = `Use ONLY Google Fonts. Pick ONE heading font + ONE body font from this curated list, choosing the pairing that best fits the industry and vibe. Do NOT use generic system fonts (Arial, Helvetica, Times, default Roboto) unless the brief explicitly demands it.

- Modern / SaaS / tech: Inter, Manrope, Plus Jakarta Sans, Space Grotesk, DM Sans, Geist
- Editorial / luxury / fashion: Playfair Display, Cormorant Garamond, Fraunces, Libre Caslon Text, DM Serif Display
- Bold / display / agency: Bricolage Grotesque, Archivo, Unbounded, Syne, Anton
- Friendly / playful / lifestyle: Outfit, Poppins, Quicksand, Nunito, Rubik
- Premium serif body: Lora, Source Serif 4, Merriweather, Crimson Pro
- Mono accents (only as accent, never body): JetBrains Mono, IBM Plex Mono, Space Mono`;

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

TYPOGRAPHY — strict:
${GOOGLE_FONTS_SHORTLIST}

If the user description is vague, fill the gaps with tasteful, on-trend choices that fit their industry.`;

const BRAND_KIT_SYSTEM = `You are a senior brand designer. Inspect the supplied landing-page mockup AND the original brief, then return the precise brand kit actually visible in the design.

Rules:
- palette: 3 to 5 entries covering primary, secondary, accent, and neutrals. Each is { name, hex } where hex is a real hex code like "#0F172A". Names should describe the colour role ("Primary", "Accent", "Surface", "Ink").
- fonts: pick the heading + body font that visibly match the mockup. They MUST be valid Google Fonts taken from this curated shortlist:
${GOOGLE_FONTS_SHORTLIST}
- Never invent fonts that don't exist on Google Fonts.
- Always return all fields even if you have to estimate.`;

async function extractAndSaveBrandKit(opts: {
  supabase: any;
  apiKey: string;
  imageRefUrl: string;
  briefForKit: string;
  previewSlug: string | null;
  generationId: string | null;
}) {
  const { supabase, apiKey, imageRefUrl, briefForKit, previewSlug, generationId } = opts;
  if (!previewSlug && !generationId) return;
  try {
    const kitRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: BRAND_KIT_SYSTEM },
          { role: "user", content: [
            { type: "text", text: `Brief:\n${briefForKit}\n\nReturn the brand kit visible in the attached mockup.` },
            { type: "image_url", image_url: { url: imageRefUrl } },
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
                    heading: {
                      type: "object",
                      properties: { family: { type: "string" }, weights: { type: "array", items: { type: "number" } } },
                      required: ["family"], additionalProperties: false,
                    },
                    body: {
                      type: "object",
                      properties: { family: { type: "string" }, weights: { type: "array", items: { type: "number" } } },
                      required: ["family"], additionalProperties: false,
                    },
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
      console.error("brand kit gateway error", kitRes.status, await kitRes.text());
      return;
    }
    const kitData = await kitRes.json();
    const argsStr = kitData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsStr) return;
    const parsed = JSON.parse(argsStr);
    const palette = parsed?.palette ?? null;
    const fonts = parsed?.fonts ?? null;
    if (!palette && !fonts) return;
    const updates: Promise<unknown>[] = [];
    if (previewSlug) {
      updates.push(supabase.from("vision_previews").update({ palette, fonts }).eq("slug", previewSlug));
    }
    if (generationId) {
      updates.push(supabase.from("ai_sample_generations").update({ palette, fonts }).eq("id", generationId));
    }
    await Promise.all(updates);
  } catch (e) {
    console.error("extractAndSaveBrandKit failed", e);
  }
}

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
    const body = await req.json();
    const { prompt, imageUrl: inputImageUrl, instruction, meta } = body ?? {};
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
    const rawImageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!rawImageUrl) {
      console.error("No image in AI response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "No image was returned. Please try a different description." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload data URL to public storage so admins can view it later
    let imageUrl = rawImageUrl;
    let storagePath: string | null = null;
    let generationId: string | null = null;
    let previewSlug: string | null = null;
    // palette + fonts are filled in by a background brand-kit job after this response returns
    const palette: any = null;
    const fonts: any = null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    try {
      const uploaded = await uploadDataUrlToStorage(supabase, rawImageUrl);
      if (uploaded.publicUrl) imageUrl = uploaded.publicUrl;
      if (uploaded.path) storagePath = uploaded.path;

      // Log the generation regardless of contact info
      const briefText = isEdit
        ? `Refinement: ${String(instruction ?? "").trim().slice(0, 4000)}`
        : String(prompt ?? "").trim().slice(0, 8000);
      const cleanStr = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : null) || null;

      // Create a shareable preview row so this sample gets a /preview/{slug} link
      // (previewSlug declared in outer scope so background brand-kit task can read it)
      if (storagePath) {
        try {
          const slug = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          const previewTitle = cleanStr(meta?.company, 200) || cleanStr(meta?.name, 200) || "Visitor sample";
          const { error: prevErr } = await supabase.from("vision_previews").insert({
            slug,
            image_path: storagePath,
            title: previewTitle,
            brief: briefText,
            client_email: cleanStr(meta?.email?.toLowerCase?.() ?? meta?.email, 200),
            created_by_email: cleanStr(meta?.email?.toLowerCase?.() ?? meta?.email, 200),
            palette,
            fonts,
          });
          if (prevErr) console.error("vision_previews insert failed:", prevErr);
          else previewSlug = slug;
        } catch (e) {
          console.error("vision_previews insert threw:", e);
        }
      }

      const { data: inserted, error: insErr } = await supabase
        .from("ai_sample_generations")
        .insert({
          visitor_id: cleanStr(meta?.visitor_id, 200),
          source: cleanStr(meta?.source, 80) ?? "vision_generator",
          brief: briefText,
          image_url: imageUrl,
          storage_path: storagePath,
          company: cleanStr(meta?.company, 200),
          contact_name: cleanStr(meta?.name, 200),
          email: cleanStr(meta?.email?.toLowerCase?.() ?? meta?.email, 200),
          phone: cleanStr(meta?.phone, 40),
          parent_id: cleanStr(meta?.parent_id, 64),
          is_refinement: !!isEdit,
          metadata: meta ?? {},
          preview_slug: previewSlug,
          palette,
          fonts,
        })
        .select("id")
        .single();
      if (insErr) console.error("ai_sample_generations insert failed:", insErr);
      else generationId = inserted?.id ?? null;

      // Mirror lead into contacts so it appears in the Clients tab as a hot lead.
      // NOTE: contacts.name = company name, contacts.contact_name = person's name.
      // The contacts table has no `company` column.
      try {
        const leadEmail = cleanStr(meta?.email?.toLowerCase?.() ?? meta?.email, 200);
        const leadPhone = cleanStr(meta?.phone, 40);
        const leadCompany = cleanStr(meta?.company, 200);
        const leadName = cleanStr(meta?.name, 200);
        if (leadEmail || leadPhone) {
          let existing: { id: string; status: string | null; name: string | null; email: string | null; phone: string | null; contact_name: string | null; notes: string | null } | null = null;
          if (leadEmail) {
            const { data } = await supabase
              .from("contacts")
              .select("id,status,name,email,phone,contact_name,notes")
              .ilike("email", leadEmail)
              .limit(1)
              .maybeSingle();
            existing = data ?? null;
          }
          if (!existing && leadPhone) {
            const { data } = await supabase
              .from("contacts")
              .select("id,status,name,email,phone,contact_name,notes")
              .eq("phone", leadPhone)
              .limit(1)
              .maybeSingle();
            existing = data ?? null;
          }

          const noteLine = `AI sample generated${leadCompany ? ` for ${leadCompany}` : ""} — ${new Date().toISOString().slice(0, 10)}`;

          if (existing) {
            const protectedStatus = existing.status === "gold" || existing.status === "archived";
            const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (!protectedStatus) patch.status = "hot";
            if (!existing.email && leadEmail) patch.email = leadEmail;
            if (!existing.phone && leadPhone) patch.phone = leadPhone;
            if ((!existing.contact_name || existing.contact_name.trim() === "") && leadName) {
              patch.contact_name = leadName;
            }
            // contacts.name holds the company / brand. Prefer company when present.
            if ((!existing.name || existing.name.trim() === "" || existing.name === "AI sample lead") && (leadCompany || leadName)) {
              patch.name = leadCompany || leadName;
            }
            patch.notes = existing.notes ? `${existing.notes}\n${noteLine}` : noteLine;
            const { error: updErr } = await supabase.from("contacts").update(patch).eq("id", existing.id);
            if (updErr) console.error("contacts update failed:", updErr);
          } else {
            const { error: insContactErr } = await supabase.from("contacts").insert({
              name: leadCompany || leadName || "AI sample lead",
              email: leadEmail,
              phone: leadPhone,
              contact_name: leadName,
              status: "hot",
              source: "ai_vision_generator",
              industry: "general",
              notes: noteLine,
            });
            if (insContactErr) console.error("contacts insert failed:", insContactErr);
          }
        }
      } catch (contactErr) {
        console.error("vision contact upsert failed:", contactErr);
      }
    } catch (logErr) {
      console.error("vision logging failed:", logErr);
    }

    return new Response(JSON.stringify({ imageUrl, generationId, storagePath, palette, fonts }), {
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
