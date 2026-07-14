import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { copyThenClear } from "@/lib/wallet/clipboard";

interface RecoveryCodeDialogProps {
  open: boolean;
  recoveryCode: string;
  onAcknowledged: () => void;
}

/**
 * Show-once display of a 24-word recovery code. The dialog cannot be dismissed
 * until the user ticks the acknowledgement.
 */
export function RecoveryCodeDialog({ open, recoveryCode, onAcknowledged }: RecoveryCodeDialogProps) {
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    await copyThenClear(recoveryCode);
    toast.success("Recovery code copied — clipboard clears in 30s");
  };

  const download = () => {
    const blob = new Blob(
      [
        `Pixcellor wallet recovery code\n\nKeep this safe. Anyone with this code can reset your wallet password and access your funds.\n\n${recoveryCode}\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixcellor-wallet-recovery.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const words = recoveryCode.split(" ");

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissable */ }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Save your recovery code</DialogTitle>
          <DialogDescription>
            This 24-word code lets you reset your wallet password if you forget it. We will never show it again.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
          <p>Anyone with this code can recover your wallet. Store it offline — password manager or paper. Never share it.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3">
          {words.map((word, i) => (
            <div key={i} className="rounded bg-background px-2 py-1 text-sm">
              <span className="text-muted-foreground mr-1">{i + 1}.</span>
              {word}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} className="flex-1">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" onClick={download} className="flex-1">
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} className="mt-0.5" />
          <span>I have saved my recovery code somewhere safe. I understand losing it means I can't recover my wallet if I forget my password.</span>
        </label>

        <DialogFooter>
          <Button onClick={onAcknowledged} disabled={!saved}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
