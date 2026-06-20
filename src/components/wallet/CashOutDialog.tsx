import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { OtpPrompt } from "./OtpPrompt";

interface CashOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  ethBalance: string;
  solBalance: string;
  ethGbp: number;
  solGbp: number;
}

export function CashOutDialog({
  open,
  onOpenChange,
  userId,
  ethBalance,
  solBalance,
  ethGbp,
  solGbp,
}: CashOutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [chain, setChain] = useState<"ETH" | "SOL">("ETH");
  const [amount, setAmount] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    if (!open) setOtpVerified(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("user_bank_details")
        .select("full_name, sort_code, account_number, bank_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setSortCode(data.sort_code ?? "");
        setAccountNumber(data.account_number ?? "");
        setBankName(data.bank_name ?? "");
      }
      setLoading(false);
    })();
  }, [open, userId]);

  const formatSortCode = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    return digits.replace(/(\d{2})(?=\d)/g, "$1-");
  };

  const validateBank = () => {
    if (!fullName.trim()) return "Full name is required";
    if (!/^\d{2}-\d{2}-\d{2}$/.test(sortCode)) return "Sort code must be 6 digits (e.g. 12-34-56)";
    if (!/^\d{8}$/.test(accountNumber)) return "Account number must be 8 digits";
    return null;
  };

  const saveBankDetails = async () => {
    const err = validateBank();
    if (err) {
      toast.error(err);
      return false;
    }
    setSaving(true);
    const { error } = await supabase.from("user_bank_details").upsert({
      user_id: userId,
      full_name: fullName.trim(),
      sort_code: sortCode,
      account_number: accountNumber,
      bank_name: bankName.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save bank details");
      return false;
    }
    toast.success("Bank details saved");
    return true;
  };

  const requestCashOut = async () => {
    const bankErr = validateBank();
    if (bankErr) {
      toast.error(bankErr);
      return;
    }
    const amt = Number(amount);
    const max = chain === "ETH" ? Number(ethBalance) : Number(solBalance);
    if (!amt || amt <= 0) return toast.error("Enter an amount greater than 0");
    if (amt > max) return toast.error(`Amount exceeds your ${chain} balance`);
    if (!otpVerified) return toast.error("Confirm the emailed code first");

    const ok = await saveBankDetails();
    if (!ok) return;

    setSaving(true);
    const gbpValue = amt * (chain === "ETH" ? ethGbp : solGbp);
    const { error } = await supabase.from("cash_out_requests").insert({
      user_id: userId,
      chain,
      amount: amt,
      gbp_value: gbpValue,
      full_name: fullName.trim(),
      sort_code: sortCode,
      account_number: accountNumber,
      bank_name: bankName.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to submit cash-out request");
      return;
    }
    toast.success("Cash-out request submitted");
    setAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="w-5 h-5" /> Cash out to bank
          </DialogTitle>
          <DialogDescription>
            Add your UK bank details and request a payout. We'll convert your crypto to GBP and send it to your bank.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account holder full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sort code</Label>
                <Input
                  value={sortCode}
                  onChange={(e) => setSortCode(formatSortCode(e.target.value))}
                  placeholder="12-34-56"
                  inputMode="numeric"
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Account number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bank name (optional)</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Monzo" maxLength={80} />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={chain} onValueChange={(v) => setChain(v as "ETH" | "SOL")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH (bal {Number(ethBalance).toFixed(4)})</SelectItem>
                      <SelectItem value="SOL">SOL (bal {Number(solBalance).toFixed(4)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    inputMode="decimal"
                  />
                </div>
              </div>
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ £{(Number(amount) * (chain === "ETH" ? ethGbp : solGbp)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} GBP
                </p>
              )}
            </div>

            <OtpPrompt purpose="cash_out" onVerified={() => setOtpVerified(true)} />

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={saveBankDetails} disabled={saving}>
                Save details
              </Button>
              <Button onClick={requestCashOut} disabled={saving || !otpVerified}>
                {saving ? "Submitting…" : "Request cash out"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
