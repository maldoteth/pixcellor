import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Plus, Trash2, UserPlus, X, Search, Loader2 } from "lucide-react";
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
  created_at: string;
  client?: { id: string; name: string; industry?: string | null; location?: string | null } | null;
  assignments?: Array<{
    id: string;
    candidate_id: string;
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
  right_to_work_required: false,
  pay_min: "",
  pay_max: "",
  pay_currency: "GBP",
  pay_period: "year",
  benefits: "",
  notes: "",
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
    if (!form.client_contact_id) { toast({ title: "Select a client", variant: "destructive" }); return; }
    if (!form.title.trim()) { toast({ title: "Job title is required", variant: "destructive" }); return; }
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
    const mergedNotes = [form.schedule_notes, extraNotes].filter(Boolean).join(" | ");
    const payload = {
      ...form,
      schedule_notes: mergedNotes,
      openings: form.openings ? Number(form.openings) : 1,
      duration_weeks: form.duration_weeks || null,
      hours_per_week: form.hours_per_week || null,
      pay_min: form.pay_min || null,
      pay_max: form.pay_max || null,
      qualifications: toArr(form.qualifications),
      required_skills: toArr(form.required_skills),
      nice_to_have_skills: toArr(form.nice_to_have_skills),
      certifications: toArr(form.certifications),
    };
    const { error } = await supabase.rpc("portal_create_vacancy", { _payload: payload as any });
    setSaving(false);
    if (error) { toast({ title: "Could not create vacancy", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vacancy created" });
    setOpenDialog(false);
    setForm({ ...emptyForm });
    setPerDayTimes({});
    setCustomTimes(false);
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
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No vacancies yet. Create your first job opening.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => (
            <Card key={v.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    {v.title}
                    <Badge variant="secondary">{v.employment_type}</Badge>
                    <Badge variant={v.status === "open" ? "default" : "outline"}>{v.status}</Badge>
                    {v.arrangement && <Badge variant="outline">{v.arrangement}</Badge>}
                    {v.openings > 1 && <Badge variant="outline">{v.openings} openings</Badge>}
                  </CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Client: <span className="text-foreground">{v.client?.name ?? "—"}</span>
                    {v.location && <> · {v.location}</>}
                    {v.reference && <> · Ref {v.reference}</>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAssignTo(v.id)} className="gap-1"><UserPlus className="h-4 w-4" />Assign</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(v.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-muted-foreground">
                  {(v.start_date || v.end_date) && <div><span className="text-foreground">Dates:</span> {v.start_date ?? "?"} → {v.end_date ?? "ongoing"}</div>}
                  {(v.start_time || v.finish_time) && <div><span className="text-foreground">Hours:</span> {v.start_time ?? "?"}–{v.finish_time ?? "?"}</div>}
                  {v.schedule_days && v.schedule_days.length > 0 && <div><span className="text-foreground">Days:</span> {v.schedule_days.join(", ")}</div>}
                  {v.duration_weeks && <div><span className="text-foreground">Duration:</span> {v.duration_weeks} weeks</div>}
                  {v.hours_per_week && <div><span className="text-foreground">Hours/week:</span> {v.hours_per_week}</div>}
                  {(v.pay_min || v.pay_max) && <div><span className="text-foreground">Pay:</span> {v.pay_currency} {v.pay_min ?? "?"}–{v.pay_max ?? "?"} / {v.pay_period}</div>}
                  {v.right_to_work_required && <div className="text-foreground">Right-to-work required</div>}
                </div>
                {v.required_skills && v.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5"><span className="text-muted-foreground text-xs">Skills:</span>{v.required_skills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                )}
                {v.qualifications && v.qualifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5"><span className="text-muted-foreground text-xs">Qualifications:</span>{v.qualifications.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                )}
                {v.description && <p className="text-muted-foreground whitespace-pre-wrap">{v.description}</p>}

                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Assigned candidates ({v.assignments?.length ?? 0})</div>
                  {(!v.assignments || v.assignments.length === 0) ? (
                    <div className="text-xs text-muted-foreground">No candidates assigned yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {v.assignments.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-medium">{a.candidate.full_name}</div>
                            <div className="text-xs text-muted-foreground">{a.candidate.headline ?? a.candidate.email ?? a.candidate.phone ?? ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={a.stage} onValueChange={(val) => handleStageChange(a.id, val)}>
                              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="icon" variant="ghost" onClick={() => handleUnassign(a.id)} className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {assignTo === v.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
                      <Select value={assignCandidateId} onValueChange={setAssignCandidateId}>
                        <SelectTrigger className="h-9 min-w-[220px] flex-1"><SelectValue placeholder="Select candidate…" /></SelectTrigger>
                        <SelectContent>
                          {candidates.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}{c.headline ? ` — ${c.headline}` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={assignStage} onValueChange={setAssignStage}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => handleAssign(v.id)}>Assign</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAssignTo(null); setAssignCandidateId(""); }}>Cancel</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>New vacancy</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_contact_id} onValueChange={(v) => setForm({ ...form, client_contact_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select a client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.industry ? ` (${c.industry})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Job title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
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
            <div className="sm:col-span-2"><Label>Required skills (comma-separated)</Label><Input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Nice-to-have skills</Label><Input value={form.nice_to_have_skills} onChange={(e) => setForm({ ...form, nice_to_have_skills: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Qualifications</Label><Input value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} placeholder="Degree, NVQ Level 3…" /></div>
            <div className="sm:col-span-2"><Label>Certifications / tickets</Label><Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="CSCS, SMSTS, First Aid…" /></div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <Checkbox id="rtw" checked={form.right_to_work_required} onCheckedChange={(v) => setForm({ ...form, right_to_work_required: !!v })} />
              <Label htmlFor="rtw">Right to work in UK required</Label>
            </div>
            <div className="sm:col-span-2"><Label>Benefits</Label><Textarea rows={2} value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Internal notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving…" : "Create vacancy"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
