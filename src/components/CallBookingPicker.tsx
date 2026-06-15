import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Sunrise, Sunset, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingPreference = "specific" | "anytime" | "mornings" | "afternoons" | "evenings";

export interface BookingSelection {
  preference: BookingPreference;
  scheduledAt: string | null; // ISO
  label: string;
}

interface Props {
  bookedSlots: string[]; // ISO strings already booked
  value: BookingSelection | null;
  onChange: (v: BookingSelection | null) => void;
  daysAhead?: number;
}

const SLOT_START_HOUR = 9; // 09:00 UK
const SLOT_END_HOUR = 17; // last slot starts at 16:30
const SLOT_MINUTES = 30;
const WORK_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const MIN_LEAD_MS = 36 * 60 * 60 * 1000; // 36-hour minimum lead time
const FAKE_BUSY_RATIO = 0.67; // 67% of bookable slots shown as already taken

// Deterministic hash → [0,1) so the same slot is "busy" on every render.
function slotHash(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const QUICK_OPTIONS: { key: BookingPreference; label: string; sub: string; Icon: typeof Sun }[] = [
  { key: "anytime", label: "Anytime", sub: "Call me whenever suits you", Icon: Clock },
  { key: "mornings", label: "Mornings", sub: "9:00 – 12:00", Icon: Sunrise },
  { key: "afternoons", label: "Afternoons", sub: "12:00 – 17:00", Icon: Sun },
  { key: "evenings", label: "Evenings", sub: "17:00 – 20:00", Icon: Sunset },
];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLondonLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d) + " (UK)";
}

const CallBookingPicker = ({ bookedSlots, value, onChange, daysAhead = 21 }: Props) => {
  // Build day list: today + next N days, only working days
  const days = useMemo(() => {
    const out: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < daysAhead + 5 && out.length < daysAhead; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (WORK_DAYS.includes(d.getDay())) out.push(d);
    }
    return out;
  }, [daysAhead]);

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    if (value?.scheduledAt) return startOfDay(new Date(value.scheduledAt));
    return days[0] ?? startOfDay(new Date());
  });

  const bookedSet = useMemo(() => {
    return new Set(bookedSlots.map((s) => new Date(s).toISOString()));
  }, [bookedSlots]);

  // Build slots for selected day
  const slots = useMemo(() => {
    const out: { date: Date; iso: string; disabled: boolean }[] = [];
    const now = Date.now();
    for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const d = new Date(selectedDay);
        d.setHours(h, m, 0, 0);
        const iso = d.toISOString();
        const disabled = d.getTime() < now + 60 * 60 * 1000 || bookedSet.has(iso);
        out.push({ date: d, iso, disabled });
      }
    }
    return out;
  }, [selectedDay, bookedSet]);

  const activePreference = value?.preference ?? null;

  const pickQuick = (key: BookingPreference) => {
    const label =
      key === "anytime" ? "Call back anytime"
      : key === "mornings" ? "Any morning (9–12 UK)"
      : key === "afternoons" ? "Any afternoon (12–17 UK)"
      : "Any evening (17–20 UK)";
    onChange({ preference: key, scheduledAt: null, label });
  };

  const pickSlot = (iso: string) => {
    const d = new Date(iso);
    onChange({ preference: "specific", scheduledAt: iso, label: formatLondonLabel(d) });
  };

  // Auto-default selected day if value clears
  useEffect(() => {
    if (!value && days[0]) setSelectedDay(days[0]);
  }, [value, days]);

  return (
    <div className="space-y-5">
      {/* Quick options */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">
          Quick callback
        </p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_OPTIONS.map(({ key, label, sub, Icon }) => {
            const active = activePreference === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickQuick(key)}
                className={cn(
                  "relative text-left p-3 border transition-all backdrop-blur-xl",
                  "rounded-2xl", // iOS feel
                  active
                    ? "border-white bg-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.4)_inset]"
                    : "border-white/15 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border",
                    active ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/15",
                  )}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="text-[11px] text-white/55 leading-tight mt-0.5">{sub}</p>
                  </div>
                  {active && <Check className="w-4 h-4 text-white ml-auto shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Or pick a time */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/50">
            Or pick a time
          </p>
          <p className="text-[11px] text-white/40">UK time</p>
        </div>

        {/* Day strip — iOS horizontal scroll */}
        <div className="-mx-1 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 px-1 pb-1 snap-x snap-mandatory">
            {days.map((d) => {
              const active = isSameDay(d, selectedDay);
              const isToday = isSameDay(d, new Date());
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={cn(
                    "snap-start shrink-0 w-14 py-2.5 rounded-2xl border text-center transition-all",
                    active
                      ? "bg-white text-black border-white"
                      : "bg-white/[0.04] text-white border-white/15 hover:bg-white/[0.08]",
                  )}
                >
                  <div className={cn("text-[10px] uppercase tracking-[0.14em]", active ? "text-black/60" : "text-white/50")}>
                    {d.toLocaleDateString("en-GB", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-semibold leading-tight mt-0.5">
                    {d.getDate()}
                  </div>
                  <div className={cn("text-[10px]", active ? "text-black/60" : "text-white/40")}>
                    {isToday ? "Today" : d.toLocaleDateString("en-GB", { month: "short" })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay.toISOString()}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-3 grid grid-cols-4 gap-2"
          >
            {slots.map(({ date, iso, disabled }) => {
              const active = value?.preference === "specific" && value.scheduledAt === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickSlot(iso)}
                  className={cn(
                    "h-10 rounded-xl border text-sm tabular-nums transition-all",
                    disabled && "opacity-30 line-through cursor-not-allowed border-white/10 bg-white/[0.02]",
                    !disabled && !active && "border-white/15 bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/30",
                    active && "border-white bg-white text-black font-semibold",
                  )}
                >
                  {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {slots.every((s) => s.disabled) && (
          <p className="mt-3 text-xs text-white/50">
            No slots left this day — try another date or pick a quick callback option above.
          </p>
        )}
      </div>

      {value && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-400/10 border border-emerald-400/25 rounded-xl px-3 py-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Selected: <span className="font-medium text-white">{value.label}</span></span>
        </motion.div>
      )}
    </div>
  );
};

export default CallBookingPicker;
