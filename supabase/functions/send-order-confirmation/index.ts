import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SITE_URL = "https://pixcellor.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const formatGBP = (amount: number | null) =>
  typeof amount === "number" ? `£${(amount / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : undefined;

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

const templateForPackage = (packageName?: string | null) => {
  const clean = (packageName ?? "").toLowerCase();
  if (clean.includes("retainer")) return "retainer-order-confirmation";
  if (clean.includes("elite")) return "elite-order-confirmation";
  return "full-works-order-confirmation";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAdmin(req);
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string" || !/^(cs_(test|live)_[A-Za-z0-9]+|manual_[A-Za-z0-9]+)$/.test(sessionId)) {
      return json({ error: "Invalid order id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Order confirmation service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });
    const { data: order, error } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, payment_status, status, amount_total, customer_email, mode, metadata")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!order) return json({ error: "Order not found" }, 404);
    if (!order.customer_email) return json({ error: "This order does not have a customer email" }, 400);

    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const isPaid = order.payment_status === "paid" || order.status === "complete" || order.status === "completed";
    const isCustomManual = metadata.source === "admin_manual";
    const paymentLinkUrl = typeof metadata.payment_link_url === "string" ? metadata.payment_link_url : null;

    const { data: publicReference, error: publicReferenceError } = await supabase.rpc("ensure_order_public_reference", { _session_id: order.session_id });
    if (publicReferenceError) throw publicReferenceError;
    const orderCode = typeof publicReference?.order_code === "string" ? publicReference.order_code : order.session_id;
    const requirementsToken = typeof publicReference?.requirements_token === "string" ? publicReference.requirements_token : null;

    const packageName = typeof metadata.package_name === "string" ? metadata.package_name : "Full Works";
    const customLabel = typeof metadata.custom_label === "string" ? metadata.custom_label : null;
    const billing = typeof metadata.billing === "string" ? metadata.billing : order.mode || "payment";

    let templateName: string;
    let templateData: Record<string, unknown>;
    let idempotencyKey: string;

    if (isCustomManual && !isPaid) {
      if (!paymentLinkUrl) return json({ error: "This custom order has no Stripe payment link yet" }, 400);
      templateName = "custom-invoice";
      templateData = {
        description: customLabel || packageName,
        amountFormatted: formatGBP(order.amount_total),
        paymentUrl: paymentLinkUrl,
        orderId: orderCode,
        customerEmail: order.customer_email,
      };
      idempotencyKey = `manual-custom-invoice-${order.session_id}-${Date.now()}`;
    } else {
      if (!isPaid) return json({ error: "Only paid orders can receive confirmation emails" }, 400);
      const requirementsUrl = requirementsToken
        ? `${SITE_URL}/project-requirements?order=${encodeURIComponent(orderCode)}&token=${encodeURIComponent(requirementsToken)}`
        : `${SITE_URL}/project-requirements`;
      templateName = templateForPackage(packageName);
      templateData = {
        requirementsUrl,
        customerEmail: order.customer_email,
        orderId: orderCode,
        packageName,
        amount: formatGBP(order.amount_total),
        billing,
      };
      idempotencyKey = `order-confirmation-${order.session_id}`;
    }

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName,
        recipientEmail: order.customer_email,
        idempotencyKey,
        templateData,
      }),
    });
    const data = await emailResponse.json().catch(() => null);

    if (!emailResponse.ok || data?.error) {
      console.error("Confirmation email send failed", { status: emailResponse.status, data });
      throw new Error(data?.error || "Could not send confirmation email");
    }

    return json({ success: true, recipientEmail: order.customer_email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send confirmation email";
    console.error("send-order-confirmation failed", { message });
    return json({ error: message }, 500);
  }
});
