import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardList, ExternalLink, Loader2, LogOut, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CustomerOrder = {
  id: string;
  session_id: string;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string | null;
  payment_status: string | null;
  order_status: string | null;
  delivered_domain: string | null;
  delivered_at: string | null;
  order_code: string | null;
  requirements_token: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type CustomerRequirement = {
  id: string;
  session_id: string;
  site_name: string;
  updated_at: string;
};

type CustomerPortalData = {
  email: string;
  orders: CustomerOrder[];
  projectRequirements: CustomerRequirement[];
};

const formatMoney = (amount: number | null, currency: string | null) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency || "gbp").toUpperCase(),
  }).format(amount / 100);
};

const packageName = (order: CustomerOrder) => {
  const value = order.metadata?.package_name;
  return typeof value === "string" && value.trim() ? value : "Pixcellor package";
};

export default function CustomerPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerPortalData | null>(null);

  const loadPortal = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/customer-login", { replace: true });
      return;
    }

    const { data: portalData, error } = await supabase.rpc("customer_fetch_portal");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setData(portalData as CustomerPortalData);
    setLoading(false);
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/customer-login", { replace: true });
      if (event === "SIGNED_IN") window.setTimeout(loadPortal, 0);
    });

    loadPortal();
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const requirementsBySession = useMemo(() => {
    const map = new Map<string, CustomerRequirement>();
    for (const item of data?.projectRequirements ?? []) map.set(item.session_id, item);
    return map;
  }, [data?.projectRequirements]);

  const ltv = useMemo(() => {
    return (data?.orders ?? []).reduce((total, order) => {
      if (order.payment_status !== "paid" || (order.currency || "gbp").toLowerCase() !== "gbp") return total;
      return total + (order.amount_total ?? 0);
    }, 0);
  }, [data?.orders]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login", { replace: true });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:py-12">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/"><ArrowLeft className="h-4 w-4" />Pixcellor</Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />Sign out
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Pixcellor™ customer portal</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-normal">Your projects</h1>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            Signed in as {data?.email}. Orders using this email are linked automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-border bg-card/70 backdrop-blur-xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Matched orders</div><div className="mt-2 text-3xl font-semibold">{data?.orders.length ?? 0}</div></CardContent></Card>
          <Card className="border-border bg-card/70 backdrop-blur-xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Lifetime value</div><div className="mt-2 text-3xl font-semibold">{formatMoney(ltv, "gbp")}</div></CardContent></Card>
          <Card className="border-border bg-card/70 backdrop-blur-xl"><CardContent className="p-5"><div className="text-sm text-muted-foreground">Briefs submitted</div><div className="mt-2 text-3xl font-semibold">{data?.projectRequirements.length ?? 0}</div></CardContent></Card>
        </div>

        {(data?.orders.length ?? 0) === 0 ? (
          <Card className="border-border bg-card/70 backdrop-blur-xl">
            <CardContent className="p-7 text-center space-y-4">
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">No matched orders yet</h2>
              <p className="text-muted-foreground">If you already bought, create or sign in with the exact checkout email.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.orders.map((order) => {
              const requirements = requirementsBySession.get(order.session_id);
              return (
                <Card key={order.id} className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold">{packageName(order)}</h2>
                        <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{formatMoney(order.amount_total, order.currency)}</Badge>
                        <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">{order.payment_status || "pending"}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md border border-border bg-background/50 p-4"><div className="text-muted-foreground">Order</div><div className="mt-1 font-medium">{order.order_code || "Processing"}</div></div>
                      <div className="rounded-md border border-border bg-background/50 p-4"><div className="text-muted-foreground">Delivery</div><div className="mt-1 font-medium">{order.order_status === "delivered" ? "Delivered" : "Open"}</div></div>
                      <div className="rounded-md border border-border bg-background/50 p-4"><div className="text-muted-foreground">Domain</div><div className="mt-1 font-medium">{order.delivered_domain || "—"}</div></div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        <ClipboardList className="h-5 w-5 text-primary" />Project brief
                        {requirements && <Badge className="ml-auto border-primary/40 bg-primary/10 text-primary hover:bg-primary/10"><CheckCircle2 className="mr-1 h-3 w-3" />Submitted</Badge>}
                      </div>
                      {requirements ? (
                        <p className="text-sm text-muted-foreground">{requirements.site_name} brief updated {new Date(requirements.updated_at).toLocaleDateString()}.</p>
                      ) : order.order_code && order.requirements_token ? (
                        <Button asChild className="gap-2">
                          <Link to={`/project-requirements?order=${encodeURIComponent(order.order_code)}&token=${encodeURIComponent(order.requirements_token)}`}>Add requirements <ExternalLink className="h-4 w-4" /></Link>
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">Your brief link is being prepared.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
