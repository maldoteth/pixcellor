import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SERVICE_CATEGORIES, type Service, type ServiceCtaAction } from "@/data/services";
import { Button } from "@/components/ui/button";
import { SERVICE_IMAGES } from "@/assets/services";
import { useIsMobile } from "@/hooks/use-mobile";

// Code-split the heavy WebGL hero banners so the drawer's initial JS payload
// stays small. Each banner only downloads its three.js / shader code when the
// matching service is opened.
const TubesCursor = lazy(() => import("@/components/ui/tubes-cursor"));
const LandingPagesHero = lazy(() => import("@/components/services/LandingPagesHero"));
const FullWebAppsHero = lazy(() => import("@/components/services/FullWebAppsHero"));
const Wave = lazy(() => import("@/components/ui/wave").then((m) => ({ default: m.Wave })));

// Lightweight placeholder shown while a banner chunk is loading.
const BannerFallback = () => <div className="absolute inset-0 bg-black" aria-hidden="true" />;

function dispatchCta(action: ServiceCtaAction, onAction?: () => void) {
  onAction?.();
  // Defer so the closing drawer doesn't swallow the focus / pointer events.
  setTimeout(() => {
    if (action === "request") {
      window.dispatchEvent(new CustomEvent("pixcellor:open-vision"));
    } else if (action === "sales") {
      window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "sales" } }));
    } else if (action === "pricing") {
      window.dispatchEvent(new CustomEvent("pixcellor:open-packages"));
    }
  }, 60);
}

function CtaButton({
  label,
  action,
  variant = "primary",
  onAction,
}: {
  label: string;
  action: ServiceCtaAction;
  variant?: "primary" | "secondary";
  onAction?: () => void;
}) {
  if (variant === "primary") {
    return (
      <Button
        variant="pricing"
        onClick={() => dispatchCta(action, onAction)}
        className="h-auto px-5 py-3 text-sm font-semibold uppercase tracking-wider"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => dispatchCta(action, onAction)}
      className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.98] border border-foreground/20 bg-background/30 text-foreground backdrop-blur-md hover:bg-background/50"
    >
      {label}
    </button>
  );
}


const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export default function ServiceSalesView({
  service,
  showPermalink = false,
  onAction,
}: {
  service: Service;
  showPermalink?: boolean;
  onAction?: () => void;
}) {
  const cat = SERVICE_CATEGORIES[service.category];
  const Icon = cat.icon;
  const heroImage = SERVICE_IMAGES[service.slug];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-10 md:py-14 text-foreground">
      {/* HERO */}
      <motion.section {...fadeUp} className="mb-12 md:mb-16">
        {heroImage && (
          <div className="relative mb-8 overflow-hidden rounded-xl border border-foreground/15 bg-black aspect-[16/9] md:aspect-[21/9] py-0 my-[10px]">
            {service.slug === "animated-sites" ? (
              <TubesCursor />
            ) : service.slug === "full-web-apps" ? (
              <LandingPagesHero />
            ) : service.slug === "landing-pages" ? (
              <FullWebAppsHero />
            ) : service.slug === "ai-integrations-agents" || service.slug === "blockchain-integrations" ? (
              <div className="absolute inset-0 bg-black">
                <Wave />
              </div>
            ) : (
              <img
                src={heroImage}
                alt={`${service.name} — ${service.tagline}`}
                width={1280}
                height={720}
                className="absolute inset-0 h-full w-full object-cover"
                decoding="async"
                loading="lazy"
              />
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"
            />
            <div className="absolute left-5 top-5 md:left-7 md:top-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background/50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/90 backdrop-blur-md">
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.title}</span>
              </div>
            </div>
          </div>
        )}
        {!heroImage && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/80">
            <Icon className="h-3.5 w-3.5" />
            <span>{cat.title}</span>
          </div>
        )}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
          {service.name}
        </h1>
        <p className="mt-3 text-base md:text-xl text-foreground/70 max-w-3xl">{service.tagline}</p>
        <p className="mt-6 text-sm md:text-base text-foreground/80 max-w-3xl leading-relaxed">
          {service.heroBlurb}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} onAction={onAction} />
          {service.secondaryCta && (
            <CtaButton
              label={service.secondaryCta.label}
              action={service.secondaryCta.action}
              variant="secondary"
              onAction={onAction}
            />
          )}
          {showPermalink && (
            <Link
              to={`/services/${service.slug}`}
              target="_blank"
              rel="noopener"
              className="text-xs uppercase tracking-wider text-foreground/60 underline-offset-4 hover:text-foreground hover:underline"
            >
              Open full page ↗
            </Link>
          )}
        </div>

        {service.clients && service.clients.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-foreground/10 pt-5">
            <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/50">
              Trusted by
            </span>
            {service.clients.map((c) => (
              <span
                key={c}
                className="text-sm font-semibold tracking-tight text-foreground/85"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </motion.section>

      {/* PRICING */}
      {service.pricing && (
        <motion.section
          {...fadeUp}
          className="mb-12 rounded-xl border border-foreground/15 bg-foreground/[0.04] p-6 md:p-8 backdrop-blur-md"
        >
          <div className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 mb-2">
            Pricing
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-lg md:text-2xl font-semibold">{service.pricing}</div>
            <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} onAction={onAction} />
          </div>
        </motion.section>
      )}

      {/* FEATURES */}
      <motion.section {...fadeUp} className="mb-12 md:mb-16">
        <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">
          What you get
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {service.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-md"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <span className="text-sm leading-relaxed text-foreground/90">{f}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* PROCESS */}
      <motion.section {...fadeUp} className="mb-12 md:mb-16">
        <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">
          How it works
        </h2>
        <ol className="space-y-3">
          {service.process.map((p, i) => (
            <li
              key={p}
              className="flex items-start gap-4 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 backdrop-blur-md"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-foreground/20 bg-foreground/10 text-[12px] font-bold text-foreground"
              >
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-foreground/90">{p}</span>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* DELIVERABLES */}
      <motion.section {...fadeUp} className="mb-12 md:mb-16">
        <h2 className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-5">
          Deliverables
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {service.deliverables.map((d) => (
            <li
              key={d}
              className="flex items-start gap-3 text-sm leading-relaxed text-foreground/85"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground/60" />
              {d}
            </li>
          ))}
        </ul>
      </motion.section>

      {/* FOOTER CTA */}
      <motion.section
        {...fadeUp}
        className="relative overflow-hidden rounded-xl border border-foreground/15 bg-foreground/[0.04] p-6 md:p-10 text-center backdrop-blur-md"
      >
        {service.slug === "landing-pages" ? (
          <>
            <div className="absolute inset-0 opacity-60">
              <FullWebAppsHero />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"
            />
          </>
        ) : service.slug === "animated-sites" ? (
          <>
            <div className="absolute inset-0 opacity-60">
              <TubesCursor />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"
            />
          </>
        ) : service.slug === "full-web-apps" ? (
          <>
            <div className="absolute inset-0 opacity-60">
              <LandingPagesHero />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"
            />
          </>
        ) : service.slug === "ai-integrations-agents" || service.slug === "blockchain-integrations" ? (
          <>
            <div className="absolute inset-0 bg-black opacity-60">
              <Wave />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"
            />
          </>
        ) : heroImage && (
          <>
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40"
            />
          </>
        )}
        <div className="relative">
          <h3 className="text-xl md:text-2xl font-bold">Ready to get started?</h3>
          <p className="mt-2 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">
            {service.heroBlurb}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} onAction={onAction} />
            {service.secondaryCta && (
              <CtaButton
                label={service.secondaryCta.label}
                action={service.secondaryCta.action}
                variant="secondary"
                onAction={onAction}
              />
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
