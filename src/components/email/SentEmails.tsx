import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  recipient_email: string;
  template_name: string;
  message_id: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const PAGE = 200;

const statusColor = (s: string) => {
  const v = (s || "").toLowerCase();
  if (v === "sent") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (v === "pending") return "bg-amber-500/20 text-amber-200 border-amber-500/40";
  if (v === "suppressed") return "bg-yellow-500/20 text-yellow-200 border-yellow-500/40";
  if (v === "bounced" || v === "complained" || v === "failed" || v === "dlq")
    return "bg-red-500/20 text-red-300 border-red-500/40";
  return "bg-white/10 text-white/80 border-white/20";
};

export default function SentEmails() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, recipient_email, template_name, message_id, status, error_message, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    setLoading(false);
    if (error) {
      toast.error(error.message || "Could not load sent emails");
      return;
    }
    setRows((data as LogRow[]) ?? []);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Deduplicate by message_id, keeping latest row per message
  const deduped = useMemo(() => {
    const seen = new Map<string, LogRow>();
    for (const r of rows) {
      const key = r.message_id || r.id;
      if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
  }, [rows]);

  const templates = useMemo(() => {
    const set = new Set<string>();
    for (const r of deduped) if (r.template_name) set.add(r.template_name);
    return Array.from(set).sort();
  }, [deduped]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return deduped.filter((r) => {
      if (statusFilter !== "all" && (r.status || "").toLowerCase() !== statusFilter) return false;
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (!query) return true;
      return (
        (r.recipient_email || "").toLowerCase().includes(query) ||
        (r.template_name || "").toLowerCase().includes(query) ||
        (r.message_id || "").toLowerCase().includes(query) ||
        (r.error_message || "").toLowerCase().includes(query)
      );
    });
  }, [deduped, q, statusFilter, templateFilter]);

  const stats = useMemo(() => {
    let sent = 0, pending = 0, failed = 0, suppressed = 0;
    for (const r of deduped) {
      const s = (r.status || "").toLowerCase();
      if (s === "sent") sent += 1;
      else if (s === "pending") pending += 1;
      else if (s === "suppressed") suppressed += 1;
      else failed += 1;
    }
    return { total: deduped.length, sent, pending, failed, suppressed };
  }, [deduped]);

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-semibold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Sent</div><div className="text-xl font-semibold text-emerald-300">{stats.sent}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Pending</div><div className="text-xl font-semibold text-amber-200">{stats.pending}</div></CardContent></Card>        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Failed</div><div className="text-xl font-semibold text-red-300">{stats.failed}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Suppressed</div><div className="text-xl font-semibold text-yellow-200">{stats.suppressed}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient, template, message id, error" className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">All statuses</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="dlq">DLQ</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Complained</option>
          <option value="suppressed">Suppressed</option>
        </select>
        <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[220px]">
          <option value="all">All templates</option>
          {templates.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Recipient</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{loading ? "Loading…" : "No emails match."}</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 break-all">{r.recipient_email}</td>
                    <td className="px-3 py-2 break-all"><code className="text-xs">{r.template_name}</code></td>
                    <td className="px-3 py-2"><Badge className={`capitalize border ${statusColor(r.status)}`}>{r.status}</Badge></td>
                    <td className="px-3 py-2 text-xs text-red-300 break-all">{r.error_message || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)} disabled={loading || rows.length < limit}>
          {loading ? "Loading…" : rows.length < limit ? "All loaded" : "Load more"}
        </Button>
      </div>
    </div>
  );
}
