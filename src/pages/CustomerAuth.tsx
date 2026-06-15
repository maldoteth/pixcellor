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
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
