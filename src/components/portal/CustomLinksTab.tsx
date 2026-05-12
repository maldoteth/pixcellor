import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ExternalLink, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CustomLinkRow = {
  id: string;
  created_at: string;
  description: string;
  amount_gbp: number;
  quantity: number;
  mode: string;
  client_email: string | null;
  internal_note: string | null;
  url: string;
  status: string;
  paid_at: string | null;
};

const formatGBP = (n: number) => `£${Number(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CustomLinksTab() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [recurring, setRecurring] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<CustomLinkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("custom_payment_links")
      .select("id, created_at, description, amount_gbp, quantity, mode, client_email, internal_note, url, status, paid_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setRows((data as CustomLinkRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!description.trim()) return toast.error("Add a description");
    if (!Number.isFinite(amt) || amt < 1) return toast.error("Enter an amount of £1 or more");
    setSubmitting(true);
    setLatestUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-custom-payment-link", {
        body: {
          description: description.trim(),
          amount_gbp: amt,
          quantity: Math.max(1, Number(quantity) | 0),
          mode: recurring ? "subscription" : "payment",
          client_email: clientEmail.trim() || null,
          internal_note: internalNote.trim() || null,
        },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No link returned");
      setLatestUrl(url);
      toast.success("Payment link created");
      setDescription("");
      setAmount("");
      setQuantity("1");
      setInternalNote("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Custom payment links</h2>
        <p className="text-sm text-muted-foreground">
          Generate a Stripe payment link for any amount. Use it for bespoke quotes, deposits, or one-off agreed fees.
        </p>
      </div>

      <Card className="border-border bg-card/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Create a new link</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="cl-desc">Description (shown on Stripe checkout)</Label>
              <Input
                id="cl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Custom site build — Acme Ltd"
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-amount">Amount (GBP)</Label>
              <Input
                id="cl-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-qty">Quantity</Label>
              <Input
                id="cl-qty"
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-email">Client email (optional)</Label>
              <Input
                id="cl-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@company.com"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2">
              <div>
                <Label htmlFor="cl-recurring" className="cursor-pointer">Recurring (monthly)</Label>
                <p className="text-xs text-muted-foreground">Off = one-off charge</p>
              </div>
              <Switch id="cl-recurring" checked={recurring} onCheckedChange={setRecurring} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="cl-note">Internal note (optional)</Label>
              <Textarea
                id="cl-note"
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Agreed scope, deposit terms, etc."
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" variant="pricing" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Create payment link
              </Button>
              {latestUrl && (
                <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
                  <span className="truncate flex-1">{latestUrl}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => copy(latestUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <a href={latestUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-base">Recent links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom links yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border bg-background/40 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{row.description}</span>
                      <Badge variant="outline">{formatGBP(row.amount_gbp)}{row.quantity > 1 ? ` × ${row.quantity}` : ""}</Badge>
                      {row.mode === "subscription" && <Badge variant="outline">Monthly</Badge>}
                      <Badge
                        className={
                          row.status === "paid"
                            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/10"
                            : "border-border bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {row.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                      {row.client_email ? ` · ${row.client_email}` : ""}
                      {row.paid_at ? ` · paid ${new Date(row.paid_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copy(row.url)} className="gap-1">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="gap-1">
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
