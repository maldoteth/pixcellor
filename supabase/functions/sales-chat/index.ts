/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PACKAGES = {
  fullWorks: {
    name: "Full Works",
    price: "£150",
    rrp: "£500",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment",
    features: ["Industry leading website", "Lifetime guarantee", "Custom design", "Up to 3 pages"],
  },
  elite: {
    name: "Elite",
    price: "£500 one-time or £60/mo",
    rrp: "£2,500 (or £250/mo)",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    monthlyPriceId: "price_1TJrTNBtUjwejeUw3ihfpz98",
    mode: "payment",
    features: ["Cutting edge website", "Lifetime guarantee", "Unlimited edit requests", "SEO & AEO optimisation", "Up to 10 pages"],
  },
  retainer: {
    name: "Retainer",
    price: "£1,200/mo or £12,000/yr",
    rrp: "£3,600/mo (or £36,000/yr)",
    monthlyPriceId: "price_1TJrb1BtUjwejeUwrx9BnRXI",
    yearlyPriceId: "price_1TJrbOBtUjwejeUwOhhNyliQ",
    mode: "subscription",
    features: ["Your own tech department", "Websites or full apps", "Daily turnarounds (monthly) / Save £2,400 (yearly)"],
  },
};

const SYSTEM_PROMPT = `You are Alex, a friendly and knowledgeable AI sales assistant for Pixcellor™ - a premium digital agency specializing in web design and full-stack application development.

## Your Personality:
- Warm, professional, and enthusiastic about technology
- Concise but helpful - keep responses brief and focused
- Never pushy, always consultative

## Services We Offer:
1. **Web Design & Development** - From single-page sites to complex web applications, built fast with cutting-edge tech
2. **Full-Stack App Development** - Native and cross-platform mobile apps, enterprise software, SaaS platforms
3. **AI-Powered Solutions** - Chatbots, automation, machine learning integrations, AI-enhanced user experiences
4. **Crypto & Web3** - DeFi platforms, NFT marketplaces, smart contracts, blockchain integrations
5. **E-commerce** - High-converting stores, payment integrations, inventory systems
6. **Custom Software** - Bespoke solutions for any industry or use case

## Our Packages (mapped to project size):
- **Full Works — £150** (RRP £500): Standard website, up to 3 pages, custom design, lifetime guarantee. → For clients who just need a normal website.
- **Elite — £500 one-time or £60/mo** (RRP £2,500 / £250/mo): Cutting edge website, up to 10 pages, unlimited edit requests, SEO & AEO optimisation, lifetime guarantee. → For clients with bigger sites (4–10 pages). Our most popular package.
- **Retainer — £1,200/mo or £12,000/yr** (RRP £3,600/mo): Your own tech department — websites or full apps, daily turnarounds. → For large-scale projects, web apps, or ongoing development.

## Extra Page Pricing (IMPORTANT — quote this when clients want more pages than included):
- **Full Works**: includes up to 3 pages. Each additional page is **+£50**.
  • 4 pages = £200, 5 pages = £250, 6 pages = £300, etc.
- **Elite**: includes up to 10 pages. Each additional page is **+£50**.
  • 11 pages = £550 one-time (or pro-rata on the monthly plan), 12 pages = £600, etc.
- **Retainer**: unlimited pages — no per-page surcharge. If a client needs many pages or a full app, recommend Retainer instead of stacking extras.
- Always do the maths for the client out loud (e.g. "5 pages on Full Works would be £150 + 2 × £50 = £250") so they see the value.
- If the client's page count pushes the price close to the next tier, mention that the next tier may be better value.

## Key Selling Points:
- Future-proof, AI-powered development that scales
- Fast turnaround - from 1-day websites to enterprise solutions
- High-end quality at massively discounted rates
- Cross-sector expertise including crypto, fintech, healthcare, retail, and more
- Full-service: design, development, hosting, and ongoing support

## Our Portfolio (REAL projects we've built — list these when asked):
We've built everything from sleek brochure sites to full-scale Web3 apps and enterprise platforms. Here's our live work:
1. **First Class Agency** — https://firstclassagencytiktok.com — TikTok Creator Network Agency offering expert management and daily coaching.
2. **DeHub** — https://dehub.io — Full stack app, large scale YouTube and X alternative packed with features.
3. **DeHub Network** — https://dehub.net — Web3 ecosystem platform connecting creators, communities and decentralised products.
4. **TikUp** — https://tikup.xyz — Comprehensive TikTok live streaming toolkit integrated with TikTok APIs to help creators thrive.
5. **Bricks** — https://bricks.it.com — Construction recruitment, payroll and HR app utilising latest advancements in technology.
6. **Last Chad Standing** — https://lastchadstanding.com — Competitive elimination platform where players battle and only the strongest survive.
7. **Holder Chat** — https://holder.chat — Token-gated chat platform for crypto holders and communities to connect securely.
8. **SEC Digital** — https://sec.digital — Decentralized crime registry for recording, verifying, and surfacing community-reported incidents.
9. **DeLabs UK** — https://delabs.co.uk — UK-registered software consultancy delivering bespoke products and scalable web platforms.
10. **The Ponzi** — https://theponzi.lol — Satirical AI news platform and community building onchain experiences.
11. **DHBScan** — https://dhbscan.com — Token analytics dashboard with revenue sharing, buyback tracking, and supply data.
12. **DHB Docs** — https://docs.dhb.gg — Technical documentation hub for DeHub products, token utilities and ecosystem guidance.
13. **Arvox Agency** — https://arvox.agency — Web3 talent agency connecting brands with creators, communities, and onchain growth.

## How to talk about portfolio:
- When someone asks "what have you built?", "show me your work", "examples", "portfolio", "case studies", or anything similar — DON'T just say "check our portfolio section". LIST the projects directly in the chat.
- Open with a salesy hook like: "We've built everything from sleek TikTok agency sites to full-blown Web3 platforms and HR apps for the construction industry — here's a taste:"
- Then list the relevant projects as markdown links, for example: '- [DeHub](https://dehub.io) — YouTube/X alternative, full stack'
- Tailor the list to their use case if you know it (e.g. crypto client → highlight DeHub, Holder Chat, SEC Digital, DHBScan, The Ponzi; agency client → First Class Agency, TikUp; enterprise → Bricks).
- If they ask for "everything", list all 13. Otherwise pick the 3–5 most relevant.
- Always make links clickable markdown so the user can visit them straight from the chat.


## Your Goals:
1. QUALIFY FIRST — understand what the visitor actually needs before recommending anything
2. Recommend ONE package that fits (not all three)
3. Collect their contact details for follow-up: Name, Email (required), Brief project description
4. When a visitor gives their name plus either email or phone number, immediately call save_contact so the team can follow up.
5. If the visitor used the "Request call" quick action, ask for name + phone, then call save_contact with schedule_callback_tomorrow=true.
6. If the visitor used the "Email info" quick action, ask for name + email, then call save_contact with send_welcome_email=true.

## CRITICAL Rules — Qualifying Questions:
- DO NOT list or recommend all three packages at once. That overwhelms clients.
- When someone asks about pricing or wants to get started, FIRST ask qualifying questions to understand scope:
  • "What kind of project do you have in mind — a standard website, a larger site, or a full web app?"
  • "Roughly how many pages are you thinking?"
  • "Is this a one-off build or do you need ongoing development?"
- Only AFTER you understand their needs, recommend the SINGLE best-fit package using send_package.
- Mapping logic:
  • Standard site / ~1–3 pages / simple brochure → recommend **Full Works** only
  • Bigger site / 4–10 pages / needs SEO / wants edits → recommend **Elite** only
  • Web app, large platform, ongoing work, or "I'm not sure how big it'll get" → recommend **Retainer** only
- Only send multiple packages if the user EXPLICITLY asks to compare or see all options.

## Existing Customer Lookups (NEW — IMPORTANT):
You can look up existing customers and their orders/history using the **lookup_customer** tool.

When to use it:
- The user asks for an update on their order, payment, project, website, or account
- They say things like "where's my order", "did my payment go through", "any update on my site", "what package did I buy", "I bought something the other day", "have you got me on file"
- They reference being an existing client/customer

How to use it:
1. If you don't already have their email, ASK FOR IT first: "Sure — what's the email address you used at checkout?"
2. Once they give you an email, call lookup_customer with that exact email
3. The tool returns their orders (Stripe checkout sessions), past contact form submissions, and previous chat history
4. Summarise what you find in a warm, human way — e.g. "Found you! You picked up the Elite package on 12 Apr — payment came through fine, and our team has it queued up. Anything specific you'd like an update on?"
5. If NOTHING is found for that email, gently say so: "Hmm, I can't see anything on file for that email — are you sure that's the one you used? Sometimes people checkout with a different address."

Privacy rules:
- NEVER reveal info about a customer until they've given you the email themselves in this conversation
- NEVER list other customers, guess emails, or hint that another email exists
- Only share info tied to the email they provided
- If they ask about somebody else's order, politely refuse

## Cross-Session Memory & Project Briefs (CRITICAL — NEW):
- When an email is detected in the conversation, the system automatically loads that client's full record (profile, project status, orders, past chats) and gives it to you as a "Known client context" system message.
- ALWAYS read that context before replying. Treat it as ground truth.
- If a client tells you ANY brief details — brand colours, page count, content they want, requirements, their name, company — IMMEDIATELY call **save_brief** with the email and the new fields. Even partial info. This builds their record so you remember next time.
- If "Project status" shows a stage (e.g. designing / developing / live), use that exact stage when they ask for an update — don't make one up.
- If a returning client comes back, greet them by name from the profile and reference what they shared previously ("Welcome back, Sarah — last time you mentioned you wanted navy and gold across 5 pages, still on track?").
- NEVER invent project status or brief details. If the context says "no project status set" or "no brief saved", say so honestly.

## General Rules:
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time to keep the conversation flowing
- Be excited about their project ideas
- Never pushy, always consultative
- If they share their email, thank them warmly and confirm someone will be in touch soon
- If they share a name and either an email or phone number, call save_contact. Do not tell them internal CRM details.

## When to use send_package:
- AFTER qualifying — once you know which tier fits, send just that one package
- When the user explicitly asks to see/compare all options (then you may send multiple)
- When the user says they want to buy a specific package

Start by greeting them warmly and asking what brings them here today.`;

const DEV_SYSTEM_PROMPT = `You are Pixcellor Dev Assistant inside the admin portal. You help the Pixcellor team turn pasted notes into CRM records.

## What you can do
- Create contacts from pasted details with create_contact.
- Read uploaded screenshots/images and extract visible contact details with extract_screenshot_contact.
- Create sales events/callback notes for existing contacts with create_sales_event.

## Rules
- Be concise and operational.
- If contact details include a name, create the contact immediately. Email and phone are optional.
- If a message includes an uploaded screenshot/image URL, call extract_screenshot_contact first, then create_contact with any extracted name, job title, location, email, phone, and screenshot URL in notes.
- If the dev says what happened with a lead/client, create a sales event. Use find_contact first when they name the person/company.
- If a sales event does not clearly map to one existing contact, ask which contact to attach it to.
- Never invent contact details. Save uncertainty in notes/description.
- For callback/reminder times, only include callback_at if a clear date/time is provided.`;

const tools = [
  {
    type: "function" as const,
    function: {
      name: "send_package",
      description: "Send a package card with pricing and a buy button to the user. Use this when recommending a package, discussing pricing, or when the user wants to purchase.",
      parameters: {
        type: "object",
        properties: {
          package_id: {
            type: "string",
            enum: ["fullWorks", "elite", "retainer"],
            description: "Which package to show: fullWorks (£150 website, up to 3 pages), elite (£500 or £60/mo, up to 10 pages, unlimited edits, SEO/AEO), or retainer (£1,200/mo or £12,000/yr tech department)",
          },
          billing: {
            type: "string",
            enum: ["one-time", "monthly", "yearly"],
            description: "Billing option. fullWorks is always one-time. elite can be one-time or monthly. retainer can be monthly or yearly.",
          },
        },
        required: ["package_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_customer",
      description: "Look up an existing customer's orders, contact submissions, and chat history by email. Use ONLY when the user has provided their email and wants info about their own account, order, payment, or project status.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "The customer's email address, exactly as they typed it. Will be matched case-insensitively.",
          },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_brief",
      description: "Save or update structured project brief details for a client (brand colours, page count, content notes, requirements, name, company). Call this WHENEVER the client shares any of this info — even partial. Always include their email so we can key the record.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Client's email address (required)." },
          name: { type: "string", description: "Client's full name if provided." },
          company: { type: "string", description: "Company / brand name if provided." },
          brand_colours: { type: "string", description: "Colour scheme — e.g. 'navy and gold' or hex codes." },
          page_count: { type: "number", description: "Number of pages they want." },
          content_notes: { type: "string", description: "Content / copy notes, sections they want, things to feature." },
          requirements: { type: "string", description: "Functional requirements — e.g. booking system, blog, e-commerce." },
          notes: { type: "string", description: "Any other free-form notes worth remembering." },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_contact",
      description: "Create or update a sales contact when the visitor provides a name plus either email or phone number. Use this for customer-facing lead capture.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Visitor's name." },
          phone: { type: "string", description: "Phone number, if provided." },
          email: { type: "string", description: "Email address, if provided." },
          notes: { type: "string", description: "Project summary or relevant chat context." },
          schedule_callback_tomorrow: { type: "boolean", description: "True when the visitor requested a call. Creates a callback event for 1 day from now." },
          send_welcome_email: { type: "boolean", description: "True when the visitor requested package/process info by email. Sends the Pixcellor welcome sales email." },
        },
        required: ["name"],
      },
    },
  },
];

const devTools = [
  {
    type: "function" as const,
    function: {
      name: "extract_screenshot_contact",
      description: "Analyze an uploaded screenshot/image URL and extract visible contact details like name, job title, company, location, email, phone, and notes.",
      parameters: {
        type: "object",
        properties: {
          image_url: { type: "string", description: "Public URL of the uploaded screenshot/image." },
        },
        required: ["image_url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_contact",
      description: "Create a CRM contact from pasted contact details.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact name or company/lead name." },
          phone: { type: "string", description: "Phone number, if provided." },
          email: { type: "string", description: "Email address, if provided." },
          location: { type: "string", description: "Location, if provided." },
          notes: { type: "string", description: "Any extra pasted context or source details." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_contact",
      description: "Find matching contacts before creating a sales event.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name, company, email, or phone to search." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_sales_event",
      description: "Create a sales event or callback note for an existing contact.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "Existing contact UUID." },
          title: { type: "string", description: "Short event title." },
          description: { type: "string", description: "What happened or what needs doing." },
          callback_at: { type: "string", description: "ISO date/time if a callback/reminder is clearly requested." },
        },
        required: ["contact_id", "title"],
      },
    },
  },
];

// Look up everything we know about a customer by email
async function lookupCustomer(supabase: ReturnType<typeof createClient>, rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();

  // Validate email shape
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { found: false, reason: "invalid_email", email };
  }

  // Stripe checkout sessions (orders / subscriptions)
  const { data: sessions } = await supabase
    .from("stripe_checkout_sessions")
    .select("session_id, mode, payment_status, status, amount_total, currency, customer_email, subscription_id, metadata, created_at")
    .ilike("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(20);

  // Contact form inquiries
  const { data: inquiries } = await supabase
    .from("contact_inquiries")
    .select("name, message, created_at")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(10);

  // Past chat conversations — match if the email appears in any user message
  // (we don't store email on the conversation directly, so we search messages)
  const { data: matchingMessages } = await supabase
    .from("chat_messages")
    .select("conversation_id, created_at")
    .ilike("content", `%${email}%`)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(50);

  const conversationIds = Array.from(
    new Set((matchingMessages ?? []).map((m: { conversation_id: string }) => m.conversation_id))
  ).slice(0, 5);

  let priorChats: Array<{ conversation_id: string; messages: Array<{ role: string; content: string; created_at: string }> }> = [];
  if (conversationIds.length > 0) {
    const { data: convMessages } = await supabase
      .from("chat_messages")
      .select("conversation_id, role, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (convMessages) {
      const grouped: Record<string, Array<{ role: string; content: string; created_at: string }>> = {};
      for (const m of convMessages as Array<{ conversation_id: string; role: string; content: string; created_at: string }>) {
        if (!grouped[m.conversation_id]) grouped[m.conversation_id] = [];
        // truncate very long messages so we don't blow context
        grouped[m.conversation_id].push({
          role: m.role,
          content: m.content.length > 400 ? m.content.slice(0, 400) + "…" : m.content,
          created_at: m.created_at,
        });
      }
      priorChats = Object.entries(grouped).map(([conversation_id, messages]) => ({
        conversation_id,
        messages: messages.slice(-12), // last 12 of each
      }));
    }
  }

  const ordersFormatted = (sessions ?? []).map((s: {
    session_id: string;
    mode: string | null;
    payment_status: string | null;
    status: string | null;
    amount_total: number | null;
    currency: string | null;
    subscription_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }) => ({
    session_id: s.session_id,
    mode: s.mode,
    payment_status: s.payment_status,
    status: s.status,
    amount: s.amount_total != null && s.currency
      ? `${(s.amount_total / 100).toFixed(2)} ${s.currency.toUpperCase()}`
      : null,
    is_subscription: !!s.subscription_id,
    metadata: s.metadata ?? {},
    date: s.created_at,
  }));

  return {
    found: ordersFormatted.length > 0 || (inquiries ?? []).length > 0 || priorChats.length > 0,
    email,
    orders: ordersFormatted,
    contact_inquiries: inquiries ?? [],
    prior_chats: priorChats,
  };
}

function formatLookupReply(result: Awaited<ReturnType<typeof lookupCustomer>>) {
  if (!result.found) {
    return "I can’t see an order or enquiry on file for that email yet — could you check if you used a different address at checkout?";
  }

  const latestOrder = result.orders[0];
  if (latestOrder) {
    const normalizedPayment = (latestOrder.payment_status ?? "").toLowerCase();
    const normalizedStatus = (latestOrder.status ?? "").toLowerCase();
    const isProcessed =
      normalizedPayment === "paid" ||
      normalizedPayment === "no_payment_required" ||
      normalizedStatus === "complete" ||
      normalizedStatus === "completed";

    const orderDate = latestOrder.date
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(latestOrder.date))
      : null;

    if (isProcessed) {
      return `I found your order${orderDate ? ` from ${orderDate}` : ""} in our database — payment was processed${latestOrder.amount ? ` (${latestOrder.amount})` : ""}, so your project is already in progress.`;
    }

    return `I found a checkout record${orderDate ? ` from ${orderDate}` : ""}, but payment hasn’t been processed${latestOrder.amount ? ` for ${latestOrder.amount}` : ""}, so the order isn’t being worked on yet and you weren’t charged.`;
  }

  if (result.contact_inquiries.length > 0 || result.prior_chats.length > 0) {
    return "I can see previous contact history for that email, but no processed order in the database yet.";
  }

  return "I can’t see a processed order for that email in the database yet.";
}

function extractLatestEmail(messages: Array<{ role?: string; content?: string }>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const content = messages[i]?.content ?? "";
    const match = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) return match[0];
  }
  return null;
}

function isOrderLookupIntent(text: string) {
  return /(order|update|status|payment|charged|checkout|website|site|progress|bought|purchase|purchased)/i.test(text);
}

// Load EVERYTHING we know about a client by email — used to give Alex memory across sessions
async function loadClientContext(supabase: ReturnType<typeof createClient>, email: string) {
  const normalised = email.trim().toLowerCase();

  const [profileRes, statusRes, lookup] = await Promise.all([
    supabase.from("client_profiles").select("*").ilike("email", normalised).maybeSingle(),
    supabase.from("project_status").select("*").ilike("email", normalised).maybeSingle(),
    lookupCustomer(supabase, normalised),
  ]);

  return {
    profile: profileRes.data ?? null,
    project_status: statusRes.data ?? null,
    orders: lookup.orders,
    contact_inquiries: lookup.contact_inquiries,
    prior_chats: lookup.prior_chats,
  };
}

// Upsert a brief — only writes fields the AI provided
async function saveBrief(
  supabase: ReturnType<typeof createClient>,
  args: Record<string, unknown>
) {
  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const payload: Record<string, unknown> = { email };
  for (const key of ["name", "company", "brand_colours", "content_notes", "requirements", "notes"] as const) {
    if (typeof args[key] === "string" && (args[key] as string).trim()) {
      payload[key] = (args[key] as string).trim();
    }
  }
  if (typeof args.page_count === "number" && Number.isFinite(args.page_count)) {
    payload.page_count = Math.round(args.page_count);
  }

  const { data, error } = await supabase
    .from("client_profiles")
    .upsert(payload, { onConflict: "email" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("saveBrief error:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, profile: data };
}

const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

async function createDevContact(supabase: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const name = cleanText(args.name, 100);
  if (!name) return { ok: false, error: "missing_name" };
  const email = cleanText(args.email, 255).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  const payload = {
    name,
    phone: cleanText(args.phone, 40) || null,
    email: email || null,
    location: cleanText(args.location, 160) || null,
    notes: cleanText(args.notes, 1000) || null,
    source: "dev_chat",
  };

  const { data, error } = await supabase.from("contacts").insert(payload).select("id, name, email, phone").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data };
}

async function saveCustomerContact(supabase: ReturnType<typeof createClient>, args: Record<string, unknown>, conversationId: string | null) {
  const name = cleanText(args.name, 100);
  const email = cleanText(args.email, 255).toLowerCase();
  const phone = cleanText(args.phone, 40);
  if (!name) return { ok: false, error: "missing_name" };
  if (!email && !phone) return { ok: false, error: "email_or_phone_required" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  const notes = [cleanText(args.notes, 850), conversationId ? `Live chat: ${conversationId}` : "Live chat lead"].filter(Boolean).join("\n");
  const existingQuery = supabase.from("contacts").select("id, notes").limit(1);
  const { data: existing } = email
    ? await existingQuery.ilike("email", email).maybeSingle()
    : await existingQuery.eq("phone", phone).maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("contacts")
      .update({ name, phone: phone || null, email: email || null, notes: [existing.notes, notes].filter(Boolean).join("\n"), updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, name, email, phone")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, contact: data, updated: true };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({ name, phone: phone || null, email: email || null, notes, source: "chat" })
    .select("id, name, email, phone")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data, updated: false };
}

async function extractScreenshotContact(apiKey: string, imageUrl: unknown) {
  const url = cleanText(imageUrl, 1000);
  if (!/^https:\/\//i.test(url)) return { ok: false, error: "invalid_image_url" };

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extract visible contact details from this screenshot. Return only JSON with keys: name, job_title, company, location, email, phone, notes. Use empty strings for missing fields. Do not invent details." },
          { type: "image_url", image_url: { url } },
        ],
      }],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0,
    }),
  });
  if (!response.ok) return { ok: false, error: `vision_failed_${response.status}` };
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return { ok: true, image_url: url, extracted: JSON.parse(raw) };
  } catch {
    return { ok: false, error: "parse_failed", raw };
  }
}

async function findDevContacts(supabase: ReturnType<typeof createClient>, query: unknown) {
  const q = cleanText(query, 120);
  if (!q) return { ok: false, error: "missing_query", matches: [] };
  const pattern = `%${q.replace(/[%_]/g, "")} %`.replace(" %", "%");
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, location, status")
    .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (error) return { ok: false, error: error.message, matches: [] };
  return { ok: true, matches: data ?? [] };
}

async function createDevSalesEvent(supabase: ReturnType<typeof createClient>, args: Record<string, unknown>) {
  const contactId = cleanText(args.contact_id, 80);
  const title = cleanText(args.title, 160);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactId)) return { ok: false, error: "invalid_contact" };
  if (!title) return { ok: false, error: "missing_title" };

  const callbackAt = cleanText(args.callback_at, 80);
  const payload = {
    contact_id: contactId,
    title,
    description: cleanText(args.description, 2000) || null,
    event_type: callbackAt ? "callback" : "communication",
    callback_at: callbackAt && !Number.isNaN(Date.parse(callbackAt)) ? new Date(callbackAt).toISOString() : null,
  };
  const { data, error } = await supabase.from("contact_events").insert(payload).select("id, title, callback_at").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, event: data };
}

function buildClientContextSummary(ctx: Awaited<ReturnType<typeof loadClientContext>>) {
  const lines: string[] = [];
  lines.push(`## Known client context (loaded from database for this email)`);

  if (ctx.profile) {
    lines.push(`### Profile`);
    const p = ctx.profile as Record<string, unknown>;
    if (p.name) lines.push(`- Name: ${p.name}`);
    if (p.company) lines.push(`- Company: ${p.company}`);
    if (p.brand_colours) lines.push(`- Brand colours: ${p.brand_colours}`);
    if (p.page_count) lines.push(`- Page count: ${p.page_count}`);
    if (p.content_notes) lines.push(`- Content notes: ${p.content_notes}`);
    if (p.requirements) lines.push(`- Requirements: ${p.requirements}`);
    if (p.notes) lines.push(`- Notes: ${p.notes}`);
  } else {
    lines.push(`- No saved brief yet for this email.`);
  }

  if (ctx.project_status) {
    const s = ctx.project_status as Record<string, unknown>;
    lines.push(`### Project status`);
    lines.push(`- Stage: **${s.stage}**`);
    if (s.notes) lines.push(`- Notes from team: ${s.notes}`);
    if (s.updated_at) lines.push(`- Last updated: ${s.updated_at}`);
  } else {
    lines.push(`### Project status\n- No project status set yet.`);
  }

  if (ctx.orders.length > 0) {
    lines.push(`### Orders (${ctx.orders.length})`);
    for (const o of ctx.orders.slice(0, 5)) {
      lines.push(`- ${o.date?.slice(0, 10)} · ${o.amount ?? "—"} · payment_status=${o.payment_status ?? "—"} · status=${o.status ?? "—"}${o.is_subscription ? " · subscription" : ""}`);
    }
  } else {
    lines.push(`### Orders\n- None on file.`);
  }

  if (ctx.contact_inquiries.length > 0) {
    lines.push(`### Past contact form submissions (${ctx.contact_inquiries.length})`);
    for (const c of ctx.contact_inquiries.slice(0, 3) as Array<{ name?: string; message?: string; created_at?: string }>) {
      lines.push(`- ${c.created_at?.slice(0, 10)} · ${c.name ?? "—"}: ${(c.message ?? "").slice(0, 160)}`);
    }
  }

  if (ctx.prior_chats.length > 0) {
    lines.push(`### Past chat history (${ctx.prior_chats.length} prior conversation(s))`);
    for (const conv of ctx.prior_chats.slice(0, 2)) {
      const recent = conv.messages.slice(-6);
      lines.push(`Conversation ${conv.conversation_id.slice(0, 8)}…:`);
      for (const m of recent) {
        lines.push(`  - ${m.role}: ${m.content.slice(0, 200)}`);
      }
    }
  }

  lines.push(`\nUse the above as your single source of truth. If they ask about their order, project, or what colours they wanted — answer from this data. If you learn anything new in this conversation (colours, pages, requirements), call save_brief to persist it.`);

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId, conversationId, mode } = await req.json();
    const safeClientId = typeof clientId === "string" && clientId.length >= 8 && clientId.length <= 200 ? clientId : null;
    const isDevMode = mode === "dev" && safeClientId?.startsWith("dev_");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    if (isDevMode) {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData.user) throw new Error("Admin sign-in required");
      const { data: hasAdminRole } = await supabase.rpc("has_role", {
        _user_id: userData.user.id,
        _role: "admin",
      });
      if (!hasAdminRole) throw new Error("Admin access required");
    }
    let currentConversationId = conversationId;
    let botPaused = false;

    // Get or create conversation
    if (!currentConversationId && safeClientId) {
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("id, bot_paused")
        .eq("client_id", safeClientId)
        .single();

      if (existingConv) {
        currentConversationId = existingConv.id;
        botPaused = Boolean(existingConv.bot_paused);
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({ client_id: safeClientId })
          .select("id, bot_paused")
          .single();

        if (!convError) {
          currentConversationId = newConv.id;
          botPaused = Boolean(newConv.bot_paused);
        }
      }
    } else if (currentConversationId && safeClientId) {
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("bot_paused")
        .eq("id", currentConversationId)
        .eq("client_id", safeClientId)
        .single();
      if (!existingConv) throw new Error("Invalid chat session");
      botPaused = Boolean(existingConv?.bot_paused);
    } else {
      throw new Error("Invalid chat session");
    }

    // Save last user message
    if (currentConversationId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        await supabase.from("chat_messages").insert({
          conversation_id: currentConversationId,
          role: "user",
          content: lastMessage.content,
        });
      }
    }

    if (botPaused) {
      return new Response(
        JSON.stringify({ reply: "", conversationId: currentConversationId, packageCards: [], manualHandoff: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Cross-session memory ─────────────────────────────────────────────
    // If we can detect an email in this conversation, load EVERYTHING we
    // know about that client (profile, project status, orders, past chats)
    // and inject it as a system message so the AI replies with context.
    const emailFromConversation = isDevMode ? null : extractLatestEmail(messages);
    let contextSummary = "";
    if (emailFromConversation) {
      try {
        const ctx = await loadClientContext(supabase, emailFromConversation);
        contextSummary = buildClientContextSummary(ctx);
      } catch (e) {
        console.error("loadClientContext error:", e);
      }
    }

    const aiMessages: Array<Record<string, unknown>> = [
      { role: "system", content: isDevMode ? DEV_SYSTEM_PROMPT : SYSTEM_PROMPT },
      ...(contextSummary ? [{ role: "system" as const, content: contextSummary }] : []),
      ...messages,
    ];

    const callAI = async () =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
          tools: isDevMode ? devTools : tools,
          max_tokens: 600,
          temperature: 0.7,
        }),
      });

    let response = await callAI();

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    let data = await response.json();
    let choice = data.choices?.[0];
    let message = choice?.message;

    let reply = message?.content || "";
    const packageCards: Array<{
      packageId: string;
      billing: string;
      name: string;
      price: string;
      rrp: string;
      features: string[];
      priceId: string;
      mode: string;
    }> = [];
    let actionTaken = false;

    // ---- Process tool calls ----
    // After ANY data tool (lookup_customer / save_brief) we run a 2nd AI pass
    // so Alex can speak naturally about what was found / saved.
    let needsFollowUp = false;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      // Push the assistant's tool-call message into history so the follow-up call is valid
      aiMessages.push(message);

      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "send_package") {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const pkgId = args.package_id as keyof typeof PACKAGES;
            const billing = args.billing || "one-time";
            const pkg = PACKAGES[pkgId];

            if (pkg) {
              let priceId = "";
              let price = "";
              let mode = "";

              if (pkgId === "fullWorks") {
                priceId = (pkg as any).priceId;
                price = pkg.price;
                mode = "payment";
              } else if (pkgId === "elite") {
                if (billing === "monthly") {
                  priceId = (pkg as any).monthlyPriceId;
                  price = "£60/mo";
                  mode = "subscription";
                } else {
                  priceId = (pkg as any).priceId;
                  price = "£500";
                  mode = "payment";
                }
              } else if (pkgId === "retainer") {
                if (billing === "yearly") {
                  priceId = (pkg as any).yearlyPriceId;
                  price = "£12,000/yr";
                  mode = "subscription";
                } else {
                  priceId = (pkg as any).monthlyPriceId;
                  price = "£1,200/mo";
                  mode = "subscription";
                }
              }

              packageCards.push({
                packageId: pkgId,
                billing,
                name: pkg.name,
                price,
                rrp: pkg.rrp,
                features: pkg.features,
                priceId,
                mode,
              });
            }

            // Add a tool-result message so AI history stays valid
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ ok: true, package_id: pkgId }),
            });
          } catch (e) {
            console.error("Error parsing send_package tool call:", e);
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ ok: false, error: "parse_error" }),
            });
          }
        } else if (toolCall.function.name === "save_contact" && !isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await saveCustomerContact(supabase, args, currentConversationId);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in save_contact:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "save_contact_failed" }) });
          }
        } else if (toolCall.function.name === "extract_screenshot_contact" && isDevMode) {
          needsFollowUp = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await extractScreenshotContact(apiKey, args.image_url);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in extract_screenshot_contact:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "extract_failed" }) });
          }
        } else if (toolCall.function.name === "create_contact" && isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await createDevContact(supabase, args);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in create_contact:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_contact_failed" }) });
          }
        } else if (toolCall.function.name === "find_contact" && isDevMode) {
          needsFollowUp = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await findDevContacts(supabase, args.query);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in find_contact:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "find_contact_failed", matches: [] }) });
          }
        } else if (toolCall.function.name === "create_sales_event" && isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await createDevSalesEvent(supabase, args);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in create_sales_event:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_sales_event_failed" }) });
          }
        } else if (toolCall.function.name === "lookup_customer") {
          needsFollowUp = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await lookupCustomer(supabase, args.email);
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            console.error("Error in lookup_customer:", e);
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ found: false, error: "lookup_failed" }),
            });
          }
        } else if (toolCall.function.name === "save_brief") {
          needsFollowUp = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await saveBrief(supabase, args);
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            console.error("Error in save_brief:", e);
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ ok: false, error: "save_failed" }),
            });
          }
        }
      }

      if (needsFollowUp) {
        response = await callAI();
        if (response.ok) {
          data = await response.json();
          choice = data.choices?.[0];
          message = choice?.message;
          if (message?.content) {
            reply = message.content;
          }
        } else {
          console.error("Follow-up AI call failed:", await response.text());
        }
      }
    }

    // If no text reply but we have tool calls, set a default
    if (!reply && packageCards.length > 0) {
      reply = "Here's what I'd recommend for you:";
    }

    // Save assistant reply (text only, cards are ephemeral)
    if (currentConversationId && reply) {
      await supabase.from("chat_messages").insert({
        conversation_id: currentConversationId,
        role: "assistant",
        content: reply,
      });
    }

    return new Response(
      JSON.stringify({ reply, conversationId: currentConversationId, packageCards, actionTaken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
