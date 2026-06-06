import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Vacancy = {
  id: string;
  title: string;
  reference: string | null;
  location: string | null;
  status: string;
  openings: number;
  start_date: string | null;
  end_date: string | null;
  client: { name: string } | null;
  viewer_role: "candidate" | "client";
  assignments: Array<{ id: string; slot_index: number; stage: string; candidate: { id: string; full_name: string; status: string } }>;
};

export default function PortalClientVacancies() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("portal_my_vacancies" as never);
    setLoading(false);
    if (error) { toast({ title: "Could not load vacancies", description: error.message, variant: "destructive" }); return; }
    setVacancies(((data as Vacancy[]) ?? []).filter((v) => v.viewer_role === "client"));
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading vacancies…</p>;
  if (vacancies.length === 0) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No vacancies for your company yet.</CardContent></Card>;
  }

  return (
    <div className="grid gap-3">
      {vacancies.map((v) => {
        const filled = v.assignments.filter((a) => ["offer", "placed"].includes(a.stage)).length;
        const open = Math.max(0, v.openings - filled);
        return (
          <Card key={v.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{v.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.reference ? `${v.reference} · ` : ""}{v.location ?? ""}
                    {v.start_date ? ` · ${v.start_date}` : ""}{v.end_date ? ` → ${v.end_date}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{v.status}</Badge>
                  <Badge variant={open > 0 ? "default" : "secondary"} className="text-[10px]">{open}/{v.openings} open</Badge>
                </div>
              </div>
              {v.assignments.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                  <div className="mb-1 text-[10px] uppercase text-muted-foreground">Assigned candidates</div>
                  <div className="flex flex-wrap gap-1">
                    {v.assignments.map((a) => (
                      <Badge key={a.id} variant="secondary" className="gap-1 text-[10px]">
                        {a.candidate.full_name} <span className="opacity-60">· {a.stage}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
