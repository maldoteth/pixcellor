import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, LogOut } from "lucide-react";
import KycDocuments from "@/components/portal/KycDocuments";
import PortalScheduleGrid from "@/components/portal/PortalScheduleGrid";
import PortalMyJobs from "@/components/portal/PortalMyJobs";
import PortalClientVacancies from "@/components/portal/PortalClientVacancies";

type AccessIds = { as_candidate: string[]; as_client: string[]; email: string | null };

export default function CandidatePortal() {
  const { toast } = useToast();
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [access, setAccess] = useState<AccessIds>({ as_candidate: [], as_client: [], email: null });
  const [myCandidateId, setMyCandidateId] = useState<string | null>(null);
  const [tab, setTab] = useState("schedule");
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAccess = useCallback(async () => {
    const cid = await supabase.rpc("candidate_link_self" as never);
    setMyCandidateId((cid.data as string) ?? null);
    const { data, error } = await supabase.rpc("portal_my_vacancy_ids" as never);
    if (error) { toast({ title: "Could not load access", description: error.message, variant: "destructive" }); return; }
    setAccess(data as AccessIds);
  }, [toast]);

  useEffect(() => { if (session) void loadAccess(); }, [session, loadAccess, refreshTick]);

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/me` },
    });
    setSending(false);
    if (error) { toast({ title: "Could not send link", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Check your email", description: "We sent you a sign-in link." });
  };

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
        <CalendarDays className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-center text-sm text-muted-foreground">
          Use the email you applied with (candidates) or the company email on file (clients). We'll send a one-time link.
        </p>
        <div className="w-full space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Button className="w-full" onClick={sendMagicLink} disabled={sending}>
            {sending ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </div>
        <div className="relative w-full my-2">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin + "/me",
            });
            if (result.error) toast({ title: "Could not start Google sign-in", variant: "destructive" });
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84Z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
          </svg>
          Continue with Google
        </Button>
      </main>
    );
  }

  const isCandidate = access.as_candidate.length > 0 || !!myCandidateId;
  const isClient = access.as_client.length > 0;
  const hasAnyAccess = isCandidate || isClient;

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My dashboard</h1>
          <p className="text-xs text-muted-foreground">Signed in as {session.user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={async () => { const { hardSignOut } = await import("@/lib/hardSignOut"); await hardSignOut("/"); }} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>

      {!hasAnyAccess && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            We couldn't find any vacancies linked to <strong>{session.user.email}</strong>. If you're a candidate, ask your recruiter to add you with this email. If you're a client, ask us to add this email to your company contacts.
          </CardContent>
        </Card>
      )}

      {hasAnyAccess && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            {isCandidate && <TabsTrigger value="jobs">My Jobs</TabsTrigger>}
            {isClient && <TabsTrigger value="vacancies">Vacancies</TabsTrigger>}
            {isCandidate && <TabsTrigger value="documents">Documents</TabsTrigger>}
          </TabsList>

          <TabsContent value="schedule" className="mt-4">
            <PortalScheduleGrid key={refreshTick} myCandidateId={myCandidateId} />
          </TabsContent>

          {isCandidate && (
            <TabsContent value="jobs" className="mt-4">
              <PortalMyJobs onChange={() => setRefreshTick((t) => t + 1)} />
            </TabsContent>
          )}

          {isClient && (
            <TabsContent value="vacancies" className="mt-4">
              <PortalClientVacancies />
            </TabsContent>
          )}

          {isCandidate && (
            <TabsContent value="documents" className="mt-4">
              <Card><CardContent className="p-4"><KycDocuments mode="candidate" /></CardContent></Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </main>
  );
}
