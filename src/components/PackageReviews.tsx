import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_id: string;
};

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < full ? "fill-foreground text-foreground" : "text-foreground/30"}`} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <Star className={`h-6 w-6 ${n <= value ? "fill-foreground text-foreground" : "text-foreground/30"}`} />
          </button>
        );
      })}
    </div>
  );
}

export default function PackageReviews({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [form, setForm] = useState({ name: "", rating: 5, title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [{ data: rev }, { data: sess }] = await Promise.all([
        supabase
          .from("package_reviews")
          .select("id,author_name,rating,title,body,created_at,user_id")
          .eq("package_slug", slug)
          .order("created_at", { ascending: false }),
        supabase.auth.getSession(),
      ]);
      if (!mounted) return;
      setReviews((rev as Review[]) ?? []);
      const u = sess?.session?.user ?? null;
      setUserId(u?.id ?? null);
      setUserEmail(u?.email ?? null);
      if (u) {
        const { data: ok } = await supabase.rpc("current_user_has_purchase");
        if (mounted) setCanReview(Boolean(ok));
      }
      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [slug]);

  const hasOwnReview = !!userId && reviews.some((r) => r.user_id && r.user_id === userId);

  const submit = async () => {
    if (!userId) return;
    if (!form.name.trim()) {
      toast({ title: "Add your name", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("package_reviews")
      .insert({
        package_slug: slug,
        user_id: userId,
        author_name: form.name.trim(),
        rating: form.rating,
        title: form.title.trim() || null,
        body: form.body.trim() || null,
      })
      .select("id,author_name,rating,title,body,created_at,user_id")
      .single();
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not post review", description: error.message, variant: "destructive" });
      return;
    }
    setReviews((prev) => [data as Review, ...prev]);
    setForm({ name: "", rating: 5, title: "", body: "" });
    toast({ title: "Thanks for your review!" });
  };

  return (
    <section className="mb-12 md:mb-16">
      <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">TESTIMONIALS&nbsp;</h2>

      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 md:p-6 backdrop-blur-md">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…
          </div>
        ) : (
          <>
            {reviews.length === 0 ? (
              <p className="text-sm text-foreground/60">No reviews yet — be the first.</p>
            ) : (
              <ul className="space-y-5">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-foreground/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Stars value={r.rating} />
                      <span className="text-xs uppercase tracking-[0.18em] text-foreground/60">{r.author_name}</span>
                    </div>
                    {r.title && <div className="mt-2 text-sm font-semibold">{r.title}</div>}
                    {r.body && <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{r.body}</p>}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-foreground/10 pt-5">
              {!userId ? (
                <div className="text-sm text-foreground/70">
                  See All
                </div>
              ) : !canReview ? (
                <div className="text-sm text-foreground/70">
                  See All
                </div>
              ) : hasOwnReview ? (
                <div className="text-sm text-foreground/70">Thanks — your review is published.</div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-semibold">Leave a review</div>
                  <StarPicker value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
                  <Input
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={60}
                  />
                  <Input
                    placeholder="Title (optional)"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    maxLength={120}
                  />
                  <Textarea
                    placeholder="What did you think?"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                  />
                  <Button onClick={submit} disabled={submitting} variant="pricing">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post review"}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
