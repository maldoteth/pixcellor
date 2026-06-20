import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { generateMnemonic12, deriveFromMnemonic, isValidMnemonic } from "@/lib/wallet/derive";
import { encryptString } from "@/lib/wallet/crypto";
import { generateRecoveryCode, encryptSeedWithRecoveryCode } from "@/lib/wallet/recovery";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Copy } from "lucide-react";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: () => void;
}

type Step = "password" | "phrase" | "confirm";

export function CreateWalletDialog({ open, onOpenChange, userId, onCreated }: CreateWalletDialogProps) {
  const [mode, setMode] = useState<"new" | "import">("new");
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mnemonic, setMnemonic] = useState<string>("");
  const [importPhrase, setImportPhrase] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(null);

  const reset = () => {
    setMode("new");
    setStep("password");
    setPassword("");
    setConfirm("");
    setMnemonic("");
    setImportPhrase("");
    setSaved(false);
    setError(null);
    setPendingRecoveryCode(null);
  };

  const handlePasswordNext = () => {
    setError(null);
    if (password.length < 10) {
      setError("Password must be at least 10 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (mode === "new") {
      setMnemonic(generateMnemonic12());
      setStep("phrase");
    } else {
      const trimmed = importPhrase.trim().toLowerCase();
      if (!isValidMnemonic(trimmed)) {
        setError("Invalid recovery phrase");
        return;
      }
      setMnemonic(trimmed);
      void persist(trimmed);
    }
  };

  const persist = async (phrase: string) => {
    setBusy(true);
    setError(null);
    try {
      const derived = await deriveFromMnemonic(phrase);
      const encrypted = await encryptString(phrase, password);

      // Generate a recovery code and encrypt the same seed under it.
      const recoveryCode = generateRecoveryCode();
      const recoveryPayload = await encryptSeedWithRecoveryCode(phrase, recoveryCode);

      const { error: insertErr } = await supabase.from("user_wallets").upsert({
        user_id: userId,
        eth_address: derived.ethAddress,
        sol_address: derived.solAddress,
        encrypted_seed: encrypted.ciphertext,
        salt: encrypted.salt,
        iv: encrypted.iv,
        kdf_iterations: encrypted.iterations,
      });
      if (insertErr) throw insertErr;

      const { error: recErr } = await supabase.from("user_wallet_recovery").upsert({
        user_id: userId,
        encrypted_seed: recoveryPayload.ciphertext,
        salt: recoveryPayload.salt,
        iv: recoveryPayload.iv,
        kdf_iterations: recoveryPayload.iterations,
      });
      if (recErr) {
        // Non-fatal — log and warn, wallet itself is saved.
        console.error("Failed to save recovery payload", recErr);
        toast.warning("Wallet saved, but recovery setup failed. Contact support.");
      }

      // Surface the recovery code to the user (show-once).
      setPendingRecoveryCode(recoveryCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setBusy(false);
    }
  };

  const copyPhrase = async () => {
    await navigator.clipboard.writeText(mnemonic);
    toast.success("Recovery phrase copied");
  };

  const handleRecoveryAck = () => {
    setPendingRecoveryCode(null);
    toast.success("Wallet created");
    onCreated();
    onOpenChange(false);
    reset();
  };

  return (
    <>
      <Dialog
        open={open && !pendingRecoveryCode}
        onOpenChange={(o) => {
          if (!o) reset();
          onOpenChange(o);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create your wallet</DialogTitle>
            <DialogDescription>
              Your keys are encrypted in this browser before anything leaves the device. You'll also get a recovery code in case you forget your password.
            </DialogDescription>
          </DialogHeader>

          {step === "password" && (
            <div className="space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "import")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new">New wallet</TabsTrigger>
                  <TabsTrigger value="import">Import phrase</TabsTrigger>
                </TabsList>
                <TabsContent value="import" className="pt-3">
                  <Label htmlFor="import">Recovery phrase (12 or 24 words)</Label>
                  <Textarea
                    id="import"
                    value={importPhrase}
                    onChange={(e) => setImportPhrase(e.target.value)}
                    rows={3}
                    placeholder="word word word…"
                  />
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="pw">Wallet password (min 10 chars)</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwc">Confirm password</Label>
                <Input id="pwc" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePasswordNext} disabled={busy}>
                  {busy ? "Working…" : mode === "new" ? "Continue" : "Import"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "phrase" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                <p>Write this down and store it offline. Anyone with this phrase owns your funds. We cannot show it again.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3">
                {mnemonic.split(" ").map((word, i) => (
                  <div key={i} className="rounded bg-background px-2 py-1 text-sm">
                    <span className="text-muted-foreground mr-1">{i + 1}.</span>
                    {word}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={copyPhrase} className="w-full">
                <Copy className="w-4 h-4 mr-2" /> Copy phrase
              </Button>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} className="mt-0.5" />
                <span>I have saved my recovery phrase somewhere safe</span>
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep("password")}>
                  Back
                </Button>
                <Button disabled={!saved || busy} onClick={() => persist(mnemonic)}>
                  {busy ? "Encrypting…" : "Create wallet"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pendingRecoveryCode && (
        <RecoveryCodeDialog
          open
          recoveryCode={pendingRecoveryCode}
          onAcknowledged={handleRecoveryAck}
        />
      )}
    </>
  );
}
