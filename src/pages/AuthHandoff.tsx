import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck, MailWarning, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequestLoginLink } from "@/hooks/use-request-login-link";

type Stage = "waiting-session" | "completing" | "done" | "expired" | "error";

const SESSION_TIMEOUT_MS = 8000;

function parseHashParams(): URLSearchParams {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

export default function AuthHandoff() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sid = params.get("sid") || "";
  const [stage, setStage] = useState<Stage>("waiting-session");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const { requestLink, busy, cooldown } = useRequestLoginLink();

  // Detect expired/invalid magic link signalled via URL hash by Supabase.
  useEffect(() => {
    const hashParams = parseHashParams();
    const queryError = params.get("error_code") || params.get("error");
    const hashError = hashParams.get("error_code") || hashParams.get("error");
    const errCode = hashParams.get("error_code") || params.get("error_code") || "";
    const errDesc = hashParams.get("error_description") || params.get("error_description") || "";

    if (hashError || queryError) {
      const isExpired = errCode === "otp_expired" || /expired|invalid/i.test(errDesc);
      setStage("expired");
      setErrorMessage(
        isExpired
          ? "This sign-in link has expired. Magic links are valid for a few minutes — request a fresh one below."
          : decodeURIComponent(errDesc.replace(/\+/g, " ")) || "This sign-in link is no longer valid.",
      );
    }
  }, [params]);

  useEffect(() => {
    if (stage === "expired") return;
    let cancelled = false;
    let didComplete = false;

    const complete = async (jwt: string) => {
      if (didComplete) return;
      didComplete = true;
      setStage("completing");

      try {
        if (sid) {
          const { error } = await supabase.functions.invoke(
            "complete-cross-device-login",
            {
              body: { sid, redirectTo: `${window.location.origin}/customer-portal` },
              headers: { Authorization: `Bearer ${jwt}` },
            },
          );
          if (error) throw error;
        }
        if (cancelled) return;
        // Navigate immediately without flashing a success screen — keep the
        // spinner UI stable until the portal mounts.
        navigate("/customer-portal", { replace: true });
      } catch (err) {
        console.error("handoff complete failed", err);
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        setStage("error");
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        complete(data.session.access_token);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) complete(session.access_token);
    });

    // Safety net: if we never get a session and there's no explicit error
    // in the URL, treat the link as expired/invalid after a timeout so the
    // user isn't stuck on "Signing you in…" forever.
    const timeout = window.setTimeout(() => {
      if (cancelled || didComplete) return;
      setStage((current) => {
        if (current === "waiting-session") {
          setErrorMessage(
            "This sign-in link has expired or is no longer valid. Request a fresh one below.",
          );
          return "expired";
        }
        return current;
      });
    }, SESSION_TIMEOUT_MS);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [sid, navigate, stage]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    const result = await requestLink(trimmed, `${window.location.origin}/auth/handoff`);
    if (result.ok) setResent(true);
    else setErrorMessage(result.message || "Could not send a new link. Please try again.");
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <SeoHead title="Signing you in · Pixcellor™" description="Securely complete cross-device sign-in to your Pixcellor account from a magic link or authentication handoff." path="/auth/handoff" noindex />
      <div className="max-w-md w-full text-center space-y-4">
        {stage === "done" ? (
          <>
            <ShieldCheck className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-xl font-semibold">You're signed in</h1>
            <p className="text-sm text-foreground/70">
              We've also logged in the device you started on. You can close this tab if you like.
            </p>
          </>
        ) : stage === "expired" ? (
          <>
            <MailWarning className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-xl font-semibold">Sign-in link expired</h1>
            <p className="text-sm text-foreground/70">
              {errorMessage || "This sign-in link has expired. Enter your email and we'll send you a fresh one."}
            </p>
            {resent ? (
              <div className="flex items-start gap-2 border border-border bg-card/40 p-4 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">New link on the way</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    Check your inbox (and spam folder) for a fresh sign-in link from Pixcellor.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 text-left">
                <label className="text-xs text-foreground/70" htmlFor="resend-email">Your email</label>
                <Input
                  id="resend-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-none"
                />
                <Button type="submit" disabled={busy || cooldown > 0} className="w-full rounded-none">
                  {busy ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new sign-in link"}
                </Button>
                <Button type="button" variant="ghost" className="w-full rounded-none" onClick={() => navigate("/customer-login")}>
                  Back to sign-in
                </Button>
              </form>
            )}
          </>
        ) : stage === "error" ? (
          <>
            <h1 className="text-xl font-semibold">Couldn't finish sign-in</h1>
            <p className="text-sm text-foreground/70">{errorMessage}</p>
            <Button onClick={() => navigate("/customer-login")} className="rounded-none">Back to sign-in</Button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-foreground/70" />
            <h1 className="text-xl font-semibold">Signing you in…</h1>
            <p className="text-sm text-foreground/70">
              {stage === "waiting-session"
                ? "Verifying your magic link."
                : "Linking your other device."}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
