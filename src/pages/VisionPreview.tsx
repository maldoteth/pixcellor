import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Wand2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";
import MagicLinkSignup from "@/components/MagicLinkSignup";
import { Button } from "@/components/ui/button";
import BrandKit from "@/components/BrandKit";

interface Preview {
  id: string;
  slug: string;
  brief: string | null;
  title: string | null;
  image_path: string;
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
  const [requested, setRequested] = useState(false);
  const [contactEmail, setContactEmail] = useState("");

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={preview?.title ? `${preview.title} — Pixcellor preview` : "Your Pixcellor preview"}
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
              <h1 className="text-xl font-semibold">{preview.title ?? "Your Pixcellor preview"}</h1>
            </div>
            <div
              tabIndex={-1}
              className="border border-border bg-black/40 max-h-[75vh] overflow-auto outline-none focus:outline-none focus-visible:outline-none select-none"
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
                <BrandKit palette={preview.palette} fonts={preview.fonts} />
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
                {authedEmail ? (
                  <Button
                    onClick={() => {
                      setRequested(true);
                      void supabase.from("lets_talk_leads").insert({
                        name: authedEmail,
                        email: authedEmail,
                        source: "vision_preview_get_started",
                        request_details: { previewSlug: preview.slug, title: preview.title } as any,
                      });
                    }}
                    className="rounded-none gap-1"
                  >
                    Get started <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setRequested(true)}
                    className="rounded-none gap-1"
                  >
                    Get started <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                )}
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
                    <label className="text-xs text-foreground/70">Your email — we'll send you a magic link to track this in your dashboard.</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                    />
                    <MagicLinkSignup
                      email={contactEmail}
                      benefit="Save this preview to your dashboard so you can revisit it any time and follow your project."
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
