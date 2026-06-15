import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { PACKAGE_DETAILS } from "@/data/packages";
import { OG_PACKAGES } from "@/data/ogImages";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" } as const,
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export default function PackagesPage() {
  const packages = Object.values(PACKAGE_DETAILS);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Packages — Pixcellor"
        description="Choose a Pixcellor package — one-off builds and ongoing retainers for fast, premium websites."
        path="/packages"
        image={OG_PACKAGES}
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-10 md:py-16 pb-28 md:pb-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-foreground/60">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-foreground">Home</Link>
            </li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-foreground/90">Packages</li>
          </ol>
        </nav>

        <motion.header {...fadeUp} className="mb-10 md:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pricing</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Packages
          </h1>
          <p className="mt-4 text-base md:text-lg text-foreground/70 max-w-2xl">
            One-off builds and ongoing retainers. Pick the package that fits — every option ships fast and looks premium.
          </p>
        </motion.header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.slug}
              {...fadeUp}
              className={`group relative flex flex-col rounded-xl border bg-foreground/[0.03] p-6 backdrop-blur-md transition-colors hover:border-foreground/30 ${
                pkg.featured ? "border-foreground/40" : "border-foreground/10"
              }`}
            >
              {pkg.featured && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-foreground/30 bg-background px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                  <Sparkles className="h-3 w-3" /> Most popular
                </div>
              )}
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 mb-2">From</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl md:text-4xl font-bold">{pkg.price}</div>
                {pkg.rrp && <div className="text-xs text-foreground/40 line-through">RRP {pkg.rrp}</div>}
              </div>
              <div className="text-xs text-foreground/60 mt-1">{pkg.billing}</div>

              <h2 className="mt-5 text-xl font-semibold">{pkg.name}</h2>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{pkg.tagline}</p>

              <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                {pkg.deliverables.slice(0, 4).map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/50" />
                    {d}
                  </li>
                ))}
              </ul>

              <Link
                to={`/packages/${pkg.slug}`}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-foreground/20 bg-foreground text-background px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.98]"
              >
                View package <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
