// Centralised package detail content for dedicated package pages.
// Each entry powers `/packages/:slug`.

import ogGrowth from "@/assets/og-retainer-growth.jpg";
import ogScale from "@/assets/og-retainer-scale.jpg";
import ogEnterprise from "@/assets/og-retainer-enterprise.jpg";

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
        title: "Self-improving agentic flows",
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
        title: "Self-improving agentic flows",
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
        title: "Self-improving agentic flows",
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
      "retainer-growth": "£89/mo",
      "retainer-scale": "£479/mo",
      "retainer-enterprise": "£2,469/mo",
    },
  },
  {
    feature: "Pages",
    values: {
      "retainer-growth": "Monthly edits",
      "retainer-scale": "Weekly edits",
      "retainer-enterprise": "Daily edits",
    },
  },
  {
    feature: "Edits / Revisions",
    values: {
      "retainer-growth": "Unlimited",
      "retainer-scale": "Unlimited",
      "retainer-enterprise": "Unlimited",
    },
  },
  {
    feature: "SEO / AEO",
    values: {
      "retainer-growth": "Ongoing\u00a0",
      "retainer-scale": "Constant",
      "retainer-enterprise": "Maximum",
    },
  },
  {
    feature: "Animations",
    values: {
      "retainer-growth": "2D / WebGL",
      "retainer-scale": "2D / WebGL",
      "retainer-enterprise": "Cinema-grade",
    },
  },
  {
    feature: "Web app / SaaS",
    values: {
      "retainer-growth": "—",
      "retainer-scale": "Custom",
      "retainer-enterprise": "Custom",
    },
  },
  {
    feature: "Hosting",
    values: {
      "retainer-growth": "250 / m",
      "retainer-scale": "1,000 / m",
      "retainer-enterprise": "10,000 / m",
    },
  },
  {
    feature: "Support",
    values: {
      "retainer-growth": "Priority",
      "retainer-scale": "Priority 24/7 365",
      "retainer-enterprise": "Dedicated team",
    },
  },
  {
    feature: "Turnaround",
    values: {
      "retainer-growth": "1–3 days/edit",
      "retainer-scale": "Weekly sprints",
      "retainer-enterprise": "Weekly MVPs",
    },
  },
  {
    feature: "Self-improving",
    values: {
      "retainer-growth": "Continuous",
      "retainer-scale": "Continuous",
      "retainer-enterprise": "Estate-wide",
    },
  },
  {
    feature: "Auto-adopts",
    values: {
      "retainer-growth": "Some",
      "retainer-scale": "All",
      "retainer-enterprise": "First",
    },
  },
  {
    feature: "AI agent types",
    values: {
      "retainer-growth": "Sales + Support",
      "retainer-scale": "Custom agents",
      "retainer-enterprise": "Full suite",
    },
  },
  {
    feature: "AI lead-gen runs",
    values: {
      "retainer-growth": "250 / m",
      "retainer-scale": "1,000 / m",
      "retainer-enterprise": "10,000 / m",
    },
  },
  {
    feature: "Export to any host",
    values: {
      "retainer-growth": "Unlimited",
      "retainer-scale": "Unlimited",
      "retainer-enterprise": "Unlimited",
    },
  },
  {
    feature: "Whitelabel delivery",
    values: {
      "retainer-growth": "No watermarks",
      "retainer-scale": "Full whitelabel",
      "retainer-enterprise": "Full whitelabel",
    },
  },
  {
    feature: "Fractional C-suite",
    values: {
      "retainer-growth": "—",
      "retainer-scale": "—",
      "retainer-enterprise": "⅕ CTO + CMO",
    },
  },
  {
    feature: "Outbound Emails",
    values: {
      "retainer-growth": "250 / m",
      "retainer-scale": "1,000 / m",
      "retainer-enterprise": "10,000 / m",
    },
  },
  {
    feature: "Warranty",
    values: {
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
