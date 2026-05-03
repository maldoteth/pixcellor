// Admin-only test sender for the order-complete template.
// Sends a real email through the same pipeline used in production
// so you can confirm deliverability to a specific address.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BodySchema = z.object({
  recipientEmail: z.string().email(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Provide a valid recipientEmail" }, 400);

    const recipientEmail = parsed.data.recipientEmail.trim().toLowerCase();
    const sampleId = `test-${Date.now()}`;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateName: "order-complete",
        recipientEmail,
        idempotencyKey: `order-complete-test-${sampleId}`,
        templateData: {
          sessionId: sampleId,
          orderId: "PXC-TEST-0001",
          customerEmail: recipientEmail,
          packageName: "Pixcellor Test Package",
          amount: "£0.00",
          deliveredDomain: "example.com",
          deliveredUrl: "https://example.com",
        },
      }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || data?.error) {
      return json({ error: data?.error || `Send failed (HTTP ${resp.status})` }, 500);
    }
    return json({ success: true, recipientEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test send failed";
    return json({ error: message }, 500);
  }
});
