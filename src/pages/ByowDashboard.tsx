import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ByowPlansDialog from "@/components/byow/ByowPlansDialog";
import { Sparkles } from "lucide-react";


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
  current_period_end: string | null;
}

export default function ByowDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [subs, setSubs] = useState<Record<string, Sub>>({});
  const [email, setEmail] = useState<string>("");
  const [plansFor, setPlansFor] = useState<{ id: string; hasSub: boolean; tab: "subscription" | "topup" } | null>(null);


  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/byow/login", { replace: true });
        return;
      }
      setEmail(session.session.user.email || "");

      const [{ data: sitesData, error: sErr }, { data: subsData }] = await Promise.all([
        supabase.from("byow_sites").select("id, display_name, published_url, status").order("created_at"),
        supabase.from("byow_subscriptions").select("site_id, tier, status, prompt_quota, prompts_used, current_period_end"),
      ]);
      if (sErr) toast.error(sErr.message);
      setSites(sitesData || []);
      const subMap: Record<string, Sub> = {};
      (subsData || []).forEach((s: any) => { subMap[s.site_id] = s; });
      setSubs(subMap);
      setLoading(false);
    })();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/byow/login", { replace: true });
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-light tracking-tight">Pixcellor<sup className="text-[10px]">™</sup></div>
            <div className="text-xs text-white/40">Client portal</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="hidden sm:inline">{email}</span>
            <button
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("create-billing-portal");
                  if (error) throw error;
                  if (!data?.url) throw new Error("No portal URL");
                  window.open(data.url, "_blank", "noopener,noreferrer");
                } catch (e: any) {
                  toast.error(e.message || "No active subscription yet.");
                }
              }}
              className="hover:text-white"
            >
              Billing
            </button>
            <button onClick={signOut} className="hover:text-white">Sign out</button>
          </div>

        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-light mb-1">Your sites</h1>
          <p className="text-sm text-white/50 mb-8">Pick a site to chat with us and request edits.</p>

          {loading ? (
            <div className="text-white/40 text-sm">Loading…</div>
          ) : sites.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-lg mb-2">No sites yet</div>
              <p className="text-sm text-white/50 mb-4">
                We haven't linked any sites to your account. If you're already a Pixcellor client, contact us and we'll set you up.
              </p>
              <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <a href="/get-started">Contact us</a>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sites.map((site) => {
                const sub = subs[site.id];
                const remaining = sub ? Math.max(0, sub.prompt_quota - sub.prompts_used) : 0;
                const active = sub?.status === "active";
                return (
                  <div
                    key={site.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link to={`/byow/site/${site.id}`} className="min-w-0 flex-1">
                        <div className="text-lg">{site.display_name}</div>
                        {site.published_url && (
                          <div className="text-xs text-white/40 truncate mt-0.5">{site.published_url}</div>
                        )}
                      </Link>
                      <div className="text-right text-xs shrink-0">
                        {sub ? (
                          <>
                            <div className="text-white/70 uppercase tracking-wider">{sub.tier}</div>
                            <div className="text-white/40 mt-0.5">{remaining} / {sub.prompt_quota} prompts left</div>
                          </>
                        ) : (
                          <div className="text-amber-400/80">No active plan</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/byow/site/${site.id}`}
                        className="text-xs px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90"
                      >
                        Open builder
                      </Link>
                      <button
                        onClick={() => setPlansFor({ id: site.id, hasSub: active, tab: active ? "topup" : "subscription" })}
                        className="text-xs px-3 py-1.5 rounded-md border border-white/20 text-white hover:bg-white/10 flex items-center gap-1.5"
                      >
                        <Sparkles className="h-3 w-3" />
                        {active ? "Buy prompts" : "Choose a plan"}
                      </button>
                      {active && (
                        <button
                          onClick={() => setPlansFor({ id: site.id, hasSub: true, tab: "subscription" })}
                          className="text-xs px-3 py-1.5 rounded-md border border-white/10 text-white/60 hover:text-white"
                        >
                          Change plan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
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

