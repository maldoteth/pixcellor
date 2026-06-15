import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import Footer from "@/components/Footer";
import { SERVICE_CATEGORIES, SERVICES, type ServiceCategory } from "@/data/services";
import { OG_SERVICES } from "@/data/ogImages";

const ORDER: ServiceCategory[] = ["marketing", "tech", "business"];

export default function ServicesIndex() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Services — Pixcellor"
        description="Marketing, tech and business services from Pixcellor — websites, web apps, telesales, recruitment, AI agents and more."
        path="/services"
        image={OG_SERVICES}
      />
      <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 md:px-10">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80">
            <ArrowLeft className="h-4 w-4" />
            Pixcellor™
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-10 md:py-16">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Services</h1>
        <p className="mt-3 max-w-2xl text-base md:text-lg text-foreground/70">
          Marketing, tech and business solutions — from £22/hour telesales to award-grade animated sites and AI agents that run your back office 24/7.
        </p>

        <div className="mt-12 space-y-14">
          {ORDER.map((catId) => {
            const cat = SERVICE_CATEGORIES[catId];
            const items = SERVICES.filter((s) => s.category === catId);
            const Icon = cat.icon;
            return (
              <section key={catId}>
                <div className="mb-5 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-foreground/70" />
                  <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/60">
                    {cat.title}
                  </h2>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((s) => (
                    <li key={s.slug}>
                      <Link
                        to={`/services/${s.slug}`}
                        className="group flex h-full flex-col gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-md transition-colors hover:border-foreground/30 hover:bg-foreground/[0.06]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-semibold leading-tight text-foreground/90 transition-colors group-hover:text-white">{s.name}</h3>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground/40 transition-colors group-hover:text-foreground" />
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/70 transition-colors group-hover:text-foreground/90">{s.tagline}</p>
                        {s.pricing && (
                          <p className="mt-1 text-[11px] uppercase tracking-wider text-foreground/50 transition-colors group-hover:text-foreground/70">
                            {s.pricing}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
