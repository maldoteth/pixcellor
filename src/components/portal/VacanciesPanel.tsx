import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Plus, Trash2, UserPlus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useConfirmDialog } from "@/components/ui/themed-dialogs";
import AIRecommendationsPanel from "./AIRecommendationsPanel";
import PlaceAutocomplete from "@/components/ui/place-autocomplete";
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
  const confirm = useConfirmDialog();
  const realtimeTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [candidates, setCandidates] = useState<CandidateOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [assignCandidateId, setAssignCandidateId] = useState<string>("");
  const [assignStage, setAssignStage] = useState<string>("shortlisted");
  const [customTimes, setCustomTimes] = useState(false);
  const [perDayTimes, setPerDayTimes] = useState<Record<string, { start: string; finish: string }>>({});
  const [clientQuery, setClientQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ id: string; client_contact_id: string; title: string; snapshot: Record<string, unknown>; created_at: string }>>([]);
  const [titleFocused, setTitleFocused] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm });
    setPerDayTimes({});
    setCustomTimes(false);
    setClientQuery("");
    setEditingId(null);
    setAssignCandidateId("");
    setAssignStage("shortlisted");
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
    if (!loadedRef.current) setLoading(true);
    const [{ data: v, error: ve }, { data: c }, { data: cand }] = await Promise.all([
      supabase.rpc("portal_list_vacancies"),
      supabase.from("contacts").select("id,name,industry").order("name", { ascending: true }).limit(2000),
      supabase.from("candidates").select("id,full_name,email,headline,status").order("full_name", { ascending: true }).limit(2000),
    ]);
    if (ve) toast({ title: "Failed to load vacancies", description: ve.message, variant: "destructive" });
    setVacancies(((v as Vacancy[]) ?? []));
    setClients(((c as ClientOpt[]) ?? []));
    setCandidates(((cand as CandidateOpt[]) ?? []));
    loadedRef.current = true;
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Load saved templates (snapshots of deleted vacancies) when dialog opens
  useEffect(() => {
    if (!openDialog) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vacancy_templates")
        .select("id,client_contact_id,title,snapshot,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled) setTemplates((data as never) ?? []);
    })();
    return () => { cancelled = true; };
  }, [openDialog]);

  const matchingTemplates = useMemo(() => {
    if (!form.client_contact_id) return [];
    const q = form.title.trim().toLowerCase();
    const list = templates.filter((t) => t.client_contact_id === form.client_contact_id);
    // Deduplicate by title (keep newest)
    const seen = new Set<string>();
    const deduped = list.filter((t) => {
      const k = t.title.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!q) return deduped.slice(0, 8);
    return deduped.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 8);
  }, [templates, form.client_contact_id, form.title]);

  const applyTemplate = (snap: Record<string, unknown>) => {
    const s = snap as Record<string, unknown>;
    const str = (k: string) => (s[k] == null ? "" : String(s[k]));
    const arrJoin = (k: string) => Array.isArray(s[k]) ? (s[k] as string[]).join(", ") : "";
    const time = (k: string) => {
      const v = s[k];
      return typeof v === "string" && v.length >= 5 ? v.slice(0, 5) : "";
    };
    setForm((f) => ({
      ...f,
      title: str("title"),
      reference: str("reference"),
      description: str("description"),
      location: str("location"),
      latitude: s.latitude != null ? String(s.latitude) : "",
      longitude: s.longitude != null ? String(s.longitude) : "",
      arrangement: str("arrangement") || "onsite",
      employment_type: str("employment_type") || "permanent",
      // keep current status (don't restore "closed")
      openings: s.openings != null ? String(s.openings) : "1",
      // Intentionally NOT restoring start_date/end_date — those are template-specific
      start_time: time("start_time"),
      finish_time: time("finish_time"),
      schedule_days: Array.isArray(s.schedule_days) ? (s.schedule_days as string[]) : [],
      schedule_notes: str("schedule_notes"),
      duration_weeks: s.duration_weeks != null ? String(s.duration_weeks) : "",
      hours_per_week: s.hours_per_week != null ? String(s.hours_per_week) : "",
      qualifications: arrJoin("qualifications"),
      required_skills: arrJoin("required_skills"),
      nice_to_have_skills: arrJoin("nice_to_have_skills"),
      certifications: arrJoin("certifications"),
      right_to_work_required: !!s.right_to_work_required,
      pay_min: s.pay_min != null ? String(s.pay_min) : "",
      pay_max: s.pay_max != null ? String(s.pay_max) : "",
      pay_currency: str("pay_currency") || "GBP",
      pay_period: str("pay_period") || "hour",
      benefits: str("benefits"),
      notes: str("notes"),
      charge_rate: s.charge_rate != null ? String(s.charge_rate) : "",
      paye_rate_percent: s.paye_rate_percent != null ? String(s.paye_rate_percent) : "21",
    }));
    setTitleFocused(false);
    toast({ title: "Template applied", description: "Fields filled from saved vacancy." });
  };

  useEffect(() => {
    const refreshVacancies = () => {
      if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = window.setTimeout(() => {
        realtimeTimerRef.current = null;
        void load();
      }, 150);
    };

    const channel = supabase
      .channel("vacancies-panel-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vacancies" }, refreshVacancies)
      .on("postgres_changes", { event: "*", schema: "public", table: "vacancy_assignments" }, refreshVacancies)
      .on("postgres_changes", { event: "*", schema: "public", table: "vacancy_shifts" }, refreshVacancies)
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [load]);

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

  const editingVacancy = useMemo(
    () => editingId ? vacancies.find((v) => v.id === editingId) ?? null : null,
    [editingId, vacancies],
  );

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
      ? await supabase.rpc("portal_update_vacancy" as never, { _id: editingId, _patch: payload } as never)
      : await supabase.rpc("portal_create_vacancy" as never, { _payload: payload } as never);
    setSaving(false);
    if (error) { toast({ title: editingId ? "Could not update vacancy" : "Could not create vacancy", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "Vacancy updated" : "Vacancy created" });
    setOpenDialog(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    const v = vacancies.find((x) => x.id === id);
    const clientName = v?.client?.name ?? "this client";
    const openings = Math.max(1, Number(v?.openings ?? 1) || 1);
    const dateRange = v?.start_date
      ? `${v.start_date}${v.end_date && v.end_date !== v.start_date ? ` → ${v.end_date}` : ""}`
      : "no date window";
    const assignCount = (v?.assignments ?? []).filter((a) =>
      ["shortlisted","submitted","interviewing","offer","placed"].includes(a.stage),
    ).length;
    const ok = await confirm({
      title: `Delete "${v?.title ?? "vacancy"}"?`,
      description:
        `This removes ONLY this vacancy for ${clientName}. Other vacancies for the same client are not affected.\n\n` +
        `• Openings: ${openings}\n` +
        `• Dates: ${dateRange}\n` +
        `• Active candidate assignments: ${assignCount}\n\n` +
        `All shifts and timesheets attached to this vacancy will also be deleted. This cannot be undone (a template snapshot will be saved so you can recreate it later).`,
      confirmLabel: "Delete vacancy",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc("portal_delete_vacancy", { _id: id });
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vacancy deleted" });
    load();
  };

  const handleAssign = async (vacancyId: string) => {
    if (!assignCandidateId) { toast({ title: "Pick a candidate", variant: "destructive" }); return; }
    // Find the first empty slot so the candidate fills one opening, not all of them.
    const vac = vacancies.find((v) => v.id === vacancyId);
    const openings = Math.max(1, Number(vac?.openings ?? 1) || 1);
    const activeStages = ["shortlisted","submitted","interviewing","offer","placed"];
    const takenSlots = new Set(
      (vac?.assignments ?? [])
        .filter((a) => activeStages.includes(a.stage))
        .map((a) => Number(a.slot_index ?? 0))
    );
    let targetSlot = 0;
    for (let i = 0; i < openings; i++) { if (!takenSlots.has(i)) { targetSlot = i; break; } if (i === openings - 1) targetSlot = openings - 1; }
    const { error } = await supabase.rpc("portal_assign_candidate_to_vacancy", {
      _vacancy_id: vacancyId, _candidate_id: assignCandidateId, _stage: assignStage, _slot: targetSlot,
    } as never);
    if (error) { toast({ title: "Assign failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Candidate assigned" });
    setAssignCandidateId(""); setAssignStage("shortlisted");
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
          candidates={candidates}
          onCreate={() => { resetForm(); setOpenDialog(true); }}
          onEdit={openEdit}
          onDelete={handleDelete}
          onVacancyChanged={load}
        />
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
            <div className="sm:col-span-2">
              <Label>Job title *</Label>
              <div className="relative">
                <Input
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); setTitleFocused(true); }}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => window.setTimeout(() => setTitleFocused(false), 150)}
                  maxLength={160}
                  placeholder={form.client_contact_id ? "Start typing — past vacancies for this client appear below" : "Select a client first to see saved templates"}
                />
                {titleFocused && matchingTemplates.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Saved templates from deleted vacancies</div>
                    {matchingTemplates.map((t) => {
                      const s = t.snapshot as Record<string, unknown>;
                      const bits = [
                        s.employment_type as string,
                        s.location as string,
                        s.pay_min || s.pay_max ? `${s.pay_currency ?? "GBP"} ${s.pay_min ?? "?"}–${s.pay_max ?? "?"}/${s.pay_period ?? ""}` : null,
                      ].filter(Boolean);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); applyTemplate(t.snapshot); }}
                          className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <span className="font-medium">{t.title}</span>
                          {bits.length > 0 && <span className="truncate text-xs text-muted-foreground">{bits.join(" · ")}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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
                    {customTimes ? "Hide" : "Variable"}
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
            {editingVacancy && (
              <div className="sm:col-span-2 space-y-3 border-t pt-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" />Assignments</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
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
                        <Button type="button" onClick={() => handleAssign(editingVacancy.id)} disabled={!assignCandidateId}>Assign</Button>
                      </div>
                      <div className="space-y-2">
                        {(editingVacancy.assignments ?? []).length === 0 ? (
                          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No candidates assigned yet.</div>
                        ) : (editingVacancy.assignments ?? []).map((a) => (
                          <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">#{Number(a.slot_index ?? 0) + 1} · {a.candidate.full_name}</div>
                              <div className="truncate text-xs text-muted-foreground">{a.candidate.email || a.candidate.phone || a.candidate.headline || "Candidate"}</div>
                            </div>
                            <Select value={a.stage} onValueChange={(stage) => handleStageChange(a.id, stage)}>
                              <SelectTrigger className="h-8 w-[138px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleUnassign(a.id)} title="Unassign candidate">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">AI recommendations</CardTitle></CardHeader>
                    <CardContent><AIRecommendationsPanel vacancyId={editingVacancy.id} /></CardContent>
                  </Card>
                </div>
              </div>
            )}
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
