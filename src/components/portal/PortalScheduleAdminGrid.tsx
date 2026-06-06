import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ShiftPlannerGrid from "@/components/portal/ShiftPlannerGrid";

type Vacancy = Parameters<typeof ShiftPlannerGrid>[0]["vacancies"][number];

export default function PortalScheduleAdminGrid({ myCandidateId }: { myCandidateId?: string | null }) {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("portal_my_vacancies_full" as never);
    if (error) {
      toast({ title: "Could not load schedule", description: error.message, variant: "destructive" });
      return;
    }
    setVacancies((data as Vacancy[] | null) ?? []);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const candidateFilter = myCandidateId
    ? { id: myCandidateId, name: "You" }
    : undefined;

  return (
    <ShiftPlannerGrid
      vacancies={vacancies}
      viewerMode="candidate"
      rowMode="candidate"
      hideFirstColumn
      candidateFilter={candidateFilter}
      secondColumn="client"
      onVacancyChanged={load}
    />
  );
}
