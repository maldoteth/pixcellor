import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

export default function ByowLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/byow", { replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/byow`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your inbox for a magic link.");
    } catch (err: any) {
      toast.error(err.message || "Couldn't send the link. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in — Pixcellor Client Portal</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="text-3xl font-light tracking-tight">Pixcellor<sup className="text-xs">™</sup></div>
            <div className="mt-2 text-sm text-white/50">Client portal</div>
          </div>

          {sent ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
              <div className="text-lg mb-2">Check your email</div>
              <p className="text-sm text-white/60">
                We've sent a sign-in link to <span className="text-white">{email}</span>.
                Click it to access your site.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-xs text-white/40 hover:text-white underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white/70 text-xs uppercase tracking-wider">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-white text-black hover:bg-white/90"
              >
                {sending ? "Sending…" : "Send sign-in link"}
              </Button>
              <p className="text-xs text-white/40 text-center pt-2">
                Pixcellor clients only. Need access? <a href="/get-started" className="underline hover:text-white">Get in touch</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
