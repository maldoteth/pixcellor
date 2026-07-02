import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Send, Users, Globe, BarChart3, Plus, Copy, CheckCircle2, XCircle,
  RefreshCw, Trash2, Upload, Calendar, Rocket, Mail, ChevronRight,
  AlertCircle, Sparkles, Loader2, Reply,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import RichEmailEditor from "@/components/email/RichEmailEditor";
import EmailPreview from "@/components/email/EmailPreview";

type Plan = "starter" | "growth" | "scale";
type DomainStatus = "pending" | "partial" | "verified" | "failed";
type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused" | "failed";

type Addon = {
  id: string;
  plan: Plan;
  active: boolean;
  monthly_send_quota: number;
  sent_this_period: number;
  max_domains: number;
  max_contacts: number;
  period_ends_at: string | null;
  postal_address: string | null;
  company_name: string | null;
};

type Domain = {
  id: string;
  domain: string;
  status: DomainStatus;
  spf_ok: boolean; dkim_ok: boolean; dmarc_ok: boolean; mx_ok: boolean;
  dkim_selector: string;
  dkim_public_key: string | null;
  last_checked_at: string | null;
};

type ContactList = {
  id: string; name: string; description: string | null;
  contact_count: number; subscribed_count: number;
};

type Contact = {
  id: string; email: string; first_name: string | null; last_name: string | null;
  status: "subscribed" | "unsubscribed" | "bounced" | "complained";
  subscribed_at: string;
};

type Campaign = {
  id: string; name: string; subject: string; preheader: string | null;
  from_name: string; from_email: string; reply_to: string | null;
  template_html: string; list_id: string | null; domain_id: string | null;
  status: CampaignStatus;
  scheduled_for: string | null; sent_at: string | null;
  total_recipients: number; total_sent: number; total_opened: number;
  total_clicked: number; total_bounced: number; total_unsubscribed: number;
  track_opens: boolean; track_clicks: boolean;
};

const PLAN_INFO: Record<Plan, { name: string; price: string; sends: number; domains: number; contacts: number; }> = {
  starter: { name: "Starter", price: "£29/mo", sends: 2500, domains: 1, contacts: 1000 },
  growth: { name: "Growth", price: "£79/mo", sends: 15000, domains: 3, contacts: 10000 },
  scale: { name: "Scale", price: "£199/mo", sends: 75000, domains: 10, contacts: 50000 },
};

const PLATFORM_SPF_INCLUDE = "notify.pixcellor.com";

export default function BroadcastPanel({ userId }: { userId: string }) {
  const [addon, setAddon] = useState<Addon | null>(null);
  const [tab, setTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("client_email_addon").select("*").eq("user_id", userId).maybeSingle();
    setAddon(data as Addon | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const activateStarter = async () => {
    // Placeholder activation for demo. Real Stripe wiring happens in phase 2.
    const info = PLAN_INFO.starter;
    const { error } = await supabase.from("client_email_addon").upsert({
      user_id: userId,
      plan: "starter",
      active: true,
      monthly_send_quota: info.sends,
      max_domains: info.domains,
      max_contacts: info.contacts,
      sent_this_period: 0,
      period_started_at: new Date().toISOString(),
      period_ends_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Email add-on activated (trial)");
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!addon?.active) {
    return (
      <div className="space-y-4">
        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" /> Email broadcasting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Send branded campaigns from your own verified domain, manage contact lists, track opens and clicks, and route replies straight to your portal inbox. Powered by our high-deliverability sending stack — the same one Pixcellor uses.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(Object.entries(PLAN_INFO) as [Plan, typeof PLAN_INFO.starter][]).map(([key, info]) => (
                <Card key={key} className="border-border bg-black/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{info.name}</CardTitle>
                    <p className="text-2xl font-semibold">{info.price}</p>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <div>{info.sends.toLocaleString()} sends / month</div>
                    <div>{info.domains} verified domain{info.domains > 1 ? "s" : ""}</div>
                    <div>Up to {info.contacts.toLocaleString()} contacts</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="pricing" className="flex-1" onClick={activateStarter}>Activate Starter (30-day trial)</Button>
              <p className="self-center text-xs text-muted-foreground">Card + full plans coming next. Trial gives you full access to test.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quotaPct = Math.min(100, Math.round((addon.sent_this_period / Math.max(1, addon.monthly_send_quota)) * 100));

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/70 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border bg-black p-2"><Mail className="h-4 w-4" /></div>
            <div>
              <div className="text-sm font-medium">{PLAN_INFO[addon.plan].name} plan</div>
              <div className="text-xs text-muted-foreground">
                {addon.sent_this_period.toLocaleString()} / {addon.monthly_send_quota.toLocaleString()} sends used ({quotaPct}%)
              </div>
            </div>
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-black/70">
            <div className="h-full bg-white/80" style={{ width: `${quotaPct}%` }} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-transparent p-0 gap-2">
          <TabsTrigger value="campaigns" className="pricing-button gap-2 rounded-none text-xs sm:text-sm">
            <Send className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="contacts" className="pricing-button gap-2 rounded-none text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" /> Contacts
          </TabsTrigger>
          <TabsTrigger value="domains" className="pricing-button gap-2 rounded-none text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5" /> Domains
          </TabsTrigger>
          <TabsTrigger value="replies" className="pricing-button gap-2 rounded-none text-xs sm:text-sm">
            <Reply className="h-3.5 w-3.5" /> Replies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns"><CampaignsView userId={userId} addon={addon} onSent={load} /></TabsContent>
        <TabsContent value="contacts"><ContactsView userId={userId} /></TabsContent>
        <TabsContent value="domains"><DomainsView userId={userId} addon={addon} /></TabsContent>
        <TabsContent value="replies"><RepliesView userId={userId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ========================= DOMAINS ========================= */

function DomainsView({ userId, addon }: { userId: string; addon: Addon }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [busy, setBusy] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [showRecords, setShowRecords] = useState<Domain | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("client_email_domains").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setDomains((data ?? []) as Domain[]);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    if (domains.length >= addon.max_domains) { toast.error(`Your plan allows ${addon.max_domains} domain(s)`); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-client-domain", { body: { action: "add", domain: newDomain.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewDomain(""); load();
      setShowRecords(data.domain);
      toast.success("Domain added. Add the DNS records to verify.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const verify = async (id: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-client-domain", { body: { action: "verify", domain_id: id } });
      if (error) throw error;
      if (data?.status === "verified") toast.success("Domain verified 🎉");
      else toast.info(`Status: ${data?.status ?? "pending"}. Check the records again.`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this domain? All campaigns using it must be reassigned.")) return;
    await supabase.functions.invoke("verify-client-domain", { body: { action: "delete", domain_id: id } });
    load();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/70 backdrop-blur-xl">
        <CardHeader><CardTitle className="text-base">Add sender domain</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="mail.yourdomain.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
            <Button onClick={addDomain} disabled={busy} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
          </div>
          <p className="text-xs text-muted-foreground">Use a subdomain like <code>mail.yourdomain.com</code> to protect your root domain's reputation.</p>
        </CardContent>
      </Card>

      {domains.map((d) => (
        <Card key={d.id} className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium">{d.domain}</div>
              <StatusBadge ok={d.status === "verified"} text={d.status === "verified" ? "Verified" : d.status === "partial" ? "Partial" : "Pending DNS"} />
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowRecords(d)}>DNS records</Button>
                <Button size="sm" variant="outline" onClick={() => verify(d.id)} disabled={busy} className="gap-2">
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />Check DNS
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <RecordPill label="SPF" ok={d.spf_ok} />
              <RecordPill label="DKIM" ok={d.dkim_ok} />
              <RecordPill label="DMARC" ok={d.dmarc_ok} />
              <RecordPill label="MX (replies)" ok={d.mx_ok} />
            </div>
          </CardContent>
        </Card>
      ))}
      {!domains.length && <p className="text-sm text-muted-foreground">No domains yet. Add one above to start sending.</p>}

      <Dialog open={!!showRecords} onOpenChange={(o) => !o && setShowRecords(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DNS records for {showRecords?.domain}</DialogTitle>
            <DialogDescription>Add these at your DNS provider, then click "Check DNS".</DialogDescription>
          </DialogHeader>
          {showRecords && <DnsRecordsBlock domain={showRecords} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DnsRecordsBlock({ domain }: { domain: Domain }) {
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  const dkimVal = domain.dkim_public_key ? `v=DKIM1; k=rsa; p=${domain.dkim_public_key}` : "(generating…)";
  const records = [
    { type: "TXT", host: "@", value: `v=spf1 include:${PLATFORM_SPF_INCLUDE} ~all`, purpose: "SPF" },
    { type: "TXT", host: `${domain.dkim_selector}._domainkey`, value: dkimVal, purpose: "DKIM" },
    { type: "TXT", host: "_dmarc", value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}; adkim=r; aspf=r`, purpose: "DMARC" },
    { type: "MX", host: "@", value: `10 mxa.pixcellor.com`, purpose: "Replies (optional)" },
  ];
  return (
    <div className="space-y-3 text-xs">
      {records.map((r) => (
        <div key={r.purpose} className="rounded-md border border-border bg-black/40 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">{r.purpose}</Badge>
            <span className="font-mono text-[11px] text-muted-foreground">{r.type}</span>
          </div>
          <div className="grid gap-1">
            <RecordLine label="Host" value={r.host} onCopy={copy} />
            <RecordLine label="Value" value={r.value} onCopy={copy} multiline />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordLine({ label, value, onCopy, multiline }: { label: string; value: string; onCopy: (t: string) => void; multiline?: boolean }) {
  return (
    <div className={`grid ${multiline ? "grid-cols-[80px_1fr_auto]" : "grid-cols-[80px_1fr_auto]"} items-start gap-2`}>
      <span className="text-muted-foreground">{label}</span>
      <code className={`break-all rounded bg-black/60 px-2 py-1 text-[11px] ${multiline ? "" : ""}`}>{value}</code>
      <button onClick={() => onCopy(value)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
  return <Badge variant={ok ? "default" : "outline"} className={ok ? "bg-emerald-600 hover:bg-emerald-600" : ""}>{text}</Badge>;
}
function RecordPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${ok ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{label}
    </span>
  );
}

/* ========================= CONTACTS ========================= */

function ContactsView({ userId }: { userId: string }) {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newListName, setNewListName] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [manual, setManual] = useState({ email: "", first_name: "", last_name: "" });

  const loadLists = useCallback(async () => {
    const { data } = await supabase.from("client_contact_lists").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setLists((data ?? []) as ContactList[]);
    if (!selectedList && data?.length) setSelectedList(data[0].id);
  }, [userId, selectedList]);

  const loadContacts = useCallback(async () => {
    if (!selectedList) { setContacts([]); return; }
    const { data } = await supabase.from("client_contacts").select("*").eq("user_id", userId).eq("list_id", selectedList).order("subscribed_at", { ascending: false }).limit(500);
    setContacts((data ?? []) as Contact[]);
  }, [userId, selectedList]);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => { loadContacts(); }, [loadContacts]);

  const createList = async () => {
    if (!newListName.trim()) return;
    const { error } = await supabase.from("client_contact_lists").insert({ user_id: userId, name: newListName.trim() });
    if (error) toast.error(error.message);
    else { setNewListName(""); loadLists(); toast.success("List created"); }
  };

  const addManual = async () => {
    if (!selectedList || !manual.email.trim()) return;
    const { error } = await supabase.from("client_contacts").insert({
      user_id: userId, list_id: selectedList,
      email: manual.email.trim().toLowerCase(),
      first_name: manual.first_name.trim() || null,
      last_name: manual.last_name.trim() || null,
    });
    if (error) toast.error(error.message);
    else { setManual({ email: "", first_name: "", last_name: "" }); loadContacts(); loadLists(); }
  };

  const handleCsv = (file: File) => {
    if (!selectedList) { toast.error("Pick a list first"); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data as Record<string, string>[]).map((r) => {
          const email = (r.email ?? r.Email ?? "").trim().toLowerCase();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
          return {
            user_id: userId, list_id: selectedList, email,
            first_name: (r.first_name ?? r["First Name"] ?? "").trim() || null,
            last_name: (r.last_name ?? r["Last Name"] ?? "").trim() || null,
            consent_source: "csv-import",
          };
        }).filter(Boolean) as any[];
        if (!rows.length) { toast.error("No valid emails found"); return; }
        // dedupe by email
        const seen = new Set<string>(); const dedup = rows.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
        // chunk upserts
        let imported = 0;
        for (let i = 0; i < dedup.length; i += 500) {
          const { error, count } = await supabase.from("client_contacts")
            .upsert(dedup.slice(i, i + 500), { onConflict: "user_id,list_id,email", count: "exact" });
          if (!error) imported += count ?? 0;
        }
        toast.success(`Imported ${imported} contacts`);
        setShowImport(false); loadContacts(); loadLists();
      },
    });
  };

  const removeContact = async (id: string) => {
    await supabase.from("client_contacts").delete().eq("id", id).eq("user_id", userId);
    loadContacts(); loadLists();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lists</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lists.map((l) => (
              <button key={l.id} onClick={() => setSelectedList(l.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${selectedList === l.id ? "border-white/40 bg-white/5" : "border-border hover:bg-white/5"}`}>
                <span className="truncate">{l.name}</span>
                <span className="text-xs text-muted-foreground">{l.subscribed_count}</span>
              </button>
            ))}
            {!lists.length && <p className="text-xs text-muted-foreground">No lists yet</p>}
            <div className="flex gap-2 pt-2">
              <Input placeholder="New list name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
              <Button size="sm" onClick={createList}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {selectedList ? (
          <>
            <Card className="border-border bg-card/70 backdrop-blur-xl">
              <CardContent className="flex flex-wrap gap-2 py-3">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                  <Upload className="h-3.5 w-3.5" />Import CSV
                </Button>
                <div className="ml-auto grid grid-cols-4 items-center gap-2">
                  <Input placeholder="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} />
                  <Input placeholder="first" value={manual.first_name} onChange={(e) => setManual({ ...manual, first_name: e.target.value })} />
                  <Input placeholder="last" value={manual.last_name} onChange={(e) => setManual({ ...manual, last_name: e.target.value })} />
                  <Button size="sm" onClick={addManual}>Add</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/70 backdrop-blur-xl">
              <CardContent className="p-0">
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-black/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr><th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="p-2 font-mono text-xs">{c.email}</td>
                          <td className="p-2 text-xs">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                          <td className="p-2 text-xs"><Badge variant="outline" className="capitalize">{c.status}</Badge></td>
                          <td className="p-2 text-right"><button onClick={() => removeContact(c.id)} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button></td>
                        </tr>
                      ))}
                      {!contacts.length && <tr><td colSpan={4} className="p-6 text-center text-xs text-muted-foreground">No contacts in this list</td></tr>}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Create a list to get started.</p>
        )}
      </div>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>CSV with columns: email, first_name, last_name. Duplicates are skipped.</DialogDescription>
          </DialogHeader>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])} className="text-sm" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ========================= CAMPAIGNS ========================= */

function CampaignsView({ userId, addon, onSent }: { userId: string; addon: Addon; onSent: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("client_campaigns").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setCampaigns((data ?? []) as Campaign[]);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const { data, error } = await supabase.from("client_campaigns").insert({
      user_id: userId, name: "Untitled campaign", subject: "", from_name: "", from_email: "", template_html: "",
    }).select("*").single();
    if (error) { toast.error(error.message); return; }
    setEditing(data as Campaign); setShowEditor(true); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete campaign?")) return;
    await supabase.from("client_campaigns").delete().eq("id", id).eq("user_id", userId);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}</div>
        <Button className="gap-2" onClick={create}><Plus className="h-4 w-4" />New campaign</Button>
      </div>
      <div className="space-y-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{c.name}</span>
                  <Badge variant="outline" className="capitalize">{c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{c.subject || "(no subject)"} — {c.total_sent} sent · {c.total_opened} opened · {c.total_clicked} clicked</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditing(c); setShowEditor(true); }}>Open<ChevronRight className="ml-1 h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </CardContent>
          </Card>
        ))}
        {!campaigns.length && <p className="text-sm text-muted-foreground">No campaigns yet. Create your first one above.</p>}
      </div>

      <Dialog open={showEditor} onOpenChange={(o) => { setShowEditor(o); if (!o) { setEditing(null); load(); onSent(); } }}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden p-0">
          {editing && <CampaignEditor campaign={editing} userId={userId} addon={addon} onClose={() => { setShowEditor(false); setEditing(null); load(); onSent(); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignEditor({ campaign, userId, addon, onClose }: { campaign: Campaign; userId: string; addon: Addon; onClose: () => void }) {
  const [form, setForm] = useState<Campaign>(campaign);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: d }] = await Promise.all([
        supabase.from("client_contact_lists").select("*").eq("user_id", userId),
        supabase.from("client_email_domains").select("*").eq("user_id", userId).eq("status", "verified"),
      ]);
      setLists((l ?? []) as ContactList[]);
      setDomains((d ?? []) as Domain[]);
    })();
  }, [userId]);

  const selectedList = lists.find((l) => l.id === form.list_id);
  const selectedDomain = domains.find((d) => d.id === form.domain_id);

  const save = async (patch?: Partial<Campaign>) => {
    setSaving(true);
    const merged = { ...form, ...(patch ?? {}) };
    const { error } = await supabase.from("client_campaigns").update({
      name: merged.name, subject: merged.subject, preheader: merged.preheader,
      from_name: merged.from_name, from_email: merged.from_email, reply_to: merged.reply_to,
      template_html: merged.template_html, list_id: merged.list_id, domain_id: merged.domain_id,
      track_opens: merged.track_opens, track_clicks: merged.track_clicks,
      scheduled_for: merged.scheduled_for, status: merged.status,
    }).eq("id", form.id);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const sendTest = async () => {
    if (!testEmail) return;
    if (!selectedDomain) { toast.error("Choose a verified sender domain"); return; }
    await save();
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-send", {
        body: { action: "test", campaign_id: form.id, test_email: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Test sent to ${testEmail}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSending(false); }
  };

  const sendNow = async () => {
    if (!selectedList || !selectedDomain || !form.subject.trim() || !form.template_html.trim()) {
      toast.error("Complete list, domain, subject and body first"); return;
    }
    if (!confirm(`Send to ~${selectedList.subscribed_count} contacts now?`)) return;
    await save();
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("broadcast-send", { body: { action: "send", campaign_id: form.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Enqueued ${data.enqueued} emails`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSending(false); }
  };

  const schedule = async () => {
    if (!scheduleFor) return;
    await save({ status: "scheduled", scheduled_for: scheduleFor });
    toast.success(`Scheduled for ${new Date(scheduleFor).toLocaleString()}`);
    onClose();
  };

  const insertTag = (tag: string) => setForm((f) => ({ ...f, template_html: f.template_html + `{{${tag}}}` }));

  return (
    <div className="grid max-h-[95vh] grid-rows-[auto_1fr_auto] overflow-hidden">
      <DialogHeader className="border-b border-border p-4">
        <DialogTitle className="flex items-center gap-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={() => save()} className="max-w-md" />
          <Badge variant="outline" className="capitalize">{form.status}</Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 overflow-auto p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">List</Label>
              <Select value={form.list_id ?? ""} onValueChange={(v) => setForm({ ...form, list_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose list" /></SelectTrigger>
                <SelectContent>{lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.subscribed_count})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sender domain</Label>
              <Select value={form.domain_id ?? ""} onValueChange={(v) => {
                const d = domains.find((x) => x.id === v);
                setForm({ ...form, domain_id: v, from_email: form.from_email && form.from_email.includes("@") ? form.from_email : `hello@${d?.domain ?? ""}` });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose verified domain" /></SelectTrigger>
                <SelectContent>{domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.domain}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">From name</Label><Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} onBlur={() => save()} /></div>
            <div><Label className="text-xs">From email</Label><Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} onBlur={() => save()} /></div>
          </div>
          <div><Label className="text-xs">Reply-to (optional)</Label><Input value={form.reply_to ?? ""} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} onBlur={() => save()} /></div>
          <div><Label className="text-xs">Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} onBlur={() => save()} /></div>
          <div><Label className="text-xs">Preheader</Label><Input value={form.preheader ?? ""} onChange={(e) => setForm({ ...form, preheader: e.target.value })} onBlur={() => save()} /></div>

          <div className="rounded-md border border-border bg-black/40 p-2">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Merge tags</div>
            <div className="flex flex-wrap gap-1">
              {["first_name","last_name","email"].map((t) => (
                <button key={t} onClick={() => insertTag(t)} className="rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-white/5">{`{{${t}}}`}</button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Body</Label>
            <RichEmailEditor value={form.template_html} onChange={(html) => setForm({ ...form, template_html: html })} />
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2"><Switch checked={form.track_opens} onCheckedChange={(v) => setForm({ ...form, track_opens: v })} />Track opens</label>
            <label className="flex items-center gap-2"><Switch checked={form.track_clicks} onCheckedChange={(v) => setForm({ ...form, track_clicks: v })} />Track clicks</label>
          </div>
        </div>

        <div className="space-y-3">
          <EmailPreview subject={form.subject} bodyHtml={form.template_html} preheader={form.preheader ?? undefined} />
          <SpamHints subject={form.subject} html={form.template_html} />
        </div>
      </div>

      <DialogFooter className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-2">
          <Input placeholder="test@yourdomain.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="max-w-xs" />
          <Button variant="outline" onClick={sendTest} disabled={sending} className="gap-2"><Mail className="h-4 w-4" />Send test</Button>
        </div>
        <div className="flex gap-2">
          <Input type="datetime-local" value={scheduleFor} onChange={(e) => setScheduleFor(e.target.value)} className="w-52" />
          <Button variant="outline" onClick={schedule} disabled={!scheduleFor} className="gap-2"><Calendar className="h-4 w-4" />Schedule</Button>
          <Button variant="pricing" onClick={sendNow} disabled={sending} className="gap-2"><Rocket className="h-4 w-4" />{sending ? "Sending…" : "Send now"}</Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function SpamHints({ subject, html }: { subject: string; html: string }) {
  const hints: string[] = [];
  if (subject && subject === subject.toUpperCase() && subject.length > 5) hints.push("Subject is ALL CAPS — reads as shouty");
  const linkCount = (html.match(/<a\b/gi) ?? []).length;
  if (linkCount > 20) hints.push(`Very high link count (${linkCount}). Trim if possible.`);
  const textLen = html.replace(/<[^>]+>/g, "").trim().length;
  if (textLen < 40 && html.length > 0) hints.push("Very little text content — spam filters prefer real copy.");
  if (!hints.length) return null;
  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="space-y-1 py-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-yellow-400"><AlertCircle className="h-3.5 w-3.5" />Deliverability hints</div>
        {hints.map((h, i) => <div key={i} className="text-yellow-200/80">• {h}</div>)}
      </CardContent>
    </Card>
  );
}

/* ========================= REPLIES ========================= */

function RepliesView({ userId }: { userId: string }) {
  const [replies, setReplies] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("client_email_replies").select("*").eq("user_id", userId).order("received_at", { ascending: false }).limit(100)
      .then(({ data }) => setReplies(data ?? []));
  }, [userId]);
  return (
    <div className="space-y-2">
      {replies.map((r) => (
        <Card key={r.id} className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="py-3 text-sm">
            <div className="flex justify-between"><span className="font-medium">{r.from_name || r.from_email}</span><span className="text-xs text-muted-foreground">{new Date(r.received_at).toLocaleString()}</span></div>
            <div className="text-xs text-muted-foreground">{r.subject}</div>
            <div className="mt-2 whitespace-pre-wrap text-sm">{r.body_text}</div>
          </CardContent>
        </Card>
      ))}
      {!replies.length && <p className="text-sm text-muted-foreground">Inbound replies will appear here once your MX record is set up and someone replies to a campaign.</p>}
    </div>
  );
}
