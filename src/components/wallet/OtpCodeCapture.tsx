import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { requestWalletOtp, type OtpPurpose } from "@/lib/wallet/otp";

interface OtpCodeCaptureProps {
  purpose: OtpPurpose;
  /** Emits the 6-digit code as the user types; parent consumes it in unlockSeed. */
  onChange: (code: string) => void;
  requestLabel?: string;
}

/**
 * Two-step OTP capture that does NOT verify separately — the code is passed to
 * the parent, which submits it atomically to wallet-unlock (verify + fetch).
 */
export function OtpCodeCapture({ purpose, onChange, requestLabel = "Email me a confirmation code" }: OtpCodeCaptureProps) {
  const [requested, setRequested] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
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
          <Label htmlFor={`otpcap-${purpose}`} className="text-xs text-muted-foreground">
            Enter the 6-digit code we just emailed you
          </Label>
          <Input
            id={`otpcap-${purpose}`}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              onChange(v);
            }}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            className="font-mono tracking-widest"
          />
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
