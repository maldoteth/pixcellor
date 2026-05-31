import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";

export default function PortalAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const routeForUser = async (userId: string) => {
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (isAdmin) {
      navigate("/portal", { replace: true });
      return true;
    }
    const { data: partner } = await (supabase as any)
      .from("partner_accounts")
      .select("email")
      .maybeSingle();
    if (partner) {
      navigate("/partner", { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await routeForUser(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      toast.error("Could not verify access.");
      setBusy(false);
      return;
    }

    const routed = await routeForUser(userId);
    if (!routed) {
      await supabase.auth.signOut();
      toast.error("This account doesn't have portal access.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <SeoHead
        title="Portal login · Pixcellor™"
        description="Sign in to the Pixcellor developer portal to manage projects, orders, customers and ongoing client work."
        path="/portal-login"
        noindex
      />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Portal sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Checking…" : "Enter portal"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}