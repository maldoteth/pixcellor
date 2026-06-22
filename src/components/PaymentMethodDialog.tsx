import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Loader2, ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PaymentChoiceContext = {
  packageSlug: string;
  packageName: string;
  billing: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: PaymentChoiceContext | null;
  onCardSelected: () => void;
  /** When provided, the dialog opens directly into the invoice form with these fields prefilled. */
  initialBuyer?: { name?: string; email?: string; company?: string; phone?: string };
  /** Skip the card/invoice choice screen and open straight at the invoice form. */
  initialStep?: Step;
};

type Step = "choice" | "form" | "success";

const COUNTRIES = ["United Kingdom", "Ireland", "United States", "Other"];

export function PaymentMethodDialog({ open, onOpenChange, context, onCardSelected, initialBuyer, initialStep = "choice" }: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    address_line1: "",
    city: "",
    postcode: "",
    country: "United Kingdom",
    po_reference: "",
  });
  const [result, setResult] = useState<{ hosted_url: string; invoice_number: string } | null>(null);

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setResult(null);
      if (initialBuyer) {
        setForm((f) => ({
          ...f,
          name: initialBuyer.name?.trim() || f.name,
          email: initialBuyer.email?.trim() || f.email,
          company: initialBuyer.company?.trim() || f.company,
          phone: initialBuyer.phone?.trim() || f.phone,
        }));
      }
    }
  }, [open, initialStep, initialBuyer]);

  const submit = async () => {
    if (!context) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please add your name and email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-invoice", {
        body: {
          package_slug: context.packageSlug,
          billing: { ...form },
          source: "public_checkout",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({ hosted_url: (data as any).hosted_url, invoice_number: (data as any).invoice_number });
      setStep("success");
      toast.success("Invoice sent");
    } catch (e: any) {
      toast.error(e?.message || "Could not create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Choose how to pay</DialogTitle>
              <DialogDescription>
                {context ? `${context.packageName} — ${context.billing}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-2">
              <button
                type="button"
                onClick={onCardSelected}
                className="flex items-center gap-4 rounded-lg border border-foreground/15 p-4 text-left hover:bg-foreground/5 transition"
              >
                <CreditCard className="h-6 w-6 shrink-0" />
                <div>
                  <div className="font-bold">Pay by card</div>
                  <div className="text-xs text-foreground/60">Secure Stripe checkout · instant access</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex items-center gap-4 rounded-lg border border-foreground/15 p-4 text-left hover:bg-foreground/5 transition"
              >
                <Building2 className="h-6 w-6 shrink-0" />
                <div>
                  <div className="font-bold">Pay by bank transfer (invoice)</div>
                  <div className="text-xs text-foreground/60">We email you a PDF invoice · 28 days to pay</div>
                </div>
              </button>
            </div>
          </>
        )}

        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button onClick={() => setStep("choice")} className="text-foreground/60 hover:text-foreground" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Bank transfer — billing details
              </DialogTitle>
              <DialogDescription>We'll email you a PDF invoice with our UK bank details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-name">Full name *</Label>
                  <Input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="inv-company">Company Name</Label>
                  <Input id="inv-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-email">Email *</Label>
                  <Input id="inv-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="inv-phone">Phone</Label>
                  <Input id="inv-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="inv-addr">Billing address</Label>
                <Input id="inv-addr" placeholder="Street address" value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-city">City</Label>
                  <Input id="inv-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="inv-post">Postcode</Label>
                  <Input id="inv-post" value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-country">Country</Label>
                  <select
                    id="inv-country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="inv-po">PO reference</Label>
                  <Input id="inv-po" value={form.po_reference} onChange={(e) => setForm({ ...form, po_reference: e.target.value })} />
                </div>
              </div>
              <div className="text-xs text-foreground/50">By submitting you'll receive a PDF invoice with our bank details. Payment terms: 28 days.</div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send invoice
              </Button>
            </div>
          </>
        )}

        {step === "success" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Invoice sent</DialogTitle>
              <DialogDescription>We've emailed {form.email || "you"} a copy of invoice {result.invoice_number} with the PDF and bank details attached.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Button asChild className="w-full">
                <a href={result.hosted_url} target="_blank" rel="noopener noreferrer">View invoice page</a>
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { navigator.clipboard.writeText(result.hosted_url); toast.success("Link copied"); }}
              >
                <Copy className="h-4 w-4" /> Copy invoice link
              </Button>
              <div className="text-xs text-foreground/50 text-center">Payment due within 28 days. We'll send friendly reminders if needed.</div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
