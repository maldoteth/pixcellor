import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { requestWalletOtp, verifyWalletOtp, type OtpPurpose } from "@/lib/wallet/otp";

interface OtpPromptProps {
  purpose: OtpPurpose;
  /** Called once a code has been verified. Parent can then perform the gated action. */
  onVerified: () => void;
  /** Visible label inside the request button, e.g. "Email me a confirmation code". */
  requestLabel?: string;
}

/**
 * Inline two-step OTP component:
 * 1. User clicks "Email me a code" → POST request → email arrives.
 * 2. User types 6-digit code → POST verify → onVerified() fires.
 */
export function OtpPrompt({ purpose, onVerified, requestLabel = "Email me a confirmation code" }: OtpPromptProps) {
  const [requested, setRequested] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleRequest = async () => {
    setBusy(true);
    const res = await requestWalletOtp(purpose);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRequested(true);
    setCooldown(30);
    toast.success("Code sent to your email");
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const res = await verifyWalletOtp(purpose, code);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setVerified(true);
    onVerified();
  };

  if (verified) {
    return (
      <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm">
        Code verified — proceed below.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-card/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Mail className="w-4 h-4" /> Email confirmation
      </div>
      {!requested ? (
        <Button type="button" variant="outline" size="sm" onClick={handleRequest} disabled={busy}>
          {busy ? "Sending…" : requestLabel}
        </Button>
      ) : (
        <>
          <Label htmlFor={`otp-${purpose}`} className="text-xs text-muted-foreground">
            Enter the 6-digit code we just emailed you
          </Label>
          <div className="flex gap-2">
            <Input
              id={`otp-${purpose}`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className="font-mono tracking-widest"
            />
            <Button type="button" onClick={handleVerify} disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </div>
          <button
            type="button"
            onClick={handleRequest}
            disabled={busy || cooldown > 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </>
      )}
    </div>
  );
}
