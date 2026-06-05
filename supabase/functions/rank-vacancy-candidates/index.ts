import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { vacancy_id, limit = 100 } = await req.json();
    if (!vacancy_id) return new Response(JSON.stringify({ error: "vacancy_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Fetch vacancy
    const { data: vac } = await supabase.from("vacancies").select("id,title,description,location,arrangement,employment_type,required_skills,nice_to_have_skills,qualifications,certifications,right_to_work_required,pay_min,pay_max,pay_currency,pay_period,schedule_days,start_date,end_date").eq("id", vacancy_id).single();
    if (!vac) return new Response(JSON.stringify({ error: "Vacancy not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: baselineRaw, error: rankErr } = await supabase.rpc("portal_rank_candidates_for_vacancy", { _vacancy_id: vacancy_id, _limit: Math.min(Math.max(limit, 10), 100) });
    if (rankErr) return new Response(JSON.stringify({ error: rankErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const baseline = (baselineRaw as any[]) ?? [];
    if (baseline.length === 0) return new Response(JSON.stringify({ candidates: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // AI re-rank
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ candidates: baseline }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const compact = baseline.map((c) => ({
      id: c.id, name: c.full_name, headline: c.headline, location: c.location,
      skills: c.skills, status: c.status, rtw: c.right_to_work, exp: c.years_experience,
      work_type: c.desired_work_type, arrangement: c.desired_arrangement, base_score: c.score,
    }));
    const prompt = `You are a recruitment matching assistant. Given a vacancy and a list of candidates, rank them by fit (0-100) and give a one-sentence reason each.\n\nVACANCY: ${JSON.stringify(vac)}\n\nCANDIDATES: ${JSON.stringify(compact)}\n\nReturn ONLY a JSON array (no prose) like: [{"id":"uuid","score":92,"reason":"..."}, ...] sorted by score descending. Include all candidates.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI rank failed", aiRes.status, errText);
      return new Response(JSON.stringify({ candidates: baseline, ai_error: aiRes.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "[]";
    let ranked: Array<{ id: string; score: number; reason: string }> = [];
    try {
      const parsed = JSON.parse(content);
      ranked = Array.isArray(parsed) ? parsed : (parsed.candidates ?? parsed.results ?? []);
    } catch { ranked = []; }

    const byId = new Map(baseline.map((c: any) => [c.id, c]));
    const merged = ranked
      .filter((r) => byId.has(r.id))
      .map((r) => ({ ...byId.get(r.id), ai_score: r.score, ai_reason: r.reason }));
    // Append any missing baseline at end
    for (const b of baseline) if (!ranked.find((r) => r.id === b.id)) merged.push({ ...b, ai_score: b.score, ai_reason: null });

    return new Response(JSON.stringify({ candidates: merged }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
