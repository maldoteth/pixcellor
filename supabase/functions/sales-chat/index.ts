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
    features: ["Modern, super fast website", "1 year maintenance", "Custom design"],
  },
  elite: {
    name: "Elite",
    price: "£500 one-time or £60/mo",
    rrp: "£2,500",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    monthlyPriceId: "price_1TJrTNBtUjwejeUw3ihfpz98",
    mode: "payment",
    features: ["Cutting edge website", "1 year maintenance", "Unlimited edits", "SEO & AEO optimisation"],
  },
  retainer: {
    name: "Retainer",
    price: "£1,200/mo or £12,000/yr",
    rrp: "£3,600/mo",
    monthlyPriceId: "price_1TJrb1BtUjwejeUwrx9BnRXI",
    yearlyPriceId: "price_1TJrbOBtUjwejeUwOhhNyliQ",
    mode: "subscription",
    features: ["Your own tech department", "Websites or full apps"],
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

## Our Packages:
- **Full Works** (£150, RRP £500): Modern super fast website, custom design, 1 year maintenance: Modern super fast website, custom design, 1 year maintenance
- **Elite** (£500 one-time or £60/mo, RRP £2,500): Cutting edge website, unlimited edits, SEO & AEO, 1 year maintenance. Our most popular package.
- **Retainer** (£1,200/mo or £12,000/yr, RRP £3,600/mo): Your own tech department - sites, apps, everything you need.

## Key Selling Points:
- Future-proof, AI-powered development that scales
- Fast turnaround - from 1-day websites to enterprise solutions
- High-end quality at massively discounted rates
- Cross-sector expertise including crypto, fintech, healthcare, retail, and more
- Full-service: design, development, hosting, and ongoing support

## Your Goals:
1. Understand the visitor's project needs
2. Highlight how we can help them
3. When appropriate, recommend a package and use the send_package tool to show them a buy button
4. Collect their contact details for follow-up:
   - Name
   - Email (required)
   - Brief project description

## Rules:
- You now KNOW our prices - share them freely and recommend packages
- Use the send_package tool when a user asks about pricing, wants to buy, or when you're recommending a package
- You can send multiple packages if the user wants to compare
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time to keep the conversation flowing
- Be excited about their project ideas
- If they share their email, thank them warmly and confirm someone will be in touch soon

## When to use send_package:
- User asks "how much", "pricing", "packages", "what do you offer"
- User describes a project and you want to recommend a tier
- User says they want to buy or get started
- When comparing options for the user

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
            description: "Which package to show: fullWorks (£150 website), elite (£500 cutting edge site), or retainer (£1,200/mo tech department)",, elite (£500 cutting edge site), or retainer (£1,200/mo tech department)",
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
