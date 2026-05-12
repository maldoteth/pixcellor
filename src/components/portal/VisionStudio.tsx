import { useEffect, useState } from "react";
import { Loader2, Wand2, Copy, ExternalLink, Trash2, Mail, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminVisionWizard from "@/components/portal/AdminVisionWizard";
import BrandKit from "@/components/BrandKit";
import { usePromptDialog, useConfirmDialog } from "@/components/ui/themed-dialogs";

interface Preview {
  id: string;
  slug: string;
  brief: string | null;
  title: string | null;
  image_path: string;
  created_at: string;
  created_by_email: string | null;
  created_by_user_id: string | null;
  client_email: string | null;
  sent_at: string | null;
  palette: any;
  fonts: any;
}

interface VisitorGen {
  id: string;
  brief: string | null;
  image_url: string | null;
  source: string | null;
  company: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  visitor_id: string | null;
  is_refinement: boolean;
  parent_id: string | null;
  created_at: string;
  preview_slug: string | null;
  palette: any;
  fonts: any;
}

const BUCKET = "vision-previews";
const FALLBACK_BUCKET = "submission-attachments";


const publicUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const fallbackUrl = (path: string) =>
  supabase.storage.from(FALLBACK_BUCKET).getPublicUrl(path).data.publicUrl;

const handleImgFallback = (e: React.SyntheticEvent<HTMLImageElement>, path: string) => {
  const img = e.currentTarget;
  const fb = fallbackUrl(path);
  if (img.src !== fb) img.src = fb;
};

export default function VisionStudio() {
  const promptDialog = usePromptDialog();
  const confirmDialog = useConfirmDialog();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [latest, setLatest] = useState<Preview | null>(null);
  const [visitorGens, setVisitorGens] = useState<VisitorGen[]>([]);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const matchesPreview = (r: Preview) =>
    !q ||
    [r.title, r.brief, r.slug, r.created_by_email, r.client_email]
      .some((v) => v && v.toLowerCase().includes(q));
  const matchesVisitor = (g: VisitorGen) =>
    !q ||
    [g.brief, g.company, g.contact_name, g.email, g.phone, g.visitor_id, g.source]
      .some((v) => v && v.toLowerCase().includes(q));
  const adminPreviews = previews.filter((r) => !!r.created_by_user_id);
  const filteredPreviews = adminPreviews.filter(matchesPreview);
  const filteredVisitorGens = visitorGens.filter(matchesVisitor);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("vision_previews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPreviews((data ?? []) as Preview[]);
  };

  const loadVisitorGens = async () => {
    const { data, error } = await (supabase as any)
      .from("ai_sample_generations")
      .select("id,brief,image_url,source,company,contact_name,email,phone,visitor_id,is_refinement,parent_id,created_at,preview_slug,palette,fonts")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Failed to load visitor AI samples:", error);
      return;
    }
    setVisitorGens((data ?? []) as VisitorGen[]);
  };

  useEffect(() => {
    void load();
    void loadVisitorGens();
  }, []);

  const handleCreated = (row: Preview) => {
    setLatest(row);
    setPreviews((p) => [row, ...p]);
  };

  const sendEmail = async (row: Preview, name?: string, overrideEmail?: string) => {
    const recipient = overrideEmail || row.client_email;
    if (!recipient) {
      toast.error("No client email on this preview");
      return;
    }
    setSendingId(row.id);
    try {
      const previewUrl = `${window.location.origin}/preview/${row.slug}`;
      const imageUrl = publicUrl(row.image_path);
      const { error } = await supabase.functions.invoke("send-vision-preview", {
        body: {
          previewId: row.id,
          recipientEmail: recipient,
          clientName: name,
          title: row.title ?? undefined,
          brief: row.brief ?? undefined,
          previewUrl,
          imageUrl,
        },
      });
      if (error) throw error;
      const sentAt = new Date().toISOString();
      await (supabase as any)
        .from("vision_previews")
        .update({ sent_at: sentAt, client_email: recipient })
        .eq("id", row.id);
      setPreviews((p) => p.map((r) => (r.id === row.id ? { ...r, sent_at: sentAt, client_email: recipient } : r)));
      if (latest?.id === row.id) setLatest({ ...latest, sent_at: sentAt, client_email: recipient });
      toast.success(`Sent to ${recipient}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email");
    } finally {
      setSendingId(null);
    }
  };

  const promptAndSend = async (row: Preview) => {
    const result = await promptDialog({
      title: "Send preview",
      description: "We'll email this preview to the recipient.",
      fields: [
        { name: "email", label: "Recipient email", type: "email", required: true, defaultValue: row.client_email ?? "", placeholder: "name@example.com" },
        { name: "name", label: "Client name (optional)", placeholder: "Jane Doe" },
      ],
      confirmLabel: "Send",
    });
    if (!result) return;
    await sendEmail(row, result.name?.trim() || undefined, result.email.trim());
  };

  const shareUrl = (slug: string) => `${window.location.origin}/preview/${slug}`;

  const copyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(slug));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const remove = async (row: Preview) => {
    const ok = await confirmDialog({ title: "Delete preview?", description: "This permanently removes the preview and its image.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    await supabase.storage.from(BUCKET).remove([row.image_path]);
    const { error } = await (supabase as any).from("vision_previews").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPreviews((p) => p.filter((r) => r.id !== row.id));
    if (latest?.id === row.id) setLatest(null);
    toast.success("Deleted");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 className="h-4 w-4" /> Vision studio
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate AI website samples and get a unique shareable preview URL for each one.
        </p>
      </div>

      <div className="rounded-none border border-border p-4 bg-card/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold inline-flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Generate a new preview
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Same step-by-step wizard your visitors use — pick details, then optionally auto-send to a client.
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="rounded-none gap-2">
          <Wand2 className="h-4 w-4" /> Generate preview
        </Button>
      </div>

      <AdminVisionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={handleCreated}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search visitor & admin previews — brief, company, email, title, slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-none pl-9"
        />
      </div>

      <Tabs defaultValue="visitors" className="w-full">
        <TabsList className="rounded-none">
          <TabsTrigger value="visitors" className="rounded-none">Visitor generations ({filteredVisitorGens.length})</TabsTrigger>
          <TabsTrigger value="ours" className="rounded-none">Our previews ({filteredPreviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="mt-4">
          <div className="rounded-none border border-border p-4 space-y-3 bg-card/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold inline-flex items-center gap-2">
                <Wand2 className="h-4 w-4" /> Visitor AI generations ({filteredVisitorGens.length}{q ? ` of ${visitorGens.length}` : ""})
              </p>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => void loadVisitorGens()}>
                Refresh
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Every AI sample generated by visitors on the site — even abandoned ones.</p>
            {filteredVisitorGens.length === 0 ? (
              <p className="text-xs text-muted-foreground">{q ? "No visitor generations match your search." : "No visitor generations yet."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[60vh] overflow-auto pr-1">
                {filteredVisitorGens.map((g) => (
                  <div key={g.id} className="rounded-none border border-border bg-card/40 overflow-hidden flex flex-col">
                    {g.image_url && (
                      <a href={g.image_url} target="_blank" rel="noreferrer" className="block max-h-48 overflow-hidden bg-black/40">
                        <img src={g.image_url} alt={g.company ?? "Visitor sample"} className="w-full block" />
                      </a>
                    )}
                    <div className="p-3 space-y-1 text-xs">
                      <p className="font-medium truncate">{g.company || g.contact_name || g.visitor_id || "Anonymous"}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(g.created_at).toLocaleString()}</p>
                      {(g.email || g.phone) && (
                        <p className="text-[11px] text-muted-foreground truncate">{g.email}{g.email && g.phone ? " · " : ""}{g.phone}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {g.source}{g.is_refinement ? " · refinement" : ""}
                      </p>
                      {g.brief && <p className="text-[11px] text-muted-foreground line-clamp-3">{g.brief}</p>}
                      {g.preview_slug && (
                        <div className="flex items-center gap-1 pt-1">
                          <code className="text-[10px] px-1.5 py-0.5 bg-muted text-foreground rounded-none truncate flex-1">
                            {shareUrl(g.preview_slug)}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyLink(g.preview_slug!)}
                            aria-label="Copy preview link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => window.open(shareUrl(g.preview_slug!), "_blank")}
                            aria-label="Open preview"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ours" className="mt-4 space-y-4">
          {latest && (
            <div className="rounded-none border border-border p-4 space-y-3 bg-card/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">Latest preview</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs px-2 py-1 bg-muted text-foreground rounded-none break-all">
                    {shareUrl(latest.slug)}
                  </code>
                  <Button size="sm" variant="outline" className="rounded-none gap-1" onClick={() => copyLink(latest.slug)}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none gap-1"
                    onClick={() => window.open(shareUrl(latest.slug), "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                </div>
              </div>
              <div className="border border-border bg-black/40 max-h-[55vh] overflow-auto">
                <img
                  src={publicUrl(latest.image_path)}
                  onError={(e) => handleImgFallback(e, latest.image_path)}
                  alt={latest.title ?? "Generated preview"}
                  className="w-full block"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">All previews ({filteredPreviews.length}{q ? ` of ${previews.length}` : ""})</p>
            {filteredPreviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{q ? "No previews match your search." : "No previews yet — generate one above."}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPreviews.map((row) => (
                  <div key={row.id} className="rounded-none border border-border bg-card/40 overflow-hidden flex flex-col">
                    <a
                      href={shareUrl(row.slug)}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-h-48 overflow-hidden bg-black/40"
                    >
                      <img src={publicUrl(row.image_path)} onError={(e) => handleImgFallback(e, row.image_path)} alt={row.title ?? "Preview"} className="w-full block" />
                    </a>
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{row.title ?? row.slug}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(row.created_at).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            By {row.created_by_email ?? "unknown"}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(row)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label="Delete preview"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {row.brief && (
                        <p className="text-xs text-muted-foreground line-clamp-3">{row.brief}</p>
                      )}
                      {(row.client_email || row.sent_at) && (
                        <p className="text-[11px] text-muted-foreground truncate inline-flex items-center gap-1">
                          {row.sent_at ? <Check className="h-3 w-3 text-emerald-400" /> : <Mail className="h-3 w-3" />}
                          {row.sent_at ? `Sent to ${row.client_email}` : `For ${row.client_email}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none gap-1 flex-1"
                          onClick={() => promptAndSend(row)}
                          disabled={sendingId === row.id}
                        >
                          {sendingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                          {row.sent_at ? "Resend" : "Send"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none gap-1"
                          onClick={() => copyLink(row.slug)}
                          aria-label="Copy link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none gap-1"
                          onClick={() => window.open(shareUrl(row.slug), "_blank")}
                          aria-label="Open"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
