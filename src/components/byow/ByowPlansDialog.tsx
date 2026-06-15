import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

type SubOpt = { key: string; name: string; price: string; per: string; prompts: number; blurb: string; featured?: boolean };
type TopupOpt = { key: string; name: string; price: string; per: string; prompts: number; rate: string; featured?: boolean };

const SUBS: SubOpt[] = [
  { key: "care",   name: "Care",   price: "£100",   per: "/month", prompts: 25,   blurb: "Light upkeep & copy tweaks" },
  { key: "studio", name: "Studio", price: "£500",   per: "/month", prompts: 180,  blurb: "Active iteration on a live site", featured: true },
  { key: "agency", name: "Agency", price: "£2,500", per: "/month", prompts: 1000, blurb: "Full delegated build pipeline" },
];

const TOPUPS: TopupOpt[] = [
  { key: "single",   name: "Single prompt",  price: "£2",     per: "each",     prompts: 1,    rate: "£2.00 / prompt" },
  { key: "pack100",  name: "100 prompts",    price: "£169",   per: "one-off",  prompts: 100,  rate: "£1.69 / prompt", featured: true },
  { key: "pack1000", name: "1000 prompts",   price: "£1,250", per: "one-off",  prompts: 1000, rate: "£1.25 / prompt" },
];


interface Props {
  siteId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab?: "subscription" | "topup";
  hasActiveSub?: boolean;
}

export default function ByowPlansDialog({ siteId, open, onOpenChange, defaultTab = "subscription", hasActiveSub }: Props) {
  const [tab, setTab] = useState<"subscription" | "topup">(defaultTab);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const checkout = async (kind: "subscription" | "topup", key: string) => {
    setLoadingKey(`${kind}:${key}`);
    try {
      const { data, error } = await supabase.functions.invoke("byow-create-checkout", {
        body: { site_id: siteId, kind, key },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-black text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-light">Plans &amp; prompt packs</DialogTitle>
          <DialogDescription className="text-white/50">
            Retainers include monthly prompts. Top-up packs add prompts that never expire.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
          {(["subscription", "topup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
                tab === t ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {t === "subscription" ? "Monthly retainer" : "Top-up prompts"}
            </button>
          ))}
        </div>

        {tab === "subscription" ? (
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            {SUBS.map((s) => (
              <div
                key={s.key}
                className={`rounded-xl border p-4 flex flex-col ${
                  s.featured ? "border-white/40 bg-white/5" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="text-sm uppercase tracking-wider text-white/60">{s.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-light">{s.price}</span>
                  <span className="text-xs text-white/40">{s.per}</span>
                </div>
                <div className="text-xs text-white/50 mt-1">{s.prompts} prompts / month</div>
                <p className="text-xs text-white/40 mt-2 flex-1">{s.blurb}</p>
                <Button
                  onClick={() => checkout("subscription", s.key)}
                  disabled={loadingKey !== null}
                  className="mt-4 w-full bg-white text-black hover:bg-white/90"
                >
                  {loadingKey === `subscription:${s.key}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : hasActiveSub ? "Switch to this" : "Subscribe"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3 mt-2">
            {TOPUPS.map((t) => (
              <div
                key={t.key}
                className={`rounded-xl border p-4 flex flex-col ${
                  t.featured ? "border-white/40 bg-white/5" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="text-sm uppercase tracking-wider text-white/60">{t.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-light">{t.price}</span>
                  <span className="text-xs text-white/40">{t.per}</span>
                </div>
                <div className="text-xs text-white/50 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {t.rate}
                </div>
                <p className="text-xs text-white/40 mt-2 flex-1">
                  {t.prompts === 1 ? "One extra prompt added instantly." : `${t.prompts} prompts added to your balance.`}
                </p>
                <Button
                  onClick={() => checkout("topup", t.key)}
                  disabled={loadingKey !== null}
                  className="mt-4 w-full bg-white text-black hover:bg-white/90"
                >
                  {loadingKey === `topup:${t.key}` ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : "Buy now"}
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-white/30 mt-3 text-center">
          Secure checkout via Stripe. Cancel anytime. Top-up prompts never expire.
        </p>
      </DialogContent>
    </Dialog>
  );
}
