import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Globe2, Wand2, ExternalLink } from "lucide-react";
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

interface GeneratedSite {
  id: string;
  ref: string;
  display_name: string;
  status: string;
  published_at: string | null;
  created_at: string;
}

export default function ByowSitesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [genSites, setGenSites] = useState<GeneratedSite[]>([]);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plansFor, setPlansFor] = useState<{ id: string; hasSub: boolean; tab: "subscription" | "topup" } | null>(null);

  const reload = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: sitesData, error: sErr }, { data: subsData }, { data: genData, error: gErr }, { data: adminRow }] = await Promise.all([
      supabase.from("byow_sites").select("id, display_name, published_url, status").order("created_at"),
      supabase.from("byow_subscriptions").select("site_id, tier, status, prompt_quota, prompts_used"),
      supabase
        .from("byow_generated_sites")
        .select("id, ref, display_name, status, published_at, created_at")
        .order("created_at", { ascending: false }),
      user
        ? supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    if (sErr) toast.error(sErr.message);
    if (gErr) console.warn(gErr.message);
    setSites(sitesData || []);
    setGenSites(genData || []);
    const subMap: Record<string, Sub> = {};
    (subsData || []).forEach((s: any) => { subMap[s.site_id] = s; });
    setSubs(subMap);
    const isAdmin = (adminRow?.length ?? 0) > 0;
    setHasActiveSub(isAdmin || (subsData || []).some((s: any) => s.status === "active"));
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

  const freeUsed = !hasActiveSub && genSites.length >= 1;

  return (
    <>
      <div className="space-y-6">
        {loading ? (
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading sites…</CardContent>
          </Card>
        ) : (
          <>
            {/* AI-generated sites (BYOW wizard) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sites you generated</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {hasActiveSub
                      ? `${genSites.length} site${genSites.length === 1 ? "" : "s"}`
                      : `${genSites.length} / 1 free`}
                  </span>
                  <Button asChild size="sm" variant={freeUsed ? "outline" : "pricing"}>
                    <Link to="/byow#create">{freeUsed ? "Upgrade to create more" : "Create a site"}</Link>
                  </Button>
                </div>
              </div>

              {genSites.length === 0 ? (
                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-8 text-center">
                    <Wand2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <h4 className="mt-3 text-base font-semibold">No generated sites yet</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Free accounts can generate 1 site to try it out.
                    </p>
                    <Button asChild size="sm" variant="pricing" className="mt-4">
                      <Link to="/byow#create">Create your first site</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {genSites.map((g) => (
                    <Card key={g.id} className="border-border bg-card/70 backdrop-blur-xl">
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <Link to={`/s/${g.ref}`} className="text-left min-w-0 flex-1 hover:opacity-80 transition-opacity">
                          <div className="text-base font-semibold truncate">{g.display_name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            pixcellor.com/s/{g.ref}
                            <span className="ml-2 uppercase tracking-wider">{g.status}</span>
                          </div>
                        </Link>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a href={`/s/${g.ref}`} target="_blank" rel="noreferrer" className="gap-1.5">
                              <ExternalLink className="h-3 w-3" /> Preview
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="pricing">
                            <Link to={`/byow/edit/${g.ref}`}>Edit</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Managed (human-built) sites */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Managed sites</h3>
              </div>
              {sites.length === 0 ? (
                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-8 text-center">
                    <h4 className="text-base font-semibold">No managed sites yet</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hire our team to ship every change in hours on your own site.
                    </p>
                    <Button asChild size="sm" variant="pricing" className="mt-4">
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
                          <button onClick={() => setSelectedId(site.id)} className="text-left min-w-0 flex-1">
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
            </section>
          </>
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
