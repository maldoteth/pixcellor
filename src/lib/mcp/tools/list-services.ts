import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

// Compact static catalog — kept in this file so the MCP entry stays
// import-safe (no image/lucide imports from src/data).
const SERVICES = [
  { slug: "telesales-campaigns", category: "marketing", name: "Telesales campaigns", info: "Recorded outbound calling at £22/hr with your own CRM." },
  { slug: "gtm-lead-generation", category: "marketing", name: "GTM & lead generation", info: "Full go-to-market strategy and pipeline build." },
  { slug: "token-launches", category: "marketing", name: "Token launches", info: "End-to-end crypto/token launch marketing." },
  { slug: "seo-aeo-optimisation", category: "marketing", name: "SEO & AEO optimisation", info: "Rank in Google and answer engines (ChatGPT, Perplexity)." },
  { slug: "social-media-automation", category: "marketing", name: "Social media automation", info: "Automated multi-channel posting and engagement." },
  { slug: "paid-ads-retargeting", category: "marketing", name: "Paid ads & retargeting", info: "Meta, Google, TikTok ads with retargeting funnels." },
  { slug: "creative-branding-makeovers", category: "marketing", name: "Creative branding makeovers", info: "Complete brand identity rebuilds." },
  { slug: "landing-pages", category: "tech", name: "Landing pages", info: "High-converting single pages with A/B tests." },
  { slug: "animated-sites", category: "tech", name: "Animated sites", info: "Award-worthy sites with motion and 3D." },
  { slug: "full-web-apps", category: "tech", name: "Full web apps", info: "Custom SaaS/web apps from MVP to scale." },
  { slug: "internal-tools", category: "tech", name: "Internal tools", info: "Bespoke ops dashboards and admin panels." },
  { slug: "crm-systems", category: "tech", name: "CRM systems", info: "Custom CRMs tailored to your workflow." },
  { slug: "ecommerce-stores", category: "tech", name: "Ecommerce stores", info: "Shopify/custom stores with conversion optimisation." },
  { slug: "blockchain-integrations", category: "tech", name: "Blockchain integrations", info: "Web3, wallet, and smart contract integrations." },
  { slug: "video-3d-animations", category: "tech", name: "Video & 3D animations", info: "Product videos, explainers, 3D scenes." },
  { slug: "recruitment-ats", category: "business", name: "Recruitment / ATS", info: "Applicant tracking systems and portals." },
  { slug: "payroll-hr-tooling", category: "business", name: "Payroll & HR tooling", info: "Construction payroll: HMRC compliance, 1% wage-bill cashback, cash-flow boost." },
  { slug: "ai-integrations-agents", category: "business", name: "AI integrations & agents", info: "Custom AI agents wired into your stack." },
  { slug: "consultations-audits", category: "business", name: "Consultations & audits", info: "Technical/growth audits with actionable roadmap." },
  { slug: "analytics-dashboards", category: "business", name: "Analytics dashboards", info: "Unified BI dashboards across data sources." },
  { slug: "api-third-party", category: "business", name: "API & third-party integrations", info: "Connect any two systems." },
  { slug: "product-project-management", category: "business", name: "Product & project management", info: "Fractional PM/PO leadership." },
  { slug: "documents-and-decks", category: "business", name: "Documents & decks", info: "Investor decks, proposals, brand collateral." },
];

export default defineTool({
  name: "list_services",
  title: "List Pixcellor services",
  description: "List Pixcellor's services (marketing, tech, business) with a one-line description of each. Optionally filter by category.",
  inputSchema: {
    category: z.enum(["marketing", "tech", "business"]).optional().describe("Filter by service category."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const items = category ? SERVICES.filter((s) => s.category === category) : SERVICES;
    const text = items.map((s) => `• ${s.name} (${s.category}) — ${s.info}\n  https://pixcellor.com/services/${s.slug}`).join("\n");
    return {
      content: [{ type: "text", text: text || "No services found." }],
      structuredContent: { services: items },
    };
  },
});
