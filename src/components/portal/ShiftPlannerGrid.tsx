import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft, ChevronRight, Pencil, UserPlus, Trash2, Loader2, CalendarDays, Clipboard,
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

type ClipItem = { start: string | null; finish: string | null };

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

const cellKey = (vacancyId: string, date: string) => `${vacancyId}|${date}`;

export default function ShiftPlannerGrid({ vacancies, onEdit, onAssign, onDelete, onOpenAI }: Props) {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [shifts, setShifts] = useState<Record<string, Record<string, Shift>>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<{ vacancyId: string; dateIdx: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ mode: "copy" | "cut"; items: ClipItem[]; sourceKeys: string[] } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // Refs mirror state so the global key handler always sees latest values
  const selectedRef = useRef(selected);
  const clipboardRef = useRef(clipboard);
  const weekDatesRef = useRef<Date[]>([]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);

  const weekDates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);
  useEffect(() => { weekDatesRef.current = weekDates; }, [weekDates]);

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

  // Resolve effective shift for a given cell
  const resolveCell = useCallback((vacancyId: string, date: string) => {
    const v = vacancies.find((x) => x.id === vacancyId);
    const shift = shifts[vacancyId]?.[date];
    const tStart = v?.start_time ? v.start_time.slice(0, 5) : null;
    const tFinish = v?.finish_time ? v.finish_time.slice(0, 5) : null;
    const templateSet = new Set((v?.schedule_days ?? []).map((d) => d.slice(0, 3)));
    const dow = DOW_SHORT[new Date(date + "T00:00:00").getDay()];
    if (shift) {
      if (shift.cancelled) return { active: false, cancelled: true, start: null, finish: null, hasExplicit: true };
      return {
        active: true, cancelled: false, hasExplicit: true,
        start: (shift.start_time ?? tStart)?.slice(0, 5) ?? null,
        finish: (shift.finish_time ?? tFinish)?.slice(0, 5) ?? null,
      };
    }
    if (templateSet.has(dow)) return { active: true, cancelled: false, start: tStart, finish: tFinish, hasExplicit: false };
    return { active: false, cancelled: false, start: null, finish: null, hasExplicit: false };
  }, [vacancies, shifts]);

  const upsert = async (vacancyId: string, date: string, s: string | null, f: string | null, cancelled = false) => {
    const { error } = await supabase.rpc("portal_upsert_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date, _start: s, _finish: f, _cancelled: cancelled,
    } as never);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const removeShift = async (vacancyId: string, date: string) => {
    const cell = resolveCell(vacancyId, date);
    if (cell.hasExplicit) {
      const { error } = await supabase.rpc("portal_delete_vacancy_shift" as never, {
        _vacancy_id: vacancyId, _date: date,
      } as never);
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else if (cell.active) {
      // template-only: cancel it explicitly
      await upsert(vacancyId, date, null, null, true);
    }
  };

  // Selection helpers
  const selectSingle = (vacancyId: string, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    setSelected(new Set([cellKey(vacancyId, date)]));
    setLastSelected({ vacancyId, dateIdx });
  };
  const toggleSelect = (vacancyId: string, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    const k = cellKey(vacancyId, date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
    setLastSelected({ vacancyId, dateIdx });
  };
  const rangeSelect = (vacancyId: string, dateIdx: number) => {
    if (!lastSelected) { selectSingle(vacancyId, dateIdx); return; }
    setSelected((prev) => {
      const next = new Set(prev);
      // Build a rectangular range across rows and dates
      const rowIds = vacancies.map((v) => v.id);
      const r1 = rowIds.indexOf(lastSelected.vacancyId);
      const r2 = rowIds.indexOf(vacancyId);
      const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
      const [dMin, dMax] = [Math.min(lastSelected.dateIdx, dateIdx), Math.max(lastSelected.dateIdx, dateIdx)];
      for (let r = rMin; r <= rMax; r++) {
        for (let d = dMin; d <= dMax; d++) {
          next.add(cellKey(rowIds[r], ymd(weekDates[d])));
        }
      }
      return next;
    });
  };

  const clearSelection = () => { setSelected(new Set()); setLastSelected(null); };

  // Clipboard ops (read from refs so they work from key handler with latest state)
  const collectClip = (mode: "copy" | "cut") => {
    const sel = selectedRef.current;
    if (sel.size === 0) return;
    const keys = Array.from(sel);
    const items: ClipItem[] = keys.map((k) => {
      const [vid, dt] = k.split("|");
      const c = resolveCell(vid, dt);
      return { start: c.start, finish: c.finish };
    });
    setClipboard({ mode, items, sourceKeys: keys });
    toast({ title: `${mode === "copy" ? "Copied" : "Cut"} ${items.length} cell${items.length === 1 ? "" : "s"}` });
  };

  const pasteClip = async () => {
    const clip = clipboardRef.current;
    const sel = selectedRef.current;
    if (!clip || sel.size === 0) return;
    const targets = Array.from(sel);
    await Promise.all(
      targets.map(async (k, i) => {
        const [vid, dt] = k.split("|");
        const item = clip.items[i % clip.items.length];
        if (item.start || item.finish) {
          await upsert(vid, dt, item.start, item.finish, false);
        }
      }),
    );
    if (clip.mode === "cut") {
      await Promise.all(clip.sourceKeys.map((k) => {
        const [vid, dt] = k.split("|");
        return removeShift(vid, dt);
      }));
      setClipboard(null);
    }
    await load();
  };

  const deleteSelection = async () => {
    const sel = selectedRef.current;
    if (sel.size === 0) return;
    const keys = Array.from(sel);
    await Promise.all(keys.map((k) => {
      const [vid, dt] = k.split("|");
      return removeShift(vid, dt);
    }));
    await load();
  };

  // Keyboard — attach once, always read latest state via refs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const hasSel = selectedRef.current.size > 0;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        clearSelection(); setClipboard(null); return;
      }
      if (!hasSel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); void deleteSelection();
      } else if (mod && (e.key === "c" || e.key === "C")) {
        e.preventDefault(); collectClip("copy");
      } else if (mod && (e.key === "x" || e.key === "X")) {
        e.preventDefault(); collectClip("cut");
      } else if (mod && (e.key === "v" || e.key === "V")) {
        e.preventDefault(); void pasteClip();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click outside to clear
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!gridRef.current) return;
      if (!gridRef.current.contains(e.target as Node)) clearSelection();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDates[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  const todayKey = ymd(new Date());

  return (
    <div className="rounded-md border bg-card select-none outline-none [&_*]:outline-none" ref={gridRef}>
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {selected.size > 0 && <span>{selected.size} selected</span>}
          {clipboard && (
            <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-primary">
              <Clipboard className="h-3 w-3" />
              {clipboard.mode === "cut" ? "Cut" : "Copied"} {clipboard.items.length}
            </span>
          )}
          <span className="hidden md:inline">Click to select · Shift/Ctrl-click to multi · Del to remove · Ctrl+C/X/V</span>
        </div>
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
                      {onOpenAI && <button onClick={() => onOpenAI(v.id)} className="text-[10px] text-primary hover:underline">AI</button>}
                      <button onClick={() => onDelete(v.id)} className="text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                    </div>
                  </div>
                  {/* Client (frozen) */}
                  <div className={`sticky left-[260px] z-10 border-b border-r ${rowBg} px-3 py-2`}>
                    <div className="text-sm">{v.client?.name ?? "—"}</div>
                    {v.location && <div className="text-[10px] text-muted-foreground line-clamp-2">{v.location}</div>}
                  </div>
                  {/* Day cells */}
                  {weekDates.map((d, dIdx) => {
                    const dk = ymd(d);
                    const cell = resolveCell(v.id, dk);
                    const isToday = dk === todayKey;
                    const isSelected = selected.has(cellKey(v.id, dk));
                    const isClipSource = clipboard?.sourceKeys.includes(cellKey(v.id, dk)) ?? false;
                    return (
                      <Cell
                        key={dk}
                        date={d}
                        rowBg={rowBg}
                        isToday={isToday}
                        active={cell.active}
                        cancelled={cell.cancelled}
                        start={cell.start}
                        finish={cell.finish}
                        isSelected={isSelected}
                        isClipSource={isClipSource}
                        clipMode={clipboard?.mode ?? null}
                        onClick={(e) => {
                          if (e.shiftKey) rangeSelect(v.id, dIdx);
                          else if (e.ctrlKey || e.metaKey) toggleSelect(v.id, dIdx);
                          else selectSingle(v.id, dIdx);
                        }}
                        onDoubleClickEdit={cell.active}
                        onSave={async (st, fi) => { await upsert(v.id, dk, st, fi, false); await load(); }}
                        onContextDelete={async () => { await removeShift(v.id, dk); await load(); }}
                        onContextCopy={() => { if (!isSelected) selectSingle(v.id, dIdx); setTimeout(() => collectClip("copy"), 0); }}
                        onContextCut={() => { if (!isSelected) selectSingle(v.id, dIdx); setTimeout(() => collectClip("cut"), 0); }}
                        onContextPaste={() => { if (!isSelected) selectSingle(v.id, dIdx); setTimeout(() => pasteClip(), 0); }}
                        onContextAdd={async () => { await upsert(v.id, dk, v.start_time?.slice(0, 5) ?? "09:00", v.finish_time?.slice(0, 5) ?? "17:00", false); await load(); }}
                        clipboardHasItems={!!clipboard}
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
  date: Date;
  rowBg: string;
  isToday: boolean;
  active: boolean;
  cancelled: boolean;
  start: string | null;
  finish: string | null;
  isSelected: boolean;
  isClipSource: boolean;
  clipMode: "copy" | "cut" | null;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClickEdit: boolean;
  onSave: (start: string, finish: string) => Promise<void> | void;
  onContextDelete: () => void;
  onContextCopy: () => void;
  onContextCut: () => void;
  onContextPaste: () => void;
  onContextAdd: () => void;
  clipboardHasItems: boolean;
}) {
  const { date, rowBg, isToday, active, cancelled, start, finish, isSelected, isClipSource, clipMode,
    onClick, onDoubleClickEdit, onSave, onContextDelete, onContextCopy, onContextCut, onContextPaste, onContextAdd, clipboardHasItems } = props;

  const [editOpen, setEditOpen] = useState(false);
  const [st, setSt] = useState(start ?? "09:00");
  const [fi, setFi] = useState(finish ?? "17:00");
  useEffect(() => { setSt(start ?? "09:00"); setFi(finish ?? "17:00"); }, [start, finish]);

  const todayTint = isToday ? "bg-primary/5" : rowBg;
  const selectionRing = isSelected ? "ring-2 ring-primary ring-inset" : "";
  const clipBorder = isClipSource ? (clipMode === "cut" ? "outline-dashed outline-2 outline-destructive/60" : "outline-dashed outline-2 outline-primary/60") : "";

  let inner: React.ReactNode;
  if (!active) {
    // Empty / cancelled both render as empty so cancelling a day looks like an empty slot
    inner = (
      <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-border/40 text-[11px] text-muted-foreground/60">
        —
      </div>
    );
  } else {
    inner = (
      <div className="flex h-full w-full flex-col items-start justify-center rounded border border-primary/30 bg-primary/5 px-2 py-1.5 text-left">
        <div className="text-[11px] font-semibold leading-tight text-foreground">{to12h(start)}</div>
        <div className="text-[11px] leading-tight text-muted-foreground">{to12h(finish)}</div>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="gridcell"
          tabIndex={-1}
          aria-selected={isSelected}
          onClick={onClick}
          onDoubleClick={() => { if (onDoubleClickEdit) setEditOpen(true); }}
          className={`relative cursor-pointer select-none border-b border-r ${todayTint} p-1 min-h-[78px] outline-none focus:outline-none focus-visible:outline-none ${selectionRing} ${clipBorder}`}
        >
          {inner}
          {/* Hidden edit popover anchor */}
          <Popover open={editOpen} onOpenChange={setEditOpen}>
            <PopoverTrigger asChild>
              <span className="absolute inset-0 pointer-events-none" />
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
              <Button size="sm" className="w-full" onClick={async () => { await onSave(st, fi); setEditOpen(false); }}>Save</Button>
            </PopoverContent>
          </Popover>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {!active && !cancelled && <ContextMenuItem onSelect={onContextAdd}>Add shift</ContextMenuItem>}
        {active && <ContextMenuItem onSelect={() => setEditOpen(true)}>Edit times</ContextMenuItem>}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onContextCopy} disabled={!active}>Copy</ContextMenuItem>
        <ContextMenuItem onSelect={onContextCut} disabled={!active}>Cut</ContextMenuItem>
        <ContextMenuItem onSelect={onContextPaste} disabled={!clipboardHasItems}>Paste</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onContextDelete} className="text-destructive" disabled={!active && !cancelled}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
