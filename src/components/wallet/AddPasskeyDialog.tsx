import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { decryptString } from "@/lib/wallet/crypto";
import { enrollPasskey, isPasskeySupported } from "@/lib/wallet/webauthn";
import { savePasskey } from "@/lib/wallet/passkeyStore";
import { OtpCodeCapture } from "./OtpCodeCapture";
import { unlockSeed } from "@/lib/wallet/unlock";

interface AddPasskeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
}

// Enrolls a passkey that can unlock the wallet without the (brute-forceable)
// password. Requires the current password + an emailed OTP so the encrypted
// seed can be fetched via wallet-unlock and re-wrapped under the passkey's
// PRF key. The seed never leaves the browser and is discarded immediately.
export function AddPasskeyDialog({ open, onOpenChange, userId, onAdded }: AddPasskeyDialogProps) {
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = isPasskeySupported();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit emailed code");
      return;
    }
    setBusy(true);
    let seed: string | null = null;
    try {
      const payload = await unlockSeed("reveal", otpCode);
      seed = await decryptString(payload, password);
      const env = await enrollPasskey({ userId, label: "Pixcellor wallet", seed });
      await savePasskey(userId, env);
      toast.success("Passkey added — you can now unlock with your device");
      onAdded();
      onOpenChange(false);
      setPassword("");
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add passkey");
    } finally {
      seed = null;
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPassword("");
          setOtpCode("");
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" /> Protect with a passkey
          </DialogTitle>
          <DialogDescription>
            A passkey encrypts your wallet with your device's biometric or security key instead of a
            password — so a stolen database backup can't be brute-forced. Your 24-word recovery code
            still works if you lose the device.
          </DialogDescription>
        </DialogHeader>

        {!supported ? (
          <p className="text-sm text-muted-foreground">
            This browser or device doesn't support the passkey feature required (WebAuthn PRF over a
            secure connection). Try a recent Chrome, Edge, or Safari on a device with a biometric
            sensor or security key.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Confirm your wallet password</Label>
              <Input
                id="pw"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Needed once to unlock the wallet so it can be re-secured with your passkey.
              </p>
            </div>
            <OtpCodeCapture purpose="reveal" onChange={setOtpCode} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !password || otpCode.length !== 6}>
                {busy ? "Setting up…" : "Add passkey"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
