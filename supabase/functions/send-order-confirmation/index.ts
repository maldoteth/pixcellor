import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const PORTAL_ACCESS_CODE = "42069";

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

const templateForPackage = (packageName?: string | null) => {
  const clean = (packageName ?? "").toLowerCase();
  if (clean.includes("retainer")) return "retainer-order-confirmation";
  if (clean.includes("elite")) return "elite-order-confirmation";
  return "full-works-order-confirmation";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accessCode, sessionId } = await req.json();
    if (accessCode !== PORTAL_ACCESS_CODE) return json({ error: "Invalid portal access code" }, 401);
    if (typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
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
    if (order.payment_status !== "paid" && order.status !== "complete" && order.status !== "completed") {
      return json({ error: "Only paid orders can receive confirmation emails" }, 400);
    }

    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const packageName = typeof metadata.package_name === "string" ? metadata.package_name : "Full Works";
    const billing = typeof metadata.billing === "string" ? metadata.billing : order.mode || "payment";
    const templateData = {
      customerEmail: order.customer_email,
      orderId: order.session_id,
      packageName,
      amount: formatGBP(order.amount_total),
      billing,
    };

    const { data, error: sendError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: templateForPackage(packageName),
        recipientEmail: order.customer_email,
        idempotencyKey: `manual-order-confirmation-${order.session_id}-${Date.now()}`,
        templateData,
      },
    });

    if (sendError || data?.error) {
      console.error("Confirmation email send failed", { sendError, data });
      throw new Error(data?.error || sendError?.message || "Could not send confirmation email");
    }

    return json({ success: true, recipientEmail: order.customer_email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send confirmation email";
    console.error("send-order-confirmation failed", { message });
    return json({ error: message }, 500);
  }
});
