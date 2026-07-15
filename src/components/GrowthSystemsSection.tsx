"use client";

import { ArrowUpRight, Bot, PhoneCall, Search, Share2 } from "lucide-react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

interface GrowthSystemsSectionProps {
  progress: MotionValue<number>;
}

const systems = [
  {
    icon: Bot,
    title: "Stay ahead of the AI curve",
    description:
      "Every package includes a cutting-edge smart site that keeps improving through its own custom AI agents.",
    capabilities: ["Smart site included", "Custom AI agents", "Built to evolve"],
  },
  {
    icon: PhoneCall,
    title: "Never miss the next customer",
    description:
      "AI phone sales, booking and email lead generation convert more demand. Lead forensics reveals which companies are visiting.",
    capabilities: ["AI sales calls", "Booking agent", "Visitor identification"],
  },
  {
    icon: Search,
    title: "Own search. Become the answer.",
    description:
      "Fine-tuned SEO and AEO help you rank locally, win valuable keywords and appear in AI-generated answers.",
    capabilities: ["Local SEO", "Keyword strategy", "AI visibility"],
  },
  {
    icon: Share2,
    title: "Turn attention into momentum",
    description:
      "Grow reviews and social reach with automated content scheduling and practical, channel-specific growth strategies.",
    capabilities: ["Review growth", "Content scheduling", "Social strategy"],
  },
];

function useReveal(progress: MotionValue<number>, start: number, duration = 0.22) {
  const reduceMotion = useReducedMotion();
  const opacity = useTransform(progress, [start, start + duration], [0, 1]);
  const y = useTransform(progress, [start, start + duration], [32, 0]);
  const scale = useTransform(progress, [start, start + duration], [0.97, 1]);

  return reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity, y, scale };
}

function GrowthSystemRow({
  system,
  progress,
  start,
  rightColumn,
}: {
  system: (typeof systems)[number];
  progress: MotionValue<number>;
  start: number;
  rightColumn: boolean;
}) {
  const reveal = useReveal(progress, start);
  const Icon = system.icon;

  return (
    <motion.article
      className={[
        "group relative grid grid-cols-[2rem_1fr] gap-2 border-b border-white/15 py-2.5 text-left sm:grid-cols-[2.5rem_1fr] sm:gap-3 sm:py-3.5 md:min-h-[8.75rem] md:px-5 md:py-4",
        rightColumn ? "" : "md:border-r",
      ].join(" ")}
      style={reveal}
    >
      <Icon
        className="mt-0.5 h-4 w-4 text-white/42 transition-colors duration-300 group-hover:text-white"
        strokeWidth={1.5}
      />

      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-[-0.015em] text-white sm:text-base md:text-lg">
          {system.title}
        </h3>
        <p className="mt-1 max-w-[31rem] text-[11px] leading-[1.35] text-white/54 sm:text-xs md:text-[13px] md:leading-relaxed">
          {system.description}
        </p>
        <div className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 sm:flex">
          {system.capabilities.map((capability) => (
            <span
              key={capability}
              className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/35"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function GrowthSystemsSection({ progress }: GrowthSystemsSectionProps) {
  const headingReveal = useReveal(progress, 0.02, 0.2);
  const ctaReveal = useReveal(progress, 0.6, 0.2);

  return (
    <section
      aria-labelledby="growth-systems-title"
      className="mx-auto flex h-full w-full max-w-6xl flex-col justify-center px-5 pb-[4.5rem] pt-5 sm:px-8 md:pb-[5.25rem] md:pt-8"
    >
      <motion.header className="mb-3 max-w-3xl text-left md:mb-5" style={headingReveal}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50 md:text-xs">
          Included with every Pixcellor package
        </p>
        <h2
          id="growth-systems-title"
          className="text-[clamp(1.65rem,4.2vw,3.75rem)] font-medium leading-[0.96] tracking-[-0.045em] text-white"
        >
          More than a website.
          <span className="block text-white/45">A system for growth.</span>
        </h2>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/48 md:mt-3 md:text-sm">
          Built to find demand, convert it and keep compounding what works.
        </p>
      </motion.header>

      <div className="grid min-h-0 grid-cols-1 border-t border-white/15 md:grid-cols-2">
        {systems.map((system, index) => (
          <GrowthSystemRow
            key={system.title}
            system={system}
            progress={progress}
            start={0.14 + index * 0.105}
            rightColumn={index % 2 === 1}
          />
        ))}
      </div>

      <motion.div
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:mt-5"
        style={ctaReveal}
      >
        <p className="hidden text-xs text-white/45 sm:block">
          Your next customer is already looking. Make sure they find you.
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("pixcellor:open-packages", { detail: { services: true } }),
              )
            }
            className="pricing-button flex h-9 flex-1 items-center justify-center px-4 text-xs font-semibold text-foreground active:translate-y-px sm:flex-none"
          >
            Explore services
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk"))}
            className="flex h-9 flex-1 items-center justify-center gap-2 border border-foreground bg-foreground px-4 text-xs font-semibold text-background transition-colors hover:bg-foreground/85 active:translate-y-px sm:flex-none"
          >
            Build my growth system
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </motion.div>
    </section>
  );
}
