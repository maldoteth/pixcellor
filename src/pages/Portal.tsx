import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Archive, Clipboard, ExternalLink, Globe, Home, Inbox, Loader2, Mail, MessageSquare, PackageCheck, Plus, Repeat, Search, ShoppingBag, Trash2, TrendingUp, UserPlus, Users, UserSearch } from "lucide-react";
import { toast } from "sonner";
import ChatBot from "@/components/ChatBot";

type StripeSession = {
  session_id: string;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  status: string | null;
  order_status?: string | null;
  delivered_at?: string | null;
  delivered_domain?: string | null;
  customer_email: string | null;
  mode: string | null;
  subscription_id?: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type VisitorFalloff = {
  id: string;
  visitor_id: string;
  session_id: string;
  ip_address: string | null;
  ip_hostname: string | null;
  ip_city: string | null;
  ip_region: string | null;
  ip_country: string | null;
  ip_location: string | null;
  ip_postal: string | null;
  ip_timezone: string | null;
  company_name: string | null;
  company_domain: string | null;
  company_type: string | null;
  asn: string | null;
  as_name: string | null;
  as_domain: string | null;
  as_route: string | null;
  carrier_name: string | null;
  carrier_mcc: string | null;
  carrier_mnc: string | null;
  privacy_vpn: boolean | null;
  privacy_proxy: boolean | null;
  privacy_tor: boolean | null;
  privacy_relay: boolean | null;
  privacy_hosting: boolean | null;
  enrichment_source: string | null;
  enrichment_status: string | null;
  enrichment_error: string | null;
  enriched_at: string | null;
  first_page: string | null;
  last_page: string | null;
  referrer: string | null;
  user_agent: string | null;
  browser_language: string | null;
  timezone: string | null;
  screen_size: string | null;
  viewport_size: string | null;
  checkout_session_id: string | null;
  package_name: string | null;
  billing: string | null;
  price_id: string | null;
  customer_email: string | null;
  checkout_started_at: string | null;
  max_scroll_percent: number;
  portfolio_opened_at: string | null;
  portfolio_pages_viewed: number;
  portfolio_project_opened_at: string | null;
  portfolio_project_opened: string | null;
  pricing_opened_at: string | null;
  buy_clicked_at: string | null;
  last_seen_at: string;
  event_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// ONLY include orders explicitly stamped by this website's checkout.
// All legacy/external Stripe activity is excluded.
const isSiteOrder = (o: StripeSession) => {
  const source = (o.metadata as { source?: string } | null)?.source;
  return source === "pixcellor_site";
};

const isPaidOrder = (o: StripeSession) => o.payment_status === "paid" || o.status === "complete" || o.status === "completed";

const getOrderMetadataText = (order: StripeSession, key: string) => {
  const value = order.metadata?.[key];
  return typeof value === "string" ? value : "";
};

const isMonthlyRetainerOrder = (order: StripeSession) => {
  const packageName = getOrderMetadataText(order, "package_name").toLowerCase();
  const billing = getOrderMetadataText(order, "billing").toLowerCase();
  return packageName.includes("retainer") && billing.includes("monthly");
};

type Conversation = {
  id: string;
  client_id: string;
  bot_paused?: boolean;
  manual_handoff_at?: string | null;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

type Profile = {
  email: string;
  name: string | null;
  company: string | null;
  brand_colours: string | null;
  page_count: number | null;
  requirements: string | null;
  content_notes: string | null;
  notes: string | null;
  updated_at: string;
};

type ProjectRequirement = {
  session_id: string;
  customer_email: string | null;
  site_name: string;
  site_contents: string;
  pages_details: string;
  colours_styles: string;
  reference_links: string | null;
  images_content_socials: string;
  extra_notes: string | null;
  updated_at: string;
};

type EditRequest = {
  id: string;
  session_id: string;
  customer_email: string | null;
  package_name: string;
  request_number: number;
  request_details: string;
  status: "open" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
};

type EmailLog = {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  notes: string | null;
  status: "cold" | "aware" | "warm" | "hot" | "gold" | "archived";
  source: string;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
};

type ContactEvent = {
  id: string;
  contact_id: string;
  title: string;
  description: string | null;
  event_type: string;
  callback_at: string | null;
  completed_at: string | null;
  created_by_user_id?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
};

type MailboxMessage = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  unread: boolean;
  messageId?: string;
};

const formatGBP = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

const normalizeEmail = (value?: string | null) => {
  const email = (value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const formatPhoneHref = (value?: string | null) => {
  const phone = (value ?? "").trim();
  const cleaned = phone.replace(/(?!^\+)[^\d]/g, "");
  return /\d/.test(cleaned) ? `tel:${cleaned}` : null;
};

const formatWebsiteHref = (value?: string | null) => {
  const website = (value ?? "").trim();
  return website ? (website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`) : null;
};

const normalizePhoneDigits = (value?: string | null) => (value ?? "").replace(/\D/g, "");

const formatDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

const formatCountdown = (callbackAt: string, nowMs: number) => {
  const diffMs = new Date(callbackAt).getTime() - nowMs;
  const absMs = Math.abs(diffMs);
  const totalMinutes = Math.floor(absMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    days === 0 && minutes > 0 ? `${minutes}m` : null,
  ].filter(Boolean).join(" ");

  if (totalMinutes < 1) return diffMs < 0 ? "Due now" : "Under 1m";
  return diffMs < 0 ? `Overdue by ${parts}` : parts;
};

const callbackPresets = [
  { label: "1 day", getDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  { label: "1w", getDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { label: "2w", getDate: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  { label: "1m", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
  { label: "3m", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; } },
  { label: "1y", getDate: () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; } },
];

const getEventAuthorLabel = (event: ContactEvent) => event.created_by_email ? `Logged by ${event.created_by_email}` : "Logged by admin";

const getContactCreatorLabel = (contact: Contact) => contact.created_by_email ? `Created by ${contact.created_by_email}` : contact.source === "lead_agent" ? "Created by AI lead finder" : "Created by admin";

const contactStatuses = [
  { value: "cold", label: "Cold", color: "hsl(217 91% 60%)" },
  { value: "aware", label: "Aware", color: "hsl(142 71% 45%)" },
  { value: "warm", label: "Warm", color: "hsl(32 95% 44%)" },
  { value: "hot", label: "Hot", color: "hsl(0 84% 60%)" },
  { value: "gold", label: "Client", color: "hsl(45 93% 47%)" },
] as const;

const getContactStatusColor = (status: Contact["status"]) =>
  contactStatuses.find(item => item.value === status)?.color ?? "hsl(var(--muted))";


const trimLinkToken = (token: string) => {
  const trailing = token.match(/[),.;:!?]+$/)?.[0] ?? "";
  return { clean: trailing ? token.slice(0, -trailing.length) : token, trailing };
};

function LinkifiedText({ text, className, stopPropagation = false }: { text: string; className?: string; stopPropagation?: boolean }) {
  const parts: Array<string | JSX.Element> = [];
  const pattern = /(https?:\/\/[^\s<>)]+|www\.[^\s<>)]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const { clean, trailing } = trimLinkToken(match[0]);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(clean);
    const href = isEmail ? `mailto:${clean}` : clean.startsWith("www.") ? `https://${clean}` : clean;
    parts.push(
      <a
        key={`${match.index}-${clean}`}
        href={href}
        target={isEmail ? undefined : "_blank"}
        rel={isEmail ? undefined : "noopener noreferrer"}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
        onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      >
        {clean}
      </a>
    );
    if (trailing) parts.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <span className={className}>{parts}</span>;
}

const contactWizardFields = [
  { key: "name", label: "Name", placeholder: "Contact name", required: true, inputMode: "text" },
  { key: "phone", label: "Number", placeholder: "Phone number", required: true, inputMode: "tel" },
  { key: "email", label: "Email", placeholder: "Email address", required: false, inputMode: "email" },
  { key: "location", label: "Location", placeholder: "Town or area", required: false, inputMode: "text" },
  { key: "industry", label: "Industry", placeholder: "Industry e.g. construction", required: false, inputMode: "text" },
  { key: "website", label: "Website", placeholder: "Website domain", required: false, inputMode: "url" },
  { key: "notes", label: "Job title", placeholder: "Job title", required: false, inputMode: "text" },
] as const;

const salesEventWizardFields = [
  { key: "contact", label: "Contact", placeholder: "Search contact", required: true, inputMode: "text" },
  { key: "title", label: "Event", placeholder: "Callback, email, quote…", required: true, inputMode: "text" },
  { key: "callback_at", label: "Callback time", placeholder: "Callback time", required: false, inputMode: "text" },
  { key: "description", label: "Notes", placeholder: "Add notes", required: false, inputMode: "text" },
] as const;

export default function Portal() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState<StripeSession[]>([]);
  const [falloffs, setFalloffs] = useState<VisitorFalloff[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projectRequirements, setProjectRequirements] = useState<ProjectRequirement[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [salesSearch, setSalesSearch] = useState("");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [retainersSearch, setRetainersSearch] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [websitesSearch, setWebsitesSearch] = useState("");
  const [falloffsSearch, setFalloffsSearch] = useState("");
  const [chatsSearch, setChatsSearch] = useState("");
  const [profilesSearch, setProfilesSearch] = useState("");
  const [inquiriesSearch, setInquiriesSearch] = useState("");
  const [orderReqsFilter, setOrderReqsFilter] = useState<"all" | "submitted" | "edits" | "waiting">("all");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsStatusFilter, setContactsStatusFilter] = useState<"all" | Contact["status"]>("all");
  const [contactsSortOrder, setContactsSortOrder] = useState<"newest" | "oldest">("newest");
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [contactDetailDrawerId, setContactDetailDrawerId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSalesEventForm, setShowSalesEventForm] = useState(false);
  const [mobileContactDrawerOpen, setMobileContactDrawerOpen] = useState(false);
  const [mobileSalesDrawerOpen, setMobileSalesDrawerOpen] = useState(false);
  const [mobileOrdersDrawerOpen, setMobileOrdersDrawerOpen] = useState(false);
  const [mobileContactStep, setMobileContactStep] = useState(0);
  const [mobileSalesStep, setMobileSalesStep] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "" });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "" });
  const [eventForm, setEventForm] = useState({ contact_id: "", title: "", description: "", callback_at: "" });
  const [eventContactSearch, setEventContactSearch] = useState("");
  const [eventContactSuggestionCount, setEventContactSuggestionCount] = useState(6);
  const [eventContactSuggestionsOpen, setEventContactSuggestionsOpen] = useState(false);
  const [contactJobTitleSuggestionsOpen, setContactJobTitleSuggestionsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [manualReply, setManualReply] = useState("");
  const [mailboxMessages, setMailboxMessages] = useState<MailboxMessage[]>([]);
  const [mailboxSearch, setMailboxSearch] = useState("");
  const [activeMail, setActiveMail] = useState<MailboxMessage | null>(null);
  const [mailReply, setMailReply] = useState("");
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [sendingConfirmationId, setSendingConfirmationId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("sales");
  const [devChatOpen, setDevChatOpen] = useState(false);
  const [leadAgentForm, setLeadAgentForm] = useState({ trade: "", location: "", limit: "10" });
  const [leadAgentLoading, setLeadAgentLoading] = useState(false);
  const [leadAgentSummary, setLeadAgentSummary] = useState<string | null>(null);

  const loadPortalSnapshot = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("portal_fetch_snapshot");
    if (error) {
      setAuthError(error.message);
      return;
    }
    const snapshot = (data ?? {}) as {
      orders?: StripeSession[];
      falloffs?: VisitorFalloff[];
      conversations?: Conversation[];
      messages?: Message[];
      profiles?: Profile[];
      inquiries?: Inquiry[];
      contacts?: Contact[];
      contactEvents?: ContactEvent[];
      projectRequirements?: ProjectRequirement[];
      editRequests?: EditRequest[];
      emailLogs?: EmailLog[];
    };
    setOrders((snapshot.orders ?? []).filter((order) => isSiteOrder(order) && isPaidOrder(order)));
    setFalloffs(snapshot.falloffs ?? []);
    const convs = snapshot.conversations ?? [];
    const allMsgs = snapshot.messages ?? [];
    setProfiles(snapshot.profiles ?? []);
    setInquiries(snapshot.inquiries ?? []);
    setContacts(snapshot.contacts ?? []);
    setContactEvents(snapshot.contactEvents ?? []);
    setProjectRequirements(snapshot.projectRequirements ?? []);
    setEditRequests(snapshot.editRequests ?? []);
    setEmailLogs(snapshot.emailLogs ?? []);
    setAllMessages(allMsgs);
    const previews: Record<string, Message> = {};
    for (const m of allMsgs) {
      if (!previews[m.conversation_id]) previews[m.conversation_id] = m;
    }
    setLastMessages(previews);
    const sortedConvs = [...convs].sort((a, b) => {
      const aTime = previews[a.id]?.created_at ?? a.updated_at;
      const bTime = previews[b.id]?.created_at ?? b.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    setConversations(sortedConvs);
  }, []);

  // Signed-in admin gate
  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!sessionData.session) {
        setIsAdmin(false);
        setAuthChecked(true);
        navigate("/portal-login", { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: sessionData.session.user.id,
        _role: "admin",
      });
      if (!mounted) return;
      if (error || !data) {
        await supabase.auth.signOut();
        setIsAdmin(false);
        setAuthChecked(true);
        navigate("/portal-login", { replace: true });
        return;
      }
      setIsAdmin(true);
      setAuthChecked(true);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void checkAdmin();
    });
    void checkAdmin();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Initial load + realtime
  useEffect(() => {
    if (!isAdmin) return;

    loadPortalSnapshot();

    const channel = supabase
      .channel("portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_checkout_sessions" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "visitor_falloffs" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        if (activeConv) loadMessages(activeConv);
        loadPortalSnapshot();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_profiles" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_requirements" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_inquiries" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_events" }, loadPortalSnapshot)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, activeConv, loadPortalSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setEventContactSuggestionCount(6);
  }, [eventContactSearch, mobileSalesDrawerOpen, showSalesEventForm]);

  useEffect(() => {
    if (!mobileSalesDrawerOpen && !showSalesEventForm) setEventContactSuggestionsOpen(false);
  }, [mobileSalesDrawerOpen, showSalesEventForm]);

  useEffect(() => {
    if (!mobileContactDrawerOpen && !showContactForm) setContactJobTitleSuggestionsOpen(false);
  }, [mobileContactDrawerOpen, showContactForm]);

  const loadMessages = async (conversationId: string) => {
    setActiveConv(conversationId);
    setManualReply("");
    const { data, error } = await (supabase as any).rpc("portal_fetch_messages", { _conversation_id: conversationId });
    if (error) toast.error(error.message);
    else setMessages((data ?? []) as Message[]);
  };

  const loadMailbox = async () => {
    const allowedEmails = Array.from(new Set([
      ...orders.map((order) => normalizeEmail(order.customer_email)),
      ...profiles.map((profile) => normalizeEmail(profile.email)),
      ...inquiries.map((inquiry) => normalizeEmail(inquiry.email)),
      ...contacts.map((contact) => normalizeEmail(contact.email)),
      ...conversations.map((conversation) => normalizeEmail(conversation.client_id)),
    ].filter(Boolean) as string[]));

    if (allowedEmails.length === 0) {
      setMailboxMessages([]);
      setActiveMail(null);
      toast.info("No Pixcellor user emails found yet.");
      return;
    }

    setMailboxLoading(true);
    const { data, error } = await supabase.functions.invoke("mailbox", {
      body: { action: "list", query: mailboxSearch.trim() || undefined, allowedEmails },
    });
    setMailboxLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not load mailbox");
      return;
    }
    setMailboxMessages(data.messages ?? []);
    setActiveMail((current) => current ? (data.messages ?? []).find((m: MailboxMessage) => m.id === current.id) ?? current : null);
  };

  const sendManualReply = async () => {
    if (!activeConv) return;
    const content = manualReply.trim();
    if (!content) {
      toast.error("Reply cannot be empty.");
      return;
    }
    const { error } = await (supabase as any).rpc("portal_send_chat_reply", {
      _conversation_id: activeConv,
      _content: content,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setManualReply("");
    await loadMessages(activeConv);
    await loadPortalSnapshot();
    toast.success("Reply sent. Bot paused for this chat.");
  };

  const closeChatCase = async () => {
    if (!activeConv) return;
    const { error } = await (supabase as any).rpc("portal_close_chat_case", {
      _conversation_id: activeConv,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadPortalSnapshot();
    toast.success("Case closed. Bot re-enabled.");
  };

  const counters = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.amount_total ?? 0), 0);
    const totalWebsites = orders.length;
    const uniqueVisitors = new Set(falloffs.map((f) => f.visitor_id).filter(Boolean)).size;
    const totalVisitEvents = falloffs.reduce((sum, f) => sum + (f.event_count ?? 0), 0);
    const pricingViews = falloffs.filter((f) => f.pricing_opened_at).length;
    const buyClicks = falloffs.filter((f) => f.buy_clicked_at).length;

    // Potential = chatters who haven't bought
    const buyerEmails = new Set(
      orders.map(o => o.customer_email?.toLowerCase()).filter(Boolean) as string[]
    );
    const profileEmails = profiles.map(p => p.email.toLowerCase());
    const inquiryEmails = inquiries.map(i => i.email.toLowerCase());
    const allLeads = new Set([...profileEmails, ...inquiryEmails]);
    let potential = 0;
    for (const email of allLeads) if (!buyerEmails.has(email)) potential += 1;
    // Add anonymous chatters with no email at all
    const conversationsWithoutEmail = conversations.length - allLeads.size;
    if (conversationsWithoutEmail > 0) potential += conversationsWithoutEmail;

    return { totalSales, totalWebsites, potential, uniqueVisitors, totalVisitEvents, pricingViews, buyClicks };
  }, [orders, profiles, inquiries, conversations, falloffs]);

  const salesQ = salesSearch.trim().toLowerCase();
  const contactsQ = contactsSearch.trim().toLowerCase();
  const ordersQ = ordersSearch.trim().toLowerCase();
  const retainersQ = retainersSearch.trim().toLowerCase();
  const completedQ = completedSearch.trim().toLowerCase();
  const websitesQ = websitesSearch.trim().toLowerCase();
  const falloffsQ = falloffsSearch.trim().toLowerCase();
  const chatsQ = chatsSearch.trim().toLowerCase();
  const profilesQ = profilesSearch.trim().toLowerCase();
  const inquiriesQ = inquiriesSearch.trim().toLowerCase();
  const matchesQuery = (query: string, s: string | null | undefined) => !!s && s.toLowerCase().includes(query);
  const orderMatchesQuery = (query: string, order: StripeSession) =>
    matchesQuery(query, order.customer_email) || matchesQuery(query, order.session_id) ||
    matchesQuery(query, order.payment_status) || matchesQuery(query, order.status) ||
    matchesQuery(query, order.currency) || matchesQuery(query, order.order_status) ||
    matchesQuery(query, order.delivered_domain) || matchesQuery(query, JSON.stringify(order.metadata));


  const requirementsBySession = useMemo(() => {
    const map = new Map<string, ProjectRequirement>();
    for (const item of projectRequirements) map.set(item.session_id, item);
    return map;
  }, [projectRequirements]);

  const editRequestsBySession = useMemo(() => {
    const map = new Map<string, EditRequest[]>();
    for (const item of editRequests) {
      const current = map.get(item.session_id) ?? [];
      current.push(item);
      map.set(item.session_id, current);
    }
    for (const value of map.values()) value.sort((a, b) => b.request_number - a.request_number);
    return map;
  }, [editRequests]);

  const orderEmailStatusBySession = useMemo(() => {
    const confirmationTemplates = new Set(["full-works-order-confirmation", "elite-order-confirmation", "retainer-order-confirmation"]);
    const map = new Map<string, { confirmationSent: boolean; reminderSent: boolean; completionSent: boolean }>();
    for (const order of orders) map.set(order.session_id, { confirmationSent: false, reminderSent: false, completionSent: false });
    for (const log of emailLogs) {
      const orderId = typeof log.metadata?.order_id === "string" ? log.metadata.order_id : null;
      const matchedOrder = orderId ? orders.find(order => order.session_id === orderId) : orders.find(order => order.customer_email?.toLowerCase() === log.recipient_email?.toLowerCase());
      if (!matchedOrder || log.status !== "sent") continue;
      const current = map.get(matchedOrder.session_id) ?? { confirmationSent: false, reminderSent: false, completionSent: false };
      if (confirmationTemplates.has(log.template_name)) current.confirmationSent = true;
      if (log.template_name === "project-requirements-reminder") current.reminderSent = true;
      if (log.template_name === "order-complete") current.completionSent = true;
      map.set(matchedOrder.session_id, current);
    }
    return map;
  }, [emailLogs, orders]);

  const contactOrderStatsByEmail = useMemo(() => {
    const map = new Map<string, { orders: StripeSession[]; ltv: number }>();
    for (const order of orders) {
      const email = normalizeEmail(order.customer_email);
      if (!email) continue;
      const current = map.get(email) ?? { orders: [], ltv: 0 };
      current.orders.push(order);
      current.ltv += order.amount_total ?? 0;
      map.set(email, current);
    }
    for (const value of map.values()) {
      value.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return map;
  }, [orders]);

  useEffect(() => {
    const matchedNonClients = contacts.filter(contact => {
      const email = normalizeEmail(contact.email);
      return email && contact.status !== "gold" && contact.status !== "archived" && contactOrderStatsByEmail.has(email);
    });
    if (matchedNonClients.length === 0) return;

    setContacts(current => current.map(contact => {
      const email = normalizeEmail(contact.email);
      return email && contactOrderStatsByEmail.has(email) ? { ...contact, status: "gold" } : contact;
    }));

    void Promise.all(matchedNonClients.map(contact =>
      (supabase as any).rpc("portal_update_contact_status", {
        _contact_id: contact.id,
        _status: "gold",
      })
    )).then(() => loadPortalSnapshot());
  }, [contacts, contactOrderStatsByEmail, loadPortalSnapshot]);

  const filteredOrders = useMemo(() => {
    const searched = !ordersQ ? orders : orders.filter(o => orderMatchesQuery(ordersQ, o));
    return searched.filter((order) => {
      const hasRequirements = requirementsBySession.has(order.session_id);
      const hasEditRequests = editRequestsBySession.has(order.session_id);
      const reqsMatches = orderReqsFilter === "all" ||
        (orderReqsFilter === "submitted" ? hasRequirements : orderReqsFilter === "edits" ? hasEditRequests : !hasRequirements);
      return order.order_status !== "delivered" && reqsMatches;
    });
  }, [orders, ordersQ, orderReqsFilter, requirementsBySession, editRequestsBySession]);

  const filteredRetainers = useMemo(() => {
    const monthlyRetainers = orders.filter(isMonthlyRetainerOrder);
    return !retainersQ ? monthlyRetainers : monthlyRetainers.filter(o => orderMatchesQuery(retainersQ, o));
  }, [orders, retainersQ]);

  const completedOrders = useMemo(() => {
    const searched = !completedQ ? orders : orders.filter(o => orderMatchesQuery(completedQ, o));
    return searched.filter((order) => {
      const hasRequirements = requirementsBySession.has(order.session_id);
      const hasEditRequests = editRequestsBySession.has(order.session_id);
      const reqsMatches = orderReqsFilter === "all" ||
        (orderReqsFilter === "submitted" ? hasRequirements : orderReqsFilter === "edits" ? hasEditRequests : !hasRequirements);
      return order.order_status === "delivered" && reqsMatches;
    });
  }, [orders, completedQ, orderReqsFilter, requirementsBySession, editRequestsBySession]);

  const filteredFalloffs = useMemo(() => {
    const paidSessionIds = new Set(orders.map(o => o.session_id));
    const unpaidFalloffs = falloffs.filter(f => !f.checkout_session_id || !paidSessionIds.has(f.checkout_session_id));
    if (!falloffsQ) return unpaidFalloffs;
    return unpaidFalloffs.filter(f =>
      matchesQuery(falloffsQ, f.customer_email) || matchesQuery(falloffsQ, f.checkout_session_id) ||
      matchesQuery(falloffsQ, f.package_name) || matchesQuery(falloffsQ, f.billing) ||
      matchesQuery(falloffsQ, f.referrer) || matchesQuery(falloffsQ, f.user_agent) ||
      matchesQuery(falloffsQ, f.timezone) || matchesQuery(falloffsQ, f.company_name) ||
      matchesQuery(falloffsQ, f.company_domain) || matchesQuery(falloffsQ, f.company_type) ||
      matchesQuery(falloffsQ, f.ip_address) || matchesQuery(falloffsQ, f.ip_city) ||
      matchesQuery(falloffsQ, f.ip_region) || matchesQuery(falloffsQ, f.ip_country) ||
      matchesQuery(falloffsQ, f.ip_hostname) || matchesQuery(falloffsQ, f.ip_location) ||
      matchesQuery(falloffsQ, f.ip_postal) || matchesQuery(falloffsQ, f.asn) ||
      matchesQuery(falloffsQ, f.as_name) || matchesQuery(falloffsQ, f.as_domain) ||
      matchesQuery(falloffsQ, f.as_route) || matchesQuery(falloffsQ, f.carrier_name) ||
      matchesQuery(falloffsQ, f.enrichment_source) || matchesQuery(falloffsQ, f.enrichment_status) ||
      matchesQuery(falloffsQ, f.visitor_id) || matchesQuery(falloffsQ, JSON.stringify(f.metadata))
    );
  }, [falloffs, orders, falloffsQ]);

  const filteredProfiles = useMemo(() => {
    if (!profilesQ) return profiles;
    return profiles.filter(p =>
      matchesQuery(profilesQ, p.email) || matchesQuery(profilesQ, p.name) || matchesQuery(profilesQ, p.company) ||
      matchesQuery(profilesQ, p.brand_colours) || matchesQuery(profilesQ, p.requirements) ||
      matchesQuery(profilesQ, p.content_notes) || matchesQuery(profilesQ, p.notes) ||
      matchesQuery(profilesQ, p.page_count?.toString())
    );
  }, [profiles, profilesQ]);

  const filteredInquiries = useMemo(() => {
    if (!inquiriesQ) return inquiries;
    return inquiries.filter(i =>
      matchesQuery(inquiriesQ, i.name) || matchesQuery(inquiriesQ, i.email) || matchesQuery(inquiriesQ, i.message)
    );
  }, [inquiries, inquiriesQ]);

  const filteredContacts = useMemo(() => {
    if (!contactsQ) return contacts;
    const matchingContactIds = new Set(
      contactEvents.filter(e => matchesQuery(contactsQ, e.title) || matchesQuery(contactsQ, e.description) || matchesQuery(contactsQ, e.event_type) || matchesQuery(contactsQ, e.callback_at)).map(e => e.contact_id)
    );
    return contacts.filter(c =>
      matchesQuery(contactsQ, c.name) || matchesQuery(contactsQ, c.phone) || matchesQuery(contactsQ, c.email) ||
      matchesQuery(contactsQ, c.location) || matchesQuery(contactsQ, c.industry) || matchesQuery(contactsQ, c.notes) || matchingContactIds.has(c.id)
    );
  }, [contacts, contactEvents, contactsQ]);

  const filteredContactEvents = useMemo(() => {
    if (!contactsQ) return contactEvents;
    const contactIds = new Set(filteredContacts.map(c => c.id));
    return contactEvents.filter(e =>
      contactIds.has(e.contact_id) || matchesQuery(contactsQ, e.title) || matchesQuery(contactsQ, e.description) ||
      matchesQuery(contactsQ, e.event_type) || matchesQuery(contactsQ, e.callback_at)
    );
  }, [contactEvents, filteredContacts, contactsQ]);

  const searchedContacts = useMemo(() => {
    const archivedFiltered = contactsStatusFilter === "archived"
      ? filteredContacts.filter(c => c.status === "archived")
      : filteredContacts.filter(c => c.status !== "archived");
    const statusFiltered = contactsStatusFilter === "all" || contactsStatusFilter === "archived" ? archivedFiltered : archivedFiltered.filter(c => {
      const email = normalizeEmail(c.email);
      const hasOrders = Boolean(email && contactOrderStatsByEmail.has(email));
      const effectiveStatus = hasOrders ? "gold" : c.status;
      return effectiveStatus === contactsStatusFilter;
    });
    const sortContacts = (items: Contact[]) => [...items].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return contactsSortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });
    if (!contactsQ) {
      return sortContacts(statusFiltered).slice(0, 10);
    }
    const matchingContactIds = new Set(
      contactEvents
        .filter(e => matchesQuery(contactsQ, e.title) || matchesQuery(contactsQ, e.description) || matchesQuery(contactsQ, e.event_type) || matchesQuery(contactsQ, e.callback_at))
        .map(e => e.contact_id)
    );
    return sortContacts(statusFiltered.filter(c => {
      const email = normalizeEmail(c.email);
      const orderStats = email ? contactOrderStatsByEmail.get(email) : null;
      const orderMatches = Boolean(orderStats && (
        matchesQuery(contactsQ, "client") ||
        matchesQuery(contactsQ, "ltv") ||
        orderStats.orders.some(order =>
          matchesQuery(contactsQ, order.session_id) || matchesQuery(contactsQ, order.payment_status) ||
          matchesQuery(contactsQ, order.status) || matchesQuery(contactsQ, order.order_status) ||
          matchesQuery(contactsQ, order.delivered_domain) || matchesQuery(contactsQ, formatGBP(order.amount_total ?? 0))
        )
      ));
      return (
      matchesQuery(contactsQ, c.name) || matchesQuery(contactsQ, c.phone) || matchesQuery(contactsQ, c.email) ||
      matchesQuery(contactsQ, c.location) || matchesQuery(contactsQ, c.industry) || matchesQuery(contactsQ, c.notes) || matchesQuery(contactsQ, c.status) || matchingContactIds.has(c.id) || orderMatches
      );
    }));
  }, [filteredContacts, contactEvents, contactsQ, contactsStatusFilter, contactsSortOrder, contactOrderStatsByEmail]);

  const jobTitleSuggestions = useMemo(() => {
    const typed = contactForm.notes.trim().toLowerCase();
    if (!typed) return [];
    const titles = Array.from(new Set(
      contacts
        .map(contact => contact.notes?.trim())
        .filter((title): title is string => Boolean(title))
    )).sort((a, b) => a.localeCompare(b));

    return titles
      .filter(title => title.toLowerCase().includes(typed) && title.toLowerCase() !== typed)
      .slice(0, 8);
  }, [contacts, contactForm.notes]);

  const eventContactSuggestions = useMemo(() => {
    const query = eventContactSearch.trim().toLowerCase();
    const sortedContacts = [...contacts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (!query) return sortedContacts;

    return sortedContacts.filter(contact =>
      [`${contact.name}${contact.email ? ` · ${contact.email}` : ""}`, contact.name, contact.email, contact.phone, contact.location, contact.industry, contact.notes]
        .some(value => value?.toLowerCase().includes(query))
    );
  }, [contacts, eventContactSearch]);

  const visibleEventContactSuggestions = eventContactSuggestions.slice(0, eventContactSuggestionCount);

  const salesCallbacks = useMemo(() => {
    const pending = contactEvents
      .filter(e => e.callback_at && !e.completed_at)
      .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime());
    if (!salesQ) return pending;
    return pending.filter(e => {
      const contact = contacts.find(c => c.id === e.contact_id);
      return matchesQuery(salesQ, e.title) || matchesQuery(salesQ, e.description) || matchesQuery(salesQ, e.callback_at) ||
        matchesQuery(salesQ, contact?.name) || matchesQuery(salesQ, contact?.email) || matchesQuery(salesQ, contact?.phone) || matchesQuery(salesQ, contact?.location);
    });
  }, [contactEvents, contacts, salesQ]);

  const callbacks = useMemo(() =>
    contactEvents
      .filter(e => e.callback_at && !e.completed_at)
      .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime()),
    [contactEvents]
  );

  const getContact = (id: string) => contacts.find(c => c.id === id);

  const openContactDrawer = (contactId: string) => {
    setContactDetailDrawerId(contactId);
  };

  const openEventFormForContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    setEventForm({ contact_id: contactId, title: "", description: "", callback_at: "" });
    setEventContactSearch(contact ? `${contact.name}${contact.email ? ` · ${contact.email}` : ""}` : "");
    setEventContactSuggestionsOpen(false);
    setShowSalesEventForm(false);
    setMobileSalesStep(1);
    setMobileSalesDrawerOpen(true);
  };

  const handleEventContactSearch = (value: string) => {
    setEventContactSearch(value);
    setEventContactSuggestionsOpen(value.trim().length > 0);
    const contact = contacts.find(c => `${c.name}${c.email ? ` · ${c.email}` : ""}` === value || c.name === value || c.email === value);
    setEventForm(f => ({ ...f, contact_id: contact?.id ?? "" }));
  };

  const selectEventContact = (contact: Contact) => {
    setEventContactSearch(`${contact.name}${contact.email ? ` · ${contact.email}` : ""}`);
    setEventForm(f => ({ ...f, contact_id: contact.id }));
    setEventContactSuggestionsOpen(false);
  };

  const loadMoreEventContactSuggestions = (element: HTMLDivElement) => {
    const nearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 12;
    if (nearBottom && eventContactSuggestionCount < eventContactSuggestions.length) {
      setEventContactSuggestionCount(count => Math.min(count + 6, eventContactSuggestions.length));
    }
  };

  const startEditingContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditContactForm({
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      location: contact.location ?? "",
      industry: contact.industry ?? "general",
      website: contact.website ?? "",
      notes: contact.notes ?? "",
    });
    setOpenContactId(contact.id);
  };

  const applyCallbackPreset = (presetLabel: string) => {
    const preset = callbackPresets.find(item => item.label === presetLabel);
    if (!preset) return;
    setEventForm(f => ({ ...f, callback_at: formatDateTimeLocal(preset.getDate()) }));
  };

  const exitPortal = () => {
    void supabase.auth.signOut();
    navigate("/portal-login", { replace: true });
  };

  const scrollPortalTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const openMobileHome = () => {
    setActiveTab("sales");
    setShowContactForm(false);
    setShowSalesEventForm(false);
    scrollPortalTop();
  };

  const openMobileSalesEvent = () => {
    setActiveTab("sales");
    setShowSalesEventForm(false);
    setMobileSalesStep(0);
    setMobileSalesDrawerOpen(true);
  };

  const openMobileContactForm = () => {
    setActiveTab("contacts");
    setShowContactForm(false);
    setMobileContactStep(0);
    setMobileContactDrawerOpen(true);
  };

  const openMobileOrders = () => {
    setActiveTab("orders");
    setMobileOrdersDrawerOpen(true);
  };

  const continueMobileContact = (skip = false) => {
    const field = contactWizardFields[mobileContactStep];
    const value = contactForm[field.key].trim();
    if (field.required && !value) {
      toast.error(`${field.label} is required.`);
      return;
    }
    if (skip && !field.required) setContactForm(f => ({ ...f, [field.key]: "" }));
    if (mobileContactStep < contactWizardFields.length - 1) setMobileContactStep(step => step + 1);
    else void createContact();
  };

  const continueMobileSalesEvent = (skip = false) => {
    const field = salesEventWizardFields[mobileSalesStep];
    const value = field.key === "contact" ? eventForm.contact_id : field.key === "title" ? eventForm.title.trim() : field.key === "callback_at" ? eventForm.callback_at.trim() : eventForm.description.trim();
    if (field.required && !value) {
      toast.error(`${field.label} is required.`);
      return;
    }
    if (skip && !field.required) setEventForm(f => ({ ...f, [field.key]: "" }));
    if (mobileSalesStep < salesEventWizardFields.length - 1) setMobileSalesStep(step => step + 1);
    else void createContactEvent();
  };

  const pasteMobileContactField = async () => {
    const text = await navigator.clipboard.readText();
    setContactForm(f => ({ ...f, [contactWizardFields[mobileContactStep].key]: text.trim() }));
  };

  const pasteMobileSalesField = async () => {
    const text = (await navigator.clipboard.readText()).trim();
    const field = salesEventWizardFields[mobileSalesStep];
    if (field.key === "contact") handleEventContactSearch(text);
    else setEventForm(f => ({ ...f, [field.key]: text }));
  };

  const createContact = async () => {
    const name = contactForm.name.trim();
    if (!name) {
      toast.error("Contact name is required.");
      return;
    }
    const { data, error } = await (supabase as any).rpc("portal_create_contact", {
      _name: name,
      _phone: contactForm.phone,
      _email: contactForm.email,
      _location: contactForm.location,
      _notes: contactForm.notes,
      _industry: contactForm.industry || "general",
      _website: contactForm.website,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const newContact = data as Contact | null;
    if (newContact?.id) {
      setContacts(current => [newContact, ...current.filter(contact => contact.id !== newContact.id)]);
      setContactDetailDrawerId(newContact.id);
    }
    setContactForm({ name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "" });
    setShowContactForm(false);
    setMobileContactDrawerOpen(false);
    setMobileContactStep(0);
    toast.success("Contact added.");
  };

  const runLeadAgent = async () => {
    const trade = leadAgentForm.trade.trim();
    const location = leadAgentForm.location.trim();
    const limit = Math.min(Math.max(Number(leadAgentForm.limit) || 10, 1), 25);
    if (!trade || !location) {
      toast.error("Add a trade and location first.");
      return;
    }

    setLeadAgentLoading(true);
    setLeadAgentSummary(null);
    const { data, error } = await supabase.functions.invoke("find-local-leads", {
      body: { trade, location, limit },
    });
    setLeadAgentLoading(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Lead agent failed");
      return;
    }

    const summary = data.message || `Added ${data.added ?? 0}. Searched ${data.searched ?? 0}, extracted ${data.extracted ?? 0}. Skipped ${data.skipped_duplicates ?? 0} duplicates. Rejected ${data.rejected_with_websites ?? 0} with websites, ${data.rejected_invalid_sources ?? 0} dead sources, and ${data.rejected_invalid ?? 0} invalid.`;
    setLeadAgentSummary(summary);
    await loadPortalSnapshot();
    toast.success(summary);
  };

  const updateContact = async () => {
    if (!editingContactId) return;
    const name = editContactForm.name.trim();
    if (!name) {
      toast.error("Contact name is required.");
      return;
    }
    const { error } = await (supabase as any).rpc("portal_update_contact", {
      _contact_id: editingContactId,
      _name: name,
      _phone: editContactForm.phone,
      _email: editContactForm.email,
      _location: editContactForm.location,
      _notes: editContactForm.notes,
      _industry: editContactForm.industry || "general",
      _website: editContactForm.website,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingContactId(null);
    setEditContactForm({ name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "" });
    await loadPortalSnapshot();
    toast.success("Contact updated.");
  };

  const createContactEvent = async () => {
    if (!eventForm.contact_id) {
      toast.error("Select a contact.");
      return;
    }
    const selectedContactId = eventForm.contact_id;
    const hasCallback = Boolean(eventForm.callback_at);
    const title = eventForm.title.trim();
    if (!title) {
      toast.error("Event title is required.");
      return;
    }
    const { data, error } = await (supabase as any).rpc("portal_create_contact_event", {
      _contact_id: eventForm.contact_id,
      _title: title,
      _description: eventForm.description,
      _callback_at: eventForm.callback_at ? new Date(eventForm.callback_at).toISOString() : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const newEvent = data as ContactEvent | null;
    if (newEvent?.id) {
      setContactEvents(current => [newEvent, ...current.filter(event => event.id !== newEvent.id)]);
    }
    setOpenContactId(selectedContactId);
    setEventForm({ contact_id: "", title: "", description: "", callback_at: "" });
    setEventContactSearch("");
    setShowSalesEventForm(false);
    setMobileSalesDrawerOpen(false);
    setMobileSalesStep(0);
    toast.success(hasCallback ? "Callback scheduled." : "Event logged in contact history.");
  };

  const completeCallback = async (eventId: string) => {
    const { error } = await (supabase as any).rpc("portal_complete_callback", { _event_id: eventId });
    if (error) toast.error(error.message);
    else {
      await loadPortalSnapshot();
      toast.success("Callback marked done.");
    }
  };

  const tryCallbackAgain = async (eventId: string) => {
    const nextCallback = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("contact_events")
      .update({ callback_at: nextCallback, completed_at: null })
      .eq("id", eventId);

    if (error) toast.error(error.message);
    else {
      await loadPortalSnapshot();
      toast.success("Callback pushed back 1 week.");
    }
  };

  const updateContactStatus = async (contactId: string, status: Contact["status"]) => {
    setContacts(current => current.map(contact => contact.id === contactId ? { ...contact, status } : contact));
    const { error } = await (supabase as any).rpc("portal_update_contact_status", {
      _contact_id: contactId,
      _status: status,
    });
    if (error) {
      toast.error(error.message);
      await loadPortalSnapshot();
    }
  };

  const archiveContact = async (contactId: string) => {
    await updateContactStatus(contactId, "archived");
    setContactDetailDrawerId(null);
    toast.success("Contact archived.");
  };

  const markOrderDelivered = async (order: StripeSession) => {
    if (!order.customer_email) {
      toast.error("This order does not have a customer email.");
      return;
    }

    const deliveredDomain = window.prompt("Enter the delivered website domain, e.g. example.com");
    if (!deliveredDomain) return;

    const cleanDomain = deliveredDomain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "").toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(cleanDomain)) {
      toast.error("Enter a valid delivered domain.");
      return;
    }

    setDeliveringOrderId(order.session_id);
    try {
      const { data, error } = await supabase.functions.invoke("send-order-complete", {
        body: { sessionId: order.session_id, deliveredDomain: cleanDomain },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Could not complete order");
        return;
      }
      await loadPortalSnapshot();
      if (data?.emailWarning) {
        toast.warning(`Order marked delivered, but the completion email failed: ${data.emailWarning}`);
      } else {
        toast.success(`Order completed and email sent to ${data.recipientEmail || order.customer_email}.`);
      }
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const markOrderUndelivered = async (sessionId: string) => {
    const confirmed = window.confirm("Move this order back to open so delivery can be redone?");
    if (!confirmed) return;

    const { error } = await (supabase as any).rpc("portal_mark_order_undelivered", {
      _session_id: sessionId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadPortalSnapshot();
    toast.success("Order moved back to open.");
  };

  const updateEditRequestStatus = async (requestId: string, status: EditRequest["status"]) => {
    const { error } = await (supabase as any).rpc("portal_update_edit_request_status", {
      _request_id: requestId,
      _status: status,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadPortalSnapshot();
    toast.success("Edit request updated.");
  };

  const sendOrderConfirmation = async (order: StripeSession) => {
    if (!order.customer_email) {
      toast.error("This order does not have a customer email.");
      return;
    }

    setSendingConfirmationId(order.session_id);
    const { data, error } = await supabase.functions.invoke("send-order-confirmation", {
      body: { sessionId: order.session_id },
    });
    setSendingConfirmationId(null);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not send confirmation email");
      return;
    }

    toast.success(`Confirmation sent to ${data.recipientEmail || order.customer_email}.`);
    await loadPortalSnapshot();
  };

  const sendRequirementsReminder = async (order: StripeSession) => {
    if (!order.customer_email) {
      toast.error("This order does not have a customer email.");
      return;
    }

    setSendingReminderId(order.session_id);
    const { data, error } = await supabase.functions.invoke("send-requirements-reminder", {
      body: { sessionId: order.session_id },
    });
    setSendingReminderId(null);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not send requirements reminder");
      return;
    }

    toast.success(`Requirements reminder sent to ${data.recipientEmail || order.customer_email}.`);
    await loadPortalSnapshot();
  };

  const sendMailboxReply = async () => {
    if (!activeMail || !mailReply.trim()) return;
    const { data, error } = await supabase.functions.invoke("mailbox", {
      body: {
        action: "send",
        to: activeMail.fromEmail,
        subject: activeMail.subject,
        content: mailReply.trim(),
        threadId: activeMail.threadId,
        inReplyTo: activeMail.messageId,
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Could not send reply");
      return;
    }
    setMailReply("");
    toast.success("Email reply sent.");
  };

  const updateMailboxMessage = async (messageId: string, action: "markRead" | "archive") => {
    const { data, error } = await supabase.functions.invoke("mailbox", {
      body: { action, messageId },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Mailbox action failed");
      return;
    }
    if (action === "archive") {
      setMailboxMessages(current => current.filter(message => message.id !== messageId));
      setActiveMail(null);
      toast.success("Email archived.");
    } else {
      setMailboxMessages(current => current.map(message => message.id === messageId ? { ...message, unread: false } : message));
      if (activeMail?.id === messageId) setActiveMail({ ...activeMail, unread: false });
      toast.success("Email marked read.");
    }
  };

  // Conversations match if client_id matches OR any message in them matches
  const filteredConversations = useMemo(() => {
    if (!chatsQ) return conversations;
    const matchingConvIds = new Set(
      allMessages.filter(m => matchesQuery(chatsQ, m.content) || matchesQuery(chatsQ, m.role)).map(m => m.conversation_id)
    );
    return conversations.filter(c => matchesQuery(chatsQ, c.client_id) || matchingConvIds.has(c.id));
  }, [conversations, allMessages, chatsQ]);

  const renderEventContactSuggestionList = (openUp = false) => (
    <div
      className={`absolute left-0 right-0 z-50 h-72 overflow-y-auto rounded-none border border-border bg-popover shadow-xl ${openUp ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"}`}
      onScroll={(e) => loadMoreEventContactSuggestions(e.currentTarget)}
    >
      {visibleEventContactSuggestions.length > 0 ? visibleEventContactSuggestions.map(contact => (
        <button
          key={contact.id}
          type="button"
          className="flex min-h-12 w-full flex-col items-start justify-center border-b border-border px-3 py-2 text-left text-sm last:border-b-0"
          onClick={() => selectEventContact(contact)}
        >
          <span className="font-medium text-foreground">{contact.name}</span>
          <span className="text-xs text-muted-foreground">{[contact.email, contact.phone, contact.location, contact.industry].filter(Boolean).join(" · ") || "No extra details"}</span>
        </button>
      )) : (
        <div className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">No contacts found</div>
      )}
    </div>
  );

  const renderJobTitleSuggestionList = (openUp = false) => (
    <div className={`absolute left-0 right-0 z-50 max-h-56 overflow-y-auto rounded-none border border-border bg-popover shadow-xl ${openUp ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"}`}>
      {jobTitleSuggestions.length > 0 ? jobTitleSuggestions.map(title => (
        <button
          key={title}
          type="button"
          className="flex min-h-11 w-full items-center border-b border-border px-3 py-2 text-left text-sm last:border-b-0"
          onClick={() => {
            setContactForm(f => ({ ...f, notes: title }));
            setContactJobTitleSuggestionsOpen(false);
          }}
        >
          <span className="truncate font-medium text-foreground">{title}</span>
        </button>
      )) : (
        <div className="px-3 py-3 text-sm text-muted-foreground">No matching job titles</div>
      )}
    </div>
  );

  const contactFormCard = showContactForm && (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))} />
        <Input placeholder="Phone number" value={contactForm.phone} onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))} />
        <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))} />
        <Input placeholder="Location" value={contactForm.location} onChange={(e) => setContactForm(f => ({ ...f, location: e.target.value }))} />
        <Input placeholder="Industry e.g. construction" value={contactForm.industry} onChange={(e) => setContactForm(f => ({ ...f, industry: e.target.value }))} />
        <div className="relative">
          <Input
            placeholder="Job title"
            value={contactForm.notes}
            onChange={(e) => {
              setContactForm(f => ({ ...f, notes: e.target.value }));
              setContactJobTitleSuggestionsOpen(Boolean(e.target.value.trim()));
            }}
            onFocus={() => setContactJobTitleSuggestionsOpen(Boolean(contactForm.notes.trim()))}
            onBlur={() => window.setTimeout(() => setContactJobTitleSuggestionsOpen(false), 120)}
          />
          {contactJobTitleSuggestionsOpen && renderJobTitleSuggestionList()}
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={createContact}>Save contact</Button>
          <Button variant="outline" className="rounded-none shadow-none" onClick={() => setShowContactForm(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );

  const eventFormCard = showSalesEventForm && (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <Input
            placeholder="Search contact"
            value={eventContactSearch}
            onChange={(e) => handleEventContactSearch(e.target.value)}
            onDoubleClick={() => setEventContactSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setEventContactSuggestionsOpen(false), 120)}
          />
          {eventContactSuggestionsOpen && renderEventContactSuggestionList()}
        </div>
        <Input placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} />
        <Input className="md:col-span-2" placeholder="Event description" value={eventForm.description} onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} />
        <div>
          <label className="text-xs text-muted-foreground">Optional callback date</label>
          <Input type="datetime-local" value={eventForm.callback_at} onChange={(e) => setEventForm(f => ({ ...f, callback_at: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Quick callback</label>
          <select defaultValue="" onChange={(e) => applyCallbackPreset(e.target.value)} className="h-10 w-full rounded-none border border-input bg-background px-3 text-sm">
            <option value="">Pick time</option>
            {callbackPresets.map(preset => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={createContactEvent}>Save event</Button>
          <Button variant="outline" className="rounded-none shadow-none" onClick={() => setShowSalesEventForm(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!authChecked) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-4 text-center">
        <p className="text-muted-foreground">Portal access check failed: {authError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Reload portal</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-muted-foreground">Enter the access code to use the portal.</p>
        <Button variant="outline" onClick={exitPortal}>
          Back to access code
        </Button>
      </div>
    );
  }

  const currentContactField = contactWizardFields[mobileContactStep];
  const currentSalesField = salesEventWizardFields[mobileSalesStep];
  const contactDetailDrawerContact = contactDetailDrawerId ? getContact(contactDetailDrawerId) : null;
  const contactDetailDrawerEvents = contactDetailDrawerContact ? contactEvents.filter(e => e.contact_id === contactDetailDrawerContact.id) : [];
  const contactDetailDrawerEmail = normalizeEmail(contactDetailDrawerContact?.email);
  const contactDetailDrawerPhoneDigits = normalizePhoneDigits(contactDetailDrawerContact?.phone);
  const contactDetailDrawerChatMessages = contactDetailDrawerContact ? allMessages.filter(message => {
    const content = message.content.toLowerCase();
    return Boolean(
      (contactDetailDrawerEmail && content.includes(contactDetailDrawerEmail)) ||
      (contactDetailDrawerPhoneDigits.length >= 6 && normalizePhoneDigits(message.content).includes(contactDetailDrawerPhoneDigits)) ||
      (contactDetailDrawerContact.name.length > 2 && content.includes(contactDetailDrawerContact.name.toLowerCase()))
    );
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 12) : [];
  const contactDetailDrawerOrderStats = contactDetailDrawerEmail ? contactOrderStatsByEmail.get(contactDetailDrawerEmail) : null;
  const contactDetailDrawerPhoneHref = formatPhoneHref(contactDetailDrawerContact?.phone);
  const contactDetailDrawerStatusColor = contactDetailDrawerContact ? getContactStatusColor(contactDetailDrawerOrderStats ? "gold" : contactDetailDrawerContact.status) : "hsl(var(--card))";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground p-4 pb-28 md:p-6 md:pb-28 lg:pb-6">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold">Pixcellor Dev Portal</h1>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="pricing" size="sm" onClick={() => setDevChatOpen(true)}>
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            <Button variant="outline" size="sm" onClick={exitPortal}>
              Lock portal
            </Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-5 xl:grid-cols-10">
            <TabsTrigger value="sales" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><TrendingUp className="h-3.5 w-3.5 shrink-0" />Sales ({callbacks.length})</TabsTrigger>
            <TabsTrigger value="orders" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><ShoppingBag className="h-3.5 w-3.5 shrink-0" />Live ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="retainers" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Repeat className="h-3.5 w-3.5 shrink-0" />Retainers ({filteredRetainers.length})</TabsTrigger>
            <TabsTrigger value="completed" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><PackageCheck className="h-3.5 w-3.5 shrink-0" />Completed ({completedOrders.length})</TabsTrigger>
            <TabsTrigger value="falloffs" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><UserSearch className="h-3.5 w-3.5 shrink-0" />Falloffs ({filteredFalloffs.length})</TabsTrigger>
            <TabsTrigger value="mailbox" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Inbox className="h-3.5 w-3.5 shrink-0" />Inbox ({mailboxMessages.length})</TabsTrigger>
            <TabsTrigger value="chats" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><MessageSquare className="h-3.5 w-3.5 shrink-0" />Chats ({filteredConversations.length})</TabsTrigger>
            <TabsTrigger value="profiles" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Users className="h-3.5 w-3.5 shrink-0" />Clients ({filteredProfiles.length})</TabsTrigger>
            <TabsTrigger value="inquiries" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Mail className="h-3.5 w-3.5 shrink-0" />Enquiries ({filteredInquiries.length})</TabsTrigger>
            <TabsTrigger value="contacts" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><UserPlus className="h-3.5 w-3.5 shrink-0" />Contacts ({filteredContacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sales follow-ups</h2>
                <p className="text-sm text-muted-foreground">Log contact events and keep future callbacks visible.</p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Search sales callbacks by contact, title, notes, phone, email…"
                className="pl-9"
              />
              {!contactsQ && filteredContacts.length > 10 && (
                <p className="mt-1 text-xs text-muted-foreground">Showing 10 most recent contacts. Search to find older contacts.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-start gap-2">
              <Button onClick={() => setShowSalesEventForm(v => !v)} disabled={contacts.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Create event
              </Button>
              <Button onClick={() => setShowContactForm(v => !v)}>
                <UserPlus className="w-4 h-4 mr-2" /> Create contact
              </Button>
            </div>

            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Add a contact first, then you can create sales events.</p>}

            {contactFormCard}
            {eventFormCard}

            <div className="space-y-2">
              <h3 className="font-medium">Callbacks waiting</h3>
              {salesCallbacks.length === 0 && <p className="text-sm text-muted-foreground">No callbacks waiting{salesQ ? " match your search" : ""}.</p>}
              {salesCallbacks.map(e => {
                const contact = getContact(e.contact_id);
                const isOverdue = new Date(e.callback_at!).getTime() <= nowMs;
                const statusColor = contact ? getContactStatusColor(contact.status) : "hsl(var(--muted))";
                const phoneHref = formatPhoneHref(contact?.phone);
                return (
                  <Card
                    key={e.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer overflow-hidden transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => contact && openContactDrawer(contact.id)}
                    onKeyDown={(event) => {
                      if (!contact || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      openContactDrawer(contact.id);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${statusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--card)) 34%, hsl(var(--card)) 100%)`,
                    }}
                  >
                    <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{contact?.name ?? "Unknown contact"} · {new Date(e.callback_at!).toLocaleString()} · {getEventAuthorLabel(e)}</div>
                        {contact?.phone && (phoneHref ? (
                          <a href={phoneHref} className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline" aria-label={`Call ${contact.phone}`} onClick={(event) => event.stopPropagation()}>
                            {contact.phone}
                          </a>
                        ) : (
                          <div className="text-xs text-muted-foreground">{contact.phone}</div>
                        ))}
                        {e.description && <LinkifiedText text={e.description} className="block text-sm whitespace-pre-wrap" stopPropagation />}
                      </div>
                      <div className="flex flex-row flex-wrap items-center justify-end gap-2">
                        <Badge className="pricing-button h-8 rounded-none px-3 py-0 text-xs font-medium text-foreground shadow-none" variant={isOverdue ? "destructive" : "secondary"}>{formatCountdown(e.callback_at!, nowMs)}</Badge>
                        <Button variant="pricing" size="sm" className="h-8 rounded-none px-3 text-xs shadow-none" onClick={(event) => { event.stopPropagation(); void completeCallback(e.id); }}>Done</Button>
                        <Button variant="pricing" size="sm" className="h-8 rounded-none px-3 text-xs shadow-none" onClick={(event) => { event.stopPropagation(); void tryCallbackAgain(e.id); }}>Tried</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={ordersSearch} onChange={(e) => setOrdersSearch(e.target.value)} placeholder="Search orders by email, order ID, status, domain…" className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-card/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Requirements</span>
                <Button variant={orderReqsFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("all")}>All</Button>
                <Button variant={orderReqsFilter === "submitted" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("submitted")}>Reqs submitted</Button>
                <Button variant={orderReqsFilter === "edits" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("edits")}>Edits</Button>
                <Button variant={orderReqsFilter === "waiting" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("waiting")}>Waiting</Button>
              </div>
            </div>
            {filteredOrders.length === 0 && <p className="text-muted-foreground text-sm">No live orders {ordersQ ? "match your search" : "yet"}.</p>}
            {filteredOrders.map(o => {
              const requirements = requirementsBySession.get(o.session_id);
              const emailStatus = orderEmailStatusBySession.get(o.session_id);
              const canSendReminder = Boolean(o.customer_email && !requirements && emailStatus?.confirmationSent);
              return (
              <Card key={o.session_id}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{o.customer_email ?? "Guest checkout"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.mode}</div>
                      {o.delivered_at && <div className="text-xs text-muted-foreground">Delivered {new Date(o.delivered_at).toLocaleString()}</div>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>
                        {o.payment_status ?? "pending"}
                      </Badge>
                      <Badge variant={o.order_status === "delivered" ? "default" : "outline"}>
                        {o.order_status === "delivered" ? "Delivered" : "Live"}
                      </Badge>
                      <Badge variant={requirements ? "default" : "outline"}>
                        {requirements ? "Requirements received" : "Needs requirements"}
                      </Badge>
                      {emailStatus?.reminderSent && <Badge variant="secondary">Reminder sent</Badge>}
                      <div className="text-lg font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendOrderConfirmation(o)}
                        disabled={!o.customer_email || sendingConfirmationId === o.session_id}
                      >
                        {sendingConfirmationId === o.session_id ? "Sending…" : "Send confirmation"}
                      </Button>
                      {canSendReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendRequirementsReminder(o)}
                          disabled={sendingReminderId === o.session_id}
                        >
                          {sendingReminderId === o.session_id ? "Sending…" : "Send reminder"}
                        </Button>
                      )}
                      {o.order_status !== "delivered" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markOrderDelivered(o)}
                          disabled={deliveringOrderId === o.session_id}
                        >
                          {deliveringOrderId === o.session_id ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Processing…
                            </span>
                          ) : "Mark delivered"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {editRequestsBySession.has(o.session_id) && (
                    <div className="rounded-none border border-border bg-background/50 p-4 text-sm">
                      <div className="mb-3 font-medium">Edit requests</div>
                      <div className="space-y-3">
                        {editRequestsBySession.get(o.session_id)!.map((request) => (
                          <div key={request.id} className="rounded-none border border-border/70 p-3">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">Request #{request.request_number}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={request.status === "done" ? "default" : request.status === "in_progress" ? "secondary" : "outline"}>{request.status.replace("_", " ")}</Badge>
                                <Button variant="outline" size="sm" onClick={() => updateEditRequestStatus(request.id, "in_progress")} disabled={request.status === "in_progress"}>In progress</Button>
                                <Button variant="outline" size="sm" onClick={() => updateEditRequestStatus(request.id, "done")} disabled={request.status === "done"}>Done</Button>
                              </div>
                            </div>
                            <p className="whitespace-pre-wrap text-muted-foreground">{request.request_details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {requirements && (
                    <div className="rounded-none border border-border bg-background/50 p-4 text-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">{requirements.site_name}</div>
                        <div className="text-xs text-muted-foreground">Updated {new Date(requirements.updated_at).toLocaleString()}</div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><span className="text-muted-foreground">Contents:</span> {requirements.site_contents}</div>
                        <div><span className="text-muted-foreground">Pages:</span> {requirements.pages_details}</div>
                        <div><span className="text-muted-foreground">Colours/styles:</span> {requirements.colours_styles}</div>
                        {requirements.reference_links && <div><span className="text-muted-foreground">References:</span> {requirements.reference_links}</div>}
                        <div className="md:col-span-2"><span className="text-muted-foreground">Images/content/socials:</span> {requirements.images_content_socials}</div>
                        {requirements.extra_notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> <LinkifiedText text={requirements.extra_notes} /></div>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </TabsContent>

          <TabsContent value="retainers" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={retainersSearch} onChange={(e) => setRetainersSearch(e.target.value)} placeholder="Search monthly retainer clients by email, order ID, status…" className="pl-9" />
            </div>
            {filteredRetainers.length === 0 && <p className="text-muted-foreground text-sm">No monthly retainer clients {retainersQ ? "match your search" : "yet"}.</p>}
            {filteredRetainers.map(o => (
              <Card key={o.session_id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{o.customer_email ?? "Guest checkout"}</div>
                      <div className="text-xs text-muted-foreground">Started {new Date(o.created_at).toLocaleString()} · Monthly retainer</div>
                      {o.subscription_id && <div className="break-all text-xs text-muted-foreground">Subscription {o.subscription_id}</div>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>{o.payment_status ?? "pending"}</Badge>
                      <Badge variant="outline">{getOrderMetadataText(o, "billing") || "Monthly subscription"}</Badge>
                      <div className="text-lg font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={completedSearch} onChange={(e) => setCompletedSearch(e.target.value)} placeholder="Search completed orders by email, order ID, status, domain…" className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-none border border-border bg-card/50 p-3">
              <span className="text-xs font-medium text-muted-foreground">Requirements</span>
              <Button variant={orderReqsFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("all")}>All</Button>
              <Button variant={orderReqsFilter === "submitted" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("submitted")}>Reqs submitted</Button>
              <Button variant={orderReqsFilter === "waiting" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("waiting")}>Waiting</Button>
            </div>
            {completedOrders.length === 0 && <p className="text-muted-foreground text-sm">No completed orders {completedQ ? "match your search" : "yet"}.</p>}
            {completedOrders.map(o => {
              const requirements = requirementsBySession.get(o.session_id);
              const emailStatus = orderEmailStatusBySession.get(o.session_id);
              return (
                <Card key={o.session_id}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{o.customer_email ?? "Guest checkout"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.mode}</div>
                        {o.delivered_at && <div className="text-xs text-muted-foreground">Delivered {new Date(o.delivered_at).toLocaleString()}{o.delivered_domain ? ` · ${o.delivered_domain}` : ""}</div>}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Badge variant="default">Delivered</Badge>
                        {emailStatus?.completionSent && <Badge variant="secondary">Completion sent</Badge>}
                        <Badge variant={requirements ? "default" : "outline"}>{requirements ? "Requirements received" : "Needs requirements"}</Badge>
                        {emailStatus?.reminderSent && <Badge variant="secondary">Reminder sent</Badge>}
                        <div className="text-lg font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                        <Button variant="outline" size="sm" onClick={() => markOrderUndelivered(o.session_id)}>
                          Mark undelivered
                        </Button>
                      </div>
                    </div>

                    {requirements && (
                      <div className="rounded-none border border-border bg-background/50 p-4 text-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium">{requirements.site_name}</div>
                          <div className="text-xs text-muted-foreground">Updated {new Date(requirements.updated_at).toLocaleString()}</div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><span className="text-muted-foreground">Contents:</span> {requirements.site_contents}</div>
                          <div><span className="text-muted-foreground">Pages:</span> {requirements.pages_details}</div>
                          <div><span className="text-muted-foreground">Colours/styles:</span> {requirements.colours_styles}</div>
                          {requirements.reference_links && <div><span className="text-muted-foreground">References:</span> {requirements.reference_links}</div>}
                          <div className="md:col-span-2"><span className="text-muted-foreground">Images/content/socials:</span> {requirements.images_content_socials}</div>
                          {requirements.extra_notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> <LinkifiedText text={requirements.extra_notes} /></div>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="falloffs" className="min-w-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={falloffsSearch} onChange={(e) => setFalloffsSearch(e.target.value)} placeholder="Search falloffs by company, email, IP, location, session…" className="pl-9" />
            </div>
            {filteredFalloffs.length === 0 && <p className="text-muted-foreground text-sm">No falloffs {falloffsQ ? "match your search" : "yet"}.</p>}
            {filteredFalloffs.map(f => (
               <Card key={f.id} className="min-w-0 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="break-words font-medium">{f.company_name ?? f.customer_email ?? f.package_name ?? "Anonymous visitor"}</div>
                      <div className="text-xs text-muted-foreground">{[f.company_domain, f.company_type, f.ip_city, f.ip_region, f.ip_country].filter(Boolean).join(" · ") || "Company/location unknown"}</div>
                      <div className="break-words text-xs text-muted-foreground">Last seen {new Date(f.last_seen_at).toLocaleString()} · {f.timezone ?? f.ip_timezone ?? "timezone unknown"}</div>
                      <div className="break-all text-xs text-muted-foreground">Visitor {f.visitor_id} · Session {f.session_id}</div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 md:justify-end">
                      {f.checkout_session_id && <Badge variant="secondary">Checkout opened</Badge>}
                      {f.buy_clicked_at && <Badge variant="secondary">Buy clicked</Badge>}
                      {f.pricing_opened_at && <Badge variant="outline">Pricing opened</Badge>}
                      {f.portfolio_opened_at && <Badge variant="outline">Portfolio read</Badge>}
                      {f.package_name && <Badge variant="outline">{f.package_name}</Badge>}
                      {f.enrichment_status && <Badge variant={f.enrichment_status === "enriched" ? "secondary" : "outline"}>{f.enrichment_status}</Badge>}
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-3">
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">Company</div>
                      <div className="text-muted-foreground">Name: {f.company_name ?? "—"}</div>
                      <div className="text-muted-foreground break-all">Domain: {f.company_domain ?? "—"}</div>
                      <div className="text-muted-foreground">Type: {f.company_type ?? "—"}</div>
                    </div>
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">Location</div>
                      <div className="text-muted-foreground">{[f.ip_city, f.ip_region, f.ip_country].filter(Boolean).join(", ") || "—"}</div>
                      <div className="text-muted-foreground">Postal: {f.ip_postal ?? "—"}</div>
                      <div className="text-muted-foreground break-all">Coordinates: {f.ip_location ?? "—"}</div>
                    </div>
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">Network</div>
                      <div className="text-muted-foreground">ASN: {f.asn ?? "—"}</div>
                      <div className="text-muted-foreground">Name: {f.as_name ?? "—"}</div>
                      <div className="text-muted-foreground break-all">Domain: {f.as_domain ?? "—"}</div>
                      <div className="text-muted-foreground break-all">Route: {f.as_route ?? "—"}</div>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs md:grid-cols-3">
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">IP details</div>
                      <div className="text-muted-foreground break-all">IP: {f.ip_address ?? "—"}</div>
                      <div className="text-muted-foreground break-all">Host: {f.ip_hostname ?? "—"}</div>
                      <div className="text-muted-foreground">IP timezone: {f.ip_timezone ?? "—"}</div>
                    </div>
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">Carrier</div>
                      <div className="text-muted-foreground">Name: {f.carrier_name ?? "—"}</div>
                      <div className="text-muted-foreground">MCC: {f.carrier_mcc ?? "—"}</div>
                      <div className="text-muted-foreground">MNC: {f.carrier_mnc ?? "—"}</div>
                    </div>
                    <div className="rounded-none border border-border p-2">
                      <div className="font-medium">Privacy flags</div>
                      <div className="text-muted-foreground">{[
                        f.privacy_vpn ? "VPN" : null,
                        f.privacy_proxy ? "Proxy" : null,
                        f.privacy_tor ? "Tor" : null,
                        f.privacy_relay ? "Relay" : null,
                        f.privacy_hosting ? "Hosting" : null,
                      ].filter(Boolean).join(" · ") || "None detected"}</div>
                      <div className="text-muted-foreground">Source: {f.enrichment_source ?? "—"}</div>
                      <div className="text-muted-foreground">{f.enriched_at ? `Enriched ${new Date(f.enriched_at).toLocaleString()}` : f.enrichment_error ?? "Pending enrichment"}</div>
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>Scroll depth: {f.max_scroll_percent ?? 0}%</div>
                    <div>Portfolio pages: {f.portfolio_pages_viewed ?? 0}</div>
                    <div>Pricing opened: {f.pricing_opened_at ? new Date(f.pricing_opened_at).toLocaleString() : "—"}</div>
                    <div>Buy clicked: {f.buy_clicked_at ? new Date(f.buy_clicked_at).toLocaleString() : "—"}</div>
                    <div className="md:col-span-2">Portfolio project: {f.portfolio_project_opened ?? "—"}</div>
                    <div>Page: {f.last_page ?? f.first_page ?? "—"}</div>
                    <div>Referrer: {f.referrer ?? "Direct"}</div>
                    <div>Device: {f.viewport_size ?? "—"} viewport · {f.screen_size ?? "—"} screen</div>
                    <div>Language: {f.browser_language ?? "—"}</div>
                    <div className="md:col-span-2 break-all">User agent: {f.user_agent ?? "—"}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mailbox" className="grid min-w-0 grid-cols-1 gap-4 items-start lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-3 md:max-h-[70vh] md:overflow-hidden md:flex md:flex-col md:min-h-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={mailboxSearch} onChange={(e) => setMailboxSearch(e.target.value)} placeholder="Search inbox" className="pl-9" />
                </div>
                <Button variant="outline" onClick={loadMailbox} disabled={mailboxLoading}>{mailboxLoading ? "…" : "Load"}</Button>
              </div>
              {mailboxMessages.length === 0 && <p className="text-sm text-muted-foreground">Load the connected mailbox to see Pixcellor user replies only.</p>}
              <div className="space-y-2 max-h-[70vh] md:max-h-none md:flex-1 md:min-h-0 overflow-y-auto pr-1">
                {mailboxMessages.map(message => {
                  const relatedOrder = orders.find(order => order.customer_email?.toLowerCase() === message.fromEmail);
                  return (
                    <button key={message.id} onClick={() => setActiveMail(message)} className={`w-full text-left p-3 rounded-none border transition-colors ${activeMail?.id === message.id ? "bg-accent border-accent" : "border-border hover:bg-accent/30"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{message.from}</div>
                        {message.unread && <Badge>New</Badge>}
                      </div>
                      <div className="text-sm truncate">{message.subject}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{message.snippet}</div>
                      {relatedOrder && <div className="text-xs text-muted-foreground mt-1">Linked order · {relatedOrder.amount_total != null ? formatGBP(relatedOrder.amount_total) : "—"}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
            <Card className="md:h-[70vh] md:max-h-[70vh] min-w-0 overflow-hidden flex flex-col">
              <CardContent className="p-4 space-y-4 min-h-0 flex-1 flex flex-col overflow-hidden">
                {!activeMail ? (
                  <div className="min-h-[360px] flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                    <Mail className="w-8 h-8" />
                    <p>Select an email to read and reply.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
                      <div>
                        <h2 className="text-lg font-semibold">{activeMail.subject}</h2>
                        <p className="text-sm text-muted-foreground">{activeMail.from} · {activeMail.date ? new Date(activeMail.date).toLocaleString() : ""}</p>
                      </div>
                      <div className="flex gap-2">
                        {activeMail.unread && <Button variant="outline" size="sm" onClick={() => updateMailboxMessage(activeMail.id, "markRead")}>Mark read</Button>}
                        <Button variant="outline" size="sm" onClick={() => updateMailboxMessage(activeMail.id, "archive")}><Archive className="w-4 h-4 mr-2" />Archive</Button>
                      </div>
                    </div>
                    {orders.find(order => order.customer_email?.toLowerCase() === activeMail.fromEmail) && (
                      <div className="rounded-none border border-border p-3 text-sm text-muted-foreground shrink-0">
                        Related order: {orders.find(order => order.customer_email?.toLowerCase() === activeMail.fromEmail)?.amount_total != null ? formatGBP(orders.find(order => order.customer_email?.toLowerCase() === activeMail.fromEmail)!.amount_total!) : "—"}
                      </div>
                    )}
                    <LinkifiedText text={activeMail.body || activeMail.snippet} className="block rounded-none bg-muted/30 p-3 whitespace-pre-wrap text-sm flex-1 min-h-[180px] overflow-y-auto" />
                    <textarea value={mailReply} onChange={(e) => setMailReply(e.target.value)} placeholder="Reply to the client…" className="min-h-[120px] max-h-[160px] w-full shrink-0 rounded-none border border-input bg-background px-3 py-2 text-sm" />
                    <Button className="shrink-0 self-start" onClick={sendMailboxReply} disabled={!mailReply.trim()}>Send reply</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats" className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={chatsSearch} onChange={(e) => setChatsSearch(e.target.value)} placeholder="Search chats by client, message, role…" className="pl-9" />
              </div>
              {filteredConversations.length === 0 && <p className="text-muted-foreground text-sm">No conversations {chatsQ ? "match your search" : "yet"}.</p>}
              {filteredConversations.map(c => {
                const last = lastMessages[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c.id)}
                    className={`w-full text-left p-3 rounded-none border transition-colors ${activeConv === c.id ? "bg-accent border-accent" : "border-border hover:bg-accent/30"}`}
                  >
                    <div className="text-xs font-mono truncate text-muted-foreground">{c.client_id}</div>
                    {last ? (
                      <div className="text-sm mt-1 line-clamp-2">
                        <span className="text-muted-foreground">{last.role === "user" ? "👤" : "🤖"} </span>
                        <LinkifiedText text={last.content} />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic mt-1">No messages</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.updated_at).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
            <Card className="min-w-0 max-h-[70vh] overflow-hidden flex flex-col">
              <CardContent className="p-4 overflow-y-auto space-y-3 flex-1">
                {!activeConv && <p className="text-muted-foreground text-sm">Pick a conversation to view messages.</p>}
                {activeConv && messages.length === 0 && <p className="text-muted-foreground text-sm">No messages.</p>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-none p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : m.role === "admin" ? "bg-accent text-accent-foreground border border-border" : "bg-muted text-foreground"}`}>
                      <div className="text-xs opacity-60 mb-1">{m.role} · {new Date(m.created_at).toLocaleTimeString()}</div>
                      <LinkifiedText text={m.content} />
                    </div>
                  </div>
                ))}
              </CardContent>
              {activeConv && (
                <div className="border-t border-border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {conversations.find(c => c.id === activeConv)?.bot_paused ? (
                      <Badge variant="secondary">Manual mode</Badge>
                    ) : (
                      <Badge variant="outline">Bot active</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={closeChatCase}>Case closed</Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={manualReply}
                      onChange={(e) => setManualReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendManualReply();
                      }}
                      placeholder="Type a manual reply…"
                    />
                    <Button onClick={sendManualReply}>Send</Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="profiles" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={profilesSearch} onChange={(e) => setProfilesSearch(e.target.value)} placeholder="Search clients by email, name, company, notes…" className="pl-9" />
            </div>
            {filteredProfiles.length === 0 && <p className="text-muted-foreground text-sm">No client profiles {profilesQ ? "match your search" : "yet"}.</p>}
            {filteredProfiles.map(p => (
              <Card key={p.email}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between">
                    <div className="font-medium">{p.name || p.email}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.email}{p.company ? ` · ${p.company}` : ""}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm pt-2">
                    {p.brand_colours && <div><span className="text-muted-foreground">Colours:</span> {p.brand_colours}</div>}
                    {p.page_count != null && <div><span className="text-muted-foreground">Pages:</span> {p.page_count}</div>}
                    {p.requirements && <div className="md:col-span-2"><span className="text-muted-foreground">Requirements:</span> <LinkifiedText text={p.requirements} /></div>}
                    {p.content_notes && <div className="md:col-span-2"><span className="text-muted-foreground">Content:</span> <LinkifiedText text={p.content_notes} /></div>}
                    {p.notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> <LinkifiedText text={p.notes} /></div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="inquiries" className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={inquiriesSearch} onChange={(e) => setInquiriesSearch(e.target.value)} placeholder="Search enquiries by name, email, message…" className="pl-9" />
            </div>
            {filteredInquiries.length === 0 && <p className="text-muted-foreground text-sm">No inquiries {inquiriesQ ? "match your search" : "yet"}.</p>}
            {filteredInquiries.map(i => (
              <Card key={i.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between">
                    <div className="font-medium">{i.name} · <span className="text-muted-foreground">{i.email}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                  </div>
                  <LinkifiedText text={i.message} className="block text-sm whitespace-pre-wrap" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Contact book</h2>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={contactsSearch}
                onChange={(e) => setContactsSearch(e.target.value)}
                placeholder="Search contacts by name, email, phone, location, notes, history…"
                className="pl-9"
              />
            </div>

            <div className="flex justify-start">
              <Button onClick={() => setShowContactForm(v => !v)}><Plus className="w-4 h-4 mr-2" /> Add contact</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI lead finder</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
                <Input placeholder="Trade e.g. electricians" value={leadAgentForm.trade} onChange={(e) => setLeadAgentForm(f => ({ ...f, trade: e.target.value }))} />
                <Input placeholder="Location e.g. Bristol" value={leadAgentForm.location} onChange={(e) => setLeadAgentForm(f => ({ ...f, location: e.target.value }))} />
                <Input type="number" min={1} max={25} value={leadAgentForm.limit} onChange={(e) => setLeadAgentForm(f => ({ ...f, limit: e.target.value }))} />
                <Button onClick={runLeadAgent} disabled={leadAgentLoading} className="gap-2">
                  {leadAgentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSearch className="h-4 w-4" />}
                  Find leads
                </Button>
                {leadAgentSummary && <p className="text-sm text-muted-foreground md:col-span-4">{leadAgentSummary}</p>}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={contactsStatusFilter === "all" ? "default" : "outline"} size="sm" className="rounded-none shadow-none" onClick={() => setContactsStatusFilter("all")}>All</Button>
              {contactStatuses.map(status => (
                <Button
                  key={status.value}
                  variant={contactsStatusFilter === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContactsStatusFilter(status.value)}
                  className="gap-2 rounded-none shadow-none"
                >
                  <span className="h-2.5 w-2.5 rounded-none" style={{ backgroundColor: status.color }} />
                  {status.label}
                </Button>
              ))}
              <Button variant={contactsStatusFilter === "archived" ? "default" : "outline"} size="sm" className="gap-2 rounded-none shadow-none" onClick={() => setContactsStatusFilter("archived")}>
                <Trash2 className="h-4 w-4" />
                Bin
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button variant={contactsSortOrder === "newest" ? "default" : "outline"} size="sm" className="rounded-none shadow-none" onClick={() => setContactsSortOrder("newest")}>Newest</Button>
                <Button variant={contactsSortOrder === "oldest" ? "default" : "outline"} size="sm" className="rounded-none shadow-none" onClick={() => setContactsSortOrder("oldest")}>Earliest</Button>
              </div>
            </div>

            {contactFormCard}

            {eventFormCard}

            {searchedContacts.length === 0 && <p className="text-muted-foreground text-sm">No contacts {contactsQ ? "match your search" : "yet"}.</p>}
            {searchedContacts.map(c => {
              const events = filteredContactEvents.filter(e => e.contact_id === c.id);
              const contactEmail = normalizeEmail(c.email);
              const orderStats = contactEmail ? contactOrderStatsByEmail.get(contactEmail) : null;
              const effectiveStatus = orderStats ? "gold" : c.status;
              const isOpen = openContactId === c.id;
              const statusColor = getContactStatusColor(effectiveStatus);
              const phoneHref = formatPhoneHref(c.phone);
              return (
                <Card
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer overflow-hidden transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => openContactDrawer(c.id)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    openContactDrawer(c.id);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${statusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--card)) 34%, hsl(var(--card)) 100%)`,
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-[180px] flex-1 text-left">
                        <div className="w-full text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            {orderStats && <Badge variant="secondary">Client</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{[c.email, c.location, c.industry].filter(Boolean).join(" · ") || (!c.phone ? "No details added" : "")}</div>
                          {orderStats && <div className="text-xs text-muted-foreground">LTV {formatGBP(orderStats.ltv)} · {orderStats.orders.length} order{orderStats.orders.length === 1 ? "" : "s"}</div>}
                        </div>
                        <div className="mt-1 space-y-1">
                          {c.phone && (phoneHref ? (
                            <a href={phoneHref} className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline" aria-label={`Call ${c.phone}`} onClick={(event) => event.stopPropagation()}>
                              {c.phone}
                            </a>
                          ) : (
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          ))}
                          {c.notes && <LinkifiedText text={c.notes} className="block text-xs text-muted-foreground" stopPropagation />}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-3 self-stretch sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:self-auto">
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                          <Button variant="pricing" size="sm" className="rounded-none shadow-none" onClick={(event) => { event.stopPropagation(); startEditingContact(c); }}>Edit</Button>
                          <Button variant="pricing" size="sm" className="rounded-none shadow-none" onClick={(event) => { event.stopPropagation(); openEventFormForContact(c.id); }}>Create event</Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="hidden items-center gap-1 md:flex" aria-label="Contact status">
                        {contactStatuses.map(status => (
                          <button
                            key={status.value}
                            type="button"
                            title={status.label}
                            aria-label={status.label}
                            onClick={(event) => { event.stopPropagation(); updateContactStatus(c.id, status.value); }}
                            className={`h-5 w-5 rounded-none border transition-opacity ${effectiveStatus === status.value ? "border-foreground opacity-100" : "border-border opacity-55"}`}
                            style={{ backgroundColor: status.color }}
                          />
                        ))}
                      </div>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setOpenContactId(isOpen ? null : c.id); }}>
                        <Badge variant="secondary" className="cursor-pointer">{events.length} logs</Badge>
                      </button>
                      <div className="flex items-center gap-1 md:hidden" aria-label="Contact status">
                        {contactStatuses.map(status => (
                          <button
                            key={status.value}
                            type="button"
                            title={status.label}
                            aria-label={status.label}
                            onClick={(event) => { event.stopPropagation(); updateContactStatus(c.id, status.value); }}
                            className={`h-5 w-5 rounded-none border transition-opacity ${effectiveStatus === status.value ? "border-foreground opacity-100" : "border-border opacity-55"}`}
                            style={{ backgroundColor: status.color }}
                          />
                        ))}
                      </div>
                    </div>
                    {editingContactId === c.id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-none border border-border p-3" onClick={(event) => event.stopPropagation()}>
                        <Input placeholder="Name" value={editContactForm.name} onChange={(e) => setEditContactForm(f => ({ ...f, name: e.target.value }))} />
                        <Input placeholder="Phone number" value={editContactForm.phone} onChange={(e) => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
                        <Input placeholder="Email" value={editContactForm.email} onChange={(e) => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
                        <Input placeholder="Location" value={editContactForm.location} onChange={(e) => setEditContactForm(f => ({ ...f, location: e.target.value }))} />
                        <Input placeholder="Industry e.g. construction" value={editContactForm.industry} onChange={(e) => setEditContactForm(f => ({ ...f, industry: e.target.value }))} />
                        <Input placeholder="Job title" value={editContactForm.notes} onChange={(e) => setEditContactForm(f => ({ ...f, notes: e.target.value }))} />
                        <div className="md:col-span-2 flex gap-2">
                          <Button onClick={(event) => { event.stopPropagation(); void updateContact(); }}>Save changes</Button>
                          <Button variant="outline" className="rounded-none shadow-none" onClick={(event) => { event.stopPropagation(); setEditingContactId(null); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {isOpen && <div className="border-t border-border pt-3 space-y-2">
                      {orderStats && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="font-medium">Order history</span>
                            <Badge variant="secondary">LTV {formatGBP(orderStats.ltv)}</Badge>
                          </div>
                          {orderStats.orders.map(order => {
                            const requirements = requirementsBySession.get(order.session_id);
                            return (
                              <div key={order.session_id} className="text-sm rounded-none p-3 bg-neutral-800/[0.17]">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">{order.amount_total != null ? formatGBP(order.amount_total) : "—"}</span>
                                  <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Badge variant={order.order_status === "delivered" ? "default" : "outline"}>{order.order_status === "delivered" ? "Delivered" : "Open"}</Badge>
                                  <Badge variant={requirements ? "default" : "outline"}>{requirements ? "Requirements received" : "Needs requirements"}</Badge>
                                  {order.delivered_domain && <Badge variant="secondary">{order.delivered_domain}</Badge>}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground break-all">Session {order.session_id}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {events.length === 0 && !orderStats && <p className="text-xs text-muted-foreground">No communications logged.</p>}
                      {events.map(e => (
                        <div key={e.id} className="text-sm rounded-none p-3 bg-neutral-800/[0.17]">
                          <div className="flex flex-wrap justify-between gap-2">
                            <span className="font-medium">{e.title}</span>
                            <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {getEventAuthorLabel(e)}</span>
                          </div>
                          {e.description && <LinkifiedText text={e.description} className="block whitespace-pre-wrap mt-1" stopPropagation />}
                          {e.callback_at && <div className="text-xs text-muted-foreground mt-1">Callback: {new Date(e.callback_at).toLocaleString()}</div>}
                        </div>
                      ))}
                    </div>}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Counters */}
        <div className="grid grid-cols-1 gap-4 pt-10 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Total sales</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{formatGBP(counters.totalSales)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Websites delivered (paid orders)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{counters.totalWebsites}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Potential sales (chatted, no buy)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-semibold">{counters.potential}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Website visits</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-2xl font-semibold">{counters.uniqueVisitors}</div>
                <div className="text-xs text-muted-foreground">Visitors</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{counters.totalVisitEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{counters.pricingViews}</div>
                <div className="text-xs text-muted-foreground">Pricing opens</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{counters.buyClicks}</div>
                <div className="text-xs text-muted-foreground">Buy clicks</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          {"\n"}
        </p>
      </div>

      <Drawer open={Boolean(contactDetailDrawerContact)} onOpenChange={(open) => !open && setContactDetailDrawerId(null)}>
        <DrawerContent
          className="max-h-[88dvh] border-border px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl"
          style={{
            background: `linear-gradient(135deg, ${contactDetailDrawerStatusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--background) / 0.96) 34%, hsl(var(--background) / 0.96) 100%)`,
          }}
        >
          <DrawerHeader className="mx-auto w-full max-w-3xl px-0 text-left">
            <DrawerTitle>{contactDetailDrawerContact?.name ?? "Contact"}</DrawerTitle>
            <DrawerDescription>
              {[contactDetailDrawerContact?.email, contactDetailDrawerContact?.location, contactDetailDrawerContact?.industry].filter(Boolean).join(" · ") || "Sales contact"}
              {contactDetailDrawerContact ? ` · ${getContactCreatorLabel(contactDetailDrawerContact)}` : ""}
            </DrawerDescription>
          </DrawerHeader>
          {contactDetailDrawerContact && (
            <div className="mx-auto w-full max-w-3xl space-y-4 overflow-y-auto pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-card/60 p-3">
                <div className="min-w-0 space-y-1">
                  {contactDetailDrawerContact.phone && (contactDetailDrawerPhoneHref ? (
                    <a href={contactDetailDrawerPhoneHref} className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" aria-label={`Call ${contactDetailDrawerContact.phone}`}>
                      {contactDetailDrawerContact.phone}
                    </a>
                  ) : (
                    <div className="text-sm text-muted-foreground">{contactDetailDrawerContact.phone}</div>
                  ))}
                  {contactDetailDrawerContact.industry && <Badge variant="outline" className="rounded-none capitalize">{contactDetailDrawerContact.industry}</Badge>}
                  {contactDetailDrawerContact.notes && <LinkifiedText text={contactDetailDrawerContact.notes} className="block text-sm text-muted-foreground" />}
                  <div className="text-xs text-muted-foreground">{getContactCreatorLabel(contactDetailDrawerContact)} · {new Date(contactDetailDrawerContact.created_at).toLocaleString()}</div>
                  {contactDetailDrawerOrderStats && <div className="text-xs text-muted-foreground">LTV {formatGBP(contactDetailDrawerOrderStats.ltv)} · {contactDetailDrawerOrderStats.orders.length} order{contactDetailDrawerOrderStats.orders.length === 1 ? "" : "s"}</div>}
                </div>
                <div className="flex w-full items-center justify-end gap-2 overflow-x-auto md:w-auto md:flex-wrap md:overflow-visible text-left">
                  <div className="mr-auto flex h-9 shrink-0 items-center gap-1 md:mr-0" aria-label="Contact status">
                    {contactStatuses.map(status => (
                      <button
                        key={status.value}
                        type="button"
                        title={status.label}
                        aria-label={status.label}
                        onClick={() => updateContactStatus(contactDetailDrawerContact.id, status.value)}
                        className={`h-9 w-7 rounded-none border transition-opacity ${(contactDetailDrawerOrderStats ? "gold" : contactDetailDrawerContact.status) === status.value ? "border-foreground opacity-100" : "border-border opacity-55"}`}
                        style={{ backgroundColor: status.color }}
                      />
                    ))}
                  </div>
                  <Button variant="pricing" size="sm" className="h-9 shrink-0 rounded-none shadow-none" onClick={() => startEditingContact(contactDetailDrawerContact)}>
                    Edit
                  </Button>
                  <Button variant="pricing" size="sm" className="h-9 w-9 shrink-0 rounded-none px-0 shadow-none md:w-auto md:px-3" aria-label="Create event" title="Create event" onClick={() => { openEventFormForContact(contactDetailDrawerContact.id); setContactDetailDrawerId(null); }}>
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Create event</span>
                  </Button>
                  <Button variant="pricing" size="icon" className="h-9 w-9 shrink-0 rounded-none shadow-none" aria-label="Archive contact" title="Archive contact" onClick={() => archiveContact(contactDetailDrawerContact.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingContactId === contactDetailDrawerContact.id && (
                <div className="grid grid-cols-1 gap-3 rounded-none border border-border p-3 md:grid-cols-2">
                  <Input placeholder="Name" value={editContactForm.name} onChange={(e) => setEditContactForm(f => ({ ...f, name: e.target.value }))} />
                  <Input placeholder="Phone number" value={editContactForm.phone} onChange={(e) => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input placeholder="Email" value={editContactForm.email} onChange={(e) => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
                  <Input placeholder="Location" value={editContactForm.location} onChange={(e) => setEditContactForm(f => ({ ...f, location: e.target.value }))} />
                  <Input placeholder="Industry e.g. construction" value={editContactForm.industry} onChange={(e) => setEditContactForm(f => ({ ...f, industry: e.target.value }))} />
                  <Input placeholder="Job title" value={editContactForm.notes} onChange={(e) => setEditContactForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="flex gap-2 md:col-span-2">
                    <Button onClick={updateContact}>Save changes</Button>
                    <Button variant="outline" className="rounded-none shadow-none" onClick={() => setEditingContactId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
              {contactDetailDrawerOrderStats && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Order history</div>
                  {contactDetailDrawerOrderStats.orders.map(order => {
                    const requirements = requirementsBySession.get(order.session_id);
                    return (
                      <div key={order.session_id} className="rounded-none border border-border bg-card/60 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{order.amount_total != null ? formatGBP(order.amount_total) : "—"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={order.order_status === "delivered" ? "default" : "outline"}>{order.order_status === "delivered" ? "Delivered" : "Open"}</Badge>
                          <Badge variant={requirements ? "default" : "outline"}>{requirements ? "Requirements received" : "Needs requirements"}</Badge>
                          {order.delivered_domain && <Badge variant="secondary">{order.delivered_domain}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm font-medium">Live chat messages</div>
                {contactDetailDrawerChatMessages.length === 0 && <p className="text-sm text-muted-foreground">No matching chat messages found.</p>}
                {contactDetailDrawerChatMessages.map(message => (
                  <div key={message.id} className="rounded-none border border-border bg-card/60 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium capitalize">{message.role}</span>
                      <span className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                    <LinkifiedText text={message.content} className="block mt-1 whitespace-pre-wrap text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Contact history</div>
                {contactDetailDrawerEvents.length === 0 && <p className="text-sm text-muted-foreground">No communications logged.</p>}
                {contactDetailDrawerEvents.map(e => (
                  <div key={e.id} className="rounded-none border border-border bg-card/60 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {getEventAuthorLabel(e)}</span>
                    </div>
                    {e.description && <LinkifiedText text={e.description} className="block mt-1 whitespace-pre-wrap" />}
                    {e.callback_at && <div className="mt-1 text-xs text-muted-foreground">Callback: {new Date(e.callback_at).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer open={mobileContactDrawerOpen} onOpenChange={setMobileContactDrawerOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl lg:hidden">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Create contact</DrawerTitle>
            <DrawerDescription>Step {mobileContactStep + 1} of {contactWizardFields.length}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-none bg-muted">
              <div className="h-full rounded-none bg-primary transition-all" style={{ width: `${((mobileContactStep + 1) / contactWizardFields.length) * 100}%` }} />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">{currentContactField.label}{currentContactField.required ? " *" : ""}</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    autoFocus
                    inputMode={currentContactField.inputMode}
                    placeholder={currentContactField.placeholder}
                    value={contactForm[currentContactField.key]}
                    onChange={(e) => {
                      setContactForm(f => ({ ...f, [currentContactField.key]: e.target.value }));
                      if (currentContactField.key === "notes") setContactJobTitleSuggestionsOpen(Boolean(e.target.value.trim()));
                    }}
                    onFocus={() => {
                      if (currentContactField.key === "notes") setContactJobTitleSuggestionsOpen(Boolean(contactForm.notes.trim()));
                    }}
                    onBlur={() => window.setTimeout(() => setContactJobTitleSuggestionsOpen(false), 120)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") continueMobileContact();
                    }}
                    className="h-12 text-base"
                  />
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteMobileContactField} aria-label={`Paste ${currentContactField.label}`}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {currentContactField.key === "notes" && contactJobTitleSuggestionsOpen && renderJobTitleSuggestionList()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none shadow-none" onClick={() => mobileContactStep > 0 ? setMobileContactStep(step => step - 1) : setMobileContactDrawerOpen(false)}>
                {mobileContactStep > 0 ? "Back" : "Cancel"}
              </Button>
              <Button onClick={() => continueMobileContact()}>{mobileContactStep === contactWizardFields.length - 1 ? "Save" : "Next"}</Button>
              {!currentContactField.required && (
                <Button variant="ghost" className="col-span-2" onClick={() => continueMobileContact(true)}>Skip</Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobileSalesDrawerOpen} onOpenChange={setMobileSalesDrawerOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl lg:hidden">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Create sales event</DrawerTitle>
            <DrawerDescription>Step {mobileSalesStep + 1} of {salesEventWizardFields.length}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-none bg-muted">
              <div className="h-full rounded-none bg-primary transition-all" style={{ width: `${((mobileSalesStep + 1) / salesEventWizardFields.length) * 100}%` }} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">{currentSalesField.label}{currentSalesField.required ? " *" : ""}</label>
              {currentSalesField.key === "contact" ? (
                <>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        autoFocus
                        placeholder={currentSalesField.placeholder}
                        value={eventContactSearch}
                        onChange={(e) => handleEventContactSearch(e.target.value)}
                        onDoubleClick={() => setEventContactSuggestionsOpen(true)}
                        onBlur={() => window.setTimeout(() => setEventContactSuggestionsOpen(false), 120)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") continueMobileSalesEvent();
                        }}
                        className="h-12 text-base"
                      />
                      {eventContactSuggestionsOpen && renderEventContactSuggestionList(true)}
                    </div>
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteMobileSalesField} aria-label={`Paste ${currentSalesField.label}`}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : currentSalesField.key === "callback_at" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input type="datetime-local" value={eventForm.callback_at} onChange={(e) => setEventForm(f => ({ ...f, callback_at: e.target.value }))} className="h-12 text-base" />
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteMobileSalesField} aria-label={`Paste ${currentSalesField.label}`}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {callbackPresets.map(preset => (
                      <Button key={preset.label} type="button" variant="outline" className="h-10 px-2 text-sm" onClick={() => applyCallbackPreset(preset.label)}>
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder={currentSalesField.placeholder}
                    value={currentSalesField.key === "title" ? eventForm.title : eventForm.description}
                    onChange={(e) => setEventForm(f => ({ ...f, [currentSalesField.key]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") continueMobileSalesEvent();
                    }}
                    className="h-12 text-base"
                  />
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteMobileSalesField} aria-label={`Paste ${currentSalesField.label}`}>
                    <Clipboard className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none shadow-none" onClick={() => mobileSalesStep > 0 ? setMobileSalesStep(step => step - 1) : setMobileSalesDrawerOpen(false)}>
                {mobileSalesStep > 0 ? "Back" : "Cancel"}
              </Button>
              <Button onClick={() => continueMobileSalesEvent()}>{mobileSalesStep === salesEventWizardFields.length - 1 ? "Save" : "Next"}</Button>
              {!currentSalesField.required && (
                <Button variant="ghost" className="col-span-2" onClick={() => continueMobileSalesEvent(true)}>Skip</Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobileOrdersDrawerOpen} onOpenChange={setMobileOrdersDrawerOpen}>
        <DrawerContent className="max-h-[85dvh] border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl lg:hidden">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Live orders</DrawerTitle>
            <DrawerDescription>{filteredOrders.length} open order{filteredOrders.length === 1 ? "" : "s"}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto pb-2">
            {filteredOrders.length === 0 && <p className="text-sm text-muted-foreground">No live orders.</p>}
            {filteredOrders.map(o => {
              const requirements = requirementsBySession.get(o.session_id);
              const emailStatus = orderEmailStatusBySession.get(o.session_id);
              const canSendReminder = Boolean(o.customer_email && !requirements && emailStatus?.confirmationSent);
              return (
                <div key={o.session_id} className="space-y-3 rounded-none border border-border bg-card/60 p-3">
                  <div className="space-y-1">
                    <div className="break-all text-sm font-medium">{o.customer_email ?? "Guest checkout"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="text-xl font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>{o.payment_status ?? "pending"}</Badge>
                    <Badge variant="outline">Live</Badge>
                    <Badge variant={requirements ? "default" : "outline"}>{requirements ? "Requirements received" : "Needs requirements"}</Badge>
                    {emailStatus?.reminderSent && <Badge variant="secondary">Reminder sent</Badge>}
                  </div>
                  <div className="grid gap-2">
                    <Button variant="outline" size="sm" onClick={() => sendOrderConfirmation(o)} disabled={!o.customer_email || sendingConfirmationId === o.session_id}>
                      {sendingConfirmationId === o.session_id ? "Sending…" : "Send confirmation"}
                    </Button>
                    {canSendReminder && (
                      <Button variant="outline" size="sm" onClick={() => sendRequirementsReminder(o)} disabled={sendingReminderId === o.session_id}>
                        {sendingReminderId === o.session_id ? "Sending…" : "Send reminder"}
                      </Button>
                    )}
                    {o.order_status !== "delivered" && (
                      <Button variant="outline" size="sm" onClick={() => markOrderDelivered(o)} disabled={deliveringOrderId === o.session_id}>
                        {deliveringOrderId === o.session_id ? "Processing…" : "Mark delivered"}
                      </Button>
                    )}
                  </div>
                  <div className="break-all text-[10px] text-muted-foreground">Session {o.session_id}</div>
                </div>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <ChatBot isOpen={devChatOpen} setIsOpen={setDevChatOpen} showToggle={false} mode="dev" onDevAction={loadPortalSnapshot} />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur lg:hidden" aria-label="Admin mobile shortcuts">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          <Button variant={activeTab === "sales" && !showSalesEventForm ? "default" : "ghost"} size="sm" onClick={openMobileHome} className="h-14 flex-col gap-1 px-1 text-[10px]">
            <Home className="h-4 w-4" />
            Home
          </Button>
          <Button variant={mobileSalesDrawerOpen || showSalesEventForm ? "default" : "ghost"} size="sm" onClick={openMobileSalesEvent} className="h-14 flex-col gap-1 px-1 text-[10px]" disabled={contacts.length === 0}>
            <Plus className="h-4 w-4" />
            Sales event
          </Button>
          <Button variant={mobileContactDrawerOpen || showContactForm ? "default" : "ghost"} size="sm" onClick={openMobileContactForm} className="h-14 flex-col gap-1 px-1 text-[10px]">
            <UserPlus className="h-4 w-4" />
            Contact
          </Button>
          <Button variant={mobileOrdersDrawerOpen || activeTab === "orders" ? "default" : "ghost"} size="sm" onClick={openMobileOrders} className="h-14 flex-col gap-1 px-1 text-[10px]">
            <ShoppingBag className="h-4 w-4" />
            Orders
          </Button>
        </div>
      </nav>
    </div>
  );
}
