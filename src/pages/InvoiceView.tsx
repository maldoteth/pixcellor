import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Download, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type LineItem = {
  description: string;
  quantity: number;
  unit_amount_pence: number;
  line_total_pence: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  status: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  currency: string;
  subtotal_pence: number;
  total_pence: number;
  amount_paid_pence: number;
  billing_name: string;
  billing_company: string | null;
  billing_email: string;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
  po_reference: string | null;
  payment_terms_label: string;
  package_slug: string | null;
  pdf_storage_path: string | null;
  line_items: LineItem[];
};

const BANK = {
  payee: "Delabs Ltd",
  sortCode: "60-84-64",
  account: "86111053",
};

const SUPPLIER_NAME = "Delabs Ltd";
const SUPPLIER_EMAIL = "help@pixcellor.com";

function fmtGbp(p: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function CopyChip({ value, label }: { value: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copied`);
      }}
      className="group inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-left w-full"
      aria-label={`Copy ${label}`}
    >
      <span>
        <span className="block text-[10px] uppercase tracking-wider text-foreground/50">{label}</span>
        <span className="block font-mono text-base font-semibold text-foreground">{value}</span>
      </span>
      <Copy className="h-3.5 w-3.5 text-foreground/40 group-hover:text-foreground/80" />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    sent:      { label: "Awaiting payment", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
    viewed:    { label: "Awaiting payment", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
    partial:   { label: "Part paid",        cls: "bg-blue-500/15 text-blue-300 border-blue-500/30",  icon: Clock },
    overdue:   { label: "Overdue",          cls: "bg-red-500/15 text-red-300 border-red-500/30",     icon: AlertCircle },
    paid:      { label: "Paid",             cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
    cancelled: { label: "Cancelled",        cls: "bg-foreground/10 text-foreground/60 border-foreground/20", icon: AlertCircle },
  };
  const m = map[status] ?? map.sent;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${m.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {m.label}
    </span>
  );
}

export default function InvoiceView() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_invoice_by_token", { _token: token });
      if (error) {
        console.error(error);
        toast.error("Could not load invoice");
      } else {
        setInvoice((data as unknown as Invoice) ?? null);
      }
      setLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    if (invoice) document.title = `Invoice ${invoice.invoice_number} — ${SUPPLIER_NAME}`;
  }, [invoice]);

  const downloadPdf = async () => {
    if (!token) return;
    setPdfLoading(true);
    try {
      const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/get-invoice-pdf?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { headers: { apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? (import.meta as any).env.VITE_SUPABASE_ANON_KEY ?? "" } });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "PDF unavailable");
      window.open(json.url, "_blank", "noopener,noreferrer");

    } catch (e: any) {
      toast.error(e?.message || "Could not generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const due = useMemo(() => invoice ? invoice.total_pence - invoice.amount_paid_pence : 0, [invoice]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/60" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Invoice not found</h1>
          <p className="text-foreground/60">The link may have expired or been mistyped.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <Helmet>
        <title>{`Invoice ${invoice.invoice_number} — ${SUPPLIER_NAME}`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-foreground/50">Invoice</div>
            <h1 className="text-2xl font-extrabold tracking-tight">{invoice.invoice_number}</h1>
          </div>
          <StatusBadge status={invoice.status} />
        </div>

        <Card className="p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold mb-1">From</div>
              <div className="font-bold">{SUPPLIER_NAME}</div>
              <div className="text-sm text-foreground/60">United Kingdom</div>
              <div className="text-sm text-foreground/60">{SUPPLIER_EMAIL}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-bold mb-1">Bill to</div>
              <div className="font-bold">{invoice.billing_name}</div>
              {invoice.billing_company && <div className="text-sm text-foreground/80">{invoice.billing_company}</div>}
              {invoice.billing_address_line1 && <div className="text-sm text-foreground/60">{invoice.billing_address_line1}</div>}
              {invoice.billing_address_line2 && <div className="text-sm text-foreground/60">{invoice.billing_address_line2}</div>}
              <div className="text-sm text-foreground/60">{[invoice.billing_city, invoice.billing_postcode].filter(Boolean).join(" ")}</div>
              <div className="text-sm text-foreground/60">{invoice.billing_country}</div>
              <div className="text-sm text-foreground/60 mt-1">{invoice.billing_email}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm border-t border-foreground/10 pt-4 mb-4">
            <div><span className="text-foreground/50">Issue date:</span> <span className="font-semibold">{fmtDate(invoice.issued_at)}</span></div>
            <div><span className="text-foreground/50">Due date:</span> <span className="font-semibold">{fmtDate(invoice.due_at)}</span></div>
            <div><span className="text-foreground/50">Terms:</span> <span className="font-semibold">{invoice.payment_terms_label}</span></div>
            {invoice.po_reference && <div className="sm:col-span-3"><span className="text-foreground/50">PO ref:</span> <span className="font-semibold">{invoice.po_reference}</span></div>}
          </div>

          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-wider text-foreground/50 border-y border-foreground/10">
              <tr>
                <th className="py-2">Description</th>
                <th className="py-2 w-14 text-right">Qty</th>
                <th className="py-2 w-24 text-right">Unit</th>
                <th className="py-2 w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((li, i) => (
                <tr key={i} className="border-b border-foreground/5">
                  <td className="py-3 pr-2">{li.description}</td>
                  <td className="py-3 text-right">{li.quantity}</td>
                  <td className="py-3 text-right">{fmtGbp(li.unit_amount_pence)}</td>
                  <td className="py-3 text-right font-semibold">{fmtGbp(li.line_total_pence)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-72 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-foreground/60">Subtotal</span><span>{fmtGbp(invoice.subtotal_pence)}</span></div>
              {invoice.amount_paid_pence > 0 && (
                <div className="flex justify-between text-sm"><span className="text-foreground/60">Paid</span><span>− {fmtGbp(invoice.amount_paid_pence)}</span></div>
              )}
              <div className="flex justify-between text-base font-extrabold border-t border-foreground/15 pt-2 mt-1">
                <span>{invoice.status === "paid" ? "Total" : "Amount due"}</span>
                <span>{fmtGbp(invoice.status === "paid" ? invoice.total_pence : due)}</span>
              </div>
            </div>
          </div>
        </Card>

        {invoice.status !== "paid" && invoice.status !== "cancelled" && (
          <Card className="p-6 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70 mb-3">Pay by bank transfer (GBP)</h2>
            <p className="text-sm text-foreground/70 mb-4">
              Please pay <strong>{fmtGbp(due)}</strong> by <strong>{fmtDate(invoice.due_at)}</strong>. Quote the invoice number as your payment reference so we can match it to your account.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <CopyChip label="Payee" value={BANK.payee} />
              <CopyChip label="Sort code" value={BANK.sortCode} />
              <CopyChip label="Account number" value={BANK.account} />
              <CopyChip label="Reference" value={invoice.invoice_number} />
              <CopyChip label="Amount" value={fmtGbp(due)} />
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={downloadPdf} disabled={pdfLoading} className="gap-2">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }} className="gap-2">
            <Copy className="h-4 w-4" /> Copy link
          </Button>
        </div>

        <p className="text-xs text-foreground/40 mt-8 text-center">
          Questions about this invoice? Email <a href={`mailto:${SUPPLIER_EMAIL}`} className="underline">{SUPPLIER_EMAIL}</a>.
        </p>
      </div>
    </div>
  );
}
