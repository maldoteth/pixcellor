import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Globe2 } from "lucide-react";
import { toast } from "sonner";
import ByowPlansDialog from "@/components/byow/ByowPlansDialog";
import ByowBuilderPane from "@/components/byow/ByowBuilderPane";

interface Site {
  id: string;
  display_name: string;
  published_url: string | null;
  status: string;
}
interface Sub {
  site_id: string;
  tier: string;
  status: string;
  prompt_quota: number;
  prompts_used: number;
}

export default function ByowSitesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plansFor, setPlansFor] = useState<{ id: string; hasSub: boolean; tab: "subscription" | "topup" } | null>(null);

  const reload = async () => {
    setLoading(true);
    const [{ data: sitesData, error: sErr }, { data: subsData }] = await Promise.all([
      supabase.from("byow_sites").select("id, display_name, published_url, status").order("created_at"),
      supabase.from("byow_subscriptions").select("site_id, tier, status, prompt_quota, prompts_used"),
    ]);
    if (sErr) toast.error(sErr.message);
    setSites(sitesData || []);
    const subMap: Record<string, Sub> = {};
    (subsData || []).forEach((s: any) => { subMap[s.site_id] = s; });
    setSubs(subMap);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    if (searchParams.get("checkout") === "success") {
      toast.success("Payment received — your plan is now active.");
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      setSearchParams(next, { replace: true });
    }
    const siteParam = searchParams.get("site");
    if (siteParam) setSelectedId(siteParam);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedId) {
    return (
      <div className="space-y-3">
        <ByowBuilderPane siteId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {loading ? (
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading sites…</CardContent>
          </Card>
        ) : sites.length === 0 ? (
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-10 text-center">
              <Globe2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold">No managed sites yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start a "Build your own" site and we'll ship every change in hours.
              </p>
              <Button asChild variant="pricing" className="mt-5">
                <a href="/byow">See plans</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sites.map((site) => {
              const sub = subs[site.id];
              const remaining = sub ? Math.max(0, sub.prompt_quota - sub.prompts_used) : 0;
              const active = sub?.status === "active";
              return (
                <Card key={site.id} className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <button
                      onClick={() => setSelectedId(site.id)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="text-base font-semibold">{site.display_name}</div>
                      {site.published_url && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{site.published_url}</div>
                      )}
                    </button>
                    <div className="text-right text-xs shrink-0">
                      {sub ? (
                        <>
                          <div className="uppercase tracking-wider font-medium">{sub.tier}</div>
                          <div className="text-muted-foreground mt-0.5">{remaining} / {sub.prompt_quota} prompts left</div>
                        </>
                      ) : (
                        <div className="text-amber-500">No active plan</div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                      <Button size="sm" variant="pricing" onClick={() => setSelectedId(site.id)}>
                        Open builder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPlansFor({ id: site.id, hasSub: active, tab: active ? "topup" : "subscription" })}
                        className="gap-1.5"
                      >
                        <Sparkles className="h-3 w-3" />
                        {active ? "Buy prompts" : "Choose a plan"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      {plansFor && (
        <ByowPlansDialog
          siteId={plansFor.id}
          open={true}
          onOpenChange={(v) => { if (!v) setPlansFor(null); }}
          defaultTab={plansFor.tab}
          hasActiveSub={plansFor.hasSub}
        />
      )}
    </>
  );
}
