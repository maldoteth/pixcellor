import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Calendar, Loader2, Check } from "lucide-react";

type Vac = {
  id: string;
  title: string;
  location: string | null;
  arrangement: string | null;
  employment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  pay_min: number | null;
  pay_max: number | null;
  pay_currency: string | null;
  pay_period: string | null;
  openings: number;
  required_skills: string[] | null;
  description: string | null;
  client_name: string | null;
  already_applied: boolean;
};

type SelfRow = { id: string; full_name: string; email: string; availability_date: string | null; is_open_to_work: boolean };

export default function PortalVacancySearch() {
  const { toast } = useToast();
  const [self, setSelf] = useState<SelfRow | null>(null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Vac[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSelf = useCallback(async () => {
    const { data } = await supabase.rpc("candidate_get_self" as never);
    const r = (data as SelfRow[] | null)?.[0] ?? null;
    setSelf(r);
  }, []);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("portal_open_vacancies" as never, { _search: term || null } as never);
    setLoading(false);
    if (error) { toast({ title: "Could not load vacancies", description: error.message, variant: "destructive" }); return; }
    setRows((data as Vac[]) ?? []);
  }, [toast]);

  useEffect(() => { void loadSelf(); void search(""); }, [loadSelf, search]);

  const apply = async (v: Vac) => {
    setBusy(v.id);
    const { data, error } = await supabase.rpc("candidate_express_interest" as never, { _vacancy_id: v.id } as never);
    setBusy(null);
    if (error) { toast({ title: "Could not apply", description: error.message, variant: "destructive" }); return; }
    const status = (data as { status?: string } | null)?.status;
    toast({ title: status === "already_applied" ? "Already applied" : "Interest sent", description: v.title });
    void search(q);
  };

  const saveAvail = async (date: string | null, open: boolean) => {
    const { error } = await supabase.rpc("candidate_set_availability" as never, { _date: date, _open: open } as never);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Availability updated" });
    void loadSelf();
  };

  const fmtPay = (v: Vac) => {
    if (v.pay_min == null && v.pay_max == null) return null;
    const cur = v.pay_currency || "GBP";
    const lo = v.pay_min != null ? `${cur} ${v.pay_min}` : "";
    const hi = v.pay_max != null ? `${v.pay_max}` : "";
    return `${lo}${hi ? ` – ${hi}` : ""} / ${v.pay_period ?? "year"}`;
  };

  return (
    <div className="space-y-4">
      {self && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <Switch checked={self.is_open_to_work} onCheckedChange={(c) => saveAvail(self.availability_date, c)} />
              <Label className="text-sm">I'm open to work</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Available from</Label>
              <Input
                type="date"
                value={self.availability_date ?? ""}
                onChange={(e) => setSelf({ ...self, availability_date: e.target.value || null })}
                onBlur={() => saveAvail(self.availability_date, self.is_open_to_work)}
                className="h-9 w-44"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(q)}
            placeholder="Search vacancies by title, skill, client, location…"
            className="pl-8"
          />
        </div>
        <Button onClick={() => search(q)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {rows.length === 0 && !loading && (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No open vacancies match.</CardContent></Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((v) => (
          <Card key={v.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{v.title}</div>
                  {v.client_name && <div className="text-xs text-muted-foreground">{v.client_name}</div>}
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{v.employment_type}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {v.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{v.location}</span>}
                {v.start_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{v.start_date}</span>}
                {v.arrangement && <span>{v.arrangement}</span>}
                {fmtPay(v) && <span>{fmtPay(v)}</span>}
              </div>
              {v.required_skills && v.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {v.required_skills.slice(0, 6).map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </div>
              )}
              {v.description && <p className="line-clamp-2 text-xs text-muted-foreground">{v.description}</p>}
              <div className="flex justify-end">
                {v.already_applied ? (
                  <Button size="sm" variant="outline" disabled className="gap-1"><Check className="h-3 w-3" /> Applied</Button>
                ) : (
                  <Button size="sm" onClick={() => apply(v)} disabled={busy === v.id}>
                    {busy === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "I'm interested"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
