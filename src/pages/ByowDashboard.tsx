import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

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
      <Helmet>
        <title>Your sites — Pixcellor Client Portal</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-light tracking-tight">Pixcellor<sup className="text-[10px]">™</sup></div>
            <div className="text-xs text-white/40">Client portal</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="hidden sm:inline">{email}</span>
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
                return (
                  <Link
                    key={site.id}
                    to={`/byow/site/${site.id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-5 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-lg">{site.display_name}</div>
                        {site.published_url && (
                          <div className="text-xs text-white/40 truncate mt-0.5">{site.published_url}</div>
                        )}
                      </div>
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
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
