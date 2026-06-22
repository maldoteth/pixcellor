import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { usePortalRefresh } from "@/hooks/usePortalRefresh";

type Payout = {
  id: string;
  owner_user_id: string;
  amount_cents: number;
  currency: string;
  method: "bank" | "crypto";
  status: "requested" | "approved" | "paid" | "rejected";
  account_holder_name: string | null;
  sort_code: string | null;
  account_number: string | null;
  crypto_currency: string | null;
  wallet_address: string | null;
  admin_note: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
};

const fmtMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

const statusColor: Record<Payout["status"], string> = {
  requested: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  approved: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  paid: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

function maskAccount(n: string | null) {
  if (!n) return "—";
  return `•••• ${n.slice(-4)}`;
}
function maskWallet(w: string | null) {
  if (!w) return "—";
  if (w.length <= 12) return w;
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

export default function AdminPayoutsPanel() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    payout: Payout;
    nextStatus: Payout["status"];
  } | null>(null);
  const [noteText, setNoteText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliate_payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setPayouts((data ?? []) as Payout[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePortalRefresh(load);

  const performUpdate = async (
    payout: Payout,
    nextStatus: Payout["status"],
    note?: string,
  ) => {
    setUpdating(payout.id);
    const { data: u } = await supabase.auth.getUser();
    const patch: Record<string, unknown> = {
      status: nextStatus,
      processed_by: u.user?.id ?? null,
      processed_at: new Date().toISOString(),
    };
    if (typeof note === "string" && note.trim().length > 0) patch.admin_note = note.trim();
    const { error } = await supabase
      .from("affiliate_payouts")
      .update(patch)
      .eq("id", payout.id);
    setUpdating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked ${nextStatus}`);
    setNoteDialog(null);
    setNoteText("");
    await load();
  };

  const openWithNote = (payout: Payout, nextStatus: Payout["status"]) => {
    setNoteText(payout.admin_note ?? "");
    setNoteDialog({ payout, nextStatus });
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Affiliate payouts</h2>
          <p className="text-sm text-muted-foreground">Review and process withdrawal requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No payout requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-none border border-border/40">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Payee / Method</th>
                <th className="px-3 py-2 text-left">Details</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {payouts.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {p.method === "bank" ? p.account_holder_name || "—" : `${p.crypto_currency} wallet`}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {p.method}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {p.method === "bank" ? (
                      <div>
                        <div>Sort: {p.sort_code ?? "—"}</div>
                        <div>Acct: {maskAccount(p.account_number)}</div>
                      </div>
                    ) : (
                      <div className="font-mono">{maskWallet(p.wallet_address)}</div>
                    )}
                    {p.admin_note && (
                      <div className="mt-1 text-muted-foreground italic">“{p.admin_note}”</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {fmtMoney(p.amount_cents, p.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={`rounded-none ${statusColor[p.status]}`}>
                      {p.status}
                    </Badge>
                    {p.processed_at && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(p.processed_at).toLocaleDateString("en-GB")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      {p.status === "requested" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updating === p.id}
                          onClick={() => performUpdate(p, "approved")}
                        >
                          Approve
                        </Button>
                      )}
                      {(p.status === "requested" || p.status === "approved") && (
                        <>
                          <Button
                            size="sm"
                            disabled={updating === p.id}
                            onClick={() => openWithNote(p, "paid")}
                          >
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updating === p.id}
                            onClick={() => openWithNote(p, "rejected")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!noteDialog} onOpenChange={(o) => { if (!o) { setNoteDialog(null); setNoteText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.nextStatus === "paid" ? "Mark as paid" : "Reject request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Optional note (visible to the affiliate).
            </p>
            <Textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Paid via Faster Payments ref ABC123"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteDialog(null); setNoteText(""); }}>Cancel</Button>
            <Button
              onClick={() => noteDialog && performUpdate(noteDialog.payout, noteDialog.nextStatus, noteText)}
              disabled={!!updating}
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
