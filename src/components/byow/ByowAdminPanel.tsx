import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePortalRefresh } from "@/hooks/usePortalRefresh";

interface QueueItem {
  id: string;
  site_id: string;
  prompt: string;
  mode: string;
  status: string;
  created_at: string;
  owner_user_id: string;
  admin_notes: string | null;
}
interface Site {
  id: string;
  display_name: string;
  owner_user_id: string;
  lovable_project_id: string | null;
  lovable_preview_url: string | null;
  published_url: string | null;
  status: string;
}

const TIERS = {
  care:   { label: "Care",   price: "£100",  quota: 25 },
  studio: { label: "Studio", price: "£500",  quota: 180 },
  agency: { label: "Agency", price: "£2,500", quota: 1000 },
} as const;

export default function ByowAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [tab, setTab] = useState<"queue" | "sites" | "new">("queue");

  const [nsName, setNsName] = useState("");
  const [nsEmail, setNsEmail] = useState("");
  const [nsPublished, setNsPublished] = useState("");
  const [nsPreview, setNsPreview] = useState("");
  const [nsProjectId, setNsProjectId] = useState("");
  const [nsTier, setNsTier] = useState<"care" | "studio" | "agency">("care");
  const [nsCreating, setNsCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [{ data: q }, { data: ss }] = await Promise.all([
      supabase.from("byow_admin_queue").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("byow_sites").select("*").order("created_at", { ascending: false }),
    ]);
    setQueue((q || []) as QueueItem[]);
    setSites((ss || []) as Site[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);
  usePortalRefresh(loadAll);


  const setStatus = async (id: string, status: string, notes?: string) => {
    const patch: any = { status };
    if (status === "done" || status === "rejected") patch.resolved_at = new Date().toISOString();
    if (notes !== undefined) patch.admin_notes = notes;
    const { error } = await supabase.from("byow_admin_queue").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (status === "done") {
      const q = queue.find((x) => x.id === id);
      if (q) {
        await supabase.from("byow_messages").insert({
          site_id: q.site_id,
          owner_user_id: q.owner_user_id,
          role: "assistant",
          content: notes?.trim()
            ? `Your edit is live. ${notes.trim()}\n\nRefresh the preview to see it.`
            : "Your edit is live. Refresh the preview to see it.",
          mode: q.mode,
          status: "done",
          credits_cost: 0,
          metadata: { queue_item_id: id },
        });
      }
    }
    await loadAll();
  };

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsName || !nsEmail) return;
    setNsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("byow-admin-create-site", {
        body: {
          client_email: nsEmail.trim().toLowerCase(),
          display_name: nsName.trim(),
          published_url: nsPublished.trim() || undefined,
          lovable_preview_url: nsPreview.trim() || undefined,
          lovable_project_id: nsProjectId.trim() || undefined,
          tier: nsTier,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Created "${nsName}" on ${TIERS[nsTier].label} plan. Invite email sent to ${nsEmail}.`);
      setNsName(""); setNsEmail(""); setNsPublished(""); setNsPreview(""); setNsProjectId("");
      setTab("sites");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Failed to create site");
    } finally {
      setNsCreating(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-black text-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-base font-semibold">BYOW client sites</div>
          <div className="text-xs text-white/40">Queue, provisioned sites, and new client setup.</div>
        </div>
        <div className="flex gap-1 text-xs">
          {(["queue", "sites", "new"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md border ${tab === t ? "border-white/40 bg-white/10" : "border-white/10 text-white/50 hover:text-white"}`}
            >
              {t === "queue" ? `Queue (${queue.filter(q => q.status === "pending").length})` : t === "sites" ? `Sites (${sites.length})` : "+ New site"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-white/40 text-sm">Loading…</div>}

      {!loading && tab === "queue" && (
        <div className="space-y-3">
          {queue.length === 0 && <div className="text-white/40 text-sm">Queue is empty.</div>}
          {queue.map((q) => {
            const site = sites.find((s) => s.id === q.site_id);
            return <QueueRow key={q.id} item={q} siteName={site?.display_name || "(unknown site)"} onAction={setStatus} />;
          })}
        </div>
      )}

      {!loading && tab === "sites" && (
        <div className="space-y-3">
          {sites.length === 0 && <div className="text-white/40 text-sm">No sites yet. Add one in "+ New site".</div>}
          {sites.map((s) => <SiteRow key={s.id} site={s} onReload={loadAll} />)}
        </div>
      )}

      {!loading && tab === "new" && (
        <form onSubmit={createSite} className="max-w-lg space-y-4">
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Client email</Label>
            <Input value={nsEmail} onChange={(e) => setNsEmail(e.target.value)} required type="email"
              placeholder="client@example.com" className="mt-1 bg-white/5 border-white/10 text-white" />
            <p className="text-[10px] text-white/40 mt-1">If they don't have an account, we'll email them an invite.</p>
          </div>
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Site display name</Label>
            <Input value={nsName} onChange={(e) => setNsName(e.target.value)} required
              placeholder="Acme Bakery" className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Published URL</Label>
            <Input value={nsPublished} onChange={(e) => setNsPublished(e.target.value)}
              placeholder="https://acme.com" className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Lovable preview URL</Label>
            <Input value={nsPreview} onChange={(e) => setNsPreview(e.target.value)}
              placeholder="https://id-preview--xxx.lovable.app" className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Lovable project ID (optional)</Label>
            <Input value={nsProjectId} onChange={(e) => setNsProjectId(e.target.value)}
              placeholder="ffd2b11e-..." className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-xs text-white/60 uppercase tracking-wider">Plan</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.keys(TIERS) as Array<keyof typeof TIERS>).map((k) => (
                <button key={k} type="button" onClick={() => setNsTier(k)}
                  className={`rounded-md border px-3 py-2 text-left ${nsTier === k ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"}`}>
                  <div className="text-sm">{TIERS[k].label}</div>
                  <div className="text-[10px] text-white/50">{TIERS[k].price}/mo · {TIERS[k].quota} prompts</div>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={nsCreating} className="request-shimmer bg-white text-black hover:bg-white">
            {nsCreating ? "Creating…" : "Create site & activate plan"}
          </Button>
        </form>
      )}
    </div>
  );
}

function QueueRow({ item, siteName, onAction }: {
  item: QueueItem;
  siteName: string;
  onAction: (id: string, status: string, notes?: string) => void;
}) {
  const [notes, setNotes] = useState(item.admin_notes || "");
  const statusColor = item.status === "pending" ? "text-amber-400" :
    item.status === "in_progress" ? "text-blue-400" :
    item.status === "done" ? "text-emerald-400" : "text-white/40";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-sm">{siteName}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
            {item.mode} mode · <span className={statusColor}>{item.status}</span> · {new Date(item.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      <div className="text-sm text-white/80 whitespace-pre-wrap bg-black/40 rounded-md p-3 mb-3">{item.prompt}</div>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note for the client" rows={2}
        className="bg-white/5 border-white/10 text-white text-sm mb-2" />
      <div className="flex gap-2 flex-wrap">
        {item.status === "pending" && (
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10"
            onClick={() => onAction(item.id, "in_progress", notes)}>Mark in progress</Button>
        )}
        {item.status !== "done" && (
          <Button size="sm" className="request-shimmer bg-white text-black hover:bg-white"
            onClick={() => onAction(item.id, "done", notes)}>Mark done & notify client</Button>
        )}
        {item.status !== "rejected" && item.status !== "done" && (
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onAction(item.id, "rejected", notes)}>Reject</Button>
        )}
      </div>
    </div>
  );
}

function SiteRow({ site, onReload }: { site: Site; onReload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [pub, setPub] = useState(site.published_url || "");
  const [prev, setPrev] = useState(site.lovable_preview_url || "");
  const save = async () => {
    const { error } = await supabase.from("byow_sites").update({
      published_url: pub.trim() || null,
      lovable_preview_url: prev.trim() || null,
    }).eq("id", site.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(false);
    onReload();
  };
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm">{site.display_name}</div>
          <div className="text-[10px] text-white/40 mt-1 space-y-0.5">
            <div className="truncate">Live: {site.published_url || "—"}</div>
            <div className="truncate">Preview: {site.lovable_preview_url || "—"}</div>
          </div>
        </div>
        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10"
          onClick={() => setEditing((v) => !v)}>{editing ? "Cancel" : "Edit URLs"}</Button>
      </div>
      {editing && (
        <div className="mt-3 space-y-2">
          <Input value={pub} onChange={(e) => setPub(e.target.value)} placeholder="Published URL"
            className="bg-white/5 border-white/10 text-white text-sm" />
          <Input value={prev} onChange={(e) => setPrev(e.target.value)} placeholder="Lovable preview URL"
            className="bg-white/5 border-white/10 text-white text-sm" />
          <Button size="sm" className="request-shimmer bg-white text-black hover:bg-white" onClick={save}>Save</Button>
        </div>
      )}
    </div>
  );
}
