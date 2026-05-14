import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Wand2, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";
import MagicLinkSignup from "@/components/MagicLinkSignup";
import { Button } from "@/components/ui/button";
import BrandKit from "@/components/BrandKit";
import LetsTalkPrompt from "@/components/LetsTalkPrompt";

interface Preview {
  id: string;
  slug: string;
  brief: string | null;
  title: string | null;
  image_path: string;
  comparison_image_path?: string | null;
  created_at: string;
  palette?: any;
  fonts?: any;
}

const BUCKET = "vision-previews";

export default function VisionPreview() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthedEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthedEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ email?: string | null }>).detail;
      setRequested(true);
      if (detail?.email) setSubmittedEmail(detail.email);
    };
    window.addEventListener("pixcellor:letstalk-submitted", handler);
    return () => window.removeEventListener("pixcellor:letstalk-submitted", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .rpc("get_vision_preview_by_slug", { _slug: slug })
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else if (!data) {
        setError("This preview link is invalid or has been removed.");
      } else {
        setPreview(data as Preview);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const imageUrl = preview
    ? supabase.storage.from(BUCKET).getPublicUrl(preview.image_path).data.publicUrl
    : null;

  const openLetsTalk = () => {
    if (!preview) return;
    try {
      sessionStorage.setItem(
        "pixcellor:consultation-context",
        JSON.stringify({
          imageUrl,
          brief: preview.brief ?? preview.title ?? null,
          previewSlug: preview.slug,
          previewTitle: preview.title,
          email: authedEmail ?? null,
        }),
      );
    } catch { /* ignore */ }
    window.dispatchEvent(
      new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "consultation" } }),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={preview?.title ? `${preview.title} — Pixcellor preview` : "Your Preview"}
        description="A custom AI-rendered website concept made for you by Pixcellor."
        path={`/preview/${slug ?? ""}`}
      />
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Pixcellor
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your preview…
          </div>
        ) : error ? (
          <div className="border border-border p-8 text-center space-y-3">
            <p className="text-base font-semibold">Preview not available</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/" className="inline-block text-sm underline underline-offset-4">
              Go to Pixcellor home
            </Link>
          </div>
        ) : preview && imageUrl ? (
          <>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{preview.title ?? "Your Preview"}</h1>
            </div>
            <div
              tabIndex={-1}
              className="border border-border bg-black/40 overflow-auto outline-none focus:outline-none focus-visible:outline-none select-none"
              style={{ maxHeight: "min(75vh, calc(100dvh - 220px))", minHeight: "320px" }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <img
                src={imageUrl}
                alt={preview.title ?? "Generated website preview"}
                className="w-full block pointer-events-none select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
            {(preview.palette || preview.fonts) && (
              <div className="border border-border p-4">
                <BrandKit palette={preview.palette} fonts={preview.fonts} sideBySide />
              </div>
            )}
            {preview.brief && (
              <details className="border border-border p-3 text-sm text-muted-foreground">
                <summary className="cursor-pointer text-foreground/80">Design brief</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">{preview.brief}</pre>
              </details>
            )}
            {!requested ? (
              <div className="border border-border p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Like what you see? We can build this as a real, fully-custom site.
                </p>
                <Button onClick={openLetsTalk} className="rounded-none gap-1">
                  Get started <Wand2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="border border-border p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-base font-semibold">Our team will be in touch soon 🎉</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thanks for letting us know you love this preview — we'll reach out within 24 hours to scope your build.
                    </p>
                  </div>
                </div>
                {authedEmail ? (
                  <Button
                    onClick={() => navigate("/customer-portal")}
                    variant="pricing"
                    className="w-full font-semibold"
                  >
                    Back to your dashboard
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs text-foreground/70">
                      Want to track this in your own dashboard? Get a magic link sent to {submittedEmail || "your email"}.
                    </label>
                    <MagicLinkSignup
                      email={submittedEmail ?? ""}
                      benefit="Save this preview to your dashboard so you can revisit it any time and follow your project."
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>

      <LetsTalkPrompt />
    </div>
  );
}
