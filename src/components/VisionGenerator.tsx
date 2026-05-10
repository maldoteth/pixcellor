import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X, Wand2, Download } from "lucide-react";
import GenerationProgress from "./GenerationProgress";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface VisionGeneratorProps {
  hidden?: boolean;
  chatOpen?: boolean;
}

type StepKey = "company" | "industry" | "vibe" | "colour" | "headline" | "sections";
type Stage = StepKey | "generating" | "result";

interface StepDef {
  key: StepKey;
  label: string;
  helper: string;
  placeholder: string;
  multiline?: boolean;
  prefix: string; // how it appears in the brief
}

const STEPS: StepDef[] = [
  {
    key: "company",
    label: "What's your company or brand name?",
    helper: "We'll brand the whole site around this — logo, hero, header.",
    placeholder: "e.g. Acme Florist",
    prefix: "Company / brand name",
  },
  {
    key: "industry",
    label: "What's your industry or what do you sell?",
    helper: "e.g. boutique London florist, SaaS for dentists, freelance photographer",
    placeholder: "Industry / what you sell",
    prefix: "Business",
  },
  {
    key: "vibe",
    label: "Pick a vibe",
    helper: "Minimal, bold, playful, luxury, techy, editorial — anything goes",
    placeholder: "e.g. minimal & luxury",
    prefix: "Vibe",
  },
  {
    key: "colour",
    label: "Primary brand colour(s)",
    helper: "Any colours, palettes or moods you'd love",
    placeholder: "e.g. sage green & cream",
    prefix: "Colours",
  },
  {
    key: "headline",
    label: "Hero headline idea",
    helper: "The main line at the top of the page (we'll polish it)",
    placeholder: "e.g. Bouquets that say it better",
    prefix: "Headline",
  },
  {
    key: "sections",
    label: "Sections you want",
    helper: "Pricing, gallery, testimonials, contact, FAQ…",
    placeholder: "e.g. hero, gallery, subscriptions, reviews, contact",
    multiline: true,
    prefix: "Sections",
  },
];

export default function VisionGenerator({ hidden = false, chatOpen = false }: VisionGeneratorProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("company");
  const [answers, setAnswers] = useState<Record<StepKey, string>>({
    company: "",
    industry: "",
    vibe: "",
    colour: "",
    headline: "",
    sections: "",
  });
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string>("");

  const reset = () => {
    setImageUrl(null);
    setGeneratedFor("");
    setAnswers({ company: "", industry: "", vibe: "", colour: "", headline: "", sections: "" });
    setStage("company");
  };

  const buildBrief = (data: Record<StepKey, string>) => {
    const parts: string[] = [];
    for (const s of STEPS) {
      const v = data[s.key].trim();
      if (v) parts.push(`${s.prefix}: ${v}`);
    }
    const company = data.company.trim();
    if (company) {
      parts.push(`The site must be branded as "${company}" — feature this name prominently in the hero, header/logo, and any branded elements.`);
    }
    return parts.join("\n");
  };

  const generate = async (finalAnswers: Record<StepKey, string>) => {
    const brief = buildBrief(finalAnswers);
    if (brief.length < 5) {
      toast.error("Tell us at least one detail about your dream landing page.");
      setStage("industry");
      return;
    }
    setBusy(true);
    setStage("generating");
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: brief },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error("No image returned");
      setImageUrl(data.imageUrl);
      setGeneratedFor(brief);
      setStage("result");
      toast.success("Your vision is ready ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate vision");
      setStage(STEPS[STEPS.length - 1].key);
    } finally {
      setBusy(false);
    }
  };

  const currentIndex = STEPS.findIndex((s) => s.key === stage);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : null;

  const goNext = () => {
    if (!currentStep) return;
    if (currentIndex === STEPS.length - 1) {
      void generate(answers);
    } else {
      setStage(STEPS[currentIndex + 1].key);
    }
  };

  const goSkip = () => {
    if (!currentStep) return;
    const cleared = { ...answers, [currentStep.key]: "" };
    setAnswers(cleared);
    if (currentIndex === STEPS.length - 1) {
      void generate(cleared);
    } else {
      setStage(STEPS[currentIndex + 1].key);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setStage(STEPS[currentIndex - 1].key);
  };

  const orderThisStyle = () => {
    try {
      sessionStorage.setItem(
        "pixcellor:vision-brief",
        JSON.stringify({ prompt: generatedFor, imageUrl, at: Date.now() }),
      );
    } catch { /* ignore */ }
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new Event("pixcellor:open-vision-purchase"));
    }, 200);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "pixcellor-vision.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const trigger = (
    <motion.button
      type="button"
      aria-label="Generate your dream landing page"
      onClick={() => setOpen((v) => !v)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`absolute right-28 top-4 z-[10000] flex items-center justify-center rounded-sm transition-opacity duration-200 md:right-[136px] md:top-6 lg:pointer-events-auto lg:opacity-100 ${hidden ? "pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-100" : "opacity-100"} ${isMobile && chatOpen ? "lg:flex hidden" : "flex"} ${isMobile ? "h-[34px] w-[34px]" : "h-[42px] w-[42px]"}`}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.1)",
      }}
    >
      <div
        className="absolute inset-1 rounded-sm opacity-60"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)" }}
      />
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <X className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        ) : (
          <motion.div key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }} className="relative z-10">
            <Sparkles className="h-4 w-4 text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );

  const stepBody = currentStep && (
    <motion.div
      key={currentStep.key}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <label className="text-foreground/70 text-xs uppercase tracking-wider">
          Step {currentIndex + 1} of {STEPS.length}
        </label>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s.key}
              className={`h-1 w-6 rounded-full ${i <= currentIndex ? "bg-foreground/70" : "bg-foreground/15"}`}
            />
          ))}
        </div>
      </div>
      <p className="text-foreground text-base font-semibold">{currentStep.label}</p>
      <p className="text-foreground/60 text-xs">{currentStep.helper}</p>

      {currentStep.multiline ? (
        <textarea
          autoFocus
          value={answers[currentStep.key]}
          onChange={(e) => setAnswers((a) => ({ ...a, [currentStep.key]: e.target.value }))}
          placeholder={currentStep.placeholder}
          rows={4}
          maxLength={1000}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={answers[currentStep.key]}
          onChange={(e) => setAnswers((a) => ({ ...a, [currentStep.key]: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goNext();
            }
          }}
          placeholder={currentStep.placeholder}
          maxLength={300}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
        />
      )}

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Button
          type="button"
          variant="pricing"
          onClick={currentIndex === 0 ? goSkip : goBack}
          className="h-11 font-semibold"
        >
          {currentIndex === 0 ? "Skip" : "Back"}
        </Button>
        <Button
          type="button"
          variant="pricing"
          onClick={goNext}
          className="h-11 font-semibold"
        >
          {currentIndex === STEPS.length - 1 ? "Generate ✨" : "Next →"}
        </Button>
      </div>
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={goSkip}
          className="text-xs text-foreground/60 hover:text-foreground underline-offset-4 hover:underline mt-1 self-center"
        >
          Skip this step
        </button>
      )}
    </motion.div>
  );

  const body = (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {stage === "generating" ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <GenerationProgress />
          </motion.div>
        ) : stage === "result" && imageUrl ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div tabIndex={-1} className="border border-border/40 bg-black/40 max-h-[55vh] overflow-auto outline-none focus:outline-none focus-visible:outline-none">
              <img src={imageUrl} alt="Your AI-generated landing page vision" className="w-full block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={orderThisStyle} className="w-full rounded-none sm:col-span-2">
                Order this style →
              </Button>
              <Button onClick={downloadImage} variant="outline" className="w-full rounded-none gap-2">
                <Download className="h-4 w-4" /> Save
              </Button>
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Try another description
            </button>
          </motion.div>
        ) : (
          stepBody
        )}
      </AnimatePresence>
      {stage !== "generating" && stage !== "result" && !busy && (
        <p className="text-[11px] text-muted-foreground/70 text-center flex items-center justify-center gap-1">
          <Wand2 className="h-3 w-3" /> Skip anything you're not sure about — we'll fill the gaps.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="border-border bg-background/95 px-4 pb-6 backdrop-blur-xl">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> See your dream site
              </DrawerTitle>
            </DrawerHeader>
            {body}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-background/95 backdrop-blur-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> See your dream landing page
            </DialogTitle>
            <DialogDescription>
              A few quick questions, then we'll generate a desktop concept of your site.
            </DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    </>
  );
}
