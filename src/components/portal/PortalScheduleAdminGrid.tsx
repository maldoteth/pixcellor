import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clipboard, Copy, ClipboardPaste, Trash2, Loader2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type Vacancy = {
  id: string;
  title: string;
  start_time: string | null;
  finish_time: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  client?: { id: string; name: string } | null;
  assignments?: Array<{ candidate_id: string; slot_index: number; stage: string }>;
};
type Shift = {
  id: string;
  shift_date: string;
  slot_index: number;
  start_time: string | null;
  finish_time: string | null;
  cancelled: boolean;
  candidate_id: string | null;
  assignment_overridden: boolean;
};
type Availability = {
  id: string;
  candidate_id: string;
  avail_date: string;
  status: "available" | "unavailable" | "tentative";
  start_time: string | null;
  finish_time: string | null;
  note: string | null;
};

const DOW_DISPLAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); const offset = day === 0 ? -6 : 1 - day;
  return addDays(x, offset);
}
function to12h(t?: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":"); let hi = parseInt(h, 10);
  if (isNaN(hi)) return t;
  const p = hi >= 12 ? "pm" : "am"; hi = hi % 12 || 12;
  return `${hi}:${(m ?? "00").slice(0, 2)}${p}`;
}

const STATUS_LABEL: Record<Availability["status"], string> = {
  available: "Available",
  unavailable: "Unavailable",
  tentative: "Tentative",
};

const STATUS_STYLE: Record<Availability["status"], string> = {
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  unavailable: "border-destructive/40 bg-destructive/10 text-destructive",
  tentative: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
};

type ClipAvail = { status: Availability["status"]; start_time: string | null; finish_time: string | null; note: string | null };

export default function PortalScheduleAdminGrid({ myCandidateId, onNeedRegister }: { myCandidateId?: string | null; onNeedRegister?: () => void }) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [daysShown, setDaysShown] = useState<number>(isMobile ? 7 : 14);
  const MAX_DAYS = 28;
  const dayMinW = isMobile ? 88 : 140;

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [shifts, setShifts] = useState<Record<string, Record<number, Record<string, Shift>>>>({});
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [loading, setLoading] = useState(false);
  const [clip, setClip] = useState<ClipAvail | null>(null);

  const weekDates = useMemo(() => Array.from({ length: daysShown }, (_, i) => addDays(weekStart, i)), [weekStart, daysShown]);
  const fromKey = ymd(weekStart);
  const toKey = ymd(weekDates[weekDates.length - 1]);
  const todayKey = ymd(new Date());

  const loadVacancies = useCallback(async () => {
    const { data, error } = await supabase.rpc("portal_my_vacancies_full" as never);
    if (error) { toast({ title: "Could not load schedule", description: error.message, variant: "destructive" }); return; }
    setVacancies((data as Vacancy[] | null) ?? []);
  }, [toast]);

  const loadShifts = useCallback(async (vs: Vacancy[]) => {
    if (vs.length === 0) { setShifts({}); return; }
    const results = await Promise.all(
      vs.map((v) => supabase.rpc("portal_list_vacancy_shifts" as never, { _vacancy_id: v.id, _from: fromKey, _to: toKey } as never)),
    );
    const map: Record<string, Record<number, Record<string, Shift>>> = {};
    vs.forEach((v, i) => {
      const rows = ((results[i].data as Shift[] | null) ?? []);
      const m: Record<number, Record<string, Shift>> = {};
      rows.forEach((s) => {
        const slot = Number(s.slot_index ?? 0);
        if (!m[slot]) m[slot] = {};
        m[slot][s.shift_date] = s;
      });
      map[v.id] = m;
    });
    setShifts(map);
  }, [fromKey, toKey]);

  const loadAvailability = useCallback(async () => {
    const { data, error } = await supabase.rpc("portal_my_availability" as never, { _from: fromKey, _to: toKey } as never);
    if (error) { return; }
    const m: Record<string, Availability> = {};
    ((data as Availability[] | null) ?? []).forEach((a) => { m[a.avail_date] = a; });
    setAvailability(m);
  }, [fromKey, toKey]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await loadVacancies();
      await loadAvailability();
    } finally { setLoading(false); }
  }, [loadVacancies, loadAvailability]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { void loadShifts(vacancies); }, [vacancies, loadShifts]);
  useEffect(() => { void loadAvailability(); }, [loadAvailability]);

  // Booked shifts per date that belong to me
  const bookedByDate = useMemo(() => {
    const m: Record<string, Array<{ vacancy: Vacancy; shift: Shift }>> = {};
    vacancies.forEach((v) => {
      const bySlot = shifts[v.id] ?? {};
      Object.values(bySlot).forEach((byDate) => {
        Object.values(byDate).forEach((s) => {
          if (!s || s.cancelled) return;
          if (!s.assignment_overridden || !s.candidate_id) return;
          if (myCandidateId && s.candidate_id !== myCandidateId) return;
          if (!m[s.shift_date]) m[s.shift_date] = [];
          m[s.shift_date].push({ vacancy: v, shift: s });
        });
      });
    });
    return m;
  }, [vacancies, shifts, myCandidateId]);

  // Editor dialog
  const [editor, setEditor] = useState<{ date: string; status: Availability["status"]; start: string; finish: string; note: string } | null>(null);

  const openEditor = (date: string) => {
    if (!myCandidateId) { onNeedRegister?.(); return; }
    const a = availability[date];
    setEditor({
      date,
      status: a?.status ?? "available",
      start: a?.start_time ? a.start_time.slice(0, 5) : "",
      finish: a?.finish_time ? a.finish_time.slice(0, 5) : "",
      note: a?.note ?? "",
    });
  };

  const saveAvailability = async () => {
    if (!editor) return;
    const { error } = await supabase.rpc("portal_set_availability" as never, {
      _date: editor.date,
      _status: editor.status,
      _start: editor.start || null,
      _finish: editor.finish || null,
      _note: editor.note?.trim() || null,
    } as never);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    setEditor(null);
    await loadAvailability();
    toast({ title: "Availability updated" });
  };

  const deleteAvailability = async (date: string) => {
    const { error } = await supabase.rpc("portal_delete_availability" as never, { _date: date } as never);
    if (error) { toast({ title: "Could not delete", description: error.message, variant: "destructive" }); return; }
    await loadAvailability();
  };

  const pasteAvailability = async (date: string) => {
    if (!clip) return;
    if (!myCandidateId) { onNeedRegister?.(); return; }
    const { error } = await supabase.rpc("portal_set_availability" as never, {
      _date: date,
      _status: clip.status,
      _start: clip.start_time,
      _finish: clip.finish_time,
      _note: clip.note,
    } as never);
    if (error) { toast({ title: "Could not paste", description: error.message, variant: "destructive" }); return; }
    await loadAvailability();
  };

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDates[weekDates.length - 1].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
  const gridTemplate = `repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`;
  const minGridW = dayMinW * daysShown;

  return (
    <div className="rounded-md border bg-card select-none">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekStart((d) => addDays(d, -daysShown))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{weekLabel}</span>
          </div>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekStart((d) => addDays(d, daysShown))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setWeekStart(startOfWeek(new Date())); setDaysShown(isMobile ? 7 : 14); }}>Today</Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {clip && (
            <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-primary">
              <Clipboard className="h-3 w-3" />
              Copied: {STATUS_LABEL[clip.status]}
            </span>
          )}
          <span>{daysShown}d</span>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={daysShown >= MAX_DAYS} onClick={() => setDaysShown((n) => Math.min(MAX_DAYS, n + 7))}>+1 week</Button>
          {daysShown > 7 && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setDaysShown(7)}>Reset</Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: "pan-x pan-y" }}>
        <div style={{ minWidth: `${minGridW}px` }}>
          {/* Header */}
          <div className="grid sticky top-0 z-20" style={{ gridTemplateColumns: gridTemplate }}>
            {weekDates.map((d, i) => {
              const isToday = ymd(d) === todayKey;
              const dow = DOW_DISPLAY[(d.getDay() + 6) % 7];
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

          {/* Single candidate row */}
          <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
            {weekDates.map((d) => {
              const dk = ymd(d);
              const isToday = dk === todayKey;
              const bookings = bookedByDate[dk] ?? [];
              const a = availability[dk];
              return (
                <ContextMenu key={dk}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => openEditor(dk)}
                      className={`relative min-h-[90px] border-b border-r p-1 text-left transition hover:bg-muted/40 ${isToday ? "bg-primary/5" : "bg-background"}`}
                    >
                      <div className="flex h-full w-full flex-col gap-1">
                        {/* Booked shifts (read-only, click still opens availability) */}
                        {bookings.map(({ vacancy: v, shift: s }) => {
                          const startStr = (s.start_time ?? v.start_time ?? "").slice(0, 5);
                          const finishStr = (s.finish_time ?? v.finish_time ?? "").slice(0, 5);
                          return (
                            <div
                              key={s.id}
                              className="rounded border border-primary/40 bg-primary/10 px-1.5 py-1"
                              title={`${v.title}${v.client?.name ? ` · ${v.client.name}` : ""}\n${to12h(startStr)} – ${to12h(finishStr)}`}
                            >
                              <div className="text-[11px] font-semibold leading-tight truncate">{v.title}</div>
                              <div className="text-[10px] leading-tight text-muted-foreground truncate">
                                {to12h(startStr)}{finishStr ? ` – ${to12h(finishStr)}` : ""}
                              </div>
                              {v.client?.name && (
                                <div className="text-[9px] leading-tight text-muted-foreground/80 truncate">{v.client.name}</div>
                              )}
                            </div>
                          );
                        })}

                        {/* Availability chip */}
                        {a && (
                          <div className={`rounded border px-1.5 py-1 ${STATUS_STYLE[a.status]}`}>
                            <div className="text-[10px] font-semibold leading-tight">{STATUS_LABEL[a.status]}</div>
                            {(a.start_time || a.finish_time) && (
                              <div className="text-[10px] leading-tight opacity-80">
                                {to12h(a.start_time)}{a.finish_time ? ` – ${to12h(a.finish_time)}` : ""}
                              </div>
                            )}
                            {a.note && <div className="text-[9px] leading-tight opacity-80 truncate">{a.note}</div>}
                          </div>
                        )}

                        {/* Empty hint */}
                        {bookings.length === 0 && !a && (
                          <div className="flex h-full w-full flex-1 items-center justify-center rounded border border-dashed border-border/40 text-[10px] text-muted-foreground/60">
                            Request
                          </div>
                        )}
                      </div>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ContextMenuItem onSelect={() => openEditor(dk)}>
                      <CalendarDays className="h-3.5 w-3.5 mr-2" />Edit availability
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!a}
                      onSelect={() => a && setClip({ status: a.status, start_time: a.start_time, finish_time: a.finish_time, note: a.note })}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />Copy availability
                    </ContextMenuItem>
                    <ContextMenuItem
                      disabled={!clip}
                      onSelect={() => void pasteAvailability(dk)}
                    >
                      <ClipboardPaste className="h-3.5 w-3.5 mr-2" />Paste here
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      disabled={!a}
                      onSelect={() => void deleteAvailability(dk)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Clear
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editor && new Date(editor.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </DialogTitle>
          </DialogHeader>
          {editor && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Status</label>
                <Select value={editor.status} onValueChange={(v) => setEditor({ ...editor, status: v as Availability["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="tentative">Tentative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">From (optional)</label>
                  <Input type="time" value={editor.start} onChange={(e) => setEditor({ ...editor, start: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Until (optional)</label>
                  <Input type="time" value={editor.finish} onChange={(e) => setEditor({ ...editor, finish: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Note (optional)</label>
                <Textarea rows={2} value={editor.note} onChange={(e) => setEditor({ ...editor, note: e.target.value })} placeholder="e.g. mornings only" />
              </div>
              {availability[editor.date] && (
                <div className="flex items-center justify-between rounded border border-border/60 bg-muted/40 px-2 py-1.5 text-[11px]">
                  <span className="text-muted-foreground">Already set for this day</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-destructive hover:text-destructive"
                    onClick={async () => { await deleteAvailability(editor.date); setEditor(null); }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Clear
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button>
            <Button onClick={saveAvailability}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
