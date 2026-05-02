import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SERVICES = {
  audit: {
    name: "Audit, Consultation & Shape Up",
    price: "£400",
    features: [
      "Full business & web audit",
      "Strategic consultation",
      "Action plan to shape up",
    ],
  },
  rebrand: {
    name: "Rebrand & Rebuild",
    price: "£800",
    rrp: "£1,500",
    features: [
      "Complete brand refresh",
      "Website rebuild",
      "New visual identity",
    ],
  },
  other: {
    name: "Other Business Services",
    price: "Talk to sales",
    features: [
      "Email marketing",
      "Telesales",
      "Recruitment",
      "AI agents",
    ],
  },
};

const ENQUIRY_FIELDS = [
  { key: "email", label: "Email", placeholder: "you@company.com", inputMode: "email" },
  { key: "name", label: "Contact name", placeholder: "Your name", inputMode: "text" },
  { key: "company", label: "Company name", placeholder: "Company", inputMode: "text" },
  { key: "number", label: "Number", placeholder: "Phone number", inputMode: "tel" },
] as const;

type EnquiryForm = Record<(typeof ENQUIRY_FIELDS)[number]["key"], string>;

interface ServicesDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ServicesDialog({ open, onOpenChange }: ServicesDialogProps = {}) {
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="pricing"
          className="mb-6 h-auto w-[265px] px-8 py-3 text-base font-semibold"
          aria-label="View our business services"
        >
          Services
        </Button>
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
              Our Services
            </DialogTitle>
          </DialogHeader>
          <MobileCards />
        </DialogContent>
      ) : (
        <DialogContent
          className="top-[54%] max-w-none w-auto h-auto border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden"
          style={{ background: "transparent" }}
        >
          <div className="absolute -top-[90px] right-3 z-50">
            <DialogClose className="rounded-sm p-2 text-foreground/70 transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none py-[8px] my-0 mx-[10px] mt-0 mb-0">
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

function GlassButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="pricing" onClick={onClick} className="h-auto w-full py-2 font-semibold">
      {label}
    </Button>
  );
}

function EnquiryDrawer({
  open,
  onOpenChange,
  serviceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EnquiryForm>({ email: "", name: "", company: "", number: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const field = ENQUIRY_FIELDS[step];

  const reset = () => {
    setStep(0);
    setSubmitted(false);
    setSubmitting(false);
    setError("");
    setForm({ email: "", name: "", company: "", number: "" });
  };

  const continueForm = async () => {
    const value = form[field.key].trim();
    if (!value) return;
    if (field.key === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    if (step < ENQUIRY_FIELDS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
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
      message: `Service enquiry: ${serviceName}\nCompany: ${cleanForm.company}\nNumber: ${cleanForm.number}`,
    });
    setSubmitting(false);
    if (insertError) {
      setError("Could not send this request. Please try again.");
      return;
    }
    void supabase.from("client_profiles").upsert(
      {
        email: cleanForm.email.toLowerCase(),
        name: cleanForm.name || null,
        company: cleanForm.company || null,
        notes: `Service enquiry: ${serviceName} · ${cleanForm.number || "no phone"}`,
      },
      { onConflict: "email" },
    );
    setSubmitted(true);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DrawerContent className="border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>{submitted ? "Request received" : serviceName}</DrawerTitle>
          <DrawerDescription>
            {submitted
              ? "We'll be in touch shortly."
              : `Step ${step + 1} of ${ENQUIRY_FIELDS.length}`}
          </DrawerDescription>
        </DrawerHeader>
        {submitted ? (
          <Button variant="pricing" onClick={() => onOpenChange(false)} className="h-12 w-full font-semibold">
            Done
          </Button>
        ) : (
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((step + 1) / ENQUIRY_FIELDS.length) * 100}%` }}
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">{field.label} *</label>
              <Input
                autoFocus
                inputMode={field.inputMode}
                placeholder={field.placeholder}
                value={form[field.key]}
                onChange={(e) => setForm((current) => ({ ...current, [field.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") continueForm();
                }}
                className="h-12 text-base"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => (step > 0 ? setStep((current) => current - 1) : onOpenChange(false))}
              >
                {step > 0 ? "Back" : "Cancel"}
              </Button>
              <Button
                variant="pricing"
                onClick={continueForm}
                disabled={!form[field.key].trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === ENQUIRY_FIELDS.length - 1 ? (
                  "Send"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function DesktopCards() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryService, setEnquiryService] = useState("");

  const openEnquiry = (name: string) => {
    setEnquiryService(name);
    setEnquiryOpen(true);
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

  return (
    <>
      <div className="flex items-center justify-center gap-6 h-full w-full md:max-lg:scale-[0.72] md:max-lg:origin-center lg:scale-100">
        {/* Audit */}
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 40, rotate: -6, scale: 1 }}
          animate={{ opacity: 1, y: 0, rotate: -6, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          className="relative z-10 w-[302px] rounded-none border border-border/40 bg-background px-8 py-10 overflow-hidden"
          style={{
            willChange: "transform",
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.1)`,
          }}
        >
          <div className="lava-blob lava-blob-1" />
          <div className="lava-blob lava-blob-2" />
          <div className="lava-blob lava-blob-3" />
          <div className="relative z-10">
            <div className="mb-2 text-lg font-bold text-foreground">{SERVICES.audit.name}</div>
            <div className="mb-4 text-3xl font-extrabold text-foreground">{SERVICES.audit.price}</div>
            <ul className="mb-6 space-y-2 text-base text-muted-foreground">
              {SERVICES.audit.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.audit.name)} label="Get started" />
          </div>
        </motion.div>

        {/* Rebrand - center, elevated */}
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 60, rotate: 0, scale: 1.1 }}
          animate={{ opacity: 1, y: -20, rotate: 0, scale: 1.1 }}
          whileHover={{ scale: 1.12 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
          className="relative z-20 w-[336px] rounded-none border-2 border-foreground/30 bg-background/80 px-10 py-14 shadow-xl overflow-hidden"
          style={{
            willChange: "transform",
            boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.1)`,
          }}
        >
          <div className="lava-blob lava-blob-featured-1" />
          <div className="lava-blob lava-blob-featured-2" />
          <div className="lava-blob lava-blob-featured-3" />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="absolute top-[29px] left-1/2 -translate-x-1/2 rounded-sm border border-foreground/30 bg-foreground px-4 py-1 text-xs font-extrabold text-background shadow z-20 uppercase tracking-wider"
          >
            Best Value
          </motion.div>
          <div className="relative z-10">
            <div className="mb-2 text-lg font-bold text-foreground">{SERVICES.rebrand.name}</div>
            <div className="mb-1 flex items-baseline gap-2">
              <div className="text-5xl font-black text-foreground">{SERVICES.rebrand.price}</div>
              <span className="text-xs text-muted-foreground line-through">RRP {SERVICES.rebrand.rrp}</span>
            </div>
            <p className="mb-4 text-xs font-semibold text-foreground">Introductary offer — 47% off</p>
            <ul className="mb-6 space-y-2 text-lg text-muted-foreground">
              {SERVICES.rebrand.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-foreground mt-1 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.rebrand.name)} label="Get started" />
          </div>
        </motion.div>

        {/* Other */}
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 40, rotate: 6, scale: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 6, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          className="relative z-10 w-[302px] rounded-none border border-border/40 bg-background px-8 py-10 overflow-hidden"
          style={{
            willChange: "transform",
            boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.1)`,
          }}
        >
          <div className="lava-blob lava-blob-1" />
          <div className="lava-blob lava-blob-2" />
          <div className="lava-blob lava-blob-3" />
          <div className="relative z-10">
            <div className="mb-2 text-lg font-bold text-foreground">{SERVICES.other.name}</div>
            <div className="mb-4 text-3xl font-extrabold text-foreground">{SERVICES.other.price}</div>
            <ul className="mb-6 space-y-2 text-base text-muted-foreground">
              {SERVICES.other.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.other.name)} label="Talk to sales" />
          </div>
        </motion.div>
      </div>
      <EnquiryDrawer open={enquiryOpen} onOpenChange={setEnquiryOpen} serviceName={enquiryService} />
    </>
  );
}

function MobileCards() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryService, setEnquiryService] = useState("");

  const openEnquiry = (name: string) => {
    setEnquiryService(name);
    setEnquiryOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {/* Audit */}
        <div className="rounded-none p-5 flex flex-col border border-border bg-background relative overflow-hidden">
          <div className="lava-blob lava-blob-1" />
          <div className="lava-blob lava-blob-2" />
          <div className="lava-blob lava-blob-3" />
          <div className="relative z-10 flex flex-col flex-1">
            <h3 className="text-lg font-bold text-foreground">{SERVICES.audit.name}</h3>
            <div className="mt-3 mb-4 text-3xl font-extrabold text-foreground">{SERVICES.audit.price}</div>
            <ul className="space-y-2 flex-1 mb-4">
              {SERVICES.audit.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
                  <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.audit.name)} label="Get started" />
          </div>
        </div>

        {/* Rebrand */}
        <div className="rounded-none p-5 flex flex-col border border-foreground/30 bg-background ring-1 ring-foreground/10 relative overflow-hidden">
          <div className="lava-blob lava-blob-featured-1" />
          <div className="lava-blob lava-blob-featured-2" />
          <div className="lava-blob lava-blob-featured-3" />
          <div className="relative z-10 flex flex-col flex-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground mb-2">
              Best Value
            </span>
            <h3 className="text-lg font-bold text-foreground">{SERVICES.rebrand.name}</h3>
            <div className="mt-3 mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-foreground">{SERVICES.rebrand.price}</span>
              <span className="text-xs text-muted-foreground line-through">RRP {SERVICES.rebrand.rrp}</span>
            </div>
            <p className="mb-4 text-xs font-semibold text-foreground">Introductary offer — 47% off</p>
            <ul className="space-y-2 flex-1 mb-4">
              {SERVICES.rebrand.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
                  <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.rebrand.name)} label="Get started" />
          </div>
        </div>

        {/* Other */}
        <div className="rounded-none p-5 flex flex-col border border-border bg-background relative overflow-hidden">
          <div className="lava-blob lava-blob-1" />
          <div className="lava-blob lava-blob-2" />
          <div className="lava-blob lava-blob-3" />
          <div className="relative z-10 flex flex-col flex-1">
            <h3 className="text-lg font-bold text-foreground">{SERVICES.other.name}</h3>
            <div className="mt-3 mb-4 text-3xl font-extrabold text-foreground">{SERVICES.other.price}</div>
            <ul className="space-y-2 flex-1 mb-4">
              {SERVICES.other.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-base text-muted-foreground">
                  <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <GlassButton onClick={() => openEnquiry(SERVICES.other.name)} label="Talk to sales" />
          </div>
        </div>
      </div>
      <EnquiryDrawer open={enquiryOpen} onOpenChange={setEnquiryOpen} serviceName={enquiryService} />
    </>
  );
}
