import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const formatGBP = (pence: number | null) =>
  typeof pence === "number" ? `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : null;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
      return json({ confirmed: false, error: "Invalid session id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Order status service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, mode, payment_status, status, amount_total, customer_email, metadata, order_code, requirements_token, domain, domain_status, domain_top_up_gbp")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ confirmed: false });

    const confirmed = data.payment_status === "paid" || data.status === "complete";
    const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata as Record<string, unknown> : {};
    const { data: requirements } = await supabase
      .from("project_requirements")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    return json({
      confirmed,
      paymentStatus: data.payment_status,
      status: data.status,
      packageName: typeof metadata.package_name === "string" ? metadata.package_name : null,
      amount: formatGBP(data.amount_total),
      customerEmail: data.customer_email,
      requirementsSubmitted: Boolean(requirements?.id),
      orderCode: data.order_code,
      requirementsToken: data.requirements_token,
      domain: (data as any).domain ?? null,
      domainStatus: (data as any).domain_status ?? null,
      domainTopUpGbp: (data as any).domain_top_up_gbp ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not check order status";
    return json({ confirmed: false, error: message }, 500);
  }
});
