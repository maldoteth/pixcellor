import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Check,
  ClipboardList,
  CreditCard,
  ExternalLink,
  FileText,
  Globe2,
  Home,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  PackageCheck,
  PanelLeft,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  Wand2,
  EyeOff,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import customerPortalPLogo from "@/assets/customer-portal-p-logo.png";
import ChatBot from "@/components/ChatBot";
import SeoHead from "@/components/SeoHead";
import VisionGenerator from "@/components/VisionGenerator";


const BUY_AGAIN_PACKAGES = [
  {
    key: "fullWorks",
    name: "Full Works",
    price: "£150",
    rrp: "RRP £375",
    discount: "60% off",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment",
    billing: "One-time payment",
    action: "Buy again",
    featured: false,
    features: ["Industry leading website", "Lifetime warranty", "Custom design", "Up to 3 pages"],
  },
  {
    key: "elite",
    name: "Elite",
    price: "£500",
    rrp: "RRP £1,500",
    discount: "67% off",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    mode: "payment",
    billing: "One-time payment",
    action: "Buy again",
    featured: true,
    features: ["Sites or web apps", "Unlimited revisions", "SEO & AEO optimisation", "Up to 10 pages"],
  },
  {
    key: "retainer",
    name: "Retainer",
    price: "£2,500/mo",
    rrp: "RRP £4,000",
    discount: "37% off",
    priceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    mode: "subscription",
    billing: "Monthly subscription",
    action: "Subscribe",
    featured: false,
    features: ["Your own tech department", "Daily updates", "Websites or full apps", "Monthly billing"],
  },
] as const;

type PortalTab = "overview" | "orders" | "briefs" | "delivered" | "activity" | "payments" | "leads";

type CustomerOrder = {
  id: string;
  session_id: string;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  mode: string | null;
  status: string | null;
  payment_status: string | null;
  order_status: string | null;
  delivered_domain: string | null;
  delivered_at: string | null;
  order_code: string | null;
  requirements_token: string | null;
  subscription_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type CustomerRequirement = {
  id: string;
  session_id: string;
  site_name: string;
  site_contents: string;
  images_content_socials: string;
  reference_links: string | null;
  colours_styles: string;
  pages_details: string;
  extra_notes: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerSampleRequest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  package_name: string | null;
  request_details: Record<string, unknown> | null;
  delivered_at: string | null;
  delivered_domain: string | null;
  created_at: string;
};

type CustomerVisionPreview = {
  id: string;
  slug: string;
  title: string | null;
  brief: string | null;
  image_path: string;
  created_at: string;
};

type CustomerLeadSource = {
  email: string;
  source_key: string;
  label: string | null;
};

type CustomerLead = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  source: string;
  location: string | null;
  created_at: string;
};

type CustomerPortalData = {
  email: string;
  leadSource?: CustomerLeadSource | null;
  leads?: CustomerLead[];
  orders: CustomerOrder[];
  projectRequirements: CustomerRequirement[];
  sampleRequests?: CustomerSampleRequest[];
  visionPreviews?: CustomerVisionPreview[];
};

type CustomerSubscription = {
  id: string;
  subscription_id: string;
  customer_email: string | null;
  tier: string | null;
  status: string;
  price_id: string | null;
  amount_total: number | null;
  currency: string | null;
  billing_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
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

const billingLabel = (order: CustomerOrder) => {
  const value = order.metadata?.billing;
  if (typeof value === "string" && value.trim()) return value;
  if (order.mode === "subscription") return "Subscription";
  return "One-time payment";
};

const isRetainerOrder = (order: CustomerOrder) => {
  const plan = `${packageName(order)} ${billingLabel(order)} ${order.mode ?? ""}`.toLowerCase();
  return Boolean(order.subscription_id) || plan.includes("retainer") || plan.includes("subscription") || plan.includes("monthly") || plan.includes("yearly");
};

const orderStage = (order: CustomerOrder, hasRequirements: boolean) => {
  if (order.order_status === "delivered") return { label: "Delivered", progress: 100 };
  if (hasRequirements) return { label: "In production", progress: 66 };
  if (order.payment_status === "paid") return { label: "Brief needed", progress: 33 };
  return { label: "Payment pending", progress: 12 };
};

const addBillingPeriod = (date: string, billing: string) => {
  const next = new Date(date);
  if (Number.isNaN(next.getTime())) return null;
  const yearly = billing.toLowerCase().includes("year");
  if (yearly) next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const previewUrl = (domain: string | null) => {
  if (!domain) return null;
  return `https://${domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")}`;
};

export default function CustomerPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [subscription, setSubscription] = useState<CustomerSubscription | null>(null);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [leadQuery, setLeadQuery] = useState("");

  const refreshHiddenCount = useCallback(async () => {
    const { count } = await supabase
      .from("customer_hidden_visions")
      .select("*", { count: "exact", head: true });
    setHiddenCount(count ?? 0);
  }, []);

  const loadPortal = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      navigate("/customer-login", { replace: true });
      return;
    }

    const [{ data: portalData, error }, { data: adminRole }, { data: subRow }] = await Promise.all([
      supabase.rpc("customer_fetch_portal"),
      supabase.rpc("has_role", {
        _user_id: sessionData.session.user.id,
        _role: "admin",
      }),
      supabase
        .from("subscriptions")
        .select("*")
        .order("current_period_end", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setIsAdmin(Boolean(adminRole));
    setData(portalData as CustomerPortalData);
    setSubscription((subRow as CustomerSubscription | null) ?? null);
    setLoading(false);
    refreshHiddenCount();
  }, [navigate, refreshHiddenCount]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/customer-login", { replace: true });
      if (event === "SIGNED_IN") window.setTimeout(loadPortal, 0);
    });

    loadPortal();
    return () => listener.subscription.unsubscribe();
  }, [loadPortal, navigate]);

  const requirementsBySession = useMemo(() => {
    const map = new Map<string, CustomerRequirement>();
    for (const item of data?.projectRequirements ?? []) map.set(item.session_id, item);
    return map;
  }, [data?.projectRequirements]);

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const purchasedPackageNames = useMemo(() => new Set(orders.map((order) => packageName(order).toLowerCase())), [orders]);
  const briefs = useMemo(() => data?.projectRequirements ?? [], [data?.projectRequirements]);
  const deliveredOrders = useMemo(() => orders.filter((order) => order.order_status === "delivered"), [orders]);
  const retainerOrders = useMemo(() => orders.filter(isRetainerOrder), [orders]);
  const sampleRequests = useMemo(() => data?.sampleRequests ?? [], [data?.sampleRequests]);
  const visionPreviews = useMemo(() => data?.visionPreviews ?? [], [data?.visionPreviews]);
  const leads = useMemo(() => data?.leads ?? [], [data?.leads]);
  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.contact_name, lead.email, lead.phone, lead.notes, lead.status, lead.location].some((value) =>
        value?.toLowerCase().includes(q),
      ),
    );
  }, [leadQuery, leads]);
  const activityCount = sampleRequests.length + visionPreviews.length;
  const latestRetainer = retainerOrders[0] ?? null;
  const nextRetainerPayment = latestRetainer ? addBillingPeriod(latestRetainer.created_at, billingLabel(latestRetainer)) : null;
  const nextOrder = orders.find((order) => order.order_status !== "delivered") ?? orders[0] ?? null;

  const navItems: { title: string; value: PortalTab; icon: typeof Home }[] = [
    { title: "Overview", value: "overview", icon: Home },
    { title: "Order history", value: "orders", icon: ReceiptText },
    { title: "Briefs", value: "briefs", icon: FileText },
    { title: "Domains", value: "delivered", icon: Globe2 },
    { title: "Designs", value: "activity", icon: Wand2 },
    { title: "Payments", value: "payments", icon: CreditCard },
    ...(data?.leadSource ? [{ title: "Leads", value: "leads" as const, icon: Inbox }] : []),
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/customer-login", { replace: true });
  };

  const handleBuyAgain = async (plan: (typeof BUY_AGAIN_PACKAGES)[number]) => {
    try {
      const { data: checkout, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceId, mode: plan.mode, packageName: plan.name, billing: plan.billing },
      });
      if (error) throw error;
      if (checkout?.url) window.location.href = checkout.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
    }
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
      <SeoHead
        title="Customer portal · Pixcellor™"
        description="Track your Pixcellor project, requirements, edits and orders."
        path="/customer-portal"
        noindex
      />
      <div className="min-h-screen w-full bg-background text-foreground md:flex">
        <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar/95 backdrop-blur-xl">
          <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center border border-sidebar-border bg-sidebar-accent p-1.5">
                <img src={customerPortalPLogo} alt="Pixcellor P logo" className="h-full w-full object-contain" />
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
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        className="data-[active=true]:bg-sidebar-accent"
                        isActive={activeTab === item.value}
                        onClick={() => setActiveTab(item.value)}
                      >
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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button asChild variant="pricing" size="sm" className="gap-2 max-md:h-9 max-md:w-9 max-md:p-0" aria-label="Admin panel">
                  <Link to="/portal">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="max-md:hidden">Admin panel</span>
                  </Link>
                </Button>
              )}
              <Button variant="pricing" size="sm" className="gap-2 max-md:h-9 max-md:w-9 max-md:p-0" onClick={() => setChatOpen(true)} aria-label="Chat">
                <MessageCircle className="h-4 w-4" />
                <span className="max-md:hidden">Chat</span>
              </Button>
              <Button variant="pricing" size="sm" className="gap-2 max-md:h-9 max-md:w-9 max-md:p-0" onClick={handleSignOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="max-md:hidden">Sign out</span>
              </Button>
            </div>
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
                          Signed in as {data?.email}. Review your orders, briefs, deliveries, and retainer payments.
                        </p>
                      </div>
                    </div>
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
                        const stage = orderStage(nextOrder, Boolean(requirements));
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
                              <Button asChild variant="pricing" className="w-full gap-2">
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
                      <p className="text-sm text-muted-foreground">No order history is attached to this account yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortalTab)} className="space-y-5">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-3 lg:grid-cols-7">
                  {navItems.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="pricing-button h-10 gap-2 rounded-none px-3 text-xs text-foreground shadow-none data-[state=active]:brightness-125 sm:text-sm"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.value === "delivered" ? "Domains" : item.value === "payments" ? "Payments" : item.title}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview" className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Card className="border-border bg-card/70 backdrop-blur-xl">
                      <CardContent className="p-5">
                        <div className="text-sm text-muted-foreground">Order history</div>
                        <div className="mt-2 text-3xl font-semibold">{orders.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-border bg-card/70 backdrop-blur-xl">
                      <CardContent className="p-5">
                        <div className="text-sm text-muted-foreground">briefs</div>
                        <div className="mt-2 text-3xl font-semibold">{briefs.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-border bg-card/70 backdrop-blur-xl">
                      <CardContent className="p-5">
                        <div className="text-sm text-muted-foreground">sites</div>
                        <div className="mt-2 text-3xl font-semibold">{deliveredOrders.length}</div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-3">
                    <SectionHeader title="Recent orders" description="Your latest purchases and project status." count={orders.length} />
                    {orders.length === 0 ? <EmptyState icon={PackageCheck} title="No order history yet" text="Orders will appear here after checkout." /> : orders.slice(0, 3).map((order) => <OrderCard key={order.id} order={order} requirement={requirementsBySession.get(order.session_id)} />)}
                  </div>
                </TabsContent>

                <TabsContent value="leads" className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <SectionHeader title="Leads" description={`Leads from ${data?.leadSource?.label ?? "your website"}.`} count={leads.length} />
                    <div className="relative w-full md:max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={leadQuery}
                        onChange={(event) => setLeadQuery(event.target.value)}
                        placeholder="Search leads"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  {filteredLeads.length === 0 ? (
                    <EmptyState icon={Inbox} title="No leads yet" text="New enquiries from your website will appear here." />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {filteredLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                  <SectionHeader title="Order history" description="Every order attached to this account, shown as one clean history." count={orders.length} />
                  {orders.length === 0 ? <EmptyState icon={PackageCheck} title="No order history yet" text="Orders will appear here after checkout." /> : orders.map((order) => <OrderCard key={order.id} order={order} requirement={requirementsBySession.get(order.session_id)} />)}
                </TabsContent>

                <TabsContent value="briefs" className="space-y-4">
                  <SectionHeader title="briefs" description="Each brief you have sent to Pixcellor is visible here." count={briefs.length} />
                  {briefs.length === 0 ? <EmptyState icon={FileText} title="No briefs submitted yet" text="When a project brief is submitted, it will appear here." /> : briefs.map((brief) => <BriefCard key={brief.id} brief={brief} order={orders.find((order) => order.session_id === brief.session_id)} />)}
                </TabsContent>

                <TabsContent value="delivered" className="space-y-4">
                  <SectionHeader title="Domains" description="Live previews and links for completed deliveries." count={deliveredOrders.length} />
                  {deliveredOrders.length === 0 ? <EmptyState icon={Globe2} title="No sites yet" text="Delivered projects will appear" /> : <div className="grid gap-4 xl:grid-cols-2">{deliveredOrders.map((order) => <DeliveredPreview key={order.id} order={order} />)}</div>}
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <SectionHeader title="Designs" description="Find your generated design drafts here" count={visionPreviews.length} />
                        {hiddenCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 rounded-none"
                            onClick={async () => {
                              const { data: userData } = await supabase.auth.getUser();
                              const uid = userData.user?.id;
                              if (!uid) return;
                              const { error } = await supabase
                                .from("customer_hidden_visions")
                                .delete()
                                .eq("user_id", uid);
                              if (error) {
                                toast.error("Could not unhide designs.");
                                return;
                              }
                              toast.success(`Unhid ${hiddenCount} design${hiddenCount === 1 ? "" : "s"}`);
                              setHiddenCount(0);
                              await loadPortal();
                            }}
                          >
                            Unhide ({hiddenCount})
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-vision"))}
                        variant="pricing"
                        size="sm"
                        className="gap-2 rounded-none"
                      >
                        <Plus className="h-4 w-4" /> Generate design
                      </Button>
                    </div>
                    {visionPreviews.length === 0 ? (
                      <EmptyState icon={ImageIcon} title="No designs yet" text="Generate a design from the homepage and it will be saved here." />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {visionPreviews.map((preview) => (
                          <VisionPreviewCard
                            key={preview.id}
                            preview={preview}
                            onHide={async () => {
                              const { error } = await supabase
                                .from("customer_hidden_visions")
                                .insert({
                                  user_id: (await supabase.auth.getUser()).data.user?.id,
                                  slug: preview.slug,
                                });
                              if (error) {
                                toast.error("Could not hide that design.");
                              } else {
                                toast.success("Design hidden");
                                setHiddenCount((c) => c + 1);
                                setData((prev) => prev ? { ...prev, visionPreviews: (prev.visionPreviews ?? []).filter((p) => p.slug !== preview.slug) } : prev);
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  <SectionHeader title="Payments" description="Retainer plan details, past payments, and the next scheduled billing date." />
                  <div className="grid gap-4 lg:grid-cols-3">
                    {BUY_AGAIN_PACKAGES.map((plan) => {
                      const hasBoughtPlan = purchasedPackageNames.has(plan.name.toLowerCase());
                      const buttonLabel = hasBoughtPlan ? "Buy again" : plan.mode === "subscription" ? "Subscribe" : "Buy now";

                      return (
                        <Card key={plan.key} className={`relative overflow-hidden border-border bg-card/70 backdrop-blur-xl ${plan.featured ? "border-primary/40" : ""}`}>
                          <CardContent className="flex h-full flex-col p-5">
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold">{plan.name}</h3>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-muted-foreground text-sm">or {plan.rrp.replace(/^RRP\s*/i, "")}</span>
                              </div>
                              <p className="text-xs font-semibold text-foreground">Pixcellor private SME grant — {plan.discount}</p>
                            </div>
                            <ul className="my-5 flex-1 space-y-2 text-sm text-muted-foreground">
                              {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start gap-2">
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Button variant="pricing" className="w-full gap-2" onClick={() => handleBuyAgain(plan)}>
                              {buttonLabel} <CreditCard className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {retainerOrders.length === 0 ? (
                    <EmptyState icon={CreditCard} title="No retainer plan found" text="One-time project payments remain visible in order history." />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
                      <Card className="border-border bg-card/70 backdrop-blur-xl">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-primary" /> Current plan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Plan</div>
                            <div className="mt-1 text-lg font-semibold">{latestRetainer ? packageName(latestRetainer) : "Retainer"}</div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3">
                            <InfoTile label="Billing" value={latestRetainer ? billingLabel(latestRetainer) : "—"} />
                            <InfoTile label="Status" value={latestRetainer?.payment_status || "Active"} />
                          </div>
                          <InfoTile label="Next scheduled payment" value={nextRetainerPayment ? nextRetainerPayment.toLocaleDateString() : "Not available"} />
                        </CardContent>
                      </Card>
                      <div className="space-y-3">
                        {retainerOrders.map((order) => (
                          <Card key={order.id} className="border-border bg-card/70 backdrop-blur-xl">
                            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="font-semibold">{packageName(order)}</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()} · {billingLabel(order)}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{formatMoney(order.amount_total, order.currency)}</Badge>
                                <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">{order.payment_status || "scheduled"}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

              </Tabs>
            </section>
          </main>
          <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} showToggle={false} />
          <VisionGenerator hidden chatOpen={chatOpen} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SectionHeader({ title, description, count }: { title: string; description: string; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {typeof count === "number" && <Badge variant="outline">{count}</Badge>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof PackageCheck; title: string; text: string }) {
  return (
    <Card className="border-border bg-card/70 backdrop-blur-xl">
      <CardContent className="p-8 text-center">
        <Icon className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-2xl font-semibold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-4">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function OrderCard({ order, requirement }: { order: CustomerOrder; requirement?: CustomerRequirement }) {
  const stage = orderStage(order, Boolean(requirement));
  return (
    <Card className="overflow-hidden border-border bg-card/70 backdrop-blur-xl">
      <CardContent className="p-0">
        <div className="grid gap-0 lg:grid-cols-[1fr_230px]">
          <div className="space-y-5 p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{packageName(order)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()} · {billingLabel(order)}</p>
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
              <InfoTile label="Order" value={order.order_code || "Processing"} />
              <InfoTile label="Delivery" value={order.order_status === "delivered" ? "Delivered" : "Open"} />
              <InfoTile label="Domain" value={order.delivered_domain || "—"} />
            </div>
          </div>
          <div className="border-t border-border bg-muted/20 p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-medium">
                  <ClipboardList className="h-5 w-5 text-primary" /> Project brief
                </div>
                {requirement ? (
                  <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline">Required</Badge>
                )}
              </div>
              {requirement ? (
                <p className="text-sm text-muted-foreground">{requirement.site_name} updated {new Date(requirement.updated_at).toLocaleDateString()}.</p>
              ) : order.order_code && order.requirements_token ? (
                <Button asChild variant="pricing" className="w-full gap-2">
                  <Link to={`/project-requirements?order=${encodeURIComponent(order.order_code)}&token=${encodeURIComponent(order.requirements_token)}`}>
                    Add brief <ExternalLink className="h-4 w-4" />
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
}

function BriefCard({ brief, order }: { brief: CustomerRequirement; order?: CustomerOrder }) {
  const rows = [
    ["Site contents", brief.site_contents],
    ["Pages", brief.pages_details],
    ["Images, content & socials", brief.images_content_socials],
    ["Colours & styles", brief.colours_styles],
    ["Reference links", brief.reference_links],
    ["Extra notes", brief.extra_notes],
  ].filter(([, value]) => typeof value === "string" && value.trim());

  return (
    <Card className="border-border bg-card/70 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{brief.site_name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Submitted {new Date(brief.created_at).toLocaleString()}</p>
          </div>
          {order && <Badge variant="outline">{order.order_code || packageName(order)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-background/50 p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DeliveredPreview({ order }: { order: CustomerOrder }) {
  const url = previewUrl(order.delivered_domain);
  return (
    <Card className="overflow-hidden border-border bg-card/70 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{packageName(order)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Delivered {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString() : "recently"}</p>
          </div>
          {url && (
              <Button asChild variant="pricing" size="sm" className="gap-2">
              <a href={url} target="_blank" rel="noreferrer">Open site <ExternalLink className="h-4 w-4" /></a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {url ? (
          <div className="overflow-hidden rounded-md border border-border bg-background">
            <iframe title={`${packageName(order)} preview`} src={url} className="h-[360px] w-full" loading="lazy" />
          </div>
        ) : (
          <div className="rounded-md border border-border bg-background/50 p-6 text-sm text-muted-foreground">Preview domain is being prepared.</div>
        )}
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead }: { lead: CustomerLead }) {
  return (
    <Card className="border-border bg-card/70 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{lead.contact_name || lead.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Received {new Date(lead.created_at).toLocaleString()}</p>
          </div>
          <Badge variant="outline" className="capitalize">{lead.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {lead.email && (
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-none">
              <a href={`mailto:${lead.email}`}><Mail className="h-4 w-4" />{lead.email}</a>
            </Button>
          )}
          {lead.phone && (
            <Button asChild variant="outline" size="sm" className="gap-2 rounded-none">
              <a href={`tel:${lead.phone}`}><Phone className="h-4 w-4" />{lead.phone}</a>
            </Button>
          )}
        </div>
        {lead.notes ? (
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background/50 p-4 text-sm leading-relaxed text-muted-foreground">{lead.notes}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No message provided.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SampleRequestCard({ sample }: { sample: CustomerSampleRequest }) {
  const details = sample.request_details ?? {};
  const dream = typeof (details as Record<string, unknown>).dream === "string" ? ((details as Record<string, unknown>).dream as string) : null;
  const colours = typeof (details as Record<string, unknown>).colours === "string" ? ((details as Record<string, unknown>).colours as string) : null;
  const previewLink = sample.delivered_domain ? previewUrl(sample.delivered_domain) : null;
  return (
    <Card className="border-border bg-card/70 backdrop-blur-xl">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold">Free sample request</h3>
            </div>
            <p className="mt-1 text-muted-foreground text-lg text-slate-50 bg-white/0">Submitted {new Date(sample.created_at).toLocaleString()}</p>
          </div>
          {sample.delivered_at ? (
            <Badge className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Delivered
            </Badge>
          ) : (
            <Badge variant="outline">In progress</Badge>
          )}
        </div>
        {(dream || colours) && (
          <div className="grid gap-2 text-sm md:grid-cols-2">
            {dream && (
              <div className="rounded-md border border-border bg-background/50 p-3">
                <div className="text-muted-foreground text-lg text-slate-50 bg-white/0">Brief</div>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap leading-snug">{dream}</p>
              </div>
            )}
            {colours && (
              <div className="rounded-md border border-border bg-background/50 p-3">
                <div className="text-muted-foreground text-lg text-slate-50 bg-white/0">Colours & style</div>
                <p className="mt-1 line-clamp-4 whitespace-pre-wrap leading-snug">{colours}</p>
              </div>
            )}
          </div>
        )}
        {previewLink && (
          <Button asChild variant="pricing" size="sm" className="gap-2">
            <a href={previewLink} target="_blank" rel="noreferrer">Open delivered sample <ExternalLink className="h-4 w-4" /></a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const VISION_BUCKET = "vision-previews";

function VisionPreviewCard({ preview, onHide }: { preview: CustomerVisionPreview; onHide?: () => void }) {
  const imageUrl = supabase.storage.from(VISION_BUCKET).getPublicUrl(preview.image_path).data.publicUrl;
  return (
    <Card className="overflow-hidden border-border bg-card/70 backdrop-blur-xl">
      <a href={`/preview/${preview.slug}`} target="_blank" rel="noreferrer" className="block">
        <div className="aspect-[16/10] overflow-hidden border-b border-border bg-black/40">
          {imageUrl ? (
            <img src={imageUrl} alt={preview.title || "AI generated vision"} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
          )}
        </div>
      </a>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{preview.title || "AI vision"}</h3>
          <span className="shrink-0 text-muted-foreground text-lg text-slate-50 bg-white/0">{new Date(preview.created_at).toLocaleDateString()}</span>
        </div>
        {preview.brief && <p className="line-clamp-2 text-muted-foreground text-lg text-slate-50 bg-white/0">{preview.brief}</p>}
        <div className="flex gap-2">
          <Button asChild variant="pricing" size="sm" className="flex-1 gap-2">
            <a href={`/preview/${preview.slug}`} target="_blank" rel="noreferrer">Preview <ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
          {onHide && (
            <Button variant="outline" size="sm" className="gap-2 rounded-none" onClick={onHide} title="Hide this design">
              <EyeOff className="h-3.5 w-3.5" /> Hide
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

