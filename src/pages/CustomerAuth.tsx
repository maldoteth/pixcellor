import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";
import { useLoginHandoff } from "@/hooks/use-login-handoff";

export default function CustomerAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/customer-portal", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/customer-portal`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setLinkSent(true);
      toast.success("Magic link sent. Check your inbox to continue.");
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("rate limit")) {
        setLinkSent(true);
        toast.success("A login link was already sent recently. Check your inbox.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

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
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setLinkSent(false);
                  }}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" disabled={busy || linkSent} className="w-full gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {linkSent ? "Magic link sent" : "Send magic link"}
              </Button>
            </form>

          </CardContent>
        </Card>
      </section>
    </main>
  );
}
