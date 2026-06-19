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
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="gap-2">
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
