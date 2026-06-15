import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/components/SeoHead";
import { OG_PORTFOLIO } from "@/data/ogImages";

type Project = {
  name: string;
  url: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
};

const fallbackImage = (url: string) =>
  `https://image.thum.io/get/width/900/crop/1200/https://${url.replace(/^https?:\/\//, "")}`;

const normalizeHref = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

const displayHost = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

export default function Portfolio() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Portfolio — Pixcellor";
    (async () => {
      const { data } = await supabase
        .from("portfolio_projects")
        .select("name,url,category,description,image_url")
        .order("display_order", { ascending: true });
      if (data) setItems(data as Project[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Portfolio — Pixcellor"
        description="Selected work from Pixcellor — modern, animated, and interactive websites and apps built for ambitious brands."
        path="/portfolio"
        image={OG_PORTFOLIO}
      />
        <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-16">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back home
            </Link>
            <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/40">
              {items.length} {items.length === 1 ? "project" : "projects"}
            </span>
          </div>

          <header className="mb-10 md:mb-14">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Full portfolio
            </h1>
            <p className="mt-4 max-w-2xl text-base md:text-lg text-foreground/70">
              Every site, app and brand we've shipped — updated automatically as new
              work joins the carousel on the homepage.
            </p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl border border-foreground/10 bg-foreground/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((p, i) => {
                const href = normalizeHref(p.url);
                const img = p.image_url ?? fallbackImage(p.url);
                return (
                  <motion.a
                    key={`${p.name}-${i}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04 }}
                    className="group relative overflow-hidden rounded-xl border border-foreground/10 bg-foreground/[0.03] backdrop-blur-md transition hover:border-foreground/30"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-black">
                      <img
                        src={img}
                        alt={`${p.name} — ${p.category ?? "portfolio project"}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/50">
                            {p.category ?? "Project"}
                          </div>
                          <div className="mt-1 text-base font-semibold truncate">
                            {p.name}
                          </div>
                        </div>
                        <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-foreground/40 transition group-hover:text-foreground" />
                      </div>
                      {p.description && (
                        <p className="mt-2 text-sm text-foreground/70 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-foreground/50 truncate">
                        {displayHost(p.url)}
                      </div>
                    </div>
                  </motion.a>
                );
              })}
            </div>
          )}
        </div>
      </main>
  );
}
