import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, MessageSquare, Globe2, Bot, Loader2, ArrowRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SeoHead from "@/components/SeoHead";
import CreateSiteWizard from "@/components/byow/CreateSiteWizard";

const TIERS = [
  {
    key: "care" as const,
    name: "Growth",
    price: "£100",
    per: "/month",
    prompts: 25,
    blurb: "Light upkeep, copy tweaks & monthly polish.",
    features: [
      "25 prompt edits / mo",
      "250 AI lead-gen runs / mo",
      "Managed hosting & SSL",
      "Export to any host",
      "Whitelabel delivery",
      "24h human turnaround",
    ],
  },
  {
    key: "studio" as const,
    name: "Scale",
    price: "£500",
    per: "/month",
    prompts: 180,
    blurb: "Active iteration — perfect for a live, growing site.",
    features: [
      "180 prompt edits / mo",
      "1,000 AI lead-gen runs / mo",
      "Safe + full mode edits",
      "Priority queue",
      "Export to any host",
      "Whitelabel delivery",
      "SEO & AEO tune-ups",
    ],
    featured: true,
  },
  {
    key: "agency" as const,
    name: "Enterprise",
    price: "£2,500",
    per: "/month",
    prompts: 1000,
    blurb: "Full delegated build pipeline for serious operators.",
    features: [
      "1,000 prompt edits / mo",
      "10,000 AI lead-gen runs / mo",
      "Same-day delivery",
      "Dedicated builder",
      "Export to any host",
      "Whitelabel delivery",
      "Custom integrations",
      "Strategy calls",
    ],
  },
];

const TOPUPS = [
  { key: "single" as const, label: "Single prompt", price: "£2", per: "each", rate: "£2.00 / prompt" },
  { key: "pack100" as const, label: "100 prompt pack", price: "£169", per: "one-off", rate: "£1.69 / prompt", featured: true },
  { key: "pack1000" as const, label: "1,000 prompt pack", price: "£1,250", per: "one-off", rate: "£1.25 / prompt" },
];




const BENEFITS = [
  { icon: Zap, title: "24-hour delivery", text: "Real humans iterating on your site every business day — no DIY drag-and-drop." },
  { icon: Globe2, title: "Managed hosting", text: "Hosting, SSL, custom domain, performance, and uptime — handled, included. Export to any host any time." },
  { icon: Bot, title: "AI lead-gen chatbot", text: "Trained on your business. Captures, qualifies and books leads while you sleep." },
  { icon: MessageSquare, title: "One chat workspace", text: "Every edit lives in one thread. No more chasing devs across emails." },
];

const FAQ = [
  { q: "How fast do edits ship?", a: "Same business day for Scale and Enterprise plans. Growth plan edits ship within 48 hours." },
  { q: "What counts as one prompt?", a: "One discrete change request — \"swap the hero image\", \"add a pricing FAQ\", \"connect Stripe\". Multi-part requests are usually still one prompt." },
  { q: "Do I own my site?", a: "Yes. Your site, your domain, your content. Export to any host or cancel any time — we hand everything over." },
  { q: "Can I bring an existing site?", a: "Yes. We migrate it onto our managed stack for free on first sign-up." },
  { q: "What about backend / Stripe / databases?", a: "Scale and Enterprise plans include integrations: Stripe, mailing lists, booking, CRMs, dashboards, AI agents." },
  { q: "Is there a contract?", a: "No. Month-to-month, cancel any time, no exit fees." },
];

export default function ByowLanding() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [siteName, setSiteName] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const startCheckout = async (kind: "subscription" | "topup", key: string) => {
    if (!email.trim() || !siteName.trim()) {
      toast.error("Add your email and a site name to start.");
      document.getElementById("byow-signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setLoadingKey(`${kind}:${key}`);
    try {
      const { data, error } = await supabase.functions.invoke("byow-create-checkout", {
        body: {
          kind,
          key,
          lander: true,
          email: email.trim().toLowerCase(),
          display_name: siteName.trim(),
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Couldn't start checkout");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <>
      <SeoHead
        title="Build your own website — managed by Pixcellor™"
        description="Pick a plan, chat your changes, watch us ship them in hours. Managed hosting, AI lead-gen, and human builders. From £100/month."
        path="/byow"
      />
      <main className="min-h-screen bg-black text-white">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)] pointer-events-none" />
          <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 mb-6">
                <Sparkles className="h-3 w-3" /> Pixcellor™ · Build your own
              </div>
              <h1 className="text-4xl md:text-6xl font-light tracking-tight leading-[1.05]">
                BUILD YOUR
                <br />
                <span className="text-white/60">OWN SITE</span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-white/60 max-w-xl leading-relaxed">
                Skip the agency back-and-forth. Pick a plan, brief us in chat, and watch real humans ship every change to your live site — usually same-day.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="request-shimmer bg-white text-black hover:bg-white h-12 px-6 text-sm">
                  <a href="#pricing">See pricing <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-6 text-sm">
                  <a href="#create">Create yours free</a>
                </Button>
              </div>
              <p className="mt-5 text-xs text-white/40">
                Already a client? <Link to="/customer-login" className="underline hover:text-white">Sign in</Link>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-1 shadow-2xl"
            >
              <div className="rounded-xl bg-black/60 overflow-hidden">
                <div className="border-b border-white/10 px-4 py-2.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Your site · live
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { role: "user", text: "Change the hero headline to 'Better takeaway, faster'." },
                    { role: "ai", text: "On it — shipping now. Should be live in ~20 minutes." },
                    { role: "user", text: "Add an online booking section under pricing." },
                    { role: "ai", text: "Adding a Calendly-style booking block. I'll wire it up to your calendar — confirm the email?" },
                  ].map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.15 }}
                      className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                    >
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "user" ? "bg-white text-black" : "bg-white/5 border border-white/10 text-white/90"
                      }`}>
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Create your site (wizard) */}
        <section id="create" className="border-b border-white/10">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 mb-4">
                <Sparkles className="h-3 w-3" /> Free preview · no signup
              </div>
              <h2 className="text-3xl md:text-4xl font-light">Create your site</h2>
              <p className="text-white/50 mt-2 text-sm">Brief, brand, generate. You'll get a live preview URL in under a minute.</p>
            </div>
            <CreateSiteWizard />
          </div>
        </section>

        {/* Benefits */}
        <section className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl md:text-4xl font-light text-center">What's included</h2>
            <p className="text-center text-white/50 mt-2 text-sm">Every plan — no add-on surprise fees.</p>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BENEFITS.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-white/20 transition-colors"
                >
                  <b.icon className="h-5 w-5 text-white/80" />
                  <div className="text-base font-medium mt-4">{b.title}</div>
                  <p className="text-sm text-white/55 mt-2 leading-relaxed">{b.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Signup + Pricing */}
        <section id="pricing" className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl md:text-4xl font-light text-center">Pick your plan</h2>
            <p className="text-center text-white/50 mt-2 text-sm">All plans include hosting, edits, support and analytics.</p>

            {/* Signup */}
            <div id="byow-signup" className="mt-10 max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
              <div className="text-xs uppercase tracking-wider text-white/50 mb-3">Start in 60 seconds</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                />
                <Input
                  type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Site name (e.g. Acme Bakery)"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>
              <p className="mt-3 text-[11px] text-white/40">
                We'll create your account and email you a magic link to your portal after checkout. No password to manage.
              </p>
            </div>

            {/* Tier cards */}
            <div className="mt-10 grid md:grid-cols-3 gap-4">
              {TIERS.map((t) => (
                <motion.div
                  key={t.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    t.featured ? "border-white/40 bg-white/[0.06] shadow-2xl" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  {t.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most popular
                    </div>
                  )}
                  <div className="text-sm uppercase tracking-wider text-white/60">{t.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-light">{t.price}</span>
                    <span className="text-sm text-white/40">{t.per}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-1">{t.prompts} prompt edits / month</div>
                  <p className="text-sm text-white/60 mt-3">{t.blurb}</p>
                  <ul className="mt-5 space-y-2 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                        <Check className="h-4 w-4 text-white/70 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => startCheckout("subscription", t.key)}
                    disabled={loadingKey !== null}
                    className={`mt-6 w-full h-11 ${
                      t.featured ? "request-shimmer bg-white text-black hover:bg-white" : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                    }`}
                  >
                    {loadingKey === `subscription:${t.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start ${t.name}`}
                  </Button>
                </motion.div>
              ))}
            </div>

            {/* Top-ups */}
            <div className="mt-12">
              <div className="text-center text-xs uppercase tracking-wider text-white/40 mb-4">
                One-off prompt packs · never expire
              </div>
              <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {TOPUPS.map((p) => (
                  <div
                    key={p.key}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
                      p.featured ? "border-white/30 bg-white/[0.04]" : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-[11px] text-white/50">{p.rate}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-light">{p.price}</div>
                      <button
                        onClick={() => startCheckout("topup", p.key)}
                        disabled={loadingKey !== null}
                        className="text-[10px] uppercase tracking-wider text-white/60 hover:text-white"
                      >
                        {loadingKey === `topup:${p.key}` ? "…" : "Buy →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-white/10">
          <div className="max-w-3xl mx-auto px-6 py-20">
            <h2 className="text-3xl md:text-4xl font-light text-center">FAQ</h2>
            <div className="mt-10 space-y-2">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <button
                    key={f.q}
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full text-left rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{f.q}</span>
                      <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                    {open && <p className="text-sm text-white/60 mt-3 leading-relaxed">{f.a}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="max-w-3xl mx-auto px-6 py-24 text-center">
            <h2 className="text-3xl md:text-5xl font-light tracking-tight">Ready when you are.</h2>
            <p className="mt-4 text-white/60 max-w-xl mx-auto">
              No contracts. No setup fees. One link, one chat, one team that ships every day.
            </p>
            <Button asChild className="mt-8 request-shimmer bg-white text-black hover:bg-white h-12 px-6">
              <a href="#pricing">Start a site <ArrowRight className="ml-2 h-4 w-4" /></a>
            </Button>
          </div>
        </section>

        <footer className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-white/40">
            <div>© Pixcellor™ — Build your own</div>
            <div className="flex gap-4">
              <Link to="/legal/terms" className="hover:text-white">Terms</Link>
              <Link to="/legal/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/get-started" className="hover:text-white">Contact</Link>
              <Link to="/customer-login" className="hover:text-white">Client sign in</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
