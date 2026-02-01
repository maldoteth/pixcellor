/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

## Key Selling Points:
- Future-proof, AI-powered development that scales
- Fast turnaround - from 1-day websites to enterprise solutions
- High-end quality at competitive rates
- Cross-sector expertise including crypto, fintech, healthcare, retail, and more
- Full-service: design, development, hosting, and ongoing support

## Your Goals:
1. Understand the visitor's project needs
2. Highlight how we can help them
3. Collect their contact details for follow-up:
   - Name
   - Email (required)
   - Brief project description
   - Budget range (if they're comfortable sharing)
   - Timeline

## Rules:
- NEVER give specific prices - say "pricing depends on scope, our team will provide a custom quote"
- Keep responses SHORT (2-4 sentences max)
- Ask ONE question at a time to keep the conversation flowing
- Be excited about their project ideas
- If they share their email, thank them warmly and confirm someone will be in touch soon

Start by greeting them warmly and asking what brings them here today.`;

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
      console.log("Looking for existing conversation for client:", clientId);
      
      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("client_id", clientId)
        .single();

      if (existingConv) {
        currentConversationId = existingConv.id;
        console.log("Found existing conversation:", currentConversationId);
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({ client_id: clientId })
          .select("id")
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
        } else {
          currentConversationId = newConv.id;
          console.log("Created new conversation:", currentConversationId);
        }
      }
    }

    // If there are user messages, save the last one
    if (currentConversationId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        console.log("Saving user message:", lastMessage.content.substring(0, 50));
        await supabase.from("chat_messages").insert({
          conversation_id: currentConversationId,
          role: "user",
          content: lastMessage.content,
        });
      }
    }

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
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'd love to help! Could you tell me a bit about your project?";

    // Save assistant reply
    if (currentConversationId) {
      console.log("Saving assistant reply:", reply.substring(0, 50));
      await supabase.from("chat_messages").insert({
        conversation_id: currentConversationId,
        role: "assistant",
        content: reply,
      });
    }

    return new Response(
      JSON.stringify({ reply, conversationId: currentConversationId }),
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
