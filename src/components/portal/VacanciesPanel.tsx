import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, Trash2, UserPlus, X, Search, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import AIRecommendationsPanel from "./AIRecommendationsPanel";
import PlaceAutocomplete from "@/components/ui/place-autocomplete";
import VacancyCalendarStrip from "./VacancyCalendarStrip";
import ShiftPlannerGrid from "./ShiftPlannerGrid";

type Vacancy = {
  id: string;
  client_contact_id: string;
  title: string;
  reference: string | null;
  description: string | null;
  location: string | null;
  arrangement: string | null;
  employment_type: string;
  status: string;
  openings: number;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  schedule_days: string[] | null;
  schedule_notes: string | null;
  duration_weeks: number | null;
  hours_per_week: number | null;
  qualifications: string[] | null;
  required_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  certifications: string[] | null;
  right_to_work_required: boolean | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  benefits: string | null;
  notes: string | null;
  charge_rate: number | null;
  paye_rate_percent: number | null;
  created_at: string;
  client?: { id: string; name: string; industry?: string | null; location?: string | null } | null;
  assignments?: Array<{
    id: string;
    candidate_id: string;
    slot_index: number;
    stage: string;
    notes: string | null;
    assigned_at: string;
    candidate: { id: string; full_name: string; email: string | null; phone: string | null; headline: string | null; status: string };
  }>;
};

type ClientOpt = { id: string; name: string; industry?: string | null };
type CandidateOpt = { id: string; full_name: string; email: string | null; headline: string | null; status: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMP_TYPES = ["permanent", "temporary", "contract", "freelance", "internship"];
const ARRANGEMENTS = ["onsite", "hybrid", "remote"];
const STATUSES = ["draft", "open", "on_hold", "filled", "cancelled", "closed"];
const STAGES = ["shortlisted", "submitted", "interviewing", "offer", "placed", "rejected", "withdrawn"];

const emptyForm = {
  client_contact_id: "",
  title: "",
  reference: "",
  description: "",
  location: "",
  latitude: "" as string,
  longitude: "" as string,
  arrangement: "onsite",
  employment_type: "permanent",
  status: "open",
  openings: "1",
  start_date: "",
  end_date: "",
  start_time: "",
  finish_time: "",
  schedule_days: [] as string[],
  schedule_notes: "",
  duration_weeks: "",
  hours_per_week: "",
  qualifications: "",
  required_skills: "",
  nice_to_have_skills: "",
  certifications: "",
  right_to_work_required: true,
  pay_min: "",
  pay_max: "",
  pay_currency: "GBP",
  pay_period: "hour",
  benefits: "",
  notes: "",
  charge_rate: "",
  paye_rate_percent: "21",
};

export default function VacanciesPanel() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [candidates, setCandidates] = useState<CandidateOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState<string>("");
  const [assignStage, setAssignStage] = useState<string>("shortlisted");
  const [customTimes, setCustomTimes] = useState(false);
  const [perDayTimes, setPerDayTimes] = useState<Record<string, { start: string; finish: string }>>({});
  const [clientQuery, setClientQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiFor, setAiFor] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm });
    setPerDayTimes({});
    setCustomTimes(false);
    setClientQuery("");
    setEditingId(null);
  }, []);

  const openEdit = (v: Vacancy) => {
    // Parse per-day times out of schedule_notes if present
    const perDay: Record<string, { start: string; finish: string }> = {};
    let baseNotes = v.schedule_notes ?? "";
    if (baseNotes.includes("|")) {
      const parts = baseNotes.split("|");
      baseNotes = parts[0].trim();
      const extras = parts.slice(1).join("|");
      const re = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2}|--:--)\s*[–—-]\s*(\d{1,2}:\d{2}|--:--)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(extras)) !== null) {
        const d = m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase();
        perDay[d] = {
          start: m[2] === "--:--" ? "" : m[2],
          finish: m[3] === "--:--" ? "" : m[3],
        };
      }
    }
    setPerDayTimes(perDay);
    setCustomTimes(Object.keys(perDay).length > 0);
    setForm({
      client_contact_id: v.client_contact_id ?? "",
      title: v.title ?? "",
      reference: v.reference ?? "",
      description: v.description ?? "",
      location: v.location ?? "",
      latitude: "",
      longitude: "",
      arrangement: v.arrangement ?? "onsite",
      employment_type: v.employment_type ?? "permanent",
      status: v.status ?? "open",
      openings: String(v.openings ?? 1),
      start_date: v.start_date ?? "",
      end_date: v.end_date ?? "",
      start_time: v.start_time ? v.start_time.slice(0, 5) : "",
      finish_time: v.finish_time ? v.finish_time.slice(0, 5) : "",
      schedule_days: (v.schedule_days ?? []) as string[],
      schedule_notes: baseNotes,
      duration_weeks: v.duration_weeks != null ? String(v.duration_weeks) : "",
      hours_per_week: v.hours_per_week != null ? String(v.hours_per_week) : "",
      qualifications: (v.qualifications ?? []).join(", "),
      required_skills: (v.required_skills ?? []).join(", "),
      nice_to_have_skills: (v.nice_to_have_skills ?? []).join(", "),
      certifications: (v.certifications ?? []).join(", "),
      right_to_work_required: v.right_to_work_required ?? true,
      pay_min: v.pay_min != null ? String(v.pay_min) : "",
      pay_max: v.pay_max != null ? String(v.pay_max) : "",
      pay_currency: v.pay_currency ?? "GBP",
      pay_period: v.pay_period ?? "hour",
      benefits: v.benefits ?? "",
      notes: v.notes ?? "",
      charge_rate: v.charge_rate != null ? String(v.charge_rate) : "",
      paye_rate_percent: v.paye_rate_percent != null ? String(v.paye_rate_percent) : "21",
    });
    setEditingId(v.id);
    setClientQuery("");
    setOpenDialog(true);
  };

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.industry ?? "").toLowerCase().includes(q)
    );
  }, [clients, clientQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: v, error: ve }, { data: c }, { data: cand }] = await Promise.all([
      supabase.rpc("portal_list_vacancies"),
      supabase.from("contacts").select("id,name,industry").order("name", { ascending: true }).limit(2000),
      supabase.from("candidates").select("id,full_name,email,headline,status").order("full_name", { ascending: true }).limit(2000),
    ]);
    if (ve) toast({ title: "Failed to load vacancies", description: ve.message, variant: "destructive" });
    setVacancies(((v as Vacancy[]) ?? []));
    setClients(((c as ClientOpt[]) ?? []));
    setCandidates(((cand as CandidateOpt[]) ?? []));
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return vacancies.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        v.title.toLowerCase().includes(q) ||
        (v.client?.name ?? "").toLowerCase().includes(q) ||
        (v.location ?? "").toLowerCase().includes(q) ||
        (v.required_skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [vacancies, query, statusFilter]);

  const toArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const handleCreate = async () => {
    const title = form.title.trim();
    if (!form.client_contact_id) { toast({ title: "Select a client", variant: "destructive" }); return; }
    if (!title) { toast({ title: "Job title is required", variant: "destructive" }); return; }
    if (title.length > 160) { toast({ title: "Job title must be 160 characters or fewer", variant: "destructive" }); return; }
    setSaving(true);
    const extraNotes = customTimes
      ? form.schedule_days
          .map((d) => {
            const t = perDayTimes[d];
            if (!t || (!t.start && !t.finish)) return null;
            return `${d} ${t.start || "--:--"}–${t.finish || "--:--"}`;
          })
          .filter(Boolean)
          .join(", ")
      : "";
    const mergedNotes = [form.schedule_notes.trim(), extraNotes].filter(Boolean).join(" | ");
    const numOrNull = (s: string) => (s && !isNaN(Number(s)) ? Number(s) : null);
    const payload: Record<string, unknown> = {
      client_contact_id: form.client_contact_id,
      title,
      reference: form.reference.trim() || null,
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      latitude: form.latitude || null,
      longitude: form.longitude || null,
      arrangement: form.arrangement,
      employment_type: form.employment_type,
      status: form.status,
      openings: numOrNull(form.openings) ?? 1,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      start_time: form.start_time || null,
      finish_time: form.finish_time || null,
      schedule_days: form.schedule_days,
      schedule_notes: mergedNotes || null,
      duration_weeks: numOrNull(form.duration_weeks),
      hours_per_week: numOrNull(form.hours_per_week),
      qualifications: toArr(form.qualifications),
      required_skills: toArr(form.required_skills),
      nice_to_have_skills: toArr(form.nice_to_have_skills),
      certifications: toArr(form.certifications),
      right_to_work_required: form.right_to_work_required,
      pay_min: numOrNull(form.pay_min),
      pay_max: numOrNull(form.pay_max),
      pay_currency: form.pay_currency.trim() || "GBP",
      pay_period: form.pay_period,
      benefits: form.benefits.trim() || null,
      notes: form.notes.trim() || null,
      charge_rate: numOrNull(form.charge_rate),
      paye_rate_percent: numOrNull(form.paye_rate_percent) ?? 21,
    };
    const { error } = editingId
      ? await supabase.rpc("portal_update_vacancy", { _id: editingId, _patch: payload as any })
      : await supabase.rpc("portal_create_vacancy", { _payload: payload as any });
    setSaving(false);
    if (error) { toast({ title: editingId ? "Could not update vacancy" : "Could not create vacancy", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "Vacancy updated" : "Vacancy created" });
    setOpenDialog(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vacancy?")) return;
    const { error } = await supabase.rpc("portal_delete_vacancy", { _id: id });
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vacancy deleted" });
    load();
  };

  const handleAssign = async (vacancyId: string) => {
    if (!assignCandidateId) { toast({ title: "Pick a candidate", variant: "destructive" }); return; }
    const { error } = await supabase.rpc("portal_assign_candidate_to_vacancy", {
      _vacancy_id: vacancyId, _candidate_id: assignCandidateId, _stage: assignStage,
    });
    if (error) { toast({ title: "Assign failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Candidate assigned" });
    setAssignTo(null); setAssignCandidateId(""); setAssignStage("shortlisted");
    load();
  };

  const handleUnassign = async (assignmentId: string) => {
    const { error } = await supabase.rpc("portal_unassign_candidate", { _assignment_id: assignmentId });
    if (error) { toast({ title: "Unassign failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const handleStageChange = async (assignmentId: string, stage: string) => {
    const { error } = await supabase.rpc("portal_update_assignment_stage", { _assignment_id: assignmentId, _stage: stage });
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="h-5 w-5" />Vacancies</h2>
          <p className="text-sm text-muted-foreground">Open roles tied to clients — assign candidates and track each stage.</p>
        </div>
        <Button onClick={() => setOpenDialog(true)} className="gap-2"><Plus className="h-4 w-4" />New vacancy</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, client, skill…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <ShiftPlannerGrid
          vacancies={filtered}
          onCreate={() => { resetForm(); setOpenDialog(true); }}
          onEdit={openEdit}
          onAssign={(id) => setAssignTo(id)}
          onDelete={handleDelete}
          onOpenAI={(id) => setAiFor(id)}
          onVacancyChanged={load}
        />
      )}

      {aiFor && (
        <Dialog open={!!aiFor} onOpenChange={(o) => { if (!o) setAiFor(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>AI recommendations</DialogTitle></DialogHeader>
            <AIRecommendationsPanel vacancyId={aiFor} />
          </DialogContent>
        </Dialog>
      )}

      {assignTo && (
        <Dialog open={!!assignTo} onOpenChange={(o) => { if (!o) { setAssignTo(null); setAssignCandidateId(""); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Assign candidate</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={assignCandidateId} onValueChange={setAssignCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select candidate…" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}{c.headline ? ` — ${c.headline}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={assignStage} onValueChange={setAssignStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Tip: open AI recommendations and assignments by editing the vacancy.
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setAssignTo(null); setAssignCandidateId(""); }}>Cancel</Button>
              <Button onClick={() => assignTo && handleAssign(assignTo)}>Assign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) resetForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit vacancy" : "New vacancy"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Client *</Label>
              {clients.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No clients yet — add a contact in the Contacts tab first.
                </div>
              ) : (
                <Select value={form.client_contact_id} onValueChange={(v) => setForm({ ...form, client_contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a client…" /></SelectTrigger>
                  <SelectContent>
                    <div className="sticky top-0 z-10 bg-popover p-1">
                      <Input
                        autoFocus
                        value={clientQuery}
                        onChange={(e) => setClientQuery(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Search clients…"
                        className="h-8"
                      />
                    </div>
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                    ) : (
                      filteredClients.slice(0, 200).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.industry ? ` (${c.industry})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="sm:col-span-2"><Label>Job title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <Label>Site address</Label>
              <PlaceAutocomplete
                value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v, latitude: "", longitude: "" }))}
                onPick={(p) => setForm((f) => ({ ...f, location: p.address, latitude: String(p.latitude), longitude: String(p.longitude) }))}
                countries={["gb"]}
                placeholder="Search for the job site address…"
              />
              {form.latitude && form.longitude && (
                <p className="text-[10px] text-muted-foreground mt-1">Pinned: {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}</p>
              )}
            </div>
            <div>
              <Label>Employment type</Label>
              <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMP_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arrangement</Label>
              <Select value={form.arrangement} onValueChange={(v) => setForm({ ...form, arrangement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ARRANGEMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Openings</Label><Input type="number" min="1" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} /></div>
            <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>Finish time</Label><Input type="time" value={form.finish_time} onChange={(e) => setForm({ ...form, finish_time: e.target.value })} /></div>
            <div><Label>Duration (weeks)</Label><Input type="number" value={form.duration_weeks} onChange={(e) => setForm({ ...form, duration_weeks: e.target.value })} /></div>
            <div><Label>Hours / week</Label><Input type="number" step="0.5" value={form.hours_per_week} onChange={(e) => setForm({ ...form, hours_per_week: e.target.value })} /></div>
            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Working days</Label>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, schedule_days: [...DAYS] })}>All</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, schedule_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] })}>Weekdays</Button>
                  <Button type="button" size="sm" variant={customTimes ? "default" : "outline"} onClick={() => setCustomTimes((s) => !s)}>
                    {customTimes ? "Hide per-day times" : "Customise times per day"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                {DAYS.map((d) => {
                  const checked = form.schedule_days.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-1.5 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        setForm({ ...form, schedule_days: v ? [...form.schedule_days, d] : form.schedule_days.filter((x) => x !== d) });
                      }} />
                      {d}
                    </label>
                  );
                })}
              </div>
              {customTimes && form.schedule_days.length > 0 && (
                <div className="mt-3 space-y-2 rounded-md border border-border/50 p-3">
                  {form.schedule_days.map((d) => {
                    const t = perDayTimes[d] ?? { start: form.start_time, finish: form.finish_time };
                    return (
                      <div key={d} className="grid grid-cols-[60px_1fr_1fr] items-center gap-2">
                        <span className="text-sm font-medium">{d}</span>
                        <Input type="time" value={t.start} onChange={(e) => setPerDayTimes({ ...perDayTimes, [d]: { ...t, start: e.target.value } })} />
                        <Input type="time" value={t.finish} onChange={(e) => setPerDayTimes({ ...perDayTimes, [d]: { ...t, finish: e.target.value } })} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sm:col-span-2"><Label>Schedule notes</Label><Input value={form.schedule_notes} onChange={(e) => setForm({ ...form, schedule_notes: e.target.value })} placeholder="e.g. nights, alternating weeks" /></div>
            <div><Label>Pay min</Label><Input type="number" value={form.pay_min} onChange={(e) => setForm({ ...form, pay_min: e.target.value })} /></div>
            <div><Label>Pay max</Label><Input type="number" value={form.pay_max} onChange={(e) => setForm({ ...form, pay_max: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.pay_currency} onChange={(e) => setForm({ ...form, pay_currency: e.target.value })} /></div>
            <div>
              <Label>Pay period</Label>
              <Select value={form.pay_period} onValueChange={(v) => setForm({ ...form, pay_period: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["hour", "day", "week", "month", "year"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Charge rate (to client, /{form.pay_period})</Label><Input type="number" step="0.01" value={form.charge_rate} onChange={(e) => setForm({ ...form, charge_rate: e.target.value })} placeholder="e.g. 22.50" /></div>
            <div><Label>PAYE on-cost %</Label><Input type="number" step="0.1" value={form.paye_rate_percent} onChange={(e) => setForm({ ...form, paye_rate_percent: e.target.value })} placeholder="21" /></div>
            <div className="sm:col-span-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              {(() => {
                const pay = Number(form.pay_max || form.pay_min || 0);
                const charge = Number(form.charge_rate || 0);
                const paye = Number(form.paye_rate_percent || 0);
                const onCost = pay * (paye / 100);
                const totalCost = pay + onCost;
                const margin = charge - totalCost;
                const marginPct = charge > 0 ? (margin / charge) * 100 : 0;
                if (!pay && !charge) return <span className="text-muted-foreground">Enter pay rate and charge rate to see margin.</span>;
                return (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>Pay: <strong>{form.pay_currency} {pay.toFixed(2)}</strong></span>
                    <span>PAYE ({paye}%): <strong>{form.pay_currency} {onCost.toFixed(2)}</strong></span>
                    <span>Total cost: <strong>{form.pay_currency} {totalCost.toFixed(2)}</strong></span>
                    <span>Charge: <strong>{form.pay_currency} {charge.toFixed(2)}</strong></span>
                    <span className={margin >= 0 ? "text-emerald-600" : "text-destructive"}>
                      Margin: <strong>{form.pay_currency} {margin.toFixed(2)} ({marginPct.toFixed(1)}%)</strong>
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="sm:col-span-2"><Label>Required skills (comma-separated)</Label><Input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Nice-to-have skills</Label><Input value={form.nice_to_have_skills} onChange={(e) => setForm({ ...form, nice_to_have_skills: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Qualifications</Label><Input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="Degree, NVQ Level 3…" /></div>
            <div className="sm:col-span-2"><Label>Certifications / tickets</Label><Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="CSCS, SMSTS, First Aid…" /></div>
            <div className="sm:col-span-2"><Label>Benefits</Label><Textarea rows={2} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Internal notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenDialog(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.client_contact_id || !form.title.trim()}
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : editingId ? "Save changes" : "Create vacancy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
