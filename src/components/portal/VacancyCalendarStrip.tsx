import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { X, Plus, Copy, Clipboard, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Shift = {
  id: string;
  shift_date: string;
  start_time: string | null;
  finish_time: string | null;
  cancelled: boolean;
  notes: string | null;
};

type Props = {
  vacancyId: string;
  scheduleDays: string[] | null;
  startTime: string | null;
  finishTime: string | null;
};

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAYS_AHEAD = 730; // ~2 years

function to12h(t?: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const m = (mStr ?? "00").slice(0, 2);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
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

export default function VacancyCalendarStrip({ vacancyId, scheduleDays, startTime, finishTime }: Props) {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [copySource, setCopySource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const start = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    return addDays(today, offsetToMonday);
  }, []);

  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) arr.push(addDays(start, i));
    return arr;
  }, [start]);

  const todayKey = ymd(new Date());
  const templateSet = new Set((scheduleDays ?? []).map((d) => d.slice(0, 3)));
  const tStart = startTime ? startTime.slice(0, 5) : null;
  const tFinish = finishTime ? finishTime.slice(0, 5) : null;

  const load = useCallback(async () => {
    setLoading(true);
    const from = ymd(start);
    const to = ymd(dates[dates.length - 1]);
    const { data, error } = await supabase.rpc("portal_list_vacancy_shifts" as never, {
      _vacancy_id: vacancyId, _from: from, _to: to,
    } as never);
    setLoading(false);
    if (error) return;
    const m: Record<string, Shift> = {};
    ((data as Shift[]) ?? []).forEach((s) => { m[s.shift_date] = s; });
    setShifts(m);
  }, [vacancyId, start, dates]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-key="${todayKey}"]`);
    if (el && scrollerRef.current) {
      scrollerRef.current.scrollLeft = Math.max(0, el.offsetLeft - 16);
    }
  }, [todayKey, dates.length]);

  const upsert = async (date: string, s: string | null, f: string | null, cancelled = false) => {
    const { error } = await supabase.rpc("portal_upsert_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date, _start: s, _finish: f, _cancelled: cancelled,
    } as never);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const remove = async (date: string) => {
    const { error } = await supabase.rpc("portal_delete_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _date: date,
    } as never);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  const pasteTo = async (target: string) => {
    if (!copySource) return;
    const { error } = await supabase.rpc("portal_copy_vacancy_shift" as never, {
      _vacancy_id: vacancyId, _source_date: copySource, _target_date: target,
    } as never);
    if (error) { toast({ title: "Copy failed", description: error.message, variant: "destructive" }); return; }
    setCopySource(null);
    await load();
  };

  const scrollBy = (delta: number) => scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">Schedule</span>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {copySource && (
            <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px]">
              Copying {new Date(copySource).toLocaleDateString()} — click any empty day to paste
              <button onClick={() => setCopySource(null)} className="ml-2 underline">cancel</button>
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => scrollBy(-560)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => scrollBy(560)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex gap-1 overflow-x-auto pb-2 scroll-smooth">
        {dates.map((d, idx) => {
          const key = ymd(d);
          const dowShort = DOW_SHORT[d.getDay()];
          const inTemplate = templateSet.has(dowShort);
          const shift = shifts[key];
          let active = false;
          let cancelled = false;
          let s: string | null = null;
          let f: string | null = null;
          if (shift) {
            if (shift.cancelled) cancelled = true;
            else { s = (shift.start_time ?? tStart)?.slice(0, 5) ?? null; f = (shift.finish_time ?? tFinish)?.slice(0, 5) ?? null; active = true; }
          } else if (inTemplate) {
            s = tStart; f = tFinish; active = true;
          }
          const isFirstOfMonth = d.getDate() === 1 || idx === 0;
          return (
            <div key={key} data-key={key} className="shrink-0">
              {isFirstOfMonth && (
                <div className="text-[10px] font-semibold uppercase text-muted-foreground pl-1 pb-0.5">
                  {d.toLocaleString(undefined, { month: "short", year: "numeric" })}
                </div>
              )}
              <DayCard
                date={d}
                dowShort={dowShort}
                active={active}
                cancelled={cancelled}
                start={s}
                finish={f}
                isToday={key === todayKey}
                isCopySource={copySource === key}
                copyMode={!!copySource}
                hasExplicit={!!shift}
                onAdd={() => upsert(key, tStart ?? "09:00", tFinish ?? "17:00", false)}
                onCancel={() => (shift ? remove(key) : upsert(key, null, null, true))}
                onSave={(st, fi) => upsert(key, st, fi, false)}
                onStartCopy={() => setCopySource(key)}
                onPaste={() => pasteTo(key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayCard(props: {
  date: Date;
  dowShort: string;
  active: boolean;
  cancelled: boolean;
  start: string | null;
  finish: string | null;
  isToday: boolean;
  isCopySource: boolean;
  copyMode: boolean;
  hasExplicit: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onSave: (start: string, finish: string) => void;
  onStartCopy: () => void;
  onPaste: () => void;
}) {
  const { date, dowShort, active, cancelled, start, finish, isToday, isCopySource, copyMode, onAdd, onCancel, onSave, onStartCopy, onPaste } = props;
  const [openEdit, setOpenEdit] = useState(false);
  const [st, setSt] = useState(start ?? "09:00");
  const [fi, setFi] = useState(finish ?? "17:00");
  useEffect(() => { setSt(start ?? "09:00"); setFi(finish ?? "17:00"); }, [start, finish]);

  const dateLabel = String(date.getDate());
  const ring = isToday ? "ring-1 ring-primary" : "";
  const W = "w-[76px]";

  if (cancelled) {
    return (
      <div className={`${W} h-[84px] rounded-md border border-dashed border-border/60 bg-muted/20 px-1.5 py-1 text-center ${ring} relative`}>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{dowShort}</div>
        <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
        <div className="mt-2 text-[10px] text-destructive line-through">Off</div>
        <button
          aria-label="Restore"
          onClick={onAdd}
          className="absolute right-0.5 top-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!active) {
    return (
      <button
        type="button"
        onClick={copyMode ? onPaste : onAdd}
        className={`${W} h-[84px] rounded-md border border-dashed border-border/40 bg-muted/10 px-1.5 py-1 text-center hover:bg-muted/30 transition-colors ${ring} flex flex-col items-center`}
      >
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{dowShort}</div>
        <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
        <div className="mt-2 flex items-center justify-center">
          {copyMode
            ? <Clipboard className="h-3.5 w-3.5 text-primary" />
            : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
    );
  }

  return (
    <div className={`${W} h-[84px] rounded-md border px-1.5 py-1 text-center relative ${isCopySource ? "border-primary bg-primary/15" : "border-primary/30 bg-primary/5"} ${ring}`}>
      <button
        aria-label="Cancel this day"
        onClick={onCancel}
        className="absolute right-0 top-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
      <button
        aria-label="Copy this shift"
        onClick={onStartCopy}
        className="absolute left-0 top-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Copy className="h-3 w-3" />
      </button>
      <div className="text-[10px] font-semibold uppercase text-muted-foreground">{dowShort}</div>
      <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
      <Popover open={openEdit} onOpenChange={setOpenEdit}>
        <PopoverTrigger asChild>
          <button className="block w-full mt-0.5 text-[10px] leading-tight text-foreground hover:underline">
            <div>{to12h(start)}</div>
            <div className="text-muted-foreground">{to12h(finish)}</div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3 space-y-2" align="center">
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
          <Button size="sm" className="w-full" onClick={() => { onSave(st, fi); setOpenEdit(false); }}>
            Save
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
