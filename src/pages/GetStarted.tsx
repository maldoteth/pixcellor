import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import SeoHead from "@/components/SeoHead";
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

const FEATURES = [
  {
    icon: Zap,
    title: "Live in 24 hours",
    body: "Most sites are designed, built and deployed within a single working day.",
  },
  {
    icon: Sparkles,
    title: "AI-powered, custom built",
    body: "Bespoke design powered by AI — chatbots, booking, payments, automations built in.",
  },
  {
    icon: ShieldCheck,
    title: "UK studio, no contracts",
    body: "From £299. Own your code. Cancel anytime. Real humans on email and WhatsApp.",
  },
];

const FAQ = [
  {
    q: "How fast can you launch my site?",
    a: "Most projects go live within 24 hours of brief approval. Larger builds (e-commerce, custom web apps) take 3–7 days.",
  },
  {
    q: "How much does it cost?",
    a: "Sites start at £299 for a polished one-page launch. Multi-page sites, booking, and AI chat add-ons are quoted on the call — see our packages page for full pricing.",
  },
  {
    q: "Do I own the site?",
    a: "Yes. You own the code, content and domain outright. We can host it for you or hand it over to your developer.",
  },
  {
    q: "What if I don't like the first draft?",
    a: "Every package includes unlimited revisions until you're happy. If we can't deliver something you love, you don't pay.",
  },
  {
    q: "Can you integrate with X (Stripe, CRMs, Calendly…)?",
    a: "Almost certainly yes. We've integrated Stripe, HubSpot, Salesforce, Twilio, Calendly, WhatsApp and dozens of others. Mention it on the call.",
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof FormValues;
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
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
              price: "299",
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
              AI websites, chatbots &amp; apps —
              <span className="block text-white/60">live in 24 hours.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/70 max-w-xl">
              Bespoke sites that book, sell and reply for you. From £299. Real designers, AI-accelerated.
              Book a free 15-minute call and we&apos;ll show you exactly what we&apos;d build.
            </p>

            <ul className="mt-7 space-y-2 text-white/80">
              {[
                "Free 15-min strategy call",
                "AI-generated preview of your site before you pay",
                "Unlimited revisions until you're happy",
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
            <div className="backdrop-blur-xl bg-white/[0.04] border border-white/15 p-6 sm:p-8 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]">
              {!done ? (
                <>
                  <h2 className="text-xl sm:text-2xl font-semibold">Book your free call</h2>
                  <p className="text-sm text-white/60 mt-1">
                    We&apos;ll be in touch within 1 working hour.
                  </p>

                  <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                    <HoneypotField value={honeypotValue} onChange={setHoneypotValue} />

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

                    {/* iOS-style calendar booking */}
                    <div className="pt-2 border-t border-white/10">
                      <CallBookingPicker
                        bookedSlots={bookedSlots}
                        value={booking}
                        onChange={(v) => { setBooking(v); setBookingError(null); }}
                      />
                      {bookingError && (
                        <p className="mt-2 text-xs text-red-400">{bookingError}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base font-medium"
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

                    <p className="text-[11px] text-white/40 text-center">
                      You&apos;ll get an instant email confirmation. By submitting you agree to be contacted by Pixcellor about your enquiry.
                    </p>
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

      {/* FEATURES */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center max-w-2xl mx-auto">
            Why founders pick Pixcellor over an agency
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
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

      {/* SOCIAL PROOF QUOTES */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center">
            What clients say
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {[
              {
                q: "Live in under 24 hours. Bookings started the same week.",
                a: "Sarah M.",
                r: "Salon owner, Manchester",
              },
              {
                q: "Looks better than the £8k quote we got from an agency.",
                a: "James R.",
                r: "Founder, B2B SaaS",
              },
              {
                q: "The AI chatbot replies to leads while I sleep. Game changer.",
                a: "Priya K.",
                r: "Consultant, London",
              },
            ].map((t, i) => (
              <motion.blockquote
                key={t.a}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6"
              >
                <p className="text-white/90 text-base leading-relaxed">&ldquo;{t.q}&rdquo;</p>
                <footer className="mt-4 text-sm text-white/60">
                  <span className="text-white/90">{t.a}</span> · {t.r}
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold">Simple, fixed pricing</h2>
          <p className="mt-3 text-white/65 max-w-xl mx-auto">
            From quick launches to full-stack web apps — fixed-price packages with no surprises.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-5 text-left">
            {[
              { name: "Launch", price: "£299", desc: "Polished one-page site, live in 24 hours." },
              { name: "Full Works", price: "£999", desc: "Multi-page site, booking, payments, AI chat." },
              { name: "Elite Build", price: "£2,499+", desc: "Custom web app, integrations, automations." },
            ].map((p) => (
              <div
                key={p.name}
                className="backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6"
              >
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-semibold">{p.price}</p>
                <p className="mt-3 text-sm text-white/65">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link to="/packages">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                See all packages <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
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
