import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { SERVICE_CATEGORIES, type Service, type ServiceCtaAction } from "@/data/services";
import { Button } from "@/components/ui/button";
import { SERVICE_IMAGES } from "@/assets/services";

function dispatchCta(action: ServiceCtaAction) {
  if (action === "request") {
    window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "request" } }));
  } else if (action === "sales") {
    window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "sales" } }));
  } else if (action === "pricing") {
    window.dispatchEvent(new CustomEvent("pixcellor:open-packages"));
  }
}

function CtaButton({
  label,
  action,
  variant = "primary",
}: {
  label: string;
  action: ServiceCtaAction;
  variant?: "primary" | "secondary";
}) {
  if (variant === "primary") {
    return (
      <Button
        variant="goldPricing"
        onClick={() => dispatchCta(action)}
        className="h-auto px-5 py-3 text-sm font-semibold uppercase tracking-wider"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => dispatchCta(action)}
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
}: {
  service: Service;
  showPermalink?: boolean;
}) {
  const cat = SERVICE_CATEGORIES[service.category];
  const Icon = cat.icon;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 md:px-10 md:py-14 text-foreground">
      {/* HERO */}
      <motion.section {...fadeUp} className="mb-12 md:mb-16">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/80">
          <Icon className="h-3.5 w-3.5" />
          <span>{cat.title}</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
          {service.name}
        </h1>
        <p className="mt-3 text-base md:text-xl text-foreground/70 max-w-3xl">{service.tagline}</p>
        <p className="mt-6 text-sm md:text-base text-foreground/80 max-w-3xl leading-relaxed">
          {service.heroBlurb}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} />
          {service.secondaryCta && (
            <CtaButton
              label={service.secondaryCta.label}
              action={service.secondaryCta.action}
              variant="secondary"
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
            <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} />
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
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #f5e6a8 0%, #d4af37 50%, #8a6a1f 100%)",
                  color: "#1a1205",
                }}
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
        className="rounded-xl border border-foreground/15 bg-foreground/[0.04] p-6 md:p-10 text-center backdrop-blur-md"
      >
        <h3 className="text-xl md:text-2xl font-bold">Ready to get started?</h3>
        <p className="mt-2 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">
          {service.heroBlurb}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <CtaButton label={service.primaryCta.label} action={service.primaryCta.action} />
          {service.secondaryCta && (
            <CtaButton
              label={service.secondaryCta.label}
              action={service.secondaryCta.action}
              variant="secondary"
            />
          )}
        </div>
      </motion.section>
    </div>
  );
}
