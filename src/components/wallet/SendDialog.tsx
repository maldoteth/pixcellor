import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { decryptString, type EncryptedPayload } from "@/lib/wallet/crypto";
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
import { ExternalLink } from "lucide-react";
import { OtpPrompt } from "./OtpPrompt";

interface SendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  encrypted: EncryptedPayload;
  ethAddress: string;
  solAddress: string;
  onSent?: () => void;
}

export function SendDialog({ open, onOpenChange, encrypted, onSent }: SendDialogProps) {
  const [chain, setChain] = useState<"ETH" | "SOL">("ETH");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);

  const reset = () => {
    setTo("");
    setAmount("");
    setPassword("");
    setError(null);
    setTxHash(null);
    setOtpVerified(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!otpVerified) {
      setError("Confirm the emailed code before sending");
      return;
    }
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

    setBusy(true);
    let mnemonic: string | null = null;
    try {
      mnemonic = await decryptString(encrypted, password);
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
          <div className="space-y-2">
            <Label htmlFor="pw">Wallet password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <OtpPrompt purpose="send" onVerified={() => setOtpVerified(true)} />
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
            <Button type="submit" disabled={busy || !otpVerified}>
              {busy ? "Broadcasting…" : `Send ${chain}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
