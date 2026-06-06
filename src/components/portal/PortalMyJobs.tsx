import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock } from "lucide-react";

type Invite = {
  id: string;
  vacancy_id: string;
  vacancy_title: string;
  client_name: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  finish_time: string | null;
  status: string;
  custom_message: string | null;
  sent_at: string;
  expires_at: string;
};

export default function PortalMyJobs({ onChange }: { onChange?: () => void }) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("portal_my_invitations" as never);
    setLoading(false);
    if (error) { toast({ title: "Could not load jobs", description: error.message, variant: "destructive" }); return; }
    setInvites((data as Invite[]) ?? []);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const respond = async (id: string, response: "confirm" | "decline") => {
    setBusy(id);
    const { data, error } = await supabase.rpc("portal_respond_invitation" as never, { _invitation_id: id, _response: response } as never);
    setBusy(null);
    if (error) { toast({ title: "Could not respond", description: error.message, variant: "destructive" }); return; }
    const result = data as { already_filled?: boolean; status?: string };
    if (result?.already_filled) {
      toast({ title: "Position filled", description: "Another candidate accepted this role first.", variant: "destructive" });
    } else if (response === "confirm") {
      toast({ title: "Confirmed!", description: "You've got the job — a confirmation email is on its way." });
    } else {
      toast({ title: "Declined" });
    }
    await load();
    onChange?.();
  };

  const pending = invites.filter((i) => i.status === "sent");
  const past = invites.filter((i) => i.status !== "sent");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Job invitations</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && pending.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No pending invitations.</CardContent></Card>
        )}
        <div className="grid gap-2">
          {pending.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{inv.vacancy_title}</div>
                    <div className="text-xs text-muted-foreground">{inv.client_name ?? "Client"} {inv.location ? `· ${inv.location}` : ""}</div>
                  </div>
                  <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> expires {new Date(inv.expires_at).toLocaleDateString()}</Badge>
                </div>
                {inv.custom_message && <p className="text-xs italic text-muted-foreground">"{inv.custom_message}"</p>}
                <div className="text-xs text-muted-foreground">
                  {inv.start_date ? `From ${inv.start_date}` : ""}{inv.end_date ? ` to ${inv.end_date}` : ""}
                  {inv.start_time ? ` · ${inv.start_time.slice(0, 5)}–${inv.finish_time?.slice(0, 5) ?? ""}` : ""}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="gap-1" disabled={busy === inv.id} onClick={() => respond(inv.id, "confirm")}>
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" disabled={busy === inv.id} onClick={() => respond(inv.id, "decline")}>
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Past invitations</h2>
          <div className="grid gap-2">
            {past.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-medium">{inv.vacancy_title}</div>
                    <div className="text-muted-foreground">{inv.client_name}</div>
                  </div>
                  <Badge variant={inv.status === "confirmed" ? "default" : "outline"} className="text-[10px] capitalize">{inv.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
