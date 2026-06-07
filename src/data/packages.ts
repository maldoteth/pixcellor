// Centralised package detail content for dedicated package pages.
// Each entry powers `/packages/:slug`.

export type PackageCta = "buy" | "sales" | "packages";

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
};

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
    billing: "£100/month or £1,000/year (save £200)",
    priceId: "price_1TcfyPBtUjwejeUwJmEbSWtN",
    mode: "subscription",
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
    billing: "£500/month or £5,000/year (save £1,000)",
    priceId: "price_1Tcg07BtUjwejeUwfGGDhftV",
    mode: "subscription",
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
      { q: "Do you replace our developers?", a: "We complement them — we can plug in as squad, lead or backup." },
      { q: "How quickly are AI agents live?", a: "Typically a working agent within 2 weeks of scope sign-off." },
      { q: "Is there a minimum term?", a: "No — monthly is rolling, yearly saves £1,000." },
    ],
    primaryCta: { label: "Start Scale", action: "packages" },
    secondaryCta: { label: "Talk to sales", action: "sales" },
  },

  "retainer-enterprise": {
    slug: "retainer-enterprise",
    name: "Enterprise Retainer",
    tagline: "Fractional C-suite, dedicated team, MVP sprints — £2,500/month.",
    blurb:
      "The full Pixcellor force on your side. Fractional CTO, CMO and CRO, a dedicated dev & ops squad, 2-week MVP sprints and 24/7 priority support.",
    price: "£2,500/mo",
    billing: "£2,500/month or £20,000/year (save £10,000)",
    priceId: "price_1TSmB8BtUjwejeUw8UXRTbBQ",
    mode: "subscription",
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
      { q: "Is the team really dedicated?", a: "Yes — a named squad assigned to you, not pooled across clients." },
      { q: "Can we white-label your team?", a: "Yes — we can operate under your brand for clients or investors." },
      { q: "Notice period?", a: "30 days on monthly; yearly term saves £10,000." },
    ],
    primaryCta: { label: "Start Enterprise", action: "packages" },
    secondaryCta: { label: "Book a strategy call", action: "sales" },
  },
};

export const PACKAGE_SLUGS = Object.keys(PACKAGE_DETAILS);
