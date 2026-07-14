import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { decryptString } from "@/lib/wallet/crypto";
import { deriveFromMnemonic } from "@/lib/wallet/derive";
import {
  isValidEthAddress,
  isValidSolAddress,
  sendEth,
  sendSol,
  ethExplorer,
  solExplorer,
} from "@/lib/wallet/rpc";
import { toast } from "sonner";
import { ExternalLink, Fingerprint } from "lucide-react";
import { OtpCodeCapture } from "./OtpCodeCapture";
import { loadPasskeys } from "@/lib/wallet/passkeyStore";
import { decryptWithPasskey, isPasskeySupported, type PasskeyEnvelope } from "@/lib/wallet/webauthn";
import { unlockSeed } from "@/lib/wallet/unlock";

interface SendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  ethAddress: string;
  solAddress: string;
  onSent?: () => void;
}

export function SendDialog({ open, onOpenChange, onSent }: SendDialogProps) {
  const [chain, setChain] = useState<"ETH" | "SOL">("ETH");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyEnvelope[]>([]);
  const [usePasskey, setUsePasskey] = useState(false);

  useEffect(() => {
    if (!open) {
      setPasskeys([]);
      setUsePasskey(false);
      return;
    }
    void loadPasskeys("self").then((pks) => {
      setPasskeys(pks);
      setUsePasskey(pks.length > 0 && isPasskeySupported());
    });
  }, [open]);

  const canUsePasskey = passkeys.length > 0 && isPasskeySupported();

  const reset = () => {
    setTo("");
    setAmount("");
    setPassword("");
    setOtpCode("");
    setError(null);
    setTxHash(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (chain === "ETH" && !isValidEthAddress(to)) {
      setError("Invalid Ethereum address");
      return;
    }
    if (chain === "SOL" && !isValidSolAddress(to)) {
      setError("Invalid Solana address");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!usePasskey && !/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit emailed code");
      return;
    }

    setBusy(true);
    let mnemonic: string | null = null;
    try {
      if (usePasskey) {
        mnemonic = await decryptWithPasskey(passkeys[0]);
      } else {
        const payload = await unlockSeed("send", otpCode);
        mnemonic = await decryptString(payload, password);
      }
      const derived = await deriveFromMnemonic(mnemonic);
      const hash =
        chain === "ETH"
          ? await sendEth(derived.ethPrivateKey, to, amount)
          : await sendSol(derived.solSecretKeyB64, to, amount);
      setTxHash(hash);
      toast.success(`${chain} transaction broadcast`);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      mnemonic = null;
      setPassword("");
      setOtpCode("");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send crypto</DialogTitle>
          <DialogDescription>
            Double-check the recipient — blockchain transactions are irreversible.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={chain} onValueChange={(v) => setChain(v as "ETH" | "SOL")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ETH">Ethereum</TabsTrigger>
            <TabsTrigger value="SOL">Solana</TabsTrigger>
          </TabsList>
          <TabsContent value={chain} className="pt-2" />
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient address</Label>
            <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder={chain === "ETH" ? "0x…" : "Base58…"} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({chain})</Label>
            <Input id="amount" type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          {usePasskey ? (
            <div className="flex items-center justify-between rounded-md border bg-card/40 p-3 text-sm">
              <span className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> You'll confirm this transfer with your passkey
              </span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setUsePasskey(false)}
              >
                Use password
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="pw">Wallet password</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                {canUsePasskey && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setUsePasskey(true)}
                  >
                    Use passkey instead
                  </button>
                )}
              </div>
              <OtpCodeCapture purpose="send" onChange={setOtpCode} />
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {txHash && (
            <a
              href={chain === "ETH" ? ethExplorer(txHash) : solExplorer(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline"
            >
              View on explorer <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="submit"
              disabled={busy || (!usePasskey && (!password || otpCode.length !== 6))}
            >
              {busy ? "Broadcasting…" : `Send ${chain}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
