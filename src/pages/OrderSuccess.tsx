import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { CheckCircle2, ClipboardList, Globe, Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { clearCheckoutPending } from "@/lib/checkoutTracking";
import SeoHead from "@/components/SeoHead";

type OrderStatus = {
  confirmed: boolean;
  paymentStatus?: string | null;
  status?: string | null;
  packageName?: string | null;
  amount?: string | null;
  customerEmail?: string | null;
  requirementsSubmitted?: boolean;
  orderCode?: string | null;
  requirementsToken?: string | null;
  domain?: string | null;
  domainStatus?: string | null;
  domainTopUpGbp?: number | null;
};

function fireFireworks() {
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ["#ffffff", "#d8d8d8", "#9ca3af", "#60a5fa", "#22d3ee"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.72 },
      colors,
      startVelocity: 55,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.72 },
      colors,
      startVelocity: 55,
      scalar: 0.9,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  window.setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      scalar: 1.1,
    });
  }, 200);
}

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const confettiFired = useRef(false);

  useEffect(() => { clearCheckoutPending(); }, []);

  useEffect(() => {
    if (!sessionId) {
      setSyncing(false);
      setTimedOut(true);
      return;
    }

    let cancelled = false;

    const pollOrderStatus = async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const { data } = await supabase.functions.invoke("check-order-status", {
          body: { sessionId },
        });

        if (cancelled) return;

        if (data?.confirmed) {
          setOrder(data as OrderStatus);
          setSyncing(false);
          return;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000));
      }

      if (!cancelled) {
        setSyncing(false);
        setTimedOut(true);
      }
    };

    pollOrderStatus();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!order?.confirmed || confettiFired.current) return;
    confettiFired.current = true;
    requestAnimationFrame(() => fireFireworks());
  }, [order?.confirmed]);

  const packageName = order?.packageName || "Pixcellor package";

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <SeoHead
        title="Order confirmed · Pixcellor™"
        description="Your Pixcellor order is confirmed. Next steps will appear in your customer portal."
        path="/order-success"
        noindex
      />
      <section className="w-full max-w-3xl text-center space-y-6">
        <div className="mx-auto w-fit rounded-full border border-border bg-card/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur-md">
          Pixcellor™ checkout
        </div>

        <Card className="overflow-hidden border-border bg-card/70 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6 md:p-10 space-y-7">
            {syncing ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-5xl font-semibold tracking-normal">Confirming your order</h1>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Your payment was received by checkout. We’re syncing the confirmation now so your order details and email are ready.
                  </p>
                </div>
              </>
            ) : order?.confirmed ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
                  <CheckCircle2 className="h-9 w-9 text-primary" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-5xl font-semibold tracking-normal">Order confirmed</h1>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Thanks for ordering {packageName}. We’ve sent your confirmation email{order.customerEmail ? ` to ${order.customerEmail}` : ""}.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                  <div className="rounded-md border border-border bg-background/50 p-4">
                    <div className="text-muted-foreground text-lg text-slate-50 bg-white/0">Package</div>
                    <div className="font-medium mt-1">{packageName}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 p-4">
                    <div className="text-muted-foreground text-lg text-slate-50 bg-white/0">Amount</div>
                    <div className="font-medium mt-1">{order.amount || "Confirmed"}</div>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 p-4">
                    <div className="text-muted-foreground text-lg text-slate-50 bg-white/0">Status</div>
                    <div className="font-medium mt-1">Paid</div>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-5 text-left space-y-3">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Project requirements
                    {order.requirementsSubmitted && (
                      <Badge className="ml-auto border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">Reqs submitted</Badge>
                    )}
                  </div>
                  {order.requirementsSubmitted ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your project requirements are saved and linked to this order.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Use the project requirements form to send us your site name, contents, page details, colours, style direction, references, images, written content, and socials.
                      </p>
                      {order.orderCode && order.requirementsToken && (
                        <Button asChild className="mt-2">
                          <Link to={`/project-requirements?order=${encodeURIComponent(order.orderCode)}&token=${encodeURIComponent(order.requirementsToken)}`}>Add project requirements</Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {order.domain && (
                  <div className="rounded-md border border-border bg-muted/30 p-5 text-left space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Globe className="h-5 w-5 text-primary" />
                      Domain
                      <Badge className="ml-auto border-primary/40 bg-primary/10 text-primary hover:bg-primary/10">
                        {order.domainStatus === "active"
                          ? "Registered"
                          : order.domainStatus === "failed"
                          ? "Issue"
                          : "Registering…"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{order.domain}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {order.domainStatus === "active"
                        ? "Your domain is registered. We'll point it at your site as soon as we hand it over."
                        : order.domainStatus === "failed"
                        ? "Something went wrong registering your domain. We'll be in touch shortly to sort it out."
                        : "We're securing your domain now. You'll get a confirmation email within a few minutes."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted/50">
                  <Wand2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-5xl font-semibold tracking-normal">Order is still syncing</h1>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Checkout sent you back successfully, but the final confirmation is taking longer than expected. Your confirmation email should arrive shortly if payment was successful.
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/">Back to Pixcellor</Link>
              </Button>
              {order?.confirmed && (
                <Button asChild variant="outline">
                  <Link to="/customer-login">Create customer account</Link>
                </Button>
              )}
              {timedOut && (
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
