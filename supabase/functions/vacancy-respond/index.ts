import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    const action = body.action;
    if (!token || !["confirm", "decline"].includes(action)) {
      return new Response(JSON.stringify({ error: "token and action required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await service.rpc("vacancy_invitation_respond", { _token: token, _response: action });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const result = data as any;
    if (result?.already_responded) {
      return new Response(JSON.stringify({ ok: true, alreadyResponded: true, status: result.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch vacancy + candidate for emails
    const { data: vac } = await service.from("vacancies").select("title,location,start_date,end_date,start_time,finish_time,schedule_days,client_contact_id").eq("id", result.vacancy_id).single();
    const { data: cand } = await service.from("candidates").select("full_name,email").eq("id", result.candidate_id).single();
    const { data: client } = vac?.client_contact_id ? await service.from("contacts").select("name").eq("id", vac.client_contact_id).maybeSingle() : { data: null } as any;

    if (action === "confirm" && cand?.email) {
      await service.functions.invoke("send-transactional-email", {
        body: {
          templateName: "vacancy-confirmed",
          recipientEmail: cand.email,
          idempotencyKey: `vacancy-confirmed-${token}`,
          templateData: {
            candidateName: cand.full_name,
            vacancyTitle: vac?.title,
            clientName: client?.name ?? "the client",
            location: vac?.location,
            startDate: vac?.start_date,
            endDate: vac?.end_date,
            startTime: vac?.start_time,
            finishTime: vac?.finish_time,
            scheduleDays: vac?.schedule_days,
          },
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: result.status, vacancyTitle: vac?.title, clientName: client?.name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
