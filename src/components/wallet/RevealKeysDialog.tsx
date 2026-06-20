import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { decryptString, type EncryptedPayload } from "@/lib/wallet/crypto";
import { deriveFromMnemonic, type DerivedWallet } from "@/lib/wallet/derive";
import { AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

interface RevealKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encrypted: EncryptedPayload;
}

const AUTO_HIDE_MS = 30_000;

export function RevealKeysDialog({ open, onOpenChange, encrypted }: RevealKeysDialogProps) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<DerivedWallet | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!revealed) return;
    setSecondsLeft(Math.floor(AUTO_HIDE_MS / 1000));
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRevealed(null);
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [revealed]);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError(null);
      setRevealed(null);
    }
  }, [open]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const mnemonic = await decryptString(encrypted, password);
      const derived = await deriveFromMnemonic(mnemonic);
      setRevealed(derived);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reveal keys</DialogTitle>
          <DialogDescription>
            Anyone with these keys controls your funds. Never share them.
          </DialogDescription>
        </DialogHeader>

        {!revealed ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">Wallet password</Label>
              <Input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !password}>
                {busy ? "Unlocking…" : "Reveal"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
              <p>Hides automatically in {secondsLeft}s. Do not screenshot.</p>
            </div>

            <div className="space-y-2">
              <Label>Recovery phrase</Label>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-words rounded-md bg-muted p-3 text-xs">{revealed.mnemonic}</code>
                <Button size="icon" variant="outline" onClick={() => copy(revealed.mnemonic, "Recovery phrase")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ethereum private key</Label>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-md bg-muted p-3 text-xs">{revealed.ethPrivateKey}</code>
                <Button size="icon" variant="outline" onClick={() => copy(revealed.ethPrivateKey, "ETH key")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Solana secret key (base64)</Label>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-md bg-muted p-3 text-xs">{revealed.solSecretKeyB64}</code>
                <Button size="icon" variant="outline" onClick={() => copy(revealed.solSecretKeyB64, "SOL key")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setRevealed(null)} variant="outline">
                Hide now
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
