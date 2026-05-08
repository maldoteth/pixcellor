import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  sampleId: z.string().uuid(),
  deliveredDomain: z.string().trim().min(3).max(253),
});

const cleanDomain = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//i, "")
  .replace(/\/.*$/, "")
  .replace(/^www\./i, "");

const requireAdmin = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) throw new Error("Authentication is not configured");
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: sessionData, error: sessionError } = await client.auth.getUser();
  if (sessionError || !sessionData.user) throw new Error("Unauthorized");
  const { data: isAdmin, error: roleError } = await client.rpc("has_role", { _user_id: sessionData.user.id, _role: "admin" });
  if (roleError || !isAdmin) throw new Error("Admin access required");
  return authHeader;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const adminAuthHeader = await requireAdmin(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Please check the delivery details" }, 400);

    const deliveredDomain = cleanDomain(parsed.data.deliveredDomain);
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(deliveredDomain)) {
      return json({ error: "Enter a valid delivered domain" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Sample delivery service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: adminAuthHeader } },
    });

    const { data: sample, error: sampleError } = await supabase
      .from("lets_talk_leads")
      .select("id, name, email, source, package_name")
      .eq("id", parsed.data.sampleId)
      .maybeSingle();

    if (sampleError) throw new Error("Could not find this sample");
    if (!sample) return json({ error: "Sample not found" }, 404);
    if (sample.source !== "free_sample_request") return json({ error: "Not a free sample request" }, 400);
    if (!sample.email) return json({ error: "This sample request has no email address" }, 400);

    const { error: rpcError } = await adminClient.rpc("portal_mark_sample_delivered", {
      _sample_id: parsed.data.sampleId,
      _delivered_domain: deliveredDomain,
    });
    if (rpcError) throw new Error(rpcError.message || "Could not mark sample delivered");

    const deliveredUrl = `https://${deliveredDomain}`;
    const packageName = sample.package_name || "Free sample";

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: "order-complete",
        recipientEmail: sample.email,
        idempotencyKey: `sample-delivered-${sample.id}-${deliveredDomain}-${Math.floor(Date.now() / 60000)}`,
        templateData: {
          customerEmail: sample.email,
          packageName,
          deliveredDomain,
          deliveredUrl,
        },
      }),
    });
    const data = await emailResponse.json().catch(() => null);
    if (!emailResponse.ok || data?.error) {
      return json({
        success: true,
        emailWarning: data?.error || "Delivery email could not be sent",
        recipientEmail: sample.email,
        deliveredDomain,
      });
    }

    return json({ success: true, recipientEmail: sample.email, deliveredDomain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not deliver sample";
    console.error("send-sample-delivered failed", { message });
    return json({ error: message }, 500);
  }
});
