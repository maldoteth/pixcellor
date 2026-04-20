import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Message {
  role: "user" | "assistant";
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

const getClientId = (): string => {
  const storageKey = "pixcellor_chat_client_id";
  let clientId = localStorage.getItem(storageKey);
  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, clientId);
  }
  return clientId;
};

const formatMessage = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
};
function PackageCardUI({ card }: { card: PackageCard }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: card.priceId, mode: card.mode },
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

export default function ChatBot({ isOpen, setIsOpen }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const clientId = useRef(getClientId());
  const wasDragged = useRef(false);

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

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("client_id", clientId.current)
        .single();

      if (conv) {
        setConversationId(conv.id);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setMessages(msgs as Message[]);
          setHasStarted(true);
        } else {
          startConversation();
        }
      } else {
        startConversation();
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      startConversation();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startConversation = async () => {
    setHasStarted(true);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: [], clientId: clientId.current },
      });
      if (error) throw error;
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
        body: { messages: apiMessages, clientId: clientId.current, conversationId },
      });
      if (error) throw error;
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      if (data.packageCards?.length) assistantMsg.packageCards = data.packageCards;
      setMessages([...newMessages, assistantMsg]);
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
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

  const chatContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-white/10"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        }}
      >
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
            <h3 className="font-semibold text-white text-sm">Alex from Pixcellor</h3>
            <p className="text-xs text-white/50">Usually replies instantly</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
            placeholder="Type your message..."
            className="flex-1 rounded-sm px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
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
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 rounded-sm flex items-center justify-center group bottom-6 right-6 ${isMobile ? 'w-[34px] h-[34px]' : 'w-[42px] h-[42px]'}`}
        aria-label="Open chat with Alex from Pixcellor"
        drag
        dragMomentum={false}
        dragElastic={0.15}
        dragConstraints={{
          top: -(typeof window !== 'undefined' ? window.innerHeight - 100 : 600),
          left: -(typeof window !== 'undefined' ? window.innerWidth - 100 : 300),
          right: 0,
          bottom: 0,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        whileDrag={{ scale: 1.15, cursor: "grabbing" }}
        style={{
          touchAction: "none",
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
        <motion.div
          className="absolute inset-0 rounded-sm overflow-hidden"
          animate={{
            background: [
              "linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
              "linear-gradient(45deg, transparent 100%, rgba(255,255,255,0.1) 150%, transparent 200%)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-sm"
            style={{ border: "2px solid rgba(255,255,255,0.3)" }}
            animate={{ scale: [1, 1.3, 1.5], opacity: [0.6, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </motion.button>

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
