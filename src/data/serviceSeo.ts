// Per-service SEO overrides. Keep titles ≤60 chars and descriptions ≤160 chars.
// Tone: keyword-rich, benefit-led, distinct per page.

export type ServiceSeo = {
  title: string;
  description: string;
  keywords: string[];
};

export const SERVICE_SEO: Record<string, ServiceSeo> = {
  "telesales-campaigns": {
    title: "Telesales Campaigns UK — £22/hr, Recorded Calls | Pixcellor",
    description:
      "Outbound B2B & B2C telesales from UK veterans. £22/hr, every call recorded to your CRM, weekly reviews. Book a sales call.",
    keywords: [
      "telesales agency UK",
      "outbound call centre",
      "B2B telesales",
      "lead generation calls",
      "appointment setting",
    ],
  },
  "gtm-lead-generation": {
    title: "GTM Strategy & Lead Generation by Operators | Pixcellor",
    description:
      "Go-to-market and lead gen built by founders who shipped to 9-figure caps. Outbound, inbound, ICP, sales playbooks that convert.",
    keywords: [
      "go to market strategy",
      "B2B lead generation",
      "sales playbook",
      "founder led sales",
      "ICP positioning",
    ],
  },
  "token-launches": {
    title: "Crypto Token Launch & Tokenisation Agency | Pixcellor",
    description:
      "Web3 launch partners behind top-300 market cap projects. KOLs, comms, tokenomics, launch-day war room and post-launch growth.",
    keywords: [
      "token launch agency",
      "crypto marketing",
      "tokenisation services",
      "Web3 launch",
      "KOL marketing",
    ],
  },
  "seo-aeo-optimisation": {
    title: "SEO & AEO Optimisation — Rank on Google & ChatGPT | Pixcellor",
    description:
      "Technical SEO, content and Answer Engine Optimisation so you show up in Google AND AI assistants. Audit, fix, rank, report.",
    keywords: [
      "SEO agency",
      "AEO optimisation",
      "answer engine optimisation",
      "ChatGPT SEO",
      "technical SEO audit",
    ],
  },
  "social-media-automation": {
    title: "Social Media Automation Agency — AI Content & DMs | Pixcellor",
    description:
      "Automated social content, scheduling and DM workflows that replace SMM teams. Lead capture into your CRM, 24/7 brand voice.",
    keywords: [
      "social media automation",
      "AI content scheduling",
      "DM automation",
      "social media agency",
      "lead generation social",
    ],
  },
  "paid-ads-retargeting": {
    title: "Paid Ads & Retargeting — Meta, Google, TikTok | Pixcellor",
    description:
      "Performance media with proper tracking, creative testing and full-funnel retargeting across Meta, Google, TikTok and LinkedIn.",
    keywords: [
      "paid ads agency",
      "retargeting campaigns",
      "Meta ads",
      "Google Ads management",
      "performance marketing",
    ],
  },
  "landing-pages": {
    title: "High-Converting Landing Page Design & Build | Pixcellor",
    description:
      "Pixel-perfect landing pages shipped in days. Copy, design, build, A/B testing and CRM integrations. Request a free sample.",
    keywords: [
      "landing page design",
      "landing page agency",
      "conversion rate optimisation",
      "A/B testing landing page",
      "high converting landing page",
    ],
  },
  "animated-sites": {
    title: "Award-Grade Animated Websites — Built in 10 Days | Pixcellor",
    description:
      "Scroll-driven, 3D, 60fps animated websites with agency polish at a fraction of the price. 10-day turnaround. Free sample.",
    keywords: [
      "animated website design",
      "motion design website",
      "scroll animation site",
      "award winning web design",
      "interactive website agency",
    ],
  },
  "full-web-apps": {
    title: "Full-Stack Web App Development Agency | Pixcellor",
    description:
      "React + TypeScript + Postgres web apps with auth, payments, real-time and dashboards. MVP to enterprise, built end to end.",
    keywords: [
      "web app development",
      "full stack agency",
      "React app developer",
      "SaaS MVP development",
      "custom web application",
    ],
  },
  "internal-tools": {
    title: "Custom Internal Tools & Business Automation | Pixcellor",
    description:
      "Bespoke internal tools, automations and AI agents that replace spreadsheets and SaaS subs — often saving £10K+/year.",
    keywords: [
      "internal tools development",
      "business automation",
      "custom dashboard build",
      "no-code alternative",
      "operations tooling",
    ],
  },
  "cyber-security": {
    title: "Managed Cyber-Security, MDR & Compliance | Pixcellor",
    description:
      "Enterprise-grade cyber defence — 24/7 MDR, pen testing, incident response and ISO/SOC/Cyber Essentials readiness — bundled into our retainers.",
    keywords: [
      "managed cyber security UK",
      "MDR managed detection response",
      "penetration testing",
      "incident response retainer",
      "ISO 27001 readiness",
      "Cyber Essentials certification support",
      "vCISO",
    ],
  },
  "crm-systems": {
    title: "Custom CRM & Internal Tools with AI Agents | Pixcellor",
    description:
      "Bespoke CRMs and internal tools designed around how you actually sell and operate, with AI agents handling enrichment, follow-up and admin so nothing slips.",
    keywords: [
      "custom CRM development",
      "internal tools CRM",
      "AI CRM agents",
      "Salesforce alternative",
      "sales pipeline software",
      "CRM build",
    ],
  },
  "ecommerce-stores": {
    title: "Shopify & Custom E-commerce Store Build | Pixcellor",
    description:
      "Conversion-led Shopify and custom stores that survive launch-day stampedes. Klaviyo flows, integrations, performance tuned.",
    keywords: [
      "Shopify agency",
      "ecommerce store build",
      "Shopify development",
      "Klaviyo setup",
      "high traffic ecommerce",
    ],
  },
  "blockchain-integrations": {
    title: "Smart Contracts, dApps & Blockchain Integrations | Pixcellor",
    description:
      "Audited smart contracts, wallet auth, on-chain payments, NFT mints and dApps from a team with 9-figure market caps shipped.",
    keywords: [
      "blockchain development agency",
      "smart contract development",
      "dApp development",
      "Web3 integration",
      "NFT mint build",
    ],
  },
  "recruitment-ats": {
    title: "Recruitment Agency & Custom AI ATS — Flat Fees | Pixcellor",
    description:
      "Top-billing recruiters across tech, healthcare, crypto and construction. Capped 5% on all temporary and permanent placements — or your own AI-agent ATS.",
    keywords: [
      "recruitment agency UK",
      "AI ATS build",
      "flat fee recruitment",
      "tech recruiter",
      "healthcare recruitment",
    ],
  },
  "payroll-hr-tooling": {
    title: "Modern Payroll & HR Tooling — Same-Day Settlement | Pixcellor",
    description:
      "Same-day payroll, multi-currency and crypto payouts, HR self-serve and accounting integrations. Built for teams past spreadsheets.",
    keywords: [
      "payroll software",
      "HR tooling",
      "crypto payroll",
      "same day payroll",
      "non-custodial payroll",
    ],
  },
  "ai-integrations-agents": {
    title: "AI Agents & Custom AI Integrations for Business | Pixcellor",
    description:
      "Bespoke AI agents wired into sales, ops, support and finance — running 24/7 with guardrails, audit logs and human checkpoints.",
    keywords: [
      "AI agents for business",
      "custom AI integration",
      "AI automation agency",
      "LLM workflow build",
      "AI ops automation",
    ],
  },
  "consultations-audits": {
    title: "Operator-Grade Consulting & Business Audits | Pixcellor",
    description:
      "Senior consultants and founders who've built and exited. Brutally honest business, product and GTM audits with action plans.",
    keywords: [
      "business consulting",
      "startup audit",
      "GTM consulting",
      "product audit",
      "founder advisory",
    ],
  },
  "analytics-dashboards": {
    title: "Custom Analytics Dashboards for Your Whole Business | Pixcellor",
    description:
      "Unified dashboards pulling sales, ops, finance and marketing data — real-time cashflow, pipeline and KPIs on one screen.",
    keywords: [
      "analytics dashboard build",
      "business intelligence dashboard",
      "KPI dashboard",
      "data pipeline build",
      "custom BI",
    ],
  },
  "api-third-party": {
    title: "API & Third-Party Integration Specialists | Pixcellor",
    description:
      "REST, GraphQL, webhook and middleware builds so Stripe, HubSpot, Slack, your CRM and warehouse finally talk to each other.",
    keywords: [
      "API integration agency",
      "third party integration",
      "webhook development",
      "Stripe integration",
      "HubSpot integration",
    ],
  },
  "product-project-management": {
    title: "Embedded Product & Project Management | Pixcellor",
    description:
      "Senior PMs embedded in your build — roadmap, sprints, stakeholders and delivery, on time, on scope, on brand.",
    keywords: [
      "fractional product manager",
      "project management agency",
      "embedded PM",
      "delivery management",
      "sprint planning",
    ],
  },
  "email-marketing": {
    title: "Email Marketing Agency — Lifecycle, Broadcast & Deliverability | Pixcellor",
    description:
      "Full-service email marketing on Klaviyo, HubSpot, Mailchimp, Brevo and custom stacks. Lifecycle flows, broadcasts, deliverability and revenue-driven programmes.",
    keywords: [
      "email marketing agency",
      "Klaviyo agency",
      "lifecycle email marketing",
      "email deliverability",
      "email automation",
    ],
  },
  "creative-branding-makeovers": {
    title: "Creative & Branding — Identity & Rebrands | Pixcellor",
    description:
      "Senior creative direction, brand identities, rebrands and full visual makeovers. Logos, guidelines, campaign assets and packaging.",
    keywords: [
      "branding agency",
      "rebrand specialist",
      "logo design",
      "brand identity system",
      "creative direction",
    ],
  },
  "video-3d-animations": {
    title: "Video & 3D Animation Studio — Product, Ads, WebGL | Pixcellor",
    description:
      "Cinematic video, motion graphics and 3D animation for products, ads, explainers and immersive web experiences. Cinema-grade output.",
    keywords: [
      "3D animation studio",
      "product video production",
      "motion graphics agency",
      "WebGL animation",
      "explainer video",
    ],
  },
  "documents-and-decks": {
    title: "Pitch Decks, Sales Decks & Document Design | Pixcellor",
    description:
      "Investor decks, sales decks, proposals and reports — strategy, copy and design in one team. Built to get signed, funded and shared.",
    keywords: [
      "pitch deck design",
      "investor deck agency",
      "sales deck design",
      "proposal design",
      "whitepaper design",
    ],
  },
};
