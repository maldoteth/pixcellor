import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  getCheckoutContext,
  hasFalloffConsent,
  markCheckoutPending,
  recordFalloff,
  updateCheckoutPendingSessionId,
} from "@/lib/checkoutTracking";
import BuyDetailsPrompt, { type BuyerDetails, type BuyerDomainChoice, type VisionBrief as DetailsVisionBrief } from "@/components/BuyDetailsPrompt";

type VisionBrief = {
  prompt?: string;
  imageUrl?: string | null;
  name?: string;
  email?: string;
  phone?: string;
  at?: number;
};

type PackageOption = {
  key: string;
  name: string;
  price: string;
  
  pages: string;
  priceId: string;
  bullets: string[];
  featured?: boolean;
};

const PACKAGE_OPTIONS: PackageOption[] = [
  {
    key: "fullWorks",
    name: "Full Works",
    price: "£169",
    pages: "Up to 3 pages",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    bullets: ["Industry-leading website", "Lifetime warranty", "Base animations", "All inclusive service"],
  },
  {
    key: "elite",
    name: "Elite",
    price: "£479",
    pages: "10 pages — 3D animated",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    bullets: ["Sites or web apps", "Unlimited revisions", "SEO & AEO optimisation", "4-7 day turnaround"],
    featured: true,
  },
];

type Stage = "choose" | "buyer";

export default function VisionPurchaseFlow() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<VisionBrief | null>(null);

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new Event("pixcellor:vision-purchase-open"));
    } else {
      window.dispatchEvent(new Event("pixcellor:vision-purchase-close"));
    }
  }, [open]);

  const [stage, setStage] = useState<Stage>("choose");
  const [selected, setSelected] = useState<PackageOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = () => {
      let b: VisionBrief | null = null;
      try {
        const raw = sessionStorage.getItem("pixcellor:vision-brief");
        if (raw) b = JSON.parse(raw) as VisionBrief;
      } catch { /* ignore */ }
      setBrief(b);
      setSelected(null);
      setStage("choose");
      setOpen(true);
    };
    window.addEventListener("pixcellor:open-vision-purchase", handler);
    return () => window.removeEventListener("pixcellor:open-vision-purchase", handler);
  }, []);

  const choose = (pkg: PackageOption) => {
    setSelected(pkg);
    setStage("buyer");
  };

  const handleConfirm = async (buyer: BuyerDetails, domain?: BuyerDomainChoice, vision?: DetailsVisionBrief) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await recordFalloff({
        event: "checkout_started",
        priceId: selected.priceId,
        mode: "payment",
        packageName: selected.name,
        billing: "one_time",
      });
      markCheckoutPending({ packageName: selected.name, billing: "one_time" });
      const domainPayload =
        domain && domain.kind === "buy"
          ? { domain: domain.domain, domainTopUpGbp: domain.topUpGbp }
          : {};
      const finalVision: DetailsVisionBrief | null = vision ?? (brief ? { prompt: brief.prompt ?? "", imageUrl: brief.imageUrl ?? null } : null);
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: selected.priceId,
          mode: "payment",
          packageName: selected.name,
          billing: "one_time",
          clientContext: hasFalloffConsent() ? getCheckoutContext() : undefined,
          buyer,
          visionBrief: finalVision && (finalVision.imageUrl || finalVision.prompt)
            ? { prompt: finalVision.prompt, imageUrl: finalVision.imageUrl ?? null }
            : undefined,
          ...domainPayload,
        },
      });
      if (error) throw error;
      if (data?.sessionId) updateCheckoutPendingSessionId(data.sessionId);
      if (data?.url) window.location.href = data.url;
    } catch (e) {
      console.error("vision checkout failed", e);
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  };

  const chooseBody = (
    <div className="flex flex-col gap-4">
      <p className="text-foreground/70 text-sm">
        Choose the package and we'll build out your sample for real.
      </p>
      {brief?.imageUrl && (
        <div className="border border-foreground/15 bg-black/40 max-h-[22vh] overflow-hidden rounded-md">
          <img src={brief.imageUrl} alt="Your sample" className="w-full block" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PACKAGE_OPTIONS.map((p) => (
          <motion.button
            key={p.key}
            type="button"
            onClick={() => choose(p)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`text-left rounded-lg border p-4 transition ${p.featured ? "border-foreground/40 bg-foreground/5" : "border-foreground/15 bg-foreground/[0.02] hover:border-foreground/30"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-foreground text-base font-semibold">{p.name}</span>
              {p.featured && <span className="text-[10px] uppercase tracking-wider text-foreground/60">Most popular</span>}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-foreground text-xl font-bold">{p.price}</span>
            </div>
            <p className="text-foreground/80 text-sm mt-1 font-medium">{p.pages}</p>
            <ul className="mt-2 space-y-1">
              {p.bullets.map((b) => (
                <li key={b} className="text-foreground/65 text-xs">• {b}</li>
              ))}
            </ul>
            <div className="mt-3">
              <Button type="button" variant="pricing" className="w-full h-10 font-semibold">
                Choose {p.name}
              </Button>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const title = stage === "choose" ? "Pick your package" : `${selected?.name ?? ""} — your details`;

  if (isMobile) {
    return (
      <>
        <Drawer open={open && stage === "choose"} onOpenChange={(o) => { if (!o) setOpen(false); }}>
          <DrawerContent className="carousel-label-glass border-foreground/10 text-foreground px-4 pb-6">
            <DrawerHeader>
              <DrawerTitle className="text-foreground text-center">{title}</DrawerTitle>
            </DrawerHeader>
            <AnimatePresence mode="wait">
              <motion.div key="choose" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {chooseBody}
              </motion.div>
            </AnimatePresence>
          </DrawerContent>
        </Drawer>
        <BuyDetailsPrompt
          open={open && stage === "buyer" && !!selected}
          onOpenChange={(o) => { if (!o) { setStage("choose"); } }}
          onConfirm={handleConfirm}
          submitting={submitting}
          showDomainStep
          packageName={selected?.name}
          billing="one_time"
          initialValues={{ name: brief?.name, email: brief?.email, phone: brief?.phone }}
          initialVision={brief?.imageUrl ? { prompt: brief.prompt ?? "", imageUrl: brief.imageUrl } : null}
          title={title}
        />
        {submitting && (
          <div className="fixed inset-0 z-[10050] bg-black/60 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={open && stage === "choose"} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="sm:max-w-[640px] carousel-label-glass border-foreground/10 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">{title}</DialogTitle>
          </DialogHeader>
          {chooseBody}
        </DialogContent>
      </Dialog>
      <BuyDetailsPrompt
        open={open && stage === "buyer" && !!selected}
        onOpenChange={(o) => { if (!o) { setStage("choose"); } }}
        onConfirm={handleConfirm}
        submitting={submitting}
        showDomainStep
        packageName={selected?.name}
        billing="one_time"
        initialValues={{ name: brief?.name, email: brief?.email, phone: brief?.phone }}
        initialVision={brief?.imageUrl ? { prompt: brief.prompt ?? "", imageUrl: brief.imageUrl } : null}
        title={title}
      />
      {submitting && (
        <div className="fixed inset-0 z-[10050] bg-black/60 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        </div>
      )}
    </>
  );
}
