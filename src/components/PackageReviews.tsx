import { useEffect, useMemo, useState } from "react";
import { Star, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_id: string | null;
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

function ReviewItem({ r }: { r: Review }) {
  return (
    <li className="border-b border-foreground/10 pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <Stars value={r.rating} />
        <span className="text-xs uppercase tracking-[0.18em] text-foreground/60">{r.author_name}</span>
      </div>
      {r.title && <div className="mt-2 text-sm font-semibold">{r.title}</div>}
      {r.body && <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{r.body}</p>}
    </li>
  );
}

export default function PackageReviews({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [, setUserEmail] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [form, setForm] = useState({ name: "", rating: 5, title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [query, setQuery] = useState("");

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

  // Top of page: only most recent 5-star reviews (max 5)
  const featured = useMemo(
    () => reviews.filter((r) => r.rating === 5).slice(0, 5),
    [reviews]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filterStar !== null && r.rating !== filterStar) return false;
      if (!q) return true;
      const hay = `${r.author_name} ${r.title ?? ""} ${r.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [reviews, filterStar, query]);

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
            {featured.length === 0 ? (
              <p className="text-sm text-foreground/60">No reviews yet — be the first.</p>
            ) : (
              <ul className="space-y-5">
                {featured.map((r) => (
                  <ReviewItem key={r.id} r={r} />
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-foreground/10 pt-5 space-y-4">
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="text-sm font-semibold text-foreground/80 hover:text-foreground underline underline-offset-4"
                  >
                    See all
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh]">
                  <DrawerHeader>
                    <DrawerTitle className="text-xs uppercase tracking-[0.22em] text-foreground/60">
                      All reviews ({reviews.length})
                    </DrawerTitle>
                  </DrawerHeader>

                  <div className="px-4 md:px-6 pb-2 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <Input
                        placeholder="Search reviews…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterStar(null)}
                        className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-[0.18em] border ${
                          filterStar === null
                            ? "border-foreground/60 bg-foreground/10 text-foreground"
                            : "border-foreground/15 text-foreground/60 hover:text-foreground"
                        }`}
                      >
                        All
                      </button>
                      {[5, 4, 3, 2, 1].map((n) => {
                        const count = reviews.filter((r) => r.rating === n).length;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setFilterStar(n)}
                            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border ${
                              filterStar === n
                                ? "border-foreground/60 bg-foreground/10 text-foreground"
                                : "border-foreground/15 text-foreground/60 hover:text-foreground"
                            }`}
                          >
                            {n} <Star className="h-3 w-3 fill-current" />
                            <span className="text-foreground/40">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-y-auto px-4 md:px-6 pb-6">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-foreground/60 py-6 text-center">No reviews match.</p>
                    ) : (
                      <ul className="space-y-5 pt-2">
                        {filtered.map((r) => (
                          <ReviewItem key={r.id} r={r} />
                        ))}
                      </ul>
                    )}
                  </div>
                </DrawerContent>
              </Drawer>

              {!userId ? null : !canReview ? null : hasOwnReview ? (
                <div className="text-sm text-foreground/70">Thanks — your review is published.</div>
              ) : (
                <div className="space-y-3 pt-2">
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
