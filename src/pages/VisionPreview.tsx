import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";

interface Preview {
  id: string;
  slug: string;
  brief: string | null;
  title: string | null;
  image_path: string;
  created_at: string;
}

const BUCKET = "vision-previews";

export default function VisionPreview() {
  const { slug } = useParams<{ slug: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("vision_previews")
        .select("*")
        .eq("slug", slug)
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
            {preview.brief && (
              <details className="border border-border p-3 text-sm text-muted-foreground">
                <summary className="cursor-pointer text-foreground/80">Design brief</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">{preview.brief}</pre>
              </details>
            )}
            <div className="border border-border p-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Like what you see? We can build this as a real, fully-custom site.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded-none border border-foreground px-4 py-2 text-sm font-medium hover:bg-foreground hover:text-background transition"
              >
                Get started <Wand2 className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
