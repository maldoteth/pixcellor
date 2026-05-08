import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Lock, X, Code2, Megaphone, Briefcase, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLavaCursor } from "@/hooks/use-lava-cursor";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutContext, hasFalloffConsent, recordFalloff, markCheckoutPending, updateCheckoutPendingSessionId } from "@/lib/checkoutTracking";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import applePayLogo from "@/assets/apple-pay.png";
import gpayLogo from "@/assets/gpay-logo.png";
import BuyDetailsPrompt, { BuyerDetails } from "@/components/BuyDetailsPrompt";

const PACKAGES = {
  fullWorks: {
    name: "Full Works",
    price: "£150",
    rrp: "£375",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment" as const,
    features: ["Industry leading website", "Lifetime warranty", "Base animations ", "Up to 3 pages", "Fast Delivery"],
  },
  elite: {
    name: "Elite",
    price: "£500",
    rrp: "£1,500",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    mode: "payment" as const,
    featured: true,
    features: ["Sites or web apps", "Lifetime warranty", "Unlimited revisions", "SEO & AEO optimisation", "10 pages - 3D Animated", "4-5 day turnaround"],
  },
  retainer: {
    name: "Retainer",
    monthlyPriceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    yearlyPriceId: "price_1TSmBtBtUjwejeUwb8xPSvvf",
    mode: "subscription" as const,
    features: ["Outsource departments", "1 Month MVP Sprints", "Daily updates"],
  },
  enterprise: {
    name: "Enterprise",
    features: ["Larger scale operations", "Infrastructure and ecosystems", "Fictionalized Business Departments"],
  },
};

// Services info shown on the back of each desktop pricing card when flipped.
// Keys map to card slot: fullWorks=left, elite=center, retainer=right.
const SERVICE_BACKS = {
  fullWorks: {
    icon: Megaphone,
    title: "Marketing Solutions",
    action: "sales" as const,
    items: [
      { name: "Telesales campaigns", info: "Every call recorded on your custom client CRM with regular feedback and reviews." },
      { name: "GTM and Lead Generation", info: "From industry veterans with 9 figure market caps and multi 7 figure Q1 revenue background." },
      { name: "Broadcast SMS & WhatsApp", info: "We will help you create a buzz and get the word out with targeted messaging." },
      { name: "SEO & AEO optimisation", info: "Get ranked instantly with our team of experts stemming from some of the largest companies in the world." },
      { name: "Social media automation", info: "Generate leads while you sleep with automated social media management and save 90% on SMM salaries." },
      { name: "Paid ads & retargeting", info: "Leverage the latest techniques and strategies to maximise ROI with our advertising services." },
    ],
  },
  elite: {
    icon: Code2,
    title: "Tech Solutions",
    action: "pricing" as const,
    items: [
      { name: "Landing pages", info: "Save time and have our team take care of all your landing page needs." },
      { name: "Animated sites", info: "20k websites last year are now 1k websites if you speak to the right people — we are the right people." },
      { name: "Full web apps", info: "We've built custom solutions and full stack apps across tech, retail, web3 and more!" },
      { name: "Internal tools", info: "Custom systems, automations, agentic flows and more saving you potentially tens of thousands a year." },
      { name: "CRM systems", info: "Want a CRM that suits your exact needs powered by a swarm of AI agents that work to your will, saving you and your staff time and money while ensuring nothing is ever missed? Look no further." },
      { name: "E-commerce stores", info: "Our Shopify stores have scaled tens of thousands of sales on launch days and we're ready to help you get the same results." },
      { name: "Booking platforms", info: "Have a restaurant, salon or any service business? See how much money we can save you with a free consultation today." },
    ],
  },
  retainer: {
    icon: Briefcase,
    title: "Business Solutions",
    action: "sales" as const,
    items: [
      { name: "Recruitment & ATS systems" },
      { name: "Payroll & HR tooling" },
      { name: "AI integrations & agents" },
      { name: "Consultations and audits" },
      { name: "Custom analytics dashboards" },
      { name: "API & third-party integrations" },
      { name: "Product/project management" },
    ],
  },
} as const;

type ServiceItem = { name: string; info?: string };

function ServiceItemRow({ item }: { item: ServiceItem }) {
  return (
    <>
      <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
      <span className="flex-1">{item.name}</span>
      {item.info && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`More info about ${item.name}`}
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-64 text-xs leading-relaxed">
            {item.info}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

const ENTERPRISE_FIELDS = [
  { key: "email", label: "Email", placeholder: "you@company.com", inputMode: "email" },
  { key: "name", label: "Contact name", placeholder: "Your name", inputMode: "text" },
  { key: "company", label: "Company name", placeholder: "Company", inputMode: "text" },
  { key: "number", label: "Number", placeholder: "Phone number", inputMode: "tel" },
] as const;

type EnterpriseForm = Record<(typeof ENTERPRISE_FIELDS)[number]["key"], string>;

async function handleCheckout(priceId: string, mode: string, packageName: string, billing: string, buyer?: BuyerDetails) {
  await recordFalloff({ event: "checkout_started", priceId, mode, packageName, billing });
  markCheckoutPending({ packageName, billing });
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { priceId, mode, packageName, billing, clientContext: hasFalloffConsent() ? getCheckoutContext() : undefined, buyer },
  });
  if (error) throw error;
  if (data?.sessionId) updateCheckoutPendingSessionId(data.sessionId);
  if (data?.url) window.location.href = data.url;
}

function PaymentMethodIcons() {
  return (
    <div className="flex items-center justify-center gap-3.5 mt-2">
      {/* Visa */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.5"/>
        <text x="24" y="20" textAnchor="middle" fontSize="12" fontWeight="bold" fontStyle="italic" fill="currentColor" className="text-background">VISA</text>
      </svg>
      {/* Mastercard */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.5"/>
        <circle cx="20" cy="16" r="8" fill="currentColor" className="text-background" opacity="0.95"/>
        <circle cx="28" cy="16" r="8" fill="currentColor" className="text-background" opacity="0.7"/>
      </svg>
      {/* Amex */}
      <svg viewBox="0 0 48 32" className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7" fill="none">
        <rect width="48" height="32" rx="4" fill="currentColor" className="text-foreground" opacity="0.5"/>
        <text x="24" y="18" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="currentColor" className="text-background">AMEX</text>
      </svg>
      {/* Apple Pay */}
      <div className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
        <img src={applePayLogo} alt="Apple Pay" className="h-5 md:h-4 w-auto" style={{ filter: "brightness(0)", opacity: 1 }} />
      </div>
      {/* Google Pay */}
      <div className="w-[3.3rem] h-[2.15rem] md:w-11 md:h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)" }}>
        <img src={gpayLogo} alt="Google Pay" className="h-5 md:h-4 w-auto" style={{ filter: "brightness(0)", opacity: 1 }} />
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
        <span className="text-[10px] font-bold tracking-wide text-foreground">Stripe</span>
      </div>
      <PaymentMethodIcons />
    </div>
  );
}

function FreeSamplesBadge({ className = "" }: { className?: string }) {
  // 24-point starburst polygon
  const points = Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 40;
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  }).join(" ");
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "request" } }))}
      aria-label="Request a free sample — don't pay until you're happy"
      className={`group relative inline-flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${className}`}
      style={{ width: 130, height: 130, filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.45))" }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <polygon
          points={points}
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground) / 0.5)"
          strokeWidth="0.8"
        />
        <polygon
          points={points}
          fill="url(#fsGloss)"
          opacity="0.25"
        />
        <defs>
          <linearGradient id="fsGloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 leading-tight">
        <span className="text-[13px] font-extrabold tracking-wide text-foreground uppercase">Free</span>
        <span className="text-[13px] font-extrabold tracking-wide text-foreground uppercase -mt-0.5">Samples</span>
        <span className="text-[8px] font-medium text-foreground/70 uppercase tracking-wider mt-0.5">Don't pay till</span>
        <span className="text-[8px] font-medium text-foreground/70 uppercase tracking-wider">you're happy</span>
      </div>
    </button>
  );
}

function IntroductoryOfferText({ discount }: { discount: string }) {
  return <p className="mb-4 text-xs font-semibold text-foreground">Introductary offer — {discount} off</p>;
}

interface PackagesDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileTop?: boolean;
  hidden?: boolean;
  chatOpen?: boolean;
}

export default function PackagesDialog({ open, onOpenChange, mobileTop = false, hidden = false, chatOpen = false }: PackagesDialogProps = {}) {
  const isMobile = useIsMobile();
  useLavaCursor();
  const [internalOpen, setInternalOpen] = useState(false);
  const [spinIn, setSpinIn] = useState(false);
  const [initialServices, setInitialServices] = useState(false);
  // Mobile-only: track whether we entered via Services so closing pricing returns to services first
  const [mobileShowServices, setMobileShowServices] = useState(false);
  const [mobileCameFromServices, setMobileCameFromServices] = useState(false);
  const effectiveOpen = mobileTop ? internalOpen : open;

  useEffect(() => {
    if (!mobileTop || !isMobile) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ services?: boolean }>).detail;
      const services = Boolean(detail?.services);
      setInitialServices(services);
      setMobileShowServices(services);
      setMobileCameFromServices(services);
      setInternalOpen(true);
    };
    window.addEventListener("pixcellor:open-packages", handler);
    return () => window.removeEventListener("pixcellor:open-packages", handler);
  }, [mobileTop, isMobile]);

  // Desktop: capture spinIn / initial services intent
  useEffect(() => {
    if (isMobile) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ spinIn?: boolean; services?: boolean }>).detail;
      setSpinIn(Boolean(detail?.spinIn));
      setInitialServices(Boolean(detail?.services));
    };
    window.addEventListener("pixcellor:open-packages", handler);
    return () => window.removeEventListener("pixcellor:open-packages", handler);
  }, [isMobile]);

  // Reset transient flags on close
  useEffect(() => {
    if (!effectiveOpen) {
      setSpinIn(false);
      setInitialServices(false);
      setMobileShowServices(false);
      setMobileCameFromServices(false);
    }
  }, [effectiveOpen]);

  useEffect(() => {
    if (!mobileTop) return;
    window.dispatchEvent(new CustomEvent("pixcellor:packages-open-change", { detail: { open: effectiveOpen } }));
  }, [effectiveOpen, mobileTop]);

  if (mobileTop && !isMobile) return null;
  if (isMobile && !mobileTop) return null;

  const handleOpenChange = (next: boolean) => {
    if (mobileTop) {
      // Mobile: if user opened via Services then drilled into Pricing,
      // closing the drawer should go back to Services instead of closing.
      if (!next && mobileCameFromServices && !mobileShowServices) {
        setMobileShowServices(true);
        return;
      }
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const trigger = isMobile ? null : (
    <Button
      variant="pricing"
      className={`mb-6 h-auto w-[265px] px-8 py-3 text-base font-semibold ${hidden ? "hidden" : ""}`}
      aria-label="View our web development pricing"
    >
      Pricing
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={Boolean(effectiveOpen)} onOpenChange={handleOpenChange}>
          <DrawerContent
            className="h-[85vh] border-0 border-t-0 bg-background/95 backdrop-blur-xl [&>div:first-child]:hidden"
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>Our Pricing</DrawerTitle>
            </DrawerHeader>
            <MobileShell
              showServices={mobileShowServices}
              onShowServicesChange={(v) => {
                setMobileShowServices(v);
                if (v) setMobileCameFromServices(true);
              }}
              key={effectiveOpen ? "open" : "closed"}
            />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="top-[calc(54%-10px)] max-w-none w-auto h-auto border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden" style={{ background: "transparent", perspective: "1600px" }}>
        <DesktopShell spinIn={spinIn} initialServices={initialServices} />
      </DialogContent>
    </Dialog>
  );
}

function DesktopShell({ spinIn, initialServices = false }: { spinIn: boolean; initialServices?: boolean }) {
  const [servicesFlipped, setServicesFlipped] = useState(initialServices);
  useEffect(() => { setServicesFlipped(initialServices); }, [initialServices]);
  return (
    <>
      <motion.div
        initial={spinIn
          ? { opacity: 1, scale: 1, rotateY: -90 }
          : { opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
        transition={spinIn
          ? { duration: 0.3, ease: "linear" }
          : { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
      >
        <DesktopCards
          servicesFlipped={servicesFlipped}
          onServiceAction={(action) => {
            if (action === "pricing") setServicesFlipped(false);
            else window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
          }}
        />
      </motion.div>
      <div className="mt-6 -translate-y-[10px] flex justify-center gap-3">
        <Button
          variant="pricing"
          className="h-auto w-40 py-2 font-semibold [perspective:600px]"
          onClick={() => setServicesFlipped((v) => !v)}
        >
          <span className="relative inline-block w-full h-[1.25em] [transform-style:preserve-3d]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={servicesFlipped ? "pricing" : "services"}
                initial={{ rotateX: -90, opacity: 0 }}
                animate={{ rotateX: 0, opacity: 1 }}
                exit={{ rotateX: 90, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]"
              >
                {servicesFlipped ? "Pricing" : "Services"}
              </motion.span>
            </AnimatePresence>
          </span>
        </Button>
        <DialogClose asChild>
          <Button variant="pricing" className="h-auto w-40 py-2 font-semibold">
            Close
          </Button>
        </DialogClose>
      </div>
    </>
  );
}

function GlassBuyButton({ onClick, disabled, loading, label }: { onClick: () => void; disabled: boolean; loading: boolean; label: string }) {
  return (
    <Button
      variant="pricing"
      onClick={onClick}
      disabled={disabled}
      className="h-auto w-full py-2 font-semibold"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </Button>
  );
}

function EnterpriseDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EnterpriseForm>({ email: "", name: "", company: "", number: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const field = ENTERPRISE_FIELDS[step];

  const continueForm = async () => {
    const value = form[field.key].trim();
    if (!value) return;
    if (field.key === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    if (step < ENTERPRISE_FIELDS.length - 1) setStep((current) => current + 1);
    else {
      setSubmitting(true);
      const cleanForm = {
        email: form.email.trim().slice(0, 255),
        name: form.name.trim().slice(0, 100),
        company: form.company.trim().slice(0, 100),
        number: form.number.trim().slice(0, 50),
      };
      const { error: insertError } = await supabase.from("contact_inquiries").insert({
        email: cleanForm.email,
        name: cleanForm.name,
        message: `Enterprise enquiry\nCompany: ${cleanForm.company}\nNumber: ${cleanForm.number}`,
      });
      setSubmitting(false);
      if (insertError) {
        setError("Could not send this request. Please try again.");
        return;
      }
      // Enterprise enquiries stay in the inbox (contact_inquiries) and are NOT written
      // into the clients book. A contact only becomes a client when marked gold in the portal.
      setSubmitted(true);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) { setStep(0); setSubmitted(false); setSubmitting(false); setError(""); } }}>
      <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{submitted ? "Enterprise request received" : "Talk to sales"}</DrawerTitle>
          <DrawerDescription>{submitted ? "We'll be in touch shortly." : `Step ${step + 1} of ${ENTERPRISE_FIELDS.length}`}</DrawerDescription>
        </DrawerHeader>
        {submitted ? (
          <Button variant="pricing" onClick={() => onOpenChange(false)} className="h-12 w-full font-semibold">Done</Button>
        ) : (
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / ENTERPRISE_FIELDS.length) * 100}%` }} />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{field.label} *</label>
              <Input
                autoFocus
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") continueForm(); }}
                className="h-12 text-base"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => step > 0 ? setStep((current) => current - 1) : onOpenChange(false)}>
                {step > 0 ? "Back" : "Cancel"}
              </Button>
              <Button variant="pricing" onClick={continueForm} disabled={!form[field.key].trim() || submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : step === ENTERPRISE_FIELDS.length - 1 ? "Send" : "Next"}
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

type ServiceAction = "pricing" | "sales";
function DesktopCards({ servicesFlipped = false, onServiceAction }: { servicesFlipped?: boolean; onServiceAction?: (action: ServiceAction) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [retainerBilling, setRetainerBilling] = useState<"monthly" | "yearly">("monthly");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [retainerFlipped, setRetainerFlipped] = useState(false);
  const [retainerAutoFlipStopped, setRetainerAutoFlipStopped] = useState(false);
  const [pending, setPending] = useState<{ priceId: string; mode: string; key: string; packageName: string; billing: string } | null>(null);
  const [submittingBuyer, setSubmittingBuyer] = useState(false);

  useEffect(() => {
    if (enterpriseOpen || retainerAutoFlipStopped || servicesFlipped) return;
    const interval = window.setInterval(() => setRetainerFlipped((flipped) => !flipped), 5000);
    return () => window.clearInterval(interval);
  }, [enterpriseOpen, retainerAutoFlipStopped, servicesFlipped]);

  const flipRetainerManually = () => {
    setRetainerAutoFlipStopped(true);
    setRetainerFlipped((flipped) => !flipped);
  };

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

  const buy = (priceId: string, mode: string, key: string, packageName: string, billing: string) => {
    setPending({ priceId, mode, key, packageName, billing });
  };

  const confirmBuy = async (buyer: BuyerDetails) => {
    if (!pending) return;
    setSubmittingBuyer(true);
    setLoading(pending.key);
    try {
      await handleCheckout(pending.priceId, pending.mode, pending.packageName, pending.billing, buyer);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingBuyer(false);
      setLoading(null);
    }
  };

  return (
    <>
    <div className="relative" style={{ perspective: "1800px" }}>
    <motion.div
      animate={{ rotateY: servicesFlipped ? 180 : 0 }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ transformStyle: "preserve-3d", transformOrigin: "center center" }}
      className="relative"
    >
    <div
      className="relative flex items-center justify-center gap-6 h-full w-full md:max-lg:scale-[0.72] md:max-lg:origin-center lg:scale-100"
      style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
    >
      <FreeSamplesBadge className="absolute top-1/2 -right-16 -translate-y-1/2 z-30 rotate-[12deg]" />
      {/* Full Works - tilted left */}
      <motion.div data-lava-card
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 40, rotate: -6, scale: 1 }}
        animate={{ opacity: 1, y: 0, rotate: -6, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        className="relative z-10 w-[302px] rounded-none border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] overflow-hidden"
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
        <div className="mb-1 flex items-baseline gap-2">
          <div className="text-3xl font-extrabold text-foreground">£150</div>
          <span className="text-xs text-muted-foreground line-through">RRP £375</span>
        </div>
        <IntroductoryOfferText discount="60%" />
        <ul className="mb-6 space-y-2 text-base text-foreground">
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
      <motion.div data-lava-card
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 60, rotate: 0, scale: 1.1 }}
        animate={{ opacity: 1, y: -20, rotate: 0, scale: 1.1 }}
        whileHover={{ scale: 1.12 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        className="relative z-20 w-[336px] rounded-none border-2 border-foreground/30 bg-background/80 px-10 pt-10 pb-6 shadow-xl overflow-hidden"
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
          className="absolute top-[14px] left-1/2 -translate-x-1/2 rounded-sm border border-foreground/30 bg-foreground px-4 py-1 text-xs font-extrabold text-background shadow z-20 uppercase tracking-wider my-[10px]"
        >
          Most Popular
        </motion.div>
        <div className="relative z-10">
        <div className="mb-2 text-lg font-bold text-foreground">Elite</div>
        <div className="mb-1 flex items-baseline gap-2">
          <div className="text-5xl font-black text-foreground">£500</div>
          <span className="text-xs text-muted-foreground line-through">RRP £1,500</span>
        </div>
        <IntroductoryOfferText discount="67%" />
        <ul className="mb-6 space-y-2 text-lg text-foreground">
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
              PACKAGES.elite.priceId,
              PACKAGES.elite.mode,
              "elite",
              PACKAGES.elite.name,
              "One-time payment"
            )
          }
          disabled={!!loading}
          loading={loading === "elite"}
          label="Buy Now"
        />
        </div>
        <div className="mt-2.5"><StripeBadge /></div>
        </div>{/* close relative z-10 wrapper */}
      </motion.div>

      {/* Retainer / Enterprise flip card */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 40, rotate: 6, scale: 1 }}
        animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        className="relative z-10 w-[302px] min-h-[420px]"
        style={{ willChange: "transform", perspective: "1200px" }}
      >
        <motion.div
          animate={{ rotateY: retainerFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative min-h-[420px] rounded-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div data-lava-card
            className={`absolute inset-0 rounded-none border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] overflow-hidden ${retainerFlipped ? "pointer-events-none" : "pointer-events-auto"}`}
            style={{
              backfaceVisibility: "hidden",
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.3),
                inset 0 1px 1px rgba(255,255,255,0.15),
                inset 0 -1px 1px rgba(0,0,0,0.1)
              `,
            }}
          >
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="relative z-10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-lg font-bold text-foreground">Retainer</div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={flipRetainerManually}>Enterprise</Button>
              </div>
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
              <div className="mb-1 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-foreground">
                  {retainerBilling === "monthly" ? "£2,500/mo" : "£20,000/yr"}
                </div>
                <span className="text-xs text-muted-foreground line-through">RRP {retainerBilling === "monthly" ? "£4,000/mo" : "£40,000/yr"}</span>
              </div>
              <IntroductoryOfferText discount="52%" />
              <ul className="mb-6 space-y-2 text-base text-foreground">
                {PACKAGES.retainer.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {retainerBilling === "yearly" && (
                  <li className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    Billed yearly (save £2,400)
                  </li>
                )}
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

          <div data-lava-card
            className={`absolute inset-0 rounded-none border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] overflow-hidden ${retainerFlipped ? "pointer-events-auto" : "pointer-events-none"}`}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.3),
                inset 0 1px 1px rgba(255,255,255,0.15),
                inset 0 -1px 1px rgba(0,0,0,0.1)
              `,
            }}
          >
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="relative z-10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-lg font-bold text-foreground">Enterprise</div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={flipRetainerManually}>Retainer</Button>
              </div>
              <div className="mb-1 text-3xl font-extrabold text-foreground">Custom</div>
              <p className="text-xs text-muted-foreground mb-4">Built around your operation</p>
              <ul className="mb-6 space-y-2 text-base text-foreground">
                {PACKAGES.enterprise.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <GlassBuyButton onClick={() => setEnterpriseOpen(true)} disabled={false} loading={false} label="Talk to sales" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
    {/* Services back side - absolutely positioned, rotated 180° */}
    <div
      className="absolute inset-0"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      {/* Desktop (lg+): tilted 3-card row */}
      <div className="hidden lg:flex items-center justify-center gap-6 h-full w-full">
        <ServiceBackCard variant="side" rotate={-6} data={SERVICE_BACKS.fullWorks} onAction={onServiceAction} />
        <ServiceBackCard variant="center" rotate={0} data={SERVICE_BACKS.elite} onAction={onServiceAction} />
        <ServiceBackCard variant="side" rotate={6} data={SERVICE_BACKS.retainer} onAction={onServiceAction} />
      </div>
      {/* Tablet (md to lg): compact static 3-card row */}
      <div className="lg:hidden flex items-center justify-center gap-6 h-full w-full md:max-lg:scale-[0.72] md:max-lg:origin-center">
        <ServiceBackCard variant="side" rotate={-6} data={SERVICE_BACKS.fullWorks} onAction={onServiceAction} />
        <ServiceBackCard variant="center" rotate={0} data={SERVICE_BACKS.elite} onAction={onServiceAction} />
        <ServiceBackCard variant="side" rotate={6} data={SERVICE_BACKS.retainer} onAction={onServiceAction} />
      </div>
    </div>
    </motion.div>
    </div>
    <EnterpriseDrawer open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />
    <BuyDetailsPrompt
      open={!!pending}
      onOpenChange={(o) => { if (!o) setPending(null); }}
      onConfirm={confirmBuy}
      title={pending ? `Confirm – ${pending.packageName}` : "Confirm details"}
      submitting={submittingBuyer}
    />
    </>
  );
}

function ServiceBackCard({
  variant,
  rotate,
  data,
  onAction,
}: {
  variant: "side" | "center";
  rotate: number;
  data: { icon: typeof Code2; title: string; action: ServiceAction; items: readonly ServiceItem[] };
  onAction?: (action: ServiceAction) => void;
}) {
  const isCenter = variant === "center";
  const Icon = data.icon;
  const shadow = isCenter
    ? `0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.1)`
    : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.1)`;
  return (
    <div data-lava-card
      className={`relative ${isCenter ? "z-20 w-[336px] border-2 border-foreground/30 bg-background/80 px-8 py-12" : "z-10 w-[302px] border border-border/40 bg-background px-7 py-10"} rounded-none overflow-hidden flex flex-col`}
      style={{ transform: `rotate(${rotate}deg)${isCenter ? " translateY(-20px) scale(1.1)" : ""}`, boxShadow: shadow }}
    >
      <div className={`lava-blob ${isCenter ? "lava-blob-featured-1" : "lava-blob-1"}`} />
      <div className={`lava-blob ${isCenter ? "lava-blob-featured-2" : "lava-blob-2"}`} />
      <div className={`lava-blob ${isCenter ? "lava-blob-featured-3" : "lava-blob-3"}`} />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Icon className="h-5 w-5 text-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{data.title}</h3>
        </div>
        <ul className="space-y-2 text-base text-foreground flex-1 mb-6">
          {data.items.map((item) => (
            <li key={item.name} className="flex items-start gap-2">
              <ServiceItemRow item={item} />
            </li>
          ))}
        </ul>
        <Button
          variant="pricing"
          onClick={() => onAction?.(data.action)}
          className="h-auto w-full py-2 font-semibold"
        >
          {data.action === "pricing" ? "View Pricing" : "Talk to Sales"}
        </Button>
        {isCenter && data.action === "pricing" && (
          <div className="mt-2.5"><StripeBadge /></div>
        )}
      </div>
    </div>
  );
}

function MobileFreeSamplesCard() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "request" } }))}
      className="group relative w-full overflow-hidden rounded-none border border-foreground/40 bg-background p-5 text-left transition-transform active:scale-[0.99]"
      style={{ boxShadow: "0 0 0 1px hsl(var(--foreground) / 0.15), 0 8px 30px -10px hsl(var(--foreground) / 0.35)" }}
      aria-label="Request free samples — don't pay until you're happy"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, transparent 40%, transparent 60%, hsl(var(--foreground) / 0.08) 100%)",
        }}
      />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-foreground/30 bg-foreground/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
            Free
          </span>
          <h3 className="mt-2 text-lg font-bold text-foreground leading-tight">Free Samples</h3>
          <p className="text-xs text-foreground/70 mt-0.5">Don't pay till you're happy</p>
        </div>
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-foreground/30 bg-foreground/10 text-foreground font-bold text-xs uppercase tracking-wide">
          Try
        </div>
      </div>
    </button>
  );
}

function MobileShell({
  showServices,
  onShowServicesChange,
}: {
  showServices: boolean;
  onShowServicesChange: (v: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto mt-3 h-2 w-[100px] flex-shrink-0 rounded-full bg-muted" />
      <div className="relative flex-shrink-0 px-4 pt-3 pb-2 text-center">
        <h2 id="packages-dialog-title" className="tracking-tight text-2xl font-bold text-foreground text-center py-[10px]">
          {showServices ? "Our Services" : "Our Pricing"}
        </h2>
        {!showServices && <StripeBadge />}
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] [-webkit-overflow-scrolling:touch]">
        <div className="mb-4">
          <MobileFreeSamplesCard />
        </div>
        {showServices ? <MobileServicesList onShowPricing={() => onShowServicesChange(false)} /> : <MobileCards />}
      </div>
    </div>
  );
}

function MobileServicesList({ onShowPricing }: { onShowPricing: () => void }) {
  const groups = [SERVICE_BACKS.elite, SERVICE_BACKS.fullWorks, SERVICE_BACKS.retainer];
  const handleAction = (action: ServiceAction) => {
    if (action === "pricing") onShowPricing();
    else window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
  };
  return (
    <div className="grid grid-cols-1 gap-4">
      {groups.map((g) => {
        const Icon = g.icon;
        return (
          <div data-lava-card key={g.title} className="rounded-none p-5 flex flex-col border border-border bg-background relative overflow-hidden">
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{g.title}</h3>
              </div>
              <ul className="space-y-2 flex-1 mb-4">
                {g.items.map((item) => (
                  <li key={item.name} className="flex items-start gap-2 text-base text-foreground">
                    <ServiceItemRow item={item} />
                  </li>
                ))}
              </ul>
              <Button
                variant="pricing"
                onClick={() => handleAction(g.action)}
                className="h-auto w-full py-2 font-semibold"
              >
                {g.action === "pricing" ? "View Pricing" : "Talk to Sales"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [retainerBilling, setRetainerBilling] = useState<"monthly" | "yearly">("monthly");
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [retainerFlipped, setRetainerFlipped] = useState(false);
  const [retainerAutoFlipStopped, setRetainerAutoFlipStopped] = useState(false);
  const [pending, setPending] = useState<{ priceId: string; mode: string; key: string; packageName: string; billing: string } | null>(null);
  const [submittingBuyer, setSubmittingBuyer] = useState(false);

  useEffect(() => {
    if (enterpriseOpen || retainerAutoFlipStopped) return;
    const interval = window.setInterval(() => setRetainerFlipped((flipped) => !flipped), 5000);
    return () => window.clearInterval(interval);
  }, [enterpriseOpen, retainerAutoFlipStopped]);

  const flipRetainerManually = () => {
    setRetainerAutoFlipStopped(true);
    setRetainerFlipped((flipped) => !flipped);
  };

  const buy = (priceId: string, mode: string, key: string, packageName: string, billing: string) => {
    setPending({ priceId, mode, key, packageName, billing });
  };

  const confirmBuy = async (buyer: BuyerDetails) => {
    if (!pending) return;
    setSubmittingBuyer(true);
    setLoading(pending.key);
    try {
      await handleCheckout(pending.priceId, pending.mode, pending.packageName, pending.billing, buyer);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingBuyer(false);
      setLoading(null);
    }
  };

  return (
    <>
    <div className="grid grid-cols-1 gap-4">
      {/* Full Works */}
      <div data-lava-card className="rounded-none p-5 flex flex-col border border-border bg-background relative overflow-hidden">
        <div className="lava-blob lava-blob-1" />
        <div className="lava-blob lava-blob-2" />
        <div className="lava-blob lava-blob-3" />
        <div className="relative z-10 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-foreground">Full Works</h3>
        <div className="mt-3 mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-foreground">£150</span>
          <span className="text-xs text-muted-foreground line-through">RRP £375</span>
        </div>
        <IntroductoryOfferText discount="60%" />
        <ul className="space-y-2 flex-1 mb-4">
          {PACKAGES.fullWorks.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-base text-foreground">
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
      <div data-lava-card className="rounded-none p-5 flex flex-col border border-foreground/30 bg-background ring-1 ring-foreground/10 relative overflow-hidden">
        <div className="lava-blob lava-blob-featured-1" />
        <div className="lava-blob lava-blob-featured-2" />
        <div className="lava-blob lava-blob-featured-3" />
        <div className="relative z-10 flex flex-col flex-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2">
          Most Popular
        </span>
        <h3 className="text-lg font-bold text-foreground">Elite</h3>
        <div className="mt-3 mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-foreground">£500</span>
          <span className="text-xs text-muted-foreground line-through">RRP £1,500</span>
        </div>
        <IntroductoryOfferText discount="67%" />
        <ul className="space-y-2 flex-1 mb-4">
          {PACKAGES.elite.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-base text-foreground">
              <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <GlassBuyButton
          onClick={() =>
            buy(
              PACKAGES.elite.priceId,
              PACKAGES.elite.mode,
              "elite",
              PACKAGES.elite.name,
              "One-time payment"
            )
          }
          disabled={!!loading}
          loading={loading === "elite"}
          label="Buy Now"
        />
        </div>
      </div>

      {/* Retainer / Enterprise flip card */}
      <div className="relative min-h-[360px]" style={{ perspective: "1200px" }}>
        <motion.div
          animate={{ rotateY: retainerFlipped ? 180 : 0 }}
          transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative min-h-[360px] rounded-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div data-lava-card className={`absolute inset-0 rounded-none p-5 flex flex-col border border-border bg-background overflow-hidden ${retainerFlipped ? "pointer-events-none" : "pointer-events-auto"}`} style={{ backfaceVisibility: "hidden" }}>
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">Retainer</h3>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={flipRetainerManually}>Enterprise</Button>
              </div>
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
              <div className="mb-1 flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-foreground">
                  {retainerBilling === "monthly" ? "£2,500/mo" : "£20,000/yr"}
                </div>
                <span className="text-xs text-muted-foreground line-through">RRP {retainerBilling === "monthly" ? "£4,000/mo" : "£40,000/yr"}</span>
              </div>
              <IntroductoryOfferText discount="52%" />
              <ul className="space-y-2 flex-1 mb-4">
                {PACKAGES.retainer.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-base text-foreground">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {retainerBilling === "yearly" && (
                  <li className="flex items-start gap-2 text-base text-foreground">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    Billed yearly (save £2,400)
                  </li>
                )}
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

          <div data-lava-card className={`absolute inset-0 rounded-none p-5 flex flex-col border border-border bg-background overflow-hidden ${retainerFlipped ? "pointer-events-auto" : "pointer-events-none"}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={flipRetainerManually}>Retainer</Button>
              </div>
              <div className="mt-3 mb-1">
                <span className="text-3xl font-extrabold text-foreground">Custom</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Built around your operation</p>
              <ul className="space-y-2 flex-1 mb-4">
                {PACKAGES.enterprise.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-base text-foreground">
                    <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <GlassBuyButton onClick={() => setEnterpriseOpen(true)} disabled={false} loading={false} label="Talk to sales" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    <EnterpriseDrawer open={enterpriseOpen} onOpenChange={setEnterpriseOpen} />
    <BuyDetailsPrompt
      open={!!pending}
      onOpenChange={(o) => { if (!o) setPending(null); }}
      onConfirm={confirmBuy}
      title={pending ? `Confirm – ${pending.packageName}` : "Confirm details"}
      submitting={submittingBuyer}
    />
    </>
  );
}
