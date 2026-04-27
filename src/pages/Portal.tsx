import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Archive, Mail, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PORTAL_ACCESS_CODE, PORTAL_ACCESS_STORAGE_KEY } from "./PortalAuth";

type StripeSession = {
  session_id: string;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  status: string | null;
  order_status?: string | null;
  delivered_at?: string | null;
  customer_email: string | null;
  mode: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

// ONLY include orders explicitly stamped by this website's checkout.
// All legacy/external Stripe activity is excluded.
const isSiteOrder = (o: StripeSession) => {
  const source = (o.metadata as { source?: string } | null)?.source;
  return source === "pixcellor_site";
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
  notes: string | null;
  status: "cold" | "aware" | "warm" | "hot" | "gold";
  source: string;
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

  if (totalMinutes < 1) return diffMs < 0 ? "Due now" : "Under 1m left";
  return diffMs < 0 ? `Overdue by ${parts}` : `${parts} left`;
};

const callbackPresets = [
  { label: "1 day", getDate: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  { label: "1w", getDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { label: "2w", getDate: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  { label: "1m", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
  { label: "3m", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; } },
  { label: "1y", getDate: () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d; } },
];

const contactStatuses = [
  { value: "cold", label: "Cold", color: "hsl(217 91% 60%)" },
  { value: "aware", label: "Aware", color: "hsl(142 71% 45%)" },
  { value: "warm", label: "Warm", color: "hsl(32 95% 44%)" },
  { value: "hot", label: "Hot", color: "hsl(0 84% 60%)" },
  { value: "gold", label: "Client", color: "hsl(45 93% 47%)" },
] as const;

const getContactStatusColor = (status: Contact["status"]) =>
  contactStatuses.find(item => item.value === status)?.color ?? "hsl(var(--muted))";

export default function Portal() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState("");
  const [portalAccessCode] = useState(() => sessionStorage.getItem(PORTAL_ACCESS_STORAGE_KEY) ?? "");

  const [orders, setOrders] = useState<StripeSession[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactEvents, setContactEvents] = useState<ContactEvent[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [salesSearch, setSalesSearch] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsStatusFilter, setContactsStatusFilter] = useState<"all" | Contact["status"]>("all");
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSalesEventForm, setShowSalesEventForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", location: "", notes: "" });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ name: "", phone: "", email: "", location: "", notes: "" });
  const [eventForm, setEventForm] = useState({ contact_id: "", title: "", description: "", callback_at: "" });
  const [eventContactSearch, setEventContactSearch] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [manualReply, setManualReply] = useState("");
  const [mailboxMessages, setMailboxMessages] = useState<MailboxMessage[]>([]);
  const [mailboxSearch, setMailboxSearch] = useState("");
  const [activeMail, setActiveMail] = useState<MailboxMessage | null>(null);
  const [mailReply, setMailReply] = useState("");
  const [mailboxLoading, setMailboxLoading] = useState(false);

  const loadPortalSnapshot = useCallback(async () => {
    const { data, error } = await (supabase as any).rpc("portal_fetch_snapshot", { _access_code: portalAccessCode });
    if (error) {
      setAuthError(error.message);
      return;
    }
    const snapshot = (data ?? {}) as {
      orders?: StripeSession[];
      conversations?: Conversation[];
      messages?: Message[];
      profiles?: Profile[];
      inquiries?: Inquiry[];
      contacts?: Contact[];
      contactEvents?: ContactEvent[];
    };
    setOrders((snapshot.orders ?? []).filter(isSiteOrder));
    const convs = snapshot.conversations ?? [];
    const allMsgs = snapshot.messages ?? [];
    setProfiles(snapshot.profiles ?? []);
    setInquiries(snapshot.inquiries ?? []);
    setContacts(snapshot.contacts ?? []);
    setContactEvents(snapshot.contactEvents ?? []);
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
  }, [portalAccessCode]);

  // Access-code gate
  useEffect(() => {
    if (portalAccessCode !== PORTAL_ACCESS_CODE) {
      setIsAdmin(false);
      setAuthChecked(true);
      navigate("/portal-login", { replace: true });
      return;
    }
    setIsAdmin(true);
    setAuthChecked(true);
  }, [navigate, portalAccessCode]);

  // Initial load + realtime
  useEffect(() => {
    if (!isAdmin) return;

    loadPortalSnapshot();

    const channel = supabase
      .channel("portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_checkout_sessions" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, loadPortalSnapshot)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        if (activeConv) loadMessages(activeConv);
        loadPortalSnapshot();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_profiles" }, loadPortalSnapshot)
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

  const loadMessages = async (conversationId: string) => {
    setActiveConv(conversationId);
    setManualReply("");
    const { data, error } = await (supabase as any).rpc("portal_fetch_messages", { _access_code: portalAccessCode, _conversation_id: conversationId });
    if (error) toast.error(error.message);
    else setMessages((data ?? []) as Message[]);
  };

  const loadMailbox = async () => {
    setMailboxLoading(true);
    const { data, error } = await supabase.functions.invoke("mailbox", {
      body: { accessCode: portalAccessCode, action: "list", query: mailboxSearch.trim() || undefined },
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
      _access_code: portalAccessCode,
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
      _access_code: portalAccessCode,
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
    const paidOrders = orders.filter(o => o.payment_status === "paid" || o.status === "complete");
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.amount_total ?? 0), 0);
    const totalWebsites = paidOrders.length;

    // Potential = chatters who haven't bought
    const buyerEmails = new Set(
      paidOrders.map(o => o.customer_email?.toLowerCase()).filter(Boolean) as string[]
    );
    const profileEmails = profiles.map(p => p.email.toLowerCase());
    const inquiryEmails = inquiries.map(i => i.email.toLowerCase());
    const allLeads = new Set([...profileEmails, ...inquiryEmails]);
    let potential = 0;
    for (const email of allLeads) if (!buyerEmails.has(email)) potential += 1;
    // Add anonymous chatters with no email at all
    const conversationsWithoutEmail = conversations.length - allLeads.size;
    if (conversationsWithoutEmail > 0) potential += conversationsWithoutEmail;

    return { totalSales, totalWebsites, potential };
  }, [orders, profiles, inquiries, conversations]);

  // Global search across all data
  const q = search.trim().toLowerCase();
  const salesQ = salesSearch.trim().toLowerCase();
  const contactsQ = contactsSearch.trim().toLowerCase();
  const matches = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);
  const matchesQuery = (query: string, s: string | null | undefined) => !!s && s.toLowerCase().includes(query);

  const filteredOrders = useMemo(() => {
    if (!q) return orders;
    return orders.filter(o =>
      matches(o.customer_email) ||
      matches(o.session_id) ||
      matches(o.payment_status) ||
      matches(o.status) ||
      matches(o.currency) ||
      matches(JSON.stringify(o.metadata))
    );
  }, [orders, q]);

  const filteredProfiles = useMemo(() => {
    if (!q) return profiles;
    return profiles.filter(p =>
      matches(p.email) || matches(p.name) || matches(p.company) ||
      matches(p.brand_colours) || matches(p.requirements) ||
      matches(p.content_notes) || matches(p.notes) ||
      matches(p.page_count?.toString())
    );
  }, [profiles, q]);

  const filteredInquiries = useMemo(() => {
    if (!q) return inquiries;
    return inquiries.filter(i =>
      matches(i.name) || matches(i.email) || matches(i.message)
    );
  }, [inquiries, q]);

  const filteredContacts = useMemo(() => {
    if (!q) return contacts;
    const matchingContactIds = new Set(
      contactEvents.filter(e => matches(e.title) || matches(e.description) || matches(e.event_type) || matches(e.callback_at)).map(e => e.contact_id)
    );
    return contacts.filter(c =>
      matches(c.name) || matches(c.phone) || matches(c.email) ||
      matches(c.location) || matches(c.notes) || matchingContactIds.has(c.id)
    );
  }, [contacts, contactEvents, q]);

  const filteredContactEvents = useMemo(() => {
    if (!q) return contactEvents;
    const contactIds = new Set(filteredContacts.map(c => c.id));
    return contactEvents.filter(e =>
      contactIds.has(e.contact_id) || matches(e.title) || matches(e.description) ||
      matches(e.event_type) || matches(e.callback_at)
    );
  }, [contactEvents, filteredContacts, q]);

  const searchedContacts = useMemo(() => {
    const statusFiltered = contactsStatusFilter === "all" ? filteredContacts : filteredContacts.filter(c => c.status === contactsStatusFilter);
    if (!contactsQ) return statusFiltered;
    const matchingContactIds = new Set(
      contactEvents
        .filter(e => matchesQuery(contactsQ, e.title) || matchesQuery(contactsQ, e.description) || matchesQuery(contactsQ, e.event_type) || matchesQuery(contactsQ, e.callback_at))
        .map(e => e.contact_id)
    );
    return statusFiltered.filter(c =>
      matchesQuery(contactsQ, c.name) || matchesQuery(contactsQ, c.phone) || matchesQuery(contactsQ, c.email) ||
      matchesQuery(contactsQ, c.location) || matchesQuery(contactsQ, c.notes) || matchesQuery(contactsQ, c.status) || matchingContactIds.has(c.id)
    );
  }, [filteredContacts, contactEvents, contactsQ, contactsStatusFilter]);

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

  const openEventFormForContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    setEventForm({ contact_id: contactId, title: "", description: "", callback_at: "" });
    setEventContactSearch(contact ? `${contact.name}${contact.email ? ` · ${contact.email}` : ""}` : "");
    setShowSalesEventForm(true);
  };

  const handleEventContactSearch = (value: string) => {
    setEventContactSearch(value);
    const contact = contacts.find(c => `${c.name}${c.email ? ` · ${c.email}` : ""}` === value || c.name === value || c.email === value);
    setEventForm(f => ({ ...f, contact_id: contact?.id ?? "" }));
  };

  const startEditingContact = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditContactForm({
      name: contact.name,
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      location: contact.location ?? "",
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
    sessionStorage.removeItem(PORTAL_ACCESS_STORAGE_KEY);
    navigate("/portal-login", { replace: true });
  };

  const createContact = async () => {
    const name = contactForm.name.trim();
    if (!name) {
      toast.error("Contact name is required.");
      return;
    }
    const { error } = await (supabase as any).rpc("portal_create_contact", {
      _access_code: portalAccessCode,
      _name: name,
      _phone: contactForm.phone,
      _email: contactForm.email,
      _location: contactForm.location,
      _notes: contactForm.notes,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setContactForm({ name: "", phone: "", email: "", location: "", notes: "" });
    setShowContactForm(false);
    await loadPortalSnapshot();
    toast.success("Contact added.");
  };

  const updateContact = async () => {
    if (!editingContactId) return;
    const name = editContactForm.name.trim();
    if (!name) {
      toast.error("Contact name is required.");
      return;
    }
    const { error } = await (supabase as any).rpc("portal_update_contact", {
      _access_code: portalAccessCode,
      _contact_id: editingContactId,
      _name: name,
      _phone: editContactForm.phone,
      _email: editContactForm.email,
      _location: editContactForm.location,
      _notes: editContactForm.notes,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingContactId(null);
    setEditContactForm({ name: "", phone: "", email: "", location: "", notes: "" });
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
    const { error } = await (supabase as any).rpc("portal_create_contact_event", {
      _access_code: portalAccessCode,
      _contact_id: eventForm.contact_id,
      _title: title,
      _description: eventForm.description,
      _callback_at: eventForm.callback_at ? new Date(eventForm.callback_at).toISOString() : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpenContactId(selectedContactId);
    setEventForm({ contact_id: "", title: "", description: "", callback_at: "" });
    setEventContactSearch("");
    setShowSalesEventForm(false);
    await loadPortalSnapshot();
    toast.success(hasCallback ? "Callback scheduled." : "Event logged in contact history.");
  };

  const completeCallback = async (eventId: string) => {
    const { error } = await (supabase as any).rpc("portal_complete_callback", { _access_code: portalAccessCode, _event_id: eventId });
    if (error) toast.error(error.message);
    else {
      await loadPortalSnapshot();
      toast.success("Callback marked done.");
    }
  };

  const updateContactStatus = async (contactId: string, status: Contact["status"]) => {
    setContacts(current => current.map(contact => contact.id === contactId ? { ...contact, status } : contact));
    const { error } = await (supabase as any).rpc("portal_update_contact_status", {
      _access_code: portalAccessCode,
      _contact_id: contactId,
      _status: status,
    });
    if (error) {
      toast.error(error.message);
      await loadPortalSnapshot();
    }
  };

  const markOrderDelivered = async (sessionId: string) => {
    const { error } = await (supabase as any).rpc("portal_mark_order_delivered", {
      _access_code: portalAccessCode,
      _session_id: sessionId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await loadPortalSnapshot();
    toast.success("Order marked delivered.");
  };

  // Conversations match if client_id matches OR any message in them matches
  const filteredConversations = useMemo(() => {
    if (!q) return conversations;
    const matchingConvIds = new Set(
      allMessages.filter(m => matches(m.content) || matches(m.role)).map(m => m.conversation_id)
    );
    return conversations.filter(c => matches(c.client_id) || matchingConvIds.has(c.id));
  }, [conversations, allMessages, q]);

  const eventFormCard = showSalesEventForm && (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Input
            list="portal-contact-options"
            placeholder="Search contact"
            value={eventContactSearch}
            onChange={(e) => handleEventContactSearch(e.target.value)}
          />
          <datalist id="portal-contact-options">
            {contacts.map(c => <option key={c.id} value={`${c.name}${c.email ? ` · ${c.email}` : ""}`}>{[c.phone, c.location].filter(Boolean).join(" · ")}</option>)}
          </datalist>
        </div>
        <Input placeholder="Event title" value={eventForm.title} onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} />
        <Input className="md:col-span-2" placeholder="Event description" value={eventForm.description} onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} />
        <div>
          <label className="text-xs text-muted-foreground">Optional callback date</label>
          <Input type="datetime-local" value={eventForm.callback_at} onChange={(e) => setEventForm(f => ({ ...f, callback_at: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Quick callback</label>
          <select defaultValue="" onChange={(e) => applyCallbackPreset(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Pick time</option>
            {callbackPresets.map(preset => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={createContactEvent}>Save event</Button>
          <Button variant="outline" onClick={() => setShowSalesEventForm(false)}>Cancel</Button>
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

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Pixcellor Dev Portal</h1>
          <Button variant="outline" size="sm" onClick={exitPortal}>
            Lock portal
          </Button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Global search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search everything — emails, names, chat messages, order IDs, notes…"
            className="pl-9"
          />
          {q && (
            <p className="text-xs text-muted-foreground mt-1">
              {filteredOrders.length} orders · {filteredConversations.length} chats · {filteredProfiles.length} clients · {filteredInquiries.length} inquiries · {filteredContacts.length} contacts
            </p>
          )}
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full md:w-auto h-auto">
            <TabsTrigger value="sales">Sales ({callbacks.length})</TabsTrigger>
            <TabsTrigger value="orders">Orders ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="chats">Chats ({filteredConversations.length})</TabsTrigger>
            <TabsTrigger value="profiles">Clients ({filteredProfiles.length})</TabsTrigger>
            <TabsTrigger value="inquiries">Enquiries ({filteredInquiries.length})</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({filteredContacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sales follow-ups</h2>
                <p className="text-sm text-muted-foreground">Log contact events and keep future callbacks visible.</p>
              </div>
              <Button onClick={() => setShowSalesEventForm(v => !v)} disabled={contacts.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Create event
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Search sales callbacks by contact, title, notes, phone, email…"
                className="pl-9"
              />
            </div>

            {contacts.length === 0 && <p className="text-sm text-muted-foreground">Add a contact first, then you can create sales events.</p>}

            {eventFormCard}

            <div className="space-y-2">
              <h3 className="font-medium">Callbacks waiting</h3>
              {salesCallbacks.length === 0 && <p className="text-sm text-muted-foreground">No callbacks waiting{salesQ ? " match your search" : ""}.</p>}
              {salesCallbacks.map(e => {
                const contact = getContact(e.contact_id);
                const isOverdue = new Date(e.callback_at!).getTime() <= nowMs;
                const statusColor = contact ? getContactStatusColor(contact.status) : "hsl(var(--muted))";
                return (
                  <Card
                    key={e.id}
                    className="overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${statusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--card)) 34%, hsl(var(--card)) 100%)`,
                    }}
                  >
                    <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{contact?.name ?? "Unknown contact"} · {new Date(e.callback_at!).toLocaleString()}</div>
                        {e.description && <div className="text-sm whitespace-pre-wrap">{e.description}</div>}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>{formatCountdown(e.callback_at!, nowMs)}</Badge>
                        <Button variant="outline" size="sm" onClick={() => completeCallback(e.id)}>Done</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-2">
            {filteredOrders.length === 0 && <p className="text-muted-foreground text-sm">No orders {q ? "match your search" : "yet"}.</p>}
            {filteredOrders.map(o => (
              <Card key={o.session_id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
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
                      {o.order_status === "delivered" ? "Delivered" : "Open"}
                    </Badge>
                    <div className="text-lg font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
                    {o.order_status !== "delivered" && (
                      <Button variant="outline" size="sm" onClick={() => markOrderDelivered(o.session_id)}>
                        Mark delivered
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="chats" className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredConversations.length === 0 && <p className="text-muted-foreground text-sm">No conversations {q ? "match your search" : "yet"}.</p>}
              {filteredConversations.map(c => {
                const last = lastMessages[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => loadMessages(c.id)}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${activeConv === c.id ? "bg-accent border-accent" : "border-border hover:bg-accent/30"}`}
                  >
                    <div className="text-xs font-mono truncate text-muted-foreground">{c.client_id}</div>
                    {last ? (
                      <div className="text-sm mt-1 line-clamp-2">
                        <span className="text-muted-foreground">{last.role === "user" ? "👤" : "🤖"} </span>
                        {last.content}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic mt-1">No messages</div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.updated_at).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
            <Card className="max-h-[70vh] overflow-hidden flex flex-col">
              <CardContent className="p-4 overflow-y-auto space-y-3 flex-1">
                {!activeConv && <p className="text-muted-foreground text-sm">Pick a conversation to view messages.</p>}
                {activeConv && messages.length === 0 && <p className="text-muted-foreground text-sm">No messages.</p>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : m.role === "admin" ? "bg-accent text-accent-foreground border border-border" : "bg-muted text-foreground"}`}>
                      <div className="text-xs opacity-60 mb-1">{m.role} · {new Date(m.created_at).toLocaleTimeString()}</div>
                      {m.content}
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
            {filteredProfiles.length === 0 && <p className="text-muted-foreground text-sm">No client profiles {q ? "match your search" : "yet"}.</p>}
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
                    {p.requirements && <div className="md:col-span-2"><span className="text-muted-foreground">Requirements:</span> {p.requirements}</div>}
                    {p.content_notes && <div className="md:col-span-2"><span className="text-muted-foreground">Content:</span> {p.content_notes}</div>}
                    {p.notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {p.notes}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="inquiries" className="space-y-2">
            {filteredInquiries.length === 0 && <p className="text-muted-foreground text-sm">No inquiries {q ? "match your search" : "yet"}.</p>}
            {filteredInquiries.map(i => (
              <Card key={i.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between">
                    <div className="font-medium">{i.name} · <span className="text-muted-foreground">{i.email}</span></div>
                    <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{i.message}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Contact book</h2>
              <Button onClick={() => setShowContactForm(v => !v)}><Plus className="w-4 h-4 mr-2" /> Add contact</Button>
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

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={contactsStatusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setContactsStatusFilter("all")}>All</Button>
              {contactStatuses.map(status => (
                <Button
                  key={status.value}
                  variant={contactsStatusFilter === status.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContactsStatusFilter(status.value)}
                  className="gap-2"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                  {status.label}
                </Button>
              ))}
            </div>

            {showContactForm && (
              <Card>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))} />
                  <Input placeholder="Phone number" value={contactForm.phone} onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))} />
                  <Input placeholder="Location" value={contactForm.location} onChange={(e) => setContactForm(f => ({ ...f, location: e.target.value }))} />
                  <Input className="md:col-span-2" placeholder="Notes" value={contactForm.notes} onChange={(e) => setContactForm(f => ({ ...f, notes: e.target.value }))} />
                  <div className="md:col-span-2 flex gap-2">
                    <Button onClick={createContact}>Save contact</Button>
                    <Button variant="outline" onClick={() => setShowContactForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventFormCard}

            {searchedContacts.length === 0 && <p className="text-muted-foreground text-sm">No contacts {q || contactsQ ? "match your search" : "yet"}.</p>}
            {searchedContacts.map(c => {
              const events = filteredContactEvents.filter(e => e.contact_id === c.id);
              const isOpen = openContactId === c.id;
              const statusColor = getContactStatusColor(c.status);
              return (
                <Card
                  key={c.id}
                  className="overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${statusColor.replace("hsl(", "hsl(").replace(")", " / 0.18)")} 0%, hsl(var(--card)) 34%, hsl(var(--card)) 100%)`,
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button type="button" onClick={() => setOpenContactId(isOpen ? null : c.id)} className="text-left flex-1 min-w-[180px]">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{[c.phone, c.email, c.location].filter(Boolean).join(" · ") || "No details added"}</div>
                      </button>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="flex items-center gap-1" aria-label="Contact status">
                          {contactStatuses.map(status => (
                            <button
                              key={status.value}
                              type="button"
                              title={status.label}
                              aria-label={status.label}
                              onClick={() => updateContactStatus(c.id, status.value)}
                              className={`h-5 w-5 rounded-full border transition-opacity ${c.status === status.value ? "border-foreground opacity-100" : "border-border opacity-55"}`}
                              style={{ backgroundColor: status.color }}
                            />
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => startEditingContact(c)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => openEventFormForContact(c.id)}>Create event</Button>
                        <Badge variant="secondary">{events.length} logs</Badge>
                      </div>
                    </div>
                    {editingContactId === c.id && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md border border-border p-3">
                        <Input placeholder="Name" value={editContactForm.name} onChange={(e) => setEditContactForm(f => ({ ...f, name: e.target.value }))} />
                        <Input placeholder="Phone number" value={editContactForm.phone} onChange={(e) => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
                        <Input placeholder="Email" value={editContactForm.email} onChange={(e) => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
                        <Input placeholder="Location" value={editContactForm.location} onChange={(e) => setEditContactForm(f => ({ ...f, location: e.target.value }))} />
                        <Input className="md:col-span-2" placeholder="Notes" value={editContactForm.notes} onChange={(e) => setEditContactForm(f => ({ ...f, notes: e.target.value }))} />
                        <div className="md:col-span-2 flex gap-2">
                          <Button onClick={updateContact}>Save changes</Button>
                          <Button variant="outline" onClick={() => setEditingContactId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {c.notes && <div className="text-sm whitespace-pre-wrap">{c.notes}</div>}
                    {isOpen && <div className="border-t border-border pt-3 space-y-2">
                      {events.length === 0 && <p className="text-xs text-muted-foreground">No communications logged.</p>}
                      {events.map(e => (
                        <div key={e.id} className="text-sm rounded-md bg-muted p-3">
                          <div className="flex flex-wrap justify-between gap-2">
                            <span className="font-medium">{e.title}</span>
                            <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                          </div>
                          {e.description && <div className="whitespace-pre-wrap mt-1">{e.description}</div>}
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

        <p className="text-xs text-muted-foreground text-center pt-4">
          Manage project stages at <a href="/admin" className="underline">/admin</a>
        </p>
      </div>
    </div>
  );
}
