"use client";

import {
  ArrowUpRight,
  Bot,
  Building2,
  CalendarCheck,
  Mail,
  MessageCircle,
  PhoneCall,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";

import aiAgentsImage from "@/assets/services/ai-integrations-agents.webp";
import telesalesImage from "@/assets/services/telesales-campaigns.webp";
import seoImage from "@/assets/services/seo-aeo-optimisation.webp";
import socialImage from "@/assets/services/social-media-automation.webp";

interface ServiceSalesStoryProps {
  progress: MotionValue<number>;
}

const SCENE_COUNT = 5;

const stories = [
  {
    label: "Smart sites",
    title: "A website that gets smarter after launch.",
    description:
      "Every package includes custom AI agents that watch performance, find weak points and keep improving the journeys that turn visitors into customers.",
    note: "Included with every Pixcellor package.",
    capabilities: [
      { icon: Bot, label: "Custom agents" },
      { icon: Sparkles, label: "Continuous improvement" },
      { icon: Search, label: "Conversion insight" },
    ],
    image: aiAgentsImage,
    imageAlt: "AI integrations and agent systems",
    imageOnLeft: false,
  },
  {
    label: "Lead capture",
    title: "Turn every enquiry into a conversation.",
    description:
      "AI sales calls, instant booking and email follow-up stop missed calls and dropped traffic from becoming lost revenue.",
    note: "Lead forensics reveals which companies are checking you out before they submit a form.",
    capabilities: [
      { icon: PhoneCall, label: "AI phone sales" },
      { icon: CalendarCheck, label: "Booking agent" },
      { icon: Building2, label: "Company visitor identification" },
    ],
    image: telesalesImage,
    imageAlt: "AI sales calling and lead capture system",
    imageOnLeft: true,
  },
  {
    label: "Search visibility",
    title: "Be found wherever buyers search.",
    description:
      "Fine-tuned SEO and AEO target Google, local search and AI answer engines around the terms that drive real enquiries.",
    note: "Visibility built around commercial intent, not vanity traffic.",
    capabilities: [
      { icon: Search, label: "Local search" },
      { icon: Sparkles, label: "AI answer engines" },
      { icon: Building2, label: "High-intent keywords" },
    ],
    image: seoImage,
    imageAlt: "SEO and answer engine optimisation",
    imageOnLeft: false,
  },
  {
    label: "Reviews and social",
    title: "Stay visible without living online.",
    description:
      "Automated scheduling, review growth and channel-specific campaigns keep your brand active, trusted and moving forward.",
    note: "A consistent presence that compounds instead of consuming your week.",
    capabilities: [
      { icon: Share2, label: "Content scheduling" },
      { icon: MessageCircle, label: "Review growth" },
      { icon: Sparkles, label: "Channel strategy" },
    ],
    image: socialImage,
    imageAlt: "Social media automation and review growth",
    imageOnLeft: true,
  },
];

function getSceneRange(index: number) {
  const anchor = index / SCENE_COUNT;
  const nextAnchor = (index + 1) / SCENE_COUNT;
  return {
    start: index === 0 ? 0 : anchor - 0.025,
    enterEnd: anchor + 0.02,
    exitStart: nextAnchor - 0.025,
    end: Math.min(nextAnchor + 0.02, 1),
  };
}

function useSceneMotion(progress: MotionValue<number>, index: number, last = false) {
  const reduceMotion = useReducedMotion();
  const { start, enterEnd, exitStart, end } = getSceneRange(index);

  const opacity = useTransform(
    progress,
    last ? [start, enterEnd, 1] : [start, enterEnd, exitStart, end],
    last ? [0, 1, 1] : [0, 1, 1, 0],
  );
  const y = useTransform(
    progress,
    last ? [start, enterEnd, 1] : [start, enterEnd, exitStart, end],
    last ? [28, 0, 0] : [28, 0, 0, -22],
  );
  const scale = useTransform(
    progress,
    last ? [start, enterEnd, 1] : [start, enterEnd, exitStart, end],
    last ? [0.985, 1, 1] : [0.985, 1, 1, 0.99],
  );

  return reduceMotion ? { opacity, y: 0, scale: 1 } : { opacity, y, scale };
}

function SalesScene({
  story,
  index,
  progress,
}: {
  story: (typeof stories)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const scene = useSceneMotion(progress, index);
  const { start, enterEnd, exitStart, end } = getSceneRange(index);
  const imageDirection = story.imageOnLeft ? -1 : 1;

  const imageX = useTransform(
    progress,
    [start, enterEnd, exitStart, end],
    [imageDirection * 72, 0, 0, imageDirection * -42],
  );
  const copyX = useTransform(
    progress,
    [start, enterEnd, exitStart, end],
    [imageDirection * -72, 0, 0, imageDirection * 42],
  );

  return (
    <motion.article
      className="pointer-events-none absolute inset-0 grid grid-cols-1 content-center gap-4 overflow-hidden px-5 pb-[4.25rem] pt-[3.25rem] sm:gap-5 sm:px-8 md:grid-cols-12 md:items-center md:gap-10 md:px-12 md:pb-[6.5rem] md:pt-[6.5rem] lg:gap-16 lg:px-[7vw]"
      style={scene}
    >
      <motion.div
        className={[
          "relative h-[28vh] min-h-[9.5rem] overflow-hidden border border-white/15 md:col-span-7 md:h-[min(64vh,44rem)]",
          story.imageOnLeft ? "md:order-1" : "md:order-2",
        ].join(" ")}
        style={{ x: reduceMotion ? 0 : imageX }}
      >
        <img
          src={story.image}
          alt={story.imageAlt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      </motion.div>

      <motion.div
        className={[
          "max-w-xl text-left md:col-span-5",
          story.imageOnLeft ? "md:order-2" : "md:order-1",
        ].join(" ")}
        style={{ x: reduceMotion ? 0 : copyX }}
      >
        <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em] text-white/45 sm:text-xs">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span className="h-px w-8 bg-white/25" aria-hidden="true" />
          <span>{story.label}</span>
        </div>
        <h2 className="text-[clamp(2rem,5.5vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white">
          {story.title}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/62 sm:text-base md:mt-6 md:text-lg">
          {story.description}
        </p>
        <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/38 sm:text-sm">
          {story.note}
        </p>

        <div className="mt-5 border-t border-white/15 md:mt-8">
          {story.capabilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 border-b border-white/10 py-2.5 text-xs text-white/58 sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5 text-white/38" strokeWidth={1.5} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.article>
  );
}

function ContactScene({ progress }: { progress: MotionValue<number> }) {
  const scene = useSceneMotion(progress, 4, true);
  const pointerEvents = useTransform(progress, [0.8, 0.835], ["none", "auto"]);

  const actions = [
    {
      icon: MessageCircle,
      title: "Message the chatbot",
      description: "Talk through your goals now and get pointed in the right direction.",
      onClick: () => window.dispatchEvent(new Event("pixcellor:open-chat")),
    },
    {
      icon: PhoneCall,
      title: "Request a callback",
      description: "Tell us when suits you and we will pick up the conversation.",
      onClick: () => window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk")),
    },
    {
      icon: Mail,
      title: "Submit your details",
      description: "Share the brief in your own time and we will come back with a clear next step.",
      onClick: () => window.location.assign("/get-started"),
    },
  ];

  return (
    <motion.section
      aria-labelledby="sales-contact-title"
      className="absolute inset-0 flex items-center justify-center overflow-hidden px-5 pb-[5.25rem] pt-[4.5rem] sm:px-8 md:pb-[6.5rem] md:pt-[6.5rem]"
      style={{ ...scene, pointerEvents }}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-12 md:items-end md:gap-12">
        <header className="text-left md:col-span-6 md:pb-3">
          <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/45 sm:text-xs">
            Start the conversation
          </p>
          <h2
            id="sales-contact-title"
            className="text-[clamp(2.5rem,6.8vw,7rem)] font-medium leading-[0.88] tracking-[-0.06em] text-white"
          >
            Ready to make your site earn its keep?
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/52 sm:text-base md:mt-7">
            Choose the easiest way to start. We will pick up the conversation from there.
          </p>
        </header>

        <div className="border-t border-white/20 md:col-span-6">
          {actions.map(({ icon: Icon, title, description, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 border-b border-white/15 py-3.5 text-left transition-colors hover:bg-white/[0.04] sm:grid-cols-[2.5rem_1fr_auto] sm:py-5"
            >
              <Icon className="h-4 w-4 text-white/42 transition-colors group-hover:text-white" strokeWidth={1.5} />
              <span>
                <span className="block text-sm font-medium text-white sm:text-base">{title}</span>
                <span className="mt-1 hidden max-w-md text-xs leading-relaxed text-white/42 sm:block">
                  {description}
                </span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-white/32 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default function ServiceSalesStory({ progress }: ServiceSalesStoryProps) {
  return (
    <section aria-label="Pixcellor growth services" className="relative h-full w-full bg-black">
      {stories.map((story, index) => (
        <SalesScene key={story.title} story={story} index={index} progress={progress} />
      ))}
      <ContactScene progress={progress} />
    </section>
  );
}

