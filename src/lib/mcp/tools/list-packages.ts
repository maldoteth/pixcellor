import { defineTool } from "@lovable.dev/mcp-js";

const PACKAGES = [
  { slug: "retainer-growth", name: "Growth", price: "£89/mo", billing: "monthly", blurb: "Website + unlimited edits, CRM, AI lead/support bots, hosting and monthly analytics — for small teams." },
  { slug: "retainer-scale", name: "Scale", price: "£479/mo", billing: "monthly", blurb: "Everything in Growth plus unlimited seats, priority 24/7 support, custom AI agents and monthly strategy calls." },
  { slug: "retainer-enterprise", name: "Enterprise", price: "£2,469/mo", billing: "monthly", blurb: "Fractional CTO & CMO, dedicated dev/ops squad, weekly MVP sprints and 24/7 priority support." },
];

export default defineTool({
  name: "list_packages",
  title: "List Pixcellor packages",
  description: "List Pixcellor's public retainer packages (Growth, Scale, Enterprise) with price and short description.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const text = PACKAGES.map((p) => `• ${p.name} — ${p.price} (${p.billing})\n  ${p.blurb}\n  https://pixcellor.com/packages/${p.slug}`).join("\n\n");
    return {
      content: [{ type: "text", text }],
      structuredContent: { packages: PACKAGES },
    };
  },
});
