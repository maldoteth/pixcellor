import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Check, Mic, MicOff, Image as ImageIcon, Phone, Mail, Wand2, Shield, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsDesktop } from "@/hooks/use-desktop";
import { useHeroReady } from "@/hooks/use-hero-ready";
import { getCheckoutContext, hasFalloffConsent, recordFalloff, markCheckoutPending, updateCheckoutPendingSessionId } from "@/lib/checkoutTracking";
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
  imageUrl?: string;
}

interface PackageCard {
  packageId: string;
  billing: string;
  name: string;
  price: string;
  rrp?: string;
  features: string[];
  priceId: string;
  mode: string;
}

interface ChatBotProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  hidden?: boolean;
  showToggle?: boolean;
  mode?: "sales" | "dev" | "support";
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

const getClientId = (mode: "sales" | "dev" | "support" = "sales"): string => {
  const storageKey =
    mode === "dev" ? "pixcellor_dev_chat_client_id"
    : mode === "support" ? "pixcellor_support_chat_client_id"
    : "pixcellor_chat_client_id";
  let clientId = localStorage.getItem(storageKey);
  if (!clientId) {
    const prefix = mode === "dev" ? "dev" : mode === "support" ? "support" : "client";
    clientId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, clientId);
  }
  return clientId;
};

const CHAT_WIDGET_DEFAULT_SIZE = { width: 380, height: 520 };
const CHAT_WIDGET_MIN_SIZE = { width: 340, height: 420 };
const CHAT_WIDGET_EDGE_GAP = 16;

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getDefaultWidgetPosition = () => ({
  x: Math.max(CHAT_WIDGET_EDGE_GAP, window.innerWidth - CHAT_WIDGET_DEFAULT_SIZE.width - 24),
  y: Math.max(CHAT_WIDGET_EDGE_GAP, window.innerHeight - CHAT_WIDGET_DEFAULT_SIZE.height - 96),
});

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

const getDisplayMessageContent = (msg: Message): string => {
  if (!msg.content) return "";
  if (msg.imageUrl || /^Uploaded (screenshot|image)/i.test(msg.content)) {
    return msg.content
      .split("\n")
      .filter((line) => !/^https?:\/\//i.test(line.trim()))
      .join("\n")
      .replace(/^Uploaded screenshot for contact extraction:/i, "Uploaded screenshot:")
      .trim();
  }
  return msg.content;
};
function PackageCardUI({ card }: { card: PackageCard }) {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      await recordFalloff({ event: "chat_checkout_started", priceId: card.priceId, mode: card.mode, packageName: card.name, billing: card.billing });
      markCheckoutPending({ packageName: card.name, billing: card.billing });
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: card.priceId, mode: card.mode, packageName: card.name, billing: card.billing, clientContext: hasFalloffConsent() ? getCheckoutContext() : undefined },
      });
      if (error) throw error;
      if (data?.sessionId) updateCheckoutPendingSessionId(data.sessionId);
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
        <span className="text-white/40 text-[10px]">Standard {card.rrp.replace(/^RRP\s*/i, "")}</span>
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
  const heroReady = useHeroReady();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [manualHandoff, setManualHandoff] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [quickAction, setQuickAction] = useState<"call" | "email" | "trial" | "services" | "verify" | "pay" | null>(null);
  const [widgetSize, setWidgetSize] = useState(CHAT_WIDGET_DEFAULT_SIZE);
  const [widgetPosition, setWidgetPosition] = useState<{ x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const clientId = useRef(getClientId(mode));
  const isDevMode = mode === "dev";
  const isSupportMode = mode === "support";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Defer the initial chat history / sales-chat init until the user actually
  // opens the chat. Previously this fired on page load and added a ~2.5s
  // edge-function request to the critical path, contributing to LCP jitter.
  useEffect(() => {
    if (!isOpen || hasStarted) return;
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setAdminUnreadCount(0);
  }, [isOpen]);

  // Track mobile visual viewport so the drawer shrinks with the on-screen keyboard
  const [mobileDrawerHeight, setMobileDrawerHeight] = useState<number | null>(null);
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setMobileDrawerHeight(vv.height);
      // keep latest message in view when keyboard opens
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ block: "end" }));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setMobileDrawerHeight(null);
    };
  }, [isOpen, isDesktop]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    setWidgetPosition((current) => current ?? getDefaultWidgetPosition());
  }, [isOpen, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const clampWidgetToViewport = () => {
      setWidgetSize((current) => ({
        width: clampValue(current.width, CHAT_WIDGET_MIN_SIZE.width, window.innerWidth - CHAT_WIDGET_EDGE_GAP * 2),
        height: clampValue(current.height, CHAT_WIDGET_MIN_SIZE.height, window.innerHeight - CHAT_WIDGET_EDGE_GAP * 2),
      }));
      setWidgetPosition((current) => current ? {
        x: clampValue(current.x, CHAT_WIDGET_EDGE_GAP, window.innerWidth - widgetSize.width - CHAT_WIDGET_EDGE_GAP),
        y: clampValue(current.y, CHAT_WIDGET_EDGE_GAP, window.innerHeight - widgetSize.height - CHAT_WIDGET_EDGE_GAP),
      } : current);
    };
    window.addEventListener("resize", clampWidgetToViewport);
    return () => window.removeEventListener("resize", clampWidgetToViewport);
  }, [isMobile, widgetSize.height, widgetSize.width]);

  const pendingActionRef = useRef<"call" | "email" | "trial" | "services" | "verify" | "pay" | "find-work" | "client-order" | "candidate-register" | null>(null);
  useEffect(() => {
    const openChat = (e: Event) => {
      setIsOpen(true);
      const detail = (e as CustomEvent<{ action?: "call" | "email" | "trial" | "services" | "verify" | "pay" | "find-work" | "client-order" | "candidate-register" }>).detail;
      if (detail?.action && ["call","email","trial","services","verify","pay","find-work","client-order","candidate-register"].includes(detail.action)) {
        pendingActionRef.current = detail.action;
      }
    };
    window.addEventListener("pixcellor:open-chat", openChat as EventListener);
    return () => window.removeEventListener("pixcellor:open-chat", openChat as EventListener);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen || !hasStarted || isLoading || isLoadingHistory) return;
    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;
    startQuickAction(action);
  }, [isOpen, hasStarted, isLoading, isLoadingHistory]);

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
    if (isSupportMode) {
      // Greet immediately; no backend round-trip needed for the opener.
      const { data: sess } = await supabase.auth.getSession();
      const firstName = sess.session?.user?.user_metadata?.first_name
        || sess.session?.user?.user_metadata?.full_name?.split(" ")?.[0]
        || "";
      const greet = firstName ? `Hey ${firstName} 👋` : "Hey 👋";
      setMessages([{
        role: "assistant",
        content: `${greet} I'm Pixie, your Pixcellor support assistant. I can pull up your orders, briefs, edits, subscription, affiliate stats — and I can take action: file an edit, generate a referral code, open billing, process a refund, cancel a sub. What do you need?`,
      }]);
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

  const submitMessage = async (rawContent: string) => {
    const visibleContent = rawContent.trim();
    if (!visibleContent || isLoading) return;

    const actionInstruction = quickAction === "call"
      ? "\n\n[Quick action: Request call. Save these details as a contact and schedule a Let's Talk follow-up for 1 day from now.]"
      : quickAction === "email"
        ? "\n\n[Quick action: Email info. Save these details as a contact and send the Pixcellor welcome sales email.]"
        : quickAction === "trial"
          ? "\n\n[Quick action: Try-before-you-buy lead. Save these details as a contact, capture project requirements (any uploaded screenshots/images), and flag the team to build a free preview site.]"
          : quickAction === "services"
            ? "\n\n[Quick action: Services enquiry. Capture which marketing/business services they need, save contact details, and route to the team for a tailored quote.]"
              : quickAction === "verify"
                ? "\n\n[Quick action: Invoice verification. The user wants to verify an order/invoice. Ask for their order ID if not provided, look up their order details, and confirm payment status or answer any invoice concerns.]"
                : quickAction === "pay"
                  ? "\n\n[Quick action: Custom payment. The user wants to pay a custom amount. Collect amount in GBP and a short reason/description, then call create_custom_payment to generate a Stripe link and reply with that link.]"
                  : "";
    const userMessage: Message = { role: "user", content: visibleContent };
    const apiUserMessage = { role: "user" as const, content: `${visibleContent}${actionInstruction}` };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setQuickAction(null);
    setIsLoading(true);

    try {
      const apiMessages = [...messages.map(({ role, content }) => ({ role, content })), apiUserMessage];
      const fn = isSupportMode ? "support-chat" : "sales-chat";
      const body = isSupportMode
        ? { messages: apiMessages }
        : { messages: apiMessages, clientId: clientId.current, conversationId, mode };
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      if (data.packageCards?.length) assistantMsg.packageCards = data.packageCards;
      setManualHandoff(Boolean(data.manualHandoff));
      setMessages(data.manualHandoff || !data.reply ? newMessages : [...newMessages, assistantMsg]);
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
      if (isDevMode && data.actionTaken) onDevAction?.();
      if (data.candidateSaved) window.dispatchEvent(new CustomEvent("pixcellor:candidate-registered"));
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I had a hiccup! Could you try that again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    await submitMessage(input);
  };

  const sendImageMessage = async (imageUrl: string, fileName: string) => {
    const visibleContent = isDevMode ? `Uploaded screenshot: ${fileName}` : `Uploaded image: ${fileName}`;
    const apiContent = isDevMode
      ? `Uploaded screenshot for contact extraction: ${fileName}\n${imageUrl}`
      : `Uploaded image: ${fileName}\n${imageUrl}`;
    const userMessage: Message = { role: "user", content: visibleContent, imageUrl };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const apiMessages = [
        ...messages.map(({ role, content, imageUrl }) => ({ role, content, imageUrl })),
        { role: "user" as const, content: apiContent, imageUrl, displayContent: visibleContent },
      ];
      const { data, error } = await supabase.functions.invoke("sales-chat", {
        body: { messages: apiMessages, clientId: clientId.current, conversationId, mode },
      });
      if (error) throw error;
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages(data.manualHandoff || !data.reply ? newMessages : [...newMessages, assistantMsg]);
      if (data.conversationId && !conversationId) setConversationId(data.conversationId);
      if (isDevMode && data.actionTaken) onDevAction?.();
    } catch (error) {
      console.error("Error sending image:", error);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't process that image. Could you try again?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    if (isUploadingImage) return;
    if (!file.type.startsWith("image/")) {
      setMessages((current) => [...current, { role: "assistant", content: "Please choose an image file." }]);
      return;
    }

    setIsUploadingImage(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExtension = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension) ? extension : "png";
      const path = `${mode}/${clientId.current}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;
      const { error } = await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
      await sendImageMessage(data.publicUrl, file.name);
    } catch (error) {
      console.error("Image upload error:", error);
      setMessages((current) => [...current, { role: "assistant", content: "Image upload failed. Please try again." }]);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadImageFile(file);
  };

  const getDraggedImageFile = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/")) ?? null;

  const handleChatDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
      event.preventDefault();
      setIsDraggingImage(true);
    }
  };

  const handleChatDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDraggingImage(true);
    }
  };

  const handleChatDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDraggingImage(false);
  };

  const handleChatDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    const file = getDraggedImageFile(event);
    if (!file) return;
    event.preventDefault();
    setIsDraggingImage(false);
    await uploadImageFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startQuickAction = (action: "call" | "email" | "trial" | "services" | "verify" | "pay" | "find-work" | "client-order" | "candidate-register") => {
    if (isDevMode || isLoading) return;
    if (action !== "find-work" && action !== "client-order" && action !== "candidate-register") setQuickAction(action);
    const reply = {
      role: "assistant" as const,
      content: action === "call"
        ? "Absolutely — leave your name and number for a call back or call us on the number below."
        : action === "email"
          ? "Sure — leave your name and email and I'll send over our full package guide, process breakdown, portfolio and buy links."
          : action === "trial"
            ? "No need to pay upfront — we'll build a free preview so you can try before you buy. Tell me a bit about what you need (you can drop in any screenshots or reference images using the image button), plus your name, email and phone number, and I'll get the team started. We'll reach out the moment your site is ready to check."
            : action === "services"
              ? "Happy to help! Tell me which services you're interested in (marketing, business solutions, automation, etc.) and a bit about your goals. Drop your name, email and phone number too and I'll get the right person to put together a tailored quote for you."
              : action === "verify"
                ? "No problem — please share your order ID or any details from the invoice you received, and I'll help you verify it right away."
                : action === "find-work"
                  ? "Hey, I'm Alex 👋 I can match you to live vacancies. Tell me your role/skills, location and availability and I'll check which of our current openings suit you best."
                  : action === "client-order"
                    ? "Hey, I'm Alex 👋 Let's get your staffing order sorted. Tell me:\n\n• What role(s) do you need (e.g. waiter, chef, security)?\n• How many staff?\n• Dates & shift times?\n• Location/venue?\n• Pay rate (or shall I suggest market rate)?\n• Any uniform, skills or experience requirements?\n\nDrop it all in one message or one at a time — I'll put the vacancy together and confirm before posting."
                    : action === "candidate-register"
                      ? "Hey, I'm Alex 👋 Let's get you on our books so you can set availability and pick up shifts. I just need a few quick details:\n\n• Full name\n• Email\n• Phone\n• Location / postcode\n• Your role(s) or skills (e.g. waiter, chef, barista, security)\n• When you can start\n\nDrop it all in one message or step-by-step — I'll register you and you can start ticking off the dates you're free."
                      : "Sure — tell me the amount you'd like to pay (in £) and a short reason (e.g. 'Deposit for Acme website' or 'Invoice INV-203'), and I'll generate a secure Stripe link you can pay with right away.",
    };
    setMessages((current) => action === "call" ? [reply] : [...current, reply]);
    // Focus input synchronously so mobile browsers open the keyboard
    requestAnimationFrame(() => textInputRef.current?.focus());
    textInputRef.current?.focus();
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

  const handleWidgetDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !widgetPosition) return;
    if ((event.target as HTMLElement).closest("button, input, a")) return;

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = widgetPosition;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setWidgetPosition({
        x: clampValue(startPosition.x + moveEvent.clientX - startX, CHAT_WIDGET_EDGE_GAP, window.innerWidth - widgetSize.width - CHAT_WIDGET_EDGE_GAP),
        y: clampValue(startPosition.y + moveEvent.clientY - startY, CHAT_WIDGET_EDGE_GAP, window.innerHeight - widgetSize.height - CHAT_WIDGET_EDGE_GAP),
      });
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleWidgetResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile || !widgetPosition) return;

    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSize = widgetSize;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampValue(startSize.width - (moveEvent.clientX - startX), CHAT_WIDGET_MIN_SIZE.width, startSize.width + widgetPosition.x - CHAT_WIDGET_EDGE_GAP);
      const nextHeight = clampValue(startSize.height - (moveEvent.clientY - startY), CHAT_WIDGET_MIN_SIZE.height, startSize.height + widgetPosition.y - CHAT_WIDGET_EDGE_GAP);
      setWidgetSize({ width: nextWidth, height: nextHeight });
      setWidgetPosition({
        x: widgetPosition.x + startSize.width - nextWidth,
        y: widgetPosition.y + startSize.height - nextHeight,
      });
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const chatContent = (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={handleChatDragEnter}
      onDragOver={handleChatDragOver}
      onDragLeave={handleChatDragLeave}
      onDrop={handleChatDrop}
    >
      <AnimatePresence>
        {isDraggingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-black/60 p-6 backdrop-blur-sm"
          >
            <div
              className="flex w-full max-w-[280px] flex-col items-center gap-3 rounded-sm px-5 py-6 text-center text-white"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 100%)",
                border: "1px dashed rgba(255,255,255,0.45)",
              }}
            >
              <ImageIcon className="h-7 w-7" />
              <div>
                <p className="text-sm font-semibold">Drop image to upload</p>
                <p className="mt-1 text-xs text-white/60">Alex will read it in the chat.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-white/10 md:cursor-move"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div 
              className="-ml-[3px] w-10 h-10 rounded-sm flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{isDevMode ? "Pixcellor Dev Assistant" : "Alex from Pixcellor"}</h3>
              <p className="text-xs text-white/50">{isDevMode ? "Creates contacts and sales events" : manualHandoff ? "Team member replying" : "Usually replies instantly"}</p>
            </div>
          </div>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
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
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Chat upload" className="mb-2 max-h-44 w-full rounded-sm object-cover" loading="lazy" />
                  )}
                  <span dangerouslySetInnerHTML={{ __html: formatMessage(getDisplayMessageContent(msg)) }} />
                </div>
                {/* Package cards */}
                {msg.packageCards && msg.packageCards.length > 0 && (
                  <div className="w-[80%] space-y-2">
                    {msg.packageCards.map((card, j) => (
                      <PackageCardUI key={`${card.packageId}-${j}`} card={card} />
                    ))}
                  </div>
                )}
                {!isDevMode && i === 0 && msg.role === "assistant" && !quickAction && (
                  <div className="mt-2 flex w-[80%] flex-wrap gap-2">
                    <motion.button
                      type="button"
                      onClick={() => startQuickAction("call")}
                      disabled={isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => startQuickAction("email")}
                      disabled={isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("pixcellor:open-vision"));
                        setIsOpen(false);
                      }}
                      disabled={isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Create
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => startQuickAction("verify")}
                      disabled={isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Verify
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => startQuickAction("pay")}
                      disabled={isLoading}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex h-8 items-center gap-2 rounded-sm px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Pay
                    </motion.button>
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
            {quickAction === "call" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <a
                  href="tel:+441483912430"
                  className="flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-white transition hover:brightness-125"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call us +44 1483 912430
                </a>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input
            ref={textInputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isDevMode ? "Paste contact details or describe a sales event" : quickAction === "call" ? "Name and phone number" : quickAction === "email" ? "Name and email address" : quickAction === "trial" ? "Project details + name, email, phone" : quickAction === "services" ? "Services needed + name, email, phone" : quickAction === "verify" ? "Order ID or invoice details" : quickAction === "pay" ? "Amount in £ and reason e.g. 250 deposit for Acme" : manualHandoff ? "Reply to the team" : "Ask something or just leave email address"}
            className="h-9 min-w-0 flex-1 rounded-sm px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-0 focus-visible:outline-none"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ffffff",
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage || isLoading}
            aria-label="Upload image"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <ImageIcon className="h-4 w-4 text-white" />}
          </button>
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
          className={`group fixed left-1/2 top-4 z-[10500] flex items-center justify-center rounded-sm overflow-hidden transition-opacity duration-500 ease-out md:top-6 md:z-[10000] ${(hidden || !heroReady) ? 'pointer-events-none opacity-0' : 'opacity-100'} ${isMobile && isOpen ? 'lg:flex hidden' : 'flex'} ${isMobile ? 'h-[34px] w-[34px]' : 'h-[42px] w-[42px]'}`}
          aria-label="Open chat with Alex from Pixcellor"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ x: "-50%", y: -8, filter: "blur(10px)" }}
          animate={{ x: "-50%", y: heroReady ? 0 : -8, filter: heroReady ? "blur(0px)" : "blur(10px)" }}
          transition={{ duration: 0.6, delay: 0.08, ease: "easeOut" }}
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%)",
            backdropFilter: "blur(28px) saturate(160%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.3),
              inset 0 1px 1px rgba(255,255,255,0.3),
              inset 0 -1px 1px rgba(0,0,0,0.1)
            `,
          }}
        >
        <div
          className="absolute inset-1 rounded-sm opacity-60 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />
        <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
              <X className="w-4 h-4 text-white drop-shadow-lg" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
              <MessageSquare className="w-4 h-4 text-white drop-shadow-lg" />
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

      {/* Mobile + tablet: Drawer */}
      {!isDesktop ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent 
            className="border-0 border-t-0 [&>div:first-child]:hidden"
            style={{
              ...glassStyle,
              height: mobileDrawerHeight ? `${mobileDrawerHeight}px` : "85vh",
              maxHeight: mobileDrawerHeight ? `${mobileDrawerHeight}px` : "85vh",
            }}
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
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(12px)" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onPointerDown={handleWidgetDragStart}
              className="fixed z-50 rounded-3xl flex flex-col overflow-hidden"
              style={{
                ...glassStyle,
                width: widgetSize.width,
                height: widgetSize.height,
                left: widgetPosition?.x ?? getDefaultWidgetPosition().x,
                top: widgetPosition?.y ?? getDefaultWidgetPosition().y,
              }}
            >
              <div 
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 30%)",
                }}
              />
              {chatContent}
              <div
                role="separator"
                aria-label="Resize chat"
                onPointerDown={handleWidgetResizeStart}
                className="absolute left-0 top-0 z-20 h-8 w-8 cursor-nw-resize touch-none"
              >
                <span className="absolute left-2 top-2 h-3 w-3 rounded-tl-sm border-l border-t border-white/50" />
                <span className="absolute left-2 top-2 h-5 w-5 rounded-tl-sm border-l border-t border-white/25" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );
}
