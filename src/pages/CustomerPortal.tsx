import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Home,
  Loader2,
  LogOut,
  PackageCheck,
  PanelLeft,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

const projectStage = (order: CustomerOrder, hasRequirements: boolean) => {
  if (order.order_status === "delivered") return { label: "Delivered", progress: 100 };
  if (hasRequirements) return { label: "In production", progress: 66 };
  if (order.payment_status === "paid") return { label: "Brief needed", progress: 33 };
  return { label: "Payment pending", progress: 12 };
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

  const activeOrders = useMemo(() => {
    return (data?.orders ?? []).filter((order) => order.order_status !== "delivered").length;
  }, [data?.orders]);

  const nextOrder = useMemo(() => {
    return (data?.orders ?? [])[0] ?? null;
  }, [data?.orders]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login", { replace: true });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background text-foreground md:flex">
        <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar/95 backdrop-blur-xl">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar-accent">
                <PackageCheck className="h-4 w-4 text-sidebar-primary" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">Pixcellor™</p>
                <p className="truncate text-xs text-sidebar-foreground/60">Customer app</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { title: "Overview", icon: Home },
                    { title: "Orders", icon: ReceiptText },
                    { title: "Briefs", icon: FileText },
                  ].map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton className="data-[active=true]:bg-sidebar-accent" isActive={item.title === "Overview"}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="min-h-screen bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9">
                <PanelLeft className="h-4 w-4" />
              </SidebarTrigger>
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  Pixcellor
                </Link>
              </Button>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="rounded-lg border border-border bg-card/70 p-5 backdrop-blur-xl md:p-7">
                  <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-3">
                      <Badge variant="outline" className="w-fit border-primary/30 bg-primary/10 text-primary">
                        <ShieldCheck className="mr-1 h-3 w-3" /> Secure customer portal
                      </Badge>
                      <div>
                        <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">Project dashboard</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
                          Signed in as {data?.email}. Track orders, submit briefs, and review delivery status in one place.
                        </p>
                      </div>
                    </div>
                    {nextOrder && (
                      <Button asChild className="gap-2 md:self-end">
                        <a href="#orders">
                          View latest order <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Next action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {nextOrder ? (
                      (() => {
                        const requirements = requirementsBySession.get(nextOrder.session_id);
                        const stage = projectStage(nextOrder, Boolean(requirements));
                        return (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">{packageName(nextOrder)}</span>
                                <span className="font-medium">{stage.label}</span>
                              </div>
                              <Progress value={stage.progress} className="h-2" />
                            </div>
                            {!requirements && nextOrder.order_code && nextOrder.requirements_token ? (
                              <Button asChild className="w-full gap-2">
                                <Link to={`/project-requirements?order=${encodeURIComponent(nextOrder.order_code)}&token=${encodeURIComponent(nextOrder.requirements_token)}`}>
                                  Submit project brief <ClipboardList className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <p className="text-sm text-muted-foreground">Everything needed right now is up to date.</p>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-muted-foreground">No customer orders are attached to this email yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Matched orders</div>
                    <div className="mt-2 text-3xl font-semibold">{data?.orders.length ?? 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Active projects</div>
                    <div className="mt-2 text-3xl font-semibold">{activeOrders}</div>
                  </CardContent>
                </Card>
                <Card className="border-border bg-card/70 backdrop-blur-xl">
                  <CardContent className="p-5">
                    <div className="text-sm text-muted-foreground">Total spend</div>
                    <div className="mt-2 text-3xl font-semibold">{formatMoney(ltv, "gbp")}</div>
                  </CardContent>
                </Card>
              </div>

              <section id="orders" className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-normal">Orders</h2>
                      <p className="text-sm text-muted-foreground">Live project status linked to your checkout email.</p>
                    </div>
                    <Badge variant="outline">{data?.orders.length ?? 0} total</Badge>
                  </div>

                  {(data?.orders.length ?? 0) === 0 ? (
                    <Card className="border-border bg-card/70 backdrop-blur-xl">
                      <CardContent className="p-8 text-center">
                        <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-4 text-2xl font-semibold">No matched orders yet</h3>
                        <p className="mt-2 text-muted-foreground">If you already bought, sign in with the exact checkout email.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    data?.orders.map((order) => {
                      const requirements = requirementsBySession.get(order.session_id);
                      const stage = projectStage(order, Boolean(requirements));
                      return (
                        <Card key={order.id} className="overflow-hidden border-border bg-card/70 backdrop-blur-xl">
                          <CardContent className="p-0">
                            <div className="grid gap-0 lg:grid-cols-[1fr_220px]">
                              <div className="space-y-5 p-5 md:p-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-xl font-semibold">{packageName(order)}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{formatMoney(order.amount_total, order.currency)}</Badge>
                                    <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">{order.payment_status || "pending"}</Badge>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{stage.label}</span>
                                  </div>
                                  <Progress value={stage.progress} className="h-2" />
                                </div>

                                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                                  <div className="rounded-md border border-border bg-background/50 p-4">
                                    <div className="text-muted-foreground">Order</div>
                                    <div className="mt-1 font-medium">{order.order_code || "Processing"}</div>
                                  </div>
                                  <div className="rounded-md border border-border bg-background/50 p-4">
                                    <div className="text-muted-foreground">Delivery</div>
                                    <div className="mt-1 font-medium">{order.order_status === "delivered" ? "Delivered" : "Open"}</div>
                                  </div>
                                  <div className="rounded-md border border-border bg-background/50 p-4">
                                    <div className="text-muted-foreground">Domain</div>
                                    <div className="mt-1 break-words font-medium">{order.delivered_domain || "—"}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-border bg-muted/20 p-5 lg:border-l lg:border-t-0 md:p-6">
                                <div className="flex h-full flex-col justify-between gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2 font-medium">
                                      <ClipboardList className="h-5 w-5 text-primary" /> Project brief
                                    </div>
                                    {requirements ? (
                                      <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">
                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Required</Badge>
                                    )}
                                  </div>
                                  {requirements ? (
                                    <p className="text-sm text-muted-foreground">
                                      {requirements.site_name} updated {new Date(requirements.updated_at).toLocaleDateString()}.
                                    </p>
                                  ) : order.order_code && order.requirements_token ? (
                                    <Button asChild className="w-full gap-2">
                                      <Link to={`/project-requirements?order=${encodeURIComponent(order.order_code)}&token=${encodeURIComponent(order.requirements_token)}`}>
                                        Add requirements <ExternalLink className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Your brief link is being prepared.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                <aside className="space-y-4">
                  <Card className="border-border bg-card/70 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Email</div>
                        <div className="mt-1 break-all font-medium">{data?.email}</div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-muted-foreground">Briefs</div>
                          <div className="mt-1 text-xl font-semibold">{data?.projectRequirements.length ?? 0}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Delivered</div>
                          <div className="mt-1 text-xl font-semibold">
                            {(data?.orders ?? []).filter((order) => order.order_status === "delivered").length}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </aside>
              </section>
            </section>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}