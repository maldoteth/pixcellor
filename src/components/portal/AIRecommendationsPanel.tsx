import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2, Send, RefreshCw, CheckCircle2, XCircle, Clock, MapPin } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Cand = {
  id: string; full_name: string; email: string | null; headline: string | null;
  location: string | null; skills: string[] | null; status: string;
  right_to_work: string | null; years_experience: number | null;
  latitude?: number | null; longitude?: number | null; distance_km?: number | null;
  score: number; ai_score?: number; ai_reason?: string | null;
};

type Invite = { id: string; candidate_id: string; status: string; sent_at: string; responded_at: string | null };

export default function AIRecommendationsPanel({ vacancyId }: { vacancyId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cands, setCands] = useState<Cand[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [limit, setLimit] = useState<number>(25);
  const [minScore, setMinScore] = useState<number>(0);
  const [locFilter, setLocFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [rtwOnly, setRtwOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(0); // 0 = no limit (km)
  const [geocoding, setGeocoding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadInvites = useCallback(async () => {
    const { data } = await supabase.from("vacancy_invitations").select("id,candidate_id,status,sent_at,responded_at").eq("vacancy_id", vacancyId);
    setInvites((data as Invite[]) ?? []);
  }, [vacancyId]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  useEffect(() => {
    const ch = supabase.channel(`inv-${vacancyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vacancy_invitations", filter: `vacancy_id=eq.${vacancyId}` }, () => loadInvites())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [vacancyId, loadInvites]);

  const runRank = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("rank-vacancy-candidates", { body: { vacancy_id: vacancyId, limit } });
    setLoading(false);
    if (error) { toast({ title: "Ranking failed", description: error.message, variant: "destructive" }); return; }
    setCands(((data as any)?.candidates as Cand[]) ?? []);
    setSelected(new Set());
  }, [vacancyId, limit, toast]);

  const filtered = useMemo(() => {
    return cands.filter((c) => {
      const s = c.ai_score ?? c.score ?? 0;
      if (s < minScore) return false;
      if (locFilter && !(c.location ?? "").toLowerCase().includes(locFilter.toLowerCase())) return false;
      if (skillFilter) {
        const sk = skillFilter.toLowerCase();
        if (!(c.skills ?? []).some((x) => x.toLowerCase().includes(sk))) return false;
      }
      if (rtwOnly && !["uk_citizen", "settled"].includes(c.right_to_work ?? "")) return false;
      if (maxDistance > 0) {
        if (c.distance_km == null) return false;
        if (c.distance_km > maxDistance) return false;
      }
      return true;
    });
  }, [cands, minScore, locFilter, skillFilter, rtwOnly, maxDistance]);

  const inviteByCand = useMemo(() => {
    const m = new Map<string, Invite>();
    for (const i of invites) {
      const prev = m.get(i.candidate_id);
      if (!prev || new Date(i.sent_at) > new Date(prev.sent_at)) m.set(i.candidate_id, i);
    }
    return m;
  }, [invites]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);
    const ai_meta = cands.filter((c) => selected.has(c.id)).map((c) => ({ candidate_id: c.id, ai_score: c.ai_score ?? c.score, ai_reason: c.ai_reason }));
    const { data, error } = await supabase.functions.invoke("send-vacancy-invitations", {
      body: { vacancy_id: vacancyId, candidate_ids: Array.from(selected), custom_message: customMessage || null, ai_meta },
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    const results = (data as any)?.results ?? [];
    const ok = results.filter((r: any) => r.status === "sent").length;
    toast({ title: `Invitations sent`, description: `${ok}/${results.length} delivered to the email queue.` });
    setSendOpen(false); setCustomMessage(""); setSelected(new Set());
    loadInvites();
  };

  const statusBadge = (id: string) => {
    const inv = inviteByCand.get(id);
    if (!inv) return null;
    if (inv.status === "confirmed") return <Badge className="gap-1 bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" />confirmed</Badge>;
    if (inv.status === "declined") return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" />declined</Badge>;
    if (inv.status === "sent") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />sent</Badge>;
    return <Badge variant="outline">{inv.status}</Badge>;
  };

  const handleGeocode = async () => {
    setGeocoding(true);
    const { data, error } = await supabase.functions.invoke("geocode-locations", { body: { batch: true, limit: 200 } });
    setGeocoding(false);
    if (error) { toast({ title: "Geocode failed", description: error.message, variant: "destructive" }); return; }
    const r = (data as any)?.results ?? {};
    toast({ title: "Geocoding complete", description: `Candidates: +${r.candidate?.ok ?? 0} · Vacancies: +${r.vacancy?.ok ?? 0}` });
    if (cands.length) runRank();
  };

  return (
    <div className="border-t pt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" />AI recommendations</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleGeocode} disabled={geocoding} className="gap-1" title="Geocode any candidates/vacancies missing coordinates">
            {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}Geocode
          </Button>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={runRank} disabled={loading} className="gap-1">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {cands.length ? "Re-rank" : "Find candidates"}
          </Button>
        </div>
      </div>

      {cands.length > 0 && (
        <>
          <div className="grid gap-2 sm:grid-cols-5">
            <div>
              <Label className="text-xs">Min score</Label>
              <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value) || 0)} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Max distance (km)</Label>
              <Input type="number" min={0} value={maxDistance || ""} onChange={(e) => setMaxDistance(Number(e.target.value) || 0)} className="h-8" placeholder="any" />
            </div>
            <div><Label className="text-xs">Location</Label><Input value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className="h-8" placeholder="any" /></div>
            <div><Label className="text-xs">Skill</Label><Input value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="h-8" placeholder="any" /></div>
            <div className="flex items-end gap-2 pb-1"><Checkbox id={`rtw-${vacancyId}`} checked={rtwOnly} onCheckedChange={(c) => setRtwOnly(!!c)} /><Label htmlFor={`rtw-${vacancyId}`} className="text-xs">Right to work only</Label></div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button onClick={toggleAll} className="underline">{selected.size === filtered.length ? "Deselect all" : "Select all"} ({filtered.length})</button>
            <Button size="sm" disabled={selected.size === 0} onClick={() => setSendOpen(true)} className="gap-1"><Send className="h-3.5 w-3.5" />Email {selected.size || ""} to invite</Button>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
            {filtered.map((c) => {
              const s = c.ai_score ?? c.score ?? 0;
              return (
                <div key={c.id} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium truncate">{c.full_name}</span>
                        <Badge variant="secondary" className="text-[10px]">score {s}</Badge>
                        {statusBadge(c.id)}
                        {!c.email && <Badge variant="outline" className="text-[10px]">no email</Badge>}
                      </div>
                      {c.distance_km != null && (
                        <Badge variant="outline" className="gap-1 text-[10px] shrink-0 ml-auto">
                          <MapPin className="h-2.5 w-2.5" />{Math.round(c.distance_km * 0.621371)} mi
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.headline ?? "—"} {c.location ? `· ${c.location}` : ""}</div>
                    {c.ai_reason && <div className="text-xs text-muted-foreground mt-0.5 italic">"{c.ai_reason}"</div>}
                    {c.skills && c.skills.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.skills.slice(0, 6).map((sk) => <Badge key={sk} variant="outline" className="text-[10px]">{sk}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No candidates match the filters.</p>}
          </div>
        </>
      )}

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email {selected.size} candidate{selected.size === 1 ? "" : "s"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Each will receive a branded email with role details and Confirm / Decline buttons. Confirms auto-assign them to this vacancy.</p>
            <div>
              <Label>Custom message (optional)</Label>
              <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} placeholder="Add a personal note shown above the role details…" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending} className="gap-1">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send invitations</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
