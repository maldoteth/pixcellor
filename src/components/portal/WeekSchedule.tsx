const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

type Props = {
  scheduleDays: string[] | null;
  startTime: string | null;
  finishTime: string | null;
  scheduleNotes: string | null;
};

// Parse "Mon 09:00–17:00, Tue 10:00–18:00" (also accepts -, — separators) out of schedule_notes
function parsePerDay(notes: string | null): Record<string, { start?: string; finish?: string }> {
  const out: Record<string, { start?: string; finish?: string }> = {};
  if (!notes) return out;
  const re = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2}:\d{2}|--:--)\s*[–—-]\s*(\d{1,2}:\d{2}|--:--)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes)) !== null) {
    const d = (m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase()) as Day;
    out[d] = {
      start: m[2] === "--:--" ? undefined : m[2],
      finish: m[3] === "--:--" ? undefined : m[3],
    };
  }
  return out;
}

const fmt = (t?: string | null) => (t ? t.slice(0, 5) : null);

function getWeekDates(): Record<Day, Date> {
  const today = new Date();
  const day = today.getDay(); // 0=Sun..6=Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offsetToMonday);
  monday.setHours(0, 0, 0, 0);
  const out = {} as Record<Day, Date>;
  DAYS.forEach((d, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    out[d] = dt;
  });
  return out;
}

export default function WeekSchedule({ scheduleDays, startTime, finishTime, scheduleNotes }: Props) {
  const perDay = parsePerDay(scheduleNotes);
  const activeSet = new Set((scheduleDays ?? []).map((d) => d.slice(0, 3)));
  const globalStart = fmt(startTime);
  const globalFinish = fmt(finishTime);
  const weekDates = getWeekDates();

  const anyData =
    activeSet.size > 0 || globalStart || globalFinish || Object.keys(perDay).length > 0;
  if (!anyData) return null;

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {DAYS.map((d) => {
        const isActive = activeSet.has(d) || !!perDay[d];
        const t = perDay[d];
        const start = t?.start ?? (isActive ? globalStart : null);
        const finish = t?.finish ?? (isActive ? globalFinish : null);
        const date = weekDates[d];
        const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;
        return (
          <div
            key={d}
            className={`rounded-md border px-1.5 py-1.5 text-center ${
              isActive
                ? "border-primary/30 bg-primary/5"
                : "border-border/60 bg-muted/30 opacity-60"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
            <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
            {isActive ? (
              <div className="mt-1 text-[10px] leading-tight text-foreground">
                <div>{start ?? "--:--"}</div>
                <div className="text-muted-foreground">{finish ?? "--:--"}</div>
              </div>
            ) : (
              <div className="mt-1 text-[10px] text-muted-foreground">Off</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
