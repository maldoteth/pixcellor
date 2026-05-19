import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, MessageSquare, ShieldOff, Settings as SettingsIcon, Inbox } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/themed-dialogs";

const STATUS_OPTIONS = ["cold", "aware", "warm", "hot", "gold"] as const;
const STATUS_COLORS: Record<string, string> = {
  cold: "hsl(217 91% 60%)",
  aware: "hsl(142 71% 45%)",
  warm: "hsl(25 95% 53%)",
  hot: "hsl(0 84% 60%)",
  gold: "hsl(45 93% 47%)",
};

type Contact = { id: string; name: string; phone: string | null; status: string; industry: string | null };
type Broadcast = {
  id: string; title: string | null; body: string; status: string;
  recipient_count: number; sent_count: number; delivered_count: number;
  failed_count: number; reply_count: number; created_at: string; sender_id: string | null;
};
type Reply = {
  id: string; from_phone: string; body: string; handled: boolean;
  created_at: string; contact_id: string | null;
};
type OptOut = { id: string; phone: string; reason: string; created_at: string };

const SMS_TEMPLATES: { id: string; label: string; body: string }[] = [
  {
    id: "cold-no-website",
    label: "Private SME Grant Script",
    body: `Hi, it's Alex from Pixcellor.

I'm messaging regarding Pixcellor's private SME grant to get you online and growing with a market leading website powered by AI - with no upfront costs and a heavily reduced fee!

Privately funded by Pixcellor (not a government grant), available to UK SMEs like {name}. Reply YES to check eligibility and get your free sample pack.`,
  },
];

export default function SmsBroadcasts() {
  const confirm = useConfirmDialog();
  const [tab, setTab] = useState("compose");

  // settings
  const [senderId, setSenderId] = useState("");
  const [footer, setFooter] = useState("Reply STOP to opt out");
  const [ratePerSecond, setRatePerSecond] = useState(5);
  const [quietStart, setQuietStart] = useState(21);
  const [quietEnd, setQuietEnd] = useState(8);
  const [enforceQuiet, setEnforceQuiet] = useState(true);

  // compose
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [sending, setSending] = useState(false);

  // history
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOptOut, setNewOptOut] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: b }, { data: r }, { data: o }] = await Promise.all([
      supabase.from("sms_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("contacts").select("id,name,phone,status,industry").not("phone", "is", null),
      supabase.from("sms_broadcasts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("sms_inbound_replies").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("sms_opt_outs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (s) {
      setSenderId(s.sender_id ?? "");
      setFooter(s.footer ?? "Reply STOP to opt out");
      setRatePerSecond(s.rate_per_second ?? 5);
      setQuietStart(s.quiet_hours_start ?? 21);
      setQuietEnd(s.quiet_hours_end ?? 8);
      setEnforceQuiet(!!s.enforce_quiet_hours);
    }
    setContacts((c as Contact[]) ?? []);
    setBroadcasts((b as Broadcast[]) ?? []);
    setReplies((r as Reply[]) ?? []);
    setOptOuts((o as OptOut[]) ?? []);
    setLoading(false);
  };

  const detectTwilioNumber = async (silent = false) => {
    try {
      const { data, error } = await supabase.functions.invoke("twilio-list-numbers");
      if (error) throw error;
      const first = data?.numbers?.[0]?.phone_number;
      if (!first) {
        if (!silent) toast.error("No Twilio numbers found on your account");
        return null;
      }
      setSenderId(first);
      if (!silent) toast.success(`Detected Twilio number ${first}`);
      return first;
    } catch (e: any) {
      if (!silent) toast.error(e.message || "Failed to detect Twilio number");
      return null;
    }
  };

  useEffect(() => {
    void (async () => {
      await loadAll();
    })();
  }, []);

  // Auto-detect from Twilio if no sender saved yet
  useEffect(() => {
    if (!loading && !senderId) {
      void detectTwilioNumber(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const allIndustries = useMemo(
    () => Array.from(new Set(contacts.map((c) => (c.industry || "").toLowerCase()).filter(Boolean))).sort(),
    [contacts]
  );

  const filtered = useMemo(
    () => contacts.filter((c) => {
      if (!c.phone) return false;
      if (!statuses.includes(c.status)) return false;
      if (industries.length > 0 && !industries.includes((c.industry || "").toLowerCase())) return false;
      return true;
    }),
    [contacts, statuses, industries]
  );

  const eligible = useMemo(() => {
    const byId = new Map<string, Contact>();
    filtered.forEach((c) => { if (!excludedIds.includes(c.id)) byId.set(c.id, c); });
    manualIds.forEach((id) => {
      const c = contacts.find((x) => x.id === id);
      if (c && c.phone) byId.set(c.id, c);
    });
    return Array.from(byId.values());
  }, [filtered, manualIds, excludedIds, contacts]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return contacts
      .filter((c) =>
        c.phone &&
        !eligible.find((e) => e.id === c.id) &&
        ((c.name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [search, contacts, eligible]);

  const toggleStatus = (s: string) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleIndustry = (i: string) =>
    setIndustries((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  const addManual = (id: string) => {
    setManualIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExcludedIds((prev) => prev.filter((x) => x !== id));
    setSearch("");
  };
  const removeContact = (id: string) => {
    setManualIds((prev) => prev.filter((x) => x !== id));
    if (filtered.some((c) => c.id === id)) {
      setExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  };

  const charCount = body.length;
  const hasUnicode = /[^\u0000-\u007F\u00A0-\u00FF€£]/.test(body);
  const segLimit = hasUnicode ? 70 : 160;
  const segments = Math.max(1, Math.ceil((body.length + footer.length + 1) / segLimit));

  const saveSettings = async () => {
    const { error } = await supabase
      .from("sms_settings")
      .update({
        sender_id: senderId.trim() || null,
        footer: footer.trim() || "Reply STOP to opt out",
        rate_per_second: ratePerSecond,
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        enforce_quiet_hours: enforceQuiet,
      })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("SMS settings saved");
  };

  const send = async () => {
    if (!body.trim()) return toast.error("Write a message");
    if (!senderId.trim()) return toast.error("Set sender ID in Settings tab");
    if (eligible.length === 0) return toast.error("No recipients match filters");

    const estCost = (eligible.length * segments * 0.04).toFixed(2);
    const ok = await confirm({
      title: `Send to ${eligible.length} recipients?`,
      description: `${segments} segment(s) per message. Estimated cost: £${estCost}. Opt-outs are filtered automatically. This cannot be undone.`,
      confirmLabel: "Send broadcast",
    });
    if (!ok) return;

    setSending(true);
    try {
      const recipients = eligible.map((c) => ({ contact_id: c.id, phone: c.phone! }));
      const { data, error } = await supabase.functions.invoke("send-sms-broadcast", {
        body: { title: title.trim() || undefined, body: body.trim(), recipients },
      });
      if (error) throw error;
      toast.success(`Queued ${data?.recipient_count ?? 0} messages (${data?.skipped ?? 0} skipped)`);
      setBody(""); setTitle("");
      void loadAll();
      setTab("history");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  const addOptOut = async () => {
    const phone = newOptOut.trim();
    if (!phone) return;
    const { error } = await supabase.from("sms_opt_outs").upsert({ phone, reason: "manual", source: "manual" }, { onConflict: "phone" });
    if (error) return toast.error(error.message);
    toast.success("Added to opt-outs");
    setNewOptOut("");
    void loadAll();
  };

  const removeOptOut = async (id: string) => {
    const { error } = await supabase.from("sms_opt_outs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void loadAll();
  };

  const markReplyHandled = async (id: string) => {
    await supabase.from("sms_inbound_replies").update({ handled: true, handled_at: new Date().toISOString() }).eq("id", id);
    void loadAll();
  };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-4 gap-2 bg-transparent p-0">
          <TabsTrigger value="compose" className="pricing-button h-10 gap-1.5 rounded-none text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm">
            <Send className="h-3.5 w-3.5" />Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="pricing-button h-10 gap-1.5 rounded-none text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5" />History
          </TabsTrigger>
          <TabsTrigger value="replies" className="pricing-button h-10 gap-1.5 rounded-none text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm">
            <Inbox className="h-3.5 w-3.5" />Replies
            {replies.filter((r) => !r.handled).length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{replies.filter((r) => !r.handled).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="pricing-button h-10 gap-1.5 rounded-none text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm">
            <SettingsIcon className="h-3.5 w-3.5" />Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4 space-y-3">
          <Card><CardContent className="space-y-3 p-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Add specific contacts</div>
              <div className="relative">
                <Input
                  placeholder="Search by name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => addManual(c.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Contact statuses</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => {
                  const active = statuses.includes(s);
                  return (
                    <Badge
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`cursor-pointer capitalize border ${active ? "" : "opacity-40"}`}
                      style={{
                        backgroundColor: active ? STATUS_COLORS[s] : "transparent",
                        borderColor: STATUS_COLORS[s],
                        color: active ? "hsl(var(--background))" : STATUS_COLORS[s],
                      }}
                    >
                      {s}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {allIndustries.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Industries {industries.length === 0 && <span className="text-muted-foreground/70">(all)</span>}
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allIndustries.map((ind) => (
                    <Badge
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      variant="outline"
                      className={`cursor-pointer capitalize ${industries.includes(ind) ? "border-primary text-primary" : "opacity-60"}`}
                    >
                      {ind}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Recipients ({eligible.length})
              </div>
              {eligible.length === 0 ? (
                <p className="text-xs text-muted-foreground">No contacts match yet. Adjust filters or add manually.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {eligible.slice(0, 80).map((c) => (
                    <Badge
                      key={c.id}
                      variant="secondary"
                      onClick={() => removeContact(c.id)}
                      className="cursor-pointer gap-1"
                      title="Click to remove"
                    >
                      {c.name} <span className="opacity-60">×</span>
                    </Badge>
                  ))}
                  {eligible.length > 80 && (
                    <span className="text-xs text-muted-foreground self-center">+{eligible.length - 80} more</span>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Opt-outs are auto-filtered server-side.
              </p>
            </div>

            <Input placeholder="Internal title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Templates</span>
                {SMS_TEMPLATES.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    onClick={() => { setBody(t.body); if (!title.trim()) setTitle(t.label); }}
                    className="cursor-pointer"
                  >
                    {t.label}
                  </Badge>
                ))}
              </div>
              <Textarea
                placeholder="Hi {name}, your message here…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={640}
                rows={5}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{charCount}/640 chars · {segments} segment{segments === 1 ? "" : "s"} · {hasUnicode ? "Unicode" : "GSM-7"}</span>
                <span className="opacity-70">Footer appended: "{footer}"</span>
              </div>
            </div>
            <Button onClick={send} disabled={sending || !body.trim()} className="w-full sm:w-auto">
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send broadcast to {eligible.length}
            </Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!loading && broadcasts.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts yet.</p>}
          {broadcasts.map((b) => (
            <Card key={b.id}><CardContent className="p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{b.title || "(untitled)"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · from {b.sender_id || "—"}</div>
                </div>
                <Badge variant={b.status === "sent" ? "default" : b.status === "failed" ? "destructive" : "secondary"}>{b.status}</Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap line-clamp-3 opacity-90">{b.body}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>📤 {b.sent_count}/{b.recipient_count}</span>
                <span>✅ {b.delivered_count}</span>
                <span>❌ {b.failed_count}</span>
                <span>💬 {b.reply_count}</span>
              </div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="replies" className="mt-4 space-y-2">
          {replies.length === 0 && <p className="text-sm text-muted-foreground">No SMS replies yet.</p>}
          {replies.map((r) => (
            <Card key={r.id} className={r.handled ? "opacity-60" : ""}><CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{r.from_phone}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  {!r.handled && (
                    <Button size="sm" variant="outline" onClick={() => markReplyHandled(r.id)}>Mark handled</Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            </CardContent></Card>
          ))}

          <div className="pt-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShieldOff className="h-3.5 w-3.5" /> Opt-outs ({optOuts.length})
            </div>
            <div className="flex gap-2 mb-2">
              <Input placeholder="+447700900000" value={newOptOut} onChange={(e) => setNewOptOut(e.target.value)} />
              <Button onClick={addOptOut} variant="outline">Add</Button>
            </div>
            <div className="space-y-1">
              {optOuts.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs border border-border/40 rounded px-2 py-1">
                  <span className="font-mono">{o.phone}</span>
                  <span className="text-muted-foreground">{o.reason}</span>
                  <Button size="sm" variant="ghost" onClick={() => removeOptOut(o.id)}>Remove</Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-3">
          <Card><CardContent className="space-y-3 p-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Sender ID / From number</label>
              <div className="flex gap-2">
                <Input placeholder="Auto-detected from Twilio" value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={40} />
                <Button type="button" variant="outline" onClick={() => detectTwilioNumber(false)}>Detect</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Auto-detected from your connected Twilio account. Override only if you have multiple numbers.</p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Mandatory footer (PECR)</label>
              <Input value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={80} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Rate / second</label>
                <Input type="number" min={1} max={20} value={ratePerSecond} onChange={(e) => setRatePerSecond(Number(e.target.value) || 5)} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input id="enforceQuiet" type="checkbox" checked={enforceQuiet} onChange={(e) => setEnforceQuiet(e.target.checked)} />
                <label htmlFor="enforceQuiet" className="text-sm">Enforce quiet hours (UK time)</label>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Quiet from (hour)</label>
                <Input type="number" min={0} max={23} value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value) || 21)} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Quiet until (hour)</label>
                <Input type="number" min={0} max={23} value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value) || 8)} />
              </div>
            </div>
            <Button onClick={saveSettings}>Save settings</Button>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/30 space-y-1">
              <p className="font-medium text-foreground">Webhooks for Twilio console:</p>
              <p className="font-mono break-all">Inbound: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-inbound-webhook</p>
              <p className="font-mono break-all">Status: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-status-webhook</p>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
