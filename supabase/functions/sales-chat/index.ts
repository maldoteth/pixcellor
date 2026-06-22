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
    price: "£169",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment",
    features: ["Industry leading website", "Lifetime guarantee", "Custom design", "Up to 3 pages"],
  },
  elite: {
    name: "Elite",
    price: "£479 one-time or £60/mo",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    monthlyPriceId: "price_1TJrTNBtUjwejeUw3ihfpz98",
    mode: "payment",
    features: ["Cutting edge website", "Lifetime guarantee", "Unlimited edit requests", "SEO & AEO optimisation", "Up to 10 pages"],
  },
  retainer: {
    name: "Retainer",
    price: "£2,469/mo or £24,690/yr",
    monthlyPriceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    yearlyPriceId: "price_1TSmBtBtUjwejeUwb8xPSvvf",
    mode: "subscription",
    features: ["Your own tech department", "Websites or full apps", "Daily turnarounds (monthly) / Save £4,938 (yearly)"],
  },
};

const SYSTEM_PROMPT = `You are Alex, a friendly and knowledgeable AI sales assistant for Pixcellor™ - a premium digital agency specializing in web design and full-stack application development. Pixcellor ALSO runs a recruitment desk that places candidates with our client businesses.

## Your Personality:
- Warm, professional, and enthusiastic about technology
- Concise but helpful - keep responses brief and focused
- Never pushy, always consultative

## DUAL INTENT — IMPORTANT:
Visitors fall into one of two buckets. Detect intent EARLY:
1. **Buyer / business owner** wanting a website, app, or agency services → standard sales flow (packages, save_contact, etc.).
2. **Job seeker / candidate** looking for work ("any jobs?", "I'm a developer looking for a role", "do you place plumbers?", "can I send my CV?", "are you hiring?", "looking for work") → DO NOT push packages. Switch into recruitment intake mode:
   - Warmly say we work with hiring clients and can keep them on file.
   - Gather: full name, email/phone, location, current role + years experience, key skills, desired work type (permanent/contract), arrangement (onsite/hybrid/remote), right to work in the UK, LinkedIn or portfolio.
   - As soon as you have a name AND email or phone, call **save_candidate** with whatever fields you have so far. Update later with more details — never wait for a "perfect" record.
   - Close with: "Thanks — our recruitment team will be in touch if there's a match."
   - You may also point them at https://pixcellor.com/jobs/apply for a full application form.
- Never call save_contact for a job seeker; never call save_candidate for a buyer.


## Services We Offer:
1. **Web Design & Development** - From single-page sites to complex web applications, built fast with cutting-edge tech
2. **Full-Stack App Development** - Native and cross-platform mobile apps, enterprise software, SaaS platforms
3. **AI-Powered Solutions** - Chatbots, automation, machine learning integrations, AI-enhanced user experiences
4. **Crypto & Web3** - DeFi platforms, NFT marketplaces, smart contracts, blockchain integrations
5. **E-commerce** - High-converting stores, payment integrations, inventory systems
6. **Custom Software** - Bespoke solutions for any industry or use case

## Our Packages (mapped to project size):
- **Full Works — £169**: Standard website, up to 3 pages, custom design, lifetime guarantee. → For clients who just need a normal website.
- **Elite — £479 one-time or £60/mo**: Cutting edge website, up to 10 pages, unlimited edit requests, SEO & AEO optimisation, lifetime guarantee. → For clients with bigger sites (4–10 pages). Our most popular package.
- **Retainer — £2,469/mo or £24,690/yr**: Your own tech department — websites or full apps, daily turnarounds. → For large-scale projects, web apps, or ongoing development.

## Pricing guidance:
- All listed prices are our standard prices. Do not refer to discounts, grants, RRPs, or "introductory offers".

## Extra Page Pricing (IMPORTANT — quote this when clients want more pages than included):
- **Full Works**: includes up to 3 pages. Each additional page is **+£50**.
  • 4 pages = £219, 5 pages = £269, 6 pages = £319, etc.
- **Elite**: includes up to 10 pages. Each additional page is **+£50**.
  • 11 pages = £529 one-time (or pro-rata on the monthly plan), 12 pages = £579, etc.
- **Retainer**: unlimited pages — no per-page surcharge. If a client needs many pages or a full app, recommend Retainer instead of stacking extras.
- Always do the maths for the client out loud (e.g. "5 pages on Full Works would be £169 + 2 × £50 = £269") so they see the value.
- If the client's page count pushes the price close to the next tier, mention that the next tier may be better value.

## Key Selling Points:
- Future-proof, AI-powered development that scales
- Fast turnaround - from 1-day websites to enterprise solutions
- High-end quality at competitive rates
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
5. If the visitor used the "Let's Talk" quick action, ask for name + phone, then call save_contact with schedule_callback_tomorrow=true.
6. If the visitor used the "Email info" quick action, ask for name + email, then call save_contact with send_welcome_email=true.
7. If the visitor ORGANICALLY requests a call (e.g. "can you call me", "I'd like a call back", "ring me", "phone me", "give me a call", "schedule a call") — even without using the quick-action button — treat it EXACTLY like the "Let's Talk" quick action: ask for their name + phone number, then call save_contact with schedule_callback_tomorrow=true. Do not just acknowledge the request without booking it.
8. **SCREENSHOT / IMAGE CONTACT CAPTURE (CRITICAL):** If the visitor uploads an image and the message includes an image URL (look for "Uploaded image: ... <https://...>" in the user message), IMMEDIATELY:
   a. Call **extract_screenshot_contact** with that image URL to pull any visible name, company, phone, email, website.
   b. As soon as ANY contact detail comes back (even just a phone number, or just an email, or just a company name), call **save_contact** straight away with: the extracted details (use the company name OR phone OR email as the name placeholder if no real name is visible), status set to **"cold"** (a screenshot/company info capture is a cold lead — they have NOT requested a callback or generated a website yet), and media_image_url set to that same image URL so the screenshot is saved to the contact's media gallery. Do NOT set schedule_callback_tomorrow unless the visitor has explicitly asked for a call.
   c. Then reply briefly confirming you've saved their details — do NOT ask them to retype the info you can already see, and do NOT promise a callback unless they actually asked for one.
    d. If extraction returns nothing usable, politely ask the visitor to type their name and phone/email so you can save them properly.
9. **CUSTOM PAYMENTS — "Pay" QUICK ACTION:** If the visitor uses the "Pay" quick action OR asks to "pay an amount", "pay a deposit", "settle a balance", "pay an invoice", "make a custom payment" — collect TWO things: (a) the amount in GBP (e.g. £250), (b) a short reason/description (e.g. "Deposit for Acme website", "Final balance — invoice INV-203"). Once you have BOTH, call **create_custom_payment** with amount_gbp and description. If the visitor has already shared an email, pass it as client_email so we can track the payment. Reply with the Stripe link returned (the link itself is enough — visitor can click it to pay). Do NOT make up amounts. If amount is unclear or below £1, ask once for clarification.
10. **BANK-TRANSFER INVOICES — "Pay by invoice":** When closing a deal or sending a payment option, ALWAYS offer two ways to pay: (1) a Stripe card link via `create_payment_link` / `create_custom_payment`, OR (2) a proper bank-transfer invoice via `create_invoice`. If the client asks for an invoice, says they'd "rather pay by bank transfer", needs something for accounts/PO processing, is a business buyer, or you're issuing a custom invoice for any work — call **create_invoice**. Collect billing name + email + line items (description + GBP price) as a minimum; ask for company / billing address / PO ref if it's clearly a business. Default payment terms are 28 days — do not change unless explicitly requested. The system emails a PDF + hosted link automatically, auto-creates the CRM contact, and chases reminders. Never invent prices or line items.


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
- If a CANDIDATE (worker looking for shifts) tells you their details — name, email, phone, location/postcode, role/skills, availability — IMMEDIATELY call **save_candidate** with the email and any other new fields. Even partial info. This registers them on our books so they can set availability and pick up shifts. After saving, confirm warmly ("You're on our books, Sam — go ahead and tap any day in the calendar to set when you're free") and tell them they can now set availability in the schedule.
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
- Create sales events/Let's Talk notes for existing contacts with create_sales_event.
- Find local businesses that appear to have no standalone website and add them to contacts with find_local_leads.
- **Send the Pixcellor welcome/info email** (sales-welcome-info template) to a contact or raw email with **send_welcome_email**. This actually sends the email and auto-logs a CRM communication event.
- **Send any supported transactional email** (sales-welcome-info, project-requirements-reminder, order-complete) with **send_transactional_email**.
- **Update an existing contact** (name, contact_name, phone, email, location, notes, industry, website) with **update_contact**, only passing the fields that change.
- **Change lead temperature** with **update_contact_status** (cold/aware/warm/hot/gold/archived).
- **Append a free-form note** to a contact's notes field with **append_contact_note** (use when the dev says "add a note that…" instead of creating a sales event).
- **Tick off Let's Talk items** with **complete_callback** when the dev says they've done it / called them back / it's handled.
- **Add a contact person** to an existing client/company with **add_contact_person** (multi-contact feature).
- **Look up an order or project status** by email with **lookup_customer** (returns orders, profile, project_status, prior chats).
- **Mark orders delivered/undelivered** with **mark_order_delivered** / **mark_order_undelivered** (session_id required).
- **Update an edit request status** (open/in_progress/done) with **update_edit_request_status**.
- **Take over a live chat** by listing recent conversations with **list_open_chats** then replying with **send_chat_reply** (this pauses the bot for that conversation — only do it when the dev clearly asks to reply/take over).
- **Summarise recent activity** with **recent_activity** for "what happened today?", "show open follow-ups", "who hasn't replied in 7 days?".
- **Bulk status update** with **bulk_update_status** ("mark these 5 as warm").
- **Archive a contact** with **archive_contact** (non-destructive).
- **Schedule a Let's Talk follow-up today** with **schedule_callback_today** (defaults 09:00 Europe/London if no time given — always use this for "today" requests so the time is correct).
- **Check if a lead has visited the site** with **lookup_visitor_activity** (by email or company website).
- **Generate a paste-ready package recommendation** with **recommend_package**.
- **Pull chat history** for a client_id or conversation_id with **fetch_chat_history** before replying via send_chat_reply.
- **Create a manual / custom order** with **create_custom_order** (records a paid offline order or a draft/quote in stripe_checkout_sessions; mirrors the New Order dialog in the portal).
- **Create a Stripe payment link** for any custom amount with **create_payment_link** (one-time or monthly subscription, optionally attached to a draft order session_id from create_custom_order).
- **List recent custom payment links** with **list_payment_links** (returns urls, amounts, and paid status).

## Search & lookup rules
- find_contact searches name, contact_name, email, phone, company website, location, status, industry — use a single keyword from any of these.
- Before any update / status change / event / email, call find_contact (or use the recent-contact context) to get the contact_id. Never invent UUIDs.
- For order/delivery/edit-request actions, use lookup_customer first to get the session_id or request_id.

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
- If create_contact returns existed: true (matched by email/phone), DO NOT try to create a duplicate. Treat the returned contact.id as the target and attach any callback/sales event to it via create_sales_event.
- For callback/reminder times, treat relative dates like "tomorrow", "next week", and "in 1 week" as clear. If no time is given, default to 09:00 Europe/London and include callback_at as ISO.

## Custom orders & payment links (CRITICAL)
- When the dev says things like "create an order for X", "log a £750 order for jane@x.com", "draft order for Acme £500", "make a manual order" — call **create_custom_order**. **NEVER assume an order is paid.** Default to mark_paid=false (unpaid draft/quote). Only use mark_paid=true if the dev EXPLICITLY says it's already paid (e.g. "paid", "bank transfer received", "cash in hand", "invoice settled", "they've paid"). If it's ambiguous, ask "Is this already paid, or unpaid/awaiting payment?" before creating. amount_gbp is in pounds (e.g. 750 not 75000). Default billing is "one-time"; use "monthly" or "yearly" only if they explicitly say it's a subscription.
- **CRITICAL: For any UNPAID custom order, you MUST also generate a Stripe payment link in the same turn.** Workflow: call create_custom_order with mark_paid=false, capture the returned session_id INTERNALLY (do not show it to the dev), then immediately call create_payment_link with attach_session_id set to that session_id. Never leave a draft order without a link — the client needs a way to pay.
- When the dev says "create a payment link", "send Stripe link for £500", "make a £200 link for jane@x.com" — call **create_payment_link**. amount_gbp is in pounds. Default mode is "payment" (one-time); use "subscription" for monthly recurring.
- **Reply formatting for orders/links:** ALWAYS show the payment link url as a clickable markdown link so the dev can copy it. NEVER expose internal IDs (session_id, order_code, stripe_payment_link_id, price_id, product_id) in the chat reply — they're for internal tracking only. Just confirm the order was created, the amount, the client email, and the payment link.
- For "show me recent payment links" / "what links did I create today" / "list my links" — call **list_payment_links**.
- Never invent prices, urls, or session ids. If you're missing the amount or email, ask one short question first.`;

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
            description: "Which package to show: fullWorks (£169 website, up to 3 pages), elite (£479 or £60/mo, up to 10 pages, unlimited edits, SEO/AEO), or retainer (£2,469/mo or £24,690/yr tech department)",
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
      name: "save_candidate",
      description: "Register or update a candidate (worker looking for shifts). Call this AS SOON AS the candidate gives you their name and an email — even with partial info. Always include their email so we can key the record. Use this for the candidate sign-up / availability registration flow.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Candidate's email address (required)." },
          full_name: { type: "string", description: "Candidate's full name." },
          phone: { type: "string", description: "Phone number if provided." },
          location: { type: "string", description: "City / area / postcode they're based in." },
          headline: { type: "string", description: "Short summary of who they are (e.g. 'Experienced bartender, 5 yrs')." },
          current_role_title: { type: "string", description: "Their current or most recent job title." },
          years_experience: { type: "number", description: "Years of experience in their field." },
          skills: { type: "array", items: { type: "string" }, description: "Skills / role tags (e.g. ['waiter','barista','security'])." },
          preferred_locations: { type: "array", items: { type: "string" }, description: "Areas they're willing to work in." },
          availability_date: { type: "string", description: "ISO date (YYYY-MM-DD) of when they can start." },
          notes: { type: "string", description: "Any other context worth remembering." },
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
          status: { type: "string", enum: ["cold","aware","warm","hot","gold"], description: "Lead temperature. Default to 'cold' for passive captures (screenshot uploads, just company/contact info added with no engagement). Only use 'hot' when the visitor has actively requested a callback via Let's Talk, asked for a call organically, or completed the website preview/generation flow." },
          media_image_url: { type: "string", description: "Public URL of an uploaded screenshot/image to attach to the contact's media gallery (e.g. the screenshot used to capture their details)." },
          schedule_callback_tomorrow: { type: "boolean", description: "True when the visitor requested a call. Creates a same-day callback event (2 hours from now)." },
          send_welcome_email: { type: "boolean", description: "True when the visitor requested package/process info by email. Sends the Pixcellor welcome sales email." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "extract_screenshot_contact",
      description: "Analyze an uploaded screenshot/image URL and extract visible contact details like name, company, location, email, phone, website. Use this whenever the visitor uploads an image — especially screenshots showing a phone number, email, or company name — so the details can then be saved via save_contact.",
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
      name: "create_custom_payment",
      description: "Create a Stripe payment link for a custom amount the visitor wants to pay (e.g. deposit, balance, invoice settlement). Returns a live Stripe URL the visitor clicks to pay. Use ONLY when the visitor has explicitly told you the amount AND a short reason/description.",
      parameters: {
        type: "object",
        properties: {
          amount_gbp: { type: "number", description: "Amount in pounds, between 1 and 1,000,000." },
          description: { type: "string", description: "Short description of what this payment is for (max 200 chars). Shown on Stripe checkout." },
          client_email: { type: "string", description: "Visitor's email if known, for tracking." },
        },
        required: ["amount_gbp", "description"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_candidate",
      description: "Capture a JOB SEEKER (someone looking for work, asking about vacancies, sending their CV) as a recruitment candidate. Use this INSTEAD of save_contact whenever the visitor is asking for a job, not buying a website. Capture as soon as you have a name + email or phone, even partial info — call again later to enrich.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Their full name." },
          email: { type: "string" },
          phone: { type: "string" },
          location: { type: "string", description: "City or area." },
          headline: { type: "string", description: "Their professional headline (e.g. 'Senior plumber', 'React developer with 5y exp')." },
          current_role_title: { type: "string" },
          years_experience: { type: "number" },
          skills: { type: "array", items: { type: "string" }, description: "Skills / specialities they mentioned." },
          desired_work_type: { type: "string", enum: ["any","permanent","contract","temp","freelance"] },
          desired_arrangement: { type: "string", enum: ["any","onsite","hybrid","remote"] },
          right_to_work: { type: "string", enum: ["unknown","uk_citizen","settled","visa_required"] },
          linkedin_url: { type: "string" },
          portfolio_url: { type: "string" },
          notes: { type: "string", description: "Anything else relevant from the conversation." },
        },
        required: ["full_name"],
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
  {
    type: "function" as const,
    function: {
      name: "send_transactional_email",
      description: "Send any supported transactional email template to a contact or raw email. Templates: 'sales-welcome-info' (info/welcome), 'project-requirements-reminder' (chase the brief), 'order-complete' (project finished). Auto-logs a CRM communication event when contact_id is given.",
      parameters: {
        type: "object",
        properties: {
          template: { type: "string", enum: ["sales-welcome-info", "project-requirements-reminder", "order-complete"] },
          contact_id: { type: "string", description: "Contact UUID (preferred)." },
          email: { type: "string", description: "Recipient email if contact_id unknown." },
          name: { type: "string", description: "Recipient name for personalisation." },
          template_data: { type: "object", description: "Extra template variables, optional.", additionalProperties: true },
        },
        required: ["template"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_contact",
      description: "Update an existing contact's editable fields (name, phone, email, location, notes, industry, website, contact_name). Only pass fields that should change; existing values are preserved for omitted fields.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          name: { type: "string" },
          contact_name: { type: "string", description: "Primary contact person's name (separate from company name)." },
          phone: { type: "string" },
          email: { type: "string" },
          location: { type: "string" },
          notes: { type: "string" },
          industry: { type: "string" },
          website: { type: "string" },
        },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_contact_status",
      description: "Set a contact's lead temperature/status. Allowed: cold, aware, warm, hot, gold, archived.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          status: { type: "string", enum: ["cold", "aware", "warm", "hot", "gold", "archived"] },
        },
        required: ["contact_id", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "append_contact_note",
      description: "Append a short free-form note to an existing contact's notes field (does NOT create a sales event). Use when the dev says 'add a note that…' or 'just note on their record…'.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          note: { type: "string" },
        },
        required: ["contact_id", "note"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "complete_callback",
      description: "Mark a callback / contact_event as completed (ticks it off the open list).",
      parameters: {
        type: "object",
        properties: { event_id: { type: "string" } },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_contact_person",
      description: "Add an additional contact person (multi-contact) to an existing client/company.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "Parent client/company UUID." },
          name: { type: "string" },
          job_title: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
        },
        required: ["contact_id", "name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_customer",
      description: "Look up a customer's orders, inquiries, project brief and project status by email. Use for 'what did X buy?', 'what stage is X at?', 'has X paid?'.",
      parameters: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mark_order_delivered",
      description: "Mark an order/checkout session as delivered with the live domain.",
      parameters: {
        type: "object",
        properties: {
          session_id: { type: "string", description: "Stripe checkout session_id." },
          delivered_domain: { type: "string", description: "Live domain (e.g. acme.com)." },
        },
        required: ["session_id", "delivered_domain"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mark_order_undelivered",
      description: "Revert an order back to 'open' (clears delivered domain/date).",
      parameters: {
        type: "object",
        properties: { session_id: { type: "string" } },
        required: ["session_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_edit_request_status",
      description: "Change an edit request's status. Allowed: open, in_progress, done.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "done"] },
        },
        required: ["request_id", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_open_chats",
      description: "List recent live-chat conversations and whether the bot is paused (manual handoff). Use to find the conversation_id before send_chat_reply.",
      parameters: { type: "object", properties: { limit: { type: "number" } } },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_chat_reply",
      description: "Take over a live-chat conversation and reply as a human admin. This pauses the bot for that conversation.",
      parameters: {
        type: "object",
        properties: {
          conversation_id: { type: "string" },
          content: { type: "string" },
        },
        required: ["conversation_id", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recent_activity",
      description: "Summarise recent CRM activity: open callbacks, today's events, contacts updated in the last N days, open edit requests. Use for 'what happened today?', 'show open callbacks', 'who hasn't replied in 7 days?'.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Window in days, default 7." },
          stale_days: { type: "number", description: "Flag contacts with no event/update in this many days, default 7." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bulk_update_status",
      description: "Set status on multiple contacts at once (e.g. 'mark these 5 as warm'). Allowed: cold, aware, warm, hot, gold, archived.",
      parameters: {
        type: "object",
        properties: {
          contact_ids: { type: "array", items: { type: "string" }, description: "Up to 50 contact UUIDs." },
          status: { type: "string", enum: ["cold", "aware", "warm", "hot", "gold", "archived"] },
        },
        required: ["contact_ids", "status"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "archive_contact",
      description: "Archive a contact (sets status='archived' — non-destructive, hides from active lists).",
      parameters: {
        type: "object",
        properties: { contact_id: { type: "string" } },
        required: ["contact_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "merge_contacts",
      description: "Merge duplicate contacts into one survivor record. Re-parents all events/persons/chats/AI samples to the survivor and deletes the duplicates. Only call when the dev has explicitly confirmed a merge or asked to dedupe specific records — never auto-merge based on your own judgement. Max 5 duplicates per call.",
      parameters: {
        type: "object",
        properties: {
          survivor_id: { type: "string", description: "UUID of the contact to keep." },
          duplicate_ids: { type: "array", items: { type: "string" }, description: "UUIDs of duplicate contacts to merge into the survivor. Max 5." },
        },
        required: ["survivor_id", "duplicate_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_callback_today",
      description: "Schedule a callback today (or a given date) at a UK local time. Defaults to 09:00 Europe/London if no time given. Pass either a contact_id or contact_name to find one.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string" },
          title: { type: "string", description: "Short callback title." },
          description: { type: "string" },
          time: { type: "string", description: "Local UK time HH:mm, default 09:00." },
          date: { type: "string", description: "ISO date (YYYY-MM-DD), default today in Europe/London." },
        },
        required: ["contact_id", "title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lookup_visitor_activity",
      description: "Find recent visitor/falloff activity for a contact (did this lead visit the site recently? what pages? did they hit checkout?). Pass email or company website.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          website: { type: "string", description: "Company website domain." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recommend_package",
      description: "Generate a short package recommendation summary the dev can paste into an email. Pass quick context (industry, page count, budget hints, requirements).",
      parameters: {
        type: "object",
        properties: {
          industry: { type: "string" },
          page_count: { type: "number" },
          needs_subscription: { type: "boolean" },
          notes: { type: "string", description: "Free-form context about the lead." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fetch_chat_history",
      description: "Load a recent live-chat conversation (messages) for a given client_id, so the dev can be briefed before replying.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string" },
          conversation_id: { type: "string", description: "Optional — exact conversation UUID instead of client_id." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_custom_order",
      description: "Create a manual / custom order in the orders database (mirrors the New Order dialog in the portal). Use for paid offline orders (bank transfer, cash, invoice) and for drafts/quotes awaiting payment. Returns session_id, order_status, payment_status.",
      parameters: {
        type: "object",
        properties: {
          customer_email: { type: "string", description: "Buyer's email address (required)." },
          customer_name: { type: "string", description: "Buyer's name, optional." },
          package_name: { type: "string", description: "Package label, e.g. 'Full Works', 'Elite', 'Bespoke build'. Required." },
          amount_gbp: { type: "number", description: "Amount in pounds (e.g. 750 for £750). Required, between 0.01 and 1,000,000." },
          mark_paid: { type: "boolean", description: "True ONLY if the dev explicitly stated the order is already paid (bank transfer, cash, invoice settled). Defaults to false (unpaid draft/quote). Never assume paid." },
          billing: { type: "string", enum: ["one-time", "monthly", "yearly"], description: "Defaults to one-time." },
          custom_label: { type: "string", description: "Optional free-form label for custom packages." },
          notes: { type: "string", description: "Internal admin notes (max 1000 chars)." },
        },
        required: ["customer_email", "package_name", "amount_gbp"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_payment_link",
      description: "Create a Stripe payment link for a custom amount (one-time or monthly subscription). Returns the live url to share with the client. Optionally attach to an existing draft order session_id from create_custom_order.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the link is for (max 200 chars). Shown on Stripe checkout. Required." },
          amount_gbp: { type: "number", description: "Amount in pounds. Required, between 1 and 1,000,000." },
          quantity: { type: "number", description: "Quantity, defaults to 1." },
          mode: { type: "string", enum: ["payment", "subscription"], description: "payment = one-time charge, subscription = monthly recurring. Defaults to payment." },
          client_email: { type: "string", description: "Optional client email tied to the link for tracking." },
          internal_note: { type: "string", description: "Internal note (max 1000 chars)." },
          attach_session_id: { type: "string", description: "Optional — session_id of a draft order returned by create_custom_order. Ties the link to that order." },
        },
        required: ["description", "amount_gbp"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_payment_links",
      description: "List the most recent custom Stripe payment links created from the portal. Returns url, amount, mode, status (open/paid), client_email, created_at.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max links to return (default 10, max 50)." },
          status: { type: "string", enum: ["open", "paid", "all"], description: "Filter by status. Defaults to all." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_invoice",
      description: "Create a PROPER bank-transfer invoice (PDF emailed to client, hosted invoice page, 28-day payment terms, auto reminders). Use when the customer wants to pay by bank transfer instead of card, OR when issuing a custom invoice for any work. Auto-creates / links a CRM contact for the client. NEVER invent line items or amounts — only use values the customer explicitly confirmed. Returns invoice_number and hosted_url; show the hosted_url as a clickable markdown link.",
      parameters: {
        type: "object",
        required: ["billing_name", "billing_email", "line_items"],
        properties: {
          billing_name: { type: "string", description: "Client's full name (required)." },
          billing_email: { type: "string", description: "Client's email — invoice and reminders go here (required)." },
          billing_company: { type: "string", description: "Client's company name." },
          billing_phone: { type: "string" },
          billing_address_line1: { type: "string" },
          billing_city: { type: "string" },
          billing_postcode: { type: "string" },
          billing_country: { type: "string", description: "Defaults to 'United Kingdom'." },
          po_reference: { type: "string", description: "Optional purchase-order reference." },
          due_days: { type: "number", description: "Payment terms in days. Defaults to 28 — do not change unless the customer explicitly asks." },
          line_items: {
            type: "array",
            minItems: 1,
            description: "Invoice line items. Amounts MUST be in GBP pence (e.g. £250 = 25000). Quantities default to 1.",
            items: {
              type: "object",
              required: ["description", "unit_amount_pence"],
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_amount_pence: { type: "number" },
              },
            },
          },
          package_slug: { type: "string", description: "Optional package slug ('full-works' | 'elite' | 'retainer-growth' | 'retainer-scale' | 'retainer-enterprise') — sets the line item automatically if provided alone." },
          internal_note: { type: "string", description: "Private note for our records — not shown to client." },
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

function extractPhoneFromText(text: string): string | null {
  if (!text) return null;
  // Look for digit groups; tolerate +, spaces, dashes, parens
  const candidates = text.match(/(\+?\d[\d\s().-]{7,}\d)/g) ?? [];
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, "");
    // UK mobile/landline length 10-11, intl 9-15
    if (digits.length >= 9 && digits.length <= 15) {
      return raw.trim().replace(/\s+/g, " ").slice(0, 40);
    }
  }
  return null;
}

function normalisePhoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-10);
}

function extractNameHint(text: string): string | null {
  if (!text) return null;
  // Patterns like "I'm Alex", "my name is Alex Smith", "this is Alex"
  const m =
    text.match(/\b(?:i'?m|i am|my name is|name's|this is|it'?s)\s+([A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+)?)/) ||
    text.match(/\b(?:i'?m|i am|my name is|name's|this is|it'?s)\s+([a-z][a-z'’-]+(?:\s+[a-z][a-z'’-]+)?)/i);
  if (!m) return null;
  const candidate = m[1].trim().slice(0, 80);
  // Reject common false positives
  if (/^(looking|interested|trying|here|good|fine|ok|okay|just|the|a)\b/i.test(candidate)) return null;
  return candidate;
}

// Auto-upsert a CRM contact when a live-chat visitor shares email or phone.
// Idempotent: only runs when the conversation has no contact_id yet.
async function linkChatVisitorToContact(
  supabase: DbClient,
  conversationId: string,
  latestUserText: string,
): Promise<void> {
  try {
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("id, contact_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv || conv.contact_id) return;

    const email = (latestUserText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "")
      .toLowerCase()
      .trim();
    const phone = extractPhoneFromText(latestUserText);
    if (!email && !phone) return;

    const nameHint = extractNameHint(latestUserText);
    const phoneKey = normalisePhoneKey(phone);
    const today = new Date().toISOString().slice(0, 10);

    // Find existing contact by email then phone
    let existingId: string | null = null;
    let existingStatus: string | null = null;
    let existingName: string | null = null;
    let existingNotes: string | null = null;

    if (email) {
      const { data } = await supabase
        .from("contacts")
        .select("id, status, name, notes")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (data) {
        existingId = data.id;
        existingStatus = data.status;
        existingName = data.name;
        existingNotes = data.notes;
      }
    }
    if (!existingId && phoneKey) {
      // Pull a small set and match in JS on normalised key
      const { data: candidates } = await supabase
        .from("contacts")
        .select("id, status, name, notes, phone")
        .not("phone", "is", null)
        .limit(500);
      const hit = (candidates ?? []).find((c) => normalisePhoneKey(c.phone) === phoneKey);
      if (hit) {
        existingId = hit.id;
        existingStatus = hit.status;
        existingName = hit.name;
        existingNotes = hit.notes;
      }
    }

    let contactId: string;
    if (existingId) {
      const noteLine = `Shared contact via live chat on ${today}.`;
      const mergedNotes = [existingNotes, noteLine].filter(Boolean).join("\n").slice(0, 4000);
      const shouldWarm = existingStatus === "cold" || existingStatus === "aware";
      const nameNeedsFix = !existingName || existingName === "Unknown" || existingName === "Chat visitor";
      await supabase
        .from("contacts")
        .update({
          email: email || undefined,
          phone: phone || undefined,
          name: nameNeedsFix && nameHint ? nameHint : undefined,
          notes: mergedNotes,
          status: shouldWarm ? "warm" : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);
      contactId = existingId;
    } else {
      const fallbackName = nameHint
        || (email ? email.split("@")[0] : null)
        || (phone ? `Chat visitor • ${phone.replace(/\D/g, "").slice(-4)}` : "Chat visitor");
      const { data: created, error: insertErr } = await supabase
        .from("contacts")
        .insert({
          name: fallbackName,
          contact_name: nameHint || null,
          email: email || null,
          phone: phone || null,
          industry: "general",
          source: "chat",
          status: "warm",
          notes: `Shared from live chat on ${today}.`,
        })
        .select("id")
        .single();
      if (insertErr || !created) {
        console.error("linkChatVisitorToContact insert failed:", insertErr);
        return;
      }
      contactId = created.id;
    }

    // Link conversation to contact
    await supabase
      .from("chat_conversations")
      .update({ contact_id: contactId, updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Audit event
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Shared contact via live chat",
      description: [
        email ? `Email: ${email}` : null,
        phone ? `Phone: ${phone}` : null,
        nameHint ? `Name: ${nameHint}` : null,
      ].filter(Boolean).join("\n"),
      event_type: "communication",
    });
  } catch (e) {
    console.error("linkChatVisitorToContact error:", e);
  }
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

// Upsert a candidate (worker) — only writes fields the AI provided. Mirrors saveBrief.
async function saveCandidate(
  supabase: DbClient,
  args: Record<string, unknown>
) {
  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  // Look up existing candidate by email
  const { data: existing } = await supabase
    .from("candidates")
    .select("id, full_name")
    .ilike("email", email)
    .maybeSingle();

  const payload: Record<string, unknown> = { email };
  if (typeof args.full_name === "string" && args.full_name.trim()) {
    payload.full_name = args.full_name.trim();
  } else if (!existing) {
    // full_name is NOT NULL — fall back to email local-part if AI didn't pass one
    payload.full_name = email.split("@")[0];
  }
  for (const key of ["phone", "location", "headline", "current_role_title", "notes"] as const) {
    if (typeof args[key] === "string" && (args[key] as string).trim()) {
      payload[key] = (args[key] as string).trim();
    }
  }
  if (typeof args.years_experience === "number" && Number.isFinite(args.years_experience)) {
    payload.years_experience = Math.max(0, Math.round(args.years_experience));
  }
  if (Array.isArray(args.skills)) {
    payload.skills = (args.skills as unknown[]).filter((v) => typeof v === "string" && v.trim()).map((v) => (v as string).trim());
  }
  if (Array.isArray(args.preferred_locations)) {
    payload.preferred_locations = (args.preferred_locations as unknown[]).filter((v) => typeof v === "string" && v.trim()).map((v) => (v as string).trim());
  }
  if (typeof args.availability_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.availability_date)) {
    payload.availability_date = args.availability_date;
  }
  payload.source = "chat";
  payload.is_open_to_work = true;

  let result;
  if (existing?.id) {
    result = await supabase
      .from("candidates")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .maybeSingle();
  } else {
    result = await supabase
      .from("candidates")
      .insert(payload)
      .select()
      .maybeSingle();
  }

  if (result.error) {
    console.error("saveCandidate error:", result.error);
    return { ok: false, error: result.error.message };
  }
  return { ok: true, candidate: result.data, created: !existing };
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
  const cleanedNotes = cleanDevNotes(args.notes, 900);
  // Notes/extra context now live as a contact_event ("Note"), NOT on the contact row itself.
  const noteBody = [
    trade ? `Trade: ${trade}` : "",
    cleanedNotes,
  ].filter(Boolean).join("\n");

  const phone = cleanText(args.phone, 40);
  const normalizedPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";
  const payload = {
    name,
    phone: phone || null,
    email: email || null,
    location: cleanText(args.location, 160) || null,
    industry: industry || "general",
    website: website || null,
    notes: null,
    source: "dev_chat",
  };

  const insertNoteEvent = async (contactId: string) => {
    if (!noteBody) return;
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Note",
      description: noteBody,
      event_type: "note",
    });
  };

  // Dedup: if a contact with same email or normalized phone exists, return it instead of erroring.
  let existing: { id: string; name: string; email: string | null; phone: string | null } | null = null;
  if (email) {
    const { data } = await supabase.from("contacts").select("id, name, email, phone").ilike("email", email).limit(1).maybeSingle();
    if (data) existing = data as typeof existing;
  }
  if (!existing && normalizedPhone && normalizedPhone.length >= 5) {
    const { data } = await supabase.from("contacts").select("id, name, email, phone").limit(50);
    const match = (data ?? []).find((c) => (c.phone ?? "").replace(/[^0-9+]/g, "") === normalizedPhone);
    if (match) existing = match as typeof existing;
  }
  if (existing) {
    await insertNoteEvent(existing.id);
    return { ok: true, contact: { id: existing.id, name: existing.name, email: existing.email, phone: existing.phone }, existed: true };
  }

  const { data, error } = await supabase.from("contacts").insert(payload).select("id, name, email, phone").single();
  if (error) return { ok: false, error: error.message };
  await insertNoteEvent(data.id);
  return { ok: true, contact: data, existed: false };
}

async function saveCustomerContact(supabase: DbClient, args: Record<string, unknown>, conversationId: string | null) {
  const name = cleanText(args.name, 100);
  const email = cleanText(args.email, 255).toLowerCase();
  const phone = cleanText(args.phone, 40);
  const industry = cleanText(args.industry, 80).toLowerCase() || "general";
  const website = cleanWebsite(args.website);
  const shouldScheduleCallback = args.schedule_callback_tomorrow === true;
  const shouldSendWelcomeEmail = args.send_welcome_email === true;
  const requestedStatus = cleanText(args.status, 20).toLowerCase();
  const status = ["cold","aware","warm","hot","gold"].includes(requestedStatus) ? requestedStatus : null;
  const mediaImageUrl = cleanText(args.media_image_url, 1000);
  const mediaUrl = /^https:\/\//i.test(mediaImageUrl) ? mediaImageUrl : "";
  if (!name) return { ok: false, error: "missing_name" };
  if (!email && !phone) return { ok: false, error: "email_or_phone_required" };
  if (shouldSendWelcomeEmail && !email) return { ok: false, error: "email_required_for_welcome_email" };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  // Notes/context now live as a contact_event ("Note"), NOT on the contact row itself.
  const noteBody = [
    cleanText(args.notes, 850),
    shouldSendWelcomeEmail ? "Requested Pixcellor package/process info by email." : "",
    mediaUrl ? "Details captured from uploaded screenshot." : "",
    conversationId ? `Live chat: ${conversationId}` : "Live chat lead",
  ].filter(Boolean).join("\n");
  const existingQuery = supabase.from("contacts").select("id, media").limit(1);
  const { data: existing } = email
    ? await existingQuery.ilike("email", email).maybeSingle()
    : await existingQuery.eq("phone", phone).maybeSingle();

  const mergeMedia = (current: unknown): string[] => {
    const arr = Array.isArray(current) ? current.filter((v): v is string => typeof v === "string") : [];
    if (mediaUrl && !arr.includes(mediaUrl)) arr.push(mediaUrl);
    return arr;
  };

  const insertNoteEvent = async (contactId: string) => {
    if (!noteBody) return;
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Note",
      description: noteBody,
      event_type: "note",
    });
  };

  if (existing?.id) {
    const update: Record<string, unknown> = {
      name, phone: phone || null, email: email || null, industry, website: website || null,
      updated_at: new Date().toISOString(),
    };
    if (status) update.status = status;
    if (mediaUrl) update.media = mergeMedia(existing.media);
    const { data, error } = await supabase
      .from("contacts").update(update).eq("id", existing.id)
      .select("id, name, email, phone").single();
    if (error) return { ok: false, error: error.message };
    await insertNoteEvent(data.id);
    await handleCustomerContactFollowUps(supabase, data.id, { name, email, phone, shouldScheduleCallback, shouldSendWelcomeEmail });
    return { ok: true, contact: data, updated: true, callback_scheduled: shouldScheduleCallback, welcome_email_requested: shouldSendWelcomeEmail };
  }

  const insert: Record<string, unknown> = {
    name, phone: phone || null, email: email || null, industry, website: website || null, notes: null, source: "chat",
  };
  if (status) insert.status = status;
  if (mediaUrl) insert.media = [mediaUrl];
  const { data, error } = await supabase
    .from("contacts").insert(insert)
    .select("id, name, email, phone").single();
  if (error) return { ok: false, error: error.message };
  await insertNoteEvent(data.id);
  await handleCustomerContactFollowUps(supabase, data.id, { name, email, phone, shouldScheduleCallback, shouldSendWelcomeEmail });
  return { ok: true, contact: data, updated: false, callback_scheduled: shouldScheduleCallback, welcome_email_requested: shouldSendWelcomeEmail };
}

async function handleCustomerContactFollowUps(
  supabase: DbClient,
  contactId: string,
  details: { name: string; email: string; phone: string; shouldScheduleCallback: boolean; shouldSendWelcomeEmail: boolean }
) {
  if (details.shouldScheduleCallback) {
    // Same-day callback: 2 hours from now (gives time to action it today).
    const callbackAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: "Call back requested from website chat",
      description: `Alex chat captured callback request for ${details.name}${details.phone ? ` (${details.phone})` : ""}. Call back today.`,
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
  const safe = q.replace(/[%_,()]/g, "").trim();
  if (!safe) return { ok: false, error: "missing_query", matches: [] };
  const pattern = `%${safe}%`;
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, contact_name, email, phone, location, industry, website, status, updated_at")
    .or(`name.ilike.${pattern},contact_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},industry.ilike.${pattern},website.ilike.${pattern},location.ilike.${pattern},status.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(8);
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TEMPLATES = new Set(["sales-welcome-info", "project-requirements-reminder", "order-complete"]);
const TEMPLATE_LABELS: Record<string, string> = {
  "sales-welcome-info": "Welcome / info email sent",
  "project-requirements-reminder": "Project requirements reminder sent",
  "order-complete": "Order complete email sent",
};

async function devSendTemplateEmail(supabase: DbClient, args: Record<string, unknown>) {
  const template = cleanText(args.template, 80);
  if (!ALLOWED_TEMPLATES.has(template)) return { ok: false, error: "invalid_template" };
  const contactIdRaw = cleanText(args.contact_id, 80);
  const contactId = UUID_RE.test(contactIdRaw) ? contactIdRaw : "";
  let email = cleanText(args.email, 255).toLowerCase();
  let name = cleanText(args.name, 100);

  if (contactId) {
    const { data: contact } = await supabase.from("contacts").select("id, name, email").eq("id", contactId).maybeSingle();
    if (!contact) return { ok: false, error: "contact_not_found" };
    if (!email) email = String(contact.email ?? "").toLowerCase();
    if (!name) name = String(contact.name ?? "");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };

  const extra = (args.template_data && typeof args.template_data === "object") ? args.template_data as Record<string, unknown> : {};
  const idempotencyKey = `dev-${template}-${contactId || email}-${Date.now()}`;
  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: template,
      recipientEmail: email,
      idempotencyKey,
      templateData: { name: name || undefined, ...extra },
    },
  });
  if (error) return { ok: false, error: "email_send_failed", detail: String(error.message ?? error) };

  if (contactId) {
    await supabase.from("contact_events").insert({
      contact_id: contactId,
      title: TEMPLATE_LABELS[template] ?? `${template} email sent`,
      description: `Sent ${template} template to ${email} via dev assistant.`,
      event_type: "communication",
    });
  }
  return { ok: true, email, contact_id: contactId || null, template };
}

async function devUpdateContact(supabase: DbClient, args: Record<string, unknown>) {
  const id = cleanText(args.contact_id, 80);
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid_contact" };
  const { data: existing, error: fetchErr } = await supabase
    .from("contacts").select("*").eq("id", id).maybeSingle();
  if (fetchErr || !existing) return { ok: false, error: "contact_not_found" };

  const update: Record<string, unknown> = {};
  const set = (key: string, val: unknown) => {
    if (val === undefined || val === null) return;
    if (typeof val === "string" && !val.trim()) return;
    update[key] = typeof val === "string" ? val.trim() : val;
  };
  set("name", args.name);
  set("contact_name", args.contact_name);
  set("phone", args.phone);
  set("location", args.location);
  set("notes", args.notes);
  if (typeof args.email === "string" && args.email.trim()) {
    const e = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "invalid_email" };
    update.email = e;
  }
  if (typeof args.industry === "string" && args.industry.trim()) update.industry = args.industry.trim().toLowerCase();
  if (typeof args.website === "string" && args.website.trim()) {
    const w = cleanWebsite(args.website);
    if (w) update.website = w;
  }
  if (Object.keys(update).length === 0) return { ok: false, error: "nothing_to_update" };
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("contacts").update(update).eq("id", id).select("id, name, contact_name, email, phone, status, industry, website, location, notes").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data, updated_fields: Object.keys(update) };
}

async function devUpdateContactStatus(supabase: DbClient, args: Record<string, unknown>) {
  const id = cleanText(args.contact_id, 80);
  const status = cleanText(args.status, 40).toLowerCase();
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid_contact" };
  if (!["cold","aware","warm","hot","gold","archived"].includes(status)) return { ok: false, error: "invalid_status" };
  const { data, error } = await supabase.from("contacts").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id, name, status").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, contact: data };
}

async function devAppendContactNote(supabase: DbClient, args: Record<string, unknown>) {
  const id = cleanText(args.contact_id, 80);
  const note = cleanText(args.note, 900);
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid_contact" };
  if (!note) return { ok: false, error: "missing_note" };
  const { data: existing } = await supabase.from("contacts").select("notes").eq("id", id).maybeSingle();
  if (!existing) return { ok: false, error: "contact_not_found" };
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const merged = [existing.notes, `[${stamp}] ${note}`].filter(Boolean).join("\n");
  const { error } = await supabase.from("contacts").update({ notes: merged, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function devCompleteCallback(supabase: DbClient, args: Record<string, unknown>) {
  const id = cleanText(args.event_id, 80);
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid_event" };
  const { error } = await supabase.from("contact_events")
    .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function devAddContactPerson(supabase: DbClient, args: Record<string, unknown>) {
  const contactId = cleanText(args.contact_id, 80);
  const name = cleanText(args.name, 100);
  if (!UUID_RE.test(contactId)) return { ok: false, error: "invalid_contact" };
  if (!name) return { ok: false, error: "missing_name" };
  const email = cleanText(args.email, 255).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };
  const payload = {
    contact_id: contactId,
    name,
    job_title: cleanText(args.job_title, 160) || null,
    phone: cleanText(args.phone, 40) || null,
    email: email || null,
  };
  const { data, error } = await supabase.from("contact_persons").insert(payload).select("id, name, job_title, phone, email").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, person: data };
}

async function devLookupCustomer(supabase: DbClient, args: Record<string, unknown>) {
  const email = cleanText(args.email, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_email" };
  const [lookup, profile, status] = await Promise.all([
    lookupCustomer(supabase, email),
    supabase.from("client_profiles").select("*").ilike("email", email).maybeSingle(),
    supabase.from("project_status").select("*").ilike("email", email).maybeSingle(),
  ]);
  return { ok: true, ...lookup, profile: profile.data ?? null, project_status: status.data ?? null };
}

async function devMarkOrderDelivered(supabase: DbClient, args: Record<string, unknown>) {
  const sid = cleanText(args.session_id, 200);
  const domain = cleanWebsite(args.delivered_domain);
  if (!sid) return { ok: false, error: "missing_session" };
  if (!domain) return { ok: false, error: "invalid_domain" };
  const { error } = await supabase.from("stripe_checkout_sessions").update({
    order_status: "delivered",
    delivered_at: new Date().toISOString(),
    delivered_domain: domain,
    updated_at: new Date().toISOString(),
  }).eq("session_id", sid);
  if (error) return { ok: false, error: error.message };
  return { ok: true, session_id: sid, delivered_domain: domain };
}

async function devMarkOrderUndelivered(supabase: DbClient, args: Record<string, unknown>) {
  const sid = cleanText(args.session_id, 200);
  if (!sid) return { ok: false, error: "missing_session" };
  const { error } = await supabase.from("stripe_checkout_sessions").update({
    order_status: "open",
    delivered_at: null,
    delivered_domain: null,
    updated_at: new Date().toISOString(),
  }).eq("session_id", sid);
  if (error) return { ok: false, error: error.message };
  return { ok: true, session_id: sid };
}

async function devUpdateEditRequestStatus(supabase: DbClient, args: Record<string, unknown>) {
  const id = cleanText(args.request_id, 80);
  const status = cleanText(args.status, 40).toLowerCase();
  if (!UUID_RE.test(id)) return { ok: false, error: "invalid_request" };
  if (!["open","in_progress","done"].includes(status)) return { ok: false, error: "invalid_status" };
  const { error } = await supabase.from("edit_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function devListOpenChats(supabase: DbClient, args: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25);
  const { data: convs, error } = await supabase
    .from("chat_conversations")
    .select("id, client_id, bot_paused, manual_handoff_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, error: error.message };
  if (!convs || convs.length === 0) return { ok: true, conversations: [] };
  const ids = convs.map((c: any) => c.id);
  const { data: lastMsgs } = await supabase
    .from("chat_messages")
    .select("conversation_id, role, content, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .limit(200);
  const lastByConv: Record<string, any> = {};
  for (const m of (lastMsgs ?? []) as any[]) {
    if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m;
  }
  return {
    ok: true,
    conversations: convs.map((c: any) => ({
      conversation_id: c.id,
      client_id: c.client_id,
      bot_paused: c.bot_paused,
      manual_handoff_at: c.manual_handoff_at,
      updated_at: c.updated_at,
      last_message: lastByConv[c.id] ? { role: lastByConv[c.id].role, content: String(lastByConv[c.id].content).slice(0, 200), at: lastByConv[c.id].created_at } : null,
    })),
  };
}

async function devSendChatReply(supabase: DbClient, args: Record<string, unknown>) {
  const cid = cleanText(args.conversation_id, 80);
  const content = cleanText(args.content, 2000);
  if (!UUID_RE.test(cid)) return { ok: false, error: "invalid_conversation" };
  if (!content) return { ok: false, error: "missing_content" };
  const { error: insErr } = await supabase.from("chat_messages").insert({
    conversation_id: cid, role: "admin", content,
  });
  if (insErr) return { ok: false, error: insErr.message };
  await supabase.from("chat_conversations").update({
    bot_paused: true,
    manual_handoff_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", cid);
  return { ok: true };
}

async function devRecentActivity(supabase: DbClient, args: Record<string, unknown>) {
  const days = Math.min(Math.max(Number(args.days) || 7, 1), 60);
  const staleDays = Math.min(Math.max(Number(args.stale_days) || 7, 1), 90);
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const staleCutoff = new Date(Date.now() - staleDays * 86400_000).toISOString();
  const nowIso = new Date().toISOString();

  const [openCallbacks, todaysEvents, recentContacts, openEdits, staleContacts] = await Promise.all([
    supabase.from("contact_events").select("id, contact_id, title, callback_at").eq("event_type", "callback").is("completed_at", null).order("callback_at", { ascending: true }).limit(20),
    supabase.from("contact_events").select("id, contact_id, title, event_type, created_at").gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()).order("created_at", { ascending: false }).limit(20),
    supabase.from("contacts").select("id, name, status, updated_at").gte("updated_at", since).order("updated_at", { ascending: false }).limit(15),
    supabase.from("edit_requests").select("id, package_name, customer_email, status, created_at").in("status", ["open","in_progress"]).order("created_at", { ascending: false }).limit(15),
    supabase.from("contacts").select("id, name, email, status, updated_at").lt("updated_at", staleCutoff).in("status", ["warm","hot","aware"]).order("updated_at", { ascending: true }).limit(15),
  ]);

  return {
    ok: true,
    window_days: days,
    now: nowIso,
    open_callbacks: openCallbacks.data ?? [],
    todays_events: todaysEvents.data ?? [],
    recent_contacts: recentContacts.data ?? [],
    open_edit_requests: openEdits.data ?? [],
    stale_warm_or_hot_contacts: staleContacts.data ?? [],
  };
}

async function devBulkUpdateStatus(supabase: DbClient, args: Record<string, unknown>) {
  const status = cleanText(args.status, 40).toLowerCase();
  if (!["cold","aware","warm","hot","gold","archived"].includes(status)) return { ok: false, error: "invalid_status" };
  const ids = Array.isArray(args.contact_ids) ? args.contact_ids.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)).slice(0, 50) : [];
  if (ids.length === 0) return { ok: false, error: "no_valid_ids" };
  const { error, count } = await supabase.from("contacts").update({ status, updated_at: new Date().toISOString() }, { count: "exact" }).in("id", ids);
  if (error) return { ok: false, error: error.message };
  return { ok: true, updated: count ?? ids.length, status };
}

async function devArchiveContact(supabase: DbClient, args: Record<string, unknown>) {
  return devBulkUpdateStatus(supabase, { contact_ids: [args.contact_id], status: "archived" });
}

async function devMergeContacts(supabase: DbClient, args: Record<string, unknown>) {
  const survivorId = cleanText(args.survivor_id, 80);
  const rawIds = Array.isArray(args.duplicate_ids) ? args.duplicate_ids : [];
  const duplicateIds = rawIds
    .map((v) => cleanText(v, 80))
    .filter((id) => UUID_RE.test(id) && id !== survivorId);
  if (!UUID_RE.test(survivorId)) return { ok: false, error: "invalid_survivor" };
  if (duplicateIds.length === 0) return { ok: false, error: "no_duplicates" };
  if (duplicateIds.length > 5) return { ok: false, error: "too_many_duplicates" };
  const { data, error } = await supabase.rpc("merge_contacts", {
    survivor_id: survivorId,
    duplicate_ids: duplicateIds,
  });
  if (error) {
    console.error("devMergeContacts rpc error:", error);
    return { ok: false, error: error.message ?? "merge_failed" };
  }
  return { ok: true, result: data };
}

async function devScheduleCallbackToday(supabase: DbClient, args: Record<string, unknown>) {
  const contactId = cleanText(args.contact_id, 80);
  const title = cleanText(args.title, 160);
  if (!UUID_RE.test(contactId)) return { ok: false, error: "invalid_contact" };
  if (!title) return { ok: false, error: "missing_title" };
  const time = /^\d{2}:\d{2}$/.test(String(args.time ?? "")) ? String(args.time) : "09:00";
  // London local date today
  const todayLondon = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" }); // YYYY-MM-DD
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(args.date ?? "")) ? String(args.date) : todayLondon;
  // Build a London-local instant. Europe/London is +00:00 in winter, +01:00 in summer; resolve via Intl.
  const naive = new Date(`${date}T${time}:00`);
  const londonOffsetMin = (() => {
    const utc = new Date(naive.toISOString().slice(0, 19) + "Z").getTime();
    const londonStr = new Date(utc).toLocaleString("en-GB", { timeZone: "Europe/London", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    const m = londonStr.match(/(\d{2})\/(\d{2})\/(\d{4}),\s+(\d{2}):(\d{2})/);
    if (!m) return 0;
    const asUtc = Date.UTC(+m[3], +m[2]-1, +m[1], +m[4], +m[5]);
    return (asUtc - utc) / 60000;
  })();
  const callbackAt = new Date(naive.getTime() - londonOffsetMin * 60000).toISOString();
  const { data, error } = await supabase.from("contact_events").insert({
    contact_id: contactId,
    title,
    description: cleanText(args.description, 2000) || null,
    event_type: "callback",
    callback_at: callbackAt,
  }).select("id, callback_at").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, event: data, scheduled_for_local: `${date} ${time} Europe/London` };
}

async function devLookupVisitorActivity(supabase: DbClient, args: Record<string, unknown>) {
  const email = cleanText(args.email, 255).toLowerCase();
  const website = cleanWebsite(args.website);
  if (!email && !website) return { ok: false, error: "email_or_website_required" };
  let query = supabase.from("visitor_falloffs")
    .select("visitor_id, customer_email, company_name, company_domain, last_seen_at, max_scroll_percent, first_page, last_page, portfolio_opened_at, pricing_opened_at, buy_clicked_at, checkout_started_at, package_name")
    .order("last_seen_at", { ascending: false })
    .limit(10);
  if (email && website) query = query.or(`customer_email.ilike.${email},company_domain.ilike.%${website}%`);
  else if (email) query = query.ilike("customer_email", email);
  else query = query.ilike("company_domain", `%${website}%`);
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, visits: data ?? [] };
}

async function devRecommendPackage(args: Record<string, unknown>) {
  const industry = cleanText(args.industry, 80);
  const pages = Number(args.page_count) || 0;
  const subscription = args.needs_subscription === true;
  const notes = cleanText(args.notes, 600);
  let pick: "fullWorks" | "elite" | "retainer" = "fullWorks";
  if (subscription || pages > 30) pick = "retainer";
  else if (pages > 10 || subscription) pick = "elite";
  const pkg = PACKAGES[pick];
  const summary = [
    `Recommended: **${pkg.name}** (${pkg.price})`,
    industry ? `Tailored for ${industry}.` : "",
    pages ? `Built for around ${pages} pages.` : "",
    `Includes: ${pkg.features.slice(0, 4).join("; ")}.`,
    notes ? `Context: ${notes}` : "",
  ].filter(Boolean).join("\n");
  return { ok: true, package_id: pick, summary };
}

async function devFetchChatHistory(supabase: DbClient, args: Record<string, unknown>) {
  const clientId = cleanText(args.client_id, 200);
  const convId = cleanText(args.conversation_id, 80);
  let conversationId: string | null = UUID_RE.test(convId) ? convId : null;
  let conversation: any = null;
  if (!conversationId && clientId) {
    const { data } = await supabase.from("chat_conversations").select("id, client_id, bot_paused, manual_handoff_at, updated_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    conversation = data;
    conversationId = data?.id ?? null;
  } else if (conversationId) {
    const { data } = await supabase.from("chat_conversations").select("id, client_id, bot_paused, manual_handoff_at, updated_at").eq("id", conversationId).maybeSingle();
    conversation = data;
  }
  if (!conversationId) return { ok: false, error: "conversation_not_found" };
  const { data: messages } = await supabase.from("chat_messages").select("role, content, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(80);
  return { ok: true, conversation, messages: (messages ?? []).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 600), at: m.created_at })) };
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

async function devCreateCustomOrder(supabase: DbClient, args: Record<string, unknown>, adminEmail: string | null) {
  const email = cleanText(args.customer_email, 255).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "invalid_customer_email" };
  const name = cleanText(args.customer_name, 100);
  const packageName = cleanText(args.package_name, 80);
  if (!packageName) return { ok: false, error: "package_name_required" };
  const amountGbp = Number(args.amount_gbp);
  if (!Number.isFinite(amountGbp) || amountGbp < 0.01 || amountGbp > 1_000_000) return { ok: false, error: "invalid_amount" };
  const amountPence = Math.round(amountGbp * 100);
  const markPaid = args.mark_paid === true;
  const billingRaw = String(args.billing ?? "one-time").toLowerCase();
  const billing = ["one-time", "monthly", "yearly"].includes(billingRaw) ? billingRaw : "one-time";
  const customLabel = cleanText(args.custom_label, 80);
  const notes = cleanText(args.notes, 1000);

  const sessionId = `manual_${crypto.randomUUID().replace(/-/g, "")}`;
  const meta = {
    source: "admin_manual",
    package_name: packageName,
    billing,
    created_by_email: adminEmail,
    created_via: "alex_chat",
    buyer_email: email,
    buyer_name: name || null,
    custom_label: customLabel || null,
    admin_notes: notes || null,
  };

  const { error: evtErr } = await supabase
    .from("stripe_events")
    .insert({ stripe_event_id: sessionId, event_type: "manual.order.created", payload: meta, checkout_session_id: sessionId });
  if (evtErr && !String(evtErr.message).toLowerCase().includes("duplicate")) return { ok: false, error: evtErr.message };

  const { data, error } = await supabase
    .from("stripe_checkout_sessions")
    .insert({
      session_id: sessionId,
      stripe_event_id: sessionId,
      mode: "payment",
      payment_status: markPaid ? "paid" : "unpaid",
      status: markPaid ? "complete" : "open",
      amount_total: amountPence,
      currency: "gbp",
      customer_email: email,
      capture_status: markPaid ? "manual" : null,
      captured_at: markPaid ? new Date().toISOString() : null,
      order_status: "open",
      metadata: meta,
    })
    .select("session_id, payment_status, status, amount_total, customer_email, created_at")
    .single();
  if (error) return { ok: false, error: error.message };

  try { await supabase.rpc("ensure_order_public_reference", { p_session_id: sessionId }); } catch (_) { /* noop */ }

  return {
    ok: true,
    order: {
      session_id: data.session_id,
      package_name: packageName,
      billing,
      amount_gbp: amountGbp,
      payment_status: data.payment_status,
      status: data.status,
      customer_email: data.customer_email,
      created_at: data.created_at,
    },
  };
}

async function salesCreateCustomPayment(supabase: DbClient, args: Record<string, unknown>) {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) return { ok: false, error: "stripe_not_configured" };

  const description = cleanText(args.description, 200);
  const amount = Number(args.amount_gbp);
  const clientEmail = cleanText(args.client_email, 255).toLowerCase() || null;

  if (!description) return { ok: false, error: "description_required" };
  if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) return { ok: false, error: "invalid_amount" };
  if (clientEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail)) return { ok: false, error: "invalid_email" };

  const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" });

  try {
    const product = await stripe.products.create({
      name: description.slice(0, 250),
      metadata: { kind: "custom", source: "sales_chat", client_email: clientEmail ?? "" },
    });
    const price = await stripe.prices.create({
      product: product.id,
      currency: "gbp",
      unit_amount: Math.round(amount * 100),
    });

    const linkRow = await supabase
      .from("custom_payment_links")
      .insert({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        url: "pending",
        description,
        amount_gbp: amount,
        currency: "gbp",
        quantity: 1,
        mode: "payment",
        client_email: clientEmail,
        internal_note: "Created by Alex via sales chat",
        status: "open",
      })
      .select("id")
      .single();
    if (linkRow.error || !linkRow.data) return { ok: false, error: "db_insert_failed" };
    const linkId = linkRow.data.id;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { kind: "custom", custom_link_id: linkId, client_email: clientEmail ?? "", source: "sales_chat" },
      payment_intent_data: { metadata: { kind: "custom", custom_link_id: linkId, source: "sales_chat" } },
    });

    await supabase
      .from("custom_payment_links")
      .update({ stripe_payment_link_id: paymentLink.id, url: paymentLink.url })
      .eq("id", linkId);

    return { ok: true, url: paymentLink.url, amount_gbp: amount, description };
  } catch (e) {
    console.error("salesCreateCustomPayment error", e);
    return { ok: false, error: e instanceof Error ? e.message : "stripe_failed" };
  }
}

async function devCreatePaymentLink(req: Request, args: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return { ok: false, error: "missing_auth" };

  const body = {
    description: cleanText(args.description, 200),
    amount_gbp: Number(args.amount_gbp),
    quantity: Number(args.quantity ?? 1) || 1,
    mode: args.mode === "subscription" ? "subscription" : "payment",
    client_email: cleanText(args.client_email, 255).toLowerCase() || null,
    internal_note: cleanText(args.internal_note, 1000) || null,
    attach_session_id: cleanText(args.attach_session_id, 200) || null,
  };
  if (!body.description) return { ok: false, error: "description_required" };
  if (!Number.isFinite(body.amount_gbp) || body.amount_gbp < 1 || body.amount_gbp > 1_000_000) return { ok: false, error: "invalid_amount" };

  const resp = await fetch(`${supabaseUrl}/functions/v1/create-custom-payment-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": authHeader },
    body: JSON.stringify(body),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, error: result?.error || `create_failed_${resp.status}` };
  return {
    ok: true,
    link: {
      id: result.id,
      url: result.url,
      amount_gbp: body.amount_gbp,
      mode: body.mode,
      description: body.description,
      client_email: body.client_email,
      attached_session_id: body.attach_session_id,
    },
  };
}

async function devListPaymentLinks(supabase: DbClient, args: Record<string, unknown>) {
  const limit = Math.max(1, Math.min(50, Number(args.limit ?? 10) | 0));
  const statusFilter = String(args.status ?? "all").toLowerCase();
  let query = supabase
    .from("custom_payment_links")
    .select("id, url, description, amount_gbp, currency, mode, status, client_email, paid_at, created_at, internal_note")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (statusFilter === "open") query = query.eq("status", "open");
  else if (statusFilter === "paid") query = query.eq("status", "paid");
  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, links: data ?? [] };
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
    let adminEmail: string | null = null;
    if (isDevMode) {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      const { data: userData } = await supabase.auth.getUser(token);
      adminEmail = userData?.user?.email?.toLowerCase() ?? null;
    }
    let currentConversationId = conversationId;
    let botPaused = false;

    // Only persist a conversation once the visitor has actually sent a message.
    // Greeting-only opens (no user message in payload) stay ephemeral so the
    // Chats tab doesn't fill up with one-sided bot greetings.
    const hasUserMessage = messages.some((m: { role: string }) => m.role === "user");

    // Get or create conversation
    if (!currentConversationId && safeClientId && hasUserMessage) {
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
    } else if (!hasUserMessage && safeClientId) {
      // Greeting-only open with no existing conversation — proceed ephemerally.
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

        // Auto-create / link a CRM contact when the visitor shares email or phone.
        // Skipped in dev mode (admin chatting with the CRM AI, not a visitor).
        if (!isDevMode && typeof lastMessage.content === "string") {
          await linkChatVisitorToContact(supabase, currentConversationId, lastMessage.content);
        }
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
      rrp?: string;
      features: string[];
      priceId: string;
      mode: string;
    }> = [];
    let actionTaken = false;
    let candidateSaved = false;

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
                  price = "£479";
                  mode = "payment";
                }
              } else if (pkgId === "retainer") {
                if (billing === "yearly") {
                  priceId = (pkg as any).yearlyPriceId;
                  price = "£24,690/yr";
                  mode = "subscription";
                } else {
                  priceId = (pkg as any).monthlyPriceId;
                  price = "£2,469/mo";
                  mode = "subscription";
                }
              }

              packageCards.push({
                packageId: pkgId,
                billing,
                name: pkg.name,
                price,
                rrp: undefined,
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
        } else if (toolCall.function.name === "save_candidate" && !isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const transcriptTail = aiMessages.slice(-6).map((m: any) => `${m.role}: ${typeof m.content === "string" ? m.content : ""}`).join("\n").slice(0, 2000);
            const { data, error } = await supabase.rpc("create_candidate_from_intake", {
              _payload: { ...args, source: "chatbot", source_detail: `conv:${currentConversationId ?? ""}`, transcript: transcriptTail },
            });
            if (error) throw error;
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: true, result: data }) });
          } catch (e) {
            console.error("Error in save_candidate:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "save_candidate_failed" }) });
          }
        } else if (toolCall.function.name === "create_custom_payment" && !isDevMode) {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await salesCreateCustomPayment(supabase, args);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in create_custom_payment:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_payment_failed" }) });
          }
        } else if (toolCall.function.name === "create_invoice") {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const resp = await fetch(`${supabaseUrl}/functions/v1/create-invoice`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
              body: JSON.stringify({
                source: isDevMode ? "alex_chat" : "alex_chat",
                package_slug: args.package_slug,
                line_items: Array.isArray(args.line_items) ? args.line_items : undefined,
                due_days: args.due_days,
                internal_note: args.internal_note,
                billing: {
                  name: args.billing_name,
                  email: args.billing_email,
                  company: args.billing_company,
                  phone: args.billing_phone,
                  address_line1: args.billing_address_line1,
                  city: args.billing_city,
                  postcode: args.billing_postcode,
                  country: args.billing_country ?? "United Kingdom",
                  po_reference: args.po_reference,
                },
              }),
            });
            const body = await resp.json();
            if (!resp.ok || body?.error) {
              aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: body?.error || `http_${resp.status}` }) });
            } else {
              aiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  ok: true,
                  invoice_number: body.invoice_number,
                  hosted_url: body.hosted_url,
                  total_pence: body.total_pence,
                  due_at: body.due_at,
                  bank_details: { payee: "Delabs Ltd", sort_code: "60-84-64", account_number: "86111053", reference: body.invoice_number },
                  note: "Show the hosted_url as a markdown link. Tell the client they've been emailed the invoice + PDF, payment terms are 28 days, and quote the invoice number as their bank-transfer reference.",
                }),
              });
            }
          } catch (e) {
            console.error("Error in create_invoice:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_invoice_failed" }) });
          }

        } else if (toolCall.function.name === "extract_screenshot_contact") {
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
        } else if (toolCall.function.name === "send_transactional_email" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devSendTemplateEmail(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { console.error("send_transactional_email:", e); aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "send_failed" }) }); }
        } else if (toolCall.function.name === "update_contact" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devUpdateContact(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { console.error("update_contact:", e); aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "update_failed" }) }); }
        } else if (toolCall.function.name === "update_contact_status" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devUpdateContactStatus(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "status_failed" }) }); }
        } else if (toolCall.function.name === "append_contact_note" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devAppendContactNote(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "note_failed" }) }); }
        } else if (toolCall.function.name === "complete_callback" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devCompleteCallback(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "complete_failed" }) }); }
        } else if (toolCall.function.name === "add_contact_person" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devAddContactPerson(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "add_person_failed" }) }); }
        } else if (toolCall.function.name === "mark_order_delivered" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devMarkOrderDelivered(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "deliver_failed" }) }); }
        } else if (toolCall.function.name === "mark_order_undelivered" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devMarkOrderUndelivered(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "undeliver_failed" }) }); }
        } else if (toolCall.function.name === "update_edit_request_status" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devUpdateEditRequestStatus(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "edit_status_failed" }) }); }
        } else if (toolCall.function.name === "list_open_chats" && isDevMode) {
          needsFollowUp = true;
          try {
            const result = await devListOpenChats(supabase, JSON.parse(toolCall.function.arguments || "{}"));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "list_chats_failed" }) }); }
        } else if (toolCall.function.name === "send_chat_reply" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try {
            const result = await devSendChatReply(supabase, JSON.parse(toolCall.function.arguments));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "reply_failed" }) }); }
        } else if (toolCall.function.name === "recent_activity" && isDevMode) {
          needsFollowUp = true;
          try {
            const result = await devRecentActivity(supabase, JSON.parse(toolCall.function.arguments || "{}"));
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "activity_failed" }) }); }
        } else if (toolCall.function.name === "bulk_update_status" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devBulkUpdateStatus(supabase, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "bulk_status_failed" }) }); }
        } else if (toolCall.function.name === "archive_contact" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devArchiveContact(supabase, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "archive_failed" }) }); }
        } else if (toolCall.function.name === "merge_contacts" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devMergeContacts(supabase, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { console.error("merge_contacts:", e); aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "merge_failed" }) }); }
        } else if (toolCall.function.name === "schedule_callback_today" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devScheduleCallbackToday(supabase, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "schedule_failed" }) }); }
        } else if (toolCall.function.name === "lookup_visitor_activity" && isDevMode) {
          needsFollowUp = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devLookupVisitorActivity(supabase, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "visitor_failed" }) }); }
        } else if (toolCall.function.name === "recommend_package" && isDevMode) {
          needsFollowUp = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devRecommendPackage(JSON.parse(toolCall.function.arguments || "{}"))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "recommend_failed" }) }); }
        } else if (toolCall.function.name === "fetch_chat_history" && isDevMode) {
          needsFollowUp = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devFetchChatHistory(supabase, JSON.parse(toolCall.function.arguments || "{}"))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "history_failed" }) }); }
        } else if (toolCall.function.name === "create_custom_order" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devCreateCustomOrder(supabase, JSON.parse(toolCall.function.arguments), adminEmail)) }); }
          catch (e) { console.error("create_custom_order:", e); aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_order_failed" }) }); }
        } else if (toolCall.function.name === "create_payment_link" && isDevMode) {
          needsFollowUp = true; actionTaken = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devCreatePaymentLink(req, JSON.parse(toolCall.function.arguments))) }); }
          catch (e) { console.error("create_payment_link:", e); aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "create_link_failed" }) }); }
        } else if (toolCall.function.name === "list_payment_links" && isDevMode) {
          needsFollowUp = true;
          try { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(await devListPaymentLinks(supabase, JSON.parse(toolCall.function.arguments || "{}"))) }); }
          catch (e) { aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ ok: false, error: "list_links_failed" }) }); }
        } else if (toolCall.function.name === "lookup_customer") {
          needsFollowUp = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = isDevMode
              ? await devLookupCustomer(supabase, args)
              : await lookupCustomer(supabase, args.email);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          } catch (e) {
            console.error("Error in lookup_customer:", e);
            aiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ found: false, error: "lookup_failed" }) });
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
        } else if (toolCall.function.name === "save_candidate") {
          needsFollowUp = true;
          actionTaken = true;
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await saveCandidate(supabase, args);
            if (result.ok) candidateSaved = true;
            aiMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (e) {
            console.error("Error in save_candidate:", e);
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
      JSON.stringify({ reply, conversationId: currentConversationId, packageCards, actionTaken, candidateSaved }),
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
