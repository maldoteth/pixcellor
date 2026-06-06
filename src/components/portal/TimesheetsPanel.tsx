import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, X, Clock, Download, CalendarClock } from "lucide-react";

type Row = {
  id: string;
  vacancy_id: string;
  slot_index: number;
  shift_date: string;
  candidate_id: string;
  scheduled_start: string | null;
  scheduled_finish: string | null;
  actual_start: string | null;
  actual_finish: string | null;
  break_minutes: number;
  status: "pending" | "submitted" | "approved" | "rejected";
  worker_notes: string | null;
  admin_notes: string | null;
  reject_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by_email: string | null;
  vacancy_title: string;
  client_name: string | null;
  candidate_name: string;
  charge_rate: number | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
};

const STATUS_COLOR: Record<Row["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-amber-500/15 text-amber-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-destructive/15 text-destructive",
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}
function hoursOf(row: Row): number {
  if (!row.actual_start || !row.actual_finish) return 0;
  const mins = (new Date(row.actual_finish).getTime() - new Date(row.actual_start).getTime()) / 60000 - (row.break_minutes ?? 0);
  return Math.max(0, mins / 60);
}
function money(n: number, ccy: string | null) {
  const symbol = (ccy ?? "GBP") === "GBP" ? "£" : (ccy ?? "GBP");
  return `${symbol} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function TimesheetsPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"submitted" | "approved" | "rejected" | "pending" | "all">("submitted");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [edit, setEdit] = useState({ start: "", finish: "", breakMin: "0", notes: "" });
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("portal_list_timesheets" as never, {
      _status: tab === "all" ? null : tab, _limit: 300,
    } as never);
    setLoading(false);
    if (error) { toast({ title: "Could not load", description: error.message, variant: "destructive" }); return; }
    setRows((data as Row[]) ?? []);
  }, [tab, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel("timesheets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_timesheets" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const startEdit = (r: Row) => {
    setEditing(r);
    setEdit({
      start: toLocalInput(r.actual_start),
      finish: toLocalInput(r.actual_finish),
      breakMin: String(r.break_minutes ?? 0),
      notes: r.admin_notes ?? "",
    });
  };

  const approve = async (r: Row, useEdited = false) => {
    const payload = useEdited ? {
      _timesheet_id: r.id,
      _actual_start: fromLocalInput(edit.start),
      _actual_finish: fromLocalInput(edit.finish),
      _break_minutes: parseInt(edit.breakMin, 10) || 0,
      _admin_notes: edit.notes || null,
    } : { _timesheet_id: r.id };
    const { error } = await supabase.rpc("portal_timesheet_approve" as never, payload as never);
    if (error) { toast({ title: "Approve failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Approved" });
    setEditing(null);
    void load();
  };

  const reject = async () => {
    if (!rejecting) return;
    const { error } = await supabase.rpc("portal_timesheet_reject" as never, {
      _timesheet_id: rejecting.id, _reason: rejectReason,
    } as never);
    if (error) { toast({ title: "Reject failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Rejected" });
    setRejecting(null); setRejectReason("");
    void load();
  };

  const summary = useMemo(() => {
    let hours = 0, charge = 0, pay = 0;
    rows.forEach((r) => {
      const h = hoursOf(r);
      hours += h;
      charge += h * (r.charge_rate ?? 0);
      pay += h * (r.pay_max ?? r.pay_min ?? 0);
    });
    const ccy = rows.find((r) => r.pay_currency)?.pay_currency ?? "GBP";
    return { hours, charge, pay, margin: charge - pay, ccy };
  }, [rows]);

  const downloadCsv = () => {
    const header = ["Date","Candidate","Vacancy","Client","Scheduled","Actual start","Actual finish","Break (min)","Hours","Pay rate","Charge rate","Pay","Charge","Status"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const h = hoursOf(r);
      const pay = r.pay_max ?? r.pay_min ?? 0;
      const ch = r.charge_rate ?? 0;
      lines.push([
        r.shift_date,
        JSON.stringify(r.candidate_name),
        JSON.stringify(r.vacancy_title),
        JSON.stringify(r.client_name ?? ""),
        `${r.scheduled_start ?? ""}-${r.scheduled_finish ?? ""}`,
        r.actual_start ?? "",
        r.actual_finish ?? "",
        r.break_minutes ?? 0,
        h.toFixed(2),
        pay,
        ch,
        (h * pay).toFixed(2),
        (h * ch).toFixed(2),
        r.status,
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `timesheets-${tab}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5" />Timesheets</h2>
          <p className="text-sm text-muted-foreground">Approve worker-submitted hours. Approved hours feed payroll &amp; client invoicing.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Hours</div><div className="text-lg font-semibold">{summary.hours.toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Pay</div><div className="text-lg font-semibold">{money(summary.pay, summary.ccy)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Charge</div><div className="text-lg font-semibold">{money(summary.charge, summary.ccy)}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Margin</div><div className={`text-lg font-semibold ${summary.margin >= 0 ? "text-emerald-600" : "text-destructive"}`}>{money(summary.margin, summary.ccy)}</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="submitted">Awaiting approval</TabsTrigger>
          <TabsTrigger value="pending">In progress</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No timesheets in this view.</p>}
          <div className="space-y-2">
            {rows.map((r) => {
              const h = hoursOf(r);
              return (
                <Card key={r.id}>
                  <CardContent className="p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-[180px]">
                      <div className="text-sm font-semibold">{r.candidate_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.vacancy_title}{r.client_name ? ` · ${r.client_name}` : ""}</div>
                    </div>
                    <div className="text-xs">
                      <div>{new Date(r.shift_date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</div>
                      <div className="text-muted-foreground">Sched {r.scheduled_start?.slice(0,5) ?? "?"}–{r.scheduled_finish?.slice(0,5) ?? "?"}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground">Actual</div>
                      <div>{r.actual_start ? new Date(r.actual_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} → {r.actual_finish ? new Date(r.actual_finish).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground">Break</div>
                      <div>{r.break_minutes ?? 0}m</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-muted-foreground">Hours</div>
                      <div className="font-semibold">{h.toFixed(2)}</div>
                    </div>
                    <Badge className={`${STATUS_COLOR[r.status]} text-[10px]`}>{r.status}</Badge>
                    <div className="ml-auto flex items-center gap-1">
                      {(r.status === "submitted" || r.status === "pending") && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Clock className="h-3.5 w-3.5 mr-1" />Edit</Button>
                          <Button size="sm" onClick={() => approve(r)} disabled={!r.actual_start || !r.actual_finish}><Check className="h-3.5 w-3.5 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => { setRejecting(r); setRejectReason(""); }}><X className="h-3.5 w-3.5 mr-1" />Reject</Button>
                        </>
                      )}
                      {r.status === "rejected" && r.reject_reason && (
                        <span className="text-[11px] text-destructive italic">{r.reject_reason}</span>
                      )}
                    </div>
                    {r.worker_notes && <div className="basis-full text-[11px] text-muted-foreground border-l-2 border-muted pl-2">Worker: {r.worker_notes}</div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit + approve dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adjust &amp; approve</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{editing.candidate_name} · {editing.vacancy_title} · {editing.shift_date}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-[10px] text-muted-foreground mb-1">Actual start</div><Input type="datetime-local" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></div>
                <div><div className="text-[10px] text-muted-foreground mb-1">Actual finish</div><Input type="datetime-local" value={edit.finish} onChange={(e) => setEdit({ ...edit, finish: e.target.value })} /></div>
              </div>
              <div><div className="text-[10px] text-muted-foreground mb-1">Break (min)</div><Input type="number" min={0} value={edit.breakMin} onChange={(e) => setEdit({ ...edit, breakMin: e.target.value })} /></div>
              <div><div className="text-[10px] text-muted-foreground mb-1">Admin notes</div><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && approve(editing, true)}>Save &amp; approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => { if (!o) setRejecting(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject timesheet</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (visible to worker)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
