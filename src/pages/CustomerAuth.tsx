import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
      const loginResult = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (!loginResult.error) {
        navigate("/customer-portal", { replace: true });
        return;
      }

      if (loginResult.error.message.toLowerCase().includes("email not confirmed")) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
        });

        if (resendError) throw resendError;

        toast.success("Confirmation email resent. Check your inbox to activate your account.");
        return;
      }

      const signupResult = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/customer-portal` },
      });

      if (signupResult.error) {
        const message = signupResult.error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered")) {
          toast.error("Account found. Check the password and try again.");
          return;
        }
        throw signupResult.error;
      }

      if (signupResult.data.user?.identities?.length === 0) {
        toast.error("Account found. Check the password and try again.");
        return;
      }

      if (!signupResult.data.session) {
        toast.success("Confirmation email sent. Check your inbox to activate your account.");
        setPassword("");
        return;
      }

      navigate("/customer-portal", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
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
              <div className="space-y-2">
                <Label htmlFor="customer-password">Password</Label>
                <Input
                  id="customer-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>

          </CardContent>
        </Card>
      </section>
    </main>
  );
}
