import { useEffect, useState } from "react";
import { Loader2, Sparkles, Wand2, Copy, ExternalLink, Trash2, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Preview {
  id: string;
  slug: string;
  brief: string | null;
  title: string | null;
  image_path: string;
  created_at: string;
  created_by_email: string | null;
  client_email: string | null;
  sent_at: string | null;
}

const BUCKET = "vision-previews";

const dataUrlToBlob = (dataUrl: string) => {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const makeSlug = () => {
  const a = "abcdefghijkmnopqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
};

const publicUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export default function VisionStudio() {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [latest, setLatest] = useState<Preview | null>(null);

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

  useEffect(() => {
    void load();
  }, []);

  const generate = async () => {
    const trimmed = brief.trim();
    if (trimmed.length < 5) {
      toast.error("Add a brief (at least a few words).");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-vision", {
        body: { prompt: trimmed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const imageUrl: string | undefined = data?.imageUrl;
      if (!imageUrl) throw new Error("No image returned");

      const blob = dataUrlToBlob(imageUrl);
      const slug = makeSlug();
      const path = `${slug}.png`;

      const upload = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/png",
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const userRes = await supabase.auth.getUser();
      const email = userRes.data.user?.email ?? null;
      const userId = userRes.data.user?.id ?? null;

      const insert = await (supabase as any)
        .from("vision_previews")
        .insert({
          slug,
          brief: trimmed,
          title: title.trim() || null,
          image_path: path,
          created_by_user_id: userId,
          created_by_email: email,
          client_email: clientEmail.trim() || null,
        })
        .select()
        .single();
      if (insert.error) throw insert.error;

      const row = insert.data as Preview;
      setLatest(row);
      setPreviews((p) => [row, ...p]);

      // Auto-send email if client email provided
      if (clientEmail.trim()) {
        await sendEmail(row, clientName.trim() || undefined, clientEmail.trim());
      }

      setTitle("");
      setBrief("");
      setClientEmail("");
      setClientName("");
      toast.success("Preview created — link is ready to share.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate vision");
    } finally {
      setBusy(false);
    }
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
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "vision-preview-ready",
          recipientEmail: recipient,
          idempotencyKey: `vision-preview-${row.id}`,
          templateData: {
            clientName: name,
            title: row.title ?? undefined,
            brief: row.brief ?? undefined,
            previewUrl,
            imageUrl,
          },
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
    const def = row.client_email ?? "";
    const email = window.prompt("Send preview to (email):", def);
    if (!email) return;
    const name = window.prompt("Client name (optional):", "") ?? undefined;
    await sendEmail(row, name || undefined, email.trim());
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
    if (!confirm("Delete this preview?")) return;
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
          <Sparkles className="h-4 w-4" /> Vision studio
        </h2>
        <p className="text-sm text-muted-foreground">
          Generate AI website samples and get a unique shareable preview URL for each one.
        </p>
      </div>

      <div className="rounded-none border border-border p-4 space-y-3 bg-card/40">
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <Input
            placeholder="Internal title (optional, e.g. Acme Florist v1)"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-none"
          />
          <Textarea
            placeholder="Design brief: brand, industry, vibe, colours, headline, sections…"
            value={brief}
            rows={3}
            maxLength={2000}
            onChange={(e) => setBrief(e.target.value)}
            className="rounded-none resize-none"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Wand2 className="h-3 w-3" /> Uses the same generator as the landing page sample tool.
          </p>
          <Button onClick={generate} disabled={busy} className="rounded-none gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generating…" : "Generate preview"}
          </Button>
        </div>
      </div>

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
              alt={latest.title ?? "Generated preview"}
              className="w-full block"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">All previews ({previews.length})</p>
        {previews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No previews yet — generate one above.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previews.map((row) => (
              <div key={row.id} className="rounded-none border border-border bg-card/40 overflow-hidden flex flex-col">
                <a
                  href={shareUrl(row.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="block max-h-48 overflow-hidden bg-black/40"
                >
                  <img src={publicUrl(row.image_path)} alt={row.title ?? "Preview"} className="w-full block" />
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
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none gap-1 flex-1"
                      onClick={() => copyLink(row.slug)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none gap-1"
                      onClick={() => window.open(shareUrl(row.slug), "_blank")}
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
    </div>
  );
}
