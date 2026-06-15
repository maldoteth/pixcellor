import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  Lock,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";

type Device = "desktop" | "tablet" | "mobile";

type GenSite = {
  id: string;
  ref: string;
  display_name: string;
  brief: string | null;
  doc: any;
  owner_user_id: string;
};

type Msg = { role: "user" | "assistant"; content: string };

const DEVICE_SIZES: Record<Device, { w: number | "100%"; h: number | "100%" }> = {
  desktop: { w: "100%", h: "100%" },
  tablet: { w: 820, h: 1100 },
  mobile: { w: 390, h: 780 },
};

export default function ByowGeneratedEditor() {
  const { ref } = useParams<{ ref: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<GenSite | null>(null);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [cacheKey, setCacheKey] = useState(0);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(`/customer-auth?redirect=/byow/edit/${ref}`);
        return;
      }
      const [{ data: row, error }, { data: subs }] = await Promise.all([
        supabase
          .from("byow_generated_sites")
          .select("id, ref, display_name, brief, doc, owner_user_id")
          .eq("ref", ref)
          .maybeSingle(),
        supabase
          .from("byow_subscriptions")
          .select("status")
          .eq("status", "active")
          .limit(1),
      ]);
      if (!alive) return;
      if (error || !row) {
        toast.error("Site not found");
        navigate("/portal?tab=sites");
        return;
      }
      setSite(row as GenSite);
      setHasActiveSub((subs?.length ?? 0) > 0);
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 50);
    })();
    return () => { alive = false; };
  }, [ref, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    if (!input.trim() || sending || !site) return;
    if (!hasActiveSub) {
      setPaywallOpen(true);
      return;
    }
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const brand = site.doc?.brand;
      if (!brand?.colors || !brand?.fonts) throw new Error("Site brand is missing — please regenerate from scratch.");
      const newBrief = `${site.brief || ""}\n\n--- User edit (${new Date().toISOString()}) ---\n${text}`.trim();

      const { data, error } = await supabase.functions.invoke("byow-generate-site", {
        body: {
          ref: site.ref,
          brief: newBrief,
          display_name: site.display_name,
          brand: { colors: brand.colors, fonts: brand.fonts, logo_url: brand.logo_url },
        },
      });
      if (error) throw error;
      const payload = (data as any) || {};
      if (payload.error) {
        if (payload.error === "free_quota_exceeded") {
          setPaywallOpen(true);
          return;
        }
        throw new Error(payload.message || payload.error);
      }
      setSite({ ...site, doc: payload.doc, brief: newBrief });
      setMessages((m) => [...m, { role: "assistant", content: "Done — your site has been updated. Refresh the preview if needed." }]);
      setCacheKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update");
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err?.message || "Failed to update"}` }]);
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  };

  const frameStyle = useMemo(() => {
    const s = DEVICE_SIZES[device];
    return {
      width: typeof s.w === "number" ? `${s.w}px` : s.w,
      height: typeof s.h === "number" ? `${s.h}px` : s.h,
      maxWidth: "100%",
      maxHeight: "100%",
    } as React.CSSProperties;
  }, [device]);

  if (loading || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const iframeSrc = `/s/${site.ref}?_pxc=${cacheKey}`;

  return (
    <>
      <SeoHead title={`Edit · ${site.display_name}`} description="Edit your AI-generated site." path={`/byow/edit/${site.ref}`} />
      <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-12 border-b border-white/10 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/portal?tab=sites")}
              className="text-white/50 hover:text-white"
              aria-label="Back to sites"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-sm truncate">{site.display_name}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider truncate">
                pixcellor.com/s/{site.ref}
                {!hasActiveSub && <span className="ml-2 text-amber-400">Free · edits locked</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {(["desktop", "tablet", "mobile"] as const).map((d) => {
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`p-2 rounded-md border transition-colors ${
                    device === d ? "border-white/40 bg-white/10" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                  title={d}
                  aria-label={`${d} view`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
            <button
              onClick={() => setCacheKey((k) => k + 1)}
              className="ml-1 p-2 rounded-md border border-white/10 text-white/50 hover:text-white"
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <a
              href={`/s/${site.ref}`}
              target="_blank"
              rel="noreferrer"
              className="ml-1 p-2 rounded-md border border-white/10 text-white/50 hover:text-white"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          {/* Chat panel */}
          <aside className="border-r border-white/10 flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-xs text-white/40 px-2 py-6 text-center">
                  Describe a change to your site — e.g. "Change the hero headline to X" or "Add a testimonial section".
                  {!hasActiveSub && (
                    <div className="mt-3 text-amber-400/80">You're on the free plan — upgrade to enable edits.</div>
                  )}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-white text-black"
                      : "bg-white/5 border border-white/10 text-white/90"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Updating your site…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3 space-y-2 shrink-0">
              <Textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => { if (!hasActiveSub) setPaywallOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={hasActiveSub ? "Describe the change…" : "Upgrade to send edit prompts"}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none text-sm"
              />
              <Button
                onClick={send}
                disabled={sending || !input.trim()}
                className="w-full request-shimmer bg-white text-black hover:bg-white"
              >
                {sending ? "Updating…" : hasActiveSub ? "Send" : (<span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Upgrade to edit</span>)}
              </Button>
            </div>
          </aside>

          {/* Preview */}
          <section className="flex flex-col min-h-0 bg-neutral-950 items-center justify-center p-4">
            <div
              className="bg-white shadow-2xl rounded-md overflow-hidden transition-all duration-300"
              style={frameStyle}
            >
              <iframe
                key={cacheKey}
                src={iframeSrc}
                title="Site preview"
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </section>
        </div>
      </div>

      <Dialog open={paywallOpen} onOpenChange={setPaywallOpen}>
        <DialogContent className="bg-black text-white border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-light flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Upgrade to edit your site
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Free accounts can generate 1 site to try Pixcellor. Activate a plan to send edit prompts and keep iterating.
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-white/60 space-y-2">
            <p>You can also hire our team for pixel-perfect, human-built changes shipped in hours.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button asChild variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
              <Link to="/get-started">Hire our team</Link>
            </Button>
            <Button asChild className="request-shimmer bg-white text-black hover:bg-white">
              <Link to="/byow#pricing">See plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
