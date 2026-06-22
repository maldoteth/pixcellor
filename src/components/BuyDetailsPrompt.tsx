import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Loader2, Wand2, CreditCard, Building2, Search, ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import GenerationProgress from "./GenerationProgress";
import BrandKit from "@/components/BrandKit";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DomainChoice } from "@/components/DomainPicker";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutContext } from "@/lib/checkoutTracking";
import { SUGGESTIONS as VISION_SUGGESTIONS } from "@/components/VisionGenerator";

const INVOICE_COUNTRIES = ["United Kingdom", "Ireland", "United States", "Other"];

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
  /** Optional address autofilled from Companies House when the user picked a UK company. */
  address_line1?: string;
  city?: string;
  postcode?: string;
  country?: string;
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
type Step = FieldStep | VisionStep | "payment" | "invoice-form" | "invoice-success";

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
  company: { prompt: () => "COMPANY NAME?", placeholder: "Enter name", type: "text", inputMode: "text" },
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
  /** Called when the user picks "Pay by bank transfer (invoice)" at the final step. */
  onInvoice?: (details: BuyerDetails, vision?: VisionBrief) => Promise<void> | void;
  title?: string;
  submitting?: boolean;
  /** When false (subscriptions), skip the payment-choice + vision step entirely. Defaults to true. */
  showDomainStep?: boolean;
  /** Package name for tracking visitors who reach the payment step. */
  packageName?: string;
  billing?: string;
  /** Package slug for invoice creation via edge function (e.g. "full_works"). When provided, the invoice form is rendered inline in this dialog. */
  packageSlug?: string;
  /** Optional pre-filled buyer details — filled fields are skipped in the wizard. */
  initialValues?: Partial<BuyerDetails>;
  /** Optional pre-filled vision brief from the free-sample flow. */
  initialVision?: VisionBrief | null;
}

const BuyDetailsPrompt = ({ open, onOpenChange, onConfirm, onInvoice, title = "Confirm details", submitting = false, showDomainStep = false, packageName, billing, packageSlug, initialValues, initialVision }: Props) => {
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

  // Companies House typeahead (UK only — non-UK users can just keep typing)
  type CHHit = { company_number: string; title: string; address_snippet: string; status?: string };
  const [chHits, setChHits] = useState<CHHit[]>([]);
  const [chOpen, setChOpen] = useState(false);
  const [chLoading, setChLoading] = useState(false);
  const chTimer = useRef<number | null>(null);
  const chReqId = useRef(0);

  const searchCompanies = (q: string) => {
    if (chTimer.current) window.clearTimeout(chTimer.current);
    const term = q.trim();
    if (term.length < 2) { setChHits([]); setChOpen(false); return; }
    chTimer.current = window.setTimeout(async () => {
      const reqId = ++chReqId.current;
      setChLoading(true);
      try {
        const projectRef = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
        const anon = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const url = `https://${projectRef}.supabase.co/functions/v1/companies-house-search?q=${encodeURIComponent(term)}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
        const json = await r.json();
        if (reqId !== chReqId.current) return;
        setChHits(json.items ?? []);
        setChOpen(true);
      } catch {
        if (reqId === chReqId.current) setChHits([]);
      } finally {
        if (reqId === chReqId.current) setChLoading(false);
      }
    }, 280);
  };

  const pickCompany = async (hit: CHHit) => {
    setChOpen(false);
    setValues((p) => ({ ...p, company: hit.title }));
    try {
      const projectRef = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const anon = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectRef}.supabase.co/functions/v1/companies-house-search?number=${encodeURIComponent(hit.company_number)}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${anon}`, apikey: anon } });
      const json = await r.json();
      const director = json?.directors?.[0]?.name as string | undefined;
      setValues((p) => ({
        ...p,
        company: json?.company_name || p.company,
        name: p.name?.trim() ? p.name : (director || p.name),
        address_line1: json?.address?.address_line1 || p.address_line1,
        city: json?.address?.city || p.city,
        postcode: json?.address?.postcode || p.postcode,
        country: json?.address?.country || p.country,
      }));
    } catch { /* silent */ }
  };

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
      setInvoiceResult(null);
      setInvoiceExtra({ address_line1: "", city: "", postcode: "", country: "United Kingdom", po_reference: "" });
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
    if (step !== "payment") return;
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
      setStep("payment");
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
      await onConfirm(buyerPayload());
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

  const visionToSend = () =>
    visionBrief && (visionBrief.imageUrl || visionBrief.prompt) ? visionBrief : undefined;

  const buyerPayload = (): BuyerDetails => ({
    company: values.company.trim(),
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address_line1: values.address_line1?.trim() || undefined,
    city: values.city?.trim() || undefined,
    postcode: values.postcode?.trim() || undefined,
    country: values.country?.trim() || undefined,
  });

  const handlePayByCard = async () => {
    try {
      await onConfirm(buyerPayload(), undefined, visionToSend());
    } catch (e) {
      const msg = (e as Error)?.message || "Payment failed. Please try again.";
      console.error("pay-by-card failed:", e);
      toast.error(msg);
    }
  };

  // Invoice (bank transfer) state — when packageSlug is provided we render the form inline.
  const [invoiceExtra, setInvoiceExtra] = useState<{ address_line1: string; city: string; postcode: string; country: string; po_reference: string }>({
    address_line1: "", city: "", postcode: "", country: "United Kingdom", po_reference: "",
  });
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<{ hosted_url: string; invoice_number: string } | null>(null);

  // Sync invoice address fields with autofilled buyer values whenever entering the form step.
  useEffect(() => {
    if (step !== "invoice-form") return;
    setInvoiceExtra((p) => ({
      ...p,
      address_line1: p.address_line1 || values.address_line1 || "",
      city: p.city || values.city || "",
      postcode: p.postcode || values.postcode || "",
      country: p.country || values.country || p.country,
    }));
  }, [step, values.address_line1, values.city, values.postcode, values.country]);

  const handlePayByInvoice = async () => {
    if (packageSlug) {
      setError(null);
      setStep("invoice-form");
      return;
    }
    if (!onInvoice) {
      // Fallback — just confirm as a card flow
      await handlePayByCard();
      return;
    }
    await onInvoice(buyerPayload(), visionToSend());
  };

  const submitInvoice = async () => {
    if (!packageSlug) return;
    if (!values.name.trim() || !values.email.trim()) {
      toast.error("Please add your name and email");
      return;
    }
    setInvoiceSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-invoice", {
        body: {
          package_slug: packageSlug,
          billing: {
            name: values.name.trim(),
            email: values.email.trim(),
            company: values.company.trim(),
            phone: values.phone.trim(),
            address_line1: invoiceExtra.address_line1.trim(),
            city: invoiceExtra.city.trim(),
            postcode: invoiceExtra.postcode.trim(),
            country: invoiceExtra.country,
            po_reference: invoiceExtra.po_reference.trim(),
          },
          source: "public_checkout",
        },
      });
      if (fnError) throw fnError;
      if ((data as any)?.error) throw new Error((data as any).error);
      setInvoiceResult({ hosted_url: (data as any).hosted_url, invoice_number: (data as any).invoice_number });
      setStep("invoice-success");
      toast.success("Invoice sent");
    } catch (e: any) {
      toast.error(e?.message || "Could not create invoice");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  // Progress
  const progressSteps: Step[] = showDomainStep
    ? [...FIELD_STEPS, "vision-intro", "payment"]
    : [...FIELD_STEPS];
  let progressIdx = progressSteps.indexOf(step);
  if (progressIdx < 0) {
    if (step === "payment") progressIdx = progressSteps.length - 1;
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
        {step === "company" ? (
          <div className="relative">
            <input
              autoFocus
              type="text"
              value={values.company}
              onChange={(e) => { setValues((p) => ({ ...p, company: e.target.value })); searchCompanies(e.target.value); if (error) setError(null); }}
              onFocus={() => { if (chHits.length) setChOpen(true); }}
              onBlur={() => { window.setTimeout(() => setChOpen(false), 150); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleFieldNext(); } }}
              placeholder={meta.placeholder}
              className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 pr-9 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
              maxLength={200}
              disabled={submitting}
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40">
              {chLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </div>
            {chOpen && chHits.length > 0 && (
              <div className="relative z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-foreground/15 bg-background shadow-lg">
                {chHits.map((h) => (
                  <button
                    type="button"
                    key={h.company_number}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickCompany(h)}
                    className="w-full text-left px-3 py-2 hover:bg-foreground/10 border-b border-foreground/5 last:border-b-0"
                  >
                    <div className="text-sm text-foreground font-medium truncate">{h.title}</div>
                    <div className="text-xs text-foreground/60 truncate">{h.address_snippet}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
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
        )}
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
        <Button type="button" variant="outline" onClick={() => setStep("payment")} className="h-12 font-semibold">
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
        <button type="button" onClick={() => setStep("payment")} className="text-[11px] text-foreground/50 hover:text-foreground/80 underline-offset-4 hover:underline self-center">
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
        <Button type="button" variant="pricing" onClick={() => { void trackApprovedSample(); setStep("payment"); }} className="h-12 font-semibold">
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

  const renderPayment = () => (
    <>
      <p className="text-foreground text-base font-semibold">How would you like to pay?</p>
      <p className="text-foreground/60 text-xs">
        {packageName ? `${packageName}${billing ? ` · ${billing}` : ""}` : "Choose your preferred payment method."}
      </p>
      <div className="grid gap-2 mt-1">
        <button
          type="button"
          onClick={handlePayByCard}
          disabled={submitting}
          className="flex items-center gap-4 rounded-lg border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 p-4 text-left transition disabled:opacity-60"
        >
          <CreditCard className="h-6 w-6 shrink-0" />
          <div>
            <div className="font-bold text-foreground">Pay by card</div>
            <div className="text-xs text-foreground/60">Secure Stripe checkout · instant access</div>
          </div>
        </button>
        <button
          type="button"
          onClick={handlePayByInvoice}
          disabled={submitting}
          className="flex items-center gap-4 rounded-lg border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 p-4 text-left transition disabled:opacity-60"
        >
          <Building2 className="h-6 w-6 shrink-0" />
          <div>
            <div className="font-bold text-foreground">Pay by bank transfer (invoice)</div>
            <div className="text-xs text-foreground/60">PDF invoice emailed · 28 days to pay</div>
          </div>
        </button>
      </div>
      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={() => setStep(visionBrief?.imageUrl ? "vision-result" : "vision-intro")} disabled={submitting} className="flex-1 h-11 font-semibold">
          Back
        </Button>
      </div>
      {submitting && <p className="text-xs text-foreground/60 text-center mt-1 inline-flex items-center gap-2 justify-center"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</p>}
    </>
  );

  const renderInvoiceForm = () => {
    const inputCls = "w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition";
    const labelCls = "text-foreground/70 text-[11px] uppercase tracking-wider";
    return (
      <>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStep("payment")} className="text-foreground/60 hover:text-foreground" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-foreground text-base font-semibold">Bank transfer — billing details</p>
            <p className="text-foreground/60 text-xs">We'll email you a PDF invoice with our UK bank details.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Full name *</label>
              <input className={inputCls} value={values.name} onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Company</label>
              <input className={inputCls} value={values.company} onChange={(e) => setValues((p) => ({ ...p, company: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Email *</label>
              <input type="email" className={inputCls} value={values.email} onChange={(e) => setValues((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={values.phone} onChange={(e) => setValues((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Billing address</label>
            <input className={inputCls} placeholder="Street address" value={invoiceExtra.address_line1} onChange={(e) => setInvoiceExtra((p) => ({ ...p, address_line1: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>City</label>
              <input className={inputCls} value={invoiceExtra.city} onChange={(e) => setInvoiceExtra((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Postcode</label>
              <input className={inputCls} value={invoiceExtra.postcode} onChange={(e) => setInvoiceExtra((p) => ({ ...p, postcode: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Country</label>
              <select
                value={invoiceExtra.country}
                onChange={(e) => setInvoiceExtra((p) => ({ ...p, country: e.target.value }))}
                className={inputCls}
              >
                {INVOICE_COUNTRIES.map((c) => <option key={c} className="bg-background text-foreground">{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>PO reference</label>
              <input className={inputCls} value={invoiceExtra.po_reference} onChange={(e) => setInvoiceExtra((p) => ({ ...p, po_reference: e.target.value }))} />
            </div>
          </div>
          <p className="text-[11px] text-foreground/50">By submitting you'll receive a PDF invoice with our bank details. Payment terms: 28 days.</p>
        </div>
        <div className="flex gap-2 mt-1">
          <Button type="button" variant="outline" onClick={() => setStep("payment")} disabled={invoiceSubmitting} className="flex-1 h-12 font-semibold">Back</Button>
          <Button type="button" variant="pricing" onClick={submitInvoice} disabled={invoiceSubmitting} className="flex-1 h-12 font-semibold gap-2">
            {invoiceSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invoice
          </Button>
        </div>
      </>
    );
  };

  const renderInvoiceSuccess = () => (
    <>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <p className="text-foreground text-base font-semibold">Invoice sent</p>
      </div>
      <p className="text-foreground/70 text-xs">
        We've emailed {values.email || "you"} a copy of invoice {invoiceResult?.invoice_number} with the PDF and bank details attached.
      </p>
      {invoiceResult?.hosted_url && (
        <div className="grid gap-2 mt-1">
          <Button asChild variant="pricing" className="w-full h-12 font-semibold">
            <a href={invoiceResult.hosted_url} target="_blank" rel="noopener noreferrer">View invoice page</a>
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 gap-2 font-semibold"
            onClick={() => { navigator.clipboard.writeText(invoiceResult.hosted_url); toast.success("Link copied"); }}
          >
            <Copy className="h-4 w-4" /> Copy invoice link
          </Button>
        </div>
      )}
      <p className="text-[11px] text-foreground/50 text-center mt-1">Payment due within 28 days. We'll send friendly reminders if needed.</p>
      <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="self-center text-xs text-foreground/60 hover:text-foreground">Close</Button>
    </>
  );

  const renderBody = () => {
    if (step === "payment") {
      return renderPayment();
    }
    if (step === "invoice-form") return renderInvoiceForm();
    if (step === "invoice-success") return renderInvoiceSuccess();
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
          className="relative border-foreground/10 text-foreground max-h-[92vh] z-[10041] bg-transparent isolate overflow-hidden"
          overlayClassName="z-[10040]"
        >
          <AuroraBackdrop />
          <DrawerHeader>
            <DrawerTitle className="text-foreground text-center drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto relative">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${step === "invoice-form" ? "sm:max-w-[620px]" : "sm:max-w-[520px]"} relative max-h-[90vh] overflow-hidden border-foreground/10 text-foreground z-[10041] bg-transparent isolate`}>
        <AuroraBackdrop />
        <DialogHeader>
          <DialogTitle className="text-foreground drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">{title}</DialogTitle>
        </DialogHeader>
        <div className="relative overflow-y-auto max-h-[80vh]">{content}</div>
      </DialogContent>
    </Dialog>
  );
};

export default BuyDetailsPrompt;
