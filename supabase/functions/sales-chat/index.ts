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
    priceId: "price_1TJrSfBtUjwejeUwWd3YoFVy",
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

## Key Selling Points:
- Future-proof, AI-powered development that scales
- Fast turnaround - from 1-day websites to enterprise solutions
- High-end quality at massively discounted rates
- Cross-sector expertise including crypto, fintech, healthcare, retail, and more
- Full-service: design, development, hosting, and ongoing support

## Your Goals:
1. QUALIFY FIRST — understand what the visitor actually needs before recommending anything
2. Recommend ONE package that fits (not all three)
3. Collect their contact details for follow-up: Name, Email (required), Brief project description

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

## General Rules:
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time to keep the conversation flowing
- Be excited about their project ideas
- Never pushy, always consultative
- If they share their email, thank them warmly and confirm someone will be in touch soon

## When to use send_package:
- AFTER qualifying — once you know which tier fits, send just that one package
- When the user explicitly asks to see/compare all options (then you may send multiple)
- When the user says they want to buy a specific package

Start by greeting them warmly and asking what brings them here today.`;

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
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, clientId, conversationId } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let currentConversationId = conversationId;

    // Get or create conversation
    if (!currentConversationId && clientId) {
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("client_id", clientId)
        .single();

      if (existingConv) {
        currentConversationId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({ client_id: clientId })
          .select("id")
          .single();

        if (!convError) {
          currentConversationId = newConv.id;
        }
      }
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

    // Call AI with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

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

    // Process tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
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
          } catch (e) {
            console.error("Error parsing tool call:", e);
          }
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
      JSON.stringify({ reply, conversationId: currentConversationId, packageCards }),
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
