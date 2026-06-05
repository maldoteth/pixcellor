import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Star, Upload, ExternalLink, FileText, Trash2, Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";
import CsvImportDialog from "@/components/portal/CsvImportDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initialsOf(name: string) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
}

const STATUSES = [
  "new", "screening", "shortlisted", "submitted", "interviewing", "offer", "placed", "rejected", "on_hold", "archived",
] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  new: "New", screening: "Screening", shortlisted: "Shortlisted", submitted: "Submitted",
  interviewing: "Interviewing", offer: "Offer", placed: "Placed", rejected: "Rejected",
  on_hold: "On hold", archived: "Archived",
};

const STATUS_COLOR: Record<Status, string> = {
  new: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  screening: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  shortlisted: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  submitted: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  interviewing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  offer: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  placed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  on_hold: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  archived: "bg-muted text-muted-foreground border-border",
};

type Candidate = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  current_role_title: string | null;
  current_employer: string | null;
  years_experience: number | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  salary_currency: string | null;
  desired_work_type: string;
  desired_arrangement: string;
  right_to_work: string;
  skills: string[];
  preferred_locations: string[];
  industries: string[];
  tags: string[];
  notes: string | null;
  status: Status;
  rating: number | null;
  source: string;
  source_detail: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type CandidateEvent = {
  id: string; candidate_id: string; event_type: string; title: string;
  description: string | null; created_at: string; callback_at: string | null; completed_at: string | null;
};

const emptyForm = {
  full_name: "", email: "", phone: "", location: "", headline: "", summary: "",
  current_role_title: "", current_employer: "", years_experience: "" as string,
  desired_salary_min: "" as string, desired_salary_max: "" as string,
  desired_work_type: "any", desired_arrangement: "any", right_to_work: "unknown",
  skills: "" as string, preferred_locations: "" as string,
  linkedin_url: "", portfolio_url: "", cv_url: "", notes: "",
};

function splitList(v: string): string[] {
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

export default function CandidatesPanel() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [events, setEvents] = useState<CandidateEvent[]>([]);
  const [eventNote, setEventNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("candidates").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("candidates-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "candidate_events" }, () => {
        if (activeId) loadEvents(activeId);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, activeId]);

  const loadEvents = useCallback(async (id: string) => {
    const { data } = await (supabase as any)
      .from("candidate_events").select("*").eq("candidate_id", id).order("created_at", { ascending: false });
    setEvents((data as CandidateEvent[]) ?? []);
  }, []);

  useEffect(() => { if (activeId) loadEvents(activeId); }, [activeId, loadEvents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.headline?.toLowerCase().includes(q) ||
        c.current_role_title?.toLowerCase().includes(q) ||
        (c.skills ?? []).some(s => s.toLowerCase().includes(q))
      );
    });
  }, [candidates, query, statusFilter]);

  const active = activeId ? candidates.find(c => c.id === activeId) ?? null : null;

  const createCandidate = async () => {
    if (!form.full_name.trim()) { toast.error("Name required"); return; }
    if (!form.email.trim() && !form.phone.trim()) { toast.error("Email or phone required"); return; }
    setCreating(true);
    const { data, error } = await (supabase as any).rpc("portal_create_candidate", {
      _full_name: form.full_name.trim(),
      _email: form.email.trim() || null,
      _phone: form.phone.trim() || null,
      _location: form.location.trim() || null,
      _headline: form.headline.trim() || null,
      _summary: form.summary.trim() || null,
      _years_experience: form.years_experience ? Number(form.years_experience) : null,
      _current_role_title: form.current_role_title.trim() || null,
      _current_employer: form.current_employer.trim() || null,
      _desired_salary_min: form.desired_salary_min ? Number(form.desired_salary_min) : null,
      _desired_salary_max: form.desired_salary_max ? Number(form.desired_salary_max) : null,
      _desired_work_type: form.desired_work_type,
      _desired_arrangement: form.desired_arrangement,
      _right_to_work: form.right_to_work,
      _skills: splitList(form.skills),
      _preferred_locations: splitList(form.preferred_locations),
      _linkedin_url: form.linkedin_url.trim() || null,
      _portfolio_url: form.portfolio_url.trim() || null,
      _cv_url: form.cv_url.trim() || null,
      _notes: form.notes.trim() || null,
      _source: "manual",
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Candidate added");
    setForm({ ...emptyForm });
    setCreateOpen(false);
    load();
    if (data?.id) setActiveId(data.id);
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await (supabase as any).rpc("portal_update_candidate_status", {
      _id: id, _status: status, _note: null,
    });
    if (error) toast.error(error.message);
    else load();
  };

  const addEvent = async () => {
    if (!activeId || !eventNote.trim()) return;
    const { error } = await (supabase as any).rpc("portal_create_candidate_event", {
      _candidate_id: activeId, _title: eventNote.trim().slice(0, 200), _description: eventNote.trim(), _event_type: "note", _callback_at: null,
    });
    if (error) { toast.error(error.message); return; }
    setEventNote("");
    loadEvents(activeId);
  };

  const setRating = async (id: string, rating: number) => {
    const { error } = await (supabase as any).rpc("portal_update_candidate", { _id: id, _patch: { rating } });
    if (error) toast.error(error.message); else load();
  };

  const uploadCv = async (file: File) => {
    if (!activeId) return;
    setUploading(true);
    try {
      const path = `${activeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("candidate-files").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("candidate-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      const { error } = await (supabase as any).rpc("portal_add_candidate_document", {
        _candidate_id: activeId, _kind: "cv", _file_url: url, _filename: file.name, _size_bytes: file.size, _mime_type: file.type,
      });
      if (error) throw error;
      toast.success("CV uploaded");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async (id: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setPhotoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("candidate-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("candidate-photos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error } = await (supabase as any).rpc("portal_update_candidate", { _id: id, _patch: { photo_url: url } });
      if (error) throw error;
      toast.success("Photo updated");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = async (id: string) => {
    const { error } = await (supabase as any).rpc("portal_update_candidate", { _id: id, _patch: { photo_url: null } });
    if (error) toast.error(error.message); else { toast.success("Photo removed"); load(); }
  };

  const exportCsv = () => {
    const rows = [
      ["Name","Email","Phone","Location","Headline","Current role","Experience","Status","Skills","Source","Created"],
      ...filtered.map(c => [
        c.full_name, c.email ?? "", c.phone ?? "", c.location ?? "", c.headline ?? "", c.current_role_title ?? "",
        c.years_experience?.toString() ?? "", c.status, (c.skills ?? []).join("; "), c.source, c.created_at,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `candidates-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Candidates</h2>
          <p className="text-sm text-muted-foreground">Job seekers and applicants. Bot, apply form and manual entries.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New candidate</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import candidates"
        description="Upload a CSV of candidates. We'll auto-match common headers — adjust the mapping if needed."
        columns={[
          { key: "full_name", label: "Full name", required: true, aliases: ["name", "candidate", "candidate_name"] },
          { key: "email", label: "Email", aliases: ["e_mail"] },
          { key: "phone", label: "Phone", aliases: ["mobile", "tel"] },
          { key: "location", label: "Location", aliases: ["city", "area"] },
          { key: "headline", label: "Headline", aliases: ["title"] },
          { key: "current_role_title", label: "Current role", aliases: ["role", "job_title"] },
          { key: "current_employer", label: "Current employer", aliases: ["employer", "company"] },
          { key: "years_experience", label: "Years experience", aliases: ["years", "experience"] },
          { key: "skills", label: "Skills (comma-separated)", aliases: ["skill"] },
          { key: "preferred_locations", label: "Preferred locations" },
          { key: "desired_salary_min", label: "Salary min" },
          { key: "desired_salary_max", label: "Salary max" },
          { key: "desired_work_type", label: "Work type", aliases: ["type"] },
          { key: "desired_arrangement", label: "Arrangement" },
          { key: "right_to_work", label: "Right to work" },
          { key: "linkedin_url", label: "LinkedIn URL", aliases: ["linkedin"] },
          { key: "portfolio_url", label: "Portfolio URL", aliases: ["portfolio"] },
          { key: "cv_url", label: "CV URL", aliases: ["cv", "resume"] },
          { key: "notes", label: "Notes" },
        ]}
        importRow={async (r) => {
          if (!r.full_name) return { ok: false, error: "Missing name" };
          if (!r.email && !r.phone) return { ok: false, error: "Need email or phone" };
          const splitList = (s?: string) => (s ? s.split(/[,;|]/).map(x => x.trim()).filter(Boolean) : []);
          const num = (s?: string) => (s && !isNaN(Number(s)) ? Number(s) : null);
          const { error } = await (supabase as any).rpc("portal_create_candidate", {
            _full_name: r.full_name,
            _email: r.email || null,
            _phone: r.phone || null,
            _location: r.location || null,
            _headline: r.headline || null,
            _summary: null,
            _years_experience: num(r.years_experience),
            _current_role_title: r.current_role_title || null,
            _current_employer: r.current_employer || null,
            _desired_salary_min: num(r.desired_salary_min),
            _desired_salary_max: num(r.desired_salary_max),
            _desired_work_type: r.desired_work_type || "permanent",
            _desired_arrangement: r.desired_arrangement || "onsite",
            _right_to_work: r.right_to_work || "unknown",
            _skills: splitList(r.skills),
            _preferred_locations: splitList(r.preferred_locations),
            _linkedin_url: r.linkedin_url || null,
            _portfolio_url: r.portfolio_url || null,
            _cv_url: r.cv_url || null,
            _notes: r.notes || null,
            _source: "csv_import",
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true };
        }}
        onDone={load}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, skill, location…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="kanban">Pipeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No candidates yet. Add one or wait for an applicant.</Card>
      ) : view === "list" ? (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="cursor-pointer p-4 hover:bg-muted/30" onClick={() => setActiveId(c.id)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{c.full_name}</div>
                    <Badge variant="outline" className={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    {c.rating ? <span className="flex items-center gap-0.5 text-amber-400 text-xs">{Array.from({length: c.rating}).map((_,i)=><Star key={i} className="h-3 w-3 fill-amber-400" />)}</span> : null}
                    <span className="text-xs text-muted-foreground">via {c.source}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground truncate">
                    {c.headline ?? c.current_role_title ?? "—"}
                    {c.location ? ` · ${c.location}` : ""}
                    {c.years_experience != null ? ` · ${c.years_experience}y exp` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(c.skills ?? []).slice(0, 6).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  <div className="mt-1">{new Date(c.updated_at).toLocaleDateString()}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-flow-col auto-cols-[260px] gap-3 overflow-x-auto pb-2">
          {(["new","screening","shortlisted","submitted","interviewing","offer","placed"] as Status[]).map(col => {
            const items = filtered.filter(c => c.status === col);
            return (
              <div key={col} className="rounded-md border border-border bg-card/40 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">{STATUS_LABEL[col]}</span>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(c => (
                    <Card key={c.id} className="cursor-pointer p-2 text-sm hover:bg-muted/30" onClick={() => setActiveId(c.id)} draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}>
                      <div className="font-medium truncate">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.headline ?? c.current_role_title ?? "—"}</div>
                    </Card>
                  ))}
                </div>
                <div
                  className="mt-2 rounded border border-dashed border-border/60 p-2 text-center text-[10px] text-muted-foreground"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) updateStatus(id, col);
                  }}
                >Drop to set: {STATUS_LABEL[col]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New candidate</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Full name *"><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></Field>
            <Field label="Headline (e.g. Senior React dev)"><Input value={form.headline} onChange={e => setForm({...form, headline: e.target.value})} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
            <Field label="Location"><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></Field>
            <Field label="Years experience"><Input type="number" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} /></Field>
            <Field label="Current role"><Input value={form.current_role_title} onChange={e => setForm({...form, current_role_title: e.target.value})} /></Field>
            <Field label="Current employer"><Input value={form.current_employer} onChange={e => setForm({...form, current_employer: e.target.value})} /></Field>
            <Field label="Desired salary min (£)"><Input type="number" value={form.desired_salary_min} onChange={e => setForm({...form, desired_salary_min: e.target.value})} /></Field>
            <Field label="Desired salary max (£)"><Input type="number" value={form.desired_salary_max} onChange={e => setForm({...form, desired_salary_max: e.target.value})} /></Field>
            <Field label="Work type">
              <Select value={form.desired_work_type} onValueChange={v => setForm({...form, desired_work_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["any","permanent","contract","temp","freelance"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Arrangement">
              <Select value={form.desired_arrangement} onValueChange={v => setForm({...form, desired_arrangement: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["any","onsite","hybrid","remote"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Right to work">
              <Select value={form.right_to_work} onValueChange={v => setForm({...form, right_to_work: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[["unknown","Unknown"],["uk_citizen","UK citizen"],["settled","Settled / ILR"],["visa_required","Visa required"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="LinkedIn URL"><Input value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} /></Field>
            <Field label="Portfolio URL"><Input value={form.portfolio_url} onChange={e => setForm({...form, portfolio_url: e.target.value})} /></Field>
            <Field label="CV URL (optional)"><Input value={form.cv_url} onChange={e => setForm({...form, cv_url: e.target.value})} /></Field>
            <Field label="Skills (comma-separated)" full><Input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="React, Node, AWS" /></Field>
            <Field label="Preferred locations (comma-separated)" full><Input value={form.preferred_locations} onChange={e => setForm({...form, preferred_locations: e.target.value})} placeholder="London, Remote UK" /></Field>
            <Field label="Summary" full><Textarea rows={3} value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} /></Field>
            <Field label="Internal notes" full><Textarea rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createCandidate} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Drawer open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle>{active?.full_name ?? "Candidate"}</DrawerTitle>
            <DrawerDescription>{active?.headline ?? active?.current_role_title ?? ""}</DrawerDescription>
          </DrawerHeader>
          {active && (
            <div className="mx-auto w-full max-w-3xl space-y-4 overflow-y-auto px-4 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={active.status} onValueChange={(v) => updateStatus(active.id, v as Status)}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setRating(active.id, n)} className="text-amber-400">
                      <Star className={`h-4 w-4 ${active.rating && n <= active.rating ? "fill-amber-400" : ""}`} />
                    </button>
                  ))}
                </div>
                <Badge variant="outline">via {active.source}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <InfoRow label="Email" value={active.email} link={active.email ? `mailto:${active.email}` : undefined} />
                <InfoRow label="Phone" value={active.phone} link={active.phone ? `tel:${active.phone}` : undefined} />
                <InfoRow label="Location" value={active.location} />
                <InfoRow label="Right to work" value={active.right_to_work} />
                <InfoRow label="Years experience" value={active.years_experience?.toString()} />
                <InfoRow label="Current role" value={active.current_role_title} />
                <InfoRow label="Current employer" value={active.current_employer} />
                <InfoRow label="Work type / arrangement" value={`${active.desired_work_type} · ${active.desired_arrangement}`} />
                <InfoRow label="Salary expectation" value={active.desired_salary_min || active.desired_salary_max ? `£${active.desired_salary_min ?? "?"} – £${active.desired_salary_max ?? "?"}` : null} />
                <InfoRow label="LinkedIn" value={active.linkedin_url} link={active.linkedin_url ?? undefined} />
                <InfoRow label="Portfolio" value={active.portfolio_url} link={active.portfolio_url ?? undefined} />
                <InfoRow label="CV" value={active.cv_url ? "View CV" : "No CV"} link={active.cv_url ?? undefined} icon={<FileText className="h-3 w-3" />} />
              </div>

              {active.skills?.length ? (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Skills</div>
                  <div className="flex flex-wrap gap-1">{active.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                </div>
              ) : null}

              {active.summary && (
                <div><div className="text-xs text-muted-foreground mb-1">Summary</div><p className="whitespace-pre-wrap text-sm">{active.summary}</p></div>
              )}

              {active.notes && (
                <div><div className="text-xs text-muted-foreground mb-1">Internal notes</div><p className="whitespace-pre-wrap text-sm text-muted-foreground">{active.notes}</p></div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Documents</div>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCv(f); }} />
                    <Button asChild size="sm" variant="outline" disabled={uploading}>
                      <span>{uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Upload CV</span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Timeline</div>
                <div className="flex gap-2">
                  <Textarea rows={2} value={eventNote} onChange={e => setEventNote(e.target.value)} placeholder="Log a note, call summary, screening result…" />
                  <Button onClick={addEvent} disabled={!eventNote.trim()}>Add</Button>
                </div>
                <div className="space-y-2">
                  {events.map(ev => (
                    <Card key={ev.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleString()}</div>
                      </div>
                      {ev.description && <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{ev.description}</div>}
                      <div className="mt-1 text-[10px] uppercase text-muted-foreground">{ev.event_type}</div>
                    </Card>
                  ))}
                  {events.length === 0 && <p className="text-xs text-muted-foreground">No timeline entries yet.</p>}
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, link, icon }: { label: string; value?: string | null; link?: string; icon?: React.ReactNode }) {
  if (!value) return <div><span className="text-xs text-muted-foreground">{label}</span><div className="text-muted-foreground">—</div></div>;
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
            {icon}{value}<ExternalLink className="h-3 w-3" />
          </a>
        ) : <span>{value}</span>}
      </div>
    </div>
  );
}
