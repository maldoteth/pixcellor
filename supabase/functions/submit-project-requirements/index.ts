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

const RequirementsSchema = z.object({
  orderCode: z.string().trim().regex(/^PXC-[A-HJ-NP-Z]{4}-\d{4}$/, "Invalid order link"),
  requirementsToken: z.string().trim().regex(/^[A-Fa-f0-9]{64}$/, "Invalid order access token"),
  siteName: z.string().trim().min(1, "Site name is required").max(160),
  siteContents: z.string().trim().min(1, "Site contents are required").max(4000),
  pagesDetails: z.string().trim().min(1, "Page details are required").max(6000),
  coloursStyles: z.string().trim().min(1, "Colours and style direction are required").max(4000),
  referenceLinks: z.string().trim().max(4000).optional().default(""),
  imagesContentSocials: z.string().trim().min(1, "Images, content, and socials are required").max(6000),
  extraNotes: z.string().trim().max(3000).optional().default(""),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = RequirementsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Please check the form fields", fields: parsed.error.flatten().fieldErrors }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Requirements service is not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    const { data: order, error: orderError } = await supabase
      .from("stripe_checkout_sessions")
      .select("session_id, customer_email, payment_status, status")
      .eq("order_code", parsed.data.orderCode)
      .eq("requirements_token", parsed.data.requirementsToken.toLowerCase())
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return json({ error: "This requirements link is invalid or has expired." }, 403);
    }
    if (order.payment_status !== "paid" && order.status !== "complete" && order.status !== "completed") {
      return json({ error: "This requirements link is only available after a paid order." }, 403);
    }

    const { error: upsertError } = await supabase.from("project_requirements").upsert(
      {
        session_id: order.session_id,
        customer_email: order.customer_email,
        site_name: parsed.data.siteName,
        site_contents: parsed.data.siteContents,
        pages_details: parsed.data.pagesDetails,
        colours_styles: parsed.data.coloursStyles,
        reference_links: parsed.data.referenceLinks || null,
        images_content_socials: parsed.data.imagesContentSocials,
        extra_notes: parsed.data.extraNotes || null,
      },
      { onConflict: "session_id" },
    );

    if (upsertError) throw upsertError;

    return json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save requirements";
    console.error("submit-project-requirements failed", { message });
    return json({ error: message }, 500);
  }
});
