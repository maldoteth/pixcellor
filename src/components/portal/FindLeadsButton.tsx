import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UserSearch } from "lucide-react";
import { toast } from "sonner";

type Props = {
  className?: string;
  onQueued?: () => void;
};

export default function FindLeadsButton({ className, onQueued }: Props) {
  const [open, setOpen] = useState(false);
  const [trade, setTrade] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!trade.trim() || !location.trim()) {
      toast.error("Trade and location are required");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("find-local-leads", {
        body: { trade: trade.trim(), location: location.trim(), limit },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Failed to start lead search");
      toast.success("Lead search queued — new contacts will appear shortly");
      setOpen(false);
      setTrade("");
      setLocation("");
      onQueued?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start lead search");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={`h-9 shrink-0 ${className ?? ""}`}
        variant="outline"
      >
        <UserSearch className="w-4 h-4 mr-2" /> Find Leads
      </Button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find new leads</DialogTitle>
            <DialogDescription>
              Search the web for UK businesses without a proper website. Results are added to your contact book.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-trade">Trade / industry</Label>
              <Input
                id="lead-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                placeholder="e.g. plumber, hairdresser, restaurant"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-location">Location</Label>
              <Input
                id="lead-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Manchester, SW1, Glasgow"
                disabled={busy}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-limit">How many leads (1–5)</Label>
              <Input
                id="lead-limit"
                type="number"
                min={1}
                max={5}
                value={limit}
                onChange={(e) => setLimit(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                disabled={busy}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserSearch className="w-4 h-4 mr-2" />}
                Start search
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
