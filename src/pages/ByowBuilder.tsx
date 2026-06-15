import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Site {
  id: string;
  display_name: string;
  lovable_preview_url: string | null;
  published_url: string | null;
  status: string;
}

interface Sub {
  tier: string;
  status: string;
  prompt_quota: number;
  prompts_used: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: string;
  mode: string;
  created_at: string;
}

type ViewMode = "split" | "live" | "preview";

export default function ByowBuilder() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<Site | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"safe" | "full">("safe");
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<ViewMode>("split");
  const [previewKey, setPreviewKey] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        navigate("/byow/login", { replace: true });
        return;
      }

      const [{ data: siteData, error: siteErr }, { data: subData }, { data: msgsData }] = await Promise.all([
        supabase.from("byow_sites").select("*").eq("id", siteId).maybeSingle(),
        supabase.from("byow_subscriptions").select("*").eq("site_id", siteId).maybeSingle(),
        supabase.from("byow_messages").select("*").eq("site_id", siteId).order("created_at"),
      ]);
      if (siteErr || !siteData) {
        toast.error("Site not found");
        navigate("/byow", { replace: true });
        return;
      }
      setSite(siteData as Site);
      setSub(subData as Sub | null);
      setMessages((msgsData || []) as Message[]);
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    })();
  }, [siteId, navigate]);

  // Realtime updates for messages
  useEffect(() => {
    if (!siteId) return;
    const channel = supabase
      .channel(`byow_messages_${siteId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "byow_messages",
        filter: `site_id=eq.${siteId}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((m) => {
            if (m.some((x) => x.id === (payload.new as any).id)) return m;
            return [...m, payload.new as Message];
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [siteId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending || !site) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("byow-submit-prompt", {
        body: { site_id: site.id, prompt: text, mode },
      });
      if (error) throw error;
      if (data?.user_message && data?.assistant_message) {
        // Realtime will deliver; do nothing
      }
      if (typeof data?.prompts_remaining === "number" && sub) {
        setSub({ ...sub, prompts_used: sub.prompt_quota - data.prompts_remaining });
      }
      setTimeout(() => setPreviewKey((k) => k + 1), 500);
    } catch (err: any) {
      const msg = err?.message || "Failed to send";
      toast.error(msg);
      setInput(text);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  if (loading || !site) {
    return <div className="min-h-screen bg-black text-white/40 flex items-center justify-center text-sm">Loading…</div>;
  }

  const remaining = sub ? Math.max(0, sub.prompt_quota - sub.prompts_used) : 0;
  const canSend = sub?.status === "active" && remaining > 0;

  return (
    <>
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Header */}
        <header className="border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/byow" className="text-white/40 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="text-sm truncate">{site.display_name}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">
                {sub ? `${sub.tier} · ${remaining}/${sub.prompt_quota} prompts left` : "No active plan"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {(["split", "live", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md border ${view === v ? "border-white/40 bg-white/10" : "border-white/10 text-white/50 hover:text-white"}`}
              >
                {v === "live" ? "Live" : v === "preview" ? "Preview" : "Split"}
              </button>
            ))}
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="ml-2 p-1.5 rounded-md border border-white/10 text-white/50 hover:text-white"
              title="Refresh previews"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] min-h-0">
          {/* Chat */}
          <aside className="border-r border-white/10 flex flex-col min-h-0 max-h-[60vh] lg:max-h-none">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-xs text-white/40 px-2 py-6 text-center">
                  Tell us what to change on your site. e.g. "Change the hero headline to 'Big tech for UK SMEs'" or "Add a testimonial section under pricing."
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-white text-black"
                      : "bg-white/5 border border-white/10 text-white/90"
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    {m.status === "queued" && (
                      <div className="mt-1 text-[10px] uppercase tracking-wider opacity-50">Queued</div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/50">
                    Sending…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
              <div className="flex items-center gap-1 text-[10px]">
                {(["safe", "full"] as const).map((m) => {
                  const disabled = m === "full" && sub?.tier === "care";
                  return (
                    <button
                      key={m}
                      disabled={disabled}
                      onClick={() => setMode(m)}
                      className={`px-2 py-0.5 rounded uppercase tracking-wider ${
                        mode === m ? "bg-white text-black" : "text-white/40 hover:text-white"
                      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                      title={disabled ? "Available on Studio and Agency plans" : ""}
                    >
                      {m} mode
                    </button>
                  );
                })}
              </div>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                }}
                placeholder={canSend ? "Describe the change you'd like…" : "No prompts available."}
                disabled={!canSend || sending}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-sm"
              />
              <Button
                onClick={send}
                disabled={!canSend || sending || !input.trim()}
                className="w-full bg-white text-black hover:bg-white/90"
              >
                {sending ? "Sending…" : canSend ? "Send" : remaining === 0 ? "Out of prompts" : "Unavailable"}
              </Button>
              {!canSend && sub?.status !== "active" && (
                <p className="text-[10px] text-white/40 text-center">
                  Activate a plan to start sending edit requests.
                </p>
              )}
            </div>
          </aside>

          {/* Previews */}
          <section className="flex flex-col min-h-0 bg-neutral-950">
            {view === "split" ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 min-h-0">
                <PreviewFrame title="Live" url={site.published_url} cacheKey={previewKey} />
                <div className="border-l border-white/10">
                  <PreviewFrame title="Preview" url={site.lovable_preview_url} cacheKey={previewKey} />
                </div>
              </div>
            ) : view === "live" ? (
              <PreviewFrame title="Live" url={site.published_url} cacheKey={previewKey} />
            ) : (
              <PreviewFrame title="Preview" url={site.lovable_preview_url} cacheKey={previewKey} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function PreviewFrame({ title, url, cacheKey }: { title: string; url: string | null; cacheKey: number }) {
  if (!url) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-white/40 p-4 text-center">
        No {title.toLowerCase()} URL configured for this site yet.
      </div>
    );
  }
  const src = `${url}${url.includes("?") ? "&" : "?"}_pxc=${cacheKey}`;
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 py-1.5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40 flex items-center justify-between">
        <span>{title}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-white">Open ↗</a>
      </div>
      <iframe
        key={cacheKey}
        src={src}
        title={title}
        className="flex-1 w-full bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
