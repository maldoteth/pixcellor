import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PackageKey = "fullWorks" | "elite" | "retainerMonthly" | "retainerYearly" | "custom";

const PACKAGES: Record<Exclude<PackageKey, "custom">, { label: string; pricePence: number; billing: string }> = {
  fullWorks: { label: "Full Works", pricePence: 15000, billing: "one-time" },
  elite: { label: "Elite", pricePence: 50000, billing: "one-time" },
  retainerMonthly: { label: "Retainer (monthly)", pricePence: 50000, billing: "monthly" },
  retainerYearly: { label: "Retainer (yearly)", pricePence: 500000, billing: "yearly" },
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void | Promise<void>;
};

export default function NewOrderDialog({ open, onOpenChange, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pkg, setPkg] = useState<PackageKey>("fullWorks");
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState(""); // in £ (decimal)
  const [orderType, setOrderType] = useState<"paid" | "draft">("paid");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail(""); setName(""); setPkg("fullWorks");
    setCustomLabel(""); setCustomAmount(""); setOrderType("paid");
    setNotes(""); setSendEmail(true);
  };

  const handleClose = (v: boolean) => {
    if (!submitting) {
      if (!v) reset();
      onOpenChange(v);
    }
  };

  const submit = async () => {
    let packageName = "";
    let amountPence = 0;
    let billing = "one-time";

    if (pkg === "custom") {
      packageName = customLabel.trim() || "Custom";
      const parsed = Number(customAmount);
      if (!parsed || parsed <= 0) {
        toast.error("Enter a valid custom amount in £");
        return;
      }
      amountPence = Math.round(parsed * 100);
    } else {
      packageName = PACKAGES[pkg].label;
      amountPence = PACKAGES[pkg].pricePence;
      billing = PACKAGES[pkg].billing;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("portal_create_manual_order", {
      _customer_email: email,
      _customer_name: name || null,
      _package_name: packageName,
      _amount_pence: amountPence,
      _mark_paid: orderType === "paid",
      _notes: notes || null,
      _custom_label: pkg === "custom" ? customLabel : null,
      _billing: billing,
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    const created = data as { session_id?: string } | null;
    const sessionId = created?.session_id;

    if (orderType === "paid" && sendEmail && sessionId) {
      const { error: mailErr } = await supabase.functions.invoke("send-order-confirmation", {
        body: { sessionId },
      });
      if (mailErr) {
        toast.warning("Order created, but the confirmation email failed: " + mailErr.message);
      } else {
        toast.success("Order created and confirmation sent.");
      }
    } else {
      toast.success(orderType === "paid" ? "Paid order recorded." : "Draft order saved.");
    }

    setSubmitting(false);
    reset();
    onOpenChange(false);
    await onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New direct order</DialogTitle>
          <DialogDescription>
            Record a paid offline order (bank transfer, cash, invoice) or save a draft / quote.
            A matching Stripe payment for the same email + amount will auto-attach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="no-email">Customer email *</Label>
            <Input id="no-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no-name">Customer name (optional)</Label>
            <Input id="no-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div className="space-y-2">
            <Label>Package</Label>
            <Select value={pkg} onValueChange={(v) => setPkg(v as PackageKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fullWorks">Full Works — £150</SelectItem>
                <SelectItem value="elite">Elite — £500</SelectItem>
                <SelectItem value="retainerMonthly">Retainer monthly — £500/mo</SelectItem>
                <SelectItem value="retainerYearly">Retainer yearly — £5,000/yr</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pkg === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="no-label">Custom label</Label>
                <Input id="no-label" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Bespoke build" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="no-amount">Amount (£)</Label>
                <Input id="no-amount" type="number" min="0" step="0.01" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="750.00" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Order type</Label>
            <RadioGroup value={orderType} onValueChange={(v) => {
              const next = v as "paid" | "draft";
              setOrderType(next);
              setSendEmail(next === "paid");
            }} className="grid grid-cols-2 gap-2">
              <Label htmlFor="ot-paid" className="flex cursor-pointer items-center gap-2 rounded-none border border-border p-3">
                <RadioGroupItem id="ot-paid" value="paid" />
                <div>
                  <div className="font-medium">Paid (offline)</div>
                  <div className="text-xs text-muted-foreground">Bank / cash / invoice — already received</div>
                </div>
              </Label>
              <Label htmlFor="ot-draft" className="flex cursor-pointer items-center gap-2 rounded-none border border-border p-3">
                <RadioGroupItem id="ot-draft" value="draft" />
                <div>
                  <div className="font-medium">Draft / Quote</div>
                  <div className="text-xs text-muted-foreground">Parked, awaiting payment</div>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="no-notes">Notes / reference (optional)</Label>
            <Textarea id="no-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bank transfer ref ABC123…" rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-none border border-border p-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Send confirmation + requirements link</div>
              <div className="text-xs text-muted-foreground">Customer gets the same branded email as a Stripe order</div>
            </div>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} disabled={orderType !== "paid"} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !email}>
            {submitting ? "Creating…" : orderType === "paid" ? "Record paid order" : "Save draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
