// Pixcellor customer-portal support agent.
// - Authenticated only (user JWT required)
// - Admins (has_role(uid,'admin')) can manage any user; non-admins only themselves
// - Uses Lovable AI Gateway with tool calling

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

// ---------- Tool definitions exposed to the model ----------
const tools = [
  {
    type: "function",
    function: {
      name: "get_account_overview",
      description:
        "Fetch a complete snapshot of an account: orders, subscriptions, project briefs/requirements, edit requests, leads, affiliate codes & referrals, call bookings. Defaults to the signed-in user. Admins may pass target_user_id or target_email to inspect any user.",
      parameters: {
        type: "object",
        properties: {
          target_user_id: { type: "string", description: "Admin only. UUID of user to inspect." },
          target_email: { type: "string", description: "Admin only. Email to look up." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_stripe_payments",
      description:
        "List recent Stripe checkout sessions / payments. Non-admins see only their own (by email). Admins can pass target_email.",
      parameters: {
        type: "object",
        properties: {
          target_email: { type: "string" },
          limit: { type: "number", default: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_edit_request",
      description: "File an edit request against one of the user's orders. session_id is the Stripe checkout session_id from get_account_overview.orders.",
      parameters: {
        type: "object",
        required: ["session_id", "request_details"],
        properties: {
          session_id: { type: "string", description: "Stripe checkout session_id from the order." },
          request_details: { type: "string", description: "What the customer wants edited." },
          package_name: { type: "string" },
          target_email: { type: "string", description: "Admin only. Submit on behalf of another user." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_billing_portal_link",
      description: "Generate a Stripe billing portal link for the user so they can manage payment methods, invoices and subscriptions.",
      parameters: {
        type: "object",
        properties: {
          target_email: { type: "string", description: "Admin only." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_affiliate_code",
      description: "Create a new affiliate/referral code for the signed-in user (10% off for buyer, 5% commission to owner).",
      parameters: {
        type: "object",
        properties: {
          custom_code: { type: "string", description: "Optional custom code, otherwise auto-generated." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "refund_payment",
      description:
        "Issue a refund on a Stripe payment. HIGH RISK. Non-admins can only refund payments belonging to their own email. Always confirm with the user (amount, reason) before calling.",
      parameters: {
        type: "object",
        required: ["payment_intent_id"],
        properties: {
          payment_intent_id: { type: "string" },
          amount_cents: { type: "number", description: "Optional partial amount in minor units. Omit for full refund." },
          reason: { type: "string", enum: ["duplicate", "fraudulent", "requested_by_customer"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_subscription",
      description:
        "Cancel a Stripe subscription. HIGH RISK. Non-admins can only cancel their own. Default cancels at period end; set immediately=true to cancel now.",
      parameters: {
        type: "object",
        required: ["subscription_id"],
        properties: {
          subscription_id: { type: "string" },
          immediately: { type: "boolean", default: false },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_user",
      description: "ADMIN ONLY. Find a user by email and return their id, role, and quick stats.",
      parameters: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string" } },
      },
    },
  },
];

// ---------- Tool implementations ----------

interface Ctx {
  userId: string;
  email: string;
  isAdmin: boolean;
  admin: ReturnType<typeof createClient>;
  origin: string;
  authHeader: string;
}

async function resolveTargetUser(ctx: Ctx, args: { target_user_id?: string; target_email?: string }) {
  if (!args.target_user_id && !args.target_email) {
    return { user_id: ctx.userId, email: ctx.email };
  }
  if (!ctx.isAdmin) {
    throw new Error("Only admins can act on behalf of other users.");
  }
  if (args.target_user_id) {
    const { data } = await ctx.admin.auth.admin.getUserById(args.target_user_id);
    return { user_id: args.target_user_id, email: data?.user?.email ?? "" };
  }
  // by email
  const { data: list } = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const u = list?.users?.find((x: { email?: string | null }) => (x.email ?? "").toLowerCase() === args.target_email!.toLowerCase());
  if (!u) throw new Error(`No user with email ${args.target_email}`);
  return { user_id: u.id, email: u.email ?? args.target_email! };
}

async function execTool(name: string, rawArgs: string, ctx: Ctx): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try { args = rawArgs ? JSON.parse(rawArgs) : {}; } catch { args = {}; }

  switch (name) {
    case "get_account_overview": {
      const target = await resolveTargetUser(ctx, args as { target_user_id?: string; target_email?: string });
      const email = target.email;
      const uid = target.user_id;
      const db = ctx.admin;
      const [orders, briefs, edits, subs, leads, codes, refs, calls] = await Promise.all([
        db.from("stripe_checkout_sessions")
          .select("session_id, order_code, amount_total, currency, status, payment_status, order_status, created_at, payment_intent_id, subscription_id, customer_email, refunded_amount, delivered_domain")
          .eq("customer_email", email).order("created_at", { ascending: false }).limit(25),
        db.from("project_requirements")
          .select("id, session_id, site_name, extra_notes, created_at")
          .eq("customer_email", email).order("created_at", { ascending: false }).limit(20),
        db.from("edit_requests")
          .select("id, session_id, package_name, request_number, request_details, status, created_at")
          .eq("customer_email", email).order("created_at", { ascending: false }).limit(20),
        db.from("subscriptions")
          .select("subscription_id, tier, price_id, status, billing_interval, amount_total, currency, current_period_end, cancel_at_period_end")
          .eq("customer_email", email).order("current_period_end", { ascending: false }).limit(5),
        db.from("customer_leads")
          .select("id, name, contact_name, email, phone, status, created_at, callback_at")
          .eq("owner_user_id", uid).order("created_at", { ascending: false }).limit(10),
        db.from("affiliate_codes")
          .select("code, stripe_promotion_code_id, active, buyer_discount_pct, affiliate_commission_pct, created_at")
          .eq("owner_user_id", uid),
        db.from("affiliate_referrals")
          .select("id, code, buyer_email, amount_total_cents, currency, commission_cents, status, created_at")
          .eq("owner_user_id", uid).order("created_at", { ascending: false }).limit(10),
        db.from("call_bookings")
          .select("id, name, email, scheduled_at, status, preference, brief")
          .eq("email", email).order("scheduled_at", { ascending: false }).limit(5),
      ]);

      return {
        target,
        orders: orders.data ?? [],
        briefs: briefs.data ?? [],
        edit_requests: edits.data ?? [],
        subscriptions: subs.data ?? [],
        leads: leads.data ?? [],
        affiliate_codes: codes.data ?? [],
        affiliate_referrals: refs.data ?? [],
        call_bookings: calls.data ?? [],
        errors: [orders.error, briefs.error, edits.error, subs.error, leads.error, codes.error, refs.error, calls.error]
          .filter(Boolean).map((e) => (e as { message: string }).message),
      };
    }

    case "list_stripe_payments": {
      if (!stripe) throw new Error("Stripe not configured");
      const email = (args.target_email as string) || ctx.email;
      if (email.toLowerCase() !== ctx.email.toLowerCase() && !ctx.isAdmin) {
        throw new Error("Only admins can list other users' payments.");
      }
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (!customers.data.length) return { payments: [] };
      const sessions = await stripe.checkout.sessions.list({ customer: customers.data[0].id, limit: Math.min(Number(args.limit) || 10, 25) });
      return {
        customer_id: customers.data[0].id,
        payments: sessions.data.map((s) => ({
          id: s.id,
          payment_intent: s.payment_intent,
          subscription: s.subscription,
          amount_total: s.amount_total,
          currency: s.currency,
          status: s.status,
          payment_status: s.payment_status,
          created: s.created,
        })),
      };
    }

    case "submit_edit_request": {
      const target = await resolveTargetUser(ctx, args as { target_email?: string });
      // Compute next request_number for this session
      const { data: existing } = await ctx.admin
        .from("edit_requests")
        .select("request_number")
        .eq("session_id", args.session_id as string)
        .order("request_number", { ascending: false })
        .limit(1);
      const nextNum = ((existing?.[0]?.request_number as number) ?? 0) + 1;

      const { data, error } = await ctx.admin.from("edit_requests").insert({
        session_id: args.session_id as string,
        customer_email: target.email,
        package_name: (args.package_name as string) || null,
        request_number: nextNum,
        request_details: args.request_details as string,
        status: "pending",
      }).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, edit_request: data };
    }

    case "create_billing_portal_link": {
      if (!stripe) throw new Error("Stripe not configured");
      const email = (args.target_email as string) || ctx.email;
      if (email.toLowerCase() !== ctx.email.toLowerCase() && !ctx.isAdmin) {
        throw new Error("Only admins can open another user's billing portal.");
      }
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (!customers.data.length) throw new Error(`No Stripe customer for ${email}`);
      const portal = await stripe.billingPortal.sessions.create({
        customer: customers.data[0].id,
        return_url: `${ctx.origin}/customer-portal`,
      });
      return { url: portal.url };
    }

    case "generate_affiliate_code": {
      // Reuse the existing edge function — forward the user's JWT
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-affiliate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ctx.authHeader,
        },
        body: JSON.stringify({}),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Failed to generate code");
      return json;
    }

    case "refund_payment": {
      if (!stripe) throw new Error("Stripe not configured");
      const pi = args.payment_intent_id as string;
      // Verify ownership unless admin
      if (!ctx.isAdmin) {
        const intent = await stripe.paymentIntents.retrieve(pi, { expand: ["customer"] });
        const custEmail = (intent.customer && typeof intent.customer === "object" ? (intent.customer as Stripe.Customer).email : null) ?? intent.receipt_email;
        if (!custEmail || custEmail.toLowerCase() !== ctx.email.toLowerCase()) {
          throw new Error("You can only refund your own payments.");
        }
      }
      const refund = await stripe.refunds.create({
        payment_intent: pi,
        amount: args.amount_cents ? Number(args.amount_cents) : undefined,
        reason: (args.reason as Stripe.RefundCreateParams.Reason) || "requested_by_customer",
      });
      return { ok: true, refund_id: refund.id, amount: refund.amount, status: refund.status };
    }

    case "cancel_subscription": {
      if (!stripe) throw new Error("Stripe not configured");
      const subId = args.subscription_id as string;
      if (!ctx.isAdmin) {
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["customer"] });
        const custEmail = (sub.customer && typeof sub.customer === "object" ? (sub.customer as Stripe.Customer).email : null);
        if (!custEmail || custEmail.toLowerCase() !== ctx.email.toLowerCase()) {
          throw new Error("You can only cancel your own subscriptions.");
        }
      }
      const updated = args.immediately
        ? await stripe.subscriptions.cancel(subId)
        : await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
      return { ok: true, subscription_id: updated.id, status: updated.status, cancel_at_period_end: updated.cancel_at_period_end };
    }

    case "lookup_user": {
      if (!ctx.isAdmin) throw new Error("Admin only");
      const email = (args.email as string).toLowerCase();
      const { data: list } = await ctx.admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const u = list?.users?.find((x: { email?: string | null }) => (x.email ?? "").toLowerCase() === email);
      if (!u) return { found: false };
      const { data: adminRole } = await ctx.admin.rpc("has_role", { _user_id: u.id, _role: "admin" });
      return { found: true, user_id: u.id, email: u.email, created_at: u.created_at, is_admin: Boolean(adminRole), last_sign_in_at: u.last_sign_in_at };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- Main handler ----------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sign in to use support chat." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user via JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: adminRole } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });

    const ctx: Ctx = {
      userId: userData.user.id,
      email: userData.user.email,
      isAdmin: Boolean(adminRole),
      admin,
      origin: req.headers.get("origin") || "https://pixcellor.com",
      authHeader,
    };

    const body = await req.json().catch(() => ({}));
    const incoming = (body.messages || []) as Array<{ role: string; content: string }>;

    const systemPrompt = `You are Pixie, the Pixcellor customer support agent inside the customer portal.
You're warm, sharp, and concise — speak like a real human ops lead, not a chatbot. Keep replies short unless the user asks for detail.

Identity & permissions:
- Signed-in user email: ${ctx.email}
- Signed-in user id: ${ctx.userId}
- Admin: ${ctx.isAdmin ? "YES — you may act on any user's behalf" : "NO — only act on this user's own data"}

Capabilities (via tools):
- Inspect orders, briefs, edit requests, subscriptions, leads, affiliate codes & earnings, call bookings.
- File edit requests, generate affiliate codes, open Stripe billing portal links.
- Look up Stripe payments. Process refunds. Cancel subscriptions.
${ctx.isAdmin ? "- Look up any user by email and operate on their account." : ""}

Rules:
1. ALWAYS call get_account_overview first when the user asks about "my" anything (orders, edits, sub, etc.) — never guess.
2. For destructive actions (refund_payment, cancel_subscription) you MUST first read back the exact details (amount, currency, last 4, plan, period end) and ask the user to confirm with a clear "yes" before calling the tool. Never refund/cancel on a vague request.
3. Non-admins can only act on their own data — the tools enforce this; if a tool returns a permissions error, explain it plainly and offer to escalate.
4. When you use a tool, summarise the result in plain English; don't dump JSON.
5. If something isn't in your tools (e.g. domain transfers, custom dev work), say so and offer to flag the team or book a call.
6. Format money as currency with two decimals (e.g. £150.00). Format dates as "19 Jun 2026".`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...incoming.map((m) => ({ role: m.role as ChatMessage["role"], content: m.content })),
    ];

    // Tool-calling loop
    let finalReply = "";
    for (let step = 0; step < 8; step++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!aiResp.ok) {
        const text = await aiResp.text();
        console.error("AI gateway error", aiResp.status, text);
        throw new Error(`AI gateway error: ${aiResp.status}`);
      }

      const aiJson = await aiResp.json();
      const choice = aiJson.choices?.[0]?.message;
      if (!choice) throw new Error("Empty AI response");

      // Push assistant message (with potential tool_calls) into history
      messages.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: choice.tool_calls,
      });

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        finalReply = choice.content ?? "";
        break;
      }

      // Execute each tool sequentially
      for (const call of choice.tool_calls) {
        let result: unknown;
        try {
          result = await execTool(call.function.name, call.function.arguments, ctx);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(result),
        });
      }
    }

    if (!finalReply) {
      finalReply = "I hit my reasoning limit on that one — could you rephrase or break it into smaller steps?";
    }

    return new Response(JSON.stringify({ reply: finalReply, isAdmin: ctx.isAdmin }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("support-chat error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
