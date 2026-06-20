import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import SeoHead from "@/components/SeoHead";
import { useLoginHandoff } from "@/hooks/use-login-handoff";
import { useRequestLoginLink } from "@/hooks/use-request-login-link";

export default function CustomerAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const handoff = useLoginHandoff("/customer-portal");
  const { requestLink, busy, cooldown } = useRequestLoginLink();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/customer-portal", { replace: true });
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/customer-portal", { replace: true });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRedirectTo = handoff.start();

    const result = await requestLink(cleanEmail, emailRedirectTo);
    if (result.ok) {
      setLinkSent(true);
      toast.success("Magic link sent. Open it on any device — this tab will log in too.");
    } else if (result.rateLimited) {
      toast.error(`Too many requests. Try again in ${result.retryAfter ?? 30}s.`);
    } else {
      toast.error(result.message ?? "Could not send link");
    }
  };

  const buttonLabel = busy
    ? "Sending…"
    : cooldown > 0
      ? `Resend in ${cooldown}s`
      : linkSent
        ? "Resend magic link"
        : "Send magic link";

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <SeoHead
        title="Customer login · Pixcellor™"
        description="Sign in to your Pixcellor customer portal to track your project, requirements and orders."
        path="/customer-login"
        noindex
      />
      <section className="w-full max-w-md space-y-5">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" />Pixcellor</Link>
        </Button>

        <Card className="border-border bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <p className="text-xs font-semibold text-muted-foreground">Pixcellor™</p>
            <CardTitle>Log in / Sign up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={busy || cooldown > 0} className="w-full gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {buttonLabel}
              </Button>
              {linkSent && (
                <p className="text-muted-foreground text-lg text-slate-50 bg-white/0 text-center inline-flex items-center justify-center gap-2 w-full">
                  {handoff.status === "claiming" || handoff.status === "claimed" ? (
                    <><Loader2 className="h-3 w-3 animate-spin" />Signing you in…</>
                  ) : (
                    <>Check your inbox — this tab will log in automatically once you click the link.</>
                  )}
                </p>
              )}
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin + "/customer-portal",
                });
                if (result.error) {
                  toast.error("Could not start Google sign-in");
                }
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
                <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84Z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
              </svg>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
