import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";

type Stage = "waiting-session" | "completing" | "done" | "error";

export default function AuthHandoff() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sid = params.get("sid") || "";
  const [stage, setStage] = useState<Stage>("waiting-session");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
              body: { sid },
              headers: { Authorization: `Bearer ${jwt}` },
            },
          );
          if (error) throw error;
        }
        if (cancelled) return;
        setStage("done");
        // Redirect this device to the portal too.
        setTimeout(() => navigate("/customer-portal", { replace: true }), 800);
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

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [sid, navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <SeoHead title="Signing you in · Pixcellor™" path="/auth/handoff" noindex />
      <div className="max-w-md w-full text-center space-y-4">
        {stage === "done" ? (
          <>
            <ShieldCheck className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-xl font-semibold">You're signed in</h1>
            <p className="text-sm text-foreground/70">
              We've also logged in the device you started on. You can close this tab if you like.
            </p>
          </>
        ) : stage === "error" ? (
          <>
            <h1 className="text-xl font-semibold">Couldn't finish sign-in</h1>
            <p className="text-sm text-foreground/70">{errorMessage}</p>
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
