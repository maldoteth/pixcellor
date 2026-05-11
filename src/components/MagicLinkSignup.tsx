import { useEffect, useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface MagicLinkSignupProps {
  email: string;
  /** Short note explaining the benefit. */
  benefit?: string;
}

/**
 * Inline "save to dashboard" CTA shown on thank-you screens. Uses the
 * email already collected to send a magic link; once the visitor signs
 * in, all sample requests and AI generations under that email auto-link
 * to their dashboard via customer_fetch_portal().
 */
const MagicLinkSignup = ({ email, benefit }: MagicLinkSignupProps) => {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

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
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/customer-portal`,
          shouldCreateUser: true,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send link";
      if (msg.toLowerCase().includes("rate limit")) {
        setSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  // Only treat as "saved" when the signed-in session actually matches the captured email.
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

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/customer-portal`,
          shouldCreateUser: true,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send link";
      if (msg.toLowerCase().includes("rate limit")) {
        setSent(true);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="mt-4 rounded-md border border-foreground/15 bg-foreground/[0.04] px-3 py-3"
    >
      {sent ? (
        <div className="flex items-start gap-2 text-xs text-foreground/85">
          <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            Magic link sent to <span className="font-medium">{cleanEmail}</span>. Open it to access your dashboard — your sample and AI generations will be saved there.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-foreground/80 leading-snug">
            {benefit ?? "Save this to your dashboard so you can revisit your sample and generations any time."}
          </p>
          <Button
            type="button"
            variant="pricing"
            onClick={sendLink}
            disabled={busy}
            className="mt-2 h-9 w-full font-semibold text-xs inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Save to my dashboard
          </Button>
          {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
        </>
      )}
    </motion.div>
  );
};

export default MagicLinkSignup;
