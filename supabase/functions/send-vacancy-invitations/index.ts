import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function genToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleRow } = await service.from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { vacancy_id, candidate_ids, custom_message, ai_meta } = await req.json();
    if (!vacancy_id || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return new Response(JSON.stringify({ error: "vacancy_id and candidate_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (candidate_ids.length > 200) {
      return new Response(JSON.stringify({ error: "Max 200 candidates per send" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: vac } = await service.from("vacancies").select("id,title,location,start_date,end_date,start_time,finish_time,schedule_days,pay_min,pay_max,pay_currency,pay_period,description, client_contact_id").eq("id", vacancy_id).single();
    if (!vac) return new Response(JSON.stringify({ error: "Vacancy not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: client } = await service.from("contacts").select("name").eq("id", vac.client_contact_id).maybeSingle();

    const { data: cands } = await service.from("candidates").select("id,full_name,email").in("id", candidate_ids);
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://pixcellor.com";

    const results: Array<{ candidate_id: string; status: string; error?: string }> = [];
    for (const c of (cands ?? [])) {
      if (!c.email) { results.push({ candidate_id: c.id, status: "skipped", error: "no email" }); continue; }
      const token = genToken();
      const aim = (ai_meta ?? []).find((m: any) => m.candidate_id === c.id);
      const { error: insErr } = await service.from("vacancy_invitations").insert({
        vacancy_id, candidate_id: c.id, token,
        ai_score: aim?.ai_score ?? null, ai_reason: aim?.ai_reason ?? null,
        custom_message: custom_message ?? null,
        sent_by_user_id: userRes.user.id, sent_by_email: userRes.user.email,
      });
      if (insErr) { results.push({ candidate_id: c.id, status: "error", error: insErr.message }); continue; }

      const confirmUrl = `${baseUrl}/vacancy/respond?token=${token}&action=confirm`;
      const declineUrl = `${baseUrl}/vacancy/respond?token=${token}&action=decline`;
      const idemp = `vacancy-invite-${token}`;
      const { error: mailErr } = await service.functions.invoke("send-transactional-email", {
        body: {
          templateName: "vacancy-invitation",
          recipientEmail: c.email,
          idempotencyKey: idemp,
          templateData: {
            candidateName: c.full_name,
            vacancyTitle: vac.title,
            clientName: client?.name ?? "our client",
            location: vac.location,
            startDate: vac.start_date,
            endDate: vac.end_date,
            startTime: vac.start_time,
            finishTime: vac.finish_time,
            scheduleDays: vac.schedule_days,
            payMin: vac.pay_min,
            payMax: vac.pay_max,
            payCurrency: vac.pay_currency,
            payPeriod: vac.pay_period,
            description: vac.description,
            customMessage: custom_message,
            confirmUrl,
            declineUrl,
          },
        },
      });
      if (mailErr) { results.push({ candidate_id: c.id, status: "mail_error", error: mailErr.message }); continue; }
      results.push({ candidate_id: c.id, status: "sent" });
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
