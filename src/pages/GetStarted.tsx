import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import {
  Check, Loader2, ArrowRight, ArrowLeft, Phone,
  Infinity as InfinityIcon, Gauge, ShieldCheck, Bot, Wrench, Headphones,
  Megaphone, Code2, Briefcase,
} from "lucide-react";
import { Link } from "react-router-dom";

import SeoHead from "@/components/SeoHead";
import { OG_GET_STARTED } from "@/data/ogImages";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import HoneypotField from "@/components/HoneypotField";
import { useAntiSpam } from "@/lib/anti-spam";
import { supabase } from "@/integrations/supabase/client";
import { trackAdsConversion } from "@/lib/ads-tracking";
import CallBookingPicker, { type BookingSelection } from "@/components/CallBookingPicker";
import PackageCompareTable from "@/components/PackageCompareTable";
import { PACKAGE_DETAILS } from "@/data/packages";
import { SERVICES, SERVICE_CATEGORIES, type ServiceCategory } from "@/data/services";

import hays from "@/assets/logos/hays.svg";
import manpower from "@/assets/logos/manpower.svg";
import randstad from "@/assets/logos/randstad.svg";
import its from "@/assets/logos/its.svg";
import bluearrow from "@/assets/logos/bluearrow.svg";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, "Numbers only"),
  brief: z.string().trim().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const TRUST_LOGOS = [
  { src: hays, alt: "Hays" },
  { src: manpower, alt: "Manpower" },
  { src: randstad, alt: "Randstad" },
  { src: its, alt: "ITS" },
  { src: bluearrow, alt: "Blue Arrow" },
];

// Real past clients pulled from services data (telesales + recruitment).
const PAST_CLIENTS = [
  "3M", "Barclays Bank", "Guide Dogs", "NHS",
  "TikTok", "LinkedIn", "Berkeley Homes", "Bupa",
  "Galliford Try", "Morgan Sindall",
];

// Real differentiators, not marketing fluff.
const FEATURES = [
  {
    icon: Gauge,
    title: "5–10 day turnaround",
    body: "Full Works sites ship in 5–10 working days. Elite builds (10 pages, apps, animations) in 10 days. Edits on retainer are 1–3 days.",
  },
  {
    icon: ShieldCheck,
    title: "Lifetime build warranty",
    body: "One-off builds carry a lifetime warranty on defects. Retainers cover everything for as long as you're active. Own your code, no lock-in.",
  },
  {
    icon: InfinityIcon,
    title: "Unlimited revisions on Elite",
    body: "Any visual or copy change during the build cycle — no per-edit fees. Growth and Scale retainers ship unlimited edits each month.",
  },
  {
    icon: Bot,
    title: "AI agents built in",
    body: "Custom sales, support and ops agents wired into your CRM, inbox and calendars. Running 24/7 with audit logs and human-in-the-loop checkpoints.",
  },
  {
    icon: Wrench,
    title: "One team, full stack",
    body: "Design, build, hosting, SEO/AEO, payments, automations, ads, branding, video, decks — handled by one senior team. No agency hand-offs.",
  },
  {
    icon: Headphones,
    title: "Real humans, no contracts",
    body: "UK studio. Retainers are cancel-anytime monthly, or save up to £10K/yr annually. Email, chat and WhatsApp support — actual people.",
  },
];

// Pulled live from packages.ts so prices/billing stay in sync.
const ONE_OFFS = ["full-works", "elite"] as const;
const RETAINERS = ["retainer-growth", "retainer-scale", "retainer-enterprise"] as const;

const CATEGORY_META: Record<ServiceCategory, { Icon: typeof Megaphone; blurb: string }> = {
  marketing: { Icon: Megaphone, blurb: "Get found, get cited, get leads." },
  tech: { Icon: Code2, blurb: "Sites, apps and AI built around your business." },
  business: { Icon: Briefcase, blurb: "Ops, hiring and intel without the headcount." },
};

const FAQ = [
  {
    q: "How fast can you launch my site?",
    a: "Fast track sites can be live in hours, generally Full Works sites typically go live 5–10 working days from a signed-off brief. Elite builds (up to 10 pages, animations, apps) are a 10-day turnaround. Retainer edits are 1–3 days; urgent fixes same-day.",
  },
  {
    q: "How much does it cost?",
    a: "One-off builds: Full Works £150 or Elite £500. Retainers: Growth £100/mo, Scale £500/mo, Enterprise £2,500/mo — all cancel-anytime, with up to £10K/yr saved on annual. Add-ons (extra pages, copy, brand kit, migration, 3D hero, multilingual) are fixed price.",
  },
  {
    q: "Do I really own the site?",
    a: "Yes — you own the code, content and domain outright. We can host it for you on our global CDN (free with the build) or hand it over to your developer with logins and docs.",
  },
  {
    q: "What if I don't like the first draft?",
    a: "Full Works includes 1 revision round pre-launch. Elite includes unlimited revisions during the build — any visual or copy change, no per-edit fees. Retainers ship unlimited edits each month.",
  },
  {
    q: "Can you build a full web app or SaaS?",
    a: "Yes. Elite and the Scale/Enterprise retainers cover full-stack: React + TypeScript front-end, Postgres + edge-function back-end, auth, Stripe payments, file storage, real-time, admin dashboards and PWAs. We've shipped CRMs, ATSs, marketplaces and dApps.",
  },
  {
    q: "Can you integrate with Stripe, HubSpot, Salesforce, Twilio, Cal.com, WhatsApp…?",
    a: "Almost certainly yes. REST, GraphQL, webhooks, middleware, queues, retries and monitoring — we plumb your stack so it actually talks to itself. Mention the integrations on the call.",
  },
  {
    q: "Who's actually on my project?",
    a: "Senior UK team only. Operators who've launched products to 9-figure market caps, top-billing recruiters from Hays, Manpower, Randstad, ITS and Blue Arrow, and engineers who've shipped Shopify stores through tens of thousands of launch-day orders and top-300 crypto projects.",
  },
  {
    q: "What about SEO and getting cited by ChatGPT?",
    a: "Elite includes full technical SEO + AEO (Answer Engine Optimisation), JSON-LD schema, llms.txt and AI discoverability. Retainers add ongoing tuning, content briefs, link building and monthly ranking + AI-citation reports.",
  },
];

const GetStarted = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<FormValues>({
    name: "",
    company: "",
    email: "",
    phone: "",
    brief: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [booking, setBooking] = useState<BookingSelection | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedLabel, setConfirmedLabel] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const { honeypotValue, setHoneypotValue, isHuman } = useAntiSpam();

  useEffect(() => {
    // Smooth scroll for in-page anchors
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  // Fetch booked slots for the next 30 days so we can hide them in the picker
  useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 35);
    const url = `https://rkgjkvghejcmostuqkgw.supabase.co/functions/v1/book-call?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.booked)) setBookedSlots(data.booked);
      })
      .catch(() => {});
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onChange = (key: keyof FormValues, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateContact = () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    return true;
  };

  const goToCalendar = () => {
    setBookingError(null);
    if (!validateContact()) return;
    setStep(2);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!validateContact()) {
      setStep(1);
      return;
    }
    if (!booking) {
      setBookingError("Pick a time or a callback preference above.");
      return;
    }
    if (!isHuman()) {
      // Silently "succeed" for bots.
      setDone(true);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-call", {
        body: {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          company: values.company?.trim() || null,
          brief: values.brief?.trim() || null,
          preference: booking.preference,
          scheduled_at: booking.scheduledAt,
          source: "ads_landing",
          hp: honeypotValue,
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === "slot_taken") {
          setBookingError("Sorry — that slot was just taken. Please pick another time.");
          // refresh booked slots
          const from = new Date();
          const to = new Date();
          to.setDate(to.getDate() + 35);
          const url = `https://rkgjkvghejcmostuqkgw.supabase.co/functions/v1/book-call?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
          fetch(url).then((r) => r.json()).then((d) => {
            if (d?.ok) setBookedSlots(d.booked || []);
          }).catch(() => {});
          setBooking(null);
          return;
        }
        throw new Error(data?.error || "unknown_error");
      }

      setConfirmedLabel(data.when_label || data.preference_label || booking.label);
      trackAdsConversion();
      setDone(true);
    } catch (err) {
      console.error("book-call submit failed", err);
      toast.error("Something went wrong — please try again or email hello@pixcellor.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SeoHead
        title="Get Started — AI Websites in 24 Hours | Pixcellor"
        description="Book a free 15-minute call with Pixcellor. AI-powered websites, chatbots and apps for UK businesses. From £299. Live in 24 hours."
        path="/get-started"
        image={OG_GET_STARTED}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "AI Website Design & Build",
            provider: {
              "@type": "Organization",
              name: "Pixcellor",
              url: "https://pixcellor.com",
            },
            areaServed: "United Kingdom",
            offers: {
              "@type": "Offer",
              priceCurrency: "GBP",
              price: "150",
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — pitch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 bg-white/[0.03] text-xs uppercase tracking-[0.2em] text-white/70 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              UK Studio · Booking calls this week
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
              Websites, web apps &amp; AI agents —
              <span className="block text-white/60">built in days, not months.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/70 max-w-xl">
              From a polished Full Works site at <span className="text-white">£150</span>
              to flagship Elite builds with unlimited revisions at <span className="text-white">£500</span>,
              or an always-on retainer from <span className="text-white">£100/mo</span>.
              Book a free 15-minute call and we&apos;ll show you exactly what we&apos;d build.
            </p>

            <ul className="mt-7 space-y-2 text-white/80">
              {[
                "Free 15-min strategy call · no pitch, no obligation",
                "AI-generated preview of your site before you pay",
                "Lifetime warranty on the build · you own the code",
                "Unlimited revisions on Elite & retainers",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {/* Trust logos */}
            <div className="mt-10">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">
                Team alumni &amp; partners
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 opacity-70">
                {TRUST_LOGOS.map((l) => (
                  <img
                    key={l.alt}
                    src={l.src}
                    alt={l.alt}
                    loading="lazy"
                    className="h-6 sm:h-7 w-auto invert"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            ref={formRef}
            id="book"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            {/* Call now — gold accent */}
            <a
              href="tel:01483219430"
              className="group mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-400/15 via-amber-300/10 to-yellow-200/10 px-4 py-3 backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(251,191,36,0.45)] transition-colors hover:border-amber-300/60 hover:bg-amber-400/20"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/25 border border-amber-300/40 text-amber-100">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-amber-200/80">URGENT? CALL US 24/7 365</span>
                  <span className="text-base font-semibold text-amber-50">01483 219430</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-amber-100/80 transition-transform group-hover:translate-x-0.5" />
            </a>

            <div className="backdrop-blur-xl bg-white/[0.04] border border-white/15 p-6 sm:p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]">

              {!done ? (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-semibold">
                        {step === 1 ? "Book your free call" : "Pick a time"}
                      </h2>
                      <p className="text-sm text-white/60 mt-1">
                        {step === 1
                          ? "Tell us who you are — takes 20 seconds."
                          : <>For <span className="text-white">{values.name}</span> · {values.email}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`h-1.5 w-6 rounded-full transition-colors ${step >= 1 ? "bg-white" : "bg-white/20"}`} />
                      <span className={`h-1.5 w-6 rounded-full transition-colors ${step >= 2 ? "bg-white" : "bg-white/20"}`} />
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <HoneypotField value={honeypotValue} onChange={setHoneypotValue} />

                    <div className="relative overflow-hidden">
                      <AnimatePresence mode="wait" initial={false}>
                        {step === 1 ? (
                          <motion.div
                            key="step-1"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="space-y-4"
                          >
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="gs-name" className="text-white/80">Name *</Label>
                                <Input
                                  id="gs-name"
                                  value={values.name}
                                  onChange={(e) => onChange("name", e.target.value)}
                                  className="mt-1.5 bg-black/40 border-white/20 text-white"
                                  autoComplete="name"
                                  required
                                />
                                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                              </div>
                              <div>
                                <Label htmlFor="gs-company" className="text-white/80">Company</Label>
                                <Input
                                  id="gs-company"
                                  value={values.company}
                                  onChange={(e) => onChange("company", e.target.value)}
                                  className="mt-1.5 bg-black/40 border-white/20 text-white"
                                  autoComplete="organization"
                                />
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="gs-email" className="text-white/80">Email *</Label>
                                <Input
                                  id="gs-email"
                                  type="email"
                                  value={values.email}
                                  onChange={(e) => onChange("email", e.target.value)}
                                  className="mt-1.5 bg-black/40 border-white/20 text-white"
                                  autoComplete="email"
                                  required
                                />
                                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                              </div>
                              <div>
                                <Label htmlFor="gs-phone" className="text-white/80">Phone *</Label>
                                <Input
                                  id="gs-phone"
                                  type="tel"
                                  value={values.phone}
                                  onChange={(e) => onChange("phone", e.target.value)}
                                  className="mt-1.5 bg-black/40 border-white/20 text-white"
                                  autoComplete="tel"
                                  required
                                />
                                {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="gs-brief" className="text-white/80">
                                What do you need? <span className="text-white/40">(optional)</span>
                              </Label>
                              <Textarea
                                id="gs-brief"
                                value={values.brief}
                                onChange={(e) => onChange("brief", e.target.value)}
                                rows={3}
                                placeholder="e.g. a booking site for my salon, a quote calculator, an AI chatbot for my store…"
                                className="mt-1.5 bg-black/40 border-white/20 text-white resize-none"
                              />
                            </div>

                            <Button
                              type="button"
                              onClick={goToCalendar}
                              className="w-full h-12 text-base font-medium"
                            >
                              Confirm <ArrowRight className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="step-2"
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -24 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="space-y-4"
                          >
                            <CallBookingPicker
                              bookedSlots={bookedSlots}
                              value={booking}
                              onChange={(v) => { setBooking(v); setBookingError(null); }}
                            />
                            {bookingError && (
                              <p className="text-xs text-red-400">{bookingError}</p>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(1)}
                                disabled={submitting}
                                className="sm:w-auto h-12 border-white/20 text-white hover:bg-white/10"
                              >
                                <ArrowLeft className="w-4 h-4" /> Back
                              </Button>
                              <Button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 h-12 text-base font-medium"
                              >
                                {submitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Booking…
                                  </>
                                ) : (
                                  <>
                                    Confirm my call <ArrowRight className="w-4 h-4" />
                                  </>
                                )}
                              </Button>
                            </div>

                            <p className="text-[11px] text-white/40 text-center">
                              You&apos;ll get an instant email confirmation. By submitting you agree to be contacted by Pixcellor about your enquiry.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </form>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mx-auto mb-5">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-semibold">You&apos;re booked in.</h2>
                  <p className="mt-2 text-white/70">
                    {confirmedLabel
                      ? <>We&apos;ll call you on <span className="text-white">{confirmedLabel}</span>. A confirmation is on its way to your inbox.</>
                      : <>We&apos;ll be in touch shortly. A confirmation is on its way to your inbox.</>}
                  </p>
                  <div className="mt-5 mx-auto max-w-md rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-left">
                    <p className="text-[13px] text-amber-100/90 leading-snug">
                      <span className="font-semibold">📬 Don&apos;t see it?</span>{" "}
                      Check your <span className="font-medium">spam / junk folder</span> for an email from{" "}
                      <span className="font-mono text-amber-200">pixcellor.com</span> and mark it as &ldquo;Not Junk&rdquo; so future ones land in your inbox.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/portfolio">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        See our portfolio
                      </Button>
                    </Link>
                    <Link to="/packages">
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        Browse packages
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES — real differentiators */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Why Pixcellor</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
              One senior team. Every discipline. Fixed prices.
            </h2>
            <p className="mt-3 text-white/60 text-sm sm:text-base">
              We replace the agency, the freelance roster and the SaaS bill — with one team that designs, builds, hosts, integrates and runs it.
            </p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6"
              >
                <f.icon className="w-6 h-6 text-white" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DO — services by category */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">What we do</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
              {SERVICES.length}+ services across marketing, tech &amp; business
            </h2>
            <p className="mt-3 text-white/60 text-sm sm:text-base">
              Mention any of these on the call — odds are it&apos;s already in-house.
            </p>
          </div>

          <div className="mt-10 grid lg:grid-cols-3 gap-5">
            {(Object.keys(SERVICE_CATEGORIES) as ServiceCategory[]).map((cat) => {
              const meta = SERVICE_CATEGORIES[cat];
              const items = SERVICES.filter((s) => s.category === cat);
              const { Icon, blurb } = CATEGORY_META[cat];
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className="backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">{meta.title}</h3>
                      <p className="text-[12px] text-white/55">{blurb}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2">
                    {items.map((s) => (
                      <li key={s.slug} className="flex items-start gap-2 text-sm text-white/80">
                        <Check className="w-4 h-4 text-white/40 mt-0.5 shrink-0" aria-hidden />
                        <Link
                          to={`/services/${s.slug}`}
                          className="hover:text-white transition-colors"
                        >
                          {s.name}
                          {s.pricing ? (
                            <span className="text-white/40"> · {s.pricing.split(" — ")[0]}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link to="/services">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Browse all services <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST — real past clients */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Trusted by</p>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
            Brands our team has shipped for
          </h2>
          <p className="mt-3 text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            Operators behind 9-figure market caps, top-300 crypto launches, Shopify stores doing tens of thousands of launch-day orders, and top-billing recruiters from the world&apos;s biggest agencies.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {PAST_CLIENTS.map((c) => (
              <span
                key={c}
                className="px-4 py-2 border border-white/15 bg-white/[0.03] text-sm text-white/80 backdrop-blur"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — real packages */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/40">Packages</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">
              Fixed prices. Lifetime warranty. No contracts.
            </h2>
            <p className="mt-3 text-white/60 text-sm sm:text-base">
              Two one-off builds and three retainers. Everything below is the real list price — no upsells on the call.
            </p>
          </div>

          {/* One-off packages */}
          <div className="mt-10 grid md:grid-cols-2 gap-5">
            {ONE_OFFS.map((slug) => {
              const p = PACKAGE_DETAILS[slug];
              return (
                <motion.div
                  key={slug}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  className={`relative backdrop-blur-xl border p-6 sm:p-8 ${
                    p.featured ? "bg-white/[0.06] border-white/30" : "bg-white/[0.03] border-white/10"
                  }`}
                >
                  {p.featured && (
                    <span className="absolute -top-3 left-6 text-[10px] uppercase tracking-[0.18em] bg-white text-black px-2 py-1">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-semibold">{p.name}</h3>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">One-off</span>
                  </div>
                  <p className="mt-2 text-sm text-white/65">{p.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-3">
                    <span className="text-4xl font-semibold">{p.price}</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mt-1">{p.billing}</p>
                  <ul className="mt-5 space-y-2 text-sm text-white/80">
                    {p.includes[0].items.slice(0, 5).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={`/packages/${slug}`} className="mt-6 inline-block">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      See {p.name} details <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Retainers */}
          <div className="mt-6 grid md:grid-cols-3 gap-5">
            {RETAINERS.map((slug) => {
              const p = PACKAGE_DETAILS[slug];
              return (
                <div
                  key={slug}
                  className="backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6"
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Retainer</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">{p.price}</span>
                    {p.yearlySavings && (
                      <span className="text-[11px] text-emerald-400">{p.yearlySavings}</span>
                    )}
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mt-1">{p.billing}</p>
                  <p className="mt-3 text-sm text-white/65 leading-relaxed">{p.tagline}</p>
                  <Link
                    to={`/packages/${slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-white/80 hover:text-white"
                  >
                    Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Full comparison table */}
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-lg font-semibold">Full comparison</h3>
              <Link to="/packages" className="text-xs uppercase tracking-wider text-white/60 hover:text-white">
                Full packages page <ArrowRight className="w-3 h-3 inline" />
              </Link>
            </div>
            <PackageCompareTable />
          </div>
        </div>
      </section>



      {/* FAQ */}
      <section className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-8">
            {FAQ.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-white/10">
                <AccordionTrigger className="text-left text-white hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/70">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section>
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold">Ready when you are.</h2>
          <p className="mt-3 text-white/65 max-w-xl mx-auto">
            Book a free 15-minute call. No pitch — just an honest look at what we&apos;d build for you.
          </p>
          <div className="mt-8">
            <Button onClick={scrollToForm} className="h-12 px-8 text-base">
              Book my free call <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Sticky mobile CTA */}
      {!done && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-black/85 backdrop-blur border-t border-white/10 p-3">
          <Button onClick={scrollToForm} className="w-full h-11">
            Book my free call <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default GetStarted;
