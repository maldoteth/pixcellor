import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Banknote, Bitcoin, CheckCircle2, AlertTriangle } from "lucide-react";

const MIN_PAYOUT_CENTS = 2500;

const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
const BTC_LEGACY_RE = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const BTC_BECH32_RE = /^bc1[a-z0-9]{25,62}$/;

function formatSortCode(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 2) parts.push(digits.slice(i, i + 2));
  return parts.join("-");
}

function fmtGBP(cents: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(cents / 100);
}

export interface CashoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCents: number;
  hasOpenRequest: boolean;
  onSubmitted?: () => void;
}

export default function CashoutDialog({
  open,
  onOpenChange,
  availableCents,
  hasOpenRequest,
  onSubmitted,
}: CashoutDialogProps) {
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [holder, setHolder] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [cryptoCurrency, setCryptoCurrency] = useState<"ETH" | "BTC">("ETH");
  const [wallet, setWallet] = useState("");
  const [amountPounds, setAmountPounds] = useState<string>("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMethod("bank");
      setHolder("");
      setSortCode("");
      setAccountNumber("");
      setCryptoCurrency("ETH");
      setWallet("");
      setAmountPounds((availableCents / 100).toFixed(2));
      setConfirm(false);
      setSuccess(false);
      setServerError(null);
    }
  }, [open, availableCents]);

  const amountCents = useMemo(() => {
    const n = Number(amountPounds);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }, [amountPounds]);

  const sortCodeDigits = sortCode.replace(/\D/g, "");
  const accountDigits = accountNumber.replace(/\D/g, "");

  const walletError = useMemo(() => {
    if (method !== "crypto" || !wallet) return null;
    const w = wallet.trim();
    if (cryptoCurrency === "ETH") {
      return ETH_RE.test(w) ? null : "Enter a valid ETH address (0x… 40 hex chars)";
    }
    if (BTC_LEGACY_RE.test(w) || BTC_BECH32_RE.test(w)) return null;
    return "Enter a valid BTC address";
  }, [method, wallet, cryptoCurrency]);

  const amountError = useMemo(() => {
    if (!amountPounds) return "Enter an amount";
    if (amountCents < MIN_PAYOUT_CENTS) return `Minimum is ${fmtGBP(MIN_PAYOUT_CENTS)}`;
    if (amountCents > availableCents) return `Maximum is ${fmtGBP(availableCents)}`;
    return null;
  }, [amountPounds, amountCents, availableCents]);

  const bankValid =
    method === "bank" &&
    holder.trim().length >= 2 &&
    sortCodeDigits.length === 6 &&
    accountDigits.length === 8;

  const cryptoValid = method === "crypto" && !walletError && wallet.trim().length > 0;

  const canSubmit =
    !submitting &&
    !success &&
    !hasOpenRequest &&
    !amountError &&
    confirm &&
    (bankValid || cryptoValid);

  const handleSubmit = async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { method, amount_cents: amountCents };
      if (method === "bank") {
        body.account_holder_name = holder.trim();
        body.sort_code = sortCodeDigits;
        body.account_number = accountDigits;
      } else {
        body.crypto_currency = cryptoCurrency;
        body.wallet_address = wallet.trim();
      }
      const { data, error } = await supabase.functions.invoke("request-affiliate-payout", { body });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error || error?.message || "Failed to submit request";
        setServerError(msg);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setSubmitting(false);
      toast.success("Withdrawal requested");
      onSubmitted?.();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cash out</DialogTitle>
          <DialogDescription>
            Available balance: <strong className="text-foreground">{fmtGBP(availableCents)}</strong>{" "}
            · Minimum withdrawal {fmtGBP(MIN_PAYOUT_CENTS)}.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <div className="text-base font-medium">Withdrawal requested</div>
            <p className="text-sm text-muted-foreground">
              Our team will process it within 3–5 business days. You'll get an email once it's paid.
            </p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Done</Button>
          </div>
        ) : hasOpenRequest ? (
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
              <p>You already have an open withdrawal request. Please wait for it to be processed before requesting another.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : availableCents < MIN_PAYOUT_CENTS ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              You need at least {fmtGBP(MIN_PAYOUT_CENTS)} of cleared commission to cash out. Keep sharing your code!
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Method toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("bank")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${method === "bank" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Banknote className="h-4 w-4" /> Bank transfer
              </button>
              <button
                type="button"
                onClick={() => setMethod("crypto")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${method === "crypto" ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Bitcoin className="h-4 w-4" /> Crypto
              </button>
            </div>

            {method === "bank" ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="holder" className="text-xs">Full legal name</Label>
                  <Input
                    id="holder"
                    value={holder}
                    onChange={(e) => setHolder(e.target.value)}
                    placeholder="As it appears on your bank account"
                    autoComplete="name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sortcode" className="text-xs">Sort code</Label>
                    <Input
                      id="sortcode"
                      inputMode="numeric"
                      value={sortCode}
                      onChange={(e) => setSortCode(formatSortCode(e.target.value))}
                      placeholder="12-34-56"
                      maxLength={8}
                    />
                    {sortCode && sortCodeDigits.length !== 6 && (
                      <p className="mt-1 text-[11px] text-destructive">Must be 6 digits</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="acct" className="text-xs">Account number</Label>
                    <Input
                      id="acct"
                      inputMode="numeric"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                      placeholder="12345678"
                      maxLength={8}
                    />
                    {accountNumber && accountDigits.length !== 8 && (
                      <p className="mt-1 text-[11px] text-destructive">Must be 8 digits</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(["ETH", "BTC"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCryptoCurrency(c)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${cryptoCurrency === c ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {c === "ETH" ? "Ethereum (ETH)" : "Bitcoin (BTC)"}
                    </button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="wallet" className="text-xs">{cryptoCurrency} wallet address</Label>
                  <Input
                    id="wallet"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    placeholder={cryptoCurrency === "ETH" ? "0x…" : "bc1… or 1…/3…"}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {walletError && (
                    <p className="mt-1 text-[11px] text-destructive">{walletError}</p>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <p>
                    Send only on the <strong>{cryptoCurrency === "ETH" ? "Ethereum" : "Bitcoin"}</strong> network — wrong-network transfers are lost forever.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="amount" className="text-xs">Amount (GBP)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amountPounds}
                onChange={(e) => setAmountPounds(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.00"
              />
              {amountError && <p className="mt-1 text-[11px] text-destructive">{amountError}</p>}
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={confirm}
                onCheckedChange={(v) => setConfirm(Boolean(v))}
                className="mt-0.5"
              />
              <span>
                I confirm these details are correct. Bank and crypto transfers are irreversible.
              </span>
            </label>

            {serverError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Request withdrawal
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
