import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const SITE_URL = "https://pixcellor.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BodySchema = z.object({
  sessionId: z.string().regex(/^(cs_(test|live)_[A-Za-z0-9]+|manual_[A-Za-z0-9]+)$/, "Invalid order id"),
});

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
};

const confirmationTemplates = ["full-works-order-confirmation", "elite-order-confirmation", "retainer-order-confirmation"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await requireAdmin(req);
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Please check the order details" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Requirements reminder service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    const { data: order, error: orderError } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, customer_email, payment_status, status, metadata")
      .eq("session_id", parsed.data.sessionId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ error: "Order not found" }, 404);
    if (!order.customer_email) return json({ error: "This order does not have a customer email" }, 400);
    if (order.payment_status !== "paid" && order.status !== "complete" && order.status !== "completed") {
      return json({ error: "Only paid orders can receive reminders" }, 400);
    }

    const { data: requirements, error: requirementsError } = await supabase
      .from("project_requirements")
      .select("id")
      .eq("session_id", order.session_id)
      .maybeSingle();
    if (requirementsError) throw requirementsError;
    if (requirements) return json({ error: "Requirements have already been submitted for this order" }, 409);

    const { data: confirmationLog, error: logError } = await supabase
      .from("email_send_log")
      .select("id")
      .eq("recipient_email", order.customer_email)
      .in("template_name", confirmationTemplates)
      .eq("status", "sent")
      .limit(1)
      .maybeSingle();
    if (logError) throw logError;
    if (!confirmationLog) return json({ error: "Send the order confirmation first" }, 400);

    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const packageName = typeof metadata.package_name === "string" ? metadata.package_name : "Pixcellor package";
    const { data: publicReference, error: publicReferenceError } = await supabase.rpc("ensure_order_public_reference", { _session_id: order.session_id });
    if (publicReferenceError) throw publicReferenceError;
    const orderCode = typeof publicReference?.order_code === "string" ? publicReference.order_code : order.session_id;
    const requirementsToken = typeof publicReference?.requirements_token === "string" ? publicReference.requirements_token : null;
    const requirementsUrl = requirementsToken
      ? `${SITE_URL}/project-requirements?order=${encodeURIComponent(orderCode)}&token=${encodeURIComponent(requirementsToken)}`
      : `${SITE_URL}/project-requirements`;

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: "project-requirements-reminder",
        recipientEmail: order.customer_email,
        idempotencyKey: `requirements-reminder-${order.session_id}-${Date.now()}`,
        templateData: { requirementsUrl, customerEmail: order.customer_email, orderId: orderCode, packageName },
      }),
    });
    const data = await emailResponse.json().catch(() => null);
    if (!emailResponse.ok || data?.error) throw new Error(data?.error || "Could not send requirements reminder");

    return json({ success: true, recipientEmail: order.customer_email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send requirements reminder";
    console.error("send-requirements-reminder failed", { message });
    return json({ error: message }, 500);
  }
});