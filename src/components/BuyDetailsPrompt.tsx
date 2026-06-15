import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Loader2, Wand2 } from "lucide-react";
import GenerationProgress from "./GenerationProgress";
import BrandKit from "@/components/BrandKit";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DomainPicker, { DomainChoice } from "@/components/DomainPicker";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutContext } from "@/lib/checkoutTracking";
import { SUGGESTIONS as VISION_SUGGESTIONS } from "@/components/VisionGenerator";

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

export type VisionBrief = {
  prompt: string;
  imageUrl: string | null;
};

type FieldStep = "company" | "name" | "email" | "phone";
type VisionStep =
  | "vision-intro"
  | "vision-industry"
  | "vision-vibe"
  | "vision-colour"
  | "vision-headline"
  | "vision-sections"
  | "vision-generating"
  | "vision-result"
  | "vision-refine";
type Step = FieldStep | VisionStep | "domain";

const FIELD_STEPS: FieldStep[] = ["company", "name", "email", "phone"];

const schemas: Record<FieldStep, z.ZodString> = {
  company: z.string().trim().min(1, "Please enter your company or website").max(120),
  name: z.string().trim().min(1, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Numbers only"),
};

const labels: Record<FieldStep, { prompt: (name: string) => string; placeholder: string; type: string; inputMode: "text" | "email" | "tel" }> = {
  company: { prompt: () => "Company or website name?", placeholder: "Enter name", type: "text", inputMode: "text" },
  name: { prompt: () => "Your full name?", placeholder: "Jane Doe", type: "text", inputMode: "text" },
  email: { prompt: (n) => `Hi ${n.split(" ")[0] || "there"}, what's your email?`, placeholder: "you@example.com", type: "email", inputMode: "email" },
  phone: { prompt: () => "Mobile number? (optional)", placeholder: "+44 7000 000000 (optional)", type: "tel", inputMode: "tel" },
};

type VisionAnswerKey = "industry" | "vibe" | "colour" | "headline" | "sections";
const VISION_QUESTIONS: { key: VisionAnswerKey; step: VisionStep; label: string; helper: string; placeholder: string; multiline?: boolean; prefix: string }[] = [
  { key: "industry", step: "vision-industry", label: "What's your industry or what do you sell?", helper: "e.g. boutique London florist, SaaS for dentists", placeholder: "Industry / what you sell", prefix: "Business" },
  { key: "vibe", step: "vision-vibe", label: "Pick a vibe", helper: "Minimal, bold, playful, luxury, techy, editorial…", placeholder: "e.g. minimal & luxury", prefix: "Vibe" },
  { key: "colour", step: "vision-colour", label: "Primary brand colour(s)", helper: "Any colours, palettes or moods", placeholder: "e.g. sage green & cream", prefix: "Colours" },
  { key: "headline", step: "vision-headline", label: "Hero headline idea", helper: "We'll polish whatever you give us", placeholder: "e.g. Bouquets that say it better", prefix: "Headline" },
  { key: "sections", step: "vision-sections", label: "Sections you want", helper: "Pricing, gallery, testimonials, contact, FAQ…", placeholder: "e.g. hero, gallery, reviews, contact", multiline: true, prefix: "Sections" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (details: BuyerDetails, domain?: BuyerDomainChoice, vision?: VisionBrief) => Promise<void> | void;
  title?: string;
  submitting?: boolean;
  /** When false (subscriptions), skip the domain + vision step entirely. Defaults to true. */
  showDomainStep?: boolean;
  /** Package name for tracking visitors who reach the domain step. */
  packageName?: string;
  billing?: string;
  /** Optional pre-filled buyer details — filled fields are skipped in the wizard. */
  initialValues?: Partial<BuyerDetails>;
  /** Optional pre-filled vision brief from the free-sample flow. */
  initialVision?: VisionBrief | null;
}

const BuyDetailsPrompt = ({ open, onOpenChange, onConfirm, title = "Confirm details", submitting = false, showDomainStep = false, packageName, billing, initialValues, initialVision }: Props) => {
  const isMobile = useIsMobileOrTablet();

  const computeInitial = (): { values: BuyerDetails; step: Step; vision: VisionBrief | null } => {
    const v: BuyerDetails = {
      company: initialValues?.company?.trim() ?? "",
      name: initialValues?.name?.trim() ?? "",
      email: initialValues?.email?.trim() ?? "",
      phone: initialValues?.phone?.trim() ?? "",
    };
    const firstEmpty = FIELD_STEPS.find((f) => !v[f]) as Step | undefined;
    let initialStep: Step;
    if (firstEmpty) initialStep = firstEmpty;
    else if (showDomainStep) initialStep = initialVision?.imageUrl ? "vision-result" : "vision-intro";
    else initialStep = "phone";
    return { values: v, step: initialStep, vision: initialVision ?? null };
  };

  const initial = computeInitial();
  const [step, setStep] = useState<Step>(initial.step);
  const [values, setValues] = useState<BuyerDetails>(initial.values);
  const [error, setError] = useState<string | null>(null);
  const [trackedKey, setTrackedKey] = useState<string | null>(null);

  // Vision state
  const [visionAnswers, setVisionAnswers] = useState<Record<VisionAnswerKey, string>>({
    industry: "", vibe: "", colour: "", headline: "", sections: "",
  });
  const [visionBrief, setVisionBrief] = useState<VisionBrief | null>(initial.vision);
  const [palette, setPalette] = useState<any>(null);
  const [fonts, setFonts] = useState<any>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState("");

  useEffect(() => {
    if (open) {
      const next = computeInitial();
      setStep(next.step);
      setValues(next.values);
      setVisionBrief(next.vision);
      setPalette(null);
      setFonts(null);
      setPreviewSlug(null);
      setVisionAnswers({ industry: "", vibe: "", colour: "", headline: "", sections: "" });
      setRefineInstruction("");
      setError(null);
      setTrackedKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Poll for brand kit (palette + fonts) generated in the background after the image returns.
  useEffect(() => {
    if (!previewSlug) return;
    if (palette && fonts) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const { data } = await (supabase as any)
          .rpc("get_vision_preview_by_slug", { _slug: previewSlug })
          .maybeSingle();
        if (!cancelled && data) {
          if (data.palette) setPalette(data.palette);
          if (data.fonts) setFonts(data.fonts);
          if (data.palette && data.fonts) return;
        }
      } catch { /* ignore */ }
      if (!cancelled && attempts < 20) setTimeout(tick, 2000);
    };
    const initial = setTimeout(tick, 2500);
    return () => { cancelled = true; clearTimeout(initial); };
  }, [previewSlug, palette, fonts]);

  // Track visitors who reach the domain step
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
          name: values.name.trim(), email, phone,
          company: values.company.trim(),
          packageName: packageName ?? "", billing: billing ?? "",
          visitorId: ctx.clientId, sessionId: ctx.sessionId, pageUrl: ctx.pageUrl,
        },
      });
    } catch (err) { console.warn("track-domain-step failed", err); }
  }, [step, values, packageName, billing, trackedKey]);

  // Helpers
  const isField = (s: Step): s is FieldStep => (FIELD_STEPS as Step[]).includes(s);
  const visionIdx = VISION_QUESTIONS.findIndex((q) => q.step === step);
  const currentVisionQ = visionIdx >= 0 ? VISION_QUESTIONS[visionIdx] : null;

  const buildBrief = (a: Record<VisionAnswerKey, string>) => {
    const parts: string[] = [];
    const company = values.company.trim();
    if (company) {
      parts.push(`Company / brand name: ${company}`);
      parts.push(`The site must be branded as "${company}" — feature this name prominently in the hero, header/logo, and any branded elements.`);
    }
    for (const q of VISION_QUESTIONS) {
      const v = a[q.key].trim();
      if (v) parts.push(`${q.prefix}: ${v}`);
    }
    return parts.join("\n");
  };

  const startVisionGeneration = async (answers: Record<VisionAnswerKey, string>) => {
    const brief = buildBrief(answers);
    if (brief.length < 5) {
      // Nothing entered — just skip to domain
      setStep("domain");
      return;
    }
    setStep("vision-generating");
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: brief, meta: { source: "buy_flow" } },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const url = data?.imageUrl ?? null;
      setVisionBrief({ prompt: brief, imageUrl: url });
      setPalette(data?.palette ?? null);
      setFonts(data?.fonts ?? null);
      setPreviewSlug(data?.previewSlug ?? null);
      setStep("vision-result");
    } catch (e) {
      console.error("vision generation failed", e);
      setError("Couldn't generate the preview. You can skip and continue.");
      setVisionBrief({ prompt: brief, imageUrl: null });
      setStep("vision-result");
    }
  };

  const refineVision = async () => {
    const ins = refineInstruction.trim();
    if (ins.length < 3 || !visionBrief?.imageUrl) {
      setError("Tell us what to change.");
      return;
    }
    setError(null);
    const previousUrl = visionBrief.imageUrl;
    const previousPrompt = visionBrief.prompt;
    setStep("vision-generating");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-vision", {
        body: { imageUrl: previousUrl, instruction: ins },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const url = data?.imageUrl ?? null;
      setVisionBrief({ prompt: `${previousPrompt}\n\nRefinement: ${ins}`, imageUrl: url ?? previousUrl });
      if (data?.palette) setPalette(data.palette);
      if (data?.fonts) setFonts(data.fonts);
      if (data?.previewSlug) setPreviewSlug(data.previewSlug);
      setRefineInstruction("");
      setStep("vision-result");
    } catch (e) {
      console.error("vision refine failed", e);
      setError("Couldn't refine — please try again.");
      setStep("vision-result");
    }
  };

  const trackApprovedSample = async () => {
    try {
      const name = values.name.trim();
      const email = values.email.trim().toLowerCase();
      const phone = values.phone.trim();
      if (!name || (!email && !phone)) return;
      const requestDetails = {
        company: values.company.trim() || null,
        brief: visionBrief?.prompt || null,
        vision_image_url: visionBrief?.imageUrl || null,
        kind: "approved_in_checkout",
        package_name: packageName ?? null,
        billing: billing ?? null,
      };
      const attachments = visionBrief?.imageUrl ? [visionBrief.imageUrl] : null;
      await supabase.from("lets_talk_leads").insert([{
        name,
        email: email || null,
        phone: phone || null,
        source: "free_sample_request",
        request_details: requestDetails as any,
        attachment_urls: attachments,
      }]);
    } catch (err) {
      console.warn("trackApprovedSample failed", err);
    }
  };

  // Field-step nav
  const handleFieldNext = async () => {
    setError(null);
    if (!isField(step)) return;
    const value = values[step];
    const r = schemas[step].safeParse(value);
    if (!r.success) return setError(r.error.issues[0].message);
    const idx = FIELD_STEPS.indexOf(step);
    if (idx < FIELD_STEPS.length - 1) {
      setStep(FIELD_STEPS[idx + 1]);
      return;
    }
    // Last field done
    if (showDomainStep) {
      // If a vision brief was pre-loaded, jump to result
      if (visionBrief?.imageUrl) setStep("vision-result");
      else setStep("vision-intro");
    } else {
      // Subscription — confirm with no domain
      await onConfirm(
        { company: values.company.trim(), name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
      );
    }
  };

  const handleFieldBack = () => {
    setError(null);
    const idx = FIELD_STEPS.indexOf(step as FieldStep);
    if (idx <= 0) { onOpenChange(false); return; }
    setStep(FIELD_STEPS[idx - 1]);
  };

  // Vision-step nav
  const visionNext = () => {
    if (!currentVisionQ) return;
    if (visionIdx === VISION_QUESTIONS.length - 1) {
      void startVisionGeneration(visionAnswers);
    } else {
      setStep(VISION_QUESTIONS[visionIdx + 1].step);
    }
  };
  const visionSkip = () => {
    if (!currentVisionQ) return;
    const cleared = { ...visionAnswers, [currentVisionQ.key]: "" };
    setVisionAnswers(cleared);
    if (visionIdx === VISION_QUESTIONS.length - 1) {
      void startVisionGeneration(cleared);
    } else {
      setStep(VISION_QUESTIONS[visionIdx + 1].step);
    }
  };
  const visionBack = () => {
    if (visionIdx === 0) { setStep("vision-intro"); return; }
    setStep(VISION_QUESTIONS[visionIdx - 1].step);
  };

  const handleDomainChoice = async (choice: BuyerDomainChoice) => {
    await onConfirm(
      { company: values.company.trim(), name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() },
      choice,
      visionBrief && (visionBrief.imageUrl || visionBrief.prompt) ? visionBrief : undefined,
    );
  };

  // Progress
  const progressSteps: Step[] = showDomainStep
    ? [...FIELD_STEPS, "vision-intro", "domain"]
    : [...FIELD_STEPS];
  let progressIdx = progressSteps.indexOf(step);
  if (progressIdx < 0) {
    if (step === "domain") progressIdx = progressSteps.length - 1;
    else progressIdx = FIELD_STEPS.length; // any vision step
  }
  const progressPct = ((progressIdx + 1) / progressSteps.length) * 100;

  // Render content per step
  const renderField = () => {
    const meta = labels[step as FieldStep];
    const idx = FIELD_STEPS.indexOf(step as FieldStep);
    const isLast = idx === FIELD_STEPS.length - 1 && !showDomainStep;
    return (
      <>
        <label className="text-foreground/70 text-xs uppercase tracking-wider">{meta.prompt(values.name)}</label>
        <input
          autoFocus
          type={meta.type}
          inputMode={meta.inputMode}
          value={values[step as FieldStep]}
          onChange={(e) => { setValues((p) => ({ ...p, [step]: e.target.value })); if (error) setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFieldNext(); } }}
          placeholder={meta.placeholder}
          className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
          maxLength={step === "phone" ? 30 : 200}
          disabled={submitting}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="outline" onClick={handleFieldBack} disabled={submitting} className="flex-1 h-12 font-semibold">
            {idx === 0 ? "Cancel" : "Back"}
          </Button>
          <Button type="button" variant="pricing" onClick={handleFieldNext} disabled={submitting} className="flex-1 h-12 font-semibold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isLast ? "Confirm & Pay" : "Next"}
          </Button>
        </div>
      </>
    );
  };

  const renderVisionIntro = () => (
    <>
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-foreground" />
        <p className="text-foreground text-base font-semibold">Generate a rough guide for our devs to improve on.</p>
      </div>
      <p className="text-foreground/70 text-sm">
        Answer a few quick questions to generate a style guide we can work to.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        <Button type="button" variant="outline" onClick={() => setStep("domain")} className="h-12 font-semibold">
          Skip — go to checkout
        </Button>
        <Button type="button" variant="pricing" onClick={() => setStep(VISION_QUESTIONS[0].step)} className="h-12 font-semibold gap-2">
          <Wand2 className="w-4 h-4" /> Yes, show me
        </Button>
      </div>
    </>
  );

  const applyVisionSuggestion = (key: VisionAnswerKey, value: string) => {
    setVisionAnswers((a) => {
      const current = (a[key] || "").trim();
      if (key === "sections") {
        const items = current ? current.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const exists = items.findIndex((s) => s.toLowerCase() === value.toLowerCase());
        if (exists >= 0) items.splice(exists, 1);
        else items.push(value);
        return { ...a, sections: items.join(", ") };
      }
      return { ...a, [key]: value };
    });
  };

  const isVisionSuggestionActive = (key: VisionAnswerKey, value: string) => {
    const current = (visionAnswers[key] || "").trim();
    if (!current) return false;
    if (key === "sections") {
      return current.split(",").map((s) => s.trim().toLowerCase()).includes(value.toLowerCase());
    }
    return current.toLowerCase() === value.toLowerCase();
  };

  const renderVisionQuestion = () => {
    if (!currentVisionQ) return null;
    const suggestions = VISION_SUGGESTIONS[currentVisionQ.key as keyof typeof VISION_SUGGESTIONS];
    return (
      <>
        <div className="flex items-center justify-between">
          <label className="text-foreground/70 text-xs uppercase tracking-wider">
            Sample · Step {visionIdx + 1} of {VISION_QUESTIONS.length}
          </label>
          <div className="flex gap-1">
            {VISION_QUESTIONS.map((q, i) => (
              <span key={q.key} className={`h-1 w-5 rounded-full ${i <= visionIdx ? "bg-foreground/70" : "bg-foreground/15"}`} />
            ))}
          </div>
        </div>
        <p className="text-foreground text-base font-semibold">{currentVisionQ.label}</p>
        <p className="text-foreground/60 text-xs">{currentVisionQ.helper}</p>
        {currentVisionQ.multiline ? (
          <textarea
            autoFocus
            value={visionAnswers[currentVisionQ.key]}
            onChange={(e) => setVisionAnswers((a) => ({ ...a, [currentVisionQ.key]: e.target.value }))}
            placeholder={currentVisionQ.placeholder}
            rows={4}
            maxLength={1000}
            className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={visionAnswers[currentVisionQ.key]}
            onChange={(e) => setVisionAnswers((a) => ({ ...a, [currentVisionQ.key]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); visionNext(); } }}
            placeholder={currentVisionQ.placeholder}
            maxLength={300}
            className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
          />
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
            {suggestions.map((s) => {
              const active = isVisionSuggestionActive(currentVisionQ.key, s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => applyVisionSuggestion(currentVisionQ.key, s.value)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-foreground/5 text-foreground/80 border-foreground/15 hover:border-foreground/40 hover:bg-foreground/10"
                  }`}
                >
                  {active && currentVisionQ.key === "sections" ? "✓ " : ""}{s.label}
                </button>
              );
            })}
            {currentVisionQ.key === "sections" && (visionAnswers.sections || "").trim() && (
              <button
                type="button"
                onClick={() => setVisionAnswers((a) => ({ ...a, sections: "" }))}
                className="px-2.5 py-1 rounded-full text-xs border border-foreground/15 text-foreground/60 hover:text-foreground hover:border-foreground/40 transition"
              >
                Clear all
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button type="button" variant="outline" onClick={visionBack} className="h-12 font-semibold">Back</Button>
          <Button type="button" variant="pricing" onClick={visionNext} className="h-12 font-semibold">
            {visionIdx === VISION_QUESTIONS.length - 1 ? "Generate ✨" : "Next →"}
          </Button>
        </div>
        <button type="button" onClick={visionSkip} className="text-xs text-foreground/60 hover:text-foreground underline-offset-4 hover:underline mt-1 self-center">
          Skip this step
        </button>
        <button type="button" onClick={() => setStep("domain")} className="text-[11px] text-foreground/50 hover:text-foreground/80 underline-offset-4 hover:underline self-center">
          Skip preview entirely — go to checkout
        </button>
      </>
    );
  };

  const renderGenerating = () => (
    <GenerationProgress helper="Our AI agent is building a free custom design template for you!" />
  );

  const renderResult = () => (
    <>
      <p className="text-foreground text-base font-semibold">Here's your AI preview ✨</p>
      <p className="text-foreground/70 text-xs">
        Approve it and we'll attach this exact concept to your order. You can also tweak it or skip.
      </p>
      {visionBrief?.imageUrl ? (
        <div tabIndex={-1} className="border border-foreground/15 bg-black/40 max-h-[40vh] overflow-auto rounded-md outline-none focus:outline-none focus-visible:outline-none">
          <img src={visionBrief.imageUrl} alt="Your AI-generated landing page preview" className="w-full block" />
        </div>
      ) : (
        <p className="text-red-400 text-xs">No preview was generated. You can continue without one.</p>
      )}
      {(palette || fonts) && (
        <div className="border border-foreground/15 p-3 bg-card/40 rounded-md">
          <BrandKit palette={palette} fonts={fonts} compact sideBySide />
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
        <Button type="button" variant="outline" onClick={() => { setError(null); setStep("vision-refine"); }} disabled={!visionBrief?.imageUrl} className="h-12 font-semibold gap-2">
          <Wand2 className="w-4 h-4" /> Tweak / re-prompt
        </Button>
        <Button type="button" variant="pricing" onClick={() => { void trackApprovedSample(); setStep("domain"); }} className="h-12 font-semibold">
          Looks great → Continue
        </Button>
      </div>
      <button type="button" onClick={() => { setVisionBrief(null); setPalette(null); setFonts(null); setPreviewSlug(null); setStep("vision-intro"); }} className="text-xs text-foreground/60 hover:text-foreground underline-offset-4 hover:underline mt-1 self-center">
        Start over
      </button>
    </>
  );

  const renderRefine = () => (
    <>
      <p className="text-foreground text-base font-semibold">What would you like to tweak?</p>
      <p className="text-foreground/70 text-xs">Describe any changes — colours, layout, copy, sections, imagery.</p>
      {visionBrief?.imageUrl && (
        <div className="border border-foreground/15 bg-black/40 max-h-[22vh] overflow-hidden rounded-md">
          <img src={visionBrief.imageUrl} alt="Current preview" className="w-full block" />
        </div>
      )}
      <textarea
        autoFocus
        value={refineInstruction}
        onChange={(e) => { setRefineInstruction(e.target.value); if (error) setError(null); }}
        placeholder="e.g. swap the hero image, warmer palette, add a pricing section…"
        rows={4}
        maxLength={1000}
        className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => { setRefineInstruction(""); setError(null); setStep("vision-result"); }} className="h-12 font-semibold">Back</Button>
        <Button type="button" variant="pricing" onClick={refineVision} disabled={refineInstruction.trim().length < 3} className="h-12 font-semibold">Regenerate</Button>
      </div>
    </>
  );

  const renderBody = () => {
    if (step === "domain") {
      return <DomainPicker onChoose={handleDomainChoice} onBack={() => setStep(showDomainStep ? "vision-intro" : "phone")} submitting={submitting} />;
    }
    if (isField(step)) return renderField();
    if (step === "vision-intro") return renderVisionIntro();
    if (step === "vision-generating") return renderGenerating();
    if (step === "vision-result") return renderResult();
    if (step === "vision-refine") return renderRefine();
    if (currentVisionQ) return renderVisionQuestion();
    return null;
  };

  const content = (
    <div className="flex flex-col gap-4 px-1 pb-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full bg-foreground transition-all" style={{ width: `${progressPct}%` }} />
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
          {renderBody()}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="carousel-label-glass border-foreground/10 text-foreground max-h-[92vh] z-[10041]"
          overlayClassName="z-[10040]"
        >
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto carousel-label-glass border-foreground/10 text-foreground z-[10041]">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default BuyDetailsPrompt;
