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
  sessionId: z.string().regex(/^(cs_(test|live)_[A-Za-z0-9]+|manual_[A-Za-z0-9]+)$/, "Invalid order id"),
  deliveredDomain: z.string().trim().min(3).max(253),
});

const requireAdmin = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) throw new Error("Authentication is not configured");
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: sessionData, error: sessionError } = await client.auth.getUser();
  if (sessionError || !sessionData.user) {
    console.error("Admin auth check failed", { message: sessionError?.message });
    throw new Error("Unauthorized");
  }
  const { data: isAdmin, error: roleError } = await client.rpc("has_role", { _user_id: sessionData.user.id, _role: "admin" });
  if (roleError || !isAdmin) {
    console.error("Admin role check failed", { message: roleError?.message, userId: sessionData.user.id });
    throw new Error("Admin access required");
  }
  return authHeader;
};

const cleanDomain = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//i, "")
  .replace(/\/.*$/, "")
  .replace(/^www\./i, "");

const formatGBP = (amount: number | null) =>
  typeof amount === "number" ? `£${(amount / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : undefined;

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
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Order completion service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: adminAuthHeader } },
    });

    const { data: order, error: orderError } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, payment_status, status, amount_total, customer_email, mode, metadata, order_code, requirements_token")
      .eq("session_id", parsed.data.sessionId)
      .maybeSingle();

    if (orderError) {
      console.error("Order lookup failed", { message: orderError.message, sessionId: parsed.data.sessionId });
      throw new Error("Could not find this order");
    }
    if (!order) return json({ error: "Order not found" }, 404);
    if (!order.customer_email) return json({ error: "This order does not have a customer email" }, 400);
    if (order.payment_status !== "paid" && order.status !== "complete" && order.status !== "completed") {
      return json({ error: "Only paid orders can be marked complete" }, 400);
    }

    const { error: deliveredError } = await adminClient.rpc("portal_mark_order_delivered", {
      _session_id: parsed.data.sessionId,
      _delivered_domain: deliveredDomain,
    });
    if (deliveredError) {
      console.error("Mark delivered RPC failed", { message: deliveredError.message, sessionId: parsed.data.sessionId, deliveredDomain });
      throw new Error(deliveredError.message || "Could not mark order delivered");
    }

    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const packageName = typeof metadata.package_name === "string" ? metadata.package_name : "Pixcellor package";
    const orderCode = typeof order.order_code === "string" ? order.order_code : order.session_id;
    const deliveredUrl = `https://${deliveredDomain}`;
    // All active packages are retainers — edit requests are always available on a paid order.
    const canRequestEdits = true;
    void packageName;
    const editRequestUrl = canRequestEdits && order.order_code && order.requirements_token
      ? `${req.headers.get("origin") || "https://pixcellor.com"}/edit-request?order=${encodeURIComponent(order.order_code)}&token=${encodeURIComponent(order.requirements_token)}`
      : undefined;

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: "order-complete",
        recipientEmail: order.customer_email,
        idempotencyKey: `order-complete-${order.session_id}-${deliveredDomain}-${Math.floor(Date.now() / 60000)}`,
        templateData: {
          sessionId: order.session_id,
          orderId: orderCode,
          customerEmail: order.customer_email,
          packageName,
          amount: formatGBP(order.amount_total),
          deliveredDomain,
          deliveredUrl,
          editRequestUrl,
        },
      }),
    });
    const data = await emailResponse.json().catch(() => null);
    if (!emailResponse.ok || data?.error) {
      console.error("Completion email send failed after delivery update", {
        status: emailResponse.status,
        data,
        sessionId: order.session_id,
        recipientEmail: order.customer_email,
      });
      return json({
        success: true,
        emailWarning: data?.error || "Completion email could not be sent",
        recipientEmail: order.customer_email,
        deliveredDomain,
      });
    }

    return json({ success: true, recipientEmail: order.customer_email, deliveredDomain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete order";
    console.error("send-order-complete failed", { message });
    return json({ error: message }, 500);
  }
});
