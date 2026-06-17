const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const { file_base64, mime_type, filename } = await req.json();
    if (!file_base64 || !mime_type) return json(400, { ok: false, error: "file_base64 and mime_type required" });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { ok: false, error: "AI not configured" });

    const systemPrompt = `Extract structured candidate information from this CV/resume. Return ONLY valid JSON matching this schema (omit fields you cannot find):
{
  "full_name": string,
  "email": string,
  "phone": string,
  "location": string,
  "headline": string,
  "current_role_title": string,
  "years_experience": number,
  "skills": string[],
  "linkedin_url": string,
  "portfolio_url": string,
  "notes": string (brief summary)
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Parse this CV (${filename ?? "file"}). Return JSON only.` },
              { type: "file", file: { filename: filename ?? "cv.pdf", file_data: `data:${mime_type};base64,${file_base64}` } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json(aiRes.status, { ok: false, error: `AI error: ${errText.slice(0, 300)}` });
    }

    const aiJson = await aiRes.json();
    let content: string = aiJson.choices?.[0]?.message?.content ?? "";
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return json(200, { ok: true, data: parsed });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Failed to parse CV" });
  }
});
