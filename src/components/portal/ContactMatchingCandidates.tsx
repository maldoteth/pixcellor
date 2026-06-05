import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, RefreshCw } from "lucide-react";

type Match = {
  id: string;
  full_name: string;
  headline: string | null;
  current_role_title: string | null;
  location: string | null;
  skills: string[];
  status: string;
  score: number;
};

export default function ContactMatchingCandidates({ contactId }: { contactId: string }) {
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("portal_match_candidates_for_contact", { _contact_id: contactId, _limit: 8 });
    setLoading(false);
    if (error) { setMatches([]); return; }
    setMatches((data as Match[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [contactId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Matching candidates</div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>
      {matches === null ? null : matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">No matching candidates yet. Add candidates with relevant skills or location.</p>
      ) : (
        <div className="space-y-1.5">
          {matches.map(m => (
            <Card key={m.id} className="p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.headline ?? m.current_role_title ?? "—"} {m.location ? `· ${m.location}` : ""}</div>
                </div>
                <Badge variant="secondary">score {m.score}</Badge>
              </div>
              {m.skills?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.skills.slice(0, 5).map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
