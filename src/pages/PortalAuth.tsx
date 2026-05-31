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

  const routeForSignedInUser = async (userId: string) => {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) {
      navigate("/portal", { replace: true });
      return;
    }

    const { data: customerSource } = await (supabase as any)
      .from("customer_lead_sources")
      .select("email")
      .maybeSingle();
    if (customerSource) {
      navigate("/customer-portal", { replace: true });
      return;
    }

    await supabase.auth.signOut();
    toast.error("No dashboard access found for this account.");
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void routeForSignedInUser(data.session.user.id);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }

    if (data.user) await routeForSignedInUser(data.user.id);
    setBusy(false);
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