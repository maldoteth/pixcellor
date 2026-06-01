import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock, ArrowLeft, CalendarClock, CheckCircle2, Clipboard, Inbox, Loader2,
  Mail, MessageSquarePlus, Phone, Plus, Search, StickyNote, Trash2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LeadStatus = "cold" | "aware" | "warm" | "hot" | "won" | "archived";

export type MyLead = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: string;
  location: string | null;
  source: string;
  callback_at: string | null;
  callback_completed_at: string | null;
  created_at: string;
};

export type LeadEvent = {
  id: string;
  lead_id: string;
  owner_user_id: string;
  event_type: string;
  title: string;
  description: string | null;
  callback_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const STATUSES: { value: LeadStatus; label: string; dot: string; text: string }[] = [
  { value: "cold",     label: "Cold",     dot: "bg-blue-500",   text: "text-blue-300" },
  { value: "aware",    label: "Aware",    dot: "bg-emerald-500", text: "text-emerald-300" },
  { value: "warm",     label: "Warm",     dot: "bg-amber-500",  text: "text-amber-300" },
  { value: "hot",      label: "Hot",      dot: "bg-red-500",    text: "text-red-300" },
  { value: "won",      label: "Won",      dot: "bg-yellow-400", text: "text-yellow-300" },
  { value: "archived", label: "Archived", dot: "bg-zinc-500",   text: "text-zinc-400" },
];

const statusMeta = (s: string) => STATUSES.find(x => x.value === s) ?? STATUSES[0];

const CALLBACK_PRESETS = [
  { label: "1 day", get: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  { label: "3 days", get: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
  { label: "1 week", get: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  { label: "2 weeks", get: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  { label: "1 month", get: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; } },
];

const formatLocalDT = (d: Date) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const formatCountdown = (when: string) => {
  const diff = new Date(when).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  const parts = [days && `${days}d`, hours && `${hours}h`, !days && rest ? `${rest}m` : null].filter(Boolean).join(" ") || "<1m";
  return diff < 0 ? `Overdue ${parts}` : `in ${parts}`;
};

// ---- CSV parser (RFC 4180-ish) ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i+1] === "\n") i++; row.push(field); field = ""; if (row.some(v => v.trim() !== "")) rows.push(row); row = []; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); if (row.some(v => v.trim() !== "")) rows.push(row); }
  return rows;
}
const normHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, "");
const ALIASES: Record<string, string[]> = {
  name: ["name", "fullname", "businessname", "company"],
  contact_name: ["contact", "contactname", "person", "firstname"],
  email: ["email", "emailaddress", "e-mail"],
  phone: ["phone", "mobile", "telephone", "tel", "number"],
  company: ["company", "business", "organisation", "organization"],
  notes: ["notes", "note", "comment", "comments", "message"],
  location: ["location", "city", "address", "town", "area"],
  status: ["status", "stage"],
};
function mapHeaders(headers: string[]) {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => { const k = normHeader(h); for (const [f, a] of Object.entries(ALIASES)) if (map[f] === undefined && a.includes(k)) map[f] = i; });
  return map;
}

// ---- Wizard fields ----
type FormKey = "name" | "phone" | "email" | "location" | "company" | "contact_name" | "notes";
const WIZARD: { key: FormKey; label: string; placeholder: string; required: boolean; inputMode: "text" | "tel" | "email"; multiline?: boolean }[] = [
  { key: "name", label: "Business / lead name", placeholder: "e.g. Smith Roofing", required: true, inputMode: "text" },
  { key: "phone", label: "Phone", placeholder: "Phone number", required: false, inputMode: "tel" },
  { key: "email", label: "Email", placeholder: "name@company.com", required: false, inputMode: "email" },
  { key: "location", label: "Location", placeholder: "Town or area", required: false, inputMode: "text" },
  { key: "company", label: "Company", placeholder: "Company (if different)", required: false, inputMode: "text" },
  { key: "contact_name", label: "Contact name", placeholder: "Person you spoke to", required: false, inputMode: "text" },
  { key: "notes", label: "Notes", placeholder: "Anything to remember…", required: false, inputMode: "text", multiline: true },
];
const emptyForm = (): Record<FormKey, string> => ({ name: "", phone: "", email: "", location: "", company: "", contact_name: "", notes: "" });

export default function MyLeadsPanel({ maxLeads, planLabel }: { maxLeads?: number; planLabel?: string } = {}) {
  const unlimited = maxLeads === undefined || !isFinite(maxLeads) || maxLeads < 0;
  const [leads, setLeads] = useState<MyLead[]>([]);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<FormKey, string>>(emptyForm());

  // CSV
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail drawer
  const [detailId, setDetailId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [cbWhen, setCbWhen] = useState("");
  const [cbNote, setCbNote] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [leadsRes, eventsRes] = await Promise.all([
      supabase.from("customer_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("customer_lead_events").select("*").order("created_at", { ascending: false }),
    ]);
    if (leadsRes.error) toast.error(leadsRes.error.message);
    else setLeads((leadsRes.data as MyLead[]) ?? []);
    if (!eventsRes.error) setEvents((eventsRes.data as LeadEvent[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (statusFilter === "all" && l.status === "archived") return false;
      if (!q) return true;
      return [l.name, l.contact_name, l.email, l.phone, l.company, l.notes, l.status, l.location]
        .some(v => v?.toLowerCase().includes(q));
    });
  }, [leads, query, statusFilter]);

  const pendingCallbacks = useMemo(
    () => leads.filter(l => l.callback_at && !l.callback_completed_at)
      .sort((a, b) => new Date(a.callback_at!).getTime() - new Date(b.callback_at!).getTime()),
    [leads],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const l of leads) {
      if (l.status !== "archived") counts.all++;
      counts[l.status] = (counts[l.status] ?? 0) + 1;
    }
    return counts;
  }, [leads]);

  const detailLead = detailId ? leads.find(l => l.id === detailId) ?? null : null;
  const detailEvents = useMemo(
    () => detailId ? events.filter(e => e.lead_id === detailId) : [],
    [events, detailId],
  );

  const usedCount = leads.length;
  const remaining = unlimited ? Infinity : Math.max(0, (maxLeads as number) - usedCount);
  const limitReached = !unlimited && remaining <= 0;

  const openWizard = () => {
    if (limitReached) { toast.error(`Lead limit reached (${maxLeads}). Upgrade to add more.`); return; }
    setForm(emptyForm()); setStep(0); setWizardOpen(true);
  };
  const currentField = WIZARD[step];

  const saveLead = async () => {
    if (limitReached) { toast.error(`Lead limit reached (${maxLeads}).`); return; }
    const name = form.name.trim() || form.contact_name.trim() || form.company.trim() || form.email.trim();
    if (!name) { toast.error("Add at least a name"); return; }
    setSaving(true);
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { toast.error("Not signed in"); setSaving(false); return; }
    const { error } = await supabase.from("customer_leads").insert({
      owner_user_id: uid, name,
      contact_name: form.contact_name.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      location: form.location.trim() || null,
      source: "customer_added", status: "cold",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead added");
    setWizardOpen(false); setStep(0); setForm(emptyForm()); load();
  };

  const continueWizard = (skip = false) => {
    const v = form[currentField.key].trim();
    if (currentField.required && !v) { toast.error(`${currentField.label} is required.`); return; }
    if (!skip && currentField.key === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Enter a valid email (or skip)."); return;
    }
    if (skip && !currentField.required) setForm(f => ({ ...f, [currentField.key]: "" }));
    if (step < WIZARD.length - 1) setStep(s => s + 1); else if (!saving) void saveLead();
  };

  const pasteField = async () => {
    try { const t = (await navigator.clipboard.readText()).trim(); setForm(f => ({ ...f, [currentField.key]: t })); }
    catch { toast.error("Clipboard not available"); }
  };

  const setLeadStatus = async (id: string, status: LeadStatus) => {
    const prev = leads;
    setLeads(s => s.map(l => l.id === id ? { ...l, status } : l));
    const { error } = await supabase.from("customer_leads").update({ status }).eq("id", id);
    if (error) { setLeads(prev); toast.error(error.message); return; }
    // Log a status change event
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (uid) {
      const { data } = await supabase.from("customer_lead_events").insert({
        lead_id: id, owner_user_id: uid, event_type: "status",
        title: `Status → ${statusMeta(status).label}`,
      }).select().single();
      if (data) setEvents(e => [data as LeadEvent, ...e]);
    }
  };

  const deleteLead = async (id: string) => {
    const prev = leads;
    setLeads(s => s.filter(l => l.id !== id));
    if (detailId === id) setDetailId(null);
    const { error } = await supabase.from("customer_leads").delete().eq("id", id);
    if (error) { setLeads(prev); toast.error(error.message); }
  };

  const addNote = async () => {
    if (!detailLead) return;
    const body = noteText.trim();
    if (!body) { toast.error("Write a note first"); return; }
    setSavingEvent(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setSavingEvent(false); return; }
    const { data, error } = await supabase.from("customer_lead_events").insert({
      lead_id: detailLead.id, owner_user_id: uid, event_type: "note",
      title: "Note", description: body,
    }).select().single();
    setSavingEvent(false);
    if (error) { toast.error(error.message); return; }
    setEvents(e => [data as LeadEvent, ...e]);
    setNoteText("");
    toast.success("Note saved");
  };

  const scheduleCallback = async (whenISO?: string) => {
    if (!detailLead) return;
    const when = whenISO ?? (cbWhen ? new Date(cbWhen).toISOString() : "");
    if (!when) { toast.error("Pick a date/time"); return; }
    setSavingEvent(true);
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { setSavingEvent(false); return; }

    const updates = { callback_at: when, callback_completed_at: null };
    const { error: updErr } = await supabase.from("customer_leads").update(updates).eq("id", detailLead.id);
    if (updErr) { setSavingEvent(false); toast.error(updErr.message); return; }
    setLeads(s => s.map(l => l.id === detailLead.id ? { ...l, ...updates } : l));

    const { data, error } = await supabase.from("customer_lead_events").insert({
      lead_id: detailLead.id, owner_user_id: uid, event_type: "callback",
      title: `Callback for ${new Date(when).toLocaleString()}`,
      description: cbNote.trim() || null, callback_at: when,
    }).select().single();
    setSavingEvent(false);
    if (error) { toast.error(error.message); return; }
    setEvents(e => [data as LeadEvent, ...e]);
    setCbNote(""); setCbWhen("");
    toast.success("Callback scheduled");
  };

  const completeCallback = async (lead: MyLead) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("customer_leads")
      .update({ callback_completed_at: now }).eq("id", lead.id);
    if (error) { toast.error(error.message); return; }
    setLeads(s => s.map(l => l.id === lead.id ? { ...l, callback_completed_at: now } : l));
    // mark open callback events complete
    await supabase.from("customer_lead_events")
      .update({ completed_at: now }).eq("lead_id", lead.id).is("completed_at", null).eq("event_type", "callback");
    setEvents(e => e.map(ev => ev.lead_id === lead.id && ev.event_type === "callback" && !ev.completed_at ? { ...ev, completed_at: now } : ev));
    toast.success("Marked done");
  };

  const deleteEvent = async (id: string) => {
    const prev = events;
    setEvents(e => e.filter(x => x.id !== id));
    const { error } = await supabase.from("customer_lead_events").delete().eq("id", id);
    if (error) { setEvents(prev); toast.error(error.message); }
  };

  const handleCsvFile = async (file: File) => {
    if (!file) return;
    if (limitReached) { toast.error(`Lead limit reached (${maxLeads}). Upgrade to import more.`); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("CSV must be under 5MB"); return; }
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { toast.error("CSV is empty"); return; }
      const headerMap = mapHeaders(rows[0]);
      if (Object.keys(headerMap).length === 0) { toast.error("Could not detect columns. Include headers like name, email, phone."); return; }
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) { toast.error("Not signed in"); return; }
      const pick = (row: string[], k: string) => { const i = headerMap[k]; return i === undefined ? null : (row[i]?.trim() || null); };
      const records = rows.slice(1).map(row => {
        const email = pick(row, "email");
        return {
          owner_user_id: uid,
          name: pick(row, "name") || pick(row, "contact_name") || pick(row, "company") || email || "Unnamed",
          contact_name: pick(row, "contact_name"),
          email: email ? email.toLowerCase() : null,
          phone: pick(row, "phone"),
          company: pick(row, "company"),
          notes: pick(row, "notes"),
          location: pick(row, "location"),
          status: (pick(row, "status") || "cold").toLowerCase(),
          source: "csv_import",
        };
      }).filter(r => (r.name && r.name !== "Unnamed") || r.email || r.phone);
      if (records.length === 0) { toast.error("No valid rows found"); return; }
      if (records.length > 2000) { toast.error("Max 2000 rows per upload"); return; }
      let toImport = records;
      if (!unlimited && records.length > remaining) {
        toast.message(`Only ${remaining} of ${records.length} rows will be imported (plan limit ${maxLeads}).`);
        toImport = records.slice(0, remaining);
      }
      let inserted = 0;
      for (let i = 0; i < toImport.length; i += 500) {
        const chunk = toImport.slice(i, i + 500);
        const { error } = await supabase.from("customer_leads").insert(chunk);
        if (error) { toast.error(`Import failed: ${error.message}`); break; }
        inserted += chunk.length;
      }
      if (inserted > 0) { toast.success(`Imported ${inserted} lead${inserted === 1 ? "" : "s"}`); load(); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "CSV import failed"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            My leads <span className="text-sm font-normal text-muted-foreground">· {statusCounts.all ?? 0}{unlimited ? "" : ` / ${maxLeads}`}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Add leads, set hot/cold, schedule callbacks, and save notes. Only you see these.
            {unlimited
              ? <span className="ml-1 text-emerald-300">Unlimited{planLabel ? ` · ${planLabel}` : ""}.</span>
              : <span className={`ml-1 ${limitReached ? "text-red-300" : "text-muted-foreground"}`}>{remaining} of {maxLeads} remaining{planLabel ? ` · ${planLabel}` : ""}.</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search my leads" className="pl-9" />
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload CSV
          </Button>
          <Button variant="pricing" size="sm" className="gap-2" onClick={openWizard}>
            <Plus className="h-4 w-4" /> Add lead
          </Button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([{ value: "all", label: "All" } as const, ...STATUSES] as const).map(s => {
          const active = statusFilter === (s.value as any);
          const meta = s.value === "all" ? null : statusMeta(s.value);
          const count = statusCounts[s.value] ?? 0;
          return (
            <button key={s.value} onClick={() => setStatusFilter(s.value as any)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-foreground/30"
              }`}>
              {meta && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
              {s.label}
              <span className="text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Pending callbacks */}
      {pendingCallbacks.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-200">
            <AlarmClock className="h-4 w-4" /> Upcoming callbacks · {pendingCallbacks.length}
          </div>
          <div className="space-y-1.5">
            {pendingCallbacks.slice(0, 4).map(l => {
              const overdue = new Date(l.callback_at!).getTime() < Date.now();
              return (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <button onClick={() => setDetailId(l.id)} className="truncate text-left hover:underline">
                    {l.contact_name || l.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${overdue ? "text-red-300" : "text-muted-foreground"}`}>
                      {formatCountdown(l.callback_at!)}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => completeCallback(l)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No leads yet</p>
          <p className="text-xs text-muted-foreground">Add one manually or upload a CSV to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {filtered.map((lead) => {
            const meta = statusMeta(lead.status);
            const pending = lead.callback_at && !lead.callback_completed_at;
            return (
              <Card key={lead.id} className="border-border bg-card/70 transition hover:border-foreground/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <button className="min-w-0 text-left" onClick={() => setDetailId(lead.id)}>
                      <CardTitle className="truncate text-base hover:underline">{lead.contact_name || lead.name}</CardTitle>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {lead.company || lead.name} · {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`gap-1.5 ${meta.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteLead(lead.id)} aria-label="Delete lead">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" />{lead.email}</a>}
                    {lead.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><Phone className="h-3.5 w-3.5" />{lead.phone}</a>}
                    {lead.location && <span className="text-muted-foreground">{lead.location}</span>}
                  </div>
                  {pending && (
                    <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                      <AlarmClock className="h-3.5 w-3.5" />
                      Callback {formatCountdown(lead.callback_at!)} · {new Date(lead.callback_at!).toLocaleString()}
                    </div>
                  )}
                  {lead.notes && <p className="whitespace-pre-wrap rounded-md border border-border bg-background/50 p-3 text-xs leading-relaxed text-muted-foreground">{lead.notes}</p>}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {STATUSES.filter(s => s.value !== "archived").map(s => (
                      <button key={s.value} onClick={() => setLeadStatus(lead.id, s.value)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                          lead.status === s.value ? "border-foreground/40 bg-foreground/10" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---- Add lead wizard ---- */}
      <Drawer open={wizardOpen} onOpenChange={setWizardOpen}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Add a lead</DrawerTitle>
            <DrawerDescription>Step {step + 1} of {WIZARD.length}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / WIZARD.length) * 100}%` }} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">{currentField.label}{currentField.required ? " *" : ""}</label>
              <div className="flex gap-2">
                {currentField.multiline ? (
                  <Textarea autoFocus rows={4} placeholder={currentField.placeholder}
                    value={form[currentField.key]}
                    onChange={(e) => setForm(f => ({ ...f, [currentField.key]: e.target.value }))}
                    className="text-base" />
                ) : (
                  <Input autoFocus inputMode={currentField.inputMode} placeholder={currentField.placeholder}
                    value={form[currentField.key]}
                    onChange={(e) => setForm(f => ({ ...f, [currentField.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") continueWizard(); }}
                    className="h-12 text-base" />
                )}
                <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={pasteField} aria-label="Paste">
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-none shadow-none"
                onClick={() => step > 0 ? setStep(s => s - 1) : setWizardOpen(false)} disabled={saving}>
                {step > 0 ? "Back" : "Cancel"}
              </Button>
              <Button disabled={saving} onClick={() => continueWizard()}>
                {step === WIZARD.length - 1 ? (saving ? "Saving…" : "Save") : "Next"}
              </Button>
              {!currentField.required && (
                <Button variant="ghost" className="col-span-2" onClick={() => continueWizard(true)} disabled={saving}>Skip</Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ---- Lead detail drawer ---- */}
      <Drawer open={!!detailLead} onOpenChange={(open) => !open && setDetailId(null)}>
        <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl max-h-[92vh]">
          {detailLead && (
            <>
              <DrawerHeader className="px-0 text-left">
                <button onClick={() => setDetailId(null)} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <DrawerTitle className="flex items-center gap-2">
                  {detailLead.contact_name || detailLead.name}
                  <Badge variant="outline" className={`gap-1.5 ${statusMeta(detailLead.status).text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta(detailLead.status).dot}`} />
                    {statusMeta(detailLead.status).label}
                  </Badge>
                </DrawerTitle>
                <DrawerDescription>
                  {detailLead.company || detailLead.name} · Added {new Date(detailLead.created_at).toLocaleDateString()}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-5 overflow-y-auto pr-1">
                {/* Quick contact */}
                <div className="flex flex-wrap gap-2">
                  {detailLead.phone && <a href={`tel:${detailLead.phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:border-foreground/30"><Phone className="h-3.5 w-3.5" />{detailLead.phone}</a>}
                  {detailLead.email && <a href={`mailto:${detailLead.email}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:border-foreground/30"><Mail className="h-3.5 w-3.5" />{detailLead.email}</a>}
                  {detailLead.location && <span className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">{detailLead.location}</span>}
                </div>

                {/* Status switch */}
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Set status</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map(s => (
                      <button key={s.value} onClick={() => setLeadStatus(detailLead.id, s.value)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                          detailLead.status === s.value ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active callback */}
                {detailLead.callback_at && !detailLead.callback_completed_at && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <div className="flex items-center gap-2 text-amber-200">
                      <AlarmClock className="h-4 w-4" />
                      Callback {formatCountdown(detailLead.callback_at)} · {new Date(detailLead.callback_at).toLocaleString()}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => completeCallback(detailLead)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </Button>
                  </div>
                )}

                {/* Add note */}
                <div className="space-y-2 rounded-md border border-border bg-card/60 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium"><StickyNote className="h-4 w-4" /> Add a note</div>
                  <Textarea rows={3} placeholder="What did you discuss?" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={addNote} disabled={savingEvent} className="gap-1.5">
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Save note
                    </Button>
                  </div>
                </div>

                {/* Schedule callback */}
                <div className="space-y-2 rounded-md border border-border bg-card/60 p-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="h-4 w-4" /> Schedule a callback</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CALLBACK_PRESETS.map(p => (
                      <button key={p.label} onClick={() => scheduleCallback(p.get().toISOString())}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-foreground/40 hover:text-foreground">
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Input type="datetime-local" value={cbWhen} onChange={(e) => setCbWhen(e.target.value)} min={formatLocalDT(new Date())} />
                    <Button size="sm" variant="outline" onClick={() => scheduleCallback()} disabled={savingEvent}>Schedule</Button>
                  </div>
                  <Textarea rows={2} placeholder="Optional reminder note" value={cbNote} onChange={(e) => setCbNote(e.target.value)} />
                </div>

                {/* Timeline */}
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">History</div>
                  {detailEvents.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {detailEvents.map(ev => (
                        <li key={ev.id} className="rounded-md border border-border bg-card/60 p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {ev.event_type === "callback" ? <CalendarClock className="h-3.5 w-3.5 text-amber-300" /> :
                                 ev.event_type === "status" ? <span className="h-2 w-2 rounded-full bg-foreground/40" /> :
                                 <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />}
                                <span className="text-sm font-medium">{ev.title}</span>
                                {ev.completed_at && <Badge variant="outline" className="h-5 text-[10px]">Done</Badge>}
                              </div>
                              {ev.description && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{ev.description}</p>}
                              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEvent(ev.id)} aria-label="Delete event">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
