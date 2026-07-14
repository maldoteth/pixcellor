import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  decryptSeedWithRecoveryCode,
  encryptSeedWithRecoveryCode,
  isValidRecoveryCode,
} from "@/lib/wallet/recovery";
import { encryptString, type EncryptedPayload } from "@/lib/wallet/crypto";
import { assessPassword, MIN_PASSWORD_LENGTH } from "@/lib/wallet/passwordStrength";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

interface RecoverWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onRecovered: () => void;
}

type Step = "code" | "password";

export function RecoverWalletDialog({ open, onOpenChange, userId, onRecovered }: RecoverWalletDialogProps) {
  const [step, setStep] = useState<Step>("code");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [seed, setSeed] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("code");
    setRecoveryCode("");
    setSeed(null);
    setNewPassword("");
    setConfirm("");
    setError(null);
  };

  const handleVerifyCode = async () => {
    setError(null);
    if (!isValidRecoveryCode(recoveryCode)) {
      setError("That doesn't look like a valid 24-word recovery code");
      return;
    }
    setBusy(true);
    try {
      const { data, error: qErr } = await supabase
        .from("user_wallet_recovery")
        .select("encrypted_seed, salt, iv, kdf_iterations")
        .eq("user_id", userId)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!data) throw new Error("No recovery record on file for this account");
      const payload: EncryptedPayload = {
        ciphertext: data.encrypted_seed,
        salt: data.salt,
        iv: data.iv,
        iterations: data.kdf_iterations,
      };
      const phrase = await decryptSeedWithRecoveryCode(payload, recoveryCode);
      setSeed(phrase);
      setStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code");
    } finally {
      setBusy(false);
    }
  };

  const handleSetPassword = async () => {
    setError(null);
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (!seed) return;
    setBusy(true);
    try {
      const assessment = await assessPassword(newPassword);
      if (!assessment.longEnough) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        setBusy(false);
        return;
      }
      if (assessment.breached === true) {
        setError("This password has appeared in a data breach — choose a different one");
        setBusy(false);
        return;
      }
      if (!assessment.acceptable) {
        setError("Choose a stronger password (mix letters, numbers, and symbols)");
        setBusy(false);
        return;
      }
    } catch {
      // fail open on assessment error — proceed with the password as entered
    }
    try {
      const newSeedPayload = await encryptString(seed, newPassword);
      const { error: updErr } = await supabase
        .from("user_wallets")
        .update({
          encrypted_seed: newSeedPayload.ciphertext,
          salt: newSeedPayload.salt,
          iv: newSeedPayload.iv,
          kdf_iterations: newSeedPayload.iterations,
        })
        .eq("user_id", userId);
      if (updErr) throw updErr;

      // Re-encrypt recovery row too (new salt/iv) for hygiene.
      const newRecovery = await encryptSeedWithRecoveryCode(seed, recoveryCode);
      await supabase
        .from("user_wallet_recovery")
        .update({
          encrypted_seed: newRecovery.ciphertext,
          salt: newRecovery.salt,
          iv: newRecovery.iv,
          kdf_iterations: newRecovery.iterations,
        })
        .eq("user_id", userId);

      toast.success("Wallet password reset");
      onRecovered();
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recover wallet password</DialogTitle>
          <DialogDescription>
            Enter the 24-word recovery code you saved when you created the wallet. We'll decrypt your wallet locally and let you set a new password.
          </DialogDescription>
        </DialogHeader>

        {step === "code" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rc">Recovery code (24 words)</Label>
              <Textarea
                id="rc"
                rows={4}
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="word word word…"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleVerifyCode} disabled={busy}>
                {busy ? "Verifying…" : "Verify code"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np">New wallet password (min 12 chars)</Label>
              <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <PasswordStrengthMeter password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npc">Confirm new password</Label>
              <Input id="npc" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("code")}>Back</Button>
              <Button onClick={handleSetPassword} disabled={busy}>
                {busy ? "Saving…" : "Set new password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
