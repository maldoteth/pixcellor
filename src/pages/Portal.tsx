import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Archive, BarChart3, Check, Clipboard, Copy, Download, ExternalLink, HelpCircle, Home, ImagePlus, Inbox, Link2, Loader2, Mail, MessageSquare, Megaphone, PackageCheck, Pencil, Plus, Repeat, RefreshCw, Search, ShoppingBag, Square, Volume2, Wand2, Trash2, TrendingUp, UserPlus, Users, UserSearch, X } from "lucide-react";
import { downloadImage } from "@/lib/download-image";

const SALES_SCRIPTS: { id: string; title: string; body: string }[] = [
  {
    id: "free-sample",
    title: "Free sample offer",
    body: `Hi, I'm calling with a free sample offer from pixcellor.com.\n\nAfter studying your branding, I've built you a custom sample website and design document I think you're going to love.\n\nWant to see?`,
  },
  {
    id: "cold-outreach",
    title: "Cold outreach",
    body: `Hi, I'm just calling about your website — I work for pixcellor.com.\n\nDo you like it?`,
  },
  {
    id: "leads-pitch",
    title: "Leads pitch",
    body: `Hi, would you be interested in a free sample offer that's designed to generate you more business and leads?`,
  },
];
import { toast } from "sonner";
import ChatBot from "@/components/ChatBot";
import BroadcastCampaigns from "@/components/BroadcastCampaigns";
import SmsBroadcasts from "@/components/SmsBroadcasts";
import { useDomainPrompt } from "@/components/DomainPromptDialog";
import NewOrderDialog from "@/components/portal/NewOrderDialog";
import VisionStudio from "@/components/portal/VisionStudio";
import { DuplicateContactsPanel } from "@/components/portal/DuplicateContactsPanel";
import FindLeadsButton from "@/components/portal/FindLeadsButton";
import { usePromptDialog, useConfirmDialog } from "@/components/ui/themed-dialogs";
import SeoHead from "@/components/SeoHead";

// Auto-load-on-scroll helper for paginated list containers.
// Triggers `onNearBottom` when the user scrolls within 200px of the bottom.
const makeNearBottomHandler = (onNearBottom: () => void) =>
  (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) onNearBottom();
  };

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
  return source === "pixcellor_site" || source === "admin_manual";
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
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  actual_website_url?: string | null;
  social_url?: string | null;
  website_status?: string | null;
  lead_score?: number | null;
  lead_score_reason?: string | null;
  notes: string | null;
  media?: string[] | null;
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

type ContactPerson = {
  id: string;
  contact_id: string;
  name: string;
  job_title: string | null;
  phone: string | null;
  email: string | null;
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

const copyToClipboard = async (text: string, label = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

const leadSearchMemoryKey = "pixcellor-lead-search-memory";
const readLeadSearchMemory = () => {
  if (typeof window === "undefined") return { trades: [] as string[], locations: [] as string[] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(leadSearchMemoryKey) ?? "{}");
    return {
      trades: Array.isArray(parsed.trades) ? parsed.trades.filter((item: unknown): item is string => typeof item === "string") : [],
      locations: Array.isArray(parsed.locations) ? parsed.locations.filter((item: unknown): item is string => typeof item === "string") : [],
    };
  } catch {
    return { trades: [] as string[], locations: [] as string[] };
  }
};

const rememberLeadSearchValue = (items: string[], value: string) => {
  const clean = value.trim();
  if (!clean) return items;
  return [clean, ...items.filter(item => item.toLowerCase() !== clean.toLowerCase())].slice(0, 30);
};

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

const getContactCreatorLabel = (contact: Contact) => contact.created_by_email ? `By ${contact.created_by_email}` : contact.source === "lead_agent" ? "By AI lead finder" : "By admin";

const contactStatuses = [
  { value: "cold", label: "Cold", color: "hsl(217 91% 60%)" },
  { value: "aware", label: "Aware", color: "hsl(142 71% 45%)" },
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
        className="underline underline-offset-2 text-primary-foreground"
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
  { key: "name", label: "Company name", placeholder: "Company name", required: true, inputMode: "text" },
  { key: "phone", label: "Number", placeholder: "Phone number", required: true, inputMode: "tel" },
  { key: "email", label: "Email", placeholder: "Email address", required: false, inputMode: "email" },
  { key: "location", label: "Location", placeholder: "Town or area", required: false, inputMode: "text" },
  { key: "industry", label: "Industry", placeholder: "Industry", required: false, inputMode: "text" },
  { key: "website", label: "Website", placeholder: "Website domain", required: false, inputMode: "url" },
  { key: "contact_name", label: "Contact name", placeholder: "Contact name", required: false, inputMode: "text" },
  { key: "job_title", label: "Job title", placeholder: "Job title", required: false, inputMode: "text" },
  { key: "note", label: "Note", placeholder: "Add a note (optional)", required: false, inputMode: "text" },
] as const;

const salesEventWizardFields = [
  { key: "contact", label: "Client", placeholder: "Search client", required: true, inputMode: "text" },
  { key: "title", label: "What happened?", placeholder: "Let's Talk, email, quote…", required: true, inputMode: "text" },
  { key: "callback_at", label: "Call Back?", placeholder: "Call Back?", required: false, inputMode: "text" },
] as const;

export default function Portal() {
  const navigate = useNavigate();
  const promptDialog = usePromptDialog();
  const confirmDialog = useConfirmDialog();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");

  const [orders, setOrders] = useState<StripeSession[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<Array<{ id: string; source: string; severity: string; title: string; message: string | null; context: any; resolved_at: string | null; created_at: string }>>([]);
  const [falloffs, setFalloffs] = useState<VisitorFalloff[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projectRequirements, setProjectRequirements] = useState<ProjectRequirement[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [sampleRequests, setSampleRequests] = useState<Array<{ id: string; name: string; email: string | null; phone: string | null; created_at: string; request_details: { dream?: string | null; colours?: string | null; brief?: string | null; requested_edits?: string | null; company?: string | null; kind?: string | null; origin?: string | null; vision_image_url?: string | null } | null; attachment_urls: string[] | null; delivered_at?: string | null; delivered_domain?: string | null; paid_at?: string | null; paid_session_id?: string | null; package_name?: string | null }>>([]);
  const [deliveringSampleId, setDeliveringSampleId] = useState<string | null>(null);
  const { promptDomain, dialog: domainPromptDialog } = useDomainPrompt();
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [personDrawerContactId, setPersonDrawerContactId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState({ name: "", job_title: "", phone: "" });
  const [personSubmitting, setPersonSubmitting] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [salesSearch, setSalesSearch] = useState("");
  const [ordersSearch, setOrdersSearch] = useState("");
  const [retainersSearch, setRetainersSearch] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [websitesSearch, setWebsitesSearch] = useState("");
  const [falloffsSearch, setFalloffsSearch] = useState("");
  const [chatsSearch, setChatsSearch] = useState("");
  const [profilesSearch, setProfilesSearch] = useState("");
  const [clientsVisibleCount, setClientsVisibleCount] = useState(10);
  const [callbacksVisibleCount, setCallbacksVisibleCount] = useState(10);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [clientsSort, setClientsSort] = useState<"newest" | "oldest" | "latest_update" | "hot" | "cold">("newest");
  const [clientsStatusFilter, setClientsStatusFilter] = useState<"all" | Contact["status"]>("all");
  const [clientsRetainerOnly, setClientsRetainerOnly] = useState(false);
  
  const [orderReqsFilter, setOrderReqsFilter] = useState<"all" | "submitted" | "edits" | "waiting" | "samples" | "custom">("all");
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [completedReqsFilter, setCompletedReqsFilter] = useState<"all" | "submitted" | "waiting">("all");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsStatusFilter, setContactsStatusFilter] = useState<"all" | Contact["status"]>("all");
  const [contactsSortOrder, setContactsSortOrder] = useState<"newest" | "oldest">("newest");
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [contactDetailDrawerId, setContactDetailDrawerId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSalesEventForm, setShowSalesEventForm] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [speakingScriptId, setSpeakingScriptId] = useState<string | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => { voicesRef.current = synth.getVoices(); };
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => {
      synth.cancel();
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const toggleSpeakScript = useCallback((id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Your browser doesn't support text-to-speech.");
      return;
    }
    const synth = window.speechSynthesis;
    if (speakingScriptId === id) {
      synth.cancel();
      setSpeakingScriptId(null);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const preferred =
      voices.find(v => /en-GB/i.test(v.lang) && /female|samantha|google uk|kate/i.test(v.name)) ||
      voices.find(v => /en-GB/i.test(v.lang)) ||
      voices.find(v => /en-US/i.test(v.lang)) ||
      voices.find(v => /^en[-_]/i.test(v.lang));
    if (preferred) utter.voice = preferred;
    utter.onend = () => setSpeakingScriptId(prev => (prev === id ? null : prev));
    utter.onerror = () => setSpeakingScriptId(prev => (prev === id ? null : prev));
    setSpeakingScriptId(id);
    synth.speak(utter);
  }, [speakingScriptId]);
  const [statsTotals, setStatsTotals] = useState<{ totalSales: number; totalWebsites: number; potential: number; uniqueVisitors: number; totalVisitEvents: number; pricingViews: number; buyClicks: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [mobileContactDrawerOpen, setMobileContactDrawerOpen] = useState(false);
  const [mobileSalesDrawerOpen, setMobileSalesDrawerOpen] = useState(false);
  const [mobileOrdersDrawerOpen, setMobileOrdersDrawerOpen] = useState(false);
  const [mobileContactStep, setMobileContactStep] = useState(0);
  const [mobileSalesStep, setMobileSalesStep] = useState(0);
  const [contactForm, setContactForm] = useState({ name: "", contact_name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "", job_title: "", note: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", contact_name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "", job_title: "" });
  const [eventForm, setEventForm] = useState({ contact_id: "", title: "", description: "", callback_at: "" });
  const [eventContactSearch, setEventContactSearch] = useState("");
  const [eventContactSuggestionCount, setEventContactSuggestionCount] = useState(6);
  const [eventContactSuggestionsOpen, setEventContactSuggestionsOpen] = useState(false);
  const [contactJobTitleSuggestionsOpen, setContactJobTitleSuggestionsOpen] = useState(false);
  const [leadTradeSuggestionsOpen, setLeadTradeSuggestionsOpen] = useState(false);
  const [leadLocationSuggestionsOpen, setLeadLocationSuggestionsOpen] = useState(false);
  const [leadSearchMemory, setLeadSearchMemory] = useState(readLeadSearchMemory);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [manualReply, setManualReply] = useState("");
  const [mailboxMessages, setMailboxMessages] = useState<MailboxMessage[]>([]);
  const [mailboxSearch, setMailboxSearch] = useState("");
  const [readInquiryIds, setReadInquiryIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("portal:readInquiryIds") || "[]")); } catch { return new Set(); }
  });
  const markInquiryRead = (inquiryId: string) => {
    setReadInquiryIds(current => {
      if (current.has(inquiryId)) return current;
      const next = new Set(current);
      next.add(inquiryId);
      try { localStorage.setItem("portal:readInquiryIds", JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };
  const [activeMail, setActiveMail] = useState<MailboxMessage | null>(null);
  const [mailReply, setMailReply] = useState("");
  const [mailboxLoading, setMailboxLoading] = useState(false);
  const [sendingConfirmationId, setSendingConfirmationId] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem("portal_active_tab");
      return saved || "sales";
    } catch {
      return "sales";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("portal_active_tab", activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);
  const [devChatOpen, setDevChatOpen] = useState(false);
  const [leadAgentForm, setLeadAgentForm] = useState({ trade: "", location: "", limit: "3" });
  const [leadAgentLoading, setLeadAgentLoading] = useState(false);
  const [leadAgentSummary, setLeadAgentSummary] = useState<string | null>(null);
  const [leadAgentProgress, setLeadAgentProgress] = useState<number>(0);

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
      contactPersons?: ContactPerson[];
      projectRequirements?: ProjectRequirement[];
      editRequests?: EditRequest[];
      sampleRequests?: Array<{ id: string; name: string; email: string | null; phone: string | null; created_at: string; request_details: any; attachment_urls: string[] | null }>;
      aiSampleGenerations?: any[];
      emailLogs?: EmailLog[];
      counts?: Record<string, number>;
    };
    setOrders((snapshot.orders ?? []).filter((order) => isSiteOrder(order) && (isPaidOrder(order) || ((order.metadata as { source?: string } | null)?.source === "admin_manual"))));
    setFalloffs(snapshot.falloffs ?? []);
    const convs = snapshot.conversations ?? [];
    const allMsgs = snapshot.messages ?? [];
    setProfiles(snapshot.profiles ?? []);
    setInquiries(snapshot.inquiries ?? []);
    setContacts(snapshot.contacts ?? []);
    setContactEvents(snapshot.contactEvents ?? []);
    setContactPersons(snapshot.contactPersons ?? []);
    setProjectRequirements(snapshot.projectRequirements ?? []);
    setEditRequests(snapshot.editRequests ?? []);
    setSampleRequests(snapshot.sampleRequests ?? []);
    setEmailLogs(snapshot.emailLogs ?? []);
    setSectionCounts(snapshot.counts ?? {});
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

  const loadMoreSection = useCallback(async (
    section: "orders" | "falloffs" | "conversations" | "contacts" | "contactEvents" | "inquiries" | "editRequests" | "sampleRequests" | "aiSampleGenerations" | "profiles" | "projectRequirements",
    currentLength: number,
    pageSize: number = 20,
  ) => {
    setLoadingMore((m) => ({ ...m, [section]: true }));
    try {
      const { data, error } = await (supabase as any).rpc("portal_fetch_section", {
        _section: section,
        _limit: pageSize,
        _offset: currentLength,
      });
      if (error) {
        toast.error("Couldn't load more", { description: error.message });
        return;
      }
      const rows: any[] = Array.isArray(data) ? data : [];
      const dedupAppend = <T extends { id?: string; session_id?: string }>(prev: T[]): T[] => {
        const keyOf = (r: T) => (r as any).id ?? (r as any).session_id ?? JSON.stringify(r);
        const existing = new Set(prev.map(keyOf));
        return [...prev, ...rows.filter((r: any) => !existing.has(keyOf(r)))] as T[];
      };
      switch (section) {
        case "orders": setOrders((p) => dedupAppend(p as any) as any); break;
        case "falloffs": setFalloffs((p) => dedupAppend(p as any) as any); break;
        case "conversations": setConversations((p) => dedupAppend(p as any) as any); break;
        case "contacts": setContacts((p) => dedupAppend(p as any) as any); break;
        case "contactEvents": setContactEvents((p) => dedupAppend(p as any) as any); break;
        case "inquiries": setInquiries((p) => dedupAppend(p as any) as any); break;
        case "editRequests": setEditRequests((p) => dedupAppend(p as any) as any); break;
        case "sampleRequests": setSampleRequests((p) => dedupAppend(p as any) as any); break;
        case "profiles": setProfiles((p) => dedupAppend(p as any) as any); break;
        case "projectRequirements": setProjectRequirements((p) => dedupAppend(p as any) as any); break;
        case "aiSampleGenerations": /* handled by VisionStudio if needed */ break;
      }
    } finally {
      setLoadingMore((m) => ({ ...m, [section]: false }));
    }
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

    const loadAlerts = async () => {
      const { data } = await (supabase as any).from("admin_alerts").select("*").order("created_at", { ascending: false }).limit(100);
      setAdminAlerts((data as any) ?? []);
    };
    loadAlerts();

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
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_alerts" }, loadAlerts)
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

  const fetchAllTimeStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Paid site orders — paginate through all
      const allOrders: Array<{ amount_total: number | null; customer_email: string | null; metadata: any; payment_status: string | null; status: string | null }> = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await (supabase as any)
          .from("stripe_checkout_sessions")
          .select("amount_total, customer_email, metadata, payment_status, status")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = (data ?? []) as any[];
        allOrders.push(...rows);
        if (rows.length < pageSize) break;
      }
      const paidSite = allOrders.filter(
        (o) => o.metadata?.source === "pixcellor_site" && (o.payment_status === "paid" || o.status === "complete" || o.status === "completed")
      );
      const totalSales = paidSite.reduce((sum, o) => sum + (o.amount_total ?? 0), 0);
      const totalWebsites = paidSite.length;
      const buyerEmails = new Set(paidSite.map((o) => o.customer_email?.toLowerCase()).filter(Boolean) as string[]);

      // Visitor falloffs — paginate
      const allFalloffs: Array<{ visitor_id: string | null; event_count: number | null; pricing_opened_at: string | null; buy_clicked_at: string | null }> = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await (supabase as any)
          .from("visitor_falloffs")
          .select("visitor_id, event_count, pricing_opened_at, buy_clicked_at")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = (data ?? []) as any[];
        allFalloffs.push(...rows);
        if (rows.length < pageSize) break;
      }
      const uniqueVisitors = new Set(allFalloffs.map((f) => f.visitor_id).filter(Boolean)).size;
      const totalVisitEvents = allFalloffs.reduce((sum, f) => sum + (f.event_count ?? 0), 0);
      const pricingViews = allFalloffs.filter((f) => f.pricing_opened_at).length;
      const buyClicks = allFalloffs.filter((f) => f.buy_clicked_at).length;

      // Potential = leads (profiles + inquiries) not in buyers, plus anonymous chatters
      const [{ data: profEmails }, { data: inqEmails }, { count: convCount }] = await Promise.all([
        (supabase as any).from("client_profiles").select("email").limit(10000),
        (supabase as any).from("contact_inquiries").select("email").limit(10000),
        (supabase as any).from("chat_conversations").select("id", { count: "exact", head: true }),
      ]);
      const leadEmails = new Set<string>();
      for (const r of (profEmails ?? []) as any[]) if (r.email) leadEmails.add(r.email.toLowerCase());
      for (const r of (inqEmails ?? []) as any[]) if (r.email) leadEmails.add(r.email.toLowerCase());
      let potential = 0;
      for (const e of leadEmails) if (!buyerEmails.has(e)) potential += 1;
      const conversationsWithoutEmail = (convCount ?? 0) - leadEmails.size;
      if (conversationsWithoutEmail > 0) potential += conversationsWithoutEmail;

      setStatsTotals({ totalSales, totalWebsites, potential, uniqueVisitors, totalVisitEvents, pricingViews, buyClicks });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (statsDialogOpen) void fetchAllTimeStats();
  }, [statsDialogOpen, fetchAllTimeStats]);

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
      const isCustom = ((order.metadata as Record<string, unknown> | null) ?? {}).source === "admin_manual";
      const reqsMatches = orderReqsFilter === "all" ||
        (orderReqsFilter === "submitted" ? hasRequirements
          : orderReqsFilter === "edits" ? hasEditRequests
          : orderReqsFilter === "custom" ? isCustom
          : !hasRequirements);
      return order.order_status !== "delivered" && order.order_status !== "merged_to_manual" && reqsMatches;
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
      const reqsMatches = completedReqsFilter === "all" ||
        (completedReqsFilter === "submitted" ? hasRequirements : !hasRequirements);
      return order.order_status === "delivered" && reqsMatches;
    });
  }, [orders, completedQ, completedReqsFilter, requirementsBySession]);

  const filteredFalloffs = useMemo(() => {
    const paidSessionIds = new Set(orders.map(o => o.session_id));
    const unpaidFalloffs = falloffs.filter(f => !f.checkout_session_id || !paidSessionIds.has(f.checkout_session_id));

    // Bundle duplicates: group by visitor_id (fallback ip_address, then id) and merge into a single representative row.
    const groups = new Map<string, VisitorFalloff[]>();
    for (const f of unpaidFalloffs) {
      const key = f.visitor_id || f.ip_address || f.id;
      const arr = groups.get(key);
      if (arr) arr.push(f); else groups.set(key, [f]);
    }
    const pickLatest = (arr: VisitorFalloff[]) => [...arr].sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());
    const firstNonNull = <T,>(arr: VisitorFalloff[], key: keyof VisitorFalloff): T | null => {
      for (const r of arr) { const v = r[key] as unknown; if (v !== null && v !== undefined && v !== "") return v as T; }
      return null;
    };
    const earliest = (arr: VisitorFalloff[], key: keyof VisitorFalloff) => {
      const vals = arr.map(r => r[key] as string | null).filter(Boolean) as string[];
      if (!vals.length) return null;
      return vals.reduce((a, b) => new Date(a).getTime() < new Date(b).getTime() ? a : b);
    };
    const merged: (VisitorFalloff & { _duplicateCount?: number; _sessionCount?: number })[] = Array.from(groups.values()).map(rows => {
      const sorted = pickLatest(rows);
      const latest = sorted[0];
      const sessionCount = new Set(rows.map(r => r.session_id).filter(Boolean)).size;
      const totalEvents = rows.reduce((sum, r) => sum + (r.event_count ?? 0), 0);
      const maxScroll = rows.reduce((m, r) => Math.max(m, r.max_scroll_percent ?? 0), 0);
      const portfolioPages = rows.reduce((m, r) => Math.max(m, r.portfolio_pages_viewed ?? 0), 0);
      return {
        ...latest,
        event_count: totalEvents,
        max_scroll_percent: maxScroll,
        portfolio_pages_viewed: portfolioPages,
        customer_email: firstNonNull<string>(sorted, "customer_email") ?? latest.customer_email,
        company_name: firstNonNull<string>(sorted, "company_name") ?? latest.company_name,
        company_domain: firstNonNull<string>(sorted, "company_domain") ?? latest.company_domain,
        package_name: firstNonNull<string>(sorted, "package_name") ?? latest.package_name,
        checkout_session_id: firstNonNull<string>(sorted, "checkout_session_id") ?? latest.checkout_session_id,
        pricing_opened_at: earliest(rows, "pricing_opened_at") ?? latest.pricing_opened_at,
        buy_clicked_at: earliest(rows, "buy_clicked_at") ?? latest.buy_clicked_at,
        portfolio_opened_at: earliest(rows, "portfolio_opened_at") ?? latest.portfolio_opened_at,
        checkout_started_at: earliest(rows, "checkout_started_at") ?? latest.checkout_started_at,
        _duplicateCount: rows.length,
        _sessionCount: sessionCount,
      };
    });
    merged.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());

    if (!falloffsQ) return merged;
    return merged.filter(f =>
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

  // Clients tab now shows the full contact book.
  // Gold-status contacts (anyone who has bought) are treated as clients and shown first.
  const clientBookContacts = useMemo(() => {
    const visible = contacts.filter(c => c.status !== "archived");
    const matchingEventContactIds = new Set(
      contactEvents
        .filter(e => matchesQuery(profilesQ, e.title) || matchesQuery(profilesQ, e.description) || matchesQuery(profilesQ, e.event_type))
        .map(e => e.contact_id)
    );
    const filtered = !profilesQ ? visible : visible.filter(c =>
      matchesQuery(profilesQ, c.name) || matchesQuery(profilesQ, c.contact_name) ||
      matchesQuery(profilesQ, c.phone) || matchesQuery(profilesQ, c.email) ||
      matchesQuery(profilesQ, c.location) || matchesQuery(profilesQ, c.industry) ||
      matchesQuery(profilesQ, c.website) || matchesQuery(profilesQ, c.actual_website_url) ||
      matchesQuery(profilesQ, c.source_platform) || matchesQuery(profilesQ, c.notes) ||
      matchesQuery(profilesQ, c.status) || matchingEventContactIds.has(c.id) ||
      (c.status === "gold" && matchesQuery(profilesQ, "client"))
    );
    const statusFiltered = clientsStatusFilter === "all"
      ? filtered
      : filtered.filter(c => c.status === clientsStatusFilter);
    const retainerEmails = new Set(
      orders.filter(isMonthlyRetainerOrder).map(o => normalizeEmail(o.customer_email)).filter(Boolean) as string[]
    );
    const retainerFiltered = (clientsStatusFilter === "gold" && clientsRetainerOnly)
      ? statusFiltered.filter(c => {
          const e = normalizeEmail(c.email);
          return e ? retainerEmails.has(e) : false;
        })
      : statusFiltered;
    const heatRank: Record<Contact["status"], number> = {
      hot: 0, gold: 1, aware: 2, cold: 3, archived: 4,
    } as any;
    const latestActivityByContact = new Map<string, number>();
    for (const e of contactEvents) {
      const t = new Date((e as any).updated_at || e.created_at).getTime();
      const prev = latestActivityByContact.get(e.contact_id) ?? 0;
      if (t > prev) latestActivityByContact.set(e.contact_id, t);
    }
    const latestActivity = (c: Contact) => {
      const u = new Date(c.updated_at || c.created_at).getTime();
      const e = latestActivityByContact.get(c.id) ?? 0;
      return Math.max(u, e);
    };
    return [...retainerFiltered].sort((a, b) => {
      if (clientsSort === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (clientsSort === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (clientsSort === "latest_update") {
        return latestActivity(b) - latestActivity(a);
      }
      if (clientsSort === "hot") {
        const ar = heatRank[a.status] ?? 99;
        const br = heatRank[b.status] ?? 99;
        if (ar !== br) return ar - br;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      // cold
      const ar = heatRank[a.status] ?? 99;
      const br = heatRank[b.status] ?? 99;
      if (ar !== br) return br - ar;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [contacts, contactEvents, profilesQ, clientsSort, clientsStatusFilter, clientsRetainerOnly, orders]);

  const goldClientCount = useMemo(() => contacts.filter(c => c.status === "gold").length, [contacts]);

  // Convert inquiries (contact form submissions) into MailboxMessage-shaped entries
  // so they show up alongside Gmail mail in the unified inbox.
  const inquiryMessages = useMemo<MailboxMessage[]>(() => {
    const q = mailboxSearch.trim().toLowerCase();
    const filtered = q
      ? inquiries.filter(i =>
          (i.name || "").toLowerCase().includes(q) ||
          (i.email || "").toLowerCase().includes(q) ||
          (i.message || "").toLowerCase().includes(q)
        )
      : inquiries;
    return filtered.map(i => ({
      id: `inquiry:${i.id}`,
      threadId: "",
      from: i.name ? `${i.name} <${i.email}>` : i.email,
      fromEmail: (i.email || "").toLowerCase(),
      subject: "Website enquiry",
      snippet: (i.message || "").slice(0, 160),
      body: i.message || "",
      date: i.created_at,
      unread: !readInquiryIds.has(i.id),
    }));
  }, [inquiries, mailboxSearch, readInquiryIds]);

  const combinedMailboxMessages = useMemo<MailboxMessage[]>(() => {
    return [...inquiryMessages, ...mailboxMessages].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [inquiryMessages, mailboxMessages]);

  const filteredContacts = useMemo(() => {
    if (!contactsQ) return contacts;
    const matchingContactIds = new Set(
      contactEvents.filter(e => matchesQuery(contactsQ, e.title) || matchesQuery(contactsQ, e.description) || matchesQuery(contactsQ, e.event_type) || matchesQuery(contactsQ, e.callback_at)).map(e => e.contact_id)
    );
    return contacts.filter(c =>
      matchesQuery(contactsQ, c.name) || matchesQuery(contactsQ, c.phone) || matchesQuery(contactsQ, c.email) ||
      matchesQuery(contactsQ, c.location) || matchesQuery(contactsQ, c.industry) || matchesQuery(contactsQ, c.website) || matchesQuery(contactsQ, c.actual_website_url) || matchesQuery(contactsQ, c.source_platform) || matchesQuery(contactsQ, c.website_status) || matchesQuery(contactsQ, c.lead_score_reason) || matchesQuery(contactsQ, c.notes) || matchingContactIds.has(c.id)
    );
  }, [contacts, contactEvents, contactsQ]);

  const websiteEntries = useMemo(() => {
    const manual = contacts
      .filter(contact => Boolean(contact.website?.trim()))
      .map(contact => ({
        key: `contact-${contact.id}`,
        name: contact.name,
        website: contact.website!,
        email: contact.email,
        location: contact.location,
        industry: contact.industry,
        source: "Client",
        date: contact.updated_at,
        contactId: contact.id,
      }));
    const delivered = completedOrders
      .filter(order => Boolean(order.delivered_domain?.trim()))
      .map(order => ({
        key: `order-${order.session_id}`,
        name: order.customer_email ?? "Delivered client",
        website: order.delivered_domain!,
        email: order.customer_email,
        location: null,
        industry: null,
        source: "Delivered job",
        date: order.delivered_at ?? order.created_at,
        contactId: contacts.find(contact => normalizeEmail(contact.email) && normalizeEmail(contact.email) === normalizeEmail(order.customer_email))?.id ?? null,
      }));
    const seen = new Set<string>();
    return [...manual, ...delivered]
      .filter(entry => {
        const key = `${entry.website.toLowerCase()}-${entry.email ?? entry.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter(entry => !websitesQ || [entry.name, entry.website, entry.email, entry.location, entry.industry, entry.source].some(value => matchesQuery(websitesQ, value)))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contacts, completedOrders, websitesQ]);

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
      matchesQuery(contactsQ, c.location) || matchesQuery(contactsQ, c.industry) || matchesQuery(contactsQ, c.website) || matchesQuery(contactsQ, c.actual_website_url) || matchesQuery(contactsQ, c.source_platform) || matchesQuery(contactsQ, c.website_status) || matchesQuery(contactsQ, c.lead_score_reason) || matchesQuery(contactsQ, c.notes) || matchesQuery(contactsQ, c.status) || matchingContactIds.has(c.id) || orderMatches
      );
    }));
  }, [filteredContacts, contactEvents, contactsQ, contactsStatusFilter, contactsSortOrder, contactOrderStatsByEmail]);

  const jobTitleSuggestions = useMemo(() => {
    const typed = contactForm.job_title.trim().toLowerCase();
    if (!typed) return [];
    const titles = Array.from(new Set(
      contacts
        .map(contact => contact.notes?.trim())
        .filter((title): title is string => Boolean(title))
    )).sort((a, b) => a.localeCompare(b));

    return titles
      .filter(title => title.toLowerCase().includes(typed) && title.toLowerCase() !== typed)
      .slice(0, 8);
  }, [contacts, contactForm.job_title]);

  const leadTradeSuggestions = useMemo(() => {
    const typed = leadAgentForm.trade.trim().toLowerCase();
    if (!typed) return [];
    const trades = Array.from(new Set(
      [...leadSearchMemory.trades, ...contacts.flatMap(contact => {
        const noteTrade = contact.notes?.match(/^Trade:\s*(.+)$/im)?.[1]?.trim();
        return [contact.notes?.trim(), noteTrade, contact.industry].filter((value): value is string => Boolean(value && value !== "general"));
      })]
    )).sort((a, b) => a.localeCompare(b));
    return trades.filter(trade => trade.toLowerCase().includes(typed) && trade.toLowerCase() !== typed).slice(0, 8);
  }, [contacts, leadAgentForm.trade, leadSearchMemory.trades]);

  const leadLocationSuggestions = useMemo(() => {
    const typed = leadAgentForm.location.trim().toLowerCase();
    if (!typed) return [];
    const locations = Array.from(new Set([...leadSearchMemory.locations, ...contacts.map(contact => contact.location?.trim()).filter((value): value is string => Boolean(value))])).sort((a, b) => a.localeCompare(b));
    return locations.filter(location => location.toLowerCase().includes(typed) && location.toLowerCase() !== typed).slice(0, 8);
  }, [contacts, leadAgentForm.location, leadSearchMemory.locations]);

  const eventContactSuggestions = useMemo(() => {
    const query = eventContactSearch.trim().toLowerCase();
    const sortedContacts = [...contacts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (!query) return sortedContacts;

    return sortedContacts.filter(contact =>
      [`${contact.name}${contact.email ? ` · ${contact.email}` : ""}`, contact.name, contact.contact_name, contact.email, contact.phone, contact.location, contact.industry, contact.notes]
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
      contact_name: contact.contact_name ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      location: contact.location ?? "",
      industry: contact.industry ?? "general",
      website: contact.website ?? "",
      notes: contact.notes ?? "",
      job_title: "",
    });
    setOpenContactId(contact.id);
  };

  const ensureContactPersonFromForm = async (
    contactId: string,
    contactName: string,
    jobTitle: string,
    phone: string,
  ) => {
    const name = contactName.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const exists = contactPersons.some(
      p => p.contact_id === contactId && (p.name || "").trim().toLowerCase() === lower,
    );
    if (exists) return;
    const { data, error } = await (supabase as any).rpc("portal_add_contact_person", {
      _contact_id: contactId,
      _name: name,
      _job_title: jobTitle.trim() || null,
      _phone: phone.trim() || null,
    });
    if (error) {
      console.warn("auto-add contact person failed", error);
      return;
    }
    const created = data as ContactPerson | null;
    if (created?.id) setContactPersons(curr => [created, ...curr.filter(p => p.id !== created.id)]);
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
    setActiveTab("profiles");
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
    if (!skip && field.key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email address (or skip).");
      return;
    }
    if (skip && !field.required) setContactForm(f => ({ ...f, [field.key]: "" }));
    if (mobileContactStep < contactWizardFields.length - 1) setMobileContactStep(step => step + 1);
    else if (!contactSubmitting) void createContact();
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
    if (contactSubmitting) return;
    const name = contactForm.name.trim();
    if (!name) {
      toast.error("Company name is required.");
      return;
    }
    const email = contactForm.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address (or leave it blank).");
      return;
    }
    setContactSubmitting(true);
    const { data, error } = await (supabase as any).rpc("portal_create_contact", {
      _name: name,
      _contact_name: contactForm.contact_name,
      _phone: contactForm.phone,
      _email: contactForm.email,
      _location: contactForm.location,
      _notes: "",
      _industry: contactForm.industry || "general",
      _website: contactForm.website,
    });
    if (error) {
      toast.error(error.message);
      setContactSubmitting(false);
      return;
    }
    const newContact = data as Contact | null;
    if (newContact?.id) {
      setContacts(current => [newContact, ...current.filter(contact => contact.id !== newContact.id)]);
      setContactDetailDrawerId(newContact.id);
      await ensureContactPersonFromForm(
        newContact.id,
        contactForm.contact_name,
        contactForm.job_title,
        contactForm.phone,
      );
      const noteText = contactForm.note.trim();
      if (noteText) {
        const { data: eventData, error: eventError } = await (supabase as any).rpc("portal_create_contact_event", {
          _contact_id: newContact.id,
          _title: "Note",
          _description: noteText,
          _callback_at: null,
        });
        if (eventError) {
          toast.error(`Client saved, but note failed: ${eventError.message}`);
        } else {
          const newEvent = eventData as ContactEvent | null;
          if (newEvent?.id) setContactEvents(current => [newEvent, ...current.filter(e => e.id !== newEvent.id)]);
        }
      }
    }
    setContactForm({ name: "", contact_name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "", job_title: "", note: "" });
    setShowContactForm(false);
    setMobileContactDrawerOpen(false);
    setMobileContactStep(0);
    setContactSubmitting(false);
    toast.success("Client added.");
    return newContact;
  };

  const openPersonDrawerForContact = (contactId: string) => {
    setPersonForm({ name: "", job_title: "", phone: "" });
    setPersonDrawerContactId(contactId);
  };

  const createContactPerson = async () => {
    if (!personDrawerContactId) return;
    const name = personForm.name.trim();
    if (!name) { toast.error("Contact name is required."); return; }
    setPersonSubmitting(true);
    const { data, error } = await (supabase as any).rpc("portal_add_contact_person", {
      _contact_id: personDrawerContactId,
      _name: name,
      _job_title: personForm.job_title || null,
      _phone: personForm.phone || null,
    });
    setPersonSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const created = data as ContactPerson | null;
    if (created?.id) setContactPersons(curr => [created, ...curr]);
    setPersonForm({ name: "", job_title: "", phone: "" });
    setPersonDrawerContactId(null);
    toast.success("Contact added.");
  };

  const deleteContactPerson = async (personId: string) => {
    const { error } = await (supabase as any).rpc("portal_delete_contact_person", { _person_id: personId });
    if (error) { toast.error(error.message); return; }
    setContactPersons(curr => curr.filter(p => p.id !== personId));
  };

  const [mediaUploadingFor, setMediaUploadingFor] = useState<string | null>(null);
  const [salesFollowupSendingFor, setSalesFollowupSendingFor] = useState<string | null>(null);

  const sendSalesFollowup = async (contact: Contact) => {
    const email = normalizeEmail(contact.email);
    if (!email) { toast.error("Client has no email address."); return; }
    const ok = window.confirm(`Send sales call follow-up email to ${email}?`);
    if (!ok) return;
    setSalesFollowupSendingFor(contact.id);
    try {
      const { error } = await supabase.functions.invoke("send-sales-followup", {
        body: {
          contactId: contact.id,
          recipientEmail: email,
          clientName: contact.contact_name || contact.name,
        },
      });
      if (error) throw error;
      toast.success("Sales follow-up email queued.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send follow-up.");
    } finally {
      setSalesFollowupSendingFor(null);
    }
  };


  const saveContactMedia = async (contactId: string, media: string[]) => {
    const { error } = await (supabase as any).rpc("portal_update_contact_media", { _contact_id: contactId, _media: media });
    if (error) { toast.error(error.message); return false; }
    setContacts(curr => curr.map(c => c.id === contactId ? { ...c, media } : c));
    return true;
  };

  const uploadContactMedia = async (contactId: string, files: FileList | null) => {
    if (!files || !files.length) return;
    const current = contacts.find(c => c.id === contactId);
    const existing = current?.media ?? [];
    if (existing.length + files.length > 50) {
      toast.error("Up to 50 images per client.");
      return;
    }
    setMediaUploadingFor(contactId);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image.`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is over 10MB.`); continue; }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `clients/${contactId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error } = await supabase.storage.from("submission-attachments").upload(path, file, { contentType: file.type, upsert: false });
      if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
      const { data } = supabase.storage.from("submission-attachments").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    if (uploaded.length) {
      const next = [...existing, ...uploaded];
      const ok = await saveContactMedia(contactId, next);
      if (ok) toast.success(`Added ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.`);
    }
    setMediaUploadingFor(null);
  };

  const removeContactMedia = async (contactId: string, url: string) => {
    const current = contacts.find(c => c.id === contactId);
    const next = (current?.media ?? []).filter(u => u !== url);
    await saveContactMedia(contactId, next);
  };

  const addContactFromWizard = async () => {
    if (!contactForm.name.trim()) { toast.error("Enter the company name first."); return; }
    const newContact = await createContact();
    if (newContact?.id) openPersonDrawerForContact(newContact.id);
  };

  const runLeadAgent = async () => {
    const trade = leadAgentForm.trade.trim();
    const location = leadAgentForm.location.trim();
    const limit = Math.min(Math.max(Number(leadAgentForm.limit) || 3, 1), 5);
    if (!trade || !location) {
      toast.error("Add a trade and location first.");
      return;
    }

    const nextLeadSearchMemory = {
      trades: rememberLeadSearchValue(leadSearchMemory.trades, trade),
      locations: rememberLeadSearchValue(leadSearchMemory.locations, location),
    };
    setLeadSearchMemory(nextLeadSearchMemory);
    window.localStorage.setItem(leadSearchMemoryKey, JSON.stringify(nextLeadSearchMemory));

    setLeadAgentLoading(true);
    setLeadAgentSummary(null);
    setLeadAgentProgress(5);

    const { data: queueData, error: queueError } = await supabase.functions.invoke("find-local-leads", {
      body: { trade, location, limit },
    });

    if (queueError || queueData?.error || !queueData?.job_id) {
      setLeadAgentLoading(false);
      setLeadAgentProgress(0);
      toast.error(queueData?.error || queueError?.message || "Lead agent failed to start");
      return;
    }

    const jobId: string = queueData.job_id;
    setLeadAgentSummary("Searching the web for fresh leads…");

    const startedAt = Date.now();
    const maxWaitMs = 150_000;
    let finalResult: any = null;
    let finalError: string | null = null;

    while (Date.now() - startedAt < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const { data: statusData, error: statusError } = await supabase.functions.invoke("get-job-status", {
        body: { job_id: jobId },
      });
      if (statusError || statusData?.error) {
        finalError = statusData?.error || statusError?.message || "Lost track of the job";
        break;
      }
      const job = statusData?.job;
      if (!job) continue;
      if (typeof job.progress === "number") setLeadAgentProgress(Math.max(5, job.progress));
      if (job.status === "complete") {
        finalResult = job.result;
        break;
      }
      if (job.status === "failed") {
        finalError = job.error || "Lead agent failed";
        break;
      }
    }

    setLeadAgentLoading(false);
    setLeadAgentProgress(0);

    if (finalError) {
      toast.error(finalError);
      setLeadAgentSummary(`Failed: ${finalError}`);
      return;
    }
    if (!finalResult) {
      toast.error("Lead agent timed out. Try again or narrow the search.");
      setLeadAgentSummary("Timed out waiting for results.");
      return;
    }

    const data = finalResult;
    const summary = data.message || `Added ${data.added ?? 0}. Searched ${data.searched ?? 0}, extracted ${data.candidates_extracted ?? 0}. Skipped ${data.skipped_duplicates ?? 0} duplicates.`;
    setLeadAgentSummary(summary);
    await loadPortalSnapshot();
    toast.success(summary);
  };

  const updateContact = async () => {
    if (!editingContactId) return;
    const name = editContactForm.name.trim();
    if (!name) {
      toast.error("Company name is required.");
      return;
    }
    const { error } = await (supabase as any).rpc("portal_update_contact", {
      _contact_id: editingContactId,
      _name: name,
      _contact_name: editContactForm.contact_name,
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
    await ensureContactPersonFromForm(
      editingContactId,
      editContactForm.contact_name,
      editContactForm.job_title,
      editContactForm.phone,
    );
    setEditingContactId(null);
    setEditContactForm({ name: "", contact_name: "", phone: "", email: "", location: "", industry: "", website: "", notes: "", job_title: "" });
    await loadPortalSnapshot();
    toast.success("Client updated.");
  };

  const createContactEvent = async () => {
    if (!eventForm.contact_id) {
      toast.error("Select a client.");
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
    toast.success(hasCallback ? "Let's Talk scheduled." : "Event logged in client history.");
  };

  const completeCallback = async (eventId: string) => {
    const previous = contactEvents;
    const completedAt = new Date().toISOString();
    setContactEvents(current => current.map(e => e.id === eventId ? { ...e, completed_at: completedAt } : e));
    const { error } = await (supabase as any).rpc("portal_complete_callback", { _event_id: eventId });
    if (error) {
      setContactEvents(previous);
      toast.error(`${error.message} — restored.`);
    } else {
      toast.success("Let's Talk marked done.");
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
      toast.success("Let's Talk pushed back 1 week.");
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
    toast.success("Client archived.");
  };

  const markOrderDelivered = async (order: StripeSession) => {
    if (!order.customer_email) {
      toast.error("This order does not have a customer email.");
      return;
    }

    const deliveredDomain = await promptDomain({
      title: "Mark order delivered",
      description: `Enter the live domain we delivered the website to for ${order.customer_email}.`,
    });
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
      const matchingContact = contacts.find(contact => normalizeEmail(contact.email) === normalizeEmail(order.customer_email));
      if (matchingContact && !matchingContact.website) {
        await (supabase as any).rpc("portal_update_contact", {
          _contact_id: matchingContact.id,
          _name: matchingContact.name,
          _phone: matchingContact.phone,
          _email: matchingContact.email,
          _location: matchingContact.location,
          _notes: matchingContact.notes,
          _industry: matchingContact.industry || "general",
          _website: cleanDomain,
        });
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

  const markSampleDelivered = async (sample: { id: string; email: string | null }) => {
    if (!sample.email) {
      toast.error("This sample request has no email address.");
      return;
    }
    const deliveredDomain = await promptDomain({
      title: "Mark sample delivered",
      description: `Enter the live domain we delivered the free sample to for ${sample.email}.`,
    });
    if (!deliveredDomain) return;
    const cleanDomain = deliveredDomain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "").toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(cleanDomain)) {
      toast.error("Enter a valid delivered domain.");
      return;
    }
    setDeliveringSampleId(sample.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-sample-delivered", {
        body: { sampleId: sample.id, deliveredDomain: cleanDomain },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Could not deliver sample");
        return;
      }
      await loadPortalSnapshot();
      if (data?.emailWarning) {
        toast.warning(`Sample marked delivered, but the email failed: ${data.emailWarning}`);
      } else {
        toast.success(`Sample delivered and email sent to ${data.recipientEmail || sample.email}.`);
      }
    } finally {
      setDeliveringSampleId(null);
    }
  };

  const markSampleUndelivered = async (sampleId: string) => {
    const ok = await confirmDialog({ title: "Move sample back?", description: "This returns the sample to undelivered.", confirmLabel: "Move back" });
    if (!ok) return;
    const { error } = await (supabase as any).rpc("portal_mark_sample_undelivered", { _sample_id: sampleId });
    if (error) {
      toast.error(error.message || "Could not update sample");
      return;
    }
    await loadPortalSnapshot();
    toast.success("Sample moved back to undelivered.");
  };

  const markOrderUndelivered = async (sessionId: string) => {
    const confirmed = await confirmDialog({ title: "Re-open order?", description: "Move this order back to open so delivery can be redone.", confirmLabel: "Re-open" });
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

  const sendTestOrderCompleteEmail = async () => {
    const result = await promptDialog({
      title: "Send test order-complete email",
      fields: [{ name: "email", label: "Recipient email", type: "email", required: true, placeholder: "name@example.com" }],
      confirmLabel: "Send test",
    });
    if (!result) return;
    const cleanEmail = result.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    toast.info(`Queuing test order-complete email to ${cleanEmail}…`);
    const { data, error } = await supabase.functions.invoke("send-transactional-email-test", {
      body: { recipientEmail: cleanEmail },
    });
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || error?.message || "Test send failed");
      return;
    }
    toast.success(`Test email queued to ${cleanEmail}. Check inbox/spam in a moment.`);
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
          <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{[contact.email, contact.phone, contact.location, contact.industry].filter(Boolean).join(" · ") || "No extra details"}</span>
        </button>
      )) : (
        <div className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">No clients found</div>
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
            setContactForm(f => ({ ...f, job_title: title }));
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

  const renderLeadSuggestionList = (items: string[], field: "trade" | "location", close: () => void) => (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-56 overflow-y-auto rounded-none border border-border bg-popover shadow-xl">
      {items.length > 0 ? items.map(item => (
        <button key={item} type="button" className="flex min-h-11 w-full items-center border-b border-border px-3 py-2 text-left text-sm last:border-b-0" onClick={() => { setLeadAgentForm(f => ({ ...f, [field]: item })); close(); }}>
          <span className="truncate font-medium text-foreground">{item}</span>
        </button>
      )) : (
        <div className="px-3 py-3 text-sm text-muted-foreground">No matching {field === "trade" ? "trades" : "locations"}</div>
      )}
        </div>
  );

  const labeledField = (id: string, label: string, required: boolean, children: React.ReactNode, className = "") => (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );

  const contactFormCard = showContactForm && (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {labeledField("nc-name", "Company name", true,
          <Input id="nc-name" placeholder="e.g. Acme Plumbing Ltd" value={contactForm.name} onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))} />)}
        {labeledField("nc-phone", "Phone", false,
          <Input id="nc-phone" inputMode="tel" placeholder="07…" value={contactForm.phone} onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))} />)}
        {labeledField("nc-email", "Email", false,
          <Input id="nc-email" inputMode="email" placeholder="name@company.com" value={contactForm.email} onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))} />)}
        {labeledField("nc-location", "Location", false,
          <Input id="nc-location" placeholder="Town or area" value={contactForm.location} onChange={(e) => setContactForm(f => ({ ...f, location: e.target.value }))} />)}
        {labeledField("nc-industry", "Industry", false,
          <Input id="nc-industry" placeholder="Plumber, salon, café…" value={contactForm.industry} onChange={(e) => setContactForm(f => ({ ...f, industry: e.target.value }))} />)}
        {labeledField("nc-website", "Website", false,
          <Input id="nc-website" inputMode="url" placeholder="example.com" value={contactForm.website} onChange={(e) => setContactForm(f => ({ ...f, website: e.target.value }))} />)}
        {labeledField("nc-contact", "Contact name", false,
          <Input id="nc-contact" placeholder="Person you spoke to" value={contactForm.contact_name} onChange={(e) => setContactForm(f => ({ ...f, contact_name: e.target.value }))} />)}
        {labeledField("nc-jobtitle", "Job title", false,
          <div className="relative">
            <Input
              id="nc-jobtitle"
              placeholder="Owner, Manager…"
              value={contactForm.job_title}
              onChange={(e) => {
                setContactForm(f => ({ ...f, job_title: e.target.value }));
                setContactJobTitleSuggestionsOpen(Boolean(e.target.value.trim()));
              }}
              onFocus={() => setContactJobTitleSuggestionsOpen(Boolean(contactForm.job_title.trim()))}
              onBlur={() => window.setTimeout(() => setContactJobTitleSuggestionsOpen(false), 120)}
            />
            {contactJobTitleSuggestionsOpen && renderJobTitleSuggestionList()}
          </div>
        )}
        {labeledField("nc-note", "First note (optional)", false,
          <Textarea id="nc-note" rows={3} placeholder="What did you discuss? Anything to remember…" value={contactForm.note} onChange={(e) => setContactForm(f => ({ ...f, note: e.target.value }))} />,
          "md:col-span-2"
        )}
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={createContact} disabled={contactSubmitting}>{contactSubmitting ? "Saving…" : "Save client"}</Button>
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
            placeholder="Search client"
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
          <label className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Optional follow-up date</label>
          <Input type="datetime-local" value={eventForm.callback_at} onChange={(e) => setEventForm(f => ({ ...f, callback_at: e.target.value }))} />
        </div>
        <div>
          <label className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Quick follow-up</label>
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
      <SeoHead
        title="Portal · Pixcellor™"
        description="Internal Pixcellor dev portal."
        path="/portal"
        noindex
      />
      <div className="mx-auto max-w-7xl min-w-0 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold">Portal</h1>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadPortalSnapshot} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
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
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-3 xl:grid-cols-9">
            <TabsTrigger value="sales" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><TrendingUp className="h-3.5 w-3.5 shrink-0" />Sales</TabsTrigger>
            <TabsTrigger value="orders" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><ShoppingBag className="h-3.5 w-3.5 shrink-0" />Orders</TabsTrigger>
            <TabsTrigger value="completed" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><PackageCheck className="h-3.5 w-3.5 shrink-0" />Completed</TabsTrigger>
            <TabsTrigger value="falloffs" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><UserSearch className="h-3.5 w-3.5 shrink-0" />Falloffs</TabsTrigger>
            <TabsTrigger value="campaigns" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Megaphone className="h-3.5 w-3.5 shrink-0" />Email/SMS</TabsTrigger>
            <TabsTrigger value="chats" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><MessageSquare className="h-3.5 w-3.5 shrink-0" />Chats</TabsTrigger>
            <TabsTrigger value="profiles" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Users className="h-3.5 w-3.5 shrink-0" />Clients</TabsTrigger>
            <TabsTrigger value="studio" className="pricing-button h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><Wand2 className="h-3.5 w-3.5 shrink-0" />Studio</TabsTrigger>
            <TabsTrigger value="alerts" className="pricing-button col-span-2 md:col-span-1 h-10 gap-1.5 rounded-none px-2 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sales follow-ups</h2>
                <p className="text-sm text-muted-foreground">Log client events and keep future follow-ups visible.</p>
              </div>
            </div>

            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  placeholder="Search Let's Talk items by client, title, notes, phone, email…"
                  className="pl-9"
                />
              </div>
              {!contactsQ && filteredContacts.length > 10 && (
                <p className="mt-1 text-muted-foreground text-slate-50 bg-white/0 text-xs">Showing most recent clients. Search to find older clients.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-start gap-2">
              <Button onClick={openMobileSalesEvent} disabled={contacts.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Create note
              </Button>
              <Button onClick={openMobileContactForm}>
                <UserPlus className="w-4 h-4 mr-2" /> Create client
              </Button>
              <Button variant="outline" onClick={() => setStatsDialogOpen(true)}>
                <BarChart3 className="w-4 h-4 mr-2" /> Stats
              </Button>
              <Button variant="outline" onClick={() => setHelpDialogOpen(true)}>
                <HelpCircle className="w-4 h-4 mr-2" /> Help
              </Button>
            </div>

            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Add a client first, then you can create sales events.</p>}

            {eventFormCard}

            <div className="space-y-2">
              <h3 className="font-medium">CALL BACKS</h3>
              {salesCallbacks.length === 0 && <p className="text-sm text-muted-foreground">No items waiting{salesQ ? " match your search" : ""}.</p>}
              {salesCallbacks.length > 0 && (
                <p className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                  {callbacksVisibleCount < salesCallbacks.length || (sectionCounts.contactEvents ?? 0) > contactEvents.length ? "" : "Loaded all."}
                </p>
              )}
              <div
                className="max-h-[70vh] overflow-y-auto pr-1 space-y-2 rounded-none border border-border/40 bg-card/20 p-2"
              >
                {salesCallbacks.slice(0, callbacksVisibleCount).map(e => {
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
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{contact?.name ?? "Unknown client"} · Follow-up: {new Date(e.callback_at!).toLocaleString()} · {getEventAuthorLabel(e)}</div>
                          {contact?.phone && (
                            <div className="flex items-center gap-1.5">
                              {phoneHref ? (
                                <a href={phoneHref} className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline" aria-label={`Call ${contact.phone}`} onClick={(event) => event.stopPropagation()}>
                                  {contact.phone}
                                </a>
                              ) : (
                                <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{contact.phone}</div>
                              )}
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-none" aria-label="Copy number" title="Copy number" onClick={(event) => { event.stopPropagation(); copyToClipboard(contact.phone, "Number copied"); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {contact?.email && (
                            <div className="flex items-center gap-1.5">
                              <a href={`mailto:${contact.email}`} className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline" aria-label={`Email ${contact.email}`} onClick={(event) => event.stopPropagation()}>
                                {contact.email}
                              </a>
                              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-none" aria-label="Copy email" title="Copy email" onClick={(event) => { event.stopPropagation(); copyToClipboard(contact.email, "Email copied"); }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
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
                {callbacksVisibleCount < salesCallbacks.length && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" onClick={() => setCallbacksVisibleCount((n) => n + 10)}>Load more</Button>
                  </div>
                )}
                {callbacksVisibleCount >= salesCallbacks.length && (sectionCounts.contactEvents ?? 0) > contactEvents.length && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" disabled={!!loadingMore.contactEvents} onClick={() => loadMoreSection("contactEvents", contactEvents.length, 20)}>
                      {loadingMore.contactEvents ? "Loading…" : "Load more"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={ordersSearch} onChange={(e) => setOrdersSearch(e.target.value)} placeholder="Search orders by email, order ID, status, domain…" className="pl-9" />
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowNewOrderDialog(true)}>
                <Plus className="h-4 w-4" /> New order
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-card/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Requirements</span>
                <Button variant={orderReqsFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("all")}>All</Button>
                <Button variant={orderReqsFilter === "submitted" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("submitted")}>Reqs submitted</Button>
                <Button variant={orderReqsFilter === "edits" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("edits")}>Edits</Button>
                <Button variant={orderReqsFilter === "waiting" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("waiting")}>Waiting</Button>
                <Button variant={orderReqsFilter === "samples" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("samples")}>Design ({sampleRequests.length})</Button>
                <Button variant={orderReqsFilter === "custom" ? "default" : "outline"} size="sm" onClick={() => setOrderReqsFilter("custom")}>Custom orders</Button>
              </div>
            </div>

            {orderReqsFilter === "samples" && sampleRequests.length > 0 && (
              <Card className="border-destructive/40">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">Free sample requests ({sampleRequests.length})</div>
                    <Badge variant="destructive">Hot leads</Badge>
                  </div>
                  <div className="space-y-3">
                    {sampleRequests.map((r) => {
                      const dream = r.request_details?.dream ?? "";
                      const colours = r.request_details?.colours ?? "";
                      const brief = r.request_details?.brief ?? "";
                      const requestedEdits = r.request_details?.requested_edits ?? "";
                      const company = r.request_details?.company ?? "";
                      const kind = r.request_details?.kind ?? "";
                      const origin = r.request_details?.origin ?? "";
                      const visionImg = r.request_details?.vision_image_url ?? "";
                      const media = Array.isArray(r.attachment_urls) ? r.attachment_urls.filter((u) => u !== visionImg) : [];
                      return (
                        <div key={r.id} className="rounded-none border border-border bg-background/50 p-3 text-sm space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="font-medium flex flex-wrap items-center gap-2">
                                {r.name}
                                {company && <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">· {company}</span>}
                                <Badge variant={r.paid_at ? "default" : "outline"}>{r.paid_at ? "Paid" : "Unpaid"}</Badge>
                                <Badge variant={r.delivered_at ? "default" : "outline"}>{r.delivered_at ? "Delivered" : "Orders"}</Badge>
                                {kind && <Badge variant="secondary">{kind === "sample" ? "Custom sample" : kind === "order" ? "Style order" : kind}</Badge>}
                                {origin && origin !== `vision_${kind}_request` && <Badge variant="outline" className="text-[10px]">{origin}</Badge>}
                              </div>
                              <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                                {[r.email, r.phone].filter(Boolean).join(" · ") || "No contact"} · {new Date(r.created_at).toLocaleString()}
                              </div>
                              {r.delivered_at && (
                                <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Delivered {new Date(r.delivered_at).toLocaleString()}{r.delivered_domain ? ` · ${r.delivered_domain}` : ""}</div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!r.delivered_at && (
                                <Button size="sm" variant="outline" onClick={() => markSampleDelivered(r)} disabled={deliveringSampleId === r.id}>
                                  {deliveringSampleId === r.id ? "Processing…" : "Mark delivered"}
                                </Button>
                              )}
                              {r.delivered_at && (
                                <Button size="sm" variant="outline" onClick={() => markSampleUndelivered(r.id)}>
                                  Mark undelivered
                                </Button>
                              )}
                            </div>
                          </div>
                          {brief && (
                            <div className="rounded-none border border-border/40 bg-muted/30 p-2">
                              <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Full brief</div>
                              <div className="whitespace-pre-wrap text-xs">{brief}</div>
                            </div>
                          )}
                          {requestedEdits && (
                            <div className="rounded-none border border-destructive/40 bg-destructive/5 p-2">
                              <div className="text-destructive text-xs uppercase tracking-wider mb-1">Requested edits (custom request)</div>
                              <div className="whitespace-pre-wrap text-xs">{requestedEdits}</div>
                            </div>
                          )}
                          {dream && (
                            <div><span className="text-muted-foreground">Dream site:</span> <span className="whitespace-pre-wrap">{dream}</span></div>
                          )}
                          {colours && (
                            <div><span className="text-muted-foreground">Colours/styles:</span> <span className="whitespace-pre-wrap">{colours}</span></div>
                          )}
                          {visionImg && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-muted-foreground text-xs">Generated vision</div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 rounded-none gap-1 text-[11px]"
                                  onClick={() => downloadImage(visionImg, `vision-${r.id}.png`)}
                                >
                                  <Download className="h-3 w-3" /> Save image
                                </Button>
                              </div>
                              <a href={visionImg} target="_blank" rel="noopener noreferrer" className="block max-w-xs overflow-hidden rounded-none border border-border bg-muted">
                                <img src={visionImg} alt="generated vision" className="w-full block" loading="lazy" />
                              </a>
                            </div>
                          )}
                          {media.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-xs">Attachments ({media.length})</div>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                                {media.map((url) => {
                                  const isVideo = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
                                  return (
                                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-none border border-border bg-muted">
                                      {isVideo ? (
                                        <video src={url} className="h-full w-full object-cover" muted playsInline />
                                      ) : (
                                        <img src={url} alt="attachment" className="h-full w-full object-cover" loading="lazy" />
                                      )}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            {orderReqsFilter === "samples" && sampleRequests.length === 0 && (
              <p className="text-muted-foreground text-sm">No free sample requests yet.</p>
            )}
            {orderReqsFilter !== "samples" && filteredOrders.length === 0 && <p className="text-muted-foreground text-sm">No live orders {ordersQ ? "match your search" : "yet"}.</p>}
            {orderReqsFilter !== "samples" && (
              <p className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                {(sectionCounts.orders ?? 0) > orders.length ? "" : "Loaded all."}
              </p>
            )}
            <div
              className={orderReqsFilter !== "samples" ? "max-h-[70vh] overflow-y-auto pr-1 space-y-3 rounded-none border border-border/40 bg-card/20 p-2" : ""}
            >
            {orderReqsFilter !== "samples" && filteredOrders.map(o => {
              const requirements = requirementsBySession.get(o.session_id);
              const emailStatus = orderEmailStatusBySession.get(o.session_id);
              const canSendReminder = Boolean(o.customer_email && !requirements && emailStatus?.confirmationSent);
              return (
              <Card key={o.session_id}>
                 <CardContent className="p-4 space-y-4">
                   <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                     <div className="min-w-0 space-y-1">
                       <div className="flex flex-wrap items-center gap-2">
                         <span className="font-medium truncate">{o.customer_email ?? "Guest checkout"}</span>
                         <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>
                           {o.payment_status ?? "pending"}
                         </Badge>
                         {(o.metadata as Record<string, unknown> | null)?.source === "admin_manual" && o.payment_status !== "paid" ? (
                           <Badge className="bg-amber-500 text-black hover:bg-amber-500">Draft</Badge>
                         ) : (
                           <Badge variant={o.order_status === "delivered" ? "default" : "outline"}>
                             {o.order_status === "delivered" ? "Delivered" : "Orders"}
                           </Badge>
                         )}
                         {(o.metadata as Record<string, unknown> | null)?.source === "admin_manual" && (
                           <Badge variant="secondary">Manual</Badge>
                         )}
                         <Badge variant={requirements ? "default" : "outline"}>
                           {requirements ? "Requirements received" : "Needs requirements"}
                         </Badge>
                         {emailStatus?.reminderSent && <Badge variant="secondary">Reminder sent</Badge>}
                       </div>
                       <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                         {new Date(o.created_at).toLocaleString()} · {o.mode}
                         {(() => {
                           const meta = (o.metadata as Record<string, unknown> | null) ?? {};
                           const pkgName = (meta.package_name as string | undefined) || (meta.custom_label as string | undefined);
                           return pkgName ? ` · ${pkgName}` : "";
                         })()}
                         {" · "}<span className="font-semibold text-foreground">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</span>
                       </div>
                       {o.delivered_at && <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Delivered {new Date(o.delivered_at).toLocaleString()}</div>}
                     </div>
                     <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => sendOrderConfirmation(o)}
                         disabled={!o.customer_email || sendingConfirmationId === o.session_id}
                       >
                         {sendingConfirmationId === o.session_id ? "Sending…" : "Send confirmation"}
                       </Button>
                       {(() => {
                         const meta = (o.metadata as Record<string, unknown> | null) ?? {};
                         const url = typeof meta.payment_link_url === "string" ? meta.payment_link_url : null;
                         if (!url) return null;
                         const isPaid = o.payment_status === "paid";
                         return (
                           <>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => { navigator.clipboard.writeText(url); toast.success("Payment link copied"); }}
                             >
                               <Copy className="h-3.5 w-3.5 mr-1" /> Copy pay link
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => window.open(url, "_blank", "noopener")}
                               disabled={isPaid}
                             >
                               <ExternalLink className="h-3.5 w-3.5 mr-1" /> {isPaid ? "Paid" : "Open pay link"}
                             </Button>
                           </>
                         );
                       })()}
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
                        <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Updated {new Date(requirements.updated_at).toLocaleString()}</div>
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
            {orderReqsFilter !== "samples" && (sectionCounts.orders ?? 0) > orders.length && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" disabled={!!loadingMore.orders} onClick={() => loadMoreSection("orders", orders.length, 20)}>
                  {loadingMore.orders ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                {completedOrders.length} delivered orders
              </div>
              <Button variant="outline" size="sm" onClick={sendTestOrderCompleteEmail}>
                <Mail className="mr-2 h-3.5 w-3.5" />
                Send test order-complete email
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={completedSearch} onChange={(e) => setCompletedSearch(e.target.value)} placeholder="Search completed orders by email, order ID, status, domain…" className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-none border border-border bg-card/50 p-3">
              <span className="text-xs font-medium text-muted-foreground">Requirements</span>
              <Button variant={completedReqsFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCompletedReqsFilter("all")}>All</Button>
              <Button variant={completedReqsFilter === "submitted" ? "default" : "outline"} size="sm" onClick={() => setCompletedReqsFilter("submitted")}>Reqs submitted</Button>
              <Button variant={completedReqsFilter === "waiting" ? "default" : "outline"} size="sm" onClick={() => setCompletedReqsFilter("waiting")}>Waiting</Button>
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
                        <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{new Date(o.created_at).toLocaleString()} · {o.mode}</div>
                        {o.delivered_at && <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Delivered {new Date(o.delivered_at).toLocaleString()}{o.delivered_domain ? ` · ${o.delivered_domain}` : ""}</div>}
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
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Updated {new Date(requirements.updated_at).toLocaleString()}</div>
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



          <TabsContent value="campaigns" className="min-w-0">
            <Tabs defaultValue="email" className="space-y-4">
              <TabsList className="inline-flex h-auto w-auto items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
                <TabsTrigger value="email" className="h-8 rounded-full px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm sm:text-sm">Email</TabsTrigger>
                <TabsTrigger value="sms" className="h-8 rounded-full px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm sm:text-sm">SMS</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="mt-0"><BroadcastCampaigns /></TabsContent>
              <TabsContent value="sms" className="mt-0"><SmsBroadcasts /></TabsContent>
            </Tabs>
          </TabsContent>



          <TabsContent value="falloffs" className="min-w-0 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={falloffsSearch} onChange={(e) => setFalloffsSearch(e.target.value)} placeholder="Search falloffs by company, email, IP, location, session…" className="pl-9" />
            </div>
            {filteredFalloffs.length === 0 && <p className="text-muted-foreground text-sm">No falloffs {falloffsQ ? "match your search" : "yet"}.</p>}
            <p className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
              {(sectionCounts.falloffs ?? 0) > falloffs.length ? "" : "Loaded all."}
            </p>
            <div
              className="max-h-[70vh] overflow-y-auto pr-1 space-y-3 rounded-none border border-border/40 bg-card/20 p-2"
            >
            {filteredFalloffs.map(f => (
               <Card key={f.id} className="min-w-0 overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="break-words font-medium">{f.company_name ?? f.customer_email ?? f.package_name ?? "Anonymous visitor"}</div>
                      <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{[f.company_domain, f.company_type, f.ip_city, f.ip_region, f.ip_country].filter(Boolean).join(" · ") || "Company/location unknown"}</div>
                      <div className="break-words text-muted-foreground text-slate-50 bg-white/0 text-xs">Last seen {new Date(f.last_seen_at).toLocaleString()} · {f.timezone ?? f.ip_timezone ?? "timezone unknown"}</div>
                      <div className="break-all text-muted-foreground text-slate-50 bg-white/0 text-xs">Visitor {f.visitor_id} · Session {f.session_id}</div>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 md:justify-end">
                      {((f as VisitorFalloff & { _duplicateCount?: number })._duplicateCount ?? 1) > 1 && (
                        <Badge>×{(f as VisitorFalloff & { _duplicateCount?: number })._duplicateCount} visits{(f as VisitorFalloff & { _sessionCount?: number })._sessionCount && (f as VisitorFalloff & { _sessionCount?: number })._sessionCount! > 1 ? ` · ${(f as VisitorFalloff & { _sessionCount?: number })._sessionCount} sessions` : ""}</Badge>
                      )}
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
                  <div className="grid gap-2 text-muted-foreground text-slate-50 bg-white/0 text-xs md:grid-cols-2">
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
            {(sectionCounts.falloffs ?? 0) > falloffs.length && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" size="sm" disabled={!!loadingMore.falloffs} onClick={() => loadMoreSection("falloffs", falloffs.length, 20)}>
                  {loadingMore.falloffs ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="mailbox" className="grid min-w-0 grid-cols-1 gap-4 items-start lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-3 md:max-h-[70vh] md:overflow-hidden md:flex md:flex-col md:min-h-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={mailboxSearch} onChange={(e) => setMailboxSearch(e.target.value)} placeholder="Search inbox" className="pl-9" />
                </div>
                <Button variant="outline" onClick={loadMailbox} disabled={mailboxLoading}>{mailboxLoading ? "…" : "Load"}</Button>
              </div>
              {combinedMailboxMessages.length === 0 && <p className="text-sm text-muted-foreground">Load the connected mailbox to see Pixcellor user replies and website enquiries together.</p>}
              <div className="space-y-2 max-h-[70vh] md:max-h-none md:flex-1 md:min-h-0 overflow-y-auto pr-1">
                {combinedMailboxMessages.map(message => {
                  const relatedOrder = orders.find(order => order.customer_email?.toLowerCase() === message.fromEmail);
                  const isInquiry = message.id.startsWith("inquiry:");
                  return (
                    <div key={message.id} role="button" tabIndex={0} onClick={() => setActiveMail(message)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveMail(message); } }} className={`w-full text-left p-3 rounded-none border transition-colors cursor-pointer ${activeMail?.id === message.id ? "bg-accent border-accent" : "border-border hover:bg-accent/30"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{message.from}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isInquiry && <Badge variant="secondary">Enquiry</Badge>}
                          {message.unread && !isInquiry && <Badge>New</Badge>}
                          {message.unread && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isInquiry) {
                                  markInquiryRead(message.id.replace(/^inquiry:/, ""));
                                  if (activeMail?.id === message.id) setActiveMail({ ...activeMail, unread: false });
                                } else {
                                  updateMailboxMessage(message.id, "markRead");
                                }
                              }}
                              title="Mark as read"
                              className="p-1 rounded-none border border-border hover:bg-accent"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm truncate">{message.subject}</div>
                      <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs line-clamp-2">{message.snippet}</div>
                      {relatedOrder && <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs mt-1">Linked order · {relatedOrder.amount_total != null ? formatGBP(relatedOrder.amount_total) : "—"}</div>}
                    </div>
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
                        {!activeMail.id.startsWith("inquiry:") && activeMail.unread && <Button variant="outline" size="sm" onClick={() => updateMailboxMessage(activeMail.id, "markRead")}><Check className="w-4 h-4 mr-2" />Mark read</Button>}
                        {activeMail.id.startsWith("inquiry:") && activeMail.unread && <Button variant="outline" size="sm" onClick={() => { markInquiryRead(activeMail.id.replace(/^inquiry:/, "")); setActiveMail({ ...activeMail, unread: false }); }}><Check className="w-4 h-4 mr-2" />Mark read</Button>}
                        {!activeMail.id.startsWith("inquiry:") && <Button variant="outline" size="sm" onClick={() => updateMailboxMessage(activeMail.id, "archive")}><Archive className="w-4 h-4 mr-2" />Archive</Button>}
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
            <div
              className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 rounded-none border border-border/40 bg-card/20 p-2"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs italic mt-1">No messages</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.updated_at).toLocaleString()}</div>
                  </button>
                );
              })}
              {(sectionCounts.conversations ?? 0) > conversations.length && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" disabled={!!loadingMore.conversations} onClick={() => loadMoreSection("conversations", conversations.length, 20)}>
                    {loadingMore.conversations ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
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

          <TabsContent value="profiles" className="space-y-3">
            <div className="min-w-0 space-y-2">
              <DuplicateContactsPanel contacts={contacts} onMerged={loadPortalSnapshot} />
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px] md:max-w-[65%]">
                  <Search className="pointer-events-none absolute left-3 top-[calc(50%+1px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={profilesSearch} onChange={(e) => { setProfilesSearch(e.target.value); setClientsVisibleCount(10); }} placeholder="Search the contact book by name, email, company, phone, notes…" className="pl-9" />
                </div>
                <Button onClick={openMobileContactForm} className="h-9 shrink-0">
                  <UserPlus className="w-4 h-4 mr-2" /> Add Client
                </Button>
                <FindLeadsButton onQueued={loadPortalSnapshot} />
              </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Sort:</span>
                  {([
                    { value: "newest", label: "Newest" },
                    { value: "oldest", label: "Oldest" },
                    { value: "latest_update", label: "Updated" },
                    { value: "hot", label: "Hottest" },
                    { value: "cold", label: "Coldest" },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setClientsSort(opt.value); setClientsVisibleCount(10); }}
                      className={`rounded-none border px-2 py-1 text-xs transition-colors ${clientsSort === opt.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs md:ml-2">Type:</span>
                    <button
                      type="button"
                      onClick={() => { setClientsStatusFilter("all"); setClientsVisibleCount(10); }}
                      className={`rounded-none border px-2 py-1 text-xs transition-colors ${clientsStatusFilter === "all" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      All
                    </button>
                    {contactStatuses.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => { setClientsStatusFilter(s.value as Contact["status"]); setClientsVisibleCount(10); }}
                        className={`flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs transition-colors ${clientsStatusFilter === s.value ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                      </button>
                    ))}
                    {clientsStatusFilter === "gold" && (
                      <button
                        type="button"
                        onClick={() => { setClientsRetainerOnly(v => !v); setClientsVisibleCount(10); }}
                        className={`flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs transition-colors ${clientsRetainerOnly ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        <Repeat className="h-3 w-3" />
                        On retainer ({filteredRetainers.length})
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                  {(sectionCounts.contacts ?? 0) > contacts.length || clientsVisibleCount < clientBookContacts.length ? "" : "Loaded all."}
                </p>
                {clientBookContacts.length === 0 && <p className="text-muted-foreground text-sm">No contacts {profilesQ ? "match your search" : "yet"}.</p>}
                <div
                  className="max-h-[70vh] overflow-y-auto pr-1 space-y-2 rounded-none border border-border/40 bg-card/20 p-2"
                >
                  {clientBookContacts.slice(0, clientsVisibleCount).map(c => {
                    const stats = contactOrderStatsByEmail.get(normalizeEmail(c.email) ?? "");
                    const statusColor = getContactStatusColor(c.status);
                    const statusLabel = contactStatuses.find(s => s.value === c.status)?.label ?? c.status;
                    return (
                      <Card
                        key={c.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer overflow-hidden transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        onClick={() => openContactDrawer(c.id)}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openContactDrawer(c.id); } }}
                      >
                        <CardContent className="space-y-1 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-medium">{c.name || c.email || "Unnamed contact"}</div>
                            <div className="flex items-center gap-2">
                              <Badge style={{ backgroundColor: statusColor, color: "hsl(var(--background))" }} className="rounded-none">{statusLabel}</Badge>
                              {stats && <Badge variant="outline" className="rounded-none">LTV {formatGBP(stats.ltv)}</Badge>}
                              {contactPersons.filter(p => p.contact_id === c.id).length > 0 && (
                                <Badge variant="outline" className="rounded-none">{contactPersons.filter(p => p.contact_id === c.id).length} contact{contactPersons.filter(p => p.contact_id === c.id).length === 1 ? "" : "s"}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">
                            {(() => {
                              const parts: React.ReactNode[] = [];
                              if (c.email) parts.push(
                                <a key="email" href={`mailto:${c.email}`} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.email}</a>
                              );
                              if (c.phone) parts.push(
                                <a key="phone" href={formatPhoneHref(c.phone) || undefined} className="text-primary underline-offset-4 hover:underline" onClick={(e) => e.stopPropagation()}>{c.phone}</a>
                              );
                              if (c.location) parts.push(<span key="loc">{c.location}</span>);
                              if (c.industry) parts.push(<span key="ind">{c.industry}</span>);
                              if (parts.length === 0) return "No details on file";
                              return parts.map((node, i) => (
                                <React.Fragment key={i}>
                                  {i > 0 && <span className="mx-1">·</span>}
                                  {node}
                                </React.Fragment>
                              ));
                            })()}
                          </div>
                          {c.notes && <LinkifiedText text={c.notes} className="block text-sm text-muted-foreground" stopPropagation />}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {(clientsVisibleCount < clientBookContacts.length || (sectionCounts.contacts ?? 0) > contacts.length) && (
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" disabled={!!loadingMore.contacts} onClick={() => {
                        setClientsVisibleCount((n) => n + 10);
                        if ((sectionCounts.contacts ?? 0) > contacts.length) loadMoreSection("contacts", contacts.length, 20);
                      }}>{loadingMore.contacts ? "Loading…" : "Load more"}</Button>
                    </div>
                  )}
                </div>
            </div>
          </TabsContent>

          <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Call Openers </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Quick openers for sales calls. Tap copy to grab the script.</p>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {SALES_SCRIPTS.map((script) => {
                  const isSpeaking = speakingScriptId === script.id;
                  return (
                  <Card key={script.id} className="relative rounded-none border-border/60">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium">{script.title}</h4>
                        <Button variant="outline" size="sm" className="h-8 rounded-none px-3 text-xs" onClick={() => copyToClipboard(script.body, "Script copied")}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 bg-muted/30 p-3 rounded-none border border-border/40">{script.body}</pre>
                      <div className="flex justify-end">
                        <Button
                          variant={isSpeaking ? "default" : "outline"}
                          size="sm"
                          className="h-8 rounded-none px-3 text-xs"
                          onClick={() => toggleSpeakScript(script.id, script.body)}
                          aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
                        >
                          {isSpeaking ? <><Square className="w-3.5 h-3.5 mr-1.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5 mr-1.5" /> Play</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Stats {statsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const s = statsTotals;
                return (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Total sales</CardTitle></CardHeader>
                      <CardContent><div className="text-3xl font-semibold">{s ? formatGBP(s.totalSales) : "—"}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Websites delivered (paid orders)</CardTitle></CardHeader>
                      <CardContent><div className="text-3xl font-semibold">{s ? s.totalWebsites : "—"}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Potential sales (chatted, no buy)</CardTitle></CardHeader>
                      <CardContent><div className="text-3xl font-semibold">{s ? s.potential : "—"}</div></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Website visits</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-2xl font-semibold">{s ? s.uniqueVisitors : "—"}</div>
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Visitors</div>
                        </div>
                        <div>
                          <div className="text-2xl font-semibold">{s ? s.totalVisitEvents : "—"}</div>
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Events</div>
                        </div>
                        <div>
                          <div className="text-2xl font-semibold">{s ? s.pricingViews : "—"}</div>
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Pricing opens</div>
                        </div>
                        <div>
                          <div className="text-2xl font-semibold">{s ? s.buyClicks : "—"}</div>
                          <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">Buy clicks</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

          <TabsContent value="studio" className="min-w-0">
            <VisionStudio />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">System alerts</h2>
                <p className="text-sm text-muted-foreground">Refunds, disputes, payment failures and webhook errors. Newest.</p>
              </div>
              {adminAlerts.some(a => !a.resolved_at) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const ids = adminAlerts.filter(a => !a.resolved_at).map(a => a.id);
                    await (supabase as any).from("admin_alerts").update({ resolved_at: new Date().toISOString() }).in("id", ids);
                    setAdminAlerts(prev => prev.map(a => a.resolved_at ? a : { ...a, resolved_at: new Date().toISOString() }));
                  }}
                >
                  Mark all resolved
                </Button>
              )}
            </div>
            {adminAlerts.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">No alerts. You're all clear.</Card>
            ) : (
              <div className="space-y-2">
                {adminAlerts.map(alert => {
                  const sevColor = alert.severity === "critical" ? "border-red-500/60 bg-red-500/5"
                    : alert.severity === "error" ? "border-red-400/40 bg-red-400/5"
                    : alert.severity === "warning" ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-border";
                  return (
                    <Card key={alert.id} className={`p-4 ${sevColor} ${alert.resolved_at ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-muted-foreground text-slate-50 bg-white/0 text-xs">
                            <span className="uppercase tracking-wide font-semibold">{alert.severity}</span>
                            <span>•</span>
                            <span>{alert.source}</span>
                            <span>•</span>
                            <span>{new Date(alert.created_at).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 font-medium">{alert.title}</div>
                          {alert.message && <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{alert.message}</div>}
                          {alert.context && Object.keys(alert.context).length > 0 && (
                            <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/30 p-2 text-[11px]">{JSON.stringify(alert.context, null, 2)}</pre>
                          )}
                        </div>
                        {!alert.resolved_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              await (supabase as any).from("admin_alerts").update({ resolved_at: new Date().toISOString() }).eq("id", alert.id);
                              setAdminAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved_at: new Date().toISOString() } : a));
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

        </Tabs>

      </div>

      <Drawer open={Boolean(contactDetailDrawerContact)} onOpenChange={(open) => !open && setContactDetailDrawerId(null)}>
        <DrawerContent
          className="max-h-[88dvh] border-border px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl"
          style={{
            background: `linear-gradient(135deg, ${contactDetailDrawerStatusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--background) / 0.96) 34%, hsl(var(--background) / 0.96) 100%)`,
          }}
        >
          <DrawerHeader className="relative mx-auto w-full max-w-3xl px-0 pr-24 text-left md:pr-0">
            <DrawerTitle>{contactDetailDrawerContact?.name ?? "Client"}</DrawerTitle>
            <DrawerDescription>
              {[contactDetailDrawerContact?.email, contactDetailDrawerContact?.location, contactDetailDrawerContact?.industry, contactDetailDrawerContact?.website].filter(Boolean).join(" · ") || "Sales client"}
              {contactDetailDrawerContact ? ` · ${getContactCreatorLabel(contactDetailDrawerContact)}` : ""}
            </DrawerDescription>
            {contactDetailDrawerContact && (
              <div className="absolute right-0 top-0 flex items-center gap-2 md:hidden">
                <Button variant="pricing" size="sm" className="h-9 shrink-0 rounded-none shadow-none" onClick={() => startEditingContact(contactDetailDrawerContact)}>
                  Edit
                </Button>
                <Button variant="pricing" size="sm" className="h-9 w-9 shrink-0 rounded-none px-0 shadow-none" aria-label="Create note" title="Create note" onClick={() => { openEventFormForContact(contactDetailDrawerContact.id); setContactDetailDrawerId(null); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DrawerHeader>
          {contactDetailDrawerContact && (
            <div className="mx-auto w-full max-w-3xl space-y-4 overflow-y-auto pb-2">
              <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-card/60 p-3">
                <div className="absolute left-3 bottom-3 md:left-auto md:bottom-auto md:right-3 md:top-3 flex h-9 shrink-0 items-center gap-1" aria-label="Client status">
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
                <div className="min-w-0 space-y-1 md:pr-28">
                  {contactDetailDrawerContact.phone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">Number:</span>
                      {contactDetailDrawerPhoneHref ? (
                        <a href={contactDetailDrawerPhoneHref} className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" aria-label={`Call ${contactDetailDrawerContact.phone}`} onClick={() => copyToClipboard(contactDetailDrawerContact.phone!, "Number copied")}>
                          {contactDetailDrawerContact.phone}
                        </a>
                      ) : (
                        <button type="button" className="text-sm text-muted-foreground text-left" onClick={() => copyToClipboard(contactDetailDrawerContact.phone!, "Number copied")}>{contactDetailDrawerContact.phone}</button>
                      )}
                      <Button variant="ghost" size="icon" className="hidden md:inline-flex h-6 w-6 shrink-0 rounded-none" aria-label="Copy number" title="Copy number" onClick={() => copyToClipboard(contactDetailDrawerContact.phone!, "Number copied")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {contactDetailDrawerContact.email && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <a href={`mailto:${contactDetailDrawerContact.email}`} className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" aria-label={`Email ${contactDetailDrawerContact.email}`} onClick={() => copyToClipboard(contactDetailDrawerContact.email!, "Email copied")}>
                        {contactDetailDrawerContact.email}
                      </a>
                      <Button variant="ghost" size="icon" className="hidden md:inline-flex h-6 w-6 shrink-0 rounded-none" aria-label="Copy email" title="Copy email" onClick={() => copyToClipboard(contactDetailDrawerContact.email!, "Email copied")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {contactDetailDrawerContact.contact_name && <div className="text-sm text-muted-foreground">POC: {contactDetailDrawerContact.contact_name}</div>}
                  {contactDetailDrawerContact.industry && <div className="text-sm text-muted-foreground capitalize">Industry: {contactDetailDrawerContact.industry}</div>}
                  {contactDetailDrawerContact.source_platform && <Badge variant="secondary" className="rounded-none">{contactDetailDrawerContact.source_platform}</Badge>}
                  {contactDetailDrawerContact.lead_score != null && <Badge variant="outline" className="rounded-none">Lead score {contactDetailDrawerContact.lead_score}</Badge>}
                  {contactDetailDrawerContact.website_status && contactDetailDrawerContact.website_status !== "unknown" && <Badge variant="secondary" className="rounded-none capitalize">{contactDetailDrawerContact.website_status.replace(/_/g, " ")}</Badge>}
                  {contactDetailDrawerContact.website && formatWebsiteHref(contactDetailDrawerContact.website) && <a href={formatWebsiteHref(contactDetailDrawerContact.website)!} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline mx-[10px]">{contactDetailDrawerContact.website}</a>}
                  {contactDetailDrawerContact.actual_website_url && formatWebsiteHref(contactDetailDrawerContact.actual_website_url) && <a href={formatWebsiteHref(contactDetailDrawerContact.actual_website_url)!} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary underline-offset-4 hover:underline">Actual site: {contactDetailDrawerContact.actual_website_url}</a>}
                  {contactDetailDrawerContact.social_url && formatWebsiteHref(contactDetailDrawerContact.social_url) && <a href={formatWebsiteHref(contactDetailDrawerContact.social_url)!} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-primary underline-offset-4 hover:underline">Social: {contactDetailDrawerContact.social_url}</a>}
                  {contactDetailDrawerContact.lead_score_reason && <LinkifiedText text={contactDetailDrawerContact.lead_score_reason} className="block text-sm text-muted-foreground" />}
                  {contactDetailDrawerContact.notes && <LinkifiedText text={contactDetailDrawerContact.notes} className="block text-sm text-muted-foreground" />}
                  <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{getContactCreatorLabel(contactDetailDrawerContact)} · {new Date(contactDetailDrawerContact.created_at).toLocaleString()}</div>
                  {contactDetailDrawerOrderStats && <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">LTV {formatGBP(contactDetailDrawerOrderStats.ltv)} · {contactDetailDrawerOrderStats.orders.length} order{contactDetailDrawerOrderStats.orders.length === 1 ? "" : "s"}</div>}
                </div>
                <div className="flex w-full items-center justify-end gap-2 overflow-x-auto md:w-auto md:flex-wrap md:overflow-visible text-left">
                  <Button
                    variant="pricing"
                    size="sm"
                    className="hidden md:inline-flex h-9 shrink-0 rounded-none shadow-none"
                    onClick={() => sendSalesFollowup(contactDetailDrawerContact)}
                    disabled={!contactDetailDrawerContact.email || salesFollowupSendingFor === contactDetailDrawerContact.id}
                    title="Send sales call follow up"
                  >
                    {salesFollowupSendingFor === contactDetailDrawerContact.id ? (
                      <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">Sales follow up</span>
                  </Button>
                  <Button variant="pricing" size="sm" className="hidden md:inline-flex h-9 w-9 shrink-0 rounded-none px-0 shadow-none md:w-auto md:px-3" aria-label="Create note" title="Create note" onClick={() => { openEventFormForContact(contactDetailDrawerContact.id); setContactDetailDrawerId(null); }}>
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Create note</span>
                  </Button>
                  <Button variant="pricing" size="sm" className="h-9 shrink-0 rounded-none shadow-none" onClick={() => openPersonDrawerForContact(contactDetailDrawerContact.id)}>
                    <UserPlus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Add contact</span>
                  </Button>
                  <Button asChild variant="pricing" size="sm" className="h-9 shrink-0 rounded-none shadow-none cursor-pointer">
                    <label>
                      {mediaUploadingFor === contactDetailDrawerContact.id ? (
                        <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                      ) : (
                        <ImagePlus className="h-4 w-4 md:mr-2" />
                      )}
                      <span className="hidden md:inline">Add media</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={mediaUploadingFor === contactDetailDrawerContact.id}
                        onChange={(e) => {
                          uploadContactMedia(contactDetailDrawerContact.id, e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </Button>
                  <Button variant="pricing" size="sm" className="h-9 shrink-0 rounded-none shadow-none" onClick={() => startEditingContact(contactDetailDrawerContact)}>
                    <Pencil className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Edit</span>
                  </Button>
                  <Button variant="pricing" size="icon" className="h-9 w-9 shrink-0 rounded-none shadow-none" aria-label="Archive client" title="Archive client" onClick={() => archiveContact(contactDetailDrawerContact.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingContactId === contactDetailDrawerContact.id && (
                <div className="grid grid-cols-1 gap-3 rounded-none border border-border p-3 md:grid-cols-2">
                  <Input placeholder="Company name" value={editContactForm.name} onChange={(e) => setEditContactForm(f => ({ ...f, name: e.target.value }))} />
                  <Input placeholder="Phone number" value={editContactForm.phone} onChange={(e) => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input placeholder="Email" value={editContactForm.email} onChange={(e) => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
                  <Input placeholder="Location" value={editContactForm.location} onChange={(e) => setEditContactForm(f => ({ ...f, location: e.target.value }))} />
                  <Input placeholder="Industry" value={editContactForm.industry} onChange={(e) => setEditContactForm(f => ({ ...f, industry: e.target.value }))} />
                  <Input placeholder="Website domain" value={editContactForm.website} onChange={(e) => setEditContactForm(f => ({ ...f, website: e.target.value }))} />
                  <Input placeholder="Contact name" value={editContactForm.contact_name} onChange={(e) => setEditContactForm(f => ({ ...f, contact_name: e.target.value }))} />
                  <Input placeholder="Job title" value={editContactForm.job_title} onChange={(e) => setEditContactForm(f => ({ ...f, job_title: e.target.value }))} />
                  <Textarea
                    className="md:col-span-2"
                    rows={3}
                    placeholder="Notes about this client (internal)"
                    value={editContactForm.notes}
                    onChange={(e) => setEditContactForm(f => ({ ...f, notes: e.target.value }))}
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <Button onClick={updateContact}>Save changes</Button>
                    <Button variant="outline" className="rounded-none shadow-none" onClick={() => setEditingContactId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Contacts ({contactPersons.filter(p => p.contact_id === contactDetailDrawerContact.id).length})</div>
                  <Button size="sm" variant="outline" className="h-8 rounded-none" onClick={() => openPersonDrawerForContact(contactDetailDrawerContact.id)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Add contact
                  </Button>
                </div>
                {contactPersons.filter(p => p.contact_id === contactDetailDrawerContact.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No contact people added yet.</p>
                )}
                {contactPersons.filter(p => p.contact_id === contactDetailDrawerContact.id).map(person => (
                  <div key={person.id} className="flex items-start justify-between gap-2 rounded-none border border-border bg-card/60 p-3 text-sm">
                    <div className="min-w-0 space-y-1">
                      <div className="font-medium">{person.name}</div>
                      {person.job_title && <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{person.job_title}</div>}
                      {person.phone && (
                        <div className="flex items-center gap-1.5">
                          <a href={`tel:${person.phone}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => copyToClipboard(person.phone!, "Number copied")}>{person.phone}</a>
                          <Button variant="ghost" size="icon" className="hidden md:inline-flex h-6 w-6 shrink-0 rounded-none" aria-label="Copy number" title="Copy number" onClick={() => copyToClipboard(person.phone!, "Number copied")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {person.email && (
                        <div className="flex items-center gap-1.5">
                          <a href={`mailto:${person.email}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline break-all" onClick={() => copyToClipboard(person.email!, "Email copied")}>{person.email}</a>
                          <Button variant="ghost" size="icon" className="hidden md:inline-flex h-6 w-6 shrink-0 rounded-none" aria-label="Copy email" title="Copy email" onClick={() => copyToClipboard(person.email!, "Email copied")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Remove" onClick={() => deleteContactPerson(person.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Media ({(contactDetailDrawerContact.media ?? []).length})</div>
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-none cursor-pointer">
                    <label>
                      {mediaUploadingFor === contactDetailDrawerContact.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5 mr-1" />
                      )}
                      Add media
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={mediaUploadingFor === contactDetailDrawerContact.id}
                        onChange={(e) => {
                          uploadContactMedia(contactDetailDrawerContact.id, e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </Button>
                </div>
                {(contactDetailDrawerContact.media ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {(contactDetailDrawerContact.media ?? []).map(url => (
                      <div key={url} className="group relative aspect-square overflow-hidden rounded-none border border-border bg-muted">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="Client media" className="h-full w-full object-cover" loading="lazy" />
                        </a>
                        <button
                          type="button"
                          onClick={() => removeContactMedia(contactDetailDrawerContact.id, url)}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {contactDetailDrawerOrderStats && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Order history</div>
                  {contactDetailDrawerOrderStats.orders.map(order => {
                    const requirements = requirementsBySession.get(order.session_id);
                    return (
                      <div key={order.session_id} className="rounded-none border border-border bg-card/60 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{order.amount_total != null ? formatGBP(order.amount_total) : "—"}</span>
                          <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{new Date(order.created_at).toLocaleString()}</span>
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
                      <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                    <LinkifiedText text={message.content} className="block mt-1 whitespace-pre-wrap text-muted-foreground" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Client history</div>
                {contactDetailDrawerEvents.length === 0 && <p className="text-sm text-muted-foreground">No communications logged.</p>}
                {contactDetailDrawerEvents.map(e => (
                  <div key={e.id} className="rounded-none border border-border bg-card/60 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{e.title}</span>
                      <span className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{new Date(e.created_at).toLocaleString()} · {getEventAuthorLabel(e)}</span>
                    </div>
                    {e.description && <LinkifiedText text={e.description} className="block mt-1 whitespace-pre-wrap" />}
                    {e.callback_at && <div className="mt-1 text-muted-foreground text-slate-50 bg-white/0 text-xs">Let's Talk: {new Date(e.callback_at).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(personDrawerContactId)} onOpenChange={(open) => !open && setPersonDrawerContactId(null)}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Add contact person</DrawerTitle>
            <DrawerDescription>{getContact(personDrawerContactId ?? "")?.name ?? ""}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3">
            <Input autoFocus placeholder="Contact name *" value={personForm.name} onChange={(e) => setPersonForm(f => ({ ...f, name: e.target.value }))} className="h-12 text-base" />
            <Input placeholder="Job title" value={personForm.job_title} onChange={(e) => setPersonForm(f => ({ ...f, job_title: e.target.value }))} className="h-12 text-base" />
            <Input placeholder="Phone (optional)" inputMode="tel" value={personForm.phone} onChange={(e) => setPersonForm(f => ({ ...f, phone: e.target.value }))} className="h-12 text-base" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none" onClick={() => setPersonDrawerContactId(null)}>Cancel</Button>
              <Button onClick={createContactPerson} disabled={personSubmitting}>{personSubmitting ? "Saving…" : "Save contact"}</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobileContactDrawerOpen} onOpenChange={setMobileContactDrawerOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Create client</DrawerTitle>
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
                      if (currentContactField.key === "job_title") setContactJobTitleSuggestionsOpen(Boolean(e.target.value.trim()));
                    }}
                    onFocus={() => {
                      if (currentContactField.key === "job_title") setContactJobTitleSuggestionsOpen(Boolean(contactForm.job_title.trim()));
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
              {currentContactField.key === "name" && contactForm.name.trim() && (
                <Button type="button" variant="outline" className="w-full rounded-none" onClick={addContactFromWizard}>
                  <UserPlus className="mr-2 h-4 w-4" /> Save & add contact person
                </Button>
              )}
              {currentContactField.key === "job_title" && contactJobTitleSuggestionsOpen && renderJobTitleSuggestionList()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none shadow-none" onClick={() => mobileContactStep > 0 ? setMobileContactStep(step => step - 1) : setMobileContactDrawerOpen(false)}>
                {mobileContactStep > 0 ? "Back" : "Cancel"}
              </Button>
              <Button disabled={contactSubmitting} onClick={() => continueMobileContact()}>{mobileContactStep === contactWizardFields.length - 1 ? (contactSubmitting ? "Saving…" : "Save") : "Next"}</Button>
              {!currentContactField.required && (
                <Button variant="ghost" className="col-span-2" onClick={() => continueMobileContact(true)}>Skip</Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobileSalesDrawerOpen} onOpenChange={setMobileSalesDrawerOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Create follow-up</DrawerTitle>
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
                 <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input type="datetime-local" value={eventForm.callback_at} onChange={(e) => setEventForm(f => ({ ...f, callback_at: e.target.value }))} className="h-12 text-base" />
                    <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteMobileSalesField} aria-label={`Paste ${currentSalesField.label}`}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Arrange call back</p>
                    <div className="grid grid-cols-6 gap-2">
                      {callbackPresets.map(preset => (
                        <Button key={preset.label} type="button" variant="outline" className="h-10 px-0 text-sm" onClick={() => applyCallbackPreset(preset.label)}>
                          {preset.label}
                        </Button>
                      ))}
                    </div>
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
            <DrawerTitle>Orders</DrawerTitle>
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
                    <div className="text-muted-foreground text-slate-50 bg-white/0 text-xs">{new Date(o.created_at).toLocaleString()}</div>
                    <div className="text-xl font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>{o.payment_status ?? "pending"}</Badge>
                    <Badge variant="outline">Orders</Badge>
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
            Client
          </Button>
          <Button variant={mobileOrdersDrawerOpen || activeTab === "orders" ? "default" : "ghost"} size="sm" onClick={openMobileOrders} className="h-14 flex-col gap-1 px-1 text-[10px]">
            <ShoppingBag className="h-4 w-4" />
            Orders
          </Button>
        </div>
      </nav>
      {domainPromptDialog}
      <NewOrderDialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog} onCreated={loadPortalSnapshot} />
    </div>
  );
}
