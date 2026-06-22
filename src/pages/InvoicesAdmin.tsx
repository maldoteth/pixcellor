import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Send, ExternalLink, Copy, FileText, ArrowLeft } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  public_token: string;
  status: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  total_pence: number;
  amount_paid_pence: number;
  billing_name: string;
  billing_email: string;
  billing_company: string | null;
  package_slug: string | null;
  reminder_stage: string;
  last_reminder_at: string | null;
};

const FILTERS = ["outstanding", "overdue", "paid", "all"] as const;

function fmtGbp(p: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }

export default function InvoicesAdmin() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("outstanding");
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [reference, setReference] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) { navigate("/portal-login"); return; }
      const { data: ok } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setAllowed(Boolean(ok));
      setAuthChecked(true);
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, public_token, status, issued_at, due_at, paid_at, total_pence, amount_paid_pence, billing_name, billing_email, billing_company, package_slug, reminder_stage, last_reminder_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setInvoices((data as Invoice[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (allowed) load(); }, [allowed]);

  // Realtime updates
  useEffect(() => {
    if (!allowed) return;
    const ch = supabase
      .channel("invoices-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, load)
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [allowed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filter === "outstanding" && !["sent", "viewed", "partial", "overdue"].includes(inv.status)) return false;
      if (filter === "overdue" && inv.status !== "overdue") return false;
      if (filter === "paid" && inv.status !== "paid") return false;
      if (!q) return true;
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.billing_email.toLowerCase().includes(q) ||
        inv.billing_name.toLowerCase().includes(q) ||
        (inv.billing_company ?? "").toLowerCase().includes(q)
      );
    });
  }, [invoices, filter, search]);

  const totals = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let paidLast30 = 0;
    const cutoff = Date.now() - 30 * 86_400_000;
    for (const inv of invoices) {
      const due = inv.total_pence - inv.amount_paid_pence;
      if (["sent", "viewed", "partial", "overdue"].includes(inv.status)) outstanding += due;
      if (inv.status === "overdue") overdue += due;
      if (inv.status === "paid" && inv.paid_at && new Date(inv.paid_at).getTime() >= cutoff) paidLast30 += inv.total_pence;
    }
    return { outstanding, overdue, paidLast30 };
  }, [invoices]);

  const active = invoices.find((i) => i.id === activeId) ?? null;

  const markPaid = async () => {
    if (!active) return;
    setMarking(true);
    try {
      const { data, error } = await supabase.functions.invoke("mark-invoice-paid", {
        body: { invoice_id: active.id, payment_reference: reference || undefined, payment_method: "bank_transfer" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Marked as paid — receipt sent");
      setActiveId(null);
      setReference("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to mark paid");
    } finally {
      setMarking(false);
    }
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-5 w-5 animate-spin text-foreground/60" /></div>;
  if (!allowed) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6"><Card className="p-6">Admin access required.</Card></div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Link to="/portal" className="text-foreground/60 hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <div>
              <h1 className="text-2xl font-extrabold flex items-center gap-2"><FileText className="h-5 w-5" /> Invoices</h1>
              <p className="text-xs text-foreground/60">Bank-transfer invoices · {invoices.length} total</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-foreground/50">Outstanding</div><div className="text-xl font-extrabold mt-1">{fmtGbp(totals.outstanding)}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-foreground/50">Overdue</div><div className="text-xl font-extrabold mt-1 text-red-400">{fmtGbp(totals.overdue)}</div></Card>
          <Card className="p-4"><div className="text-[10px] uppercase tracking-wider text-foreground/50">Paid (30 days)</div><div className="text-xl font-extrabold mt-1 text-emerald-400">{fmtGbp(totals.paidLast30)}</div></Card>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${filter === f ? "bg-foreground text-background" : "bg-foreground/5 text-foreground/70 hover:bg-foreground/10"}`}>{f}</button>
          ))}
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by number, email, name…" className="max-w-xs ml-auto h-8" />
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-foreground/60 text-sm">No invoices match.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-wider text-foreground/50 border-b border-foreground/10">
                <tr>
                  <th className="px-4 py-2">Invoice</th>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Issued</th>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-foreground/5 hover:bg-foreground/5 cursor-pointer" onClick={() => setActiveId(inv.id)}>
                    <td className="px-4 py-3 font-mono font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-3"><div className="font-semibold">{inv.billing_name}</div><div className="text-xs text-foreground/50">{inv.billing_email}</div></td>
                    <td className="px-4 py-3 text-xs">{fmtDate(inv.issued_at)}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(inv.due_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtGbp(inv.total_pence)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      inv.status === "paid" ? "bg-emerald-500/15 text-emerald-300" :
                      inv.status === "overdue" ? "bg-red-500/15 text-red-300" :
                      inv.status === "cancelled" ? "bg-foreground/10 text-foreground/60" :
                      "bg-amber-500/15 text-amber-300"
                    }`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/invoice/${inv.public_token}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-foreground/60 hover:text-foreground inline-flex"><ExternalLink className="h-4 w-4" /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActiveId(null); setReference(""); } }}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{active.invoice_number}</DialogTitle>
                <DialogDescription>{active.billing_name} · {active.billing_email}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-foreground/60">Amount</span><span className="font-bold">{fmtGbp(active.total_pence)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/60">Paid</span><span>{fmtGbp(active.amount_paid_pence)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/60">Issued</span><span>{fmtDate(active.issued_at)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/60">Due</span><span>{fmtDate(active.due_at)}</span></div>
                <div className="flex justify-between"><span className="text-foreground/60">Last reminder</span><span>{active.last_reminder_at ? fmtDate(active.last_reminder_at) : "—"} ({active.reminder_stage})</span></div>
                <div className="flex justify-between"><span className="text-foreground/60">Status</span><span className="font-semibold">{active.status}</span></div>
              </div>

              {active.status !== "paid" && active.status !== "cancelled" && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="ref">Payment reference (optional)</Label>
                  <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank ref / cheque no. / note" />
                  <Button onClick={markPaid} disabled={marking} className="w-full gap-2">
                    {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark as paid + send receipt
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" asChild>
                  <a href={`/invoice/${active.public_token}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> View page</a>
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invoice/${active.public_token}`); toast.success("Link copied"); }}>
                  <Copy className="h-4 w-4" /> Copy link
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
