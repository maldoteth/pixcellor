import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Check, Loader2, Phone, Wand2, X } from "lucide-react";
import GenerationProgress from "./GenerationProgress";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImageAttachmentUploader } from "@/components/ImageAttachmentUploader";
import MagicLinkSignup from "@/components/MagicLinkSignup";
import HoneypotField from "@/components/HoneypotField";
import { useAntiSpam } from "@/lib/anti-spam";

type Mode = "talk" | "request" | "consultation";
type Step = "name" | "company" | "email" | "phone" | "dream" | "colours" | "media" | "generating" | "vision" | "refine" | "consultation" | "done";

const nameSchema = z.string().trim().min(1, "Please enter your name").max(80);
const emailSchema = z.string().trim().email("Enter a valid email").max(200);
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid number")
  .max(30)
  .regex(/^[0-9+()\-\s]+$/, "Numbers only");
const longTextSchema = z.string().trim().min(3, "Tell us a little more").max(2000);

const ensureHostedVisionUrl = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("data:")) return null;
  try {
    const [meta, b64] = url.split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
    const ext = mime.split("/")[1]?.split("+")[0] || "png";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const path = `vision-samples/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage.from("submission-attachments").upload(path, blob, {
      contentType: mime,
      upsert: false,
    });
    if (error) {
      console.error("vision upload failed", error);
      return null;
    }
    return supabase.storage.from("submission-attachments").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("vision upload exception", e);
    return null;
  }
};

const LetsTalkPrompt = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("talk");
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dream, setDream] = useState("");
  const [colours, setColours] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [emailSkipped, setEmailSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visionUrl, setVisionUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [orderRequested, setOrderRequested] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const { honeypotValue, setHoneypotValue, isHuman } = useAntiSpam();

  // Progressive contact save — fires whenever we have name + (email or phone),
  // creates/updates the contact in the CRM without sending emails or scheduling callbacks.
  const savePartialLead = (overrides?: { email?: string; phone?: string }) => {
    const cleanName = name.trim();
    const cleanEmail = (overrides?.email ?? email).trim();
    const cleanPhone = (overrides?.phone ?? phone).trim();
    if (!cleanName) return;
    if (!cleanEmail && !cleanPhone) return;
    const sourceTag =
      mode === "request" ? "free_sample_partial" : mode === "consultation" ? "consultation_partial" : "lets_talk_partial";
    void supabase.functions
      .invoke("process-lets-talk-lead", {
        body: {
          name: cleanName,
          email: cleanEmail || null,
          phone: cleanPhone || null,
          source: sourceTag,
          request_details: { company: company.trim() || null },
          attachment_urls: null,
          partial: true,
        },
      })
      .catch((err) => console.error("partial lead save failed:", err));
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: Mode }>).detail;
      const nextMode: Mode =
        detail?.mode === "request"
          ? "request"
          : detail?.mode === "consultation"
            ? "consultation"
            : "talk";
      setMode(nextMode);
      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setDream("");
      setColours("");
      setMedia([]);
      setEmailSkipped(false);
      setError(null);
      setVisionUrl(null);
      setRefineInstruction("");
      setOrderRequested(false);
      // Pre-load vision context if we're opening from a generated sample
      if (nextMode === "consultation") {
        try {
          const raw = sessionStorage.getItem("pixcellor:consultation-context");
          if (raw) {
            const ctx = JSON.parse(raw) as {
              imageUrl?: string | null;
              brief?: string | null;
              company?: string | null;
              email?: string | null;
              phone?: string | null;
            };
            if (ctx?.imageUrl) setVisionUrl(ctx.imageUrl);
            if (ctx?.brief) setDream(ctx.brief);
            if (ctx?.company) setCompany(ctx.company);
            if (ctx?.email) setEmail(ctx.email);
            if (ctx?.phone) setPhone(ctx.phone);
          }
        } catch { /* ignore */ }
      }
      setStep("name");
      setOpen(true);
    };
    window.addEventListener("pixcellor:open-letstalk", handler);
    return () => window.removeEventListener("pixcellor:open-letstalk", handler);
  }, []);

  const submit = async (
    finalEmail: string,
    finalPhone: string,
    finalDream?: string,
    finalColours?: string,
    finalMedia?: string[],
    finalVisionUrl?: string | null,
    opts?: { keepOpen?: boolean },
  ) => {
    if (!isHuman()) { if (!opts?.keepOpen) setStep("done"); return; }

    const source = mode === "request" ? "free_sample_request" : "lets_talk_button";

    // Optimistic: confirm immediately.
    if (!opts?.keepOpen) setStep("done");

    void (async () => {
      try {
        const hostedVision = mode === "request" ? await ensureHostedVisionUrl(finalVisionUrl) : null;
        const requestDetails =
          mode === "request"
            ? {
                company: company.trim() || null,
                dream: finalDream?.trim() || null,
                colours: finalColours?.trim() || null,
                vision_image_url: hostedVision ?? finalVisionUrl ?? null,
              }
            : { company: company.trim() || null };
        const baseAttachments = mode === "request" ? finalMedia ?? [] : null;
        const attachments = mode === "request"
          ? Array.from(new Set([...(baseAttachments ?? []), ...(hostedVision ? [hostedVision] : [])]))
          : null;

        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const { error } = await supabase.from("lets_talk_leads").insert({
              name: name.trim(),
              email: finalEmail || null,
              phone: finalPhone || null,
              source,
              request_details: requestDetails,
              attachment_urls: attachments,
            });
            if (error) throw error;
            break;
          } catch (e) {
            if (attempt === maxAttempts) throw e;
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
        }

        supabase.functions
          .invoke("process-lets-talk-lead", {
            body: {
              name: name.trim(),
              email: finalEmail || null,
              phone: finalPhone || null,
              source,
              request_details: requestDetails,
              attachment_urls: attachments,
            },
          })
          .catch((err) => console.error("process-lets-talk-lead failed:", err));
      } catch (e) {
        console.error("lets-talk submit sync failed:", e);
        toast.error("We couldn't fully sync your details — please refresh and try again if you don't hear back soon.");
      }
    })();
  };

  const generateVisionAndSubmit = async () => {
    setStep("generating");
    setError(null);
    let url: string | null = null;
    try {
      const brief = `${dream.trim()}\n\nColours / styles: ${colours.trim()}`;
      const { data, error: fnErr } = await supabase.functions.invoke("generate-vision", {
        body: {
          prompt: brief,
          meta: {
            source: "lets_talk_request",
            company: company.trim() || null,
            name: name.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
          },
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      url = data?.imageUrl ?? null;
      if (data?.generationId) setGenerationId(data.generationId);
    } catch (e) {
      console.error("vision generation failed", e);
    }
    setVisionUrl(url);
    // Save lead either way (with or without vision)
    await submit(email.trim(), phone.trim(), dream, colours, media, url, { keepOpen: true });
    setStep(url ? "vision" : "done");
    if (!url) setStep("done");
  };

  const requestConsultation = async () => {
    setSubmitting(true);
    setError(null);
    if (!isHuman()) { setSubmitting(false); setStep("consultation"); return; }
    try {
      const hostedVision = await ensureHostedVisionUrl(visionUrl);
      const allAttachments = Array.from(new Set([...(media ?? []), ...(hostedVision ? [hostedVision] : [])]));
      const requestDetails = {
        consultation: true,
        company: company.trim() || null,
        dream: dream.trim() || null,
        colours: colours.trim() || null,
        vision_image_url: hostedVision ?? visionUrl ?? null,
        note: "Visitor requested a free consultation / call back after seeing their AI sample.",
      };
      const { error: insertErr } = await supabase.from("lets_talk_leads").insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        source: "consultation_request",
        request_details: requestDetails,
        attachment_urls: allAttachments,
      });
      if (insertErr) throw insertErr;

      supabase.functions
        .invoke("process-lets-talk-lead", {
          body: {
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            source: "consultation_request",
            request_details: requestDetails,
            attachment_urls: allAttachments,
          },
        })
        .catch((err) => console.error("process-lets-talk-lead failed:", err));

      setStep("consultation");
    } catch (e) {
      console.error(e);
      setError("Couldn't send your request — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const orderThisStyle = async () => {
    setSubmitting(true);
    setError(null);
    if (!isHuman()) { setSubmitting(false); setOrderRequested(true); return; }
    try {
      const hostedVision = await ensureHostedVisionUrl(visionUrl);
      const allAttachments = Array.from(new Set([...(media ?? []), ...(hostedVision ? [hostedVision] : [])]));
      const requestDetails = {
        order_request: true,
        company: company.trim() || null,
        dream: dream.trim() || null,
        colours: colours.trim() || null,
        vision_image_url: hostedVision ?? visionUrl ?? null,
        note: "Visitor wants to order this AI-generated style. Get back to them to arrange the build.",
      };
      const { error: insertErr } = await supabase.from("lets_talk_leads").insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        source: "vision_order_request",
        request_details: requestDetails,
        attachment_urls: allAttachments,
      });
      if (insertErr) throw insertErr;

      supabase.functions
        .invoke("process-lets-talk-lead", {
          body: {
            name: name.trim(),
            email: email.trim() || null,
            phone: phone.trim() || null,
            source: "vision_order_request",
            request_details: requestDetails,
            attachment_urls: allAttachments,
          },
        })
        .catch((err) => console.error("process-lets-talk-lead failed:", err));

      setOrderRequested(true);
      setStep("consultation");
    } catch (e) {
      console.error(e);
      setError("Couldn't send your request — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const refineVision = async () => {
    const ins = refineInstruction.trim();
    if (ins.length < 3) {
      setError("Tell us what to change.");
      return;
    }
    if (!visionUrl) return;
    setError(null);
    const previousUrl = visionUrl;
    setStep("generating");
    let url: string | null = null;
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-vision", {
        body: {
          imageUrl: previousUrl,
          instruction: ins,
          meta: {
            source: "lets_talk_refine",
            company: company.trim() || null,
            name: name.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            parent_id: generationId,
          },
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      url = data?.imageUrl ?? null;
      if (data?.generationId) setGenerationId(data.generationId);
    } catch (e) {
      console.error("vision refine failed", e);
    }
    if (url) {
      setVisionUrl(url);
      setRefineInstruction("");
      // Update lead row with refined image (best effort, fire-and-forget)
      void submit(email.trim(), phone.trim(), dream, `${colours}\n\nRefinement: ${ins}`, media, url, { keepOpen: true });
      setStep("vision");
    } else {
      setError("Couldn't refine — please try again.");
      setStep("vision");
    }
  };

  const handleNext = async () => {
    setError(null);
    if (step === "name") {
      const r = nameSchema.safeParse(name);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep(company.trim() ? "email" : "company");
      return;
    }
    if (step === "company") {
      const r = z.string().trim().min(1, "Please enter your company or brand name").max(120).safeParse(company);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep("email");
      return;
    }
    if (step === "email") {
      const r = emailSchema.safeParse(email);
      if (!r.success) return setError(r.error.issues[0].message);
      savePartialLead({ email: email.trim() });
      setStep("phone");
      return;
    }
    if (step === "phone") {
      const r = phoneSchema.safeParse(phone);
      if (!r.success) return setError(r.error.issues[0].message);
      savePartialLead({ phone: phone.trim() });
      if (mode === "consultation") {
        await requestConsultation();
        return;
      }
      if (mode === "request") {
        setStep("dream");
        return;
      }
      await submit(email.trim(), phone.trim());
      return;
    }
    if (step === "dream") {
      const r = longTextSchema.safeParse(dream);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep("colours");
      return;
    }
    if (step === "colours") {
      const r = longTextSchema.safeParse(colours);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep("media");
      return;
    }
    if (step === "media") {
      if (mode === "request") {
        await generateVisionAndSubmit();
      } else {
        await submit(email.trim(), phone.trim(), dream, colours, media);
      }
    }
  };

  const handleSkip = async () => {
    setError(null);
    if (step === "email") {
      setEmailSkipped(true);
      setEmail("");
      setStep("phone");
      return;
    }
    if (step === "phone") {
      if (emailSkipped) {
        setError("Please enter your number so we can reach you.");
        return;
      }
      if (mode === "request") {
        setStep("dream");
        return;
      }
      await submit(email.trim(), "");
      return;
    }
    if (step === "media") {
      if (mode === "request") {
        await generateVisionAndSubmit();
      } else {
        await submit(email.trim(), phone.trim(), dream, colours, media);
      }
    }
  };

  const canSkip =
    step === "email" || (step === "phone" && !emailSkipped) || step === "media";

  const isTextStep = step === "name" || step === "company" || step === "email" || step === "phone";
  const isLongStep = step === "dream" || step === "colours";

  const title =
    mode === "request"
      ? "Request Free Sample"
      : mode === "consultation"
        ? "Request Free Consultation"
        : "Let's Talk";

  const promptLabel = (() => {
    if (step === "name") return "What's your name?";
    if (step === "company") return " WHAT'S YOUR COMPANY OR BRAND NAME?";
    if (step === "email") return `What's the best email for ${company || "you"}?`;
    if (step === "phone")
      return emailSkipped
        ? "Please share your phone number so we can reach you."
        : "And a phone number? (optional)";
    if (step === "dream") return "Your dream website — describe it to us";
    if (step === "colours") return "Colours and styles you'd love";
    if (step === "media") return "Example images or videos (optional)";
    return "";
  })();

  const content = (
    <div className="flex flex-col gap-4 px-1 pb-2">
      <AnimatePresence mode="wait">
        {step === "generating" ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <GenerationProgress helper="Our AI agent is building a free custom design template for you!" />
          </motion.div>
        ) : step === "vision" && visionUrl ? (
          <motion.div
            key="vision"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <p className="text-foreground text-base font-semibold">Here's your free sample, {name.split(" ")[0]} ✨</p>
            <p className="text-foreground/70 text-xs">
              A desktop concept based on your brief. Love it? Order this style and we'll build it for real — your sample is attached so we know exactly what to make.
            </p>
            <div tabIndex={-1} className="border border-foreground/15 bg-black/40 max-h-[50vh] overflow-auto rounded-md outline-none focus:outline-none focus-visible:outline-none">
              <img src={visionUrl} alt="Your AI-generated landing page sample" className="w-full block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              <Button type="button" variant="pricing" onClick={orderThisStyle} disabled={submitting} className="h-12 font-semibold inline-flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Order this style →
              </Button>
              <Button type="button" variant="pricing" onClick={requestConsultation} disabled={submitting} className="h-12 font-semibold inline-flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Request custom sample
              </Button>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <MagicLinkSignup
              email={email}
              benefit="Sign up today to save your details"
            />
          </motion.div>
        ) : step === "refine" && visionUrl ? (
          <motion.div
            key="refine"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <p className="text-foreground text-base font-semibold">What would you like to tweak?</p>
            <p className="text-foreground/70 text-xs">
              Describe any changes — colours, layout, copy, sections, imagery. We'll refine the same design.
            </p>
            <div className="border border-foreground/15 bg-black/40 max-h-[28vh] overflow-hidden rounded-md">
              <img src={visionUrl} alt="Current sample" className="w-full block" />
            </div>
            <textarea
              autoFocus
              value={refineInstruction}
              onChange={(e) => { setRefineInstruction(e.target.value); if (error) setError(null); }}
              placeholder="e.g. swap the hero image for a product shot, make the palette warmer, add a pricing section…"
              rows={4}
              maxLength={1000}
              className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="pricing" onClick={() => { setRefineInstruction(""); setError(null); setStep("vision"); }} className="h-12 font-semibold">
                Back
              </Button>
              <Button type="button" variant="pricing" onClick={refineVision} disabled={refineInstruction.trim().length < 3} className="h-12 font-semibold">
                Regenerate
              </Button>
            </div>
          </motion.div>
        ) : step === "consultation" ? (
          <motion.div
            key="consultation"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-6 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-foreground py-[10px]" strokeWidth={2.5} />
            </motion.div>
            <p className="text-foreground text-base font-medium">
              {orderRequested ? "Order request sent 🎉" : "Consultation requested 🎉"}
            </p>
            <p className="text-foreground/70 text-sm max-w-sm">
              {orderRequested
                ? `Thanks ${name.split(" ")[0]} — a member of our team will be in touch within 24 hours to confirm your order and get the build started. We've saved your details and your sample.`
                : `Thanks ${name.split(" ")[0]} — a member of our team will be in touch within 24 hours with your sample!`}
            </p>
            <MagicLinkSignup
              email={email}
              benefit="Sign up today to save your details"
            />
            <a
              href="tel:+441483912430"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-foreground/20 bg-foreground/5 px-4 text-sm font-semibold text-foreground transition hover:bg-foreground/10"
            >
              <Phone className="h-4 w-4" />
              Call us: +44 1483 912430
            </a>
            <Button type="button" variant="pricing" onClick={() => setOpen(false)} className="h-10 px-6 mt-2 font-semibold">
              I don't want to access these again
            </Button>
          </motion.div>
        ) : step === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-0"
          >
            <motion.div
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-foreground my-0" strokeWidth={2.5} />
            </motion.div>
            <p className="text-foreground text-base font-medium text-center">Thanks, {name.split(" ")[0]}!</p>
            <p className="text-foreground/70 text-center text-xl">
              {mode === "request"
                ? "We'll review your brief and send a free sample shortly."
                : "We'll be in touch shortly."}
            </p>
            <div className="w-full max-w-sm flex flex-col gap-2">
              <MagicLinkSignup
                email={email}
                benefit="Sign up today to save your details"
              />
              <a
                href="tel:+441483912430"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-foreground/20 bg-foreground/5 px-4 text-sm font-semibold text-foreground transition hover:bg-foreground/10"
              >
                <Phone className="h-4 w-4" />
                 +44 1483 912430
              </a>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3"
          >
            <label className="text-foreground/70 text-xs uppercase tracking-wider">
              {promptLabel}
            </label>

            {isTextStep && (
              <input
                autoFocus
                type={step === "email" ? "email" : step === "phone" ? "tel" : "text"}
                inputMode={step === "phone" ? "tel" : step === "email" ? "email" : "text"}
                value={step === "name" ? name : step === "company" ? company : step === "email" ? email : phone}
                onChange={(e) => {
                  const v = e.target.value;
                  if (step === "name") setName(v);
                  else if (step === "company") setCompany(v);
                  else if (step === "email") setEmail(v);
                  else setPhone(v);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                placeholder={
                  step === "name"
                    ? "Your name"
                    : step === "company"
                    ? "Company or brand name"
                    : step === "email"
                    ? "you@example.com"
                    : "+44 7000 000000"
                }
                className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
                maxLength={step === "phone" ? 30 : 200}
              />
            )}

            {isLongStep && (
              <textarea
                autoFocus
                value={step === "dream" ? dream : colours}
                onChange={(e) => {
                  const v = e.target.value;
                  if (step === "dream") setDream(v);
                  else setColours(v);
                  if (error) setError(null);
                }}
                placeholder={
                  step === "dream"
                    ? "Tell us about the site you've always wanted…"
                    : "e.g. dark navy + gold, minimal, lots of whitespace…"
                }
                rows={5}
                maxLength={2000}
                className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition resize-none"
              />
            )}

            {step === "media" && (
              <ImageAttachmentUploader
                value={media}
                onChange={setMedia}
                max={10}
                prefix={`lets-talk/${Date.now()}`}
                acceptVideos
              />
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 mt-2">
              {canSkip && (
                <Button
                  type="button"
                  variant="pricing"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="flex-1 h-12 font-semibold"
                >
                  Skip
                </Button>
              )}
              <Button
                type="button"
                variant="pricing"
                onClick={handleNext}
                disabled={submitting}
                className="flex-1 h-12 font-semibold"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === "phone" && mode === "consultation" ? (
                  "Request consultation"
                ) : step === "media" || (step === "phone" && mode === "talk") ? (
                  "Submit"
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const lockClose = step === "done" || step === "consultation";
  const forceClose = () => {
    setStep("name");
    setOpen(false);
  };

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => {
          if (!o && lockClose) return;
          setOpen(o);
        }}
        dismissible={!lockClose}
      >
        <DrawerContent className="carousel-label-glass border-foreground/10 text-foreground">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {lockClose && (
            <button
              type="button"
              onClick={forceClose}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-md p-2 text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="px-4 pb-6">{content}</div>
          <HoneypotField value={honeypotValue} onChange={setHoneypotValue} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogContent
        className="sm:max-w-[460px] carousel-label-glass lets-talk-dialog-glass text-foreground"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (lockClose) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (lockClose) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (lockClose) e.preventDefault();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {content}
        <HoneypotField value={honeypotValue} onChange={setHoneypotValue} />
      </DialogContent>
    </Dialog>
  );
};

export default LetsTalkPrompt;
