import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Check, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCheckoutContext, hasFalloffConsent, recordFalloff } from "@/lib/checkoutTracking";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Message {
  role: "user" | "assistant" | "admin";
  content: string;
  packageCards?: PackageCard[];
}

interface PackageCard {
  packageId: string;
  billing: string;
  name: string;
  price: string;
  rrp: string;
  features: string[];
  priceId: string;
  mode: string;
}

interface ChatBotProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  hidden?: boolean;
  showToggle?: boolean;
  mode?: "sales" | "dev";
  onDevAction?: () => void;
}

interface ChatHistoryResponse {
  conversation: { id: string; bot_paused: boolean } | null;
  messages: Message[];
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

const glassStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: `
    0 8px 32px rgba(0,0,0,0.4),
    inset 0 1px 1px rgba(255,255,255,0.2),
    inset 0 -1px 1px rgba(0,0,0,0.1)
  `,
};

const getClientId = (mode: "sales" | "dev" = "sales"): string => {
  const storageKey = mode === "dev" ? "pixcellor_dev_chat_client_id" : "pixcellor_chat_client_id";
  let clientId = localStorage.getItem(storageKey);
  if (!clientId) {
    clientId = `${mode === "dev" ? "dev" : "client"}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, clientId);
  }
  return clientId;
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatMessage = (text: string): string => {
  const linkPlaceholders: string[] = [];
  // Extract markdown links first so their URLs aren't escaped
  let working = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
    const safeLabel = escapeHtml(label);
    const safeUrl = escapeHtml(url);
    linkPlaceholders.push(
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-white underline underline-offset-2 hover:text-white/80 transition-colors">${safeLabel}</a>`
    );
    return `\u0000LINK${linkPlaceholders.length - 1}\u0000`;
  });

  // Auto-link bare URLs (http/https)
  working = working.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, (_m, pre, url) => {
    const safeUrl = escapeHtml(url);
    linkPlaceholders.push(
      `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-white underline underline-offset-2 hover:text-white/80 transition-colors">${safeUrl}</a>`
    );
    return `${pre}\u0000LINK${linkPlaceholders.length - 1}\u0000`;
  });

  // Now safely escape and apply basic markdown
  let html = escapeHtml(working)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');

  // Restore links
  html = html.replace(/\u0000LINK(\d+)\u0000/g, (_m, i) => linkPlaceholders[Number(i)]);
  return html;
};
function PackageCardUI({ card }: { card: PackageCard }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      await recordFalloff({ event: "chat_checkout_started", priceId: card.priceId, mode: card.mode, packageName: card.name, billing: card.billing });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: card.priceId, mode: card.mode, packageName: card.name, billing: card.billing, clientContext: hasFalloffConsent() ? getCheckoutContext() : undefined },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-sm p-3 mt-2 w-full"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-white font-bold text-sm">{card.name}</span>
        <span className="text-white/40 text-[10px] line-through">{card.rrp}</span>
      </div>
      <div className="text-white text-lg font-extrabold mb-2">{card.price}</div>
      <ul className="space-y-1 mb-3">
        {card.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5 text-white/70 text-[11px]">
            <Check className="w-3 h-3 text-white/60 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full rounded-sm py-1.5 text-xs font-semibold text-white hover:brightness-125 transition disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : card.mode === "subscription" ? "Subscribe" : "Buy Now"}
      </button>
    </motion.div>
  );
}

export default function ChatBot({ isOpen, setIsOpen, hidden = false, showToggle = true, mode = "sales", onDevAction }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [manualHandoff, setManualHandoff] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isMobile = useIsMobile();
  const clientId = useRef(getClientId(mode));
  const isDevMode = mode === "dev";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasStarted) {
      loadChatHistory();
    }
  }, [isOpen, hasStarted]);

  useEffect(() => {
    if (isOpen) setAdminUnreadCount(0);
  }, [isOpen]);

  useEffect(() => {
    const openChat = () => setIsOpen(true);
    window.addEventListener("pixcellor:open-chat", openChat);
    return () => window.removeEventListener("pixcellor:open-chat", openChat);
  }, [setIsOpen]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-live-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const next = payload.new as Message;
        if (next.role === "admin") {
          setMessages(current => [...current, next]);
          if (!isOpen) setAdminUnreadCount(1);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `id=eq.${conversationId}` }, (payload) => {
        setManualHandoff(Boolean((payload.new as { bot_paused?: boolean }).bot_paused));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen]);

  useEffect(() => {
    if (!isOpen || !manualHandoff || !conversationId) return;
    const interval = window.setInterval(() => {
      void loadChatHistory(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isOpen, manualHandoff, conversationId]);

  const loadChatHistory = async (silent = false) => {
    if (!silent) setIsLoadingHistory(true);
    try {
      const { data, error } = await (supabase as any).rpc("fetch_chat_history", {
        _client_id: clientId.current,
      });

      if (error) throw error;

      const history = data as ChatHistoryResponse | null;
      const conv = history?.conversation ?? null;
      const msgs = history?.messages ?? [];

      if (conv) {
        setConversationId(conv.id);
        setManualHandoff(Boolean(conv.bot_paused));

        if (msgs && msgs.length > 0) {
          setMessages(msgs as Message[]);
          setHasStarted(true);
        } else if (!silent) {
          startConversation();
        }
      } else if (!silent) {
        startConversation();
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      if (!silent) startConversation();
    } finally {
      if (!silent) setIsLoadingHistory(false);
    }
  };

  const startConversation = async () => {
    setHasStarted(true);
    if (isDevMode) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: [], clientId: clientId.current, mode },
      });
      if (error) throw error;
      setManualHandoff(Boolean(data.manualHandoff));
      if (data.manualHandoff || !data.reply) {
        if (data.conversationId) setConversationId(data.conversationId);
        return;
      }
      const msg: Message = { role: "assistant", content: data.reply };
      if (data.packageCards?.length) msg.packageCards = data.packageCards;
      setMessages([msg]);
      if (data.conversationId) setConversationId(data.conversationId);
    } catch (error) {
      console.error("Error starting chat:", error);
      setMessages([{ role: "assistant", content: "Hey there! 👋 I'm Alex from Pixcellor. What kind of project are you thinking about?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Send only role+content to the API
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: apiMessages, clientId: clientId.current, conversationId, mode },
      });
      if (error) throw error;
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      if (data.packageCards?.length) assistantMsg.packageCards = data.packageCards;
      setManualHandoff(Boolean(data.manualHandoff));
      setMessages(data.manualHandoff || !data.reply ? newMessages : [...newMessages, assistantMsg]);
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
      if (isDevMode && data.actionTaken) onDevAction?.();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I had a hiccup! Could you try that again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionApi = (window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }).SpeechRecognition ?? (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setMessages((current) => [...current, { role: "assistant", content: "Voice input isn't supported in this browser yet." }]);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-GB";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ").trim();
      if (transcript) setInput((current) => `${current}${current ? " " : ""}${transcript}`);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-white/10"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-sm flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{isDevMode ? "Pixcellor Dev Assistant" : "Alex from Pixcellor"}</h3>
              <p className="text-xs text-white/50">{isDevMode ? "Creates contacts and sales events" : manualHandoff ? "Team member replying" : "Usually replies instantly"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white/70 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-white/50" />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-sm text-sm ${
                    msg.role === "user"
                      ? "text-white"
                      : "text-white/90"
                  }`}
                  style={{
                    background: msg.role === "user" 
                      ? "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)"
                      : "rgba(255,255,255,0.08)",
                    border: msg.role === "user" 
                      ? "1px solid rgba(255,255,255,0.2)"
                      : "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
                {/* Package cards */}
                {msg.packageCards && msg.packageCards.length > 0 && (
                  <div className="w-[80%] space-y-2">
                    {msg.packageCards.map((card, j) => (
                      <PackageCardUI key={`${card.packageId}-${j}`} card={card} />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div 
                  className="px-4 py-2 rounded-sm"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Loader2 className="w-4 h-4 animate-spin text-white/50" />
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDevMode ? "Paste contact details or describe a sales event" : manualHandoff ? "Reply to the team" : "Ask something or just leave email address"}
            className="flex-1 rounded-sm px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            className="flex h-10 w-10 items-center justify-center rounded-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: isListening ? "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.14) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {isListening ? <MicOff className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4 text-white" />}
          </button>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Chat Toggle Button */}
      {showToggle && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute right-16 top-4 z-[10000] flex items-center justify-center rounded-sm transition-opacity duration-200 md:right-[76px] md:top-6 lg:pointer-events-auto lg:opacity-100 ${hidden ? 'pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100' : 'opacity-100'} ${isMobile ? 'h-[34px] w-[34px]' : 'h-[42px] w-[42px]'}`}
          aria-label="Open chat with Alex from Pixcellor"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.3),
              inset 0 1px 1px rgba(255,255,255,0.3),
              inset 0 -1px 1px rgba(0,0,0,0.1)
            `,
          }}
        >
        <div 
          className="absolute inset-1 rounded-sm opacity-60"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
              <X className="w-4 h-4 text-white drop-shadow-lg" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
              <MessageCircle className="w-4 h-4 text-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && adminUnreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 z-20 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold leading-none text-destructive-foreground shadow-lg">
            {adminUnreadCount}
          </span>
        )}
        </motion.button>
      )}

      {/* Mobile: Drawer */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent 
            className="h-[85vh] border-0 border-t-0 [&>div:first-child]:hidden"
            style={glassStyle}
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>Chat with Alex</DrawerTitle>
            </DrawerHeader>
            {chatContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] rounded-3xl flex flex-col overflow-hidden"
              style={glassStyle}
            >
              <div 
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 30%)",
                }}
              />
              {chatContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
