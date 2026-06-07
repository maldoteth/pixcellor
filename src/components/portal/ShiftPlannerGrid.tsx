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
  ChevronRight, Trash2, Loader2, CalendarDays, Clipboard, Copy, ClipboardPaste, Plus, Minus, Sparkles,
} from "lucide-react";
import AIRecommendationsPanel from "./AIRecommendationsPanel";

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
  candidate_id: string | null;
  assignment_overridden: boolean;
  candidate_name: string | null;
};

type Props = {
  vacancies: Vacancy[];
  candidates?: Array<{ id: string; full_name: string; status?: string | null; email?: string | null; phone?: string | null; headline?: string | null; photo_url?: string | null }>;
  onCreate?: () => void;
  onEdit?: (v: Vacancy) => void;
  onDelete?: (id: string) => void;
  onVacancyChanged?: () => void | Promise<void>;
  /** When provided, show only rows (vacancy+slot) assigned to this candidate. First column becomes the vacancy. */
  candidateFilter?: { id: string; name: string };
  /** Second sticky column. Defaults to "client". When "candidate", shows the assigned candidate's name and details instead. */
  secondColumn?: "client" | "candidate";
  /** When in candidate-column mode, hide rows whose slot has no assigned candidate. */
  candidateColumnOnlyAssigned?: boolean;
  /** Called when the candidate cell is clicked (candidate-column mode). */
  onCandidateClick?: (candidateId: string) => void;
  /** "vacancy" (default): one row per vacancy slot. "candidate": one row per candidate with assigned shifts; day cells show job chips. */
  rowMode?: "vacancy" | "candidate";
  /** "admin" (default) shows margin/charge stats. "candidate" shows the worker's own earnings using pay rate and hides client cost lines. */
  viewerMode?: "admin" | "candidate";
  /** Hide the sticky first column (only valid with rowMode="candidate"). Used in candidate dashboards where only date cells are shown. */
  hideFirstColumn?: boolean;
};

type ClipItem = { start: string | null; finish: string | null; candidateId: string | null; sourceVacancyId?: string };

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

export default function ShiftPlannerGrid({ vacancies, candidates = [], onCreate, onEdit = () => {}, onDelete = () => {}, onVacancyChanged, candidateFilter, secondColumn = "client", candidateColumnOnlyAssigned = false, onCandidateClick, rowMode = "vacancy", viewerMode = "admin", hideFirstColumn = false }: Props) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const jobColW = isMobile ? 110 : 240;
  const clientColW = isMobile ? 80 : 170;
  const dayMinW = isMobile ? 84 : 140;
  const MAX_DAYS = 28;
  const [daysShown, setDaysShown] = useState<number>(7);
  const defaultCandidateColW = jobColW + clientColW;
  const CANDIDATE_COL_MIN = isMobile ? 120 : 160;
  const CANDIDATE_COL_MAX = 640;
  const [candidateFirstColW, setCandidateFirstColW] = useState<number>(() => {
    if (typeof window === "undefined") return defaultCandidateColW;
    const v = Number(window.localStorage.getItem("pix.shiftGrid.candidateColW"));
    return Number.isFinite(v) && v >= 80 ? v : defaultCandidateColW;
  });
  const resizingRef = useRef<{ startX: number; startW: number } | null>(null);
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizingRef.current = { startX: e.clientX, startW: candidateFirstColW };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    const delta = e.clientX - resizingRef.current.startX;
    const next = Math.max(CANDIDATE_COL_MIN, Math.min(CANDIDATE_COL_MAX, resizingRef.current.startW + delta));
    setCandidateFirstColW(next);
  };
  const onResizeEnd = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;
    resizingRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    try { window.localStorage.setItem("pix.shiftGrid.candidateColW", String(candidateFirstColW)); } catch {}
  };
  const gridTemplate = hideFirstColumn
    ? `repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`
    : rowMode === "candidate"
      ? `${candidateFirstColW}px repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`
      : `${jobColW}px ${clientColW}px repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`;
  const minGridW = (hideFirstColumn ? 0 : rowMode === "candidate" ? candidateFirstColW : jobColW + clientColW) + dayMinW * daysShown;
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
  const [jobDetails, setJobDetails] = useState<{ vacancy: Vacancy; shift: Shift; date: string; slot: number } | null>(null);
  const ACTIVE_STAGES = ["shortlisted", "submitted", "interviewing", "offer", "placed"] as const;
  const candidateLookup = useMemo(() => {
    const m = new Map<string, NonNullable<Props["candidates"]>[number]>();
    candidates.forEach((c) => m.set(c.id, c));
    return m;
  }, [candidates]);
  const slotAssignedCandidateId = useCallback((v: Vacancy, slot: number): string | null => {
    const fromShifts = Object.values(shifts[v.id]?.[slot] ?? {}).find(
      (s) => !s.cancelled && s.assignment_overridden && s.candidate_id,
    );
    if (fromShifts?.candidate_id) return fromShifts.candidate_id;
    const a = (v.assignments ?? []).find(
      (a) => Number(a.slot_index ?? 0) === slot && (ACTIVE_STAGES as readonly string[]).includes(a.stage),
    );
    return a?.candidate?.id ?? null;
  }, [shifts]);
  const sortedVacancies = useMemo(() => {
    const arr = [...vacancies];
    arr.sort((a, b) => {
      const cmp = (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    if (sortBy === "title") return arr;
    // Secondary-column sort: build rows then sort by column value, but keep as vacancies array (rows handled below).
    return arr;
  }, [vacancies, sortBy, sortDir]);
  // Expand each vacancy into N rows (one per opening), keep them individual.
  const displayRows = useMemo(() => {
    const rows: Array<{ vacancy: Vacancy; slot: number; total: number }> = [];
    sortedVacancies.forEach((v) => {
      const total = Math.max(1, Number(v.openings ?? 1) || 1);
      for (let i = 0; i < total; i++) {
        if (candidateFilter) {
          const hasShiftForCandidate = Object.values(shifts[v.id]?.[i] ?? {}).some(
            (s) => !s.cancelled && s.assignment_overridden && s.candidate_id === candidateFilter.id,
          );
          if (!hasShiftForCandidate) continue;
        }
        if (secondColumn === "candidate" && candidateColumnOnlyAssigned) {
          // Only show this slot if there is at least one actual (non-cancelled) shift assigned to a candidate.
          const hasAssignedShift = Object.values(shifts[v.id]?.[i] ?? {}).some(
            (s) => !s.cancelled && s.assignment_overridden && s.candidate_id,
          );
          if (!hasAssignedShift) continue;
        }
        rows.push({ vacancy: v, slot: i, total });
      }
    });
    if (sortBy === "client") {
      rows.sort((a, b) => {
        let av = "";
        let bv = "";
        if (secondColumn === "candidate") {
          const ai = slotAssignedCandidateId(a.vacancy, a.slot);
          const bi = slotAssignedCandidateId(b.vacancy, b.slot);
          av = (ai ? candidateLookup.get(ai)?.full_name ?? "" : "");
          bv = (bi ? candidateLookup.get(bi)?.full_name ?? "" : "");
        } else {
          av = a.vacancy.client?.name ?? "";
          bv = b.vacancy.client?.name ?? "";
        }
        const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [sortedVacancies, candidateFilter, shifts, secondColumn, candidateColumnOnlyAssigned, slotAssignedCandidateId, sortBy, sortDir, candidateLookup]);

  // Candidate-row mode: aggregate every assigned shift across all vacancies grouped by candidate.
  type CandidateRowShift = { vacancy: Vacancy; slot: number; date: string; shift: Shift };
  type CandidateRow = {
    info: { id: string; full_name: string; status?: string | null; email?: string | null; phone?: string | null; headline?: string | null; photo_url?: string | null };
    shifts: CandidateRowShift[];
  };
  const candidateRowsData = useMemo<CandidateRow[]>(() => {
    if (rowMode !== "candidate") return [];
    const map = new Map<string, CandidateRow>();
    vacancies.forEach((v) => {
      const sBySlot = shifts[v.id] ?? {};
      Object.entries(sBySlot).forEach(([slotStr, byDate]) => {
        const slot = Number(slotStr);
        Object.entries(byDate).forEach(([date, s]) => {
          if (!s || s.cancelled || !s.assignment_overridden || !s.candidate_id) return;
          const cid = s.candidate_id;
          if (!map.has(cid)) {
            const info = candidateLookup.get(cid) ?? { id: cid, full_name: s.candidate_name ?? "Unknown" };
            map.set(cid, { info, shifts: [] });
          }
          map.get(cid)!.shifts.push({ vacancy: v, slot, date, shift: s });
        });
      });
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.info.full_name || "").localeCompare(b.info.full_name || "", undefined, { sensitivity: "base" }));
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [rowMode, vacancies, shifts, candidateLookup, sortDir]);

  const [vacancyClip, setVacancyClip] = useState<Vacancy | null>(null);
  const changeOpenings = async (v: Vacancy, next: number, cloneFromSlot?: number, removeSlot?: number) => {
    const current = Math.max(1, Number(v.openings ?? 1) || 1);
    if (next === current) return;
    if (next > current) {
      const newSlot = current;
      const { error: cloneErr } = await supabase.rpc("portal_clone_vacancy_slot" as never, {
        _vacancy_id: v.id, _from_slot: cloneFromSlot ?? 0, _to_slot: newSlot,
      } as never);
      if (cloneErr) { toast({ title: "Clone failed", description: cloneErr.message, variant: "destructive" }); return; }
    } else {
      const { error: delErr } = await supabase.rpc("portal_delete_vacancy_slot" as never, {
        _vacancy_id: v.id, _slot: removeSlot ?? current - 1,
      } as never);
      if (delErr) { toast({ title: "Delete failed", description: delErr.message, variant: "destructive" }); return; }
    }
    const { error } = await supabase.rpc("portal_update_vacancy" as never, { _id: v.id, _patch: { openings: next } } as never);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: next > current ? `Added opening (now ${next})` : `Removed opening (now ${next})` });
    await onVacancyChanged?.();
    await load();
  };
  const bumpOpenings = async (v: Vacancy, delta: number, cloneFromSlot = 0) => {
    const current = Math.max(1, Number(v.openings ?? 1) || 1);
    await changeOpenings(v, Math.max(1, current + delta), cloneFromSlot);
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
  const collectClipRef = useRef<(mode: "copy" | "cut") => void>(() => undefined);
  const pasteClipRef = useRef<() => void | Promise<void>>(() => undefined);
  const deleteSelectionRef = useRef<() => void | Promise<void>>(() => undefined);
  const clearSelectionRef = useRef<() => void>(() => undefined);
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
    const slotAssignee = (v?.assignments ?? []).find((a) =>
      a.slot_index === slot &&
      ["shortlisted", "submitted", "interviewing", "offer", "placed"].includes(a.stage),
    );
    const baseAssignee = slotAssignee ? { id: slotAssignee.candidate.id, name: slotAssignee.candidate.full_name } : null;
    const overrideAssignee = shift?.assignment_overridden
      ? (shift.candidate_id ? { id: shift.candidate_id, name: shift.candidate_name ?? "Unknown" } : null)
      : baseAssignee;
    if (shift) {
      if (shift.cancelled) return { active: false, cancelled: true, start: null, finish: null, hasExplicit: true, assignee: null, overridden: shift.assignment_overridden };
      return {
        active: true, cancelled: false, hasExplicit: true,
        start: (shift.start_time ?? tStart)?.slice(0, 5) ?? null,
        finish: (shift.finish_time ?? tFinish)?.slice(0, 5) ?? null,
        assignee: overrideAssignee,
        overridden: shift.assignment_overridden,
      };
    }
    // Template-driven recurring days apply to every opening/slot within the vacancy's date window.
    const inRange = (() => {
      if (v?.start_date && date < v.start_date) return false;
      if (v?.end_date && date > v.end_date) return false;
      return true;
    })();
    const matchesTemplate = templateSet.size === 0 || templateSet.has(dow);
    if (inRange && matchesTemplate && (tStart || tFinish)) return { active: true, cancelled: false, start: tStart, finish: tFinish, hasExplicit: false, assignee: baseAssignee, overridden: false };
    return { active: false, cancelled: false, start: null, finish: null, hasExplicit: false, assignee: baseAssignee, overridden: false };
  }, [vacancies, shifts]);

  const DOW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;

  // Ensure the vacancy's date window and schedule_days cover this shift's date/time,
  // and recompute start_date/end_date to match the actual active (non-cancelled) calendar.
  const syncVacancyWindow = async (vacancyId: string, date: string, s: string | null, f: string | null, cancelled: boolean) => {
    const v = vacancies.find((x) => x.id === vacancyId);
    if (!v) return;
    const patch: Record<string, unknown> = {};
    if (!cancelled) {
      const dowFull = DOW_FULL[new Date(date + "T00:00:00").getDay()];
      const existing = (v.schedule_days ?? []).map((d) => d);
      const hasDow = existing.some((d) => d.toLowerCase().startsWith(dowFull.toLowerCase().slice(0, 3)));
      if (!hasDow) patch.schedule_days = [...existing, dowFull];
      if (s && !v.start_time) patch.start_time = s.length === 5 ? `${s}:00` : s;
      if (f && !v.finish_time) patch.finish_time = f.length === 5 ? `${f}:00` : f;
    }
    // Recompute the active date range from all non-cancelled shifts on this vacancy.
    const { data: rows } = await supabase
      .from("vacancy_shifts" as never)
      .select("shift_date, cancelled")
      .eq("vacancy_id", vacancyId);
    const activeDates = ((rows as Array<{ shift_date: string; cancelled: boolean }> | null) ?? [])
      .filter((r) => !r.cancelled)
      .map((r) => r.shift_date)
      .sort();
    if (!cancelled && (!activeDates.length || date < activeDates[0])) activeDates.unshift(date);
    if (!cancelled && (!activeDates.length || date > activeDates[activeDates.length - 1])) activeDates.push(date);
    const newStart = activeDates[0] ?? null;
    const newEnd = activeDates[activeDates.length - 1] ?? null;
    if (newStart && newStart !== v.start_date) patch.start_date = newStart;
    if (newEnd && newEnd !== v.end_date) patch.end_date = newEnd;
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

  const setShiftCandidate = async (vacancyId: string, slot: number, date: string, candidateId: string | null) => {
    const { error } = await supabase.rpc("portal_set_shift_candidate" as never, {
      _vacancy_id: vacancyId, _slot: slot, _date: date, _candidate_id: candidateId,
    } as never);
    if (error) { toast({ title: "Assignment failed", description: error.message, variant: "destructive" }); return false; }
    return true;
  };

  const removeShift = async (vacancyId: string, slot: number, date: string) => {
    const cell = resolveCell(vacancyId, slot, date);
    if (cell.hasExplicit) {
      const { error } = await supabase.rpc("portal_delete_vacancy_shift" as never, {
        _vacancy_id: vacancyId, _date: date, _slot: slot,
      } as never);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      await syncVacancyWindow(vacancyId, date, null, null, true);
    } else if (cell.active) {
      // template-only: cancel it explicitly for this slot
      await upsert(vacancyId, slot, date, null, null, true);
    }
  };

  // Selection helpers
  const blurActive = () => { try { (document.activeElement as HTMLElement | null)?.blur(); } catch { /* noop */ } };
  const selectSingle = (vacancyId: string, slot: number, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    const next = new Set([cellKey(vacancyId, slot, date)]);
    selectedRef.current = next; // sync immediately so keyboard handler sees it on first click
    setSelected(next);
    setLastSelected({ vacancyId, slot, dateIdx });
    blurActive();
  };
  const toggleSelect = (vacancyId: string, slot: number, dateIdx: number) => {
    const date = ymd(weekDates[dateIdx]);
    const k = cellKey(vacancyId, slot, date);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      selectedRef.current = next;
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
      if (r1 < 0 || r2 < 0) { next.add(cellKey(vacancyId, slot, ymd(weekDates[dateIdx]))); selectedRef.current = next; return next; }
      const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
      const [dMin, dMax] = [Math.min(lastSelected.dateIdx, dateIdx), Math.max(lastSelected.dateIdx, dateIdx)];
      for (let r = rMin; r <= rMax; r++) {
        const row = displayRows[r];
        for (let d = dMin; d <= dMax; d++) {
          next.add(cellKey(row.vacancy.id, row.slot, ymd(weekDates[d])));
        }
      }
      selectedRef.current = next;
      return next;
    });
  };

  // Range select for candidate mode: rectangle across candidate rows × dates,
  // picking every chip on each (row, date) cell in the rectangle.
  const rangeSelectCandidate = (candidateId: string, dateIdx: number) => {
    if (!lastSelected) {
      // No anchor yet — select every chip on this single cell
      const dk = ymd(weekDates[dateIdx]);
      const row = candidateRowsData.find((r) => r.info.id === candidateId);
      const keys = (row?.shifts ?? []).filter((x) => x.date === dk).map((x) => cellKey(x.vacancy.id, x.slot, dk));
      const next = new Set(keys);
      selectedRef.current = next;
      setSelected(next);
      setLastSelected({ vacancyId: candidateId, slot: -1, dateIdx });
      blurActive();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      const rowIds = candidateRowsData.map((r) => r.info.id);
      const r1 = rowIds.indexOf(lastSelected.vacancyId);
      const r2 = rowIds.indexOf(candidateId);
      if (r1 < 0 || r2 < 0) { selectedRef.current = next; return next; }
      const [rMin, rMax] = [Math.min(r1, r2), Math.max(r1, r2)];
      const [dMin, dMax] = [Math.min(lastSelected.dateIdx, dateIdx), Math.max(lastSelected.dateIdx, dateIdx)];
      for (let r = rMin; r <= rMax; r++) {
        const row = candidateRowsData[r];
        for (let d = dMin; d <= dMax; d++) {
          const dk = ymd(weekDates[d]);
          row.shifts.filter((x) => x.date === dk).forEach((x) => {
            next.add(cellKey(x.vacancy.id, x.slot, dk));
          });
        }
      }
      selectedRef.current = next;
      return next;
    });
  };

  // Ctrl/Cmd+A — select every visible shift cell (vacancy mode) or every chip (candidate mode).
  const selectAll = () => {
    const keys: string[] = [];
    if (rowMode === "candidate") {
      const weekKeys = new Set(weekDates.map(ymd));
      candidateRowsData.forEach((row) => {
        row.shifts.forEach((x) => {
          if (weekKeys.has(x.date)) keys.push(cellKey(x.vacancy.id, x.slot, x.date));
        });
      });
    } else {
      displayRows.forEach(({ vacancy: v, slot }) => {
        weekDates.forEach((d) => {
          const dk = ymd(d);
          const c = resolveCell(v.id, slot, dk);
          if (c.active && !c.cancelled) keys.push(cellKey(v.id, slot, dk));
        });
      });
    }
    const next = new Set(keys);
    selectedRef.current = next;
    setSelected(next);
    if (keys.length > 0) toast({ title: `Selected ${keys.length} shift${keys.length === 1 ? "" : "s"}` });
  };
  const selectAllRef = useRef<() => void>(() => undefined);
  useEffect(() => { selectAllRef.current = selectAll; });

  const clearSelection = () => { setSelected(new Set()); setLastSelected(null); };
  useEffect(() => { clearSelectionRef.current = clearSelection; });

  // Clipboard ops
  const collectClip = (mode: "copy" | "cut") => {
    const sel = selectedRef.current;
    if (sel.size === 0) return;
    const keys = Array.from(sel);
    const items: ClipItem[] = keys.map((k) => {
      const { vid, slot, date } = parseCellKey(k);
      const c = resolveCell(vid, slot, date);
      return { start: c.start, finish: c.finish, candidateId: c.assignee?.id ?? null, sourceVacancyId: vid };
    });
    setClipboard({ mode, items, sourceKeys: keys });
    toast({ title: `${mode === "copy" ? "Copied" : "Cut"} ${items.length} cell${items.length === 1 ? "" : "s"}` });
  };
  useEffect(() => { collectClipRef.current = collectClip; });

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
          await setShiftCandidate(vid, slot, date, item.candidateId);
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
  useEffect(() => { pasteClipRef.current = pasteClip; });

  /**
   * Candidate-mode paste model
   * --------------------------
   * A *vacancy* represents one job at one client. It can have many shifts (dates) and
   * an assigned candidate (via shift-level overrides). Pasting shifts onto a candidate
   * should NEVER spawn a brand-new vacancy per date — that pollutes the list.
   *
   * Rules:
   *  1. Group clip items by their source vacancy. Each group becomes AT MOST one
   *     destination vacancy.
   *  2. If the target candidate is the same as the source candidate, just upsert the
   *     extra shifts onto the EXISTING source vacancy (no new vacancy at all).
   *  3. Otherwise, create exactly ONE new vacancy cloned from the source (no auto-
   *     materialised shifts), then upsert every target date into it and assign the
   *     target candidate. Finally update start_date/end_date/schedule_days to match
   *     the actual set of dates.
   *  4. Skip the no-op where the target equals the source (same vacancy + date +
   *     candidate) so bulk-pasting from the source's own date doesn't duplicate it.
   */
  const pasteShiftsToCandidate = async (
    targetCandidateId: string,
    targetDates: string[],
    opts?: { showToast?: boolean; skipReload?: boolean; skipCutCleanup?: boolean },
  ): Promise<{ newVacancies: number; shifts: number }> => {
    const clip = clipboardRef.current;
    if (!clip || clip.items.length === 0 || targetDates.length === 0) return { newVacancies: 0, shifts: 0 };

    // Group by sourceVacancyId. Carry the source key alongside so we can detect no-ops.
    type Group = { source: Vacancy; items: Array<{ item: ClipItem; sourceKey: string }> };
    const groups = new Map<string, Group>();
    for (let i = 0; i < clip.items.length; i++) {
      const item = clip.items[i];
      const sv = item.sourceVacancyId ? vacancies.find((v) => v.id === item.sourceVacancyId) : null;
      if (!sv?.client?.id) continue;
      if (!groups.has(sv.id)) groups.set(sv.id, { source: sv, items: [] });
      groups.get(sv.id)!.items.push({ item, sourceKey: clip.sourceKeys[i] ?? "" });
    }

    let newVacancies = 0;
    let shiftsCreated = 0;

    for (const { source, items } of groups.values()) {
      // Build the (date, item) plan for this group. Repeat the group's items across
      // target dates round-robin so a 1-item clip fills every date.
      const plan: Array<{ date: string; item: ClipItem; sourceKey: string }> = [];
      for (let i = 0; i < targetDates.length; i++) {
        const slot = items[i % items.length];
        plan.push({ date: targetDates[i], item: slot.item, sourceKey: slot.sourceKey });
      }

      // Same candidate as the source → just extend the existing vacancy.
      const allSameCandidate = items.every((s) => s.item.candidateId === targetCandidateId);
      if (allSameCandidate) {
        for (const p of plan) {
          // Skip pasting onto the exact source cell
          if (p.sourceKey) {
            const { vid, date: srcDate } = parseCellKey(p.sourceKey);
            if (vid === source.id && srcDate === p.date) continue;
          }
          await upsert(source.id, 0, p.date, p.item.start, p.item.finish, false);
          await setShiftCandidate(source.id, 0, p.date, targetCandidateId);
          shiftsCreated++;
        }
        continue;
      }

      // Different candidate → make ONE cloned vacancy with no date window, then
      // upsert every shift, then snap the window to the actual dates.
      const payload: Record<string, unknown> = {
        client_contact_id: source.client!.id,
        title: source.title,
        reference: source.reference,
        location: source.location,
        status: "open",
        openings: 1,
        // No date window → portal_materialize_vacancy_shifts will early-return, so
        // no auto-shifts get created and we have full control below.
        start_date: "",
        end_date: "",
        start_time: source.start_time ?? "",
        finish_time: source.finish_time ?? "",
        schedule_days: [],
        pay_min: source.pay_min,
        pay_max: source.pay_max,
        pay_currency: source.pay_currency ?? "GBP",
        pay_period: source.pay_period ?? "hour",
        charge_rate: source.charge_rate,
        paye_rate_percent: source.paye_rate_percent,
      };
      const { data, error } = await supabase.rpc("portal_create_vacancy" as never, { _payload: payload } as never);
      if (error || !data) {
        toast({ title: "Paste failed", description: error?.message ?? "Could not create vacancy", variant: "destructive" });
        continue;
      }
      const newVacancyId = (data as { id?: string })?.id;
      if (!newVacancyId) continue;
      newVacancies++;

      const addedDates: string[] = [];
      for (const p of plan) {
        const { error: upErr } = await supabase.rpc("portal_upsert_vacancy_shift" as never, {
          _vacancy_id: newVacancyId, _date: p.date, _slot: 0,
          _start: p.item.start, _finish: p.item.finish, _cancelled: false,
        } as never);
        if (upErr) continue;
        await supabase.rpc("portal_set_shift_candidate" as never, {
          _vacancy_id: newVacancyId, _slot: 0, _date: p.date, _candidate_id: targetCandidateId,
        } as never);
        addedDates.push(p.date);
        shiftsCreated++;
      }

      if (addedDates.length > 0) {
        addedDates.sort();
        const dows = Array.from(new Set(addedDates.map((d) => {
          const day = new Date(d + "T00:00:00").getDay();
          return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][day];
        })));
        await supabase.rpc("portal_update_vacancy" as never, {
          _id: newVacancyId,
          _patch: {
            start_date: addedDates[0],
            end_date: addedDates[addedDates.length - 1],
            schedule_days: dows,
          },
        } as never);
      }
    }

    if (!opts?.skipCutCleanup && clip.mode === "cut" && shiftsCreated > 0) {
      await Promise.all(clip.sourceKeys.map((k) => {
        const { vid, slot, date } = parseCellKey(k);
        return removeShift(vid, slot, date);
      }));
      setClipboard(null);
    }

    if (!opts?.skipReload) {
      await onVacancyChanged?.();
      await load();
    }
    if (opts?.showToast !== false && shiftsCreated > 0) {
      const parts: string[] = [];
      parts.push(`${shiftsCreated} shift${shiftsCreated === 1 ? "" : "s"}`);
      if (newVacancies > 0) parts.push(`${newVacancies} new vacanc${newVacancies === 1 ? "y" : "ies"}`);
      else parts.push("(added to existing vacancy)");
      toast({ title: `Pasted ${parts.join(" · ")}` });
    }
    return { newVacancies, shifts: shiftsCreated };
  };

  // Right-click → "Paste here" on a single candidate cell.
  const pasteToCandidateCell = (targetCandidateId: string, targetDate: string) =>
    pasteShiftsToCandidate(targetCandidateId, [targetDate]);

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
    const candidateTarget = bulkPaste.vacancyId.startsWith("__cand__:") ? bulkPaste.vacancyId.slice("__cand__:".length) : null;
    if (candidateTarget) {
      // One call → one vacancy (or extends source); no per-date spam.
      await pasteShiftsToCandidate(candidateTarget, dates);
    } else {
      await Promise.all(dates.map(async (dt, i) => {
        const item = clip.items[i % clip.items.length];
        if (item.start || item.finish) {
          await upsert(bulkPaste.vacancyId, bulkPaste.slot, dt, item.start, item.finish, false);
          await setShiftCandidate(bulkPaste.vacancyId, bulkPaste.slot, dt, item.candidateId);
        }
      }));
      await load();
      toast({ title: `Pasted across ${dates.length} day${dates.length === 1 ? "" : "s"}` });
    }
    setBulkPaste(null);
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
  useEffect(() => { deleteSelectionRef.current = deleteSelection; });

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
        clearSelectionRef.current(); setClipboard(null); return;
      }
      if (mod && (e.key === "a" || e.key === "A")) {
        e.preventDefault(); selectAllRef.current(); return;
      }
      if (!hasSel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); blurActive(); void deleteSelectionRef.current();
      } else if (mod && (e.key === "c" || e.key === "C")) {
        e.preventDefault(); collectClipRef.current("copy");
      } else if (mod && (e.key === "x" || e.key === "X")) {
        e.preventDefault(); collectClipRef.current("cut");
      } else if (mod && (e.key === "v" || e.key === "V")) {
        e.preventDefault(); void pasteClipRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
  const lastVisibleRow = displayRows[displayRows.length - 1] ?? null;

  // ----- Weekly stats: margin/earnings, hours, active workers, idle workers -----
  const stats = useMemo(() => {
    let totalHours = 0;
    let totalMargin = 0;
    let totalCharge = 0;
    let totalEarnings = 0;
    let currency = "GBP";
    const workersWithShifts = new Set<string>();
    const allAssignedWorkers = new Set<string>();
    const weekKeys = new Set(weekDates.map(ymd));

    if (rowMode === "candidate") {
      candidateRowsData.forEach((row) => {
        allAssignedWorkers.add(row.info.id);
        row.shifts.forEach(({ vacancy: v, shift: s, date }) => {
          if (!weekKeys.has(date)) return;
          if (v.pay_currency) currency = v.pay_currency;
          const pay = Number(v.pay_max ?? v.pay_min ?? 0);
          const charge = Number(v.charge_rate ?? 0);
          const paye = Number(v.paye_rate_percent ?? 21);
          const costPerHour = pay + pay * (paye / 100);
          const marginPerHour = charge - costPerHour;
          const startStr = (s.start_time ?? v.start_time ?? "").slice(0, 5);
          const finishStr = (s.finish_time ?? v.finish_time ?? "").slice(0, 5);
          if (!startStr || !finishStr) return;
          const [sh, sm] = startStr.split(":").map(Number);
          const [fh, fm] = finishStr.split(":").map(Number);
          let mins = (fh * 60 + fm) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60;
          const hours = mins / 60;
          totalHours += hours;
          totalCharge += hours * charge;
          totalMargin += hours * marginPerHour;
          totalEarnings += hours * pay;
          workersWithShifts.add(row.info.id);
        });
      });
    } else {
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
          if (mins < 0) mins += 24 * 60;
          const hours = mins / 60;
          slotHoursThisWeek += hours;
        });

        if (slotHoursThisWeek > 0) {
          slotAssignments.forEach((a) => workersWithShifts.add(a.candidate_id));
        }
        totalHours += slotHoursThisWeek;
        totalCharge += slotHoursThisWeek * charge;
        totalMargin += slotHoursThisWeek * marginPerHour;
        // For candidate viewer: only include slots they're actually assigned to
        const isMine = !candidateFilter || slotAssignments.some((a) => a.candidate_id === candidateFilter.id);
        if (isMine) totalEarnings += slotHoursThisWeek * pay;
      });
    }

    const idleWorkers = Array.from(allAssignedWorkers).filter((id) => !workersWithShifts.has(id));
    return {
      totalHours, totalMargin, totalCharge, totalEarnings, currency,
      activeWorkers: workersWithShifts.size,
      idleWorkers: idleWorkers.length,
    };
  }, [rowMode, candidateRowsData, displayRows, weekDates, resolveCell, candidateFilter]);

  const fmtMoney = (n: number) => {
    const symbol = stats.currency === "GBP" ? "£" : stats.currency;
    return `${symbol} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="rounded-md border bg-card select-none outline-none [&_*]:outline-none" ref={gridRef}>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-px border-b bg-border md:grid-cols-4">
        {viewerMode === "candidate" ? (
          <>
            <StatTile label="My earnings (week)" value={fmtMoney(stats.totalEarnings)} accent="good" sub="Based on your assigned shifts" />
            <StatTile label="My hours (week)" value={stats.totalHours.toFixed(1)} />
            <StatTile label="Shifts this week" value={String(stats.activeWorkers > 0 ? stats.activeWorkers : "—")} sub="Days you're working" />
            <StatTile label="Avg / hour" value={stats.totalHours > 0 ? fmtMoney(stats.totalEarnings / stats.totalHours) : "—"} />
          </>
        ) : (
          <>
            <StatTile label="Total margin (week)" value={fmtMoney(stats.totalMargin)} accent={stats.totalMargin >= 0 ? "good" : "bad"} sub={`Charge: ${fmtMoney(stats.totalCharge)}`} />
            <StatTile label="Total hours (week)" value={stats.totalHours.toFixed(1)} />
            <StatTile label="Workers scheduled" value={String(stats.activeWorkers)} />
            <StatTile label="Idle workers" value={String(stats.idleWorkers)} accent={stats.idleWorkers > 0 ? "warn" : undefined} sub="Assigned but no shifts this week" />
          </>
        )}
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
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
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: "pan-x pan-y" }}>
        <div style={{ minWidth: `${minGridW}px` }}>
          {/* Header row */}
          <div className="grid sticky top-0 z-20" style={{ gridTemplateColumns: gridTemplate }}>
            {!hideFirstColumn && (
              <div className="sticky left-0 z-30 border-b border-r bg-muted flex items-stretch relative">
                <button
                  type="button"
                  onClick={() => toggleSort("title")}
                  className="flex-1 px-2 py-2 text-left text-[11px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  {rowMode === "candidate" ? "Candidate" : "Job"}{sortArrow("title")}
                </button>
                {rowMode === "candidate" && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    title="Drag to resize column"
                    onPointerDown={onResizeStart}
                    onPointerMove={onResizeMove}
                    onPointerUp={onResizeEnd}
                    onPointerCancel={onResizeEnd}
                    onDoubleClick={() => { setCandidateFirstColW(defaultCandidateColW); try { window.localStorage.removeItem("pix.shiftGrid.candidateColW"); } catch {} }}
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-primary/30 active:bg-primary/50"
                  />
                )}
              </div>
            )}
            {!hideFirstColumn && rowMode !== "candidate" && (
              <button
                type="button"
                onClick={() => toggleSort("client")}
                className="sticky z-30 border-b border-r bg-muted px-2 py-2 text-left text-[11px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                style={{ left: `${jobColW}px` }}
              >
                {secondColumn === "candidate" ? "Candidate" : "Client"}{sortArrow("client")}
              </button>
            )}
            {weekDates.map((d, i) => {
              const isToday = ymd(d) === todayKey;
              const dow = DOW_DISPLAY[(new Date(ymd(d) + "T00:00:00").getDay() + 6) % 7];
              return (
                <div key={i} className={`border-b border-r px-2 py-2 text-center bg-muted ${isToday ? "bg-primary/10" : ""}`}>
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">{dow}</div>
                  <div className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
                    {d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vacancy rows */}
          {!hideFirstColumn && rowMode === "vacancy" && vacancies.length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">No vacancies match the current filters.</div>
          )}
          {rowMode === "candidate" && candidateRowsData.length === 0 && (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">No candidates have assigned shifts in this range.</div>
          )}
          {rowMode === "candidate" && candidateRowsData.map((row, rowIdx) => {
            const rowBg = rowIdx % 2 === 0 ? "bg-card" : "bg-background";
            // hours total for this candidate this week (display only)
            const weekKeys = new Set(weekDates.map(ymd));
            let rowHours = 0;
            row.shifts.forEach(({ vacancy: v, shift: s, date }) => {
              if (!weekKeys.has(date)) return;
              const startStr = (s.start_time ?? v.start_time ?? "").slice(0, 5);
              const finishStr = (s.finish_time ?? v.finish_time ?? "").slice(0, 5);
              if (!startStr || !finishStr) return;
              const [sh, sm] = startStr.split(":").map(Number);
              const [fh, fm] = finishStr.split(":").map(Number);
              let mins = (fh * 60 + fm) - (sh * 60 + sm);
              if (mins < 0) mins += 24 * 60;
              rowHours += mins / 60;
            });
            return (
              <div key={row.info.id} className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                {/* Candidate (frozen) */}
                {!hideFirstColumn && (
                  <div
                    className={`sticky left-0 z-10 border-b border-r ${rowBg} px-2 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]`}
                  >
                    <div
                      className={onCandidateClick ? "cursor-pointer hover:opacity-80" : ""}
                      onClick={() => onCandidateClick?.(row.info.id)}
                    >
                      <div className="text-sm font-semibold leading-tight truncate">{row.info.full_name}</div>
                      {row.info.headline && <div className="text-[10px] text-muted-foreground line-clamp-1">{row.info.headline}</div>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{row.shifts.filter((x) => weekKeys.has(x.date)).length} shift{row.shifts.filter((x) => weekKeys.has(x.date)).length === 1 ? "" : "s"} · {rowHours.toFixed(1)}h</span>
                      {row.info.status && <Badge variant="outline" className="text-[9px] h-4 px-1">{row.info.status}</Badge>}
                    </div>
                    {(row.info.email || row.info.phone) && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        {row.info.email && (
                          <ContactLink kind="email" value={row.info.email} />
                        )}
                        {row.info.phone && (
                          <ContactLink kind="phone" value={row.info.phone} />
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Day cells: chips per assigned shift on that date */}
                {weekDates.map((d, dIdx) => {
                  const dk = ymd(d);
                  const isToday = dk === todayKey;
                  const dayShifts = row.shifts.filter((x) => x.date === dk);
                  return (
                    <ContextMenu key={dIdx}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={`relative border-b border-r p-1 min-h-[78px] ${isToday ? "bg-primary/5" : rowBg}`}
                        >
                          {dayShifts.length === 0 ? (
                            <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-border/40 text-[11px] text-muted-foreground/60">—</div>
                          ) : (
                            <div className="flex h-full w-full flex-col gap-1">
                              {dayShifts.map(({ vacancy: v, slot, shift: s }) => {
                                const startStr = (s.start_time ?? v.start_time ?? "").slice(0, 5);
                                const finishStr = (s.finish_time ?? v.finish_time ?? "").slice(0, 5);
                                const chipKey = cellKey(v.id, slot, dk);
                                const isChipSelected = selected.has(chipKey);
                                const isChipClip = clipboard?.sourceKeys.includes(chipKey) ?? false;
                                return (
                                  <ContextMenu key={`${v.id}#${slot}`}>
                                    <ContextMenuTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const fakeIdx = dIdx;
                                          if (e.shiftKey) {
                                            rangeSelectCandidate(row.info.id, fakeIdx);
                                          } else if (e.ctrlKey || e.metaKey) {
                                            setSelected((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(chipKey)) next.delete(chipKey); else next.add(chipKey);
                                              selectedRef.current = next;
                                              return next;
                                            });
                                            setLastSelected({ vacancyId: row.info.id, slot: -1, dateIdx: fakeIdx });
                                          } else {
                                            const next = new Set([chipKey]);
                                            selectedRef.current = next;
                                            setSelected(next);
                                            setLastSelected({ vacancyId: row.info.id, slot: -1, dateIdx: fakeIdx });
                                          }
                                          blurActive();
                                        }}
                                        onDoubleClick={(e) => { e.stopPropagation(); setJobDetails({ vacancy: v, shift: s, date: dk, slot }); }}
                                        title={`${v.title}${v.client?.name ? ` · ${v.client.name}` : ""}\n${to12h(startStr)} – ${to12h(finishStr)}\nDouble-click for full details · Right-click for copy/cut/delete`}
                                        className={`flex w-full flex-col items-start gap-0.5 rounded border border-primary/30 bg-primary/5 px-1.5 py-1 text-left hover:bg-primary/10 ${isChipSelected ? "ring-2 ring-primary ring-inset" : ""} ${isChipClip ? (clipboard?.mode === "cut" ? "outline-dashed outline-2 outline-destructive/60" : "outline-dashed outline-2 outline-primary/60") : ""}`}
                                      >
                                        <div className="text-[11px] font-semibold leading-tight truncate w-full">{v.title}</div>
                                        <div className="text-[10px] leading-tight text-muted-foreground truncate w-full">
                                          {to12h(startStr)}{finishStr ? ` – ${to12h(finishStr)}` : ""}
                                        </div>
                                        {v.client?.name && (
                                          <div className="text-[9px] leading-tight text-muted-foreground/80 truncate w-full">{v.client.name}</div>
                                        )}
                                      </button>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="w-48">
                                      <ContextMenuItem onSelect={() => {
                                        const next = new Set([chipKey]);
                                        selectedRef.current = next; setSelected(next);
                                        setTimeout(() => collectClip("copy"), 0);
                                      }}>
                                        <Copy className="h-3.5 w-3.5 mr-2" />Copy shift
                                      </ContextMenuItem>
                                      <ContextMenuItem onSelect={() => {
                                        const next = new Set([chipKey]);
                                        selectedRef.current = next; setSelected(next);
                                        setTimeout(() => collectClip("cut"), 0);
                                      }}>
                                        <Clipboard className="h-3.5 w-3.5 mr-2" />Cut shift
                                      </ContextMenuItem>
                                      <ContextMenuItem onSelect={() => onEdit(v)}>
                                        Open job
                                      </ContextMenuItem>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        onSelect={async () => { await removeShift(v.id, slot, dk); await load(); }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />Delete shift
                                      </ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
                        <ContextMenuItem
                          onSelect={() => void pasteToCandidateCell(row.info.id, dk)}
                          disabled={!clipboard}
                        >
                          <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                          Paste shift here{clipboard ? ` (${clipboard.items.length})` : ""}
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => setBulkPaste({ vacancyId: `__cand__:${row.info.id}`, slot: 0, date: dk })}
                          disabled={!clipboard}
                        >
                          <ClipboardPaste className="h-3.5 w-3.5 mr-2" />
                          Bulk paste from here…
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            );
          })}
          {rowMode === "vacancy" && (
            <>
            {displayRows.map(({ vacancy: v, slot, total }, rowIdx) => {
              const rowBg = rowIdx % 2 === 0 ? "bg-card" : "bg-background";
              const rowKey = `${v.id}#${slot}`;
              return (
                <div key={rowKey} className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                  {/* Job (frozen) — right-click for vacancy copy/paste */}
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div className={`sticky left-0 z-10 border-b border-r ${rowBg} px-2 py-2`} onDoubleClick={() => onEdit(v)}>
                        <div className="flex items-center gap-1">
                          <div className="text-sm font-semibold leading-tight flex-1">{v.title}</div>
                          {total > 1 && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">#{slot + 1}</Badge>
                          )}
                        </div>
                        {v.reference && <div className="text-[10px] text-muted-foreground">Ref {v.reference}</div>}
                        <div className="mt-1">
                          {(v.pay_min || v.pay_max) && (
                            <span className="text-[10px] text-muted-foreground">
                              Pay {(v.pay_currency ?? "GBP") === "GBP" ? "£" : (v.pay_currency ?? "GBP")} {v.pay_min ?? "?"}–{v.pay_max ?? "?"}/{v.pay_period ?? "hr"}
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
                              Charge {(v.pay_currency ?? "GBP") === "GBP" ? "£" : (v.pay_currency ?? "GBP")} {charge.toFixed(2)} · Margin {m.toFixed(2)} ({pct.toFixed(0)}%)
                            </div>
                          );
                        })()}
                        <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
                          {(() => {
                            // Per-slot status: a slot is "filled" only if every active day in the vacancy's
                            // date window has an assignee. Any unassigned active day => "open".
                            let status: string = v.status;
                            if (v.start_date && v.end_date) {
                              const start = new Date(v.start_date + "T00:00:00");
                              const end = new Date(v.end_date + "T00:00:00");
                              let anyActive = false;
                              let allAssigned = true;
                              const MAX_DAYS_CHECK = 400;
                              let n = 0;
                              for (let d = new Date(start); d <= end && n < MAX_DAYS_CHECK; d.setDate(d.getDate() + 1), n++) {
                                const dk = ymd(d);
                                const cell = resolveCell(v.id, slot, dk);
                                if (!cell.active) continue;
                                anyActive = true;
                                if (!cell.assignee) { allAssigned = false; break; }
                              }
                              if (v.status !== "closed" && v.status !== "draft") {
                                status = anyActive && allAssigned ? "filled" : "open";
                              }
                            }
                            return (
                              <Badge variant={status === "open" ? "destructive" : status === "filled" ? "secondary" : "outline"} className="text-[9px] h-4 px-1">{status}</Badge>
                            );
                          })()}
                          <button
                            onClick={() => {
                              if (total > 1) {
                                // Multiple openings on this vacancy → remove only THIS opening,
                                // never the whole vacancy. Other openings (and other vacancies
                                // for the same client) stay untouched.
                                void bumpOpenings(v, -1, slot);
                              } else {
                                // Last remaining opening → confirm + delete the whole vacancy.
                                onDelete(v.id);
                              }
                            }}
                            title={total > 1 ? `Remove opening #${slot + 1} (vacancy stays)` : "Delete this vacancy"}
                            className="ml-auto text-[10px] text-destructive hover:underline inline-flex items-center gap-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
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
                  {/* Second sticky column: Client OR Candidate */}
                  {secondColumn === "candidate" ? (() => {
                    const cid = slotAssignedCandidateId(v, slot);
                    const cinfo = cid ? candidateLookup.get(cid) : null;
                    const name = cinfo?.full_name
                      ?? (v.assignments ?? []).find((a) => Number(a.slot_index ?? 0) === slot)?.candidate?.full_name
                      ?? null;
                    return (
                      <div
                        className={`sticky z-10 border-b border-r ${rowBg} px-2 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] ${cid && onCandidateClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
                        style={{ left: `${jobColW}px` }}
                        onClick={() => { if (cid && onCandidateClick) onCandidateClick(cid); }}
                      >
                        {name ? (
                          <>
                            <div className="text-sm font-medium truncate">{name}</div>
                            {cinfo?.headline && <div className="text-[10px] text-muted-foreground line-clamp-1">{cinfo.headline}</div>}
                            {cinfo?.email && <div className="text-[10px] text-muted-foreground truncate">{cinfo.email}</div>}
                            {cinfo?.phone && <div className="text-[10px] text-muted-foreground truncate">{cinfo.phone}</div>}
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground italic">Unassigned</div>
                        )}
                      </div>
                    );
                  })() : (
                    <div className={`sticky z-10 border-b border-r ${rowBg} px-2 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]`} style={{ left: `${jobColW}px` }}>
                      <div className="text-sm">{v.client?.name ?? "—"}</div>
                      {v.location && <div className="text-[10px] text-muted-foreground line-clamp-2">{v.location}</div>}
                    </div>
                  )}
                  {/* Day cells (per slot) */}
                  {weekDates.map((d, dIdx) => {
                    const dk = ymd(d);
                    const cell = resolveCell(v.id, slot, dk);
                    const isToday = dk === todayKey;
                    const isSelected = selected.has(cellKey(v.id, slot, dk));
                    const isClipSource = clipboard?.sourceKeys.includes(cellKey(v.id, slot, dk)) ?? false;
                    // Candidate picker options = everyone, with already-attached vacancy candidates first.
                    const candidateOptionsMap = new Map<string, string>();
                    (v.assignments ?? []).forEach((a) => {
                      if (["shortlisted","submitted","interviewing","offer","placed"].includes(a.stage)) {
                        candidateOptionsMap.set(a.candidate.id, a.candidate.full_name);
                      }
                    });
                    candidates.forEach((c) => {
                      if (!candidateOptionsMap.has(c.id)) candidateOptionsMap.set(c.id, c.full_name);
                    });
                    const candidateOptions = Array.from(candidateOptionsMap, ([id, name]) => ({ id, name }));
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
                        assignee={cell.assignee}
                        overridden={cell.overridden}
                        candidateOptions={candidateOptions}
                        defaultStart={v.start_time?.slice(0, 5) ?? "09:00"}
                        defaultFinish={v.finish_time?.slice(0, 5) ?? "17:00"}
                        isSelected={isSelected}
                        isClipSource={isClipSource}
                        clipMode={clipboard?.mode ?? null}
                        vacancyId={v.id}
                        vacancyTitle={v.title}
                        showFindCandidates={viewerMode === "admin"}
                        onClick={(e) => {
                          if (e.shiftKey) rangeSelect(v.id, slot, dIdx);
                          else if (e.ctrlKey || e.metaKey) toggleSelect(v.id, slot, dIdx);
                          else selectSingle(v.id, slot, dIdx);
                        }}
                        onDoubleClickEdit={true}
                        onSave={async (st, fi, candidateChoice) => {
                          const isNewManualShift = !cell.active || cell.cancelled;
                          await upsert(v.id, slot, dk, st, fi, false);
                          if (candidateChoice !== undefined) {
                            await setShiftCandidate(v.id, slot, dk, candidateChoice);
                          } else if (isNewManualShift) {
                            await setShiftCandidate(v.id, slot, dk, null);
                          }
                          await load();
                        }}
                        onContextDelete={async () => { await removeShift(v.id, slot, dk); await load(); }}
                        onContextCopy={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => collectClip("copy"), 0); }}
                        onContextCut={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => collectClip("cut"), 0); }}
                        onContextPaste={() => { if (!isSelected) selectSingle(v.id, slot, dIdx); setTimeout(() => pasteClip(), 0); }}
                        onContextAdd={async () => {
                          await upsert(v.id, slot, dk, v.start_time?.slice(0, 5) ?? "09:00", v.finish_time?.slice(0, 5) ?? "17:00", false);
                          await setShiftCandidate(v.id, slot, dk, null);
                          await load();
                        }}
                        onContextBulkPaste={() => setBulkPaste({ vacancyId: v.id, slot, date: dk })}
                        clipboardHasItems={!!clipboard}

                      />
                    );
                  })}
                </div>
              );
            })}
            {/* Trailing empty placeholder row — always available for quick vacancy actions */}
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="sticky left-0 z-10 border-b border-r bg-card px-2 py-3 min-h-[78px] flex items-center justify-center text-[11px] text-muted-foreground/70 italic">
                    Right-click for vacancy actions
                  </div>
                  <div className="sticky z-10 border-b border-r bg-card shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]" style={{ left: `${jobColW}px` }} />
                  {weekDates.map((_, i) => (
                    <div key={i} className="border-b border-r bg-background" />
                  ))}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-56">
                <ContextMenuItem onSelect={() => onCreate?.()} disabled={!onCreate}>
                  <Plus className="h-3.5 w-3.5 mr-2" />Create vacancy
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => lastVisibleRow && bumpOpenings(lastVisibleRow.vacancy, 1, lastVisibleRow.slot)}
                  disabled={!lastVisibleRow}
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />Repeat vacancy above
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

      {/* Job details dialog (opened from chip double-click in candidate-row mode) */}
      <Dialog open={!!jobDetails} onOpenChange={(o) => { if (!o) setJobDetails(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {jobDetails && (() => {
            const v = jobDetails.vacancy;
            const s = jobDetails.shift;
            const startStr = (s.start_time ?? v.start_time ?? "").slice(0, 5);
            const finishStr = (s.finish_time ?? v.finish_time ?? "").slice(0, 5);
            const dateLabel = new Date(jobDetails.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            const payRate = v.pay_min ?? v.pay_max ?? null;
            const currency = v.pay_currency ?? "GBP";
            const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : `${currency} `;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base">{v.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Shift</div>
                    <div className="font-medium">{dateLabel}</div>
                    <div className="text-muted-foreground">{to12h(startStr)}{finishStr ? ` – ${to12h(finishStr)}` : ""}</div>
                    {s.cancelled && <Badge variant="destructive" className="mt-1">Cancelled</Badge>}
                  </div>

                  {v.client?.name && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Client</div>
                      <div>{v.client.name}</div>
                    </div>
                  )}

                  {v.location && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Job site / Location</div>
                      <div className="whitespace-pre-wrap">{v.location}</div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Open in Google Maps ↗
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {v.reference && (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Reference</div>
                        <div>{v.reference}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                      <Badge variant="outline">{v.status}</Badge>
                    </div>
                    {payRate != null && viewerMode === "candidate" && (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Pay</div>
                        <div>{symbol}{payRate}{v.pay_period ? ` / ${v.pay_period}` : ""}</div>
                      </div>
                    )}
                    {(v.start_date || v.end_date) && (
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Assignment dates</div>
                        <div>{v.start_date ?? "—"}{v.end_date ? ` → ${v.end_date}` : ""}</div>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Shift notes</div>
                      <div className="whitespace-pre-wrap">{s.notes}</div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setJobDetails(null)}>Close</Button>
                  {viewerMode === "admin" && (
                    <Button onClick={() => { const vv = jobDetails.vacancy; setJobDetails(null); onEdit(vv); }}>Open / Edit job</Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CandidateOption = { id: string; name: string };
const ASSIGNEE_NONE = "__none__";

function Cell(props: {
  date: Date;
  rowBg: string;
  isToday: boolean;
  active: boolean;
  cancelled: boolean;
  start: string | null;
  finish: string | null;
  assignee: { id: string; name: string } | null;
  overridden: boolean;
  candidateOptions: CandidateOption[];
  defaultStart: string;
  defaultFinish: string;
  isSelected: boolean;
  isClipSource: boolean;
  clipMode: "copy" | "cut" | null;
  vacancyId?: string;
  vacancyTitle?: string;
  showFindCandidates?: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClickEdit: boolean;
  // candidateChoice: undefined = leave assignment alone; null = explicitly unassign; string id = assign that candidate
  onSave: (start: string, finish: string, candidateChoice?: string | null) => Promise<void> | void;
  onContextDelete: () => void;
  onContextCopy: () => void;
  onContextCut: () => void;
  onContextPaste: () => void;
  onContextAdd: () => void;
  onContextBulkPaste: () => void;
  clipboardHasItems: boolean;
}) {
  const { date, rowBg, isToday, active, cancelled, start, finish, assignee, overridden, candidateOptions,
    defaultStart, defaultFinish, isSelected, isClipSource, clipMode, vacancyId, vacancyTitle, showFindCandidates,
    onClick, onDoubleClickEdit, onSave, onContextDelete, onContextCopy, onContextCut, onContextPaste, onContextAdd, onContextBulkPaste, clipboardHasItems } = props;

  const [findOpen, setFindOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [st, setSt] = useState(start ?? defaultStart);
  const [fi, setFi] = useState(finish ?? defaultFinish);
  const initialAssigneeValue = assignee ? assignee.id : ASSIGNEE_NONE;
  const [assigneeValue, setAssigneeValue] = useState<string>(initialAssigneeValue);
  const assigneeId = assignee?.id ?? null;
  const syncEditorValues = useCallback(() => {
    setSt(start ?? defaultStart);
    setFi(finish ?? defaultFinish);
    setAssigneeValue(assigneeId ?? ASSIGNEE_NONE);
  }, [start, finish, defaultStart, defaultFinish, active, overridden, assigneeId]);

  useEffect(() => {
    if (!editOpen) syncEditorValues();
  }, [syncEditorValues, editOpen]);

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
        {assignee ? (
          <div className="mt-0.5 flex items-center gap-1 max-w-full">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] font-semibold text-primary">
              {initials(assignee.name)}
            </span>
            <span className="truncate text-[10px] text-foreground/80">{assignee.name}</span>
          </div>
        ) : overridden ? (
          <div className="mt-0.5 text-[9px] italic text-muted-foreground">unassigned</div>
        ) : null}
      </div>
    );
  }

  const handleSave = async () => {
    let choice: string | null | undefined;
    if (assigneeValue === ASSIGNEE_NONE) choice = null;
    else choice = assigneeValue;
    await onSave(st, fi, choice);
    setEditOpen(false);
  };


  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="gridcell"
          tabIndex={-1}
          aria-selected={isSelected}
          onClick={onClick}
          onDoubleClick={() => { if (onDoubleClickEdit) { syncEditorValues(); setEditOpen(true); } }}
          className={`relative cursor-pointer select-none border-b border-r ${todayTint} p-1 min-h-[78px] outline-none focus:outline-none focus-visible:outline-none ${selectionRing} ${clipBorder}`}
        >
          {inner}
          <Popover open={editOpen} onOpenChange={(open) => { if (open) syncEditorValues(); setEditOpen(open); }}>
            <PopoverTrigger asChild>
              <span className="absolute inset-0 pointer-events-none" />
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-3" align="center">
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
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">Assigned to (this day only)</div>
                <Select value={assigneeValue} onValueChange={setAssigneeValue}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ASSIGNEE_NONE}>— Unassigned —</SelectItem>
                    {candidateOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {candidateOptions.length === 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">No one shortlisted for this job yet — use "Assign" on the job to add candidates first.</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSave}>Save</Button>
                {showFindCandidates && vacancyId && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setFindOpen(true)} title="Search and invite candidates">
                    <Sparkles className="h-3.5 w-3.5" />Find
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {showFindCandidates && vacancyId && (
            <Dialog open={findOpen} onOpenChange={setFindOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Find & invite candidates{vacancyTitle ? ` — ${vacancyTitle}` : ""}</DialogTitle>
                </DialogHeader>
                <AIRecommendationsPanel vacancyId={vacancyId} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {!active && !cancelled && <ContextMenuItem onSelect={onContextAdd}>Add shift</ContextMenuItem>}
        <ContextMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => { syncEditorValues(); setEditOpen(true); }, 50); }}>Edit shift…</ContextMenuItem>
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

function ContactLink({ kind, value }: { kind: "email" | "phone"; value: string }) {
  const href = kind === "email" ? `mailto:${value}` : `tel:${value.replace(/\s+/g, "")}`;
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Copied", description: value });
    } catch {
      window.location.href = href;
    }
  };
  return (
    <a
      href={href}
      onClick={(e) => { e.stopPropagation(); }}
      onContextMenu={copy}
      onDoubleClick={copy}
      title={`${value} — click to ${kind === "email" ? "email" : "call"}, double-click or right-click to copy`}
      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline truncate"
    >
      {value}
    </a>
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
