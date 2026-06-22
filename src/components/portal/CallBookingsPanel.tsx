import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Copy, Loader2, Phone, RefreshCw, Video, XCircle, CheckCircle2, ChevronDown, ChevronUp, Megaphone, Mic, CalendarClock as CalIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePortalRefresh } from "@/hooks/usePortalRefresh";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  brief: string | null;
  preference: string | null;
  scheduled_at: string | null;
  status: string;
  host_token: string;
  guest_token: string;
  host_code: string | null;
  guest_code: string | null;
  created_at: string;
  source: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  completed: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const LONDON = "Europe/London";
function fmtLondon(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function prefLabel(p: string | null): string {
  switch (p) {
    case "asap": return "ASAP";
    case "today": return "Today";
    case "tomorrow": return "Tomorrow";
    case "this_week": return "This week";
    case "specific": return "Specific time";
    default: return p || "Callback";
  }
}

export default function CallBookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [recordingsCount, setRecordingsCount] = useState<number>(0);
  const [campaignsCount, setCampaignsCount] = useState<number>(0);

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await supabase
      .from("call_bookings")
      .select("id,name,email,phone,company,brief,preference,scheduled_at,status,host_token,guest_token,host_code,guest_code,created_at,source")
      .order("scheduled_at", { ascending: true, nullsFirst: true })
      .limit(200);
    if (error) {
      toast.error(error.message || "Couldn't load bookings");
    } else {
      setBookings((data || []) as Booking[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchBookings();
    const id = setInterval(() => fetchBookings(true), 60000);
    return () => clearInterval(id);
  }, [fetchBookings]);

  useEffect(() => {
    (async () => {
      // Only count CSV-uploaded recordings. In-call host/guest captures are excluded.
      const { count } = await supabase
        .from("call_recordings")
        .select("id", { count: "exact", head: true })
        .eq("recorded_by", "csv");
      setRecordingsCount(count || 0);
      // Campaigns: no dedicated table yet — stays at 0 until CSV uploads are wired up.
      setCampaignsCount(0);
    })();
  }, []);


  const { upcoming, past, stats } = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
    const inAWeek = new Date(now + 7 * 24 * 3600 * 1000);

    const up: Booking[] = [];
    const pa: Booking[] = [];
    let today = 0, week = 0, callbacks = 0;

    for (const b of bookings) {
      const t = b.scheduled_at ? new Date(b.scheduled_at).getTime() : null;
      const isPast = t !== null && t < now - 60 * 60 * 1000; // 1h grace
      if (b.status !== "cancelled" && (!isPast || b.status === "pending")) {
        up.push(b);
        if (t !== null) {
          const d = new Date(t);
          if (d >= startOfToday && d <= endOfToday) today++;
          if (d.getTime() >= now && d <= inAWeek) week++;
        } else if (b.preference !== "specific") {
          callbacks++;
        }
      } else {
        pa.push(b);
      }
    }

    pa.sort((a, b) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : new Date(a.created_at).getTime();
      const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : new Date(b.created_at).getTime();
      return bt - at;
    });

    return { upcoming: up, past: pa, stats: { today, week, callbacks } };
  }, [bookings]);

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Couldn't copy link")
    );
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("call_bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message || "Couldn't update");
      return;
    }
    toast.success(`Marked ${status}`);
    fetchBookings(true);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://pixcellor.com";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading bookings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Today</div>
            <div className="mt-1 text-2xl font-semibold">{stats.today}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">This week</div>
            <div className="mt-1 text-2xl font-semibold">{stats.week}</div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Pending callbacks</div>
            <div className="mt-1 text-2xl font-semibold">{stats.callbacks}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings" className="gap-2">
            <CalIcon className="h-3.5 w-3.5" /> Bookings ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-3.5 w-3.5" /> Campaigns ({campaignsCount})
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <Mic className="h-3.5 w-3.5" /> Recordings ({recordingsCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming &amp; pending ({upcoming.length})</h2>
            <Button variant="pricing" size="sm" className="gap-2" onClick={() => fetchBookings()} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-lg border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No upcoming bookings.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b, i) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  origin={origin}
                  index={i}
                  onCopy={copyLink}
                  onStatus={updateStatus}
                />
              ))}
            </div>
          )}

          <div className="pt-2">
            <Button variant="pricing" size="sm" className="gap-2" onClick={() => setShowPast((s) => !s)}>
              {showPast ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Past ({past.length})
            </Button>
            {showPast && (
              <div className="mt-3 space-y-3">
                {past.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
                    No past bookings.
                  </div>
                ) : (
                  past.slice(0, 50).map((b, i) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      origin={origin}
                      index={i}
                      onCopy={copyLink}
                      onStatus={updateStatus}
                      muted
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">No call campaigns yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload a client's campaign CSV and it will appear here. Current count: {campaignsCount}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings">
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <Mic className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">
                {recordingsCount === 0 ? "No recordings yet" : `${recordingsCount} recording${recordingsCount === 1 ? "" : "s"}`}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your recordings will appear here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingRow({
  booking,
  origin,
  index,
  onCopy,
  onStatus,
  muted,
}: {
  booking: Booking;
  origin: string;
  index: number;
  onCopy: (url: string, label: string) => void;
  onStatus: (id: string, status: string) => void;
  muted?: boolean;
}) {
  const hostUrl = booking.host_code
    ? `${origin}/meeting/${booking.host_code}`
    : `${origin}/call/${booking.id}?t=${booking.host_token}`;
  const guestUrl = booking.guest_code
    ? `${origin}/meeting/${booking.guest_code}`
    : `${origin}/call/${booking.id}?t=${booking.guest_token}`;
  const when = booking.scheduled_at ? fmtLondon(booking.scheduled_at) : `Callback — ${prefLabel(booking.preference)}`;
  const statusClass = STATUS_COLORS[booking.status] || "border-border bg-muted/20 text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: muted ? 0.75 : 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
    >
      <Card className="border-border bg-card/70 backdrop-blur-xl">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{when}</span>
              <Badge variant="outline" className={statusClass}>{booking.status}</Badge>
              {booking.source && <Badge variant="outline" className="border-border text-xs text-muted-foreground">{booking.source}</Badge>}
            </div>
            <div className="text-sm">
              <span className="font-medium">{booking.name}</span>
              {booking.company && <span className="text-muted-foreground"> · {booking.company}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a href={`mailto:${booking.email}`} className="hover:text-foreground">{booking.email}</a>
              {booking.phone && (
                <a href={`tel:${booking.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Phone className="h-3 w-3" /> {booking.phone}
                </a>
              )}
            </div>
            {booking.brief && (
              <p className="line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{booking.brief}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-stretch">
            <Button asChild variant="pricing" size="sm" className="gap-2">
              <a href={hostUrl} target="_blank" rel="noopener noreferrer">
                <Video className="h-3.5 w-3.5" /> Join as host
              </a>
            </Button>
            <Button variant="pricing" size="sm" className="gap-2" onClick={() => onCopy(guestUrl, "Guest link")}>
              <Copy className="h-3.5 w-3.5" /> Guest link
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="pricing" size="sm">More</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onCopy(hostUrl, "Host link")}>
                  <Copy className="mr-2 h-4 w-4" /> Copy host link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatus(booking.id, "completed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatus(booking.id, "cancelled")}>
                  <XCircle className="mr-2 h-4 w-4" /> Mark cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
