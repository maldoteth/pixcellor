import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  headline: z.string().trim().max(200).optional().or(z.literal("")),
  current_role_title: z.string().trim().max(160).optional().or(z.literal("")),
  years_experience: z.number().int().min(0).max(80).optional(),
  desired_work_type: z.enum(["any","permanent","contract","temp","freelance"]).optional(),
  desired_arrangement: z.enum(["any","onsite","hybrid","remote"]).optional(),
  right_to_work: z.enum(["unknown","uk_citizen","settled","visa_required"]).optional(),
  skills: z.array(z.string().min(1).max(80)).max(50).optional(),
  linkedin_url: z.string().trim().max(500).optional().or(z.literal("")),
  portfolio_url: z.string().trim().max(500).optional().or(z.literal("")),
  cv_url: z.string().trim().max(2000).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  source: z.string().trim().max(40).optional(),
  source_detail: z.string().trim().max(200).optional(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  let raw: unknown;
  try { raw = await req.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json(400, { ok: false, error: "invalid_input", fields: parsed.error.flatten().fieldErrors });

  const p = parsed.data;
  if (!p.email && !p.phone) return json(400, { ok: false, error: "email_or_phone_required" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const payload = { ...p, source: p.source ?? "apply_page" };
  const { data, error } = await supabase.rpc("create_candidate_from_intake", { _payload: payload });
  if (error) return json(500, { ok: false, error: error.message });
  return json(200, { ok: true, result: data });
});
