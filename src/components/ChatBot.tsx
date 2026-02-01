import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
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
    inset 0 -1px 1px rgba(0,0,0,0.1),
    0 0 60px rgba(147,51,234,0.1)
  `,
};

export default function ChatBot({ isOpen, setIsOpen }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start conversation when chat opens
  useEffect(() => {
    if (isOpen && !hasStarted) {
      startConversation();
    }
  }, [isOpen, hasStarted]);

  const startConversation = async () => {
    setHasStarted(true);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: [] },
      });
      if (error) throw error;
      setMessages([{ role: "assistant", content: data.reply }]);
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
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: newMessages },
      });
      if (error) throw error;
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
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

  const ChatContent = () => (
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
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(147,51,234,0.4) 0%, rgba(147,51,234,0.2) 100%)",
              border: "1px solid rgba(147,51,234,0.3)",
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
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "rounded-br-md text-white"
                  : "rounded-bl-md text-white/90"
              }`}
              style={{
                background: msg.role === "user" 
                  ? "linear-gradient(135deg, rgba(147,51,234,0.5) 0%, rgba(147,51,234,0.3) 100%)"
                  : "rgba(255,255,255,0.1)",
                border: msg.role === "user" 
                  ? "1px solid rgba(147,51,234,0.4)"
                  : "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
              }}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div 
              className="px-4 py-2 rounded-2xl rounded-bl-md"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin text-white/50" />
            </div>
          </motion.div>
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
            className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(147,51,234,0.6) 0%, rgba(147,51,234,0.4) 100%)",
              border: "1px solid rgba(147,51,234,0.4)",
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
      {/* Chat Toggle Button - Liquid Glass Bubble */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 w-16 h-16 rounded-full flex items-center justify-center group ${
          isMobile ? "top-4 left-1/2 -translate-x-1/2" : "top-6 left-6"
        }`}
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
            inset 0 -1px 1px rgba(0,0,0,0.1),
            0 0 40px rgba(147,51,234,0.15)
          `,
        }}
      >
        {/* Inner glow ring */}
        <div 
          className="absolute inset-1 rounded-full opacity-60"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />
        
        {/* Animated shimmer */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
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
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10"
            >
              <X className="w-6 h-6 text-white drop-shadow-lg" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10"
            >
              <MessageCircle className="w-6 h-6 text-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pulse ring effect when closed */}
        {!isOpen && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              border: "2px solid rgba(255,255,255,0.3)",
            }}
            animate={{
              scale: [1, 1.3, 1.5],
              opacity: [0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        )}
      </motion.button>

      {/* Mobile: Drawer */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent 
            className="h-[85vh] border-white/10"
            style={glassStyle}
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>Chat with Alex</DrawerTitle>
            </DrawerHeader>
            <ChatContent />
          </DrawerContent>
        </Drawer>
      ) : (
        /* Desktop: Floating Window */
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed top-24 left-6 z-50 w-[380px] h-[520px] rounded-3xl flex flex-col overflow-hidden"
              style={glassStyle}
            >
              {/* Decorative inner glow */}
              <div 
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 30%)",
                }}
              />
              <ChatContent />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
