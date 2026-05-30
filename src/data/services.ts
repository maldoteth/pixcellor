import { Megaphone, Code2, Briefcase, type LucideIcon } from "lucide-react";

export type ServiceCategory = "marketing" | "tech" | "business";
export type ServiceCtaAction = "request" | "sales" | "pricing";

export type Service = {
  slug: string;
  name: string;
  category: ServiceCategory;
  /** Short one-liner shown in dialog rows (mirrors the original "info" copy). */
  info: string;
  /** Subtitle under hero name on the sales page. */
  tagline: string;
  /** 1–2 sentence opening pitch in the hero. */
  heroBlurb: string;
  features: string[];
  process: string[];
  deliverables: string[];
  /** Optional pricing band — only set when we publish a public price. */
  pricing?: string;
  /** Optional past-client logos/names. */
  clients?: string[];
  primaryCta: { label: string; action: ServiceCtaAction };
  secondaryCta?: { label: string; action: ServiceCtaAction };
};

export type ServiceCategoryMeta = {
  id: ServiceCategory;
  title: string;
  icon: LucideIcon;
};

export const SERVICE_CATEGORIES: Record<ServiceCategory, ServiceCategoryMeta> = {
  marketing: { id: "marketing", title: "Marketing Solutions", icon: Megaphone },
  tech: { id: "tech", title: "Tech Solutions", icon: Code2 },
  business: { id: "business", title: "Business Solutions", icon: Briefcase },
};

const salesCta = { label: "Book a sales call", action: "sales" as const };
const requestCta = { label: "Request a free sample", action: "request" as const };
const pricingCta = { label: "See pricing", action: "pricing" as const };

export const SERVICES: Service[] = [
  // ────────────── MARKETING ──────────────
  {
    slug: "telesales-campaigns",
    name: "Telesales campaigns",
    category: "marketing",
    info: "Every call recorded on your custom client CRM with regular feedback and reviews.",
    tagline: "Outbound that actually converts — at £22 an hour.",
    heroBlurb:
      "Veteran B2B and B2C callers running your campaigns end-to-end. Every dial recorded, every outcome logged to your own CRM, and weekly performance reviews so you always know what's working.",
    features: [
      "Dedicated UK-based caller(s) on your campaign",
      "Every call recorded and stored in your CRM",
      "Custom scripting built around your offer and objections",
      "Weekly performance reviews and feedback loops",
      "Lead scoring + handover to your sales team or calendar",
      "Compliant data handling (GDPR + TPS scrubbed)",
    ],
    process: [
      "Discovery call — target market, offer, ideal outcome",
      "We build the data list, script and CRM workflow",
      "Pilot week of dials with daily readouts",
      "Scale up with weekly reviews and script iteration",
    ],
    deliverables: [
      "Live dialler with call recordings",
      "Booked meetings or qualified leads in your CRM",
      "Weekly performance report (dials, contacts, conversions)",
      "Refined scripts and objection handling library",
    ],
    pricing: "£22 / hour — every call recorded, full CRM access included",
    clients: ["3M", "Barclays Bank", "Guide Dogs"],
    primaryCta: salesCta,
  },
  {
    slug: "gtm-lead-generation",
    name: "GTM & Lead Generation",
    category: "marketing",
    info: "From industry veterans with 9 figure market caps and multi 7 figure Q1 revenue background.",
    tagline: "Go-to-market built by founders who've actually shipped one.",
    heroBlurb:
      "Operators who've launched products to 9-figure market caps and multi-7-figure Q1 revenue design your GTM, build the pipeline, and run the playbook with you.",
    features: [
      "ICP definition and positioning workshops",
      "Outbound + inbound channel strategy",
      "Cold email, LinkedIn, and telesales orchestration",
      "Lead-scoring + CRM hygiene",
      "Founder-led sales training for your team",
      "Weekly pipeline reviews",
    ],
    process: [
      "GTM audit of your current funnel and offer",
      "90-day plan with channel mix and KPIs",
      "Sprint execution — content, sequences, lists",
      "Review, double-down on what converts, kill what doesn't",
    ],
    deliverables: [
      "ICP + messaging doc",
      "Multi-channel outbound sequences",
      "Qualified pipeline and meetings booked",
      "Sales playbook for your team to run themselves",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "token-launches",
    name: "Tokenization & launches",
    category: "marketing",
    info: "We will help you create a buzz and get the word out with targeted messaging.",
    tagline: "Launch loud. Launch credible.",
    heroBlurb:
      "We've taken Web3 projects from whitepaper to top-300 market cap. We handle narrative, comms, KOLs and launch-day execution so you don't blow your one shot.",
    features: [
      "Pre-launch narrative and tokenomics review",
      "KOL and community partnerships",
      "Twitter/X, Telegram and Discord ramp-up",
      "Launch-day comms and incident response",
      "Post-launch holder engagement and retention",
      "Investor outreach and launchpads",
    ],
    process: [
      "Strategy session and timeline lock",
      "90-day post-launch growth sprint",
      "Launch-day war room",
      "30-day post-launch growth sprint",
    ],
    deliverables: [
      "Launch comms calendar",
      "KOL partnership roster",
      "Community growth and on-chain holder metrics",
      "Post-mortem and next-phase plan",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "seo-aeo-optimisation",
    name: "SEO & AEO optimisation",
    category: "marketing",
    info: "Get ranked instantly with our team of experts stemming from some of the largest companies in the world.",
    tagline: "Rank on Google. Get cited by ChatGPT.",
    heroBlurb:
      "Technical SEO, content, and AEO (Answer Engine Optimisation) so you show up where buyers actually look in 2026 — search AND AI assistants.",
    features: [
      "Full technical audit (Core Web Vitals, schema, crawlability)",
      "Keyword + entity mapping for SEO and AEO",
      "On-page rewrites and JSON-LD structured data",
      "Content briefs and production",
      "Link-building and digital PR",
      "Monthly ranking + AI-citation reports",
    ],
    process: [
      "Audit + competitor gap analysis",
      "Quick-win fixes shipped in week one",
      "Content + entity build-out month 1–3",
      "Ongoing reporting and iteration",
    ],
    deliverables: [
      "Audit report with prioritised fixes",
      "Optimised on-page and schema",
      "Published content cluster",
      "Monthly performance dashboard",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "social-media-automation",
    name: "Social media automation",
    category: "marketing",
    info: "Generate leads while you sleep with automated social media management and save 90% on SMM salaries.",
    tagline: "An always-on social team for a fraction of the headcount.",
    heroBlurb:
      "Automated content pipelines, AI-assisted scheduling, and engagement bots that work 24/7 — replacing entire SMM teams while keeping your brand voice intact.",
    features: [
      "Brand-voice trained content generation",
      "Multi-platform scheduling (X, LinkedIn, IG, TikTok)",
      "DM and comment automation with human handover",
      "Lead capture into your CRM",
      "Weekly content performance reports",
    ],
    process: [
      "Brand voice + content pillar workshop",
      "Tooling + automation setup",
      "Campaign run + review",
      "Hand over, or we keep running it",
    ],
    deliverables: [
      "Content calendar and automation stack",
      "Scheduled posts across your channels",
      "Lead pipeline from DMs and comments",
      "Performance dashboard",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "paid-ads-retargeting",
    name: "Paid ads & retargeting",
    category: "marketing",
    info: "Leverage the latest techniques and strategies to maximise ROI with our advertising services.",
    tagline: "Spend less. Convert more. Retarget everything.",
    heroBlurb:
      "Performance media across Meta, Google, TikTok and LinkedIn — built on proper tracking, creative testing, and full-funnel retargeting.",
    features: [
      "Pixel and server-side tracking setup",
      "Creative production and split-testing",
      "Audience and lookalike building",
      "Retargeting flows across channels",
      "Weekly spend reviews and budget reallocation",
    ],
    process: [
      "Tracking + account audit",
      "Creative + audience build",
      "Launch and daily optimisation",
      "Weekly review and scale",
    ],
    deliverables: [
      "Tracking infrastructure that actually works",
      "Tested creative library",
      "Live campaigns with ROAS reporting",
      "Weekly performance reviews",
    ],
    primaryCta: salesCta,
  },

  // ────────────── TECH ──────────────
  {
    slug: "landing-pages",
    name: "Landing pages",
    category: "tech",
    info: "Save time and have our team take care of all your landing page needs.",
    tagline: "High-converting landing pages, shipped in days.",
    heroBlurb:
      "Pixel-perfect, fast-loading landing pages designed around a single conversion goal — copy, design, build and analytics, all done for you.",
    features: [
      "Conversion-led copy and design",
      "Mobile-first, sub-2-second load times",
      "A/B testing wired up from day one",
      "Form / CRM / payment integrations",
      "SEO and AEO ready",
      "Lifetime warranty on build quality",
    ],
    process: [
      "Brief — offer, audience, conversion goal",
      "Design preview in 48–72 hours",
      "Build, integrate, QA",
      "Launch + handover analytics",
    ],
    deliverables: [
      "Live landing page on your domain",
      "Analytics + A/B test setup",
      "Source files and documentation",
    ],
    primaryCta: requestCta,
    secondaryCta: pricingCta,
  },
  {
    slug: "animated-sites",
    name: "Animated sites",
    category: "tech",
    info: "£10K websites last year are now £500 websites if you speak to the right people — we are the right people.",
    tagline: "Award-grade animated websites at a fraction of the agency price.",
    heroBlurb:
      "The same calibre of motion design and interactivity you'd pay £10K+ for at a London agency — engineered to ship in days, not months.",
    features: [
      "Scroll-driven animation and 3D interactions",
      "Custom motion design tailored to your brand",
      "60fps on mobile (we obsess over performance)",
      "Lifetime warranty on the build",
      "Up to 10 pages on Elite",
      "10-day turnaround",
    ],
    process: [
      "Brief + reference call",
      "Design direction + interactive preview",
      "Build + animation pass",
      "Launch + handover",
    ],
    deliverables: [
      "Live animated site",
      "Source code and editable components",
      "Performance and SEO audit",
    ],
    primaryCta: requestCta,
    secondaryCta: pricingCta,
  },
  {
    slug: "full-web-apps",
    name: "Full web apps",
    category: "tech",
    info: "We've built custom solutions and full stack apps across tech, retail, web3 and more!",
    tagline: "Full-stack applications, end to end.",
    heroBlurb:
      "From MVP to enterprise platform — auth, data, payments, dashboards, real-time, the lot. Built on a modern stack you actually own.",
    features: [
      "React + TypeScript front-end",
      "Postgres + edge functions back-end",
      "Auth, payments, file storage, real-time",
      "Admin dashboards and analytics",
      "Mobile-responsive PWA",
      "Lifetime warranty on the build",
    ],
    process: [
      "Discovery + technical scoping",
      "2-week MVP sprint",
      "Iterative releases with daily updates",
      "Launch + ongoing support",
    ],
    deliverables: [
      "Live web app on your infrastructure",
      "Source code + technical documentation",
      "Admin tooling for your team",
    ],
    primaryCta: salesCta,
    secondaryCta: pricingCta,
  },
  {
    slug: "internal-tools",
    name: "Internal tools",
    category: "tech",
    info: "Custom systems, automations, agentic flows and more saving you potentially tens of thousands a year.",
    tagline: "Replace spreadsheets and SaaS subscriptions with tools built for you.",
    heroBlurb:
      "Bespoke internal tools and automations that pay for themselves in months — often saving £10K+/year in software and salary costs.",
    features: [
      "Custom dashboards for your team",
      "Automations and AI agents for repetitive work",
      "Integrations with your existing stack",
      "Role-based access and audit logs",
      "Hosted and maintained, or hand-over",
    ],
    process: [
      "Process audit — where does time leak?",
      "Tool design and approval",
      "Build + integrate",
      "Roll out + train your team",
    ],
    deliverables: [
      "Live internal tool with your branding",
      "Automation workflows",
      "Team training and documentation",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "crm-systems",
    name: "CRM systems",
    category: "tech",
    info: "A CRM that fits your exact workflow, powered by AI agents that work to your will — saving your team time and ensuring nothing is ever missed.",
    tagline: "Your own CRM, with AI agents on staff.",
    heroBlurb:
      "Stop bending your business to fit Salesforce. We build CRMs around how you actually sell, with AI agents handling enrichment, follow-up, and admin so nothing slips.",
    features: [
      "Custom pipeline and data model",
      "AI agents for enrichment, follow-up, scheduling",
      "Email, calling, and inbox integrations",
      "Reporting and forecasting",
      "Role-based access and audit logs",
      "Lifetime warranty on the build",
    ],
    process: [
      "Map your current sales process",
      "Design data model and AI workflows",
      "Build and migrate from your existing CRM",
      "Roll out + train",
    ],
    deliverables: [
      "Live CRM on your infrastructure",
      "Data migrated from your existing system",
      "AI agents running on your pipeline",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "ecommerce-stores",
    name: "E-commerce stores",
    category: "tech",
    info: "Our Shopify stores have scaled tens of thousands of sales on launch days and we're ready to help you get the same results.",
    tagline: "Stores built to survive a launch-day stampede.",
    heroBlurb:
      "Shopify and custom commerce builds that have handled tens of thousands of orders on launch day — design, build, and conversion optimisation in one.",
    features: [
      "Shopify or custom stack",
      "Conversion-led product and checkout pages",
      "Payment, shipping, and tax integrations",
      "Email + SMS flow setup (Klaviyo etc.)",
      "Performance optimised for launch traffic",
    ],
    process: [
      "Brand and catalogue review",
      "Design + build sprint",
      "Integrations + QA",
      "Launch support",
    ],
    deliverables: [
      "Live store with full product catalogue",
      "Email/SMS automation flows",
      "Analytics and conversion tracking",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "blockchain-integrations",
    name: "Blockchain integrations",
    category: "tech",
    info: "Our team have scaled top 300 crypto projects, generated hundreds of millions in market cap and multiple 7 figure fundraises.",
    tagline: "Smart contracts, wallets, dApps — by people who've shipped to top-300.",
    heroBlurb:
      "Token contracts, NFT mints, wallet auth, on-chain payments, and full dApps — built by a team with hundreds of millions in market cap behind them.",
    features: [
      "Smart contract development and audits",
      "Wallet auth (EVM, Solana, etc.)",
      "On-chain payments and subscriptions",
      "NFT mints and marketplaces",
      "Indexer and analytics dashboards",
    ],
    process: [
      "Technical scoping and threat modelling",
      "Contract development + audit prep",
      "Front-end integration",
      "Mainnet deploy + monitoring",
    ],
    deliverables: [
      "Audited smart contracts",
      "Front-end dApp",
      "Monitoring and admin dashboards",
    ],
    primaryCta: salesCta,
  },

  // ────────────── BUSINESS ──────────────
  {
    slug: "recruitment-ats",
    name: "Recruitment & ATS",
    category: "business",
    info: "Award-winning top-billing recruiters across tech, medical, crypto, construction, hospitality, education and more — or your own AI-agent powered ATS that kills middle-man fees forever.",
    tagline: "Top-billing recruiters — or your own AI ATS. Flat fees, no surprises.",
    heroBlurb:
      "Senior recruiters from the world's biggest agencies — annual top-billers across tech, healthcare, construction, crypto and more. Or we build you an AI-agent ATS that does the same job without the middle-man fees.",
    features: [
      "Flat 15% on temp placements",
      "Flat 5% on permanent placements",
      "Senior recruiters with sector-specific track records",
      "Optional custom ATS with AI agent recruiters",
      "Compliance + onboarding handled",
      "No exclusivity required",
    ],
    process: [
      "Role brief and ideal-candidate profile",
      "Sourcing across our networks + AI agents",
      "Shortlist with full interview notes",
      "Offer + onboarding support",
    ],
    deliverables: [
      "Vetted shortlist within days",
      "Placed candidate(s)",
      "Optional ATS handover for future hires",
    ],
    pricing: "Flat 15% on temps · Flat 5% on perms",
    clients: [
      "TikTok",
      "LinkedIn",
      "Berkeley Homes",
      "Bupa",
      "Galliford Try",
      "Morgan Sindall",
      "NHS",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "payroll-hr-tooling",
    name: "Payroll & HR tooling",
    category: "business",
    info: "Access cutting-edge payroll and non-custodial solutions with instant one-day settlements and irreversible transactions.",
    tagline: "Same-day payroll. Modern HR. Zero faff.",
    heroBlurb:
      "Modern payroll + HR systems, including non-custodial rails with one-day settlement. Built for teams that have outgrown spreadsheets but hate enterprise HR software.",
    features: [
      "Same-day / one-day settlement options",
      "Multi-currency and crypto payouts",
      "Holiday, sickness and contract management",
      "Self-serve employee portal",
      "Integrations with accounting tools",
    ],
    process: [
      "Audit current payroll + HR stack",
      "Migration plan",
      "Build / configure and integrate",
      "Roll out to your team",
    ],
    deliverables: [
      "Live payroll + HR system",
      "Employee self-serve portal",
      "Accounting integration",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "ai-integrations-agents",
    name: "AI agents and integrations",
    category: "business",
    info: "Automate your entire business and workflow with highly secure and sophisticated agents that work 24/7, 365, custom built to maximise your ROI.",
    tagline: "Agents that run your business while you sleep.",
    heroBlurb:
      "Bespoke AI agents wired into your tools — sales, ops, support, finance — running 24/7 with the guardrails and audit trails your business needs.",
    features: [
      "Custom agents per workflow (sales, support, ops)",
      "Tool integrations (CRM, inbox, calendars, Stripe, etc.)",
      "Human-in-the-loop checkpoints",
      "Audit logs and observability",
      "Hosted on your infrastructure or ours",
    ],
    process: [
      "Workflow audit — where do agents win?",
      "Agent + tool design",
      "Build, test, deploy",
      "Monitor + iterate",
    ],
    deliverables: [
      "Live AI agents in production",
      "Admin dashboard with logs",
      "Training and runbooks",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "consultations-audits",
    name: "Visitor intel & fall off capture",
    category: "business",
    info: "Know every visitor, every partial entry, every drop-off — and turn anonymous traffic into named, qualified leads. Our own falloff capture system plus AI bot, rivalling tools like Lead Forensics, Leadfeeder and RB2B.",
    tagline: "Turn anonymous traffic into named leads.",
    heroBlurb:
      "Most sites lose 95%+ of visitors silently. We deploy our proprietary falloff capture system and AI tracking bot so you see who visited, what they did, where they dropped off — and follow up automatically. Like Lead Forensics, but built into your stack and powered by AI.",
    features: [
      "Identify anonymous company & visitor traffic",
      "Capture partial form entries in real time (email, phone, address — even if never submitted)",
      "Session replay & funnel drop-off heatmaps",
      "AI bot that scores, enriches & routes every lead",
      "Auto-trigger email, SMS & CRM follow-ups on abandonment",
      "B2B company reveal with firmographics & decision-maker contacts",
      "GDPR-aware consent + audit trail",
    ],
    process: [
      "Install tracking snippet + CRM/webhook hooks",
      "Configure capture rules, scoring & follow-up flows",
      "AI bot trained on your ICP and offers",
      "Live dashboard + daily lead digest",
    ],
    deliverables: [
      "Live visitor intel dashboard",
      "Daily/real-time enriched lead feed",
      "Falloff capture + recovery automations",
      "AI follow-up bot wired into your CRM",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "analytics-dashboards",
    name: "Analytics dashboards",
    category: "business",
    info: "View your business like never before with a custom analytics dashboard mapping your entire company activity and cashflow.",
    tagline: "See your whole business on one screen.",
    heroBlurb:
      "Unified dashboards that pull from every system you use — sales, ops, finance, marketing — so you stop chasing data and start running the business.",
    features: [
      "Unified data layer across your tools",
      "Real-time cashflow and pipeline views",
      "Custom KPIs per department",
      "Alerts when metrics move",
      "Role-based access",
    ],
    process: [
      "Map data sources and KPIs",
      "Build pipelines and dashboard",
      "Roll out + train",
      "Iterate as the business changes",
    ],
    deliverables: [
      "Live dashboard for your team",
      "Documented data pipelines",
      "KPI playbook",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "api-third-party",
    name: "API & third-party integrations",
    category: "business",
    info: "We will help you set up systems requiring technical knowledge.",
    tagline: "Plumbing between every tool you use.",
    heroBlurb:
      "Integrations, webhooks, and middleware so your stack actually talks to itself — Stripe, HubSpot, Slack, your CRM, your warehouse, whatever you need.",
    features: [
      "REST + GraphQL + webhook integrations",
      "Middleware and queueing for reliability",
      "Retry / monitoring / alerting",
      "Auth and secret management",
    ],
    process: [
      "Map data flows",
      "Build + test in staging",
      "Cut over + monitor",
    ],
    deliverables: [
      "Working integrations with monitoring",
      "Documentation for your team",
    ],
    primaryCta: salesCta,
  },
  {
    slug: "product-project-management",
    name: "Product & project management",
    category: "business",
    info: "If you want something as stunning as this website or any of our portfolio work, then look no further.",
    tagline: "Senior PMs to drive your project to the finish line.",
    heroBlurb:
      "Embedded product and project management — the people behind shipping our own portfolio — driving your build to launch on time, on scope, on brand.",
    features: [
      "Embedded PM on your project",
      "Roadmap, sprint planning, and delivery",
      "Stakeholder + vendor management",
      "Design + engineering coordination",
    ],
    process: [
      "Scoping + roadmap workshop",
      "Sprint cadence kick-off",
      "Weekly delivery + stakeholder updates",
      "Launch + retrospective",
    ],
    deliverables: [
      "Live roadmap and sprint board",
      "Weekly status reports",
      "Shipped product",
    ],
    primaryCta: salesCta,
  },
];

export const getServiceBySlug = (slug: string) =>
  SERVICES.find((s) => s.slug === slug);

export const getServicesByCategory = (cat: ServiceCategory) =>
  SERVICES.filter((s) => s.category === cat);

// Map historical SERVICE_BACKS row names → slugs so existing PackagesDialog rows can link to the new sales pages.
const NAME_TO_SLUG: Record<string, string> = {
  "Telesales campaigns": "telesales-campaigns",
  "GTM and Lead Generation": "gtm-lead-generation",
  "Tokenization & launches": "token-launches",
  "Token launches": "token-launches",
  "SEO & AEO optimisation": "seo-aeo-optimisation",
  "Social media automation": "social-media-automation",
  "Paid ads & retargeting": "paid-ads-retargeting",
  "Landing pages": "landing-pages",
  "Animated sites": "animated-sites",
  "Full web apps": "full-web-apps",
  "Internal tools": "internal-tools",
  "CRM systems": "crm-systems",
  "E-commerce stores": "ecommerce-stores",
  "Blockchain integrations": "blockchain-integrations",
  "AI & blockchain integrations": "blockchain-integrations",
  "Recruitment & ATS": "recruitment-ats",
  "Payroll & HR tooling": "payroll-hr-tooling",
  "AI agents and integrations": "ai-integrations-agents",
  "Analytics and intel": "consultations-audits",
  "Analytics dashboards": "analytics-dashboards",
  "API & third-party": "api-third-party",
  "Product/project management": "product-project-management",
};

export const getServiceByName = (name: string) => {
  const slug = NAME_TO_SLUG[name];
  return slug ? getServiceBySlug(slug) : undefined;
};
