import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EditRequestSchema = z.object({
  orderCode: z.string().trim().regex(/^PXC-[A-HJ-NP-Z]{4}-\d{4}$/, "Invalid order link"),
  requirementsToken: z.string().trim().regex(/^[A-Fa-f0-9]{64}$/, "Invalid order access token"),
  requestDetails: z.string().trim().min(1, "Tell us what needs changing").max(6000),
  attachments: z.array(z.string().trim().url()).max(20).optional().default([]),
});

const normalizePackage = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const requestLimitForPackage = (packageName: string) => {
  const normalized = normalizePackage(packageName);
  if (normalized.includes("elite")) return null;
  if (normalized.includes("full works")) return 3;
  return undefined;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = EditRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Please check the form fields", fields: parsed.error.flatten().fieldErrors }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Edit request service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    const { data: order, error: orderError } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, customer_email, payment_status, status, order_status, metadata")
      .eq("order_code", parsed.data.orderCode)
      .eq("requirements_token", parsed.data.requirementsToken.toLowerCase())
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return json({ error: "This edit request link is invalid or has expired." }, 403);
    if (order.payment_status !== "paid" && order.status !== "complete" && order.status !== "completed") {
      return json({ error: "Edit requests are only available after a paid order." }, 403);
    }
    if (order.order_status !== "delivered") {
      return json({ error: "Edit requests open after your website has been delivered." }, 403);
    }

    const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata as Record<string, unknown> : {};
    const packageName = typeof metadata.package_name === "string" ? metadata.package_name : "";
    const requestLimit = requestLimitForPackage(packageName);
    if (requestLimit === undefined) {
      return json({ error: "Edit requests are available for Full Works and Elite orders only." }, 403);
    }

    const { count, error: countError } = await supabase
      .from("edit_requests")
      .select("id", { count: "exact", head: true })
      .eq("session_id", order.session_id);

    if (countError) throw countError;
    const usedRequests = count ?? 0;
    if (requestLimit !== null && usedRequests >= requestLimit) {
      return json({ error: "This Full Works order has used all 3 edit requests." }, 403);
    }

    const requestNumber = usedRequests + 1;
    const { error: insertError } = await supabase.from("edit_requests").insert({
      session_id: order.session_id,
      customer_email: order.customer_email,
      package_name: packageName,
      request_number: requestNumber,
      request_details: parsed.data.requestDetails,
      status: "open",
      attachments: parsed.data.attachments ?? [],
    });

    if (insertError) throw insertError;

    const { error: orderUpdateError } = await supabase
      .from("stripe_checkout_sessions")
      .update({ order_status: "open", updated_at: new Date().toISOString() })
      .eq("session_id", order.session_id);

    if (orderUpdateError) throw orderUpdateError;

    return json({
      success: true,
      requestNumber,
      remainingRequests: requestLimit === null ? null : Math.max(requestLimit - requestNumber, 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save edit request";
    console.error("submit-edit-request failed", { message });
    return json({ error: message }, 500);
  }
});
