import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DomainPicker, { DomainChoice } from "@/components/DomainPicker";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutContext } from "@/lib/checkoutTracking";

function useIsMobileOrTablet() {
  const [match, setMatch] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const handler = (e: MediaQueryListEvent) => setMatch(e.matches);
    mq.addEventListener("change", handler);
    setMatch(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return match;
}

export type BuyerDetails = {
  company: string;
  name: string;
  email: string;
  phone: string;
};

export type BuyerDomainChoice = DomainChoice;

type Step = "company" | "name" | "email" | "phone" | "domain";

const FIELD_STEPS: Exclude<Step, "domain">[] = ["company", "name", "email", "phone"];

const schemas: Record<Exclude<Step, "domain">, z.ZodString> = {
  company: z.string().trim().min(1, "Please enter your company or website").max(120),
  name: z.string().trim().min(1, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Numbers only"),
};


const labels: Record<Exclude<Step, "domain">, { prompt: (name: string) => string; placeholder: string; type: string; inputMode: "text" | "email" | "tel" }> = {
  company: { prompt: () => "Company or website name?", placeholder: "Enter name", type: "text", inputMode: "text" },
  name: { prompt: () => "Your full name?", placeholder: "Jane Doe", type: "text", inputMode: "text" },
  email: { prompt: (n) => `Hi ${n.split(" ")[0] || "there"}, what's your email?`, placeholder: "you@example.com", type: "email", inputMode: "email" },
  phone: { prompt: () => "Mobile number? (optional)", placeholder: "+44 7000 000000 (optional)", type: "tel", inputMode: "tel" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: BuyerDetails, domain?: BuyerDomainChoice) => Promise<void> | void;
  title?: string;
  submitting?: boolean;
  /** When false (subscriptions), skip the domain step entirely. Defaults to true. */
  showDomainStep?: boolean;
  /** Package name for tracking visitors who reach the domain step. */
  packageName?: string;
  billing?: string;
}

const BuyDetailsPrompt = ({ open, onOpenChange, onConfirm, title = "Confirm details", submitting = false, showDomainStep = true, packageName, billing }: Props) => {
  const isMobile = useIsMobileOrTablet();
  const STEPS: Step[] = showDomainStep ? [...FIELD_STEPS, "domain"] : [...FIELD_STEPS];
  const [step, setStep] = useState<Step>("company");
  const [values, setValues] = useState<BuyerDetails>({ company: "", name: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [trackedKey, setTrackedKey] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("company");
      setError(null);
      setTrackedKey(null);
    }
  }, [open]);

  // When the user reaches the domain step, save them as a contact + record falloff.
  // Fire-and-forget; only once per (email, package) combo per open session.
  useEffect(() => {
    if (step !== "domain") return;
    const email = values.email.trim().toLowerCase();
    const phone = values.phone.trim();
    if (!email && !phone) return;
    const key = `${email}|${phone}|${packageName ?? ""}`;
    if (trackedKey === key) return;
    setTrackedKey(key);
    try {
      const ctx = getCheckoutContext();
      void supabase.functions.invoke("track-domain-step", {
        body: {
          name: values.name.trim(),
          email,
          phone,
          company: values.company.trim(),
          packageName: packageName ?? "",
          billing: billing ?? "",
          visitorId: ctx.clientId,
          sessionId: ctx.sessionId,
          pageUrl: ctx.pageUrl,
        },
      });
    } catch (err) {
      console.warn("track-domain-step failed", err);
    }
  }, [step, values, packageName, billing, trackedKey]);

  const idx = STEPS.indexOf(step);
  const isLast = idx === STEPS.length - 1;
  const isDomain = step === "domain";
  const meta = isDomain ? null : labels[step];

  const handleNext = async () => {
    setError(null);
    if (isDomain) return; // domain step uses its own buttons
    const value = values[step as Exclude<Step, "domain">];
    const r = schemas[step as Exclude<Step, "domain">].safeParse(value);
    if (!r.success) return setError(r.error.issues[0].message);
    if (!isLast) {
      setStep(STEPS[idx + 1]);
      return;
    }
    // Last step is fields-only (no domain step) — confirm with no domain.
    await onConfirm({
      company: values.company.trim(),
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    });
  };

  const handleDomainChoice = async (choice: BuyerDomainChoice) => {
    await onConfirm(
      {
        company: values.company.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      },
      choice,
    );
  };

  const handleBack = () => {
    setError(null);
    if (idx === 0) onOpenChange(false);
    else setStep(STEPS[idx - 1]);
  };

  const content = (
    <div className="flex flex-col gap-4 px-1 pb-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3"
        >
          {isDomain ? (
            <DomainPicker onChoose={handleDomainChoice} onBack={handleBack} submitting={submitting} />
          ) : (
            <>
              <label className="text-foreground/70 text-xs uppercase tracking-wider">
                {meta!.prompt(values.name)}
              </label>
              <input
                autoFocus
                type={meta!.type}
                inputMode={meta!.inputMode}
                value={values[step as Exclude<Step, "domain">]}
                onChange={(e) => {
                  const v = e.target.value;
                  setValues((prev) => ({ ...prev, [step]: v }));
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                placeholder={meta!.placeholder}
                className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
                maxLength={step === "phone" ? 30 : 200}
                disabled={submitting}
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 h-12 font-semibold"
                >
                  {idx === 0 ? "Cancel" : "Back"}
                </Button>
                <Button
                  type="button"
                  variant="pricing"
                  onClick={handleNext}
                  disabled={submitting}
                  className="flex-1 h-12 font-semibold"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isLast ? (
                    "Confirm & Pay"
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="carousel-label-glass border-foreground/10 text-foreground max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground text-center">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto carousel-label-glass border-foreground/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default BuyDetailsPrompt;
