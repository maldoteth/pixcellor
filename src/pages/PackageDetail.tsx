import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Sparkles, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { PACKAGE_DETAILS, type PackageDetail, type PackageCta } from "@/data/packages";

const SITE_ORIGIN = "https://pixcellor.com";

function dispatchCta(action: PackageCta) {
  setTimeout(() => {
    if (action === "sales") {
      window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "sales" } }));
    } else if (action === "buy" || action === "packages") {
      window.dispatchEvent(new CustomEvent("pixcellor:open-packages"));
    }
  }, 60);
}

function CtaButton({
  label,
  action,
  variant = "primary",
}: {
  label: string;
  action: PackageCta;
  variant?: "primary" | "secondary";
}) {
  if (variant === "primary") {
    return (
      <Button
        variant="pricing"
        onClick={() => dispatchCta(action)}
        className="h-auto px-6 py-3 text-sm font-semibold uppercase tracking-wider"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => dispatchCta(action)}
      className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.98] border border-foreground/20 bg-background/30 text-foreground backdrop-blur-md hover:bg-background/50"
    >
      {label}
    </button>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" } as const,
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

function JsonLd({ pkg }: { pkg: PackageDetail }) {
  const data = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Pixcellor ${pkg.name}`,
      description: pkg.blurb,
      brand: { "@type": "Brand", name: "Pixcellor" },
      offers: {
        "@type": "Offer",
        price: pkg.price.replace(/[^0-9.]/g, ""),
        priceCurrency: "GBP",
        url: `${SITE_ORIGIN}/packages/${pkg.slug}`,
        availability: "https://schema.org/InStock",
      },
    }),
    [pkg],
  );

  const faqLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: pkg.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    }),
    [pkg],
  );

  useEffect(() => {
    const tag1 = document.createElement("script");
    tag1.type = "application/ld+json";
    tag1.textContent = JSON.stringify(data);
    tag1.setAttribute("data-pkg-ld", pkg.slug);
    document.head.appendChild(tag1);

    const tag2 = document.createElement("script");
    tag2.type = "application/ld+json";
    tag2.textContent = JSON.stringify(faqLd);
    tag2.setAttribute("data-pkg-faq", pkg.slug);
    document.head.appendChild(tag2);

    return () => {
      tag1.remove();
      tag2.remove();
    };
  }, [data, faqLd, pkg.slug]);

  return null;
}

export default function PackageDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const pkg = PACKAGE_DETAILS[slug];

  useEffect(() => {
    if (!pkg) navigate("/", { replace: true });
  }, [pkg, navigate]);

  if (!pkg) return null;

  const otherPackages = Object.values(PACKAGE_DETAILS).filter((p) => p.slug !== pkg.slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={`${pkg.name} — ${pkg.price} | Pixcellor`}
        description={pkg.tagline}
        path={`/packages/${pkg.slug}`}
      />
      <JsonLd pkg={pkg} />

      <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-10 md:py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-foreground/60">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-foreground">Home</Link>
            </li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li>
              <button
                type="button"
                onClick={() => dispatchCta("packages")}
                className="hover:text-foreground"
              >
                Packages
              </button>
            </li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-foreground/90">{pkg.name}</li>
          </ol>
        </nav>

        {/* HERO */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16">
          {pkg.featured && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Most popular</span>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            {pkg.name}
          </h1>
          <p className="mt-3 text-base md:text-xl text-foreground/70 max-w-3xl">{pkg.tagline}</p>
          <p className="mt-6 text-sm md:text-base text-foreground/80 max-w-3xl leading-relaxed">
            {pkg.blurb}
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 mb-1">From</div>
              <div className="text-4xl md:text-5xl font-bold">{pkg.price}</div>
              <div className="text-xs text-foreground/60 mt-1">{pkg.billing}</div>
            </div>
            {pkg.rrp && (
              <div className="text-sm text-foreground/50 line-through">RRP {pkg.rrp}</div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaButton label={pkg.primaryCta.label} action={pkg.primaryCta.action} />
            {pkg.secondaryCta && (
              <CtaButton label={pkg.secondaryCta.label} action={pkg.secondaryCta.action} variant="secondary" />
            )}
          </div>

          {/* Trust strip */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3 border-t border-foreground/10 pt-6">
            {[
              { icon: ShieldCheck, label: "Lifetime warranty" },
              { icon: Zap, label: "Fast delivery" },
              { icon: Check, label: "You own everything" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-foreground/80">
                <Icon className="h-4 w-4 text-foreground/60" />
                {label}
              </div>
            ))}
          </div>
        </motion.section>

        {/* WHAT'S INCLUDED */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16">
          <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">
            Everything included
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pkg.includes.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-md"
              >
                <h3 className="text-sm font-semibold mb-3">{group.title}</h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* DELIVERABLES + BEST FOR */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur-md">
            <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-4">Deliverables</h2>
            <ul className="space-y-2">
              {pkg.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-foreground/85">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur-md">
            <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-4">Best for</h2>
            <ul className="space-y-2">
              {pkg.bestFor.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-foreground/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* PROCESS */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16">
          <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">How it works</h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {pkg.process.map((p, i) => (
              <li
                key={p}
                className="flex items-start gap-4 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-md"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/10 text-[12px] font-bold">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-foreground/90">{p}</span>
              </li>
            ))}
          </ol>
        </motion.section>

        {/* FAQ */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16">
          <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">FAQ</h2>
          <div className="space-y-3">
            {pkg.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-md"
              >
                <summary className="flex cursor-pointer items-center gap-3 text-sm font-semibold list-none">
                  <HelpCircle className="h-4 w-4 text-foreground/60" />
                  <span className="flex-1">{f.q}</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{f.a}</p>
              </details>
            ))}
          </div>
        </motion.section>

        {/* COMPARE OTHER PACKAGES */}
        <motion.section {...fadeUp} className="mb-12 md:mb-16">
          <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">Compare packages</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherPackages.map((p) => (
              <Link
                key={p.slug}
                to={`/packages/${p.slug}`}
                className="group rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur-md transition-all hover:bg-foreground/[0.06] hover:border-foreground/20"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-foreground/50 mb-2">{p.billing}</div>
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="mt-1 text-2xl font-bold">{p.price}</div>
                <p className="mt-2 text-xs text-foreground/65 line-clamp-2">{p.tagline}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-foreground/80 group-hover:text-foreground">
                  View details <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* FOOTER CTA */}
        <motion.section
          {...fadeUp}
          className="relative overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.04] p-6 md:p-10 text-center backdrop-blur-md"
        >
          <h3 className="text-xl md:text-2xl font-bold">Ready to start with {pkg.name}?</h3>
          <p className="mt-2 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">{pkg.blurb}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <CtaButton label={pkg.primaryCta.label} action={pkg.primaryCta.action} />
            {pkg.secondaryCta && (
              <CtaButton label={pkg.secondaryCta.label} action={pkg.secondaryCta.action} variant="secondary" />
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
