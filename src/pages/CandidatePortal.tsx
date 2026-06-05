import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, LogOut, MapPin } from "lucide-react";

type Shift = {
  assignment_id: string;
  stage: string;
  vacancy_id: string;
  title: string;
  reference: string | null;
  description: string | null;
  location: string | null;
  arrangement: string | null;
  employment_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  schedule_days: string[] | null;
  schedule_notes: string | null;
  hours_per_week: number | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  benefits: string | null;
  client_name: string | null;
};

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftsOnDate(shifts: Shift[], date: Date): Shift[] {
  return shifts.filter((s) => {
    if (!s.start_date) return false;
    const start = new Date(s.start_date + "T00:00:00");
    const end = s.end_date ? new Date(s.end_date + "T23:59:59") : addDays(start, 365);
    if (!isWithinInterval(date, { start, end })) return false;
    const days = (s.schedule_days ?? []).map((d) => d.slice(0, 3));
    if (days.length === 0) return true;
    return days.includes(DAY_KEYS[date.getDay()]);
  });
}

export default function CandidatePortal() {
  const { toast } = useToast();
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    await supabase.rpc("candidate_link_self");
    const { data, error } = await supabase.rpc("candidate_my_schedule");
    setLoading(false);
    if (error) {
      toast({ title: "Could not load your schedule", description: error.message, variant: "destructive" });
      return;
    }
    setShifts((data as Shift[]) ?? []);
  }, [toast]);

  useEffect(() => {
    if (session) void loadSchedule();
    else setShifts([]);
  }, [session, loadSchedule]);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/me` },
    });
    setSending(false);
    if (error) {
      toast({ title: "Could not send link", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Check your email", description: "We sent you a sign-in link." });
  };

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedShifts = useMemo(() => shiftsOnDate(shifts, selected), [shifts, selected]);

  const upcoming = useMemo(() => {
    const today = new Date();
    const out: { date: Date; shift: Shift }[] = [];
    for (let i = 0; i < 60 && out.length < 20; i++) {
      const d = addDays(today, i);
      for (const s of shiftsOnDate(shifts, d)) out.push({ date: d, shift: s });
    }
    return out;
  }, [shifts]);

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <CalendarDays className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-semibold">Candidate portal</h1>
        <p className="text-center text-sm text-muted-foreground">
          Sign in with the email you used when you applied. We'll send a one-time link to access your schedule.
        </p>
        <div className="w-full space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button className="w-full" onClick={sendMagicLink} disabled={sending}>
            {sending ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My schedule</h1>
          <p className="text-xs text-muted-foreground">Signed in as {session.user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading your shifts…</p>}
      {!loading && shifts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            You don't have any assigned vacancies yet. Once a recruiter assigns you to a role, your shifts will appear here.
          </CardContent>
        </Card>
      )}

      {shifts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="font-medium">{format(cursor, "MMMM yyyy")}</div>
                <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted-foreground">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d) => {
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const sList = shiftsOnDate(shifts, d);
                  const isSel = isSameDay(d, selected);
                  const isToday = isSameDay(d, new Date());
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => setSelected(d)}
                      className={`relative aspect-square rounded-md border p-1 text-left text-xs transition-colors ${
                        isSel ? "border-primary bg-primary/10" : "border-border/40 hover:bg-muted/40"
                      } ${inMonth ? "" : "opacity-40"}`}
                    >
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                        {d.getDate()}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {sList.slice(0, 2).map((s) => (
                          <div key={s.assignment_id} className="truncate rounded bg-primary/20 px-1 text-[10px] text-foreground">
                            {s.start_time ? s.start_time.slice(0, 5) : "•"} {s.title}
                          </div>
                        ))}
                        {sList.length > 2 && <div className="text-[10px] text-muted-foreground">+{sList.length - 2} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="font-medium">{format(selected, "EEEE, d MMM yyyy")}</div>
                {selectedShifts.length === 0 && <p className="text-sm text-muted-foreground">No shifts scheduled.</p>}
                {selectedShifts.map((s) => (
                  <div key={s.assignment_id} className="rounded-md border border-border/50 p-3 text-sm space-y-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.client_name ?? "Client"}{s.reference ? ` · ${s.reference}` : ""}</div>
                    <div className="text-xs">
                      {s.start_time?.slice(0, 5) ?? "—"} – {s.finish_time?.slice(0, 5) ?? "—"}
                      {s.hours_per_week ? ` · ${s.hours_per_week}h/wk` : ""}
                    </div>
                    {s.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {s.location} {s.arrangement ? `(${s.arrangement})` : ""}
                      </div>
                    )}
                    <Badge variant="outline" className="text-[10px]">{s.stage}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="font-medium">Upcoming shifts</div>
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming shifts in the next 60 days.</p>}
                {upcoming.map(({ date, shift }) => (
                  <button
                    key={date.toISOString() + shift.assignment_id}
                    onClick={() => { setSelected(date); setCursor(startOfMonth(date)); }}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5 text-left text-xs hover:bg-muted/40"
                  >
                    <div>
                      <div className="font-medium">{format(date, "EEE d MMM")}</div>
                      <div className="text-muted-foreground">{shift.title} · {shift.client_name ?? ""}</div>
                    </div>
                    <div className="text-muted-foreground">
                      {shift.start_time?.slice(0, 5) ?? ""}–{shift.finish_time?.slice(0, 5) ?? ""}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </main>
  );
}
