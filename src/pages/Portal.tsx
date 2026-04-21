import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { toast } from "sonner";

type StripeSession = {
  session_id: string;
  amount_total: number | null;
  currency: string | null;
  payment_status: string | null;
  status: string | null;
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

const formatGBP = (pence: number) => `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

export default function Portal() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [orders, setOrders] = useState<StripeSession[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Auth gate
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        navigate("/portal-login");
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/portal-login");
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(!!data);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Initial load + realtime
  useEffect(() => {
    if (!isAdmin) return;

    const load = async () => {
      const [o, c, p, i] = await Promise.all([
        supabase.from("stripe_checkout_sessions").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_conversations").select("*").order("updated_at", { ascending: false }),
        supabase.from("client_profiles").select("*").order("updated_at", { ascending: false }),
        supabase.from("contact_inquiries").select("*").order("created_at", { ascending: false }),
      ]);
      setOrders(((o.data ?? []) as StripeSession[]).filter(isSiteOrder));
      const convs = (c.data ?? []) as Conversation[];
      setProfiles((p.data ?? []) as Profile[]);
      setInquiries((i.data ?? []) as Inquiry[]);

      // Fetch the latest message per conversation for previews
      let sortedConvs = convs;
      if (convs.length > 0) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .in("conversation_id", convs.map(c => c.id))
          .order("created_at", { ascending: false });
        const allMsgs = (msgs ?? []) as Message[];
        setAllMessages(allMsgs);
        const previews: Record<string, Message> = {};
        for (const m of allMsgs) {
          if (!previews[m.conversation_id]) previews[m.conversation_id] = m;
        }
        setLastMessages(previews);
        // Re-sort conversations by most recent message activity
        sortedConvs = [...convs].sort((a, b) => {
          const aTime = previews[a.id]?.created_at ?? a.updated_at;
          const bTime = previews[b.id]?.created_at ?? b.updated_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
      }
      setConversations(sortedConvs);
    };
    load();

    const channel = supabase
      .channel("portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stripe_checkout_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        if (activeConv) loadMessages(activeConv);
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "client_profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_inquiries" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, activeConv]);

  const loadMessages = async (conversationId: string) => {
    setActiveConv(conversationId);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at");
    setMessages((data ?? []) as Message[]);
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
  const matches = (s: string | null | undefined) => !!s && s.toLowerCase().includes(q);

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

  // Conversations match if client_id matches OR any message in them matches
  const filteredConversations = useMemo(() => {
    if (!q) return conversations;
    const matchingConvIds = new Set(
      allMessages.filter(m => matches(m.content) || matches(m.role)).map(m => m.conversation_id)
    );
    return conversations.filter(c => matches(c.client_id) || matchingConvIds.has(c.id));
  }, [conversations, allMessages, q]);

  if (!authChecked) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-muted-foreground">This account doesn't have admin access.</p>
        <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/portal-login"); }}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">Pixcellor Dev Portal</h1>
          <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/portal-login"); }}>
            Sign out
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
              {filteredOrders.length} orders · {filteredConversations.length} chats · {filteredProfiles.length} clients · {filteredInquiries.length} inquiries
            </p>
          )}
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="orders">Orders ({filteredOrders.length})</TabsTrigger>
            <TabsTrigger value="chats">Chats ({filteredConversations.length})</TabsTrigger>
            <TabsTrigger value="profiles">Clients ({filteredProfiles.length})</TabsTrigger>
            <TabsTrigger value="inquiries">Inquiries ({filteredInquiries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-2">
            {filteredOrders.length === 0 && <p className="text-muted-foreground text-sm">No orders {q ? "match your search" : "yet"}.</p>}
            {filteredOrders.map(o => (
              <Card key={o.session_id}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-medium">{o.customer_email ?? "Guest checkout"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.mode}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>
                      {o.payment_status ?? "pending"}
                    </Badge>
                    <div className="text-lg font-semibold">{o.amount_total != null ? formatGBP(o.amount_total) : "—"}</div>
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
              <CardContent className="p-4 overflow-y-auto space-y-3">
                {!activeConv && <p className="text-muted-foreground text-sm">Pick a conversation to view messages.</p>}
                {activeConv && messages.length === 0 && <p className="text-muted-foreground text-sm">No messages.</p>}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <div className="text-xs opacity-60 mb-1">{m.role} · {new Date(m.created_at).toLocaleTimeString()}</div>
                      {m.content}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles" className="space-y-2">
            {profiles.length === 0 && <p className="text-muted-foreground text-sm">No client profiles yet.</p>}
            {profiles.map(p => (
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
            {inquiries.length === 0 && <p className="text-muted-foreground text-sm">No inquiries yet.</p>}
            {inquiries.map(i => (
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
        </Tabs>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Manage project stages at <a href="/admin" className="underline">/admin</a>
        </p>
      </div>
    </div>
  );
}
