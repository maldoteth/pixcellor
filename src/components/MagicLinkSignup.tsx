import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLoginHandoff } from "@/hooks/use-login-handoff";
import { useRequestLoginLink } from "@/hooks/use-request-login-link";

interface MagicLinkSignupProps {
  email: string;
  /** Short note explaining the benefit. */
  benefit?: string;
}

const MagicLinkSignup = ({ email, benefit }: MagicLinkSignupProps) => {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const handoff = useLoginHandoff("/customer-portal");
  const { requestLink, busy, cooldown } = useRequestLoginLink();

  const cleanEmail = email.trim().toLowerCase();
  const validEmail = /.+@.+\..+/.test(cleanEmail);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionEmail(data.session?.user?.email?.toLowerCase() ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user?.email?.toLowerCase() ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const sendLink = async () => {
    if (!validEmail) return;
    setError(null);
    const emailRedirectTo = handoff.start();
    const result = await requestLink(cleanEmail, emailRedirectTo);
    if (result.ok) {
      setSent(true);
    } else if (result.rateLimited) {
      setSent(true);
      toast.error(`Too many requests. Try again in ${result.retryAfter ?? 30}s.`);
    } else {
      setError(result.message ?? "Could not send link");
    }
  };

  const matchedAuth = !!sessionEmail && !!cleanEmail && sessionEmail === cleanEmail;

  if (matchedAuth) {
    return (
      <div className="mt-4 rounded-md border border-foreground/15 bg-foreground/5 px-3 py-2.5 text-xs text-foreground/80 flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5" />
        Saved to your dashboard.
      </div>
    );
  }

  if (!validEmail) return null;

  const buttonLabel = busy
    ? "Sending…"
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : sent
        ? "Resend link"
        : "Sign";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="mt-4 rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-3"
    >
      {sent ? (
        <>
          <div className="flex items-start gap-2 text-xs text-foreground/85">
            {handoff.status === "claiming" || handoff.status === "claimed" ? (
              <Loader2 className="h-3.5 w-3.5 mt-0.5 shrink-0 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            )}
            <p>
              {handoff.status === "claiming" || handoff.status === "claimed"
                ? "Signing you in…"
                : <>Magic link sent to <span className="font-medium">{cleanEmail}</span>. Open it on any device — this tab will log in automatically.</>}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={sendLink}
            disabled={busy || cooldown > 0}
            className="mt-2 h-8 w-full font-semibold text-xs"
          >
            {buttonLabel}
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-foreground/80 leading-snug text-center">
            {benefit ? benefit : "Save this to your dashboard so you can revisit your sample and generations any time."}
          </p>
          <Button
            type="button"
            variant="pricing"
            onClick={sendLink}
            disabled={busy || cooldown > 0}
            className="mt-2 h-9 w-full font-semibold text-xs inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            {buttonLabel}
          </Button>
          {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
        </>
      )}
    </motion.div>
  );
};

export default MagicLinkSignup;
