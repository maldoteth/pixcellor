import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Check, Loader2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

type Step = "name" | "email" | "phone" | "done";

const nameSchema = z.string().trim().min(1, "Please enter your name").max(80);
const emailSchema = z.string().trim().email("Enter a valid email").max(200);
const phoneSchema = z
  .string()
  .trim()
  .min(6, "Enter a valid number")
  .max(30)
  .regex(/^[0-9+()\-\s]+$/, "Numbers only");

const LetsTalkPrompt = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailSkipped, setEmailSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = () => {
      setName("");
      setEmail("");
      setPhone("");
      setEmailSkipped(false);
      setError(null);
      setStep("name");
      setOpen(true);
    };
    window.addEventListener("pixcellor:open-letstalk", handler);
    return () => window.removeEventListener("pixcellor:open-letstalk", handler);
  }, []);

  const submit = async (finalEmail: string, finalPhone: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("lets_talk_leads").insert({
        name: name.trim(),
        email: finalEmail || null,
        phone: finalPhone || null,
        source: "lets_talk_button",
      });
      if (error) throw error;
      setStep("done");
      setTimeout(() => setOpen(false), 1800);
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      await submit(email.trim(), phone.trim());
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
      // phone is only skippable if we already have an email
      if (emailSkipped) {
        setError("Please enter your number so we can reach you.");
        return;
      }
      await submit(email.trim(), "");
    }
  };

  const canSkip = step === "email" || (step === "phone" && !emailSkipped);

  const content = (
    <div className="flex flex-col gap-4 px-1 pb-2">
      <AnimatePresence mode="wait">
        {step === "done" ? (
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
              We'll be in touch shortly.
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
              {step === "name" && "What's your name?"}
              {step === "email" && `Hi ${name.split(" ")[0] || "there"}, what's your email?`}
              {step === "phone" &&
                (emailSkipped
                  ? "Please share your phone number so we can reach you."
                  : "And a phone number? (optional)")}
            </label>
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
                step === "name" ? "Your name" : step === "email" ? "you@example.com" : "+44 7000 000000"
              }
              className="w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition"
              maxLength={step === "phone" ? 30 : 200}
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 mt-2">
              {canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-md border border-foreground/15 text-foreground/80 hover:bg-foreground/5 transition text-sm font-medium disabled:opacity-50"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="flex-1 h-11 rounded-md bg-foreground text-background hover:opacity-90 transition text-sm font-semibold disabled:opacity-60 flex items-center justify-center"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === "phone" ? (
                  "Submit"
                ) : (
                  "Next"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-background border-foreground/10">
          <DrawerHeader>
            <DrawerTitle className="text-foreground text-center">Let's Talk</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px] bg-background/80 backdrop-blur-xl border-foreground/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">Let's Talk</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default LetsTalkPrompt;
