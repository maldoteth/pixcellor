import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STAGES = [
  "brief_received",
  "designing",
  "developing",
  "revisions",
  "live",
  "on_hold",
] as const;

type Profile = {
  email: string;
  name: string | null;
  company: string | null;
  brand_colours: string | null;
  page_count: number | null;
  content_notes: string | null;
  requirements: string | null;
  notes: string | null;
};

type Status = {
  email: string;
  stage: string;
  notes: string | null;
  updated_at: string;
};

export default function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [draftStage, setDraftStage] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: statusData }] = await Promise.all([
      supabase.from("client_profiles").select("*").order("updated_at", { ascending: false }),
      supabase.from("project_status").select("*"),
    ]);
    setProfiles((profilesData ?? []) as Profile[]);
    const map: Record<string, Status> = {};
    for (const s of (statusData ?? []) as Status[]) {
      map[s.email.toLowerCase()] = s;
    }
    setStatuses(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveStatus = async (email: string) => {
    const stage = draftStage[email] ?? statuses[email.toLowerCase()]?.stage ?? "brief_received";
    const notes = draftNotes[email] ?? statuses[email.toLowerCase()]?.notes ?? "";
    const { error } = await supabase
      .from("project_status")
      .upsert({ email: email.toLowerCase(), stage, notes }, { onConflict: "email" });
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success(`Updated ${email} → ${stage}`);
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Client Pipeline</h1>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Update each client's project stage and notes — the chatbot will report this back to them when they ask for updates.
        </p>

        {loading && <p className="text-muted-foreground">Loading…</p>}

        {!loading && profiles.length === 0 && (
          <Card>
            <CardContent className="p-6 text-muted-foreground">
              No client profiles saved yet. They'll appear here once Alex captures briefs from chats.
            </CardContent>
          </Card>
        )}

        {profiles.map((p) => {
          const key = p.email.toLowerCase();
          const status = statuses[key];
          const stage = draftStage[p.email] ?? status?.stage ?? "brief_received";
          const notes = draftNotes[p.email] ?? status?.notes ?? "";
          return (
            <Card key={p.email}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4">
                  <span className="truncate">{p.name || p.email}</span>
                  <span className="text-xs font-normal text-muted-foreground">{p.email}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {p.company && <div><span className="text-muted-foreground">Company:</span> {p.company}</div>}
                  {p.brand_colours && <div><span className="text-muted-foreground">Colours:</span> {p.brand_colours}</div>}
                  {p.page_count != null && <div><span className="text-muted-foreground">Pages:</span> {p.page_count}</div>}
                  {p.requirements && <div className="md:col-span-2"><span className="text-muted-foreground">Requirements:</span> {p.requirements}</div>}
                  {p.content_notes && <div className="md:col-span-2"><span className="text-muted-foreground">Content:</span> {p.content_notes}</div>}
                  {p.notes && <div className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {p.notes}</div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-start pt-2 border-t border-border">
                  <Select
                    value={stage}
                    onValueChange={(v) => setDraftStage((d) => ({ ...d, [p.email]: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Internal notes the chatbot can share (e.g. 'Design draft sent for review')"
                    value={notes}
                    onChange={(e) => setDraftNotes((d) => ({ ...d, [p.email]: e.target.value }))}
                    className="min-h-[60px]"
                  />
                  <Button onClick={() => saveStatus(p.email)}>Save</Button>
                </div>

                {status?.updated_at && (
                  <p className="text-xs text-muted-foreground">Last updated: {new Date(status.updated_at).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
