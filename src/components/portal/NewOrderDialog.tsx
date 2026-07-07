import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Loader2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PackageKey = "fullWorks" | "elite" | "retainerMonthly" | "retainerYearly" | "custom";
type Step = "email" | "name" | "package" | "custom" | "type" | "notes" | "confirm" | "done";

const PACKAGES: Record<Exclude<PackageKey, "custom">, { label: string; pricePence: number; billing: string }> = {
  fullWorks: { label: "Full Works", pricePence: 15000, billing: "one-time" },
  elite: { label: "Elite", pricePence: 50000, billing: "one-time" },
  retainerMonthly: { label: "Retainer (monthly)", pricePence: 50000, billing: "monthly" },
  retainerYearly: { label: "Retainer (yearly)", pricePence: 500000, billing: "yearly" },
};

const isEmail = (v: string) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v.trim());

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void | Promise<void>;
};

export default function NewOrderDialog({ open, onOpenChange, onCreated }: Props) {
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pkg, setPkg] = useState<PackageKey>("fullWorks");
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [orderType, setOrderType] = useState<"paid" | "draft">("paid");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ email: string; name: string; source: string }[]>([]);
  const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);

  // Reset on every open
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail(""); setName(""); setPkg("fullWorks");
      setCustomLabel(""); setCustomAmount(""); setOrderType("paid");
      setNotes(""); setSendEmail(true); setError(null); setSuggestions([]);
      setPaymentLinkUrl(null);
    }
  }, [open]);

  // Autocomplete from existing customers
  useEffect(() => {
    const q = (step === "name" ? name : email).trim();
    if ((step !== "email" && step !== "name") || q.length < 1) {
      setSuggestions([]);
      return;
    }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data, error: rpcErr } = await supabase.rpc("portal_search_customers", { _q: q });
      if (cancel || rpcErr) return;
      setSuggestions((data as { email: string; name: string; source: string }[] | null) ?? []);
    }, 150);
    return () => { cancel = true; clearTimeout(t); };
  }, [email, name, step]);

  const pickSuggestion = (s: { email: string; name: string }) => {
    setEmail(s.email);
    if (s.name) setName(s.name);
    setSuggestions([]);
    setStep((cur) => (cur === "email" ? "name" : cur));
  };

  const submit = async () => {
    let packageName = "";
    let amountPence = 0;
    let billing = "one-time";

    if (pkg === "custom") {
      packageName = customLabel.trim() || "Custom";
      const parsed = Number(customAmount);
      if (!parsed || parsed <= 0) { setError("Enter a valid £ amount"); setStep("custom"); return; }
      amountPence = Math.round(parsed * 100);
    } else {
      packageName = PACKAGES[pkg].label;
      amountPence = PACKAGES[pkg].pricePence;
      billing = PACKAGES[pkg].billing;
    }

    setSubmitting(true);
    const { data, error: rpcErr } = await supabase.rpc("portal_create_manual_order", {
      _customer_email: email.trim(),
      _customer_name: name.trim() || null,
      _package_name: packageName,
      _amount_pence: amountPence,
      _mark_paid: orderType === "paid",
      _notes: notes.trim() || null,
      _custom_label: pkg === "custom" ? customLabel.trim() : null,
      _billing: billing,
    });

    if (rpcErr) { setSubmitting(false); setError(rpcErr.message); return; }

    const created = data as { session_id?: string } | null;
    const sessionId = created?.session_id;

    if (orderType === "paid" && sendEmail && sessionId) {
      const { error: mailErr } = await supabase.functions.invoke("send-order-confirmation", { body: { sessionId } });
      if (mailErr) toast.warning("Order created, but the confirmation email failed: " + mailErr.message);
    }

    let linkUrl: string | null = null;
    if (orderType === "draft" && sessionId) {
      const isRecurring = billing === "monthly" || billing === "yearly";
      const { data: linkData, error: linkErr } = await supabase.functions.invoke("create-custom-payment-link", {
        body: {
          description: packageName,
          amount_gbp: amountPence / 100,
          quantity: 1,
          mode: isRecurring ? "subscription" : "payment",
          client_email: email.trim(),
          internal_note: notes.trim() || null,
          attach_session_id: sessionId,
        },
      });
      if (linkErr) {
        toast.warning("Draft saved, but couldn't create Stripe link: " + linkErr.message);
      } else {
        linkUrl = (linkData as { url?: string } | null)?.url ?? null;
        if (linkUrl) setPaymentLinkUrl(linkUrl);
      }
    }

    setSubmitting(false);
    setStep("done");
    await onCreated?.();
    setTimeout(() => onOpenChange(false), linkUrl ? 4500 : 1600);
  };

  const handleNext = async () => {
    setError(null);
    if (step === "email") {
      if (!isEmail(email)) { setError("Enter a valid customer email"); return; }
      setStep("name"); return;
    }
    if (step === "name") { setStep("package"); return; }
    if (step === "package") {
      if (pkg === "custom") setStep("custom"); else setStep("type");
      return;
    }
    if (step === "custom") {
      const parsed = Number(customAmount);
      if (!parsed || parsed <= 0) { setError("Enter a valid £ amount"); return; }
      setStep("type"); return;
    }
    if (step === "type") { setStep("notes"); return; }
    if (step === "notes") { setStep("confirm"); return; }
    if (step === "confirm") { await submit(); }
  };

  const handleSkip = () => {
    setError(null);
    if (step === "name") { setName(""); setStep("package"); return; }
    if (step === "notes") { setNotes(""); setStep("confirm"); return; }
  };

  const canSkip = step === "name" || step === "notes";

  const promptLabel = (() => {
    if (step === "email") return "Customer's email?";
    if (step === "name") return `Got it. Customer name? (optional)`;
    if (step === "package") return "Which package?";
    if (step === "custom") return "Custom — label and £ amount";
    if (step === "type") return "Is it already paid, or a draft / quote?";
    if (step === "notes") return "Any internal notes? (optional)";
    if (step === "confirm") return "Review and create order";
    return "";
  })();

  const finalAmountPence = pkg === "custom" ? Math.round((Number(customAmount) || 0) * 100) : PACKAGES[pkg].pricePence;
  const finalPackageLabel = pkg === "custom" ? (customLabel.trim() || "Custom") : PACKAGES[pkg].label;
  const fmtGBP = (p: number) => `£${(p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;

  const inputClass = "w-full bg-foreground/5 border border-foreground/15 rounded-md px-3 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/40 transition";

  const SuggestionList = () => (
    suggestions.length === 0 ? null : (
      <div ref={suggestionsBoxRef} className="mt-1 max-h-48 overflow-auto rounded-md border border-foreground/15 bg-background/95 backdrop-blur">
        {suggestions.map((s) => (
          <button
            key={s.email + s.source}
            type="button"
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-foreground/10"
            onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
          >
            <div className="font-medium text-foreground">{s.email}</div>
            <div className="text-xs text-foreground/60">{s.name || "—"} · {s.source}</div>
          </button>
        ))}
      </div>
    )
  );

  const content = (
    <div className="flex flex-col gap-4 px-1 pb-2">
      <AnimatePresence mode="wait">
        {step === "done" ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-3 py-6"
          >
            <div className="w-12 h-12 rounded-full bg-foreground/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-foreground" />
            </div>
            <p className="text-foreground text-base font-medium">
              {orderType === "paid" ? "Paid order recorded" : "Draft saved"}
            </p>
            <p className="text-foreground/70 text-sm text-center">
              {finalPackageLabel} · {fmtGBP(finalAmountPence)} · {email}
            </p>
            {paymentLinkUrl && (
              <div className="w-full mt-2 flex flex-col gap-2 rounded-md border border-foreground/15 bg-foreground/5 p-3">
                <span className="text-foreground/60 text-xs uppercase tracking-wider">Stripe payment link</span>
                <a href={paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-mono text-foreground hover:underline">
                  {paymentLinkUrl}
                </a>
                <Button
                  type="button"
                  variant="pricing"
                  className="h-9"
                  onClick={() => { navigator.clipboard.writeText(paymentLinkUrl); toast.success("Payment link copied"); }}
                >
                  <Copy className="w-3.5 h-3.5" /> Copy link
                </Button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-3"
          >
            <label className="text-foreground/70 text-xs uppercase tracking-wider">{promptLabel}</label>

            {step === "email" && (
              <>
                <input
                  autoFocus
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
                  placeholder="client@example.com — start typing to find existing clients"
                  className={inputClass}
                  maxLength={200}
                  autoComplete="off"
                />
                <SuggestionList />
              </>
            )}

            {step === "name" && (
              <>
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
                  placeholder="Jane Doe"
                  className={inputClass}
                  maxLength={100}
                  autoComplete="off"
                />
                <SuggestionList />
              </>
            )}

            {step === "package" && (
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(PACKAGES) as Array<keyof typeof PACKAGES>).map((k) => {
                  const p = PACKAGES[k];
                  const active = pkg === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPkg(k)}
                      className={`flex items-center justify-between rounded-md border px-3 py-3 text-left transition ${active ? "border-foreground bg-foreground/10" : "border-foreground/15 hover:border-foreground/40"}`}
                    >
                      <span className="text-sm font-medium text-foreground">{p.label}</span>
                      <span className="text-sm text-foreground/70">{fmtGBP(p.pricePence)}{p.billing !== "one-time" ? ` / ${p.billing.replace("ly", "")}` : ""}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPkg("custom")}
                  className={`flex items-center justify-between rounded-md border px-3 py-3 text-left transition ${pkg === "custom" ? "border-foreground bg-foreground/10" : "border-foreground/15 hover:border-foreground/40"}`}
                >
                  <span className="text-sm font-medium text-foreground">Custom…</span>
                  <span className="text-sm text-foreground/70">Set your own £</span>
                </button>
              </div>
            )}

            {step === "custom" && (
              <div className="grid grid-cols-1 gap-3">
                <input
                  autoFocus
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Label (e.g. Bespoke build)"
                  maxLength={80}
                  className={inputClass}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); if (error) setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
                  placeholder="Amount in £ (e.g. 750.00)"
                  className={inputClass}
                />
              </div>
            )}

            {step === "type" && (
              <div className="grid grid-cols-1 gap-2">
                {([
                  { v: "paid", t: "Paid (offline)", d: "Bank / cash / invoice — already received" },
                  { v: "draft", t: "Draft / Quote", d: "Parked, awaiting payment. Auto-attaches if Stripe payment matches." },
                ] as const).map((o) => {
                  const active = orderType === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => { setOrderType(o.v); setSendEmail(o.v === "paid"); }}
                      className={`flex flex-col gap-0.5 rounded-md border px-3 py-3 text-left transition ${active ? "border-foreground bg-foreground/10" : "border-foreground/15 hover:border-foreground/40"}`}
                    >
                      <span className="text-sm font-medium text-foreground">{o.t}</span>
                      <span className="text-xs text-foreground/60">{o.d}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === "notes" && (
              <textarea
                autoFocus
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Bank transfer ref ABC123, Stripe link sent on 9 May…"
                rows={4}
                maxLength={1000}
                className={`${inputClass} resize-none`}
              />
            )}

            {step === "confirm" && (
              <div className="flex flex-col gap-2 rounded-md border border-foreground/15 bg-foreground/5 p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-foreground/60">Customer</span><span className="text-foreground text-right">{name ? `${name} · ` : ""}{email}</span></div>
                <div className="flex justify-between gap-3"><span className="text-foreground/60">Package</span><span className="text-foreground text-right">{finalPackageLabel}</span></div>
                <div className="flex justify-between gap-3"><span className="text-foreground/60">Amount</span><span className="text-foreground text-right font-semibold">{fmtGBP(finalAmountPence)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-foreground/60">Type</span><span className="text-foreground text-right">{orderType === "paid" ? "Paid (offline)" : "Draft / Quote"}</span></div>
                {notes && <div className="flex justify-between gap-3"><span className="text-foreground/60">Notes</span><span className="text-foreground text-right line-clamp-2">{notes}</span></div>}
                {orderType === "paid" && (
                  <label className="mt-1 flex items-center justify-between gap-3 border-t border-foreground/10 pt-2">
                    <span className="text-foreground/70 text-xs">Send branded confirmation + requirements link</span>
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-foreground" />
                  </label>
                )}
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 mt-2">
              {canSkip && (
                <Button type="button" variant="pricing" onClick={handleSkip} disabled={submitting} className="flex-1 h-12 font-semibold">
                  Skip
                </Button>
              )}
              <Button type="button" variant="pricing" onClick={handleNext} disabled={submitting} className="flex-1 h-12 font-semibold">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : step === "confirm" ? (orderType === "paid" ? "Record paid order" : "Save order") : "Next"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const title = "New direct order";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !submitting && onOpenChange(v)} dismissible={false}>
        <DrawerContent className="carousel-label-glass border-foreground/10 text-foreground">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <button
                type="button"
                className="absolute right-2 top-2 rounded-sm p-2 text-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                onClick={() => !submitting && onOpenChange(false)}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </DrawerClose>
            <DrawerTitle className="text-foreground text-center pr-8">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent
        className="sm:max-w-[460px] carousel-label-glass border-foreground/10 text-foreground"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
