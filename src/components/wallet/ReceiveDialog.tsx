import { useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useEffect } from "react";

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: "ETH" | "SOL";
  address: string;
}

export function ReceiveDialog({ open, onOpenChange, chain, address }: ReceiveDialogProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !address) return;
    QRCode.toDataURL(address, { width: 256, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, address]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive {chain}</DialogTitle>
          <DialogDescription>
            Only send {chain === "ETH" ? "Ethereum (ETH) on mainnet" : "Solana (SOL) on mainnet"} to this address.
            Funds sent on the wrong network may be lost.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          {qr && <img src={qr} alt={`${chain} address QR code`} className="rounded-lg border bg-white p-2" />}
          <code className="break-all rounded-md bg-muted px-3 py-2 text-xs">{address}</code>
          <Button variant="outline" onClick={handleCopy} className="w-full">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied" : "Copy address"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
