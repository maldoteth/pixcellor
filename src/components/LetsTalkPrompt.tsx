import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImageAttachmentUploader } from "@/components/ImageAttachmentUploader";

type Mode = "talk" | "request";
type Step = "name" | "email" | "phone" | "dream" | "colours" | "media" | "generating" | "vision" | "refine" | "done";

const nameSchema = z.string().trim().min(1, "Please enter your name").max(80);
const emailSchema = z.string().trim().email("Enter a valid email").max(200);
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid number")
  .max(30)
  .regex(/^[0-9+()\-\s]+$/, "Numbers only");
const longTextSchema = z.string().trim().min(3, "Tell us a little more").max(2000);

const LetsTalkPrompt = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("talk");
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dream, setDream] = useState("");
  const [colours, setColours] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [emailSkipped, setEmailSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visionUrl, setVisionUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: Mode }>).detail;
      setMode(detail?.mode === "request" ? "request" : "talk");
      setName("");
      setEmail("");
      setPhone("");
      setDream("");
      setColours("");
      setMedia([]);
      setEmailSkipped(false);
      setError(null);
      setVisionUrl(null);
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
    setSubmitting(true);
    try {
      const source = mode === "request" ? "free_sample_request" : "lets_talk_button";
      const requestDetails =
        mode === "request"
          ? {
              dream: finalDream?.trim() || null,
              colours: finalColours?.trim() || null,
              vision_image_url: finalVisionUrl ?? null,
            }
          : null;
      const attachments = mode === "request" ? finalMedia ?? [] : null;

      const { error } = await supabase.from("lets_talk_leads").insert({
        name: name.trim(),
        email: finalEmail || null,
        phone: finalPhone || null,
        source,
        request_details: requestDetails,
        attachment_urls: attachments,
      });
      if (error) throw error;

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

      if (!opts?.keepOpen) {
        setStep("done");
        setTimeout(() => setOpen(false), 1800);
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const generateVisionAndSubmit = async () => {
    setStep("generating");
    setError(null);
    let url: string | null = null;
    try {
      const brief = `${dream.trim()}\n\nColours / styles: ${colours.trim()}`;
      const { data, error: fnErr } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: brief },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      url = data?.imageUrl ?? null;
    } catch (e) {
      console.error("vision generation failed", e);
    }
    setVisionUrl(url);
    // Save lead either way (with or without vision)
    await submit(email.trim(), phone.trim(), dream, colours, media, url, { keepOpen: true });
    setStep(url ? "vision" : "done");
    if (!url) setTimeout(() => setOpen(false), 1800);
  };

  const orderThisStyle = () => {
    try {
      sessionStorage.setItem(
        "pixcellor:vision-brief",
        JSON.stringify({
          prompt: `${dream}\n\nColours: ${colours}`,
          imageUrl: visionUrl,
          name,
          email,
          phone,
          at: Date.now(),
        }),
      );
    } catch { /* ignore */ }
    setOpen(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("pixcellor:packages-open-change", { detail: { open: true } }));
      window.dispatchEvent(new Event("pixcellor:open-packages"));
    }, 200);
  };

  const downloadVision = () => {
    if (!visionUrl) return;
    const a = document.createElement("a");
    a.href = visionUrl;
    a.download = "pixcellor-vision.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNext = async () => {
    setError(null);
    if (step === "name") {
      const r = nameSchema.safeParse(name);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep("email");
      return;
    }
    if (step === "email") {
      const r = emailSchema.safeParse(email);
      if (!r.success) return setError(r.error.issues[0].message);
      setStep("phone");
      return;
    }
    if (step === "phone") {
      const r = phoneSchema.safeParse(phone);
      if (!r.success) return setError(r.error.issues[0].message);
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

  const isTextStep = step === "name" || step === "email" || step === "phone";
  const isLongStep = step === "dream" || step === "colours";

  const title = mode === "request" ? "Request Free Sample" : "Let's Talk";

  const promptLabel = (() => {
    if (step === "name") return "What's your name?";
    if (step === "email") return `Hi ${name.split(" ")[0] || "there"}, what's your email?`;
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
            className="flex flex-col items-center justify-center gap-3 py-10"
          >
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <p className="text-foreground text-base font-medium">Building your sample…</p>
            <p className="text-foreground/70 text-sm text-center max-w-xs">
              Our AI is rendering a desktop preview of your dream site. This takes about 30 seconds.
            </p>
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
            <div className="border border-foreground/15 bg-black/40 max-h-[50vh] overflow-auto rounded-md">
              <img src={visionUrl} alt="Your AI-generated landing page sample" className="w-full block" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              <Button type="button" variant="pricing" onClick={orderThisStyle} className="sm:col-span-2 h-12 font-semibold">
                Order this style →
              </Button>
              <Button type="button" variant="pricing" onClick={downloadVision} className="h-12 font-semibold">
                Save image
              </Button>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="text-xs text-foreground/60 hover:text-foreground underline-offset-4 hover:underline mt-1"
            >
              Not for me — close
            </button>
          </motion.div>
        ) : step === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-6"
          >
            <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-foreground" />
            </div>
            <p className="text-foreground text-base font-medium">Thanks, {name.split(" ")[0]}!</p>
            <p className="text-foreground/70 text-sm text-center">
              {mode === "request"
                ? "We'll review your brief and send a free sample shortly."
                : "We'll be in touch shortly."}
            </p>
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
                value={step === "name" ? name : step === "email" ? email : phone}
                onChange={(e) => {
                  const v = e.target.value;
                  if (step === "name") setName(v);
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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="carousel-label-glass border-foreground/10 text-foreground">
          <DrawerHeader>
            <DrawerTitle className="text-foreground text-center">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[460px] carousel-label-glass border-foreground/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default LetsTalkPrompt;
