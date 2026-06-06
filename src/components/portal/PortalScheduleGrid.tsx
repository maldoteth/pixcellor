import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type ShiftRow = {
  id: string;
  vacancy_id: string;
  slot_index: number;
  shift_date: string;
  start_time: string | null;
  finish_time: string | null;
  cancelled: boolean;
  candidate_id: string | null;
  assignment_overridden: boolean;
  candidate_name: string | null;
  vacancy_title: string | null;
  client_name: string | null;
  viewer_role: "candidate" | "client";
};

const DOW_DISPLAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + n); return x;
}
function startOfWeek(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); const offset = day === 0 ? -6 : 1 - day;
  return addDays(x, offset);
}
function to12h(t?: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  let hi = parseInt(h, 10); if (isNaN(hi)) return t;
  const p = hi >= 12 ? "pm" : "am"; hi = hi % 12 || 12;
  return `${hi}:${(m ?? "00").slice(0, 2)}${p}`;
}

export default function PortalScheduleGrid({
  myCandidateId,
  onShiftAction,
}: {
  myCandidateId?: string | null;
  onShiftAction?: () => void;
}) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [daysShown, setDaysShown] = useState(isMobile ? 5 : 7);
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const weekDates = useMemo(() => Array.from({ length: daysShown }, (_, i) => addDays(weekStart, i)), [weekStart, daysShown]);
  const fromKey = ymd(weekStart);
  const toKey = ymd(weekDates[weekDates.length - 1]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("portal_my_shifts" as never, { _from: fromKey, _to: toKey } as never);
    setLoading(false);
    if (error) { toast({ title: "Could not load schedule", description: error.message, variant: "destructive" }); return; }
    setRows((data as ShiftRow[]) ?? []);
  }, [fromKey, toKey, toast]);

  useEffect(() => { void load(); }, [load]);

  // Group rows by vacancy + slot
  type RowKey = { vacancy_id: string; slot_index: number; title: string; client: string; viewer_role: "candidate" | "client" };
  const grouped = useMemo(() => {
    const map = new Map<string, { meta: RowKey; byDate: Record<string, ShiftRow> }>();
    rows.forEach((r) => {
      const k = `${r.vacancy_id}|${r.slot_index}`;
      if (!map.has(k)) map.set(k, {
        meta: { vacancy_id: r.vacancy_id, slot_index: r.slot_index, title: r.vacancy_title ?? "Vacancy", client: r.client_name ?? "", viewer_role: r.viewer_role },
        byDate: {},
      });
      map.get(k)!.byDate[r.shift_date] = r;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.meta.title.localeCompare(b.meta.title) || a.meta.slot_index - b.meta.slot_index,
    );
  }, [rows]);

  const respondShift = async (shift: ShiftRow, mode: "confirm" | "cancel") => {
    if (!myCandidateId) return;
    setBusyId(shift.id);
    // Confirm = mark assignment_overridden true with my candidate id. Cancel = mark cancelled true on shift.
    const patch = mode === "confirm"
      ? { _id: shift.id, _patch: { candidate_id: myCandidateId, assignment_overridden: true, cancelled: false } }
      : { _id: shift.id, _patch: { cancelled: true } };
    const { error } = await supabase.rpc("portal_update_shift_self" as never, patch as never);
    setBusyId(null);
    if (error) { toast({ title: "Action failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: mode === "confirm" ? "Shift confirmed" : "Shift cancelled" });
    await load();
    onShiftAction?.();
  };

  const jobColW = isMobile ? 110 : 220;
  const clientColW = isMobile ? 80 : 150;
  const dayMinW = isMobile ? 88 : 140;
  const gridTemplate = `${jobColW}px ${clientColW}px repeat(${daysShown}, minmax(${dayMinW}px, 1fr))`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, -daysShown))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" })} – {weekDates[weekDates.length - 1].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((w) => addDays(w, daysShown))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {[7, 14, 21, 28].map((n) => (
            <Button key={n} variant={daysShown === n ? "default" : "outline"} size="sm" onClick={() => setDaysShown(n)}>{n}d</Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/60">
        <div style={{ display: "grid", gridTemplateColumns: gridTemplate, minWidth: jobColW + clientColW + dayMinW * daysShown }}>
          {/* Header */}
          <div className="sticky left-0 z-10 border-b border-r border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase">Job</div>
          <div className="sticky border-b border-r border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase" style={{ left: jobColW }}>Client</div>
          {weekDates.map((d) => (
            <div key={d.toISOString()} className="border-b border-border/60 bg-muted/20 px-2 py-2 text-center text-[11px]">
              <div className="font-semibold uppercase">{DOW_DISPLAY[(d.getDay() + 6) % 7]}</div>
              <div className="text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</div>
            </div>
          ))}

          {/* Body */}
          {grouped.length === 0 && !loading && (
            <div className="col-span-full p-10 text-center text-sm text-muted-foreground" style={{ gridColumn: `1 / span ${daysShown + 2}` }}>
              <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No shifts in this range.
            </div>
          )}
          {grouped.map(({ meta, byDate }) => (
            <div key={`${meta.vacancy_id}|${meta.slot_index}`} className="contents">
              <div className="sticky left-0 z-10 border-b border-r border-border/60 bg-background px-3 py-2 text-xs">
                <div className="font-medium truncate">{meta.title}</div>
                <div className="text-[10px] text-muted-foreground">Slot {meta.slot_index + 1}</div>
              </div>
              <div className="sticky border-b border-r border-border/60 bg-background px-3 py-2 text-xs truncate" style={{ left: jobColW }}>
                {meta.client}
                <Badge variant="outline" className="ml-1 text-[9px]">{meta.viewer_role}</Badge>
              </div>
              {weekDates.map((d) => {
                const key = ymd(d);
                const s = byDate[key];
                const empty = !s;
                const cancelled = s?.cancelled;
                const isMine = s?.candidate_id && myCandidateId && s.candidate_id === myCandidateId;
                return (
                  <div key={key} className={`border-b border-border/60 px-1.5 py-1 text-[11px] ${empty ? "bg-muted/10" : cancelled ? "bg-muted/30" : isMine ? "bg-primary/10" : "bg-background"}`}>
                    {empty ? (
                      <div className="text-center text-muted-foreground/40">—</div>
                    ) : (
                      <div className="space-y-1">
                        <div className={`font-medium ${cancelled ? "line-through text-muted-foreground" : ""}`}>
                          {to12h(s.start_time)}–{to12h(s.finish_time)}
                        </div>
                        {s.candidate_name && (
                          <div className="truncate text-[10px] text-muted-foreground">{s.candidate_name}</div>
                        )}
                        {meta.viewer_role === "candidate" && myCandidateId && !cancelled && (
                          <div className="flex gap-1">
                            {!isMine && (
                              <Button size="sm" variant="default" className="h-5 px-1.5 text-[10px]" disabled={busyId === s.id} onClick={() => respondShift(s, "confirm")}>
                                Confirm
                              </Button>
                            )}
                            {isMine && (
                              <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px]" disabled={busyId === s.id} onClick={() => respondShift(s, "cancel")}>
                                Cancel
                              </Button>
                            )}
                          </div>
                        )}
                        {cancelled && <div className="text-[10px] text-destructive">Cancelled</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
