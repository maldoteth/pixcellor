// Centralised package detail content for dedicated package pages.
// Each entry powers `/packages/:slug`.

import ogFullWorks from "@/assets/og-full-works.jpg";
import ogElite from "@/assets/og-elite.jpg";
import ogGrowth from "@/assets/og-retainer-growth.jpg";
import ogScale from "@/assets/og-retainer-scale.jpg";
import ogEnterprise from "@/assets/og-retainer-enterprise.jpg";

import imgSalonBrochure from "@/assets/sample-work/salon-brochure.jpg";
import imgConsultantLanding from "@/assets/sample-work/consultant-landing.jpg";
import imgTradesPortfolio from "@/assets/sample-work/trades-portfolio.jpg";
import imgAnimatedBrandSite from "@/assets/sample-work/animated-brand-site.jpg";
import imgSaasMvp from "@/assets/sample-work/saas-mvp.jpg";
import imgEcommerceFlagship from "@/assets/sample-work/ecommerce-flagship.jpg";
import imgAlwaysOnBrochure from "@/assets/sample-work/always-on-brochure.jpg";
import imgCrmLeadBot from "@/assets/sample-work/crm-lead-bot.jpg";
import imgAnalyticsDashboard from "@/assets/sample-work/analytics-dashboard.jpg";
import imgAiSalesAgent from "@/assets/sample-work/ai-sales-agent.jpg";
import imgOpsAutomation from "@/assets/sample-work/ops-automation.jpg";
import imgLandingTests from "@/assets/sample-work/landing-tests.jpg";
import imgMvpSprint from "@/assets/sample-work/mvp-sprint.jpg";
import imgRecruitmentAts from "@/assets/sample-work/recruitment-ats.jpg";
import imgEnterpriseDashboard from "@/assets/sample-work/enterprise-dashboard.jpg";

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
  image?: string;
};

export type PackageDetail = {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  price: string;
  /** @deprecated No longer used — pricing is standard. */
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
  { name: "Unique copywriting", price: "£100", note: "Per page, sales-trained" },
  { name: "Brand kit (logo + identity)", price: "£200", note: "Logo, palette, fonts, guidelines" },
  { name: "Migration from existing site", price: "£150", note: "Content + redirects + SEO equity" },
  { name: "Custom 3D animation", price: "£250", note: "Bespoke animated scene" },
  { name: "SEO Publications", price: "£100", note: "Full content + SEO per locale" },
];

// Calendly/Cal.com placeholder — swap for real URL when available.
const CAL_URL = "https://cal.com/pixcellor/strategy";

export const PACKAGE_DETAILS: Record<string, PackageDetail> = {
  "full-works": {
    slug: "full-works",
    name: "Full Works\u00a0",
    tagline: "A professional, fast-loading website — done for you, end-to-end.",
    blurb:
      "The fastest, lowest-risk way to get a polished website live. We design, build, host and maintain it so you can focus on running your business.",
    price: "£169.00",
    billing: "One-time payment",
    priceId: "price_1Tkw9XBtUjwejeUwEQlAv42p",
    mode: "payment",
    ogImage: ogFullWorks,
    sampleWork: [
      { title: "Salon brochure site", tag: "3 pages · booking form", note: "Local service business, mobile-first.", image: imgSalonBrochure },
      { title: "Consultant landing", tag: "1 page · lead capture", note: "Single-page site optimised for conversion.", image: imgConsultantLanding },
      { title: "Trades portfolio", tag: "3 pages · gallery", note: "Photo-led showcase with contact CTA.", image: imgTradesPortfolio },
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
          "Hosting for first 25 leads",
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
      { q: "How long does it take?", a: "Typically 3–10 working days from brief to launch." },
      { q: "Do I own the site?", a: "Yes — you own the code, content and domain." },
      { q: "What if I need more pages later?", a: "Add pages anytime, or upgrade to Elite for unlimited revisions." },
      { q: "Is hosting really free?", a: "Yes — included for the first 25 leads on our global CDN." },
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
    price: "£479.00",
    billing: "One-time payment",
    priceId: "price_1Tkw9YBtUjwejeUwrSxZXLl6",
    mode: "payment",
    featured: true,
    ogImage: ogElite,
    sampleWork: [
      { title: "Animated brand site", tag: "10 pages · WebGL hero", note: "Scroll-driven 3D, custom illustrations.", image: imgAnimatedBrandSite },
      { title: "SaaS web app MVP", tag: "Auth · DB · Stripe", note: "Full-stack product launched in 3–10 days.", image: imgSaasMvp },
      { title: "E-commerce flagship", tag: "Catalog · cart · checkout", note: "Custom storefront with Stripe payments.", image: imgEcommerceFlagship },
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
          "Up to 150 AI lead-gen runs total (upgrade to a retainer for monthly runs)",
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
        title: "Smart website",
        items: [
          "Your site learns from real visitor behaviour and rewrites itself",
          "Auto-adopts the newest AI models the moment they ship — no rebuild",
          "Continuous A/B testing on copy, layout and CTAs, 24/7",
          "AI agents monitor SEO/AEO drift and patch rankings automatically",
          "Self-healing components: broken links, slow pages and dead embeds fixed without you lifting a finger",
          "Every advance in AI = a free upgrade to your website",
        ],
      },
      {
        title: "Launch & Aftercare",
        items: [
          "10-day delivery turnaround",
          "Unlimited revisions during build",
          "Lifetime warranty on build defects",
          "Hosting for first 150 leads, SSL & domain setup",
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
    name: "Growth\u00a0",
    tagline: "Grow your business with our solutions",
    blurb:
      "Everything a small business needs to run online — website with unlimited edits, CRM, hosting, AI bots and analytics — bundled into one predictable monthly fee.",
    price: "£89/mo",
    billing: "Billed monthly · cancel anytime",
    priceId: "price_1Tkw9ZBtUjwejeUwzikiU5cp",
    mode: "subscription",
    ogImage: ogGrowth,
    yearlyPrice: "£890/yr",
    yearlyBilling: "Billed annually · save £178",
    yearlyPriceId: "price_1Tkw9ZBtUjwejeUw6PkwTVs8",
    yearlySavings: "£178/yr",
    sampleWork: [
      { title: "Always-on brochure site", tag: "Unlimited edits", note: "Live updates on demand, no developer required.", image: imgAlwaysOnBrochure },
      { title: "CRM + lead bot", tag: "AI assistant", note: "Captures and qualifies inbound leads 24/7.", image: imgCrmLeadBot },
      { title: "Analytics dashboard", tag: "Monthly report", note: "Traffic, conversions, search visibility.", image: imgAnalyticsDashboard },
    ],
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
        title: "Smart website",
        items: [
          "Your site evolves on its own — no rebuild, no waiting",
          "Auto-upgraded the moment a better AI model is released",
          "Behavioural A/B tests run continuously to lift conversions",
          "Agents rewrite copy and meta for fresh SEO/AEO wins",
          "Always on the latest trends — design, perf, accessibility",
          "Every AI breakthrough becomes your competitive edge, automatically",
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
    name: "Scale\u00a0",
    tagline: "Scale to new heights with a dedicated team",
    blurb:
      "Everything in Growth plus unlimited users, priority SLA, monthly strategy and the AI agents & automations to scale operations without scaling headcount.",
    price: "£479/mo",
    billing: "Billed monthly · cancel anytime",
    priceId: "price_1Tkw9bBtUjwejeUwFNkRNrjx",
    mode: "subscription",
    ogImage: ogScale,
    yearlyPrice: "£4,790/yr",
    yearlyBilling: "Billed annually · save £958",
    yearlyPriceId: "price_1Tkw9bBtUjwejeUw2Mv7pJR8",
    yearlySavings: "£890/yr",
    scheduleCallUrl: CAL_URL,
    sampleWork: [
      { title: "AI sales agent", tag: "Voice + chat", note: "Books meetings 24/7 directly into the calendar.", image: imgAiSalesAgent },
      { title: "Ops automation suite", tag: "Zapier-grade", note: "Document extraction + workflow agents.", image: imgOpsAutomation },
      { title: "Landing page tests", tag: "A/B at speed", note: "Iterate landing variants weekly.", image: imgLandingTests },
    ],
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
      {
        title: "Smart website",
        items: [
          "Site + app rewrite themselves based on real conversion data",
          "Automatic adoption of frontier AI models the day they release",
          "Multi-variant testing across pages, copy, hero and CTAs",
          "SEO/AEO agents claim new keywords as they trend",
          "Continuous performance & accessibility self-tuning",
          "Your stack compounds with every AI advancement — automatically",
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
      { q: "Is there a minimum term?", a: "No — monthly is rolling, yearly saves £958." },
    ],
    primaryCta: { label: "Start Scale", action: "packages" },
    secondaryCta: { label: "Book a strategy call", action: "sales" },
  },

  "retainer-enterprise": {
    slug: "retainer-enterprise",
    name: "Enterprise\u00a0",
    tagline: "A fractional CMO and CTO shipping weekly",
    blurb:
      "The full Pixcellor force on your side. Fractional CTO and CMO, a dedicated dev & ops squad, 2-week MVP sprints and 24/7 priority support.",
    price: "£2,469/mo",
    billing: "Billed monthly · 30-day notice",
    priceId: "price_1Tkw9cBtUjwejeUwitF4y9sg",
    mode: "subscription",
    ogImage: ogEnterprise,
    yearlyPrice: "£24,690/yr",
    yearlyBilling: "Billed annually · save £4,938",
    yearlyPriceId: "price_1Tkw9dBtUjwejeUwOG2jdnoV",
    yearlySavings: "£4,938/yr",
    scheduleCallUrl: CAL_URL,
    sampleWork: [
      { title: "MVP sprint", tag: "2-week launches", note: "Fully working product every fortnight.", image: imgMvpSprint },
      { title: "Recruitment ATS", tag: "Custom software", note: "AI-assisted candidate sourcing & pipeline.", image: imgRecruitmentAts },
      { title: "Enterprise dashboard", tag: "SSO + RBAC", note: "Multi-region, audit-logged analytics.", image: imgEnterpriseDashboard },
    ],
    includes: [
      {
        title: "Everything in Scale, plus",
        items: [
          "Fractional CTO & CMO",
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
          "Internal tools, CRM & cyber-security, dashboards & APIs",
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
      {
        title: "Smart website",
        items: [
          "Every public surface — site, app, dashboards — evolves autonomously",
          "Day-zero adoption of frontier AI: GPT, Claude, Gemini, open models",
          "Always-on experimentation across product, pricing and copy",
          "Self-healing infrastructure: incidents triaged and patched by agents",
          "Continuous SEO/AEO + brand monitoring across the entire estate",
          "Compounding moat: your platform gets sharper every single week, hands-off",
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
      "Sprint — Weekly MVPs, weekly releases",
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
      { q: "Notice period?", a: "30 days on monthly; yearly term saves £4,938." },
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
      "full-works": "£169 one-off",
      elite: "£479 one-off",
      "retainer-growth": "£89/mo",
      "retainer-scale": "£479/mo",
      "retainer-enterprise": "£2,469/mo",
    },
  },
  {
    feature: "Revision windows",
    values: {
      "full-works": "Up to 3",
      elite: "Up to 10",
      "retainer-growth": "Monthly\u00a0",
      "retainer-scale": "Weekly\u00a0",
      "retainer-enterprise": "Daily\u00a0",
    },
  },
  {
    feature: "Revision limits",
    values: {
      "full-works": "1 round pre-launch",
      elite: "Unlimited during build",
      "retainer-growth": "2 per month",
      "retainer-scale": "2 per week",
      "retainer-enterprise": "Unlimited",
    },
  },
  {
    feature: "SEO / AEO",
    values: {
      "full-works": "On-page basics",
      elite: "Full SEO + AEO",
      "retainer-growth": "Ongoing\u00a0",
      "retainer-scale": "Constant",
      "retainer-enterprise": "Maximum",
    },
  },
  {
    feature: "Animations",
    values: {
      "full-works": "2D / WebGL",
      elite: "3D ",
      "retainer-growth": "2D / WebGL",
      "retainer-scale": "Custom 3D",
      "retainer-enterprise": "Cinema-grade",
    },
  },
  {
    feature: "Includes",
    values: {
      "full-works": "—",
      elite: "Template",
      "retainer-growth": "Latest \"Smart Site\"",
      "retainer-scale": "App or SAAS",
      "retainer-enterprise": "App or SAAS",
    },
  },
  {
    feature: "Hosting",
    values: {
      "full-works": "First 20 Leads",
      elite: "First 150 Leads",
      "retainer-growth": "Included",
      "retainer-scale": "Included",
      "retainer-enterprise": "Dedicated servers",
    },
  },
  {
    feature: "Support",
    values: {
      "full-works": "Email",
      elite: "Priority",
      "retainer-growth": "Priority",
      "retainer-scale": "Priority 24/7 365",
      "retainer-enterprise": "Dedicated team",
    },
  },
  {
    feature: "Turnaround",
    values: {
      "full-works": "3–10 days",
      elite: "3–10 days",
      "retainer-growth": "1–3 days/edit",
      "retainer-scale": "Weekly sprints",
      "retainer-enterprise": "Weekly MVPs",
    },
  },
  {
    feature: "Self-improving",
    values: {
      "full-works": "—",
      elite: "Limited",
      "retainer-growth": "Continuous",
      "retainer-scale": "Continuous",
      "retainer-enterprise": "Estate-wide",
    },
  },
  {
    feature: "Auto-adopts",
    values: {
      "full-works": "—",
      elite: "Some",
      "retainer-growth": "Some AI models",
      "retainer-scale": "All available upgrades",
      "retainer-enterprise": "Custom trained models",
    },
  },
  {
    feature: "AI agent types",
    values: {
      "full-works": "—",
      elite: "Sales",
      "retainer-growth": "Sales + Support",
      "retainer-scale": "Custom agents",
      "retainer-enterprise": "Full suite",
    },
  },
  {
    feature: "AI lead-gen runs",
    values: {
      "full-works": "—",
      elite: "150 total",
      "retainer-growth": "250 runs per month",
      "retainer-scale": "1,000 runs per month",
      "retainer-enterprise": "10,000 runs per month",
    },
  },
  {
    feature: "Export to any host",
    values: {
      "full-works": "Unlimited",
      elite: "Unlimited",
      "retainer-growth": "Unlimited",
      "retainer-scale": "Unlimited",
      "retainer-enterprise": "Unlimited",
    },
  },
  {
    feature: "Whitelabel delivery",
    values: {
      "full-works": "—",
      elite: "No watermarks",
      "retainer-growth": "No watermarks",
      "retainer-scale": "Full whitelabel",
      "retainer-enterprise": "Full whitelabel",
    },
  },
  {
    feature: "Fractional C-suite",
    values: {
      "full-works": "—",
      elite: "—",
      "retainer-growth": "—",
      "retainer-scale": "—",
      "retainer-enterprise": "⅕ CTO + CMO",
    },
  },
  {
    feature: "Outbound Emails",
    values: {
      "full-works": "—",
      elite: "—",
      "retainer-growth": "1,000 Emails per month",
      "retainer-scale": "3,000 Emails per month",
      "retainer-enterprise": "50,000 Emails per month",
    },
  },
  {
    feature: "Warranty",
    values: {
      "full-works": "Lifetime\u00a0",
      elite: "Lifetime\u00a0",
      "retainer-growth": "+ Active services",
      "retainer-scale": "+ Active services",
      "retainer-enterprise": "+ SLA",
    },
  },
];

export const COMPARISON_SLUGS: string[] = [
  "retainer-growth",
  "retainer-scale",
  "retainer-enterprise",
];
