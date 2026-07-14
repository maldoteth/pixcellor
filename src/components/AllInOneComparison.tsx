import { Check } from "lucide-react";
import pixcellorWordmark from "@/assets/pixcellor-wordmark-white.png";

// "One subscription replaces your entire stack" table.
// Mirrors the classic all-in-one comparison: each capability lists the tools it
// replaces, the combined monthly cost of buying them separately, and that it is
// simply included with Pixcellor.
//
// Logos: each competitor renders as a uniform brand-coloured chip. To upgrade a
// brand to its real logo, drop a file at src/assets/replaces/<slug>.svg and swap
// the chip for an <img> — the data shape already carries a stable `name`.

type Tool = { name: string; color: string };
type Row = {
  feature: string;
  tools: Tool[];
  price: string; // combined "other tools" cost, £/mo
  unique?: boolean; // "unique to Pixcellor" styling
};

const ROWS: Row[] = [
  {
    feature: "CRM & Pipeline Management",
    tools: [
      { name: "HubSpot", color: "#FF7A59" },
      { name: "ActiveCampaign", color: "#356AE6" },
    ],
    price: "£79",
  },
  {
    feature: "Unlimited Sales Funnels",
    tools: [
      { name: "ClickFunnels", color: "#6C5CE7" },
      { name: "Leadpages", color: "#2E9CCA" },
    ],
    price: "£235",
  },
  {
    feature: "Website Builder",
    tools: [
      { name: "WordPress", color: "#3499CD" },
      { name: "Squarespace", color: "#B9B9B9" },
      { name: "Wix", color: "#0C6EFC" },
    ],
    price: "£23",
  },
  {
    feature: "Ecommerce",
    tools: [
      { name: "Shopify", color: "#95BF47" },
      { name: "WooCommerce", color: "#96588A" },
    ],
    price: "£31",
  },
  {
    feature: "Surveys & Forms",
    tools: [
      { name: "Jotform", color: "#FF6100" },
      { name: "Typeform", color: "#C0C0C0" },
      { name: "Wufoo", color: "#E8453C" },
    ],
    price: "£63",
  },
  {
    feature: "Email Marketing",
    tools: [
      { name: "Mailchimp", color: "#FFE01B" },
      { name: "Constant Contact", color: "#1E5BD6" },
      { name: "HubSpot", color: "#FF7A59" },
    ],
    price: "£79",
  },
  {
    feature: "2-Way SMS Marketing",
    tools: [
      { name: "Skipio", color: "#00B4D8" },
      { name: "Podium", color: "#5B4BFF" },
      { name: "Sendlane", color: "#2BB673" },
    ],
    price: "£79",
  },
  {
    feature: "Booking & Appointments",
    tools: [
      { name: "Calendly", color: "#006BFF" },
      { name: "Acuity Scheduling", color: "#3A6EA5" },
    ],
    price: "£23",
  },
  {
    feature: "Workflow Automations",
    tools: [
      { name: "Keap", color: "#4BA82E" },
      { name: "ActiveCampaign", color: "#356AE6" },
      { name: "HubSpot", color: "#FF7A59" },
    ],
    price: "£135",
  },
  {
    feature: "AI Voice Agent",
    tools: [
      { name: "Air", color: "#7C4DFF" },
      { name: "Synthflow", color: "#6E56CF" },
    ],
    price: "£159",
  },
  {
    feature: "AI Content & Chat",
    tools: [
      { name: "Jasper", color: "#FF5C35" },
      { name: "Drift", color: "#2F7BF6" },
    ],
    price: "£79",
  },
  {
    feature: "Ad Management",
    tools: [
      { name: "AdEspresso", color: "#E5372A" },
      { name: "Madgicx", color: "#00C2A8" },
    ],
    price: "£39",
  },
  {
    feature: "SEO & Local Listings",
    tools: [
      { name: "Yext", color: "#0F62FE" },
      { name: "BrightLocal", color: "#FDBB30" },
    ],
    price: "£79",
  },
  {
    feature: "Courses & Products",
    tools: [
      { name: "Kajabi", color: "#0086FF" },
      { name: "Teachable", color: "#2C88FF" },
    ],
    price: "£79",
  },
  {
    feature: "Communities",
    tools: [
      { name: "Skool", color: "#DADADA" },
      { name: "Mighty Networks", color: "#7C3AED" },
      { name: "Circle", color: "#6A6DF4" },
    ],
    price: "£71",
  },
  {
    feature: "Call Tracking",
    tools: [
      { name: "CallRail", color: "#009CDE" },
      { name: "CallTrackingMetrics", color: "#3E5BA9" },
    ],
    price: "£39",
  },
  {
    feature: "Reputation Management",
    tools: [
      { name: "Birdeye", color: "#F5811F" },
      { name: "Podium", color: "#5B4BFF" },
    ],
    price: "£127",
  },
  {
    feature: "Tracking & Analytics",
    tools: [{ name: "AgencyAnalytics", color: "#00C08B" }],
    price: "£39",
  },
  {
    feature: "Document Signing",
    tools: [
      { name: "Docusign", color: "#F2C438" },
      { name: "PandaDoc", color: "#37D275" },
    ],
    price: "£37",
  },
  {
    feature: "Gray-labeled Mobile App",
    tools: [],
    price: "£39",
    unique: true,
  },
];

const TOTAL = "£1,534";
const PIXCELLOR_PRICE = "from £89";

function ToolChip({ tool }: { tool: Tool }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/85 whitespace-nowrap">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tool.color }}
      />
      {tool.name}
    </span>
  );
}

function IncludedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
      <Check className="h-3 w-3" strokeWidth={3} />
      Included
    </span>
  );
}

export default function AllInOneComparison() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      {/* Mobile scroll hint */}
      <div className="sm:hidden border-b border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
        Scroll horizontally to compare →
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left align-middle">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04]">
              <th className="sticky left-0 z-10 bg-black/70 backdrop-blur-md px-4 sm:px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
                Features
              </th>
              <th className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium">
                Replaces
              </th>
              <th className="px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-white/45 font-medium whitespace-nowrap">
                Other tools
              </th>
              <th className="px-4 py-4 text-right">
                <span className="inline-flex items-center gap-2">
                  <img
                    src={pixcellorWordmark}
                    alt="Pixcellor"
                    className="h-4 w-auto opacity-95"
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.feature} className="border-b border-white/[0.06] last:border-0">
                <td className="sticky left-0 z-10 bg-black/70 backdrop-blur-md px-4 sm:px-5 py-4 text-sm font-medium text-white/90 whitespace-nowrap">
                  {row.feature}
                </td>
                <td className="px-4 py-4">
                  {row.unique ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                      Unique to Pixcellor
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.tools.map((t, i) => (
                        <ToolChip key={`${t.name}-${i}`} tool={t} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm text-white/50 line-through decoration-white/25">
                    {row.price}
                  </span>
                  <span className="ml-1 text-[11px] text-white/35">/mo</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <IncludedBadge />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/[0.04]">
              <td className="sticky left-0 z-10 bg-black/80 backdrop-blur-md px-4 sm:px-5 py-5 text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
                Overall price
              </td>
              <td className="px-4 py-5" />
              <td className="px-4 py-5 whitespace-nowrap">
                <span className="text-lg font-semibold text-white/50 line-through decoration-white/25">
                  {TOTAL}
                </span>
                <span className="ml-1 text-xs text-white/35">/mo</span>
              </td>
              <td className="px-4 py-5 text-right">
                <span className="inline-flex items-baseline gap-1 rounded-lg bg-white px-3 py-1.5 text-black">
                  <span className="text-base font-bold">{PIXCELLOR_PRICE}</span>
                  <span className="text-[11px] font-medium">/mo</span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
