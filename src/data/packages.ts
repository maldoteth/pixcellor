// Centralised package detail content for dedicated package pages.
// Each entry powers `/packages/:slug`.

import ogFullWorks from "@/assets/og-full-works.jpg";
import ogElite from "@/assets/og-elite.jpg";
import ogGrowth from "@/assets/og-retainer-growth.jpg";
import ogScale from "@/assets/og-retainer-scale.jpg";
import ogEnterprise from "@/assets/og-retainer-enterprise.jpg";

export type PackageCta = "buy" | "sales" | "packages";

export type PackageTestimonial = {
  quote: string;
  author: string;
  role: string;
  rating: number; // 1-5
};

export type PackageAddOn = {
  name: string;
  price: string;
  note?: string;
};

export type PackageSampleWork = {
  title: string;
  tag: string;
  note: string;
};

export type PackageDetail = {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  price: string;
  rrp?: string;
  billing: string;
  priceId?: string;
  mode?: "payment" | "subscription";
  featured?: boolean;
  includes: { title: string; items: string[] }[];
  deliverables: string[];
  process: string[];
  bestFor: string[];
  faqs: { q: string; a: string }[];
  primaryCta: { label: string; action: PackageCta };
  secondaryCta?: { label: string; action: PackageCta };

  // New: presentation extras
  ogImage?: string;
  // Retainer-only billing toggle
  yearlyPrice?: string;
  yearlyBilling?: string;
  yearlyPriceId?: string;
  yearlySavings?: string;
  // Trust signals
  testimonial?: PackageTestimonial;
  rating?: { value: number; count: number };
  // Sample work cards
  sampleWork?: PackageSampleWork[];
  // Add-ons (extras)
  addOns?: PackageAddOn[];
  // Schedule a call (Cal.com)
  scheduleCallUrl?: string;
  // Hero video (mp4/webm) — 10s loop preview
  heroVideoUrl?: string;
  heroVideoPoster?: string;
};

const DEFAULT_ADDONS: PackageAddOn[] = [
  { name: "Extra page", price: "£50", note: "Beyond included page count" },
  { name: "Professional copywriting", price: "£200", note: "Per page, sales-trained" },
  { name: "Brand kit (logo + identity)", price: "£300", note: "Logo, palette, fonts, guidelines" },
  { name: "Migration from existing site", price: "£150", note: "Content + redirects + SEO equity" },
  { name: "Custom 3D / WebGL hero", price: "£250", note: "Bespoke animated hero scene" },
  { name: "Multilingual (per language)", price: "£100", note: "Full content + SEO per locale" },
];

// Calendly/Cal.com placeholder — swap for real URL when available.
const CAL_URL = "https://cal.com/pixcellor/strategy";

export const PACKAGE_DETAILS: Record<string, PackageDetail> = {
  "full-works": {
    slug: "full-works",
    name: "Full Works",
    tagline: "A professional, fast-loading website — done for you, end-to-end.",
    blurb:
      "The fastest, lowest-risk way to get a polished website live. We design, build, host and maintain it so you can focus on running your business.",
    price: "£150",
    rrp: "£375",
    billing: "One-time payment",
    priceId: "price_1TQzD5BtUjwejeUwG4CFjskt",
    mode: "payment",
    ogImage: ogFullWorks,
    rating: { value: 4.9, count: 132 },
    testimonial: {
      quote:
        "Live in a week, looks better than the £4k quote we had elsewhere. The team handled everything — domain, hosting, the lot.",
      author: "Sarah K.",
      role: "Founder, independent salon",
      rating: 5,
    },
    sampleWork: [
      { title: "Salon brochure site", tag: "3 pages · booking form", note: "Local service business, mobile-first." },
      { title: "Consultant landing", tag: "1 page · lead capture", note: "Single-page site optimised for conversion." },
      { title: "Trades portfolio", tag: "3 pages · gallery", note: "Photo-led showcase with contact CTA." },
    ],
    addOns: DEFAULT_ADDONS,
    includes: [
      {
        title: "Design & Build",
        items: [
          "Up to 3 fully designed pages",
          "Mobile-first responsive layout",
          "Base animations & micro-interactions",
          "Custom branding integration (logo, fonts, palette)",
          "Contact form with email delivery",
          "Stock or AI-generated imagery",
        ],
      },
      {
        title: "Performance & SEO",
        items: [
          "Core Web Vitals tuned (90+ Lighthouse)",
          "On-page SEO basics (titles, meta, sitemap)",
          "Open Graph & social previews",
          "Accessibility-aware semantic HTML",
        ],
      },
      {
        title: "Launch & Aftercare",
        items: [
          "Domain connection & DNS setup",
          "Free hosting on global CDN",
          "SSL certificate included",
          "Lifetime warranty on build defects",
          "Email support",
        ],
      },
    ],
    deliverables: [
      "Live website on your domain",
      "Editable source & ownership",
      "Logins & handover docs",
      "1 round of revisions before launch",
    ],
    process: [
      "Brief — 10-minute discovery call",
      "Design — first preview within 72 hours",
      "Build — revisions and approval",
      "Launch — domain, DNS and go-live",
    ],
    bestFor: [
      "Sole traders and small businesses needing a credible web presence",
      "Anyone replacing a tired, slow or template-looking site",
      "Founders who want it done for them, not DIY",
    ],
    faqs: [
      { q: "How long does it take?", a: "Typically 5–10 working days from brief to launch." },
      { q: "Do I own the site?", a: "Yes — you own the code, content and domain." },
      { q: "What if I need more pages later?", a: "Add pages anytime, or upgrade to Elite for unlimited revisions." },
      { q: "Is hosting really free?", a: "Yes — included for the lifetime of the build on our global CDN." },
    ],
    primaryCta: { label: "Get Full Works", action: "packages" },
    secondaryCta: { label: "Talk to sales", action: "sales" },
  },

  elite: {
    slug: "elite",
    name: "Elite Build",
    tagline: "A flagship, animated site or web app with unlimited revisions.",
    blurb:
      "Our top-tier one-off build. Cinema-grade animations, SEO/AEO baked in, and unlimited revisions until it's exactly what you want. Sites or full web apps.",
    price: "£500",
    rrp: "£1,500",
    billing: "One-time payment",
    priceId: "price_1TJrT7BtUjwejeUwQ47tCkiv",
    mode: "payment",
    featured: true,
    ogImage: ogElite,
    rating: { value: 5.0, count: 78 },
    testimonial: {
      quote:
        "Pixcellor turned a vague idea into a fully working web app in two weeks. Auth, payments, dashboard — the lot. Looks like a £25k build.",
      author: "Marcus T.",
      role: "Founder, SaaS startup",
      rating: 5,
    },
    sampleWork: [
      { title: "Animated brand site", tag: "10 pages · WebGL hero", note: "Scroll-driven 3D, custom illustrations." },
      { title: "SaaS web app MVP", tag: "Auth · DB · Stripe", note: "Full-stack product launched in 10 days." },
      { title: "E-commerce flagship", tag: "Catalog · cart · checkout", note: "Custom storefront with Stripe payments." },
    ],
    addOns: DEFAULT_ADDONS,
    includes: [
      {
        title: "Design & Build",
        items: [
          "Up to 10 fully designed pages",
          "3D / WebGL / scroll-driven animations",
          "Bespoke component system & design tokens",
          "Custom illustrations or AI imagery",
          "Forms, search, filters, integrations",
          "CMS or admin panel if needed",
        ],
      },
      {
        title: "Apps & Integrations",
        items: [
          "Full-stack web app option (auth, DB, payments)",
          "Stripe / payments integration",
          "Email & CRM integrations",
          "Analytics & event tracking",
          "Third-party API connections",
        ],
      },
      {
        title: "SEO & AEO",
        items: [
          "Full technical SEO audit & implementation",
          "Answer Engine Optimisation (AEO) for AI search",
          "Schema/JSON-LD markup",
          "Keyword & competitor research",
          "llms.txt + AI discoverability",
        ],
      },
      {
        title: "Launch & Aftercare",
        items: [
          "10-day delivery turnaround",
          "Unlimited revisions during build",
          "Lifetime warranty on build defects",
          "Hosting, SSL & domain setup",
          "Priority email support",
        ],
      },
    ],
    deliverables: [
      "Live production site / app",
      "Full source code & ownership",
      "Brand & design system handover",
      "Analytics dashboard configured",
      "Documentation & video walkthrough",
    ],
    process: [
      "Discovery — strategy + scoping call",
      "Design — moodboard, prototypes, approval",
      "Build — agile sprints with daily previews",
      "QA — cross-browser, performance, accessibility",
      "Launch — staged rollout + monitoring",
    ],
    bestFor: [
      "Brands wanting a wow-factor flagship presence",
      "Startups launching MVPs or product sites",
      "Businesses replacing multiple tools with a custom app",
    ],
    faqs: [
      { q: "Is it really a 10-day turnaround?", a: "Yes — from approved designs. Complex apps may run longer by mutual agreement." },
      { q: "What does 'unlimited revisions' mean?", a: "Any visual or copy change during the build cycle, no per-edit fees." },
      { q: "Can you build a SaaS?", a: "Yes — Elite covers auth, database, payments, dashboards and more." },
      { q: "Do you migrate from another platform?", a: "Yes — we'll migrate content, redirects and SEO equity." },
    ],
    primaryCta: { label: "Get Elite", action: "packages" },
    secondaryCta: { label: "Talk to sales", action: "sales" },
  },

  "retainer-growth": {
    slug: "retainer-growth",
    name: "Growth Retainer",
    tagline: "Your always-on web team for £100/month.",
    blurb:
      "Everything a small business needs to run online — website with unlimited edits, CRM, hosting, AI bots and analytics — bundled into one predictable monthly fee.",
    price: "£100/mo",
    billing: "Billed monthly · cancel anytime",
    priceId: "price_1TcfyPBtUjwejeUwJmEbSWtN",
    mode: "subscription",
    ogImage: ogGrowth,
    yearlyPrice: "£1,000/yr",
    yearlyBilling: "Billed annually · save £200",
    yearlyPriceId: "price_1Tcg03BtUjwejeUwr7mYzuUb",
    yearlySavings: "Save £200/yr",
    rating: { value: 4.9, count: 64 },
    testimonial: {
      quote:
        "Replaced our developer, our CMS and our support inbox with one £100/month plan. Edits ship same week, no drama.",
      author: "Priya R.",
      role: "Owner, boutique agency",
      rating: 5,
    },
    sampleWork: [
      { title: "Always-on brochure site", tag: "Unlimited edits", note: "Live updates on demand, no developer required." },
      { title: "CRM + lead bot", tag: "AI assistant", note: "Captures and qualifies inbound leads 24/7." },
      { title: "Analytics dashboard", tag: "Monthly report", note: "Traffic, conversions, search visibility." },
    ],
    addOns: DEFAULT_ADDONS,
    includes: [
      {
        title: "Website & Edits",
        items: [
          "Website built and maintained for you",
          "Unlimited content edits & swaps",
          "Lifetime warranty on the build",
          "Performance & uptime monitoring",
        ],
      },
      {
        title: "CRM & Automation",
        items: [
          "Access to our custom CRM",
          "AI lead-generation bot",
          "AI customer-support bot",
          "Email & contact form pipelines",
        ],
      },
      {
        title: "Infrastructure",
        items: [
          "Hosting on global CDN",
          "Custom domain & DNS managed",
          "SSL renewed automatically",
          "Daily backups",
        ],
      },
      {
        title: "Analytics & Reporting",
        items: [
          "Conversion & visitor analytics",
          "Monthly performance summary",
          "Search & traffic insights",
        ],
      },
    ],
    deliverables: [
      "Live, always-up-to-date website",
      "CRM seat & AI bot configured",
      "Monthly performance report",
    ],
    process: [
      "Onboarding — 1 call, kickoff in 48h",
      "Setup — CRM, hosting, bots & analytics live",
      "Run — submit edits anytime, we ship same-week",
      "Review — monthly summary & roadmap",
    ],
    bestFor: [
      "Small businesses that hate maintaining their own site",
      "Founders who want a CRM + site + AI without juggling 5 tools",
      "Anyone tired of £300/hr web agencies",
    ],
    faqs: [
      { q: "How fast are edits turned around?", a: "Typically within 1–3 working days; urgent fixes same-day." },
      { q: "Can I cancel anytime?", a: "Yes — monthly plan is cancel-anytime. Yearly saves £200." },
      { q: "What if I outgrow it?", a: "Upgrade to Scale or Enterprise at any time, prorated." },
    ],
    primaryCta: { label: "Start Growth", action: "packages" },
    secondaryCta: { label: "Talk to sales", action: "sales" },
  },

  "retainer-scale": {
    slug: "retainer-scale",
    name: "Scale Retainer",
    tagline: "A full digital department for growing teams — £500/month.",
    blurb:
      "Everything in Growth plus unlimited users, priority SLA, monthly strategy and the AI agents & automations to scale operations without scaling headcount.",
    price: "£500/mo",
    billing: "Billed monthly · cancel anytime",
    priceId: "price_1Tcg07BtUjwejeUwfGGDhftV",
    mode: "subscription",
    ogImage: ogScale,
    yearlyPrice: "£5,000/yr",
    yearlyBilling: "Billed annually · save £1,000",
    yearlyPriceId: "price_1Tcg0ABtUjwejeUwLc5nw8nX",
    yearlySavings: "Save £1,000/yr",
    scheduleCallUrl: CAL_URL,
    rating: { value: 5.0, count: 41 },
    testimonial: {
      quote:
        "We swapped two SDRs and a part-time dev for Scale. Within a quarter the AI agents booked 3× the meetings at a fraction of the cost.",
      author: "James L.",
      role: "COO, B2B services",
      rating: 5,
    },
    sampleWork: [
      { title: "AI sales agent", tag: "Voice + chat", note: "Books meetings 24/7 directly into the calendar." },
      { title: "Ops automation suite", tag: "Zapier-grade", note: "Document extraction + workflow agents." },
      { title: "Landing page tests", tag: "A/B at speed", note: "Iterate landing variants weekly." },
    ],
    addOns: DEFAULT_ADDONS,
    includes: [
      {
        title: "Everything in Growth, plus",
        items: [
          "Unlimited seats & users on CRM",
          "Unlimited edits & revisions",
          "Priority support 24/7 365",
          "Monthly strategy & roadmap call",
        ],
      },
      {
        title: "AI Agents & Automation",
        items: [
          "Custom AI agents for sales / support / ops",
          "Workflow automations & integrations",
          "Document & data extraction agents",
          "Voice & SMS automation options",
        ],
      },
      {
        title: "Growth Tooling",
        items: [
          "Landing page tests as needed",
          "Email & SMS broadcast tooling",
          "Lead enrichment & visitor intel",
          "Advanced analytics dashboards",
        ],
      },
    ],
    deliverables: [
      "Production-ready site + app + automations",
      "AI agents deployed and monitored",
      "Monthly strategy report & roadmap",
    ],
    process: [
      "Audit — review current stack & ops",
      "Plan — 90-day roadmap with KPIs",
      "Build — weekly sprints + AI agent rollout",
      "Optimise — monthly review against KPIs",
    ],
    bestFor: [
      "Teams of 5–50 running multiple tools",
      "Businesses replacing SDRs / support staff with AI",
      "Companies needing faster shipping than a normal agency",
    ],
    faqs: [
      { q: "Do you replace our developers?", a: "Yes or complement them — we can plug in as squad, lead or backup." },
      { q: "How quickly are AI agents live?", a: "Typically a working agent within 2 weeks of scope sign-off." },
      { q: "Is there a minimum term?", a: "No — monthly is rolling, yearly saves £1,000." },
    ],
    primaryCta: { label: "Start Scale", action: "packages" },
    secondaryCta: { label: "Book a strategy call", action: "sales" },
  },

  "retainer-enterprise": {
    slug: "retainer-enterprise",
    name: "Enterprise Retainer",
    tagline: "Fractional C-suite, dedicated team, MVP sprints — £2,500/month.",
    blurb:
      "The full Pixcellor force on your side. Fractional CTO, CMO and CRO, a dedicated dev & ops squad, 2-week MVP sprints and 24/7 priority support.",
    price: "£2,500/mo",
    billing: "Billed monthly · 30-day notice",
    priceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    mode: "subscription",
    ogImage: ogEnterprise,
    yearlyPrice: "£20,000/yr",
    yearlyBilling: "Billed annually · save £10,000",
    yearlyPriceId: "price_1TSmBtBtUjwejeUwb8xPSvvf",
    yearlySavings: "Save £10,000/yr",
    scheduleCallUrl: CAL_URL,
    rating: { value: 5.0, count: 22 },
    testimonial: {
      quote:
        "Having a fractional CTO and a dedicated squad changed the trajectory of the business. We shipped more in 90 days than the prior year.",
      author: "Elena M.",
      role: "CEO, Series A fintech",
      rating: 5,
    },
    sampleWork: [
      { title: "MVP sprint", tag: "2-week launches", note: "Fully working product every fortnight." },
      { title: "Recruitment ATS", tag: "Custom software", note: "AI-assisted candidate sourcing & pipeline." },
      { title: "Enterprise dashboard", tag: "SSO + RBAC", note: "Multi-region, audit-logged analytics." },
    ],
    addOns: DEFAULT_ADDONS,
    includes: [
      {
        title: "Everything in Scale, plus",
        items: [
          "Fractional CTO, CMO & CRO",
          "Dedicated dev & ops team",
          "2-week MVP sprints",
          "Daily updates & async standups",
          "24/7 priority support",
        ],
      },
      {
        title: "Strategy & Leadership",
        items: [
          "Board / investor-ready reporting",
          "Hiring & team scaling support",
          "Fundraising & GTM advisory",
          "Quarterly board strategy day",
        ],
      },
      {
        title: "Custom Builds",
        items: [
          "Full-stack web apps & SaaS",
          "AI / blockchain / web3 integrations",
          "Recruitment ATS & payroll tooling",
          "Internal tools, dashboards & APIs",
        ],
      },
      {
        title: "Enterprise Infrastructure",
        items: [
          "SSO, RBAC & audit logging",
          "Compliance & security reviews",
          "Multi-region hosting & failover",
          "Dedicated account manager",
        ],
      },
    ],
    deliverables: [
      "Roadmap with quarterly OKRs",
      "Production releases every 2 weeks",
      "Monthly board-ready performance pack",
      "Dedicated Slack / Teams channel",
    ],
    process: [
      "Diagnostic — 2-week deep audit",
      "Strategy — fractional C-suite engaged",
      "Sprint — 2-week MVPs, weekly releases",
      "Scale — quarterly board reviews & resets",
    ],
    bestFor: [
      "Funded startups scaling past £1M ARR",
      "Established businesses needing a tech overhaul",
      "Founders wanting C-level firepower without a £400k payroll",
    ],
    faqs: [
      { q: "Is the team really dedicated?", a: "Yes — a named squad assigned to you, with a swarm of AI agents that automate customer service, sales and more for you." },
      { q: "Can we white-label your team?", a: "Yes — we can operate under your brand for clients or investors." },
      { q: "Notice period?", a: "30 days on monthly; yearly term saves £10,000." },
    ],
    primaryCta: { label: "Start Enterprise", action: "packages" },
    secondaryCta: { label: "Book a strategy call", action: "sales" },
  },
};

export const PACKAGE_SLUGS = Object.keys(PACKAGE_DETAILS);

// Side-by-side spec matrix for the comparison table.
export type ComparisonRow = {
  feature: string;
  values: Record<string, string>; // keyed by slug
};

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Price",
    values: {
      "full-works": "£150 one-off",
      elite: "£500 one-off",
      "retainer-growth": "£100/mo",
      "retainer-scale": "£500/mo",
      "retainer-enterprise": "£2,500/mo",
    },
  },
  {
    feature: "Pages",
    values: {
      "full-works": "Up to 3",
      elite: "Up to 10",
      "retainer-growth": "Unlimited edits",
      "retainer-scale": "Unlimited",
      "retainer-enterprise": "Unlimited + apps",
    },
  },
  {
    feature: "Edits / Revisions",
    values: {
      "full-works": "1 round pre-launch",
      elite: "Unlimited during build",
      "retainer-growth": "Unlimited",
      "retainer-scale": "Unlimited",
      "retainer-enterprise": "Unlimited",
    },
  },
  {
    feature: "SEO / AEO",
    values: {
      "full-works": "On-page basics",
      elite: "Full SEO + AEO",
      "retainer-growth": "Ongoing tuning",
      "retainer-scale": "Ongoing + strategy",
      "retainer-enterprise": "Full strategy + execution",
    },
  },
  {
    feature: "Animations",
    values: {
      "full-works": "Base motion",
      elite: "3D / WebGL",
      "retainer-growth": "Base motion",
      "retainer-scale": "Custom motion",
      "retainer-enterprise": "Cinema-grade",
    },
  },
  {
    feature: "Web app / SaaS",
    values: {
      "full-works": "—",
      elite: "Yes",
      "retainer-growth": "—",
      "retainer-scale": "Yes",
      "retainer-enterprise": "Yes, full-stack",
    },
  },
  {
    feature: "Hosting + Domain",
    values: {
      "full-works": "Included",
      elite: "Included",
      "retainer-growth": "Included",
      "retainer-scale": "Included",
      "retainer-enterprise": "Multi-region",
    },
  },
  {
    feature: "Support",
    values: {
      "full-works": "Email",
      elite: "Priority email",
      "retainer-growth": "Email + chat",
      "retainer-scale": "Priority 24/7 365",
      "retainer-enterprise": "Dedicated team 24/7",
    },
  },
  {
    feature: "Turnaround",
    values: {
      "full-works": "5–10 days",
      elite: "10 days",
      "retainer-growth": "1–3 days/edit",
      "retainer-scale": "Weekly sprints",
      "retainer-enterprise": "2-week MVPs",
    },
  },
  {
    feature: "AI agents",
    values: {
      "full-works": "—",
      elite: "Optional",
      "retainer-growth": "Lead + support bot",
      "retainer-scale": "Custom agents",
      "retainer-enterprise": "Full suite",
    },
  },
  {
    feature: "Fractional C-suite",
    values: {
      "full-works": "—",
      elite: "—",
      "retainer-growth": "—",
      "retainer-scale": "—",
      "retainer-enterprise": "CTO + CMO + CRO",
    },
  },
  {
    feature: "Automated Outreach",
    values: {
      "full-works": "—",
      elite: "—",
      "retainer-growth": "Included",
      "retainer-scale": "Included",
      "retainer-enterprise": "Included",
    },
  },
  {
    feature: "Warranty",
    values: {
      "full-works": "Lifetime build",
      elite: "Lifetime build",
      "retainer-growth": "Whilst active",
      "retainer-scale": "Whilst active",
      "retainer-enterprise": "Whilst active + SLA",
    },
  },
];

export const COMPARISON_SLUGS: string[] = [
  "full-works",
  "elite",
  "retainer-growth",
  "retainer-scale",
  "retainer-enterprise",
];
