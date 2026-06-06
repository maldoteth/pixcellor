import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  ChevronLeft, ChevronRight, Pencil, UserPlus, Trash2, Loader2, CalendarDays, Clipboard, Copy, ClipboardPaste, Plus, Minus,
} from "lucide-react";

type Vacancy = {
  id: string;
  title: string;
  reference: string | null;
  location: string | null;
  status: string;
  openings: number;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  schedule_days: string[] | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  charge_rate: number | null;
  paye_rate_percent: number | null;
  client?: { id: string; name: string } | null;
  assignments?: Array<{ id: string; candidate_id: string; slot_index: number; stage: string; candidate: { id: string; full_name: string; status: string } }>;
};

type Shift = {
  id: string;
  shift_date: string;
  slot_index: number;
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
  onVacancyChanged?: () => void | Promise<void>;
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

const cellKey = (vacancyId: string, slot: number, date: string) => `${vacancyId}|${slot}|${date}`;
const parseCellKey = (k: string): { vid: string; slot: number; date: string } => {
  const [vid, slotStr, date] = k.split("|");
  return { vid, slot: Number(slotStr) || 0, date };
};

export default function ShiftPlannerGrid({ vacancies, onEdit, onAssign, onDelete, onOpenAI, onVacancyChanged }: Props) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const jobColW = isMobile ? 110 : 240;
  const clientColW = isMobile ? 80 : 170;
  const dayMinW = isMobile ? 84 : 140;
  const MAX_DAYS = 28;
  const [daysShown, setDaysShown] = useState<number>(7);
  const gridTemplate = `${jobColW}px ${clientColW}px repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`;
  const minGridW = jobColW + clientColW + dayMinW * daysShown;
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  // shifts[vacancyId][slotIndex][date]
  const [shifts, setShifts] = useState<Record<string, Record<number, Record<string, Shift>>>>({});
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<{ vacancyId: string; slot: number; dateIdx: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ mode: "copy" | "cut"; items: ClipItem[]; sourceKeys: string[] } | null>(null);
  const [bulkPaste, setBulkPaste] = useState<{ vacancyId: string; slot: number; date: string } | null>(null);
  const [bulkCount, setBulkCount] = useState<string>("4");
  const [bulkUnit, setBulkUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [sortBy, setSortBy] = useState<"title" | "client">("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const sortedVacancies = useMemo(() => {
    const arr = [...vacancies];
    arr.sort((a, b) => {
      const av = (sortBy === "title" ? a.title : a.client?.name ?? "") || "";
      const bv = (sortBy === "title" ? b.title : b.client?.name ?? "") || "";
      const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [vacancies, sortBy, sortDir]);
  // Expand each vacancy into N rows (one per opening), keep them individual.
  const displayRows = useMemo(() => {
    const rows: Array<{ vacancy: Vacancy; slot: number; total: number }> = [];
    sortedVacancies.forEach((v) => {
      const total = Math.max(1, Number(v.openings ?? 1) || 1);
      for (let i = 0; i < total; i++) rows.push({ vacancy: v, slot: i, total });
    });
    return rows;
  }, [sortedVacancies]);
  const [vacancyClip, setVacancyClip] = useState<Vacancy | null>(null);
  const bumpOpenings = async (v: Vacancy, delta: number) => {
    const current = Math.max(1, Number(v.openings ?? 1) || 1);
    const next = Math.max(1, current + delta);
    if (next === current) return;
    if (delta > 0) {
      // Add an opening: clone slot 0's shifts + assignments into the new slot so it starts pre-filled
      const newSlot = current; // slot indices are 0..current-1, new one is `current`
      const { error: cloneErr } = await supabase.rpc("portal_clone_vacancy_slot" as never, {
        _vacancy_id: v.id, _from_slot: 0, _to_slot: newSlot,
      } as never);
      if (cloneErr) { toast({ title: "Clone failed", description: cloneErr.message, variant: "destructive" }); return; }
    } else {
      // Remove the highest slot: delete its shifts + assignments
      const removeSlot = current - 1;
      const { error: delErr } = await supabase.rpc("portal_delete_vacancy_slot" as never, {
        _vacancy_id: v.id, _slot: removeSlot,
      } as never);
      if (delErr) { toast({ title: "Delete failed", description: delErr.message, variant: "destructive" }); return; }
    }
    const { error } = await supabase.rpc("portal_update_vacancy" as never, { _id: v.id, _patch: { openings: next } } as never);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: delta > 0 ? `Added opening (now ${next})` : `Removed opening (now ${next})` });
    await onVacancyChanged?.();
    await load();
  };
  const toggleSort = (col: "title" | "client") => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  };
  const sortArrow = (col: "title" | "client") => sortBy === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  const gridRef = useRef<HTMLDivElement>(null);
  // Refs mirror state so the global key handler always sees latest values
  const selectedRef = useRef(selected);
  const clipboardRef = useRef(clipboard);
  const weekDatesRef = useRef<Date[]>([]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);

  const weekDates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < daysShown; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart, daysShown]);
  useEffect(() => { weekDatesRef.current = weekDates; }, [weekDates]);

  const fromKey = ymd(weekStart);
  const toKey = ymd(weekDates[weekDates.length - 1]);

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
    const map: Record<string, Record<number, Record<string, Shift>>> = {};
    vacancies.forEach((v, i) => {
      const rows = ((results[i].data as Shift[]) ?? []);
      const m: Record<number, Record<string, Shift>> = {};
      rows.forEach((s) => {
        const slot = Number(s.slot_index ?? 0);
        if (!m[slot]) m[slot] = {};
        m[slot][s.shift_date] = s;
      });
      map[v.id] = m;
    });
    setShifts(map);
    setLoading(false);
  }, [vacancies, fromKey, toKey]);

  useEffect(() => { load(); }, [load]);

  // Resolve effective shift for a given cell (per-slot)
  const resolveCell = useCallback((vacancyId: string, slot: number, date: string) => {
    const v = vacancies.find((x) => x.id === vacancyId);
    const shift = shifts[vacancyId]?.[slot]?.[date];
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
    // Template-driven recurring days only apply to slot 0 and within the vacancy's date window.
    if (slot !== 0) return { active: false, cancelled: false, start: null, finish: null, hasExplicit: false };
    const inRange = (() => {
      if (v?.start_date && date < v.start_date) return false;
      if (v?.end_date && date > v.end_date) return false;
      return true;
    })();
    if (inRange && templateSet.has(dow)) return { active: true, cancelled: false, start: tStart, finish: tFinish, hasExplicit: false };
    return { active: false, cancelled: false, start: null, finish: null, hasExplicit: false };
  }, [vacancies, shifts]);

  const DOW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;

  // Ensure the vacancy's date window and schedule_days cover this shift's date/time.
  const syncVacancyWindow = async (vacancyId: string, date: string, s: string | null, f: string | null, cancelled: boolean) => {
    if (cancelled) return;
    const v = vacancies.find((x) => x.id === vacancyId);
    if (!v) return;
    const patch: Record<string, unknown> = {};
    if (!v.start_date || date < v.start_date) patch.start_date = date;
    if (!v.end_date || date > v.end_date) patch.end_date = date;
    const dowFull = DOW_FULL[new Date(date + "T00:00:00").getDay()];
    const existing = (v.schedule_days ?? []).map((d) => d);
    const hasDow = existing.some((d) => d.toLowerCase().startsWith(dowFull.toLowerCase().slice(0, 3)));
    if (!hasDow) patch.schedule_days = [...existing, dowFull];
    if (s && !v.start_time) patch.start_time = s.length === 5 ? `${s}:00` : s;
    if (f && !v.finish_time) patch.finish_time = f.length === 5 ? `${f}:00` : f;
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.rpc("portal_update_vacancy" as never, { _id: vacancyId, _patch: patch } as never);
    if (error) console.warn("Vacancy window sync failed", error.message);
    else await onVacancyChanged?.();
  };

  const upsert = async (vacancyId: string, slot: number, date: string, s: string | null, f: string | null, cancelled = false) => {
    const { error } = await supabase.rpc("portal_upsert_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date, _start: s, _finish: f, _cancelled: cancelled, _slot: slot,
    } as never);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await syncVacancyWindow(vacancyId, date, s, f, cancelled);
  };

  const removeShift = async (vacancyId: string, slot: number, date: string) => {
    const cell = resolveCell(vacancyId, slot, date);
    if (cell.hasExplicit) {
      const { error } = await supabase.rpc("portal_delete_vacancy_shift" as never, {
        _vacancy_id: vacancyId, _date: date, _slot: slot,
      } as never);
      if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else if (cell.active) {
      // template-only: cancel it explicitly for this slot
      await upsert(vacancyId, slot, date, null, null, true);
    }
  };

  // Selection helpers
  const blurActive = () => { try { (document.activeElement as HTMLElement | null)?.blur(); } catch { /* noop */ } };
  const selectSingle = (vacancyId: string, slot: number, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    setSelected(new Set([cellKey(vacancyId, slot, date)]));
    setLastSelected({ vacancyId, slot, dateIdx });
    blurActive();
  };
  const toggleSelect = (vacancyId: string, slot: number, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    const k = cellKey(vacancyId, slot, date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
    setLastSelected({ vacancyId, slot, dateIdx });
  };
  const rangeSelect = (vacancyId: string, slot: number, dateIdx: number) => {
    if (!lastSelected) { selectSingle(vacancyId, slot, dateIdx); return; }
    setSelected((prev) => {
      const next = new Set(prev);
      // Rectangular range across display rows (vacancy+slot) and dates
      const rowKeys = displayRows.map((r) => `${r.vacancy.id}#${r.slot}`);
      const r1 = rowKeys.indexOf(`${lastSelected.vacancyId}#${lastSelected.slot}`);
      const r2 = rowKeys.indexOf(`${vacancyId}#${slot}`);
      if (r1 < 0 || r2 < 0) { next.add(cellKey(vacancyId, slot, ymd(weekDates[dateIdx]))); return next; }
      const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
      const [dMin, dMax] = [Math.min(lastSelected.dateIdx, dateIdx), Math.max(lastSelected.dateIdx, dateIdx)];
      for (let r = rMin; r <= rMax; r++) {
        const row = displayRows[r];
        for (let d = dMin; d <= dMax; d++) {
          next.add(cellKey(row.vacancy.id, row.slot, ymd(weekDates[d])));
        }
      }
      return next;
    });
  };

  const clearSelection = () => { setSelected(new Set()); setLastSelected(null); };

  // Clipboard ops
  const collectClip = (mode: "copy" | "cut") => {
    const sel = selectedRef.current;
    if (sel.size === 0) return;
    const keys = Array.from(sel);
    const items: ClipItem[] = keys.map((k) => {
      const { vid, slot, date } = parseCellKey(k);
      const c = resolveCell(vid, slot, date);
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
        const { vid, slot, date } = parseCellKey(k);
        const item = clip.items[i % clip.items.length];
        if (item.start || item.finish) {
          await upsert(vid, slot, date, item.start, item.finish, false);
        }
      }),
    );
    if (clip.mode === "cut") {
      await Promise.all(clip.sourceKeys.map((k) => {
        const { vid, slot, date } = parseCellKey(k);
        return removeShift(vid, slot, date);
      }));
      setClipboard(null);
    }
    await load();
  };

  // Bulk paste: repeat clipboard pattern from a target date for N days/weeks/months
  const runBulkPaste = async () => {
    const clip = clipboardRef.current;
    if (!clip || !bulkPaste) return;
    const n = Math.max(1, parseInt(bulkCount, 10) || 0);
    const startDate = new Date(bulkPaste.date + "T00:00:00");
    const end = new Date(startDate);
    if (bulkUnit === "days") end.setDate(end.getDate() + n);
    else if (bulkUnit === "weeks") end.setDate(end.getDate() + n * 7);
    else end.setMonth(end.getMonth() + n);
    const dates: string[] = [];
    for (let d = new Date(startDate); d < end; d.setDate(d.getDate() + 1)) {
      dates.push(ymd(d));
    }
    await Promise.all(dates.map(async (dt, i) => {
      const item = clip.items[i % clip.items.length];
      if (item.start || item.finish) {
        await upsert(bulkPaste.vacancyId, bulkPaste.slot, dt, item.start, item.finish, false);
      }
    }));
    setBulkPaste(null);
    await load();
    toast({ title: `Pasted across ${dates.length} day${dates.length === 1 ? "" : "s"}` });
  };

  const deleteSelection = async () => {
    const sel = selectedRef.current;
    if (sel.size === 0) return;
    const keys = Array.from(sel);
    await Promise.all(keys.map((k) => {
      const { vid, slot, date } = parseCellKey(k);
      return removeShift(vid, slot, date);
    }));
    await load();
  };

  // Keyboard — attach once, always read latest state via refs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      // Only bail on text-entry fields; time/number/date inputs shouldn't block Delete on the grid
      const isTextEntry = !!t && (
        (t.tagName === "INPUT" && !["time","number","date","checkbox","radio","range","button","submit"].includes((t as HTMLInputElement).type)) ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      );
      if (isTextEntry) return;
      const hasSel = selectedRef.current.size > 0;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        clearSelection(); setClipboard(null); return;
      }
      if (!hasSel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); blurActive(); void deleteSelection();
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

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDates[weekDates.length - 1].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  const todayKey = ymd(new Date());

  // ----- Weekly stats: margin, hours, active workers, idle workers -----
  const stats = useMemo(() => {
    let totalHours = 0;
    let totalMargin = 0;
    let totalCharge = 0;
    let currency = "GBP";
    const workersWithShifts = new Set<string>();
    const allAssignedWorkers = new Set<string>();

    displayRows.forEach(({ vacancy: v, slot }) => {
      if (v.pay_currency) currency = v.pay_currency;
      const pay = Number(v.pay_max ?? v.pay_min ?? 0);
      const charge = Number(v.charge_rate ?? 0);
      const paye = Number(v.paye_rate_percent ?? 21);
      const costPerHour = pay + pay * (paye / 100);
      const marginPerHour = charge - costPerHour;

      const slotAssignments = (v.assignments ?? []).filter((a) =>
        a.slot_index === slot &&
        ["shortlisted", "submitted", "interviewing", "offer", "placed"].includes(a.stage),
      );
      slotAssignments.forEach((a) => allAssignedWorkers.add(a.candidate_id));

      let slotHoursThisWeek = 0;
      weekDates.forEach((d) => {
        const dk = ymd(d);
        const c = resolveCell(v.id, slot, dk);
        if (!c.active || !c.start || !c.finish) return;
        const [sh, sm] = c.start.split(":").map(Number);
        const [fh, fm] = c.finish.split(":").map(Number);
        let mins = (fh * 60 + fm) - (sh * 60 + sm);
        if (mins < 0) mins += 24 * 60; // overnight
        const hours = mins / 60;
        slotHoursThisWeek += hours;
      });

      if (slotHoursThisWeek > 0) {
        slotAssignments.forEach((a) => workersWithShifts.add(a.candidate_id));
      }
      totalHours += slotHoursThisWeek;
      totalCharge += slotHoursThisWeek * charge;
      totalMargin += slotHoursThisWeek * marginPerHour;
    });

    const idleWorkers = Array.from(allAssignedWorkers).filter((id) => !workersWithShifts.has(id));
    return {
      totalHours, totalMargin, totalCharge, currency,
      activeWorkers: workersWithShifts.size,
      idleWorkers: idleWorkers.length,
    };
  }, [displayRows, weekDates, shifts, resolveCell]);

  const fmtMoney = (n: number) => `${stats.currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="rounded-md border bg-card select-none outline-none [&_*]:outline-none" ref={gridRef}>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-px border-b bg-border md:grid-cols-4">
        <StatTile label="Total margin (week)" value={fmtMoney(stats.totalMargin)} accent={stats.totalMargin >= 0 ? "good" : "bad"} sub={`Charge: ${fmtMoney(stats.totalCharge)}`} />
        <StatTile label="Total hours (week)" value={stats.totalHours.toFixed(1)} />
        <StatTile label="Workers scheduled" value={String(stats.activeWorkers)} />
        <StatTile label="Idle workers" value={String(stats.idleWorkers)} accent={stats.idleWorkers > 0 ? "warn" : undefined} sub="Assigned but no shifts this week" />
      </div>
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
          <Button size="sm" variant="ghost" onClick={() => { setWeekStart(startOfWeek(new Date())); setDaysShown(7); }}>Today</Button>
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
          <span className="hidden md:inline">·</span>
          <span>{daysShown}d</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={daysShown >= MAX_DAYS}
            onClick={() => setDaysShown((n) => Math.min(MAX_DAYS, n + 7))}
          >
            +1 week
          </Button>
          {daysShown > 7 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setDaysShown(7)}
            >
              Reset
            </Button>
          )}
        </div>
      </div>


      {/* Grid */}
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]" style={{ touchAction: "pan-x pan-y" }}>
        <div style={{ minWidth: `${minGridW}px` }}>
          {/* Header row */}
          <div className="grid sticky top-0 z-20 bg-muted/30" style={{ gridTemplateColumns: gridTemplate }}>
            <button type="button" onClick={() => toggleSort("title")} className={`${isMobile ? "" : "sticky left-0 z-30"} border-b border-r bg-muted/30 px-2 py-2 text-left text-[11px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground`}>Job{sortArrow("title")}</button>
            <button type="button" onClick={() => toggleSort("client")} className={`${isMobile ? "" : "sticky z-30"} border-b border-r bg-muted/30 px-2 py-2 text-left text-[11px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground`} style={isMobile ? undefined : { left: `${jobColW}px` }}>Client{sortArrow("client")}</button>
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
            <>
            {displayRows.map(({ vacancy: v, slot, total }, rowIdx) => {
              const rowBg = rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10";
              const rowKey = `${v.id}#${slot}`;
              return (
                <div key={rowKey} className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                  {/* Job (frozen) — right-click for vacancy copy/paste */}
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div className={`${isMobile ? "" : "sticky left-0 z-10"} border-b border-r ${rowBg} px-2 py-2`}>
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-semibold leading-tight flex-1">{v.title}</div>
                          {total > 1 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">#{slot + 1}/{total}</Badge>
                          )}
                        </div>
                        {v.reference && <div className="text-[10px] text-muted-foreground">Ref {v.reference}</div>}
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge variant={v.status === "open" ? "default" : "outline"} className="text-[9px] h-4 px-1">{v.status}</Badge>
                          {(v.pay_min || v.pay_max) && (
                            <span className="text-[10px] text-muted-foreground">
                              Pay {v.pay_currency ?? "GBP"} {v.pay_min ?? "?"}–{v.pay_max ?? "?"}/{v.pay_period ?? "hr"}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const pay = Number(v.pay_max ?? v.pay_min ?? 0);
                          const charge = Number(v.charge_rate ?? 0);
                          const paye = Number(v.paye_rate_percent ?? 21);
                          if (!pay || !charge) return null;
                          const cost = pay + pay * (paye / 100);
                          const m = charge - cost;
                          const pct = (m / charge) * 100;
                          return (
                            <div className={`mt-1 text-[10px] ${m >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              Charge {v.pay_currency ?? "GBP"} {charge.toFixed(2)} · Margin {m.toFixed(2)} ({pct.toFixed(0)}%)
                            </div>
                          );
                        })()}
                        <div className="mt-1 flex gap-1 flex-wrap">
                          <button onClick={() => onEdit(v)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><Pencil className="h-2.5 w-2.5" />Edit</button>
                          <button onClick={() => onAssign(v.id)} className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"><UserPlus className="h-2.5 w-2.5" />Assign</button>
                          {onOpenAI && <button onClick={() => onOpenAI(v.id)} className="text-[10px] text-primary hover:underline">AI</button>}
                          <button onClick={() => onDelete(v.id)} className="text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem onSelect={() => { setVacancyClip(v); toast({ title: `Copied vacancy "${v.title}"` }); }}>
                        <Copy className="h-3.5 w-3.5 mr-2" />Copy vacancy
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => bumpOpenings(v, 1)}>
                        <Plus className="h-3.5 w-3.5 mr-2" />Add another opening
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => bumpOpenings(v, -1)} disabled={total <= 1}>
                        <Minus className="h-3.5 w-3.5 mr-2" />Remove an opening
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onSelect={() => vacancyClip && bumpOpenings(vacancyClip, 1)}
                        disabled={!vacancyClip}
                      >
                        <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                        Paste vacancy{vacancyClip ? ` ("${vacancyClip.title}")` : ""}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {/* Client (frozen) */}
                  <div className={`${isMobile ? "" : "sticky z-10"} border-b border-r ${rowBg} px-2 py-2`} style={isMobile ? undefined : { left: `${jobColW}px` }}>
                    <div className="text-sm">{v.client?.name ?? "—"}</div>
                    {v.location && <div className="text-[10px] text-muted-foreground line-clamp-2">{v.location}</div>}
                  </div>
                  {/* Day cells (per slot) */}
                  {weekDates.map((d, dIdx) => {
                    const dk = ymd(d);
                    const cell = resolveCell(v.id, slot, dk);
                    const isToday = dk === todayKey;
                    const isSelected = selected.has(cellKey(v.id, slot, dk));
                    const isClipSource = clipboard?.sourceKeys.includes(cellKey(v.id, slot, dk)) ?? false;
                    const slotAssignee = (v.assignments ?? []).find((a) =>
                      a.slot_index === slot &&
                      ["shortlisted","submitted","interviewing","offer","placed"].includes(a.stage),
                    );
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
                        assignee={slotAssignee ? { id: slotAssignee.candidate.id, name: slotAssignee.candidate.full_name } : null}
                        isSelected={isSelected}
                        isClipSource={isClipSource}
                        clipMode={clipboard?.mode ?? null}
                        onClick={(e) => {
                          if (e.shiftKey) rangeSelect(v.id, slot, dIdx);
                          else if (e.ctrlKey || e.metaKey) toggleSelect(v.id, slot, dIdx);
                          else selectSingle(v.id, slot, dIdx);
                        }}
                        onDoubleClickEdit={cell.active}
                        onSave={async (st, fi) => { await upsert(v.id, slot, dk, st, fi, false); await load(); }}
                        onContextDelete={async () => { await removeShift(v.id, slot, dk); await load(); }}
                        onContextCopy={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => collectClip("copy"), 0); }}
                        onContextCut={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => collectClip("cut"), 0); }}
                        onContextPaste={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => pasteClip(), 0); }}
                        onContextAdd={async () => { await upsert(v.id, slot, dk, v.start_time?.slice(0, 5) ?? "09:00", v.finish_time?.slice(0, 5) ?? "17:00", false); await load(); }}
                        onContextBulkPaste={() => setBulkPaste({ vacancyId: v.id, slot, date: dk })}
                        clipboardHasItems={!!clipboard}
                      />
                    );
                  })}
                </div>
              );
            })}
            {/* Trailing empty placeholder row — right-click to paste a copied vacancy as a new opening */}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className={`${isMobile ? "" : "sticky left-0 z-10"} border-b border-r bg-muted/5 px-2 py-3 min-h-[78px] flex items-center justify-center text-[11px] text-muted-foreground/70 italic`}>
                    {vacancyClip ? `Right-click to paste "${vacancyClip.title}"` : "Right-click → copy a vacancy first"}
                  </div>
                  <div className={`${isMobile ? "" : "sticky z-10"} border-b border-r bg-muted/5`} style={isMobile ? undefined : { left: `${jobColW}px` }} />
                  {weekDates.map((_, i) => (
                    <div key={i} className="border-b border-r bg-muted/5" />
                  ))}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem
                  onSelect={() => vacancyClip && bumpOpenings(vacancyClip, 1)}
                  disabled={!vacancyClip}
                >
                  <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                  Paste vacancy{vacancyClip ? ` ("${vacancyClip.title}")` : ""}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            </>
          )}
        </div>
      </div>

      {/* Bulk paste dialog */}
      <Dialog open={!!bulkPaste} onOpenChange={(o) => { if (!o) setBulkPaste(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk paste shifts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground text-xs">
              Repeats the {clipboard?.items.length ?? 0}-cell clipboard pattern starting from{" "}
              {bulkPaste ? new Date(bulkPaste.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""}.
            </p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">How many</div>
                <Input type="number" min={1} value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">Unit</div>
                <Select value={bulkUnit} onValueChange={(v) => setBulkUnit(v as "days" | "weeks" | "months")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">days</SelectItem>
                    <SelectItem value="weeks">weeks</SelectItem>
                    <SelectItem value="months">months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPaste(null)}>Cancel</Button>
            <Button onClick={runBulkPaste} disabled={!clipboard}>Paste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  assignee: { id: string; name: string } | null;
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
  onContextBulkPaste: () => void;
  clipboardHasItems: boolean;
}) {
  const { date, rowBg, isToday, active, cancelled, start, finish, assignee, isSelected, isClipSource, clipMode,
    onClick, onDoubleClickEdit, onSave, onContextDelete, onContextCopy, onContextCut, onContextPaste, onContextAdd, onContextBulkPaste, clipboardHasItems } = props;

  const [editOpen, setEditOpen] = useState(false);
  const [st, setSt] = useState(start ?? "09:00");
  const [fi, setFi] = useState(finish ?? "17:00");
  useEffect(() => { setSt(start ?? "09:00"); setFi(finish ?? "17:00"); }, [start, finish]);

  const todayTint = isToday ? "bg-primary/5" : rowBg;
  const selectionRing = isSelected ? "ring-2 ring-primary ring-inset" : "";
  const clipBorder = isClipSource ? (clipMode === "cut" ? "outline-dashed outline-2 outline-destructive/60" : "outline-dashed outline-2 outline-primary/60") : "";

  const initials = (name?: string) => {
    if (!name) return "?";
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  };

  let inner: React.ReactNode;
  if (!active) {
    inner = (
      <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-border/40 text-[11px] text-muted-foreground/60">
        —
      </div>
    );
  } else {
    inner = (
      <div className="flex h-full w-full flex-col items-start justify-center rounded border border-primary/30 bg-primary/5 px-2 py-1.5 text-left gap-0.5">
        <div className="text-[11px] font-semibold leading-tight text-foreground">{to12h(start)}</div>
        <div className="text-[11px] leading-tight text-muted-foreground">{to12h(finish)}</div>
        {assignee && (
          <div className="mt-0.5 flex items-center gap-1 max-w-full">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] font-semibold text-primary">
              {initials(assignee.name)}
            </span>
            <span className="truncate text-[10px] text-foreground/80">{assignee.name}</span>
          </div>
        )}
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
      <ContextMenuContent className="w-48">
        {!active && !cancelled && <ContextMenuItem onSelect={onContextAdd}>Add shift</ContextMenuItem>}
        {active && <ContextMenuItem onSelect={() => setEditOpen(true)}>Edit times</ContextMenuItem>}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onContextCopy} disabled={!active}>Copy</ContextMenuItem>
        <ContextMenuItem onSelect={onContextCut} disabled={!active}>Cut</ContextMenuItem>
        <ContextMenuItem onSelect={onContextPaste} disabled={!clipboardHasItems}>Paste</ContextMenuItem>
        <ContextMenuItem onSelect={onContextBulkPaste} disabled={!clipboardHasItems}>Bulk paste…</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onContextDelete} className="text-destructive" disabled={!active && !cancelled}>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "good" | "bad" | "warn" }) {
  const valueColor =
    accent === "good" ? "text-emerald-600" :
    accent === "bad" ? "text-destructive" :
    accent === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="bg-card px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold leading-tight ${valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
