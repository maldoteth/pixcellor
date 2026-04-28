import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Lock, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutContext, hasFalloffConsent, recordFalloff } from "@/lib/checkoutTracking";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import applePayLogo from "@/assets/apple-pay.png";
import gpayLogo from "@/assets/gpay-logo.png";

const PACKAGES = {
  fullWorks: {
    name: "Full Works",
    price: "£150",
    rrp: "£500",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment" as const,
    features: ["Industry leading website", "Lifetime guarantee", "Custom design", "Up to 3 pages"],
  },
  elite: {
    name: "Elite",
    price: "£500",
    rrp: "£2,500",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    monthlyPriceId: "price_1TJrTNBtUjwejeUw3ihfpz98",
    mode: "payment" as const,
    featured: true,
    features: ["Cutting edge website", "Lifetime guarantee", "Unlimited edit requests", "SEO & AEO optimisation", "Up to 10 pages"],
  },
  retainer: {
    name: "Retainer",
    monthlyPriceId: "price_1TJrb1BtUjwejeUwrx9BnRXI",
    yearlyPriceId: "price_1TJrbOBtUjwejeUwOhhNyliQ",
    mode: "subscription" as const,
    features: ["Your own tech department", "Websites or full apps"],
  },
};

const glassButtonStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: `
    0 8px 32px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.3),
    inset 0 -1px 1px rgba(0,0,0,0.1)
  `,
} as const;

async function handleCheckout(priceId: string, mode: string, packageName: string, billing: string) {
  await recordFalloff({ event: "checkout_started", priceId, mode, packageName, billing });
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { priceId, mode, packageName, billing, clientContext: hasFalloffConsent() ? getCheckoutContext() : undefined },
  });
  if (error) throw error;
  if (data?.url) window.location.href = data.url;
}

function PaymentMethodIcons() {
  return (
    <div className="flex items-center justify-center gap-3.5 mt-2 opacity-30">
      {/* Visa */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.15"/>
        <text x="24" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fontStyle="italic" fill="currentColor" className="text-foreground">VISA</text>
      </svg>
      {/* Mastercard */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.15"/>
        <circle cx="20" cy="16" r="8" fill="currentColor" className="text-foreground" opacity="0.5"/>
        <circle cx="28" cy="16" r="8" fill="currentColor" className="text-foreground" opacity="0.3"/>
      </svg>
      {/* Amex */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.15"/>
        <text x="24" y="18" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="currentColor" className="text-foreground">AMEX</text>
      </svg>
      {/* Apple Pay */}
      <div className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
        <img src={applePayLogo} alt="Apple Pay" className="h-5 md:h-4 w-auto" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
      </div>
      {/* Google Pay */}
      <div className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
        <img src={gpayLogo} alt="Google Pay" className="h-5 md:h-4 w-auto" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
      </div>
    </div>
  );
}

function StripeBadge() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-1.5 mt-3 opacity-40">
        <Lock className="w-3 h-3 text-foreground" />
        <span className="text-[10px] text-foreground tracking-wide">Powered by</span>
        <span className="text-[10px] font-bold text-foreground tracking-wide">Stripe</span>
      </div>
      <PaymentMethodIcons />
      <div className="mt-3 text-center">
        <p className="text-[11px] font-semibold text-foreground tracking-wide opacity-80">
          28 Day Money Back Guarantee
        </p>
        <p className="text-[10px] text-muted-foreground tracking-wide opacity-70">
          Unhappy? Don't pay!
        </p>
      </div>
    </div>
  );
}

interface PackagesDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PackagesDialog({ open, onOpenChange }: PackagesDialogProps = {}) {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          className="mb-6 px-8 py-3 rounded-sm text-base font-semibold text-foreground flex items-center justify-center relative w-[276px]"
          aria-label="View our web development pricing"
          style={glassButtonStyle}
        >
          <div
            className="absolute inset-1 rounded-sm opacity-60 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
            }}
          />
          Pricing
        </button>
      </DialogTrigger>

      {isMobile ? (
        <DialogContent className="top-[54%] max-w-4xl bg-transparent border-none p-6 max-h-[88vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shadow-none [&>button]:hidden">
          <div className="fixed right-1 top-1 z-[60]">
            <DialogClose className="rounded-sm p-2 text-foreground/80 transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none px-[8px] my-0 mx-[15px]">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground text-center mb-2 -mt-[23px]">
              Our Pricing
            </DialogTitle>
            <StripeBadge />
          </DialogHeader>
          <MobileCards />
        </DialogContent>
      ) : (
        <DialogContent className="top-[54%] max-w-none w-auto h-auto border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden" style={{ background: "transparent" }}>
          <div className="absolute top-3 right-3 z-50">
            <DialogClose className="rounded-sm p-2 text-foreground/70 transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
          <DesktopCards />
        </DialogContent>
      )}
    </Dialog>
  );
}

function GlassBuyButton({ onClick, disabled, loading, label }: { onClick: () => void; disabled: boolean; loading: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-sm py-2 font-semibold text-foreground hover:brightness-125 transition disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden group"
      style={glassButtonStyle}
    >
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </button>
  );
}

function DesktopCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [retainerBilling, setRetainerBilling] = useState<"monthly" | "yearly">("monthly");
  const [eliteBilling, setEliteBilling] = useState<"one-time" | "monthly">("one-time");

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    e.currentTarget.style.setProperty("--mouse-x", x.toString());
    e.currentTarget.style.setProperty("--mouse-y", y.toString());
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mouse-x", "0");
    e.currentTarget.style.setProperty("--mouse-y", "0");
  }, []);

  const buy = async (priceId: string, mode: string, key: string, packageName: string, billing: string) => {
    setLoading(key);
    try {
      await handleCheckout(priceId, mode, packageName, billing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center justify-center gap-6 h-full w-full md:max-lg:scale-[0.72] md:max-lg:origin-center lg:scale-100">
      {/* Full Works - tilted left */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 40, rotate: -6, scale: 1 }}
        animate={{ opacity: 1, y: 0, rotate: -6, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        className="relative z-10 w-[302px] rounded-2xl border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] overflow-hidden"
        style={{
          willChange: "transform",
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.15),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        {/* Lava lamp blobs */}
        <div className="lava-blob lava-blob-1" />
        <div className="lava-blob lava-blob-2" />
        <div className="lava-blob lava-blob-3" />
        <div className="relative z-10">
        <div className="mb-2 text-lg font-bold text-foreground">Full Works</div>
        <div className="mb-1 text-3xl font-extrabold text-foreground">£150</div>
        <p className="text-xs text-muted-foreground line-through mb-4">RRP £500</p>
        <ul className="mb-6 space-y-2 text-base text-muted-foreground">
          {PACKAGES.fullWorks.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <GlassBuyButton
          onClick={() => buy(PACKAGES.fullWorks.priceId, PACKAGES.fullWorks.mode, "fullWorks", PACKAGES.fullWorks.name, "One-time payment")}
          disabled={!!loading}
          loading={loading === "fullWorks"}
          label="Buy Now"
        />
        </div>
      </motion.div>

      {/* Elite - center, elevated */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 60, rotate: 0, scale: 1.1 }}
        animate={{ opacity: 1, y: -20, rotate: 0, scale: 1.1 }}
        whileHover={{ scale: 1.12 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        className="relative z-20 w-[336px] rounded-3xl border-2 border-foreground/30 bg-background/80 px-10 py-14 shadow-xl overflow-hidden"
        style={{
          willChange: "transform",
          boxShadow: `
            0 12px 40px rgba(0,0,0,0.4),
            0 0 30px rgba(255,255,255,0.08),
            inset 0 1px 2px rgba(255,255,255,0.2),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        {/* Lava lamp blobs - featured */}
        <div className="lava-blob lava-blob-featured-1" />
        <div className="lava-blob lava-blob-featured-2" />
        <div className="lava-blob lava-blob-featured-3" />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute top-[29px] left-1/2 -translate-x-1/2 rounded-sm border border-foreground/30 bg-foreground px-4 py-1 text-xs font-extrabold text-background shadow z-20 uppercase tracking-wider"
        >
          Most Popular
        </motion.div>
        <div className="relative z-10">
        <div className="mb-2 text-lg font-bold text-foreground">Elite</div>
        
        {/* Billing toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setEliteBilling("one-time")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              eliteBilling === "one-time"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            One-time
          </button>
          <button
            onClick={() => setEliteBilling("monthly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              eliteBilling === "monthly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>

        <div className="mb-1 text-5xl font-black text-foreground">
          {eliteBilling === "one-time" ? "£500" : "£60/mo"}
        </div>
        <p className="text-xs text-muted-foreground line-through mb-4">
          {eliteBilling === "one-time" ? "RRP £2,500" : "RRP £250/mo"}
        </p>
        <ul className="mb-6 space-y-2 text-lg text-muted-foreground">
          {PACKAGES.elite.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-foreground mt-1 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-[18px]">
        <GlassBuyButton
          onClick={() =>
            buy(
              eliteBilling === "one-time"
                ? PACKAGES.elite.priceId
                : PACKAGES.elite.monthlyPriceId,
              eliteBilling === "one-time" ? "payment" : "subscription",
              "elite",
              PACKAGES.elite.name,
              eliteBilling === "one-time" ? "One-time payment" : "Monthly subscription"
            )
          }
          disabled={!!loading}
          loading={loading === "elite"}
          label={eliteBilling === "one-time" ? "Buy Now" : "Subscribe"}
        />
        </div>
        <div className="mt-2.5"><StripeBadge /></div>
        </div>{/* close relative z-10 wrapper */}
      </motion.div>

      {/* Retainer - tilted right */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 40, rotate: 6, scale: 1 }}
        animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        className="relative z-10 w-[302px] rounded-2xl border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] overflow-hidden"
        style={{
          willChange: "transform",
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.15),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        {/* Lava lamp blobs */}
        <div className="lava-blob lava-blob-1" />
        <div className="lava-blob lava-blob-2" />
        <div className="lava-blob lava-blob-3" />
        <div className="relative z-10">
        <div className="mb-2 text-lg font-bold text-foreground">Retainer</div>
        
        {/* Billing toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setRetainerBilling("monthly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              retainerBilling === "monthly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setRetainerBilling("yearly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              retainerBilling === "yearly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
          </button>
        </div>

        <div className="mb-1 text-3xl font-extrabold text-foreground">
          {retainerBilling === "monthly" ? "£1,200/mo" : "£12,000/yr"}
        </div>
        <p className="text-xs text-muted-foreground line-through mb-4">
          RRP {retainerBilling === "monthly" ? "£3,600/mo" : "£36,000/yr"}
        </p>
        <ul className="mb-6 space-y-2 text-base text-muted-foreground">
          {PACKAGES.retainer.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
          <li className="flex items-start gap-2">
            <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
            {retainerBilling === "monthly" ? "Daily turnarounds" : "Billed yearly (save £2,400)"}
          </li>
        </ul>
        <GlassBuyButton
          onClick={() =>
            buy(
              retainerBilling === "monthly"
                ? PACKAGES.retainer.monthlyPriceId
                : PACKAGES.retainer.yearlyPriceId,
              PACKAGES.retainer.mode,
              "retainer",
              PACKAGES.retainer.name,
              retainerBilling === "monthly" ? "Monthly subscription" : "Yearly subscription"
            )
          }
          disabled={!!loading}
          loading={loading === "retainer"}
          label="Subscribe"
        />
        </div>{/* close relative z-10 wrapper */}
      </motion.div>
    </div>
  );
}

function MobileCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [retainerBilling, setRetainerBilling] = useState<"monthly" | "yearly">("monthly");
  const [eliteBilling, setEliteBilling] = useState<"one-time" | "monthly">("one-time");

  const buy = async (priceId: string, mode: string, key: string, packageName: string, billing: string) => {
    setLoading(key);
    try {
      await handleCheckout(priceId, mode, packageName, billing);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Full Works */}
      <div className="rounded-xl p-5 flex flex-col border border-border bg-background relative overflow-hidden">
        <div className="lava-blob lava-blob-1" />
        <div className="lava-blob lava-blob-2" />
        <div className="lava-blob lava-blob-3" />
        <div className="relative z-10 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-foreground">Full Works</h3>
        <div className="mt-3 mb-1">
          <span className="text-3xl font-extrabold text-foreground">£150</span>
        </div>
        <p className="text-xs text-muted-foreground line-through mb-4">RRP £500</p>
        <ul className="space-y-2 flex-1 mb-4">
          {PACKAGES.fullWorks.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <GlassBuyButton
          onClick={() => buy(PACKAGES.fullWorks.priceId, PACKAGES.fullWorks.mode, "fullWorks", PACKAGES.fullWorks.name, "One-time payment")}
          disabled={!!loading}
          loading={loading === "fullWorks"}
          label="Buy Now"
        />
        </div>
      </div>

      {/* Elite */}
      <div className="rounded-xl p-5 flex flex-col border border-foreground/30 bg-background ring-1 ring-foreground/10 relative overflow-hidden">
        <div className="lava-blob lava-blob-featured-1" />
        <div className="lava-blob lava-blob-featured-2" />
        <div className="lava-blob lava-blob-featured-3" />
        <div className="relative z-10 flex flex-col flex-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2">
          Most Popular
        </span>
        <h3 className="text-lg font-bold text-foreground">Elite</h3>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <button
            onClick={() => setEliteBilling("one-time")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              eliteBilling === "one-time"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            One-time
          </button>
          <button
            onClick={() => setEliteBilling("monthly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              eliteBilling === "monthly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-extrabold text-foreground">
            {eliteBilling === "one-time" ? "£500" : "£60/mo"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-through mb-4">
          {eliteBilling === "one-time" ? "RRP £2,500" : "RRP £250/mo"}
        </p>
        <ul className="space-y-2 flex-1 mb-4">
          {PACKAGES.elite.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <GlassBuyButton
          onClick={() =>
            buy(
              eliteBilling === "one-time"
                ? PACKAGES.elite.priceId
                : PACKAGES.elite.monthlyPriceId,
              eliteBilling === "one-time" ? "payment" : "subscription",
              "elite",
              PACKAGES.elite.name,
              eliteBilling === "one-time" ? "One-time payment" : "Monthly subscription"
            )
          }
          disabled={!!loading}
          loading={loading === "elite"}
          label={eliteBilling === "one-time" ? "Buy Now" : "Subscribe"}
        />
        </div>
      </div>

      {/* Retainer */}
      <div className="rounded-xl p-5 flex flex-col border border-border bg-background relative overflow-hidden">
        <div className="lava-blob lava-blob-1" />
        <div className="lava-blob lava-blob-2" />
        <div className="lava-blob lava-blob-3" />
        <div className="relative z-10 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-foreground">Retainer</h3>
        <div className="flex items-center gap-2 mt-2 mb-3">
          <button
            onClick={() => setRetainerBilling("monthly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              retainerBilling === "monthly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setRetainerBilling("yearly")}
            className={`text-xs px-3 py-1 rounded-full transition font-semibold ${
              retainerBilling === "yearly"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
          </button>
        </div>
        <div className="mb-1">
          <span className="text-3xl font-extrabold text-foreground">
            {retainerBilling === "monthly" ? "£1,200/mo" : "£12,000/yr"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-through mb-4">
          RRP {retainerBilling === "monthly" ? "£3,600/mo" : "£36,000/yr"}
        </p>
        <ul className="space-y-2 flex-1 mb-4">
          {PACKAGES.retainer.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
          <li className="flex items-start gap-2 text-base text-muted-foreground">
            <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
            {retainerBilling === "monthly" ? "Daily turnarounds" : "Billed yearly (save £2,400)"}
          </li>
        </ul>
        <GlassBuyButton
          onClick={() =>
            buy(
              retainerBilling === "monthly"
                ? PACKAGES.retainer.monthlyPriceId
                : PACKAGES.retainer.yearlyPriceId,
              PACKAGES.retainer.mode,
              "retainer",
              PACKAGES.retainer.name,
              retainerBilling === "monthly" ? "Monthly subscription" : "Yearly subscription"
            )
          }
          disabled={!!loading}
          loading={loading === "retainer"}
          label="Subscribe"
        />
        </div>
      </div>
    </div>
  );
}
