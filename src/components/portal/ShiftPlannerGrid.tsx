import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft, ChevronRight, Plus, X, Copy, Clipboard, Pencil, UserPlus, Trash2, Loader2, CalendarDays,
} from "lucide-react";

type Vacancy = {
  id: string;
  title: string;
  reference: string | null;
  location: string | null;
  status: string;
  start_time: string | null;
  finish_time: string | null;
  schedule_days: string[] | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  client?: { id: string; name: string } | null;
};

type Shift = {
  id: string;
  vacancy_id?: string;
  shift_date: string;
  start_time: string | null;
  finish_time: string | null;
  cancelled: boolean;
  notes: string | null;
};

type Props = {
  vacancies: Vacancy[];
  onEdit: (v: Vacancy) => void;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAI?: (id: string) => void;
};

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DOW_DISPLAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function to12h(t?: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const m = (mStr ?? "00").slice(0, 2);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${period.toLowerCase()}`;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  return addDays(x, offsetToMonday);
}

export default function ShiftPlannerGrid({ vacancies, onEdit, onAssign, onDelete, onOpenAI }: Props) {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Record<string, Record<string, Shift>>>({}); // vacId -> date -> shift
  const [loading, setLoading] = useState(false);
  const [copySource, setCopySource] = useState<{ vacancyId: string; date: string } | null>(null);

  const weekDates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);

  const fromKey = ymd(weekStart);
  const toKey = ymd(weekDates[6]);

  const load = useCallback(async () => {
    if (vacancies.length === 0) return;
    setLoading(true);
    const results = await Promise.all(
      vacancies.map((v) =>
        supabase.rpc("portal_list_vacancy_shifts" as never, {
          _vacancy_id: v.id, _from: fromKey, _to: toKey,
        } as never),
      ),
    );
    const map: Record<string, Record<string, Shift>> = {};
    vacancies.forEach((v, i) => {
      const rows = ((results[i].data as Shift[]) ?? []);
      const m: Record<string, Shift> = {};
      rows.forEach((s) => { m[s.shift_date] = s; });
      map[v.id] = m;
    });
    setShifts(map);
    setLoading(false);
  }, [vacancies, fromKey, toKey]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (vacancyId: string, date: string, s: string | null, f: string | null, cancelled = false) => {
    const { error } = await supabase.rpc("portal_upsert_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date, _start: s, _finish: f, _cancelled: cancelled,
    } as never);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const remove = async (vacancyId: string, date: string) => {
    const { error } = await supabase.rpc("portal_delete_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date,
    } as never);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const pasteTo = async (vacancyId: string, target: string) => {
    if (!copySource) return;
    if (copySource.vacancyId !== vacancyId) {
      // cross-row paste: just copy values
      const sourceShift = shifts[copySource.vacancyId]?.[copySource.date];
      const srcVac = vacancies.find((v) => v.id === copySource.vacancyId);
      const s = sourceShift?.start_time ?? srcVac?.start_time ?? null;
      const f = sourceShift?.finish_time ?? srcVac?.finish_time ?? null;
      await upsert(vacancyId, target, s?.slice(0, 5) ?? null, f?.slice(0, 5) ?? null, false);
    } else {
      const { error } = await supabase.rpc("portal_copy_vacancy_shift" as never, {
        _vacancy_id: vacancyId, _source_date: copySource.date, _target_date: target,
      } as never);
      if (error) { toast({ title: "Copy failed", description: error.message, variant: "destructive" }); return; }
    }
    setCopySource(null);
    await load();
  };

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  const todayKey = ymd(new Date());

  return (
    <div className="rounded-md border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekStart((d) => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{weekLabel}</span>
          </div>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekStart((d) => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {copySource && (
          <div className="flex items-center gap-2 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
            <Clipboard className="h-3 w-3" />
            Copying {new Date(copySource.date).toLocaleDateString()} — click any cell to paste
            <button onClick={() => setCopySource(null)} className="underline">cancel</button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* Header row */}
          <div className="grid sticky top-0 z-20 bg-muted/30" style={{ gridTemplateColumns: "260px 180px repeat(7, minmax(140px, 1fr))" }}>
            <div className="sticky left-0 z-30 border-b border-r bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job</div>
            <div className="sticky left-[260px] z-30 border-b border-r bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</div>
            {weekDates.map((d, i) => {
              const isToday = ymd(d) === todayKey;
              return (
                <div key={i} className={`border-b border-r px-2 py-2 text-center ${isToday ? "bg-primary/10" : ""}`}>
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">{DOW_DISPLAY[i]}</div>
                  <div className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
                    {d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vacancy rows */}
          {vacancies.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">No vacancies match the current filters.</div>
          ) : (
            vacancies.map((v, rowIdx) => {
              const templateSet = new Set((v.schedule_days ?? []).map((d) => d.slice(0, 3)));
              const tStart = v.start_time ? v.start_time.slice(0, 5) : null;
              const tFinish = v.finish_time ? v.finish_time.slice(0, 5) : null;
              const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10";
              return (
                <div key={v.id} className="grid" style={{ gridTemplateColumns: "260px 180px repeat(7, minmax(140px, 1fr))" }}>
                  {/* Job (frozen) */}
                  <div className={`sticky left-0 z-10 border-b border-r ${rowBg} px-3 py-2`}>
                    <div className="text-sm font-semibold leading-tight">{v.title}</div>
                    {v.reference && <div className="text-[10px] text-muted-foreground">Ref {v.reference}</div>}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant={v.status === "open" ? "default" : "outline"} className="text-[9px] h-4 px-1">{v.status}</Badge>
                      {(v.pay_min || v.pay_max) && (
                        <span className="text-[10px] text-muted-foreground">
                          {v.pay_currency ?? "GBP"} {v.pay_min ?? "?"}–{v.pay_max ?? "?"}/{v.pay_period ?? "hr"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <button onClick={() => onEdit(v)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><Pencil className="h-2.5 w-2.5" />Edit</button>
                      <button onClick={() => onAssign(v.id)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><UserPlus className="h-2.5 w-2.5" />Assign</button>
                      <button onClick={() => onDelete(v.id)} className="text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  </div>
                  {/* Client (frozen) */}
                  <div className={`sticky left-[260px] z-10 border-b border-r ${rowBg} px-3 py-2`}>
                    <div className="text-sm">{v.client?.name ?? "—"}</div>
                    {v.location && <div className="text-[10px] text-muted-foreground line-clamp-2">{v.location}</div>}
                  </div>
                  {/* Day cells */}
                  {weekDates.map((d) => {
                    const key = ymd(d);
                    const dowShort = DOW_SHORT[d.getDay()];
                    const inTemplate = templateSet.has(dowShort);
                    const shift = shifts[v.id]?.[key];
                    let cancelled = false;
                    let active = false;
                    let s: string | null = null;
                    let f: string | null = null;
                    if (shift) {
                      if (shift.cancelled) cancelled = true;
                      else { s = (shift.start_time ?? tStart)?.slice(0, 5) ?? null; f = (shift.finish_time ?? tFinish)?.slice(0, 5) ?? null; active = true; }
                    } else if (inTemplate) {
                      s = tStart; f = tFinish; active = true;
                    }
                    const isToday = key === todayKey;
                    return (
                      <Cell
                        key={key}
                        vacancyId={v.id}
                        date={d}
                        dateKey={key}
                        rowBg={rowBg}
                        isToday={isToday}
                        active={active}
                        cancelled={cancelled}
                        start={s}
                        finish={f}
                        hasExplicit={!!shift}
                        copyMode={!!copySource}
                        isCopySource={copySource?.vacancyId === v.id && copySource?.date === key}
                        onAdd={() => upsert(v.id, key, tStart ?? "09:00", tFinish ?? "17:00", false)}
                        onCancel={() => (shift ? remove(v.id, key) : upsert(v.id, key, null, null, true))}
                        onSave={(st, fi) => upsert(v.id, key, st, fi, false)}
                        onStartCopy={() => setCopySource({ vacancyId: v.id, date: key })}
                        onPaste={() => pasteTo(v.id, key)}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Cell(props: {
  vacancyId: string;
  date: Date;
  dateKey: string;
  rowBg: string;
  isToday: boolean;
  active: boolean;
  cancelled: boolean;
  start: string | null;
  finish: string | null;
  hasExplicit: boolean;
  copyMode: boolean;
  isCopySource: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onSave: (start: string, finish: string) => void;
  onStartCopy: () => void;
  onPaste: () => void;
}) {
  const { date, rowBg, isToday, active, cancelled, start, finish, copyMode, isCopySource, onAdd, onCancel, onSave, onStartCopy, onPaste } = props;
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(start ?? "09:00");
  const [fi, setFi] = useState(finish ?? "17:00");
  useEffect(() => { setSt(start ?? "09:00"); setFi(finish ?? "17:00"); }, [start, finish]);

  const todayTint = isToday ? "bg-primary/5" : rowBg;

  if (cancelled) {
    return (
      <div className={`relative border-b border-r ${todayTint} p-1 min-h-[78px]`}>
        <div className="flex h-full items-center justify-center rounded border border-dashed border-destructive/40 bg-destructive/5 text-[11px] text-destructive line-through">
          Cancelled
        </div>
        <button onClick={onAdd} className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Restore">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className={`relative border-b border-r ${todayTint} p-1 min-h-[78px]`}>
        <button
          onClick={copyMode ? onPaste : onAdd}
          className="flex h-full w-full items-center justify-center gap-1 rounded border border-dashed border-border/50 text-[11px] text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
        >
          {copyMode ? <><Clipboard className="h-3 w-3" />Paste</> : <><Plus className="h-3 w-3" />Add Shift</>}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative border-b border-r ${todayTint} p-1 min-h-[78px]`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`group flex h-full w-full flex-col items-start justify-center rounded border px-2 py-1.5 text-left transition-colors ${
              isCopySource ? "border-primary bg-primary/15" : "border-primary/30 bg-primary/5 hover:bg-primary/10"
            }`}
          >
            <div className="text-[11px] font-semibold leading-tight text-foreground">{to12h(start)}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{to12h(finish)}</div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-2" align="center">
          <div className="text-xs font-medium">
            {date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Start</div>
              <Input type="time" value={st} onChange={(e) => setSt(e.target.value)} className="h-8" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Finish</div>
              <Input type="time" value={fi} onChange={(e) => setFi(e.target.value)} className="h-8" />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={() => { onSave(st, fi); setOpen(false); }}>Save</Button>
        </PopoverContent>
      </Popover>
      <button onClick={onCancel} className="absolute right-0.5 top-0.5 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Cancel">
        <X className="h-3 w-3" />
      </button>
      <button onClick={onStartCopy} className="absolute left-0.5 top-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Copy">
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}
