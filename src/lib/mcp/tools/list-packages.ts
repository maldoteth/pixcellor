import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const PACKAGES = [
  { slug: "full-works", name: "Full Works", price: "£1,500", billing: "one-off", blurb: "Full brochure/marketing site with brand kit, up to 8 pages, animations, SEO baseline." },
  { slug: "elite", name: "Elite", price: "£3,500", billing: "one-off", blurb: "Premium animated site or lightweight web app — bespoke design, custom components, deep SEO/AEO." },
  { slug: "retainer-growth", name: "Retainer — Growth", price: "£1,500/mo", billing: "monthly", blurb: "Always-on dev + marketing sprints for small teams shipping weekly." },
  { slug: "retainer-scale", name: "Retainer — Scale", price: "£3,500/mo", billing: "monthly", blurb: "Dedicated squad for scaling products: features, ads, CRO, and analytics." },
  { slug: "retainer-enterprise", name: "Retainer — Enterprise", price: "£7,500/mo", billing: "monthly", blurb: "Full multi-discipline team embedded with your business, SLA-backed." },
];

export default defineTool({
  name: "list_packages",
  title: "List Pixcellor packages",
  description: "List Pixcellor's public packages (one-off builds and monthly retainers) with price and short description.",
  inputSchema: {
    billing: z.enum(["one-off", "monthly"]).optional().describe("Filter by billing type."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ billing }) => {
    const items = billing ? PACKAGES.filter((p) => p.billing === billing) : PACKAGES;
    const text = items.map((p) => `• ${p.name} — ${p.price} (${p.billing})\n  ${p.blurb}\n  https://pixcellor.com/packages/${p.slug}`).join("\n\n");
    return {
      content: [{ type: "text", text: text || "No packages found." }],
      structuredContent: { packages: items },
    };
  },
});
