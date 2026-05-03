/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DbClient = any;

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
    price: "£2,500/mo or £20,000/yr",
    rrp: "£4,000/mo (or £40,000/yr)",
    monthlyPriceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    yearlyPriceId: "price_1TSmBtBtUjwejeUwb8xPSvvf",
    mode: "subscription",
    features: ["Your own tech department", "Websites or full apps", "Daily turnarounds (monthly) / Save £10,000 (yearly)"],
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
- **Retainer — £2,500/mo or £20,000/yr** (RRP £4,000/mo): Your own tech department — websites or full apps, daily turnarounds. → For large-scale projects, web apps, or ongoing development.

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
4. **CRITICAL — NEVER LOSE A LEAD:** The MOMENT a visitor shares an email address (or a phone number) — even without a name — IMMEDIATELY call save_contact. Use the email as both the name AND email fields if no real name is given yet (e.g. name: "alex@example.com", email: "alex@example.com"). Same for phone-only: use the phone as the name placeholder. Industry "general" if unknown. This guarantees we never lose contact details.
4b. As soon as the visitor shares their REAL name (and/or phone, company, etc.) later in the conversation, call save_contact AGAIN with the same email — it will update the existing record with the proper name and details.
5. If the visitor used the "Request call" quick action, ask for name + phone, then call save_contact with schedule_callback_tomorrow=true.
6. If the visitor used the "Email info" quick action, ask for name + email, then call save_contact with send_welcome_email=true.
7. If the visitor ORGANICALLY requests a callback (e.g. "can you call me", "I'd like a call back", "ring me", "phone me", "give me a call", "schedule a call") — even without using the quick-action button — treat it EXACTLY like the "Request call" quick action: ask for their name + phone number, then call save_contact with schedule_callback_tomorrow=true. Do not just acknowledge the request without booking it.

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
- If they share a name and either an email or phone number, call save_contact. Always include industry; use general if unsure. Include website when provided. Do not tell them internal CRM details.

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
- Find local businesses that appear to have no standalone website and add them to contacts with find_local_leads.
- **Send the Pixcellor welcome/info email** (sales-welcome-info template) to a contact or raw email with **send_welcome_email**. This actually sends the email and auto-logs a CRM communication event.

## Email rules (CRITICAL)
- When the dev says "email info", "send info", "send welcome", "send the welcome email", "email <person>", "email <address>" — you MUST call **send_welcome_email**. Do NOT create a sales event titled "Email Sent" or similar — that fakes a send and loses the lead.
- If you only have a name/company, first call find_contact to get the contact_id and email, then call send_welcome_email with that contact_id.
- If the recipient has no contact yet, create_contact first (with their email), then send_welcome_email with the new contact_id.
- If send_welcome_email returns ok:false, tell the dev the email FAILED and surface the error. Never claim success on a failure.

## Rules
- Be concise and operational.
- If contact details include a name, create the contact immediately. Email and phone are optional.
- Always set industry on contacts. If unsure, use general. Trades like electrician, roofer, plumber, builder, decorator, landscaper, etc. are construction. Include website when provided.
- If a message includes an uploaded screenshot/image URL, call extract_screenshot_contact first, then create_contact with any extracted name, trade, industry, location, email, phone, and useful notes.
- For screenshot contacts, be smart about job titles: save a clean trade/category (e.g. Roofer, Electrician, Plumber, Builder, Landscaper, Carpenter, Joiner, Painter, Plasterer, Tiler, Scaffolder, Glazier, Cleaner, Mechanic, Hair/Beauty, Restaurant/Food, Retail, Fitness, Consultant, Designer, Developer, Agency, Property, Recruitment). Do NOT save raw UI labels, hashtags, usernames, ratings, follower counts, profile URLs, map links, or random website/social links as the job title/trade.
- If the exact trade is unclear, infer the closest sensible trade from the business name, visible services, bio, category, or page context. If still unclear, use "Unknown trade" and put the uncertainty in notes.
- If the dev says what happened with a lead/client, create a sales event. Use find_contact first when they name the person/company.
- Callback/reminder intent is scoped to the contact the dev explicitly names or clearly references in the SAME request. Do not carry a callback request over to later contacts.
- When the dev uploads/pastes a screenshot to add a new contact, only create the contact. NEVER create a callback for the screenshot contact unless the dev explicitly says the callback is for the person/company in that screenshot in the same message.
- If a message both adds/imports a screenshot contact and asks for a callback for a different named contact, keep those actions separate: create the screenshot contact, then find/create the event only for the named callback contact.
- If the dev asks for a callback/reminder for a contact they just created or just discussed, use the recent-contact context or the previous tool result only when the current message is a callback/reminder request and does not include a new screenshot/contact import.
- If a sales event does not clearly map to one existing contact after checking recent contacts/find_contact, ask which contact to attach it to.
- If the dev asks to find/add local businesses without websites, call find_local_leads with the requested trade, location, and lead count. Do not invent leads yourself.
- Never invent contact details. Save uncertainty in notes/description.
- For callback/reminder times, treat relative dates like "tomorrow", "next week", and "in 1 week" as clear. If no time is given, default to 09:00 Europe/London and include callback_at as ISO.`;

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
            description: "Which package to show: fullWorks (£150 website, up to 3 pages), elite (£500 or £60/mo, up to 10 pages, unlimited edits, SEO/AEO), or retainer (£2,500/mo or £20,000/yr tech department)",
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
      description: "Create or update a sales contact. Call this AS SOON AS you have ANY contact info (email OR phone), even without a real name. If no name yet, pass the email (or phone) as the name placeholder. Call again later with the real name to update the same record. Never wait — capture leads immediately so we don't lose them.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Visitor's name. If unknown, pass the email or phone as a placeholder." },
          phone: { type: "string", description: "Phone number, if provided." },
          email: { type: "string", description: "Email address, if provided." },
          website: { type: "string", description: "Website domain or URL, if provided." },
          industry: { type: "string", description: "Business industry/category if known. Use general if unsure." },
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
          website: { type: "string", description: "Website domain or URL, if provided." },
          trade: { type: "string", description: "Clean trade/category only, e.g. Roofer, Electrician, Plumber, Builder. Never URLs, usernames, UI labels, or long bios." },
          industry: { type: "string", description: "Industry bucket. Electrician/roofer/plumber/builder/etc should be construction. Use general if unsure." },
          notes: { type: "string", description: "Useful extra context only. Do not include raw links, UI labels, follower counts, ratings, or screenshot storage URLs." },
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
  {
    type: "function" as const,
    function: {
      name: "find_local_leads",
      description: "Find local businesses in a trade/location that appear not to have standalone websites, then add them to CRM contacts.",
      parameters: {
        type: "object",
        properties: {
          trade: { type: "string", description: "Trade/category to prospect, e.g. roofers, electricians, plumbers." },
          location: { type: "string", description: "Town/city/area to search." },
          limit: { type: "number", description: "Number of contacts to add. Maximum 25." },
        },
        required: ["trade", "location"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_welcome_email",
      description: "Send the Pixcellor welcome/info email (sales-welcome-info template) to a recipient. Use this whenever the dev says to email info / send info / email the welcome / send the welcome to someone. Pass either contact_id (preferred — looks up the contact's email) OR a raw email. Optionally pass a name. After a successful send, the system automatically logs a CRM communication event on the contact.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "Existing contact UUID (preferred — used to look up email and attach a CRM event)." },
          email: { type: "string", description: "Recipient email if no contact_id is known." },
          name: { type: "string", description: "Recipient first name to personalise the email, optional." },
        },
      },
    },
  },
];

// Look up everything we know about a customer by email
async function lookupCustomer(supabase: DbClient, rawEmail: string) {
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

  if (result.contact_inquiries.length > 0 || (result.prior_chats ?? []).length > 0) {
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
async function loadClientContext(supabase: DbClient, email: string) {
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
  supabase: DbClient,
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

const cleanDevNotes = (value: unknown, max: number) => cleanText(value, max)
  .split(/\n+/)
  .map((line) => line.replace(/https?:\/\/\S+/gi, "").trim())
  .filter((line) => line && !/(followers?|following|likes?|reviews?|rating|views?|posts?|profile|share|message|follow|open in app|sign in|log in)/i.test(line))
  .join("\n")
  .slice(0, max);

const cleanTrade = (value: unknown) => cleanText(value, 80)
  .replace(/https?:\/\/\S+/gi, "")
  .replace(/^[@#]+/, "")
  .trim();

function inferIndustry(value: unknown) {
  const text = cleanText(value, 500).toLowerCase();
  if (/(electrician|electrical|roofer|roofing|plumber|plumbing|builder|building|construction|carpenter|joiner|decorator|painter|landscap|driveway|window|glazing|heating|gas engineer|tiler|flooring|brick|scaffold|bathroom|kitchen fitter)/i.test(text)) return "construction";
  if (/(restaurant|cafe|bar|pub|hotel|catering|takeaway|hospitality|food)/i.test(text)) return "hospitality";
  if (/(salon|barber|beauty|spa|aesthetic|nail|hair)/i.test(text)) return "beauty";
  if (/(gym|fitness|personal trainer|physio|clinic|health|dentist|medical)/i.test(text)) return "healthcare";
  if (/(estate agent|property|letting|mortgage|real estate)/i.test(text)) return "property";
  if (/(accountant|solicitor|lawyer|consultant|finance|insurance)/i.test(text)) return "professional services";
  if (/(shop|retail|boutique|ecommerce|e-commerce|store)/i.test(text)) return "retail";
  if (/(mechanic|garage|mot|vehicle|car dealer|automotive)/i.test(text)) return "automotive";
  return "general";
}

function cleanWebsite(value: unknown) {
  const raw = cleanText(value, 253).toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(raw) ? raw : "";
}

async function createDevContact(supabase: DbClient, args: Record<string, unknown>) {
  const name = cleanText(args.name, 100);
  if (!name) return { ok: false, error: "missing_name" };
  const email = cleanText(args.email, 255).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };
  const trade = cleanTrade(args.trade);
  const industry = cleanText(args.industry, 80).toLowerCase() || inferIndustry(`${trade} ${args.name} ${args.notes}`);
  const website = cleanWebsite(args.website);
  const notes = [
    trade ? `Trade: ${trade}` : "",
    cleanDevNotes(args.notes, 900),
  ].filter(Boolean).join("\n");

  const payload = {
    name,
    phone: cleanText(args.phone, 40) || null,
    email: email || null,
    location: cleanText(args.location, 160) || null,
    industry: industry || "general",
    website: website || null,
    notes: notes || null,
    source: "dev_chat",
  };

  const { data, error } = await supabase.from("contacts").insert(payload).select("id, name, email, phone").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data };
}

async function saveCustomerContact(supabase: DbClient, args: Record<string, unknown>, conversationId: string | null) {
  const name = cleanText(args.name, 100);
  const email = cleanText(args.email, 255).toLowerCase();
  const phone = cleanText(args.phone, 40);
  const industry = cleanText(args.industry, 80).toLowerCase() || "general";
  const website = cleanWebsite(args.website);
  const shouldScheduleCallback = args.schedule_callback_tomorrow === true;
  const shouldSendWelcomeEmail = args.send_welcome_email === true;
  if (!name) return { ok: false, error: "missing_name" };
  if (!email && !phone) return { ok: false, error: "email_or_phone_required" };
  if (shouldSendWelcomeEmail && !email) return { ok: false, error: "email_required_for_welcome_email" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  const notes = [
    cleanText(args.notes, 850),
    shouldScheduleCallback ? "Requested a callback from Alex chat." : "",
    shouldSendWelcomeEmail ? "Requested Pixcellor package/process info by email." : "",
    conversationId ? `Live chat: ${conversationId}` : "Live chat lead",
  ].filter(Boolean).join("\n");
  const existingQuery = supabase.from("contacts").select("id, notes").limit(1);
  const { data: existing } = email
    ? await existingQuery.ilike("email", email).maybeSingle()
    : await existingQuery.eq("phone", phone).maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("contacts")
      .update({ name, phone: phone || null, email: email || null, industry, website: website || null, notes: [existing.notes, notes].filter(Boolean).join("\n"), updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, name, email, phone")
      .single();
    if (error) return { ok: false, error: error.message };
    await handleCustomerContactFollowUps(supabase, data.id, { name, email, phone, shouldScheduleCallback, shouldSendWelcomeEmail });
    return { ok: true, contact: data, updated: true, callback_scheduled: shouldScheduleCallback, welcome_email_requested: shouldSendWelcomeEmail };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({ name, phone: phone || null, email: email || null, industry, website: website || null, notes, source: "chat" })
    .select("id, name, email, phone")
    .single();
  if (error) return { ok: false, error: error.message };
  await handleCustomerContactFollowUps(supabase, data.id, { name, email, phone, shouldScheduleCallback, shouldSendWelcomeEmail });
  return { ok: true, contact: data, updated: false, callback_scheduled: shouldScheduleCallback, welcome_email_requested: shouldSendWelcomeEmail };
}

async function handleCustomerContactFollowUps(
  supabase: DbClient,
  contactId: string,
  details: { name: string; email: string; phone: string; shouldScheduleCallback: boolean; shouldSendWelcomeEmail: boolean }
) {
  if (details.shouldScheduleCallback) {
    const callbackAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Call back requested from website chat",
      description: `Alex chat captured callback request for ${details.name}${details.phone ? ` (${details.phone})` : ""}.`,
      event_type: "callback",
      callback_at: callbackAt,
    });
    if (error) console.error("callback event error:", error);
  }

  if (details.shouldSendWelcomeEmail && details.email) {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "sales-welcome-info",
        recipientEmail: details.email,
        idempotencyKey: `sales-welcome-${contactId}`,
        templateData: { name: details.name },
      },
    });
    if (error) console.error("welcome email error:", error);
  }
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
          { type: "text", text: "Extract visible contact details from this screenshot. Return only JSON with keys: name, trade, industry, company, location, email, phone, website, notes. Use empty strings for missing fields. For website, only include a real standalone business website/domain if visible; do not use social/profile/map links. For trade, infer the closest clean business trade/category from visible services, bio, page category, or business name (e.g. Roofer, Electrician, Plumber, Builder, Landscaper, Carpenter, Joiner, Painter, Plasterer, Tiler, Scaffolder, Glazier, Cleaner, Mechanic, Hair/Beauty, Restaurant/Food, Retail, Fitness, Consultant, Designer, Developer, Agency, Property, Recruitment). Never put URLs, usernames, UI labels, ratings, follower counts, hashtags, or social/profile links in trade. If unclear, trade must be \"Unknown trade\". Notes should be short useful context only and must not include raw links or UI clutter. Do not invent email/phone/location/website." },
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

async function findDevContacts(supabase: DbClient, query: unknown) {
  const q = cleanText(query, 120);
  if (!q) return { ok: false, error: "missing_query", matches: [] };
  const pattern = `%${q.replace(/[%_]/g, "")} %`.replace(" %", "%");
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, location, industry, status")
    .or(`name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},industry.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (error) return { ok: false, error: error.message, matches: [] };
  return { ok: true, matches: data ?? [] };
}

async function findLocalLeads(req: Request, args: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const functionUrl = `${supabaseUrl}/functions/v1/find-local-leads`;
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Authorization": req.headers.get("Authorization") ?? `Bearer ${anonKey}`,
      "apikey": anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trade: cleanText(args.trade, 80),
      location: cleanText(args.location, 120),
      limit: Math.min(Math.max(Number(args.limit) || 10, 1), 25),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: data?.error ?? `lead_finder_failed_${response.status}` };
  return data;
}

async function loadDevRecentContactContext(supabase: DbClient) {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, location, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("loadDevRecentContactContext error:", error);
    return "";
  }

  const contacts = data ?? [];
  if (contacts.length === 0) return "";

  return [
    "## Recent CRM contacts",
    "Use this to resolve follow-up phrases like 'him', 'her', 'that contact', or 'the one I just added'. Prefer the most recent matching contact only when the current user message is asking for a callback/reminder and is not also adding/importing a new screenshot contact.",
    ...contacts.map((contact: Record<string, unknown>, index: number) => {
      const bits = [
        `${index + 1}. ${contact.name}`,
        `id=${contact.id}`,
        contact.email ? `email=${contact.email}` : "",
        contact.phone ? `phone=${contact.phone}` : "",
        contact.location ? `location=${contact.location}` : "",
        contact.status ? `status=${contact.status}` : "",
        contact.updated_at ? `updated=${contact.updated_at}` : "",
      ].filter(Boolean);
      return `- ${bits.join(" · ")}`;
    }),
  ].join("\n");
}

async function createDevSalesEvent(supabase: DbClient, args: Record<string, unknown>) {
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

async function devSendWelcomeEmail(supabase: DbClient, args: Record<string, unknown>) {
  const contactIdRaw = cleanText(args.contact_id, 80);
  const contactId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactIdRaw) ? contactIdRaw : "";
  let email = cleanText(args.email, 255).toLowerCase();
  let name = cleanText(args.name, 100);

  if (contactId) {
    const { data: contact } = await supabase.from("contacts").select("id, name, email").eq("id", contactId).maybeSingle();
    if (!contact) return { ok: false, error: "contact_not_found" };
    if (!email) email = String(contact.email ?? "").toLowerCase();
    if (!name) name = String(contact.name ?? "");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  const idempotencyKey = `dev-welcome-${contactId || email}-${Date.now()}`;
  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "sales-welcome-info",
      recipientEmail: email,
      idempotencyKey,
      templateData: { name: name || undefined },
    },
  });
  if (error) {
    console.error("devSendWelcomeEmail error:", error);
    return { ok: false, error: "email_send_failed", detail: String(error.message ?? error) };
  }

  // Log a CRM event so the team sees it in the contact timeline
  if (contactId) {
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Welcome info email sent",
      description: `Sent sales-welcome-info template to ${email} via dev assistant.`,
      event_type: "communication",
    });
  }

  return { ok: true, email, contact_id: contactId || null, template: "sales-welcome-info" };
}
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

  const priorChats = ctx.prior_chats ?? [];
  if (priorChats.length > 0) {
    lines.push(`### Past chat history (${priorChats.length} prior conversation(s))`);
    for (const conv of priorChats.slice(0, 2)) {
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

    let devRecentContactContext = "";
    if (isDevMode) {
      try {
        devRecentContactContext = await loadDevRecentContactContext(supabase);
      } catch (e) {
        console.error("dev recent contact context error:", e);
      }
    }

    const aiMessages: Array<Record<string, unknown>> = [
      { role: "system", content: isDevMode ? DEV_SYSTEM_PROMPT : SYSTEM_PROMPT },
      { role: "system", content: `Current server time: ${new Date().toISOString()}. For CRM callbacks, resolve relative dates from this timestamp and use Europe/London business hours when no time is supplied.` },
      ...(contextSummary ? [{ role: "system" as const, content: contextSummary }] : []),
      ...(devRecentContactContext ? [{ role: "system" as const, content: devRecentContactContext }] : []),
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
    for (let toolIteration = 0; toolIteration < 4 && message?.tool_calls && message.tool_calls.length > 0; toolIteration += 1) {
      let needsFollowUp = false;
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
                  price = "£20,000/yr";
                  mode = "subscription";
                } else {
                  priceId = (pkg as any).monthlyPriceId;
                  price = "£2,500/mo";
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
        } else if (toolCall.function.name === "find_local_leads" && isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await findLocalLeads(req, args);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in find_local_leads:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "find_local_leads_failed" }) });
          }
        } else if (toolCall.function.name === "send_welcome_email" && isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await devSendWelcomeEmail(supabase, args);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in send_welcome_email:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "send_welcome_email_failed" }) });
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
          break;
        }
      } else {
        break;
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
