import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarClock, Briefcase, Users, ArrowLeft, Loader2 } from "lucide-react";

type Mode = "chooser" | "meeting" | "staff";

function prettyDate(ymd: string) {
  try {
    const d = new Date(`${ymd}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return ymd;
  }
}

function timeSlots(): string[] {
  const out: string[] = [];
  for (let h = 9; h < 18; h++) {
    for (const m of [0, 15, 30, 45]) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
}

export default function RequestChooserDialog({
  open,
  onOpenChange,
  date,
  variant = "request",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string | null;
  variant?: "request" | "find";
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("chooser");
  const [submitting, setSubmitting] = useState(false);

  // Meeting fields
  const [mDate, setMDate] = useState<string>(date ?? "");
  const [mTime, setMTime] = useState<string>("10:00");
  const [mBrief, setMBrief] = useState<string>("");
  const [mName, setMName] = useState<string>("");
  const [mEmail, setMEmail] = useState<string>("");
  const [mPhone, setMPhone] = useState<string>("");

  // Staff fields
  const [sTitle, setSTitle] = useState("");
  const [sOpenings, setSOpenings] = useState("1");
  const [sStart, setSStart] = useState<string>(date ?? "");
  const [sLocation, setSLocation] = useState("");
  const [sRemote, setSRemote] = useState(false);
  const [sHours, setSHours] = useState("");
  const [sNotes, setSNotes] = useState("");

  const slots = useMemo(timeSlots, []);

  useEffect(() => {
    if (!open) return;
    setMode("chooser");
    setMDate(date ?? "");
    setSStart(date ?? "");
    setSubmitting(false);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      setMEmail((user.email as string) ?? "");
      setMName(((meta.full_name as string) || (meta.name as string) || "") ?? "");
      setMPhone(((meta.phone as string) || "") ?? "");
    })();
  }, [open, date]);

  const submitMeeting = async () => {
    if (!mName.trim() || !mEmail.trim() || !mPhone.trim()) {
      toast({ title: "Add your contact details", description: "Name, email and phone are required.", variant: "destructive" });
      return;
    }
    if (!mDate || !mTime) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const iso = new Date(`${mDate}T${mTime}:00`).toISOString();
      const { data, error } = await supabase.functions.invoke("book-call", {
        body: {
          name: mName.trim(),
          email: mEmail.trim(),
          phone: mPhone.trim(),
          brief: mBrief.trim() || null,
          preference: "specific",
          scheduled_at: iso,
          source: "customer-portal",
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === "slot_taken") {
          toast({ title: "That slot was just taken", description: "Please pick another time.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
        throw new Error(data?.error || "unknown_error");
      }
      toast({ title: "Meeting requested", description: "We'll confirm by email shortly." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not book", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const submitStaff = async () => {
    if (!sTitle.trim()) {
      toast({ title: "Add a role title", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const message = [
        `[Staff request from customer portal]`,
        `Role: ${sTitle.trim()}`,
        `Openings: ${sOpenings || "1"}`,
        sStart ? `Start date: ${sStart}` : null,
        sRemote ? `Location: Remote` : (sLocation ? `Location: ${sLocation.trim()}` : null),
        sHours ? `Hours / shift pattern: ${sHours.trim()}` : null,
        sNotes ? `Notes: ${sNotes.trim()}` : null,
      ].filter(Boolean).join("\n");

      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      const name = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || (user?.email ?? "Portal customer");
      const email = user?.email ?? "no-reply@pixcellor.com";

      const { error } = await supabase.from("contact_inquiries").insert({
        name,
        email,
        message,
      });
      if (error) throw error;
      toast({ title: "Staff request submitted", description: "Our team will be in touch to confirm." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not submit", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const goWork = () => {
    onOpenChange(false);
    navigate(`/jobs/apply?from=portal${date ? `&date=${date}` : ""}`);
  };

  const goFindWork = () => {
    onOpenChange(false);
    navigate("/work");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "chooser" && (
              variant === "find"
                ? "What are you looking for?"
                : (date ? `Request for ${prettyDate(date)}` : "Create a request")
            )}
            {mode === "meeting" && "Request a meeting"}
            {mode === "staff" && (variant === "find" ? "Find staff" : "Request staff")}
          </DialogTitle>
        </DialogHeader>

        {mode === "chooser" && variant === "request" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setMode("meeting")}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <CalendarClock className="h-6 w-6 text-primary" />
              <div className="font-semibold">Request meeting</div>
              <div className="text-xs text-muted-foreground">Book a quick call with our team. No re-entering your details.</div>
            </button>
            <button
              type="button"
              onClick={goWork}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              <div className="font-semibold">Request work</div>
              <div className="text-xs text-muted-foreground">Join as a candidate. Upload passport & right-to-work to get matched.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("staff")}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Users className="h-6 w-6 text-primary" />
              <div className="font-semibold">Request staff</div>
              <div className="text-xs text-muted-foreground">Tell us what you need. We'll line up candidates for your shift.</div>
            </button>
          </div>
        )}

        {mode === "chooser" && variant === "find" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={goFindWork}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Briefcase className="h-6 w-6 text-primary" />
              <div className="font-semibold">Find work</div>
              <div className="text-xs text-muted-foreground">Browse all open vacancies. Search by role, location, remote and pay.</div>
            </button>
            <button
              type="button"
              onClick={() => setMode("staff")}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Users className="h-6 w-6 text-primary" />
              <div className="font-semibold">Find staff</div>
              <div className="text-xs text-muted-foreground">Tell us what you need. We'll line up candidates for your shift.</div>
            </button>
          </div>
        )}

        {mode === "meeting" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-date">Date</Label>
                <Input id="m-date" type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="m-time">Time (UK)</Label>
                <Select value={mTime} onValueChange={setMTime}>
                  <SelectTrigger id="m-time"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {slots.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-name">Name</Label>
                <Input id="m-name" value={mName} onChange={(e) => setMName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="m-phone">Phone</Label>
                <Input id="m-phone" value={mPhone} onChange={(e) => setMPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="m-email">Email</Label>
              <Input id="m-email" type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-brief">What's it about? (optional)</Label>
              <Textarea id="m-brief" rows={3} value={mBrief} onChange={(e) => setMBrief(e.target.value)} maxLength={1000} />
            </div>
          </div>
        )}

        {mode === "staff" && (
          <div className="grid gap-3">
            <div>
              <Label htmlFor="s-title">Role title</Label>
              <Input id="s-title" placeholder="e.g. Scaffolder, Receptionist…" value={sTitle} onChange={(e) => setSTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="s-openings">Number needed</Label>
                <Input id="s-openings" type="number" min={1} value={sOpenings} onChange={(e) => setSOpenings(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-start">Start date</Label>
                <Input id="s-start" type="date" value={sStart} onChange={(e) => setSStart(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="s-location">Location</Label>
              <Input id="s-location" placeholder="Site address or city" value={sLocation} onChange={(e) => setSLocation(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-hours">Hours / shift pattern</Label>
              <Input id="s-hours" placeholder="e.g. 08:00–17:00, Mon–Fri" value={sHours} onChange={(e) => setSHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-notes">Notes (optional)</Label>
              <Textarea id="s-notes" rows={3} value={sNotes} onChange={(e) => setSNotes(e.target.value)} maxLength={1000} />
            </div>
          </div>
        )}

        <DialogFooter>
          {mode !== "chooser" && (
            <Button variant="ghost" onClick={() => setMode("chooser")} disabled={submitting} className="mr-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          {mode === "meeting" && (
            <Button onClick={submitMeeting} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Booking…</> : "Request meeting"}
            </Button>
          )}
          {mode === "staff" && (
            <Button onClick={submitStaff} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Submit request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
