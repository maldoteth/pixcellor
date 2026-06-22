import { useState } from "react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { COMPARISON_ROWS, COMPARISON_SLUGS, PACKAGE_DETAILS } from "@/data/packages";

const ENTERPRISE_SLUG = "retainer-enterprise";

// Rows whose value triples when Enterprise is on the "Large" tier.
const TRIPLED_FEATURES = new Set(["AI lead-gen runs", "Automated Outreach", "Hosting"]);

// Triple a string like "10,000 / m" → "30,000 / m". Leaves other strings alone.
function tripleLimit(val: string): string {
  const match = val.match(/^([\d,]+)(\s*\/\s*\w+)$/);
  if (!match) return val;
  const n = parseInt(match[1].replace(/,/g, ""), 10);
  if (Number.isNaN(n)) return val;
  return `${(n * 3).toLocaleString("en-GB")}${match[2]}`;
}

export default function PackageCompareTable({
  highlightSlug,
  billing = "monthly",
}: {
  highlightSlug?: string;
  billing?: "monthly" | "yearly";
}) {
  const [enterpriseSize, setEnterpriseSize] = useState<"small" | "large">("small");
  const isLarge = enterpriseSize === "large";

  const valueForCell = (feature: string, slug: string, raw: string): string => {
    if (slug !== ENTERPRISE_SLUG || !isLarge) return raw;
    if (feature === "Fractional C-suite") return "⅓ CTO + CMO";
    if (TRIPLED_FEATURES.has(feature)) return tripleLimit(raw);
    if (feature === "Price") return billing === "yearly" ? "£46,900/yr" : "£4,690/mo";
    return raw;
  };

  const enterprisePriceLabel = isLarge
    ? billing === "yearly"
      ? "£46,900/yr"
      : "£4,690/mo"
    : billing === "yearly" && PACKAGE_DETAILS[ENTERPRISE_SLUG].yearlyPrice
      ? PACKAGE_DETAILS[ENTERPRISE_SLUG].yearlyPrice!
      : PACKAGE_DETAILS[ENTERPRISE_SLUG].price;

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] backdrop-blur-md overflow-hidden">
      {/* Mobile note */}
      <div className="sm:hidden border-b border-foreground/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground/50">
        Scroll horizontally to compare →
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/[0.04]">
              <th className="sticky left-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4 text-[11px] uppercase tracking-[0.18em] text-foreground/50 font-medium">
                Feature
              </th>
              {COMPARISON_SLUGS.map((slug) => {
                const pkg = PACKAGE_DETAILS[slug];
                const active = slug === highlightSlug;
                const isEnterprise = slug === ENTERPRISE_SLUG;
                const priceLabel = isEnterprise
                  ? enterprisePriceLabel
                  : billing === "yearly" && pkg.yearlyPrice
                    ? pkg.yearlyPrice
                    : pkg.price;
                return (
                  <th
                    key={slug}
                    className={`relative px-3 py-4 align-bottom min-w-[140px] ${active ? "bg-foreground/[0.06]" : ""}`}
                  >
                    {isEnterprise && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEnterpriseSize(isLarge ? "small" : "large");
                        }}
                        aria-label={isLarge ? "Switch to Small enterprise tier" : "Switch to Large enterprise tier"}
                        aria-pressed={isLarge}
                        className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-foreground/20 bg-foreground/[0.06] text-foreground/70 hover:text-foreground hover:bg-foreground/[0.12] transition-colors"
                      >
                        {isLarge ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      </button>
                    )}
                    <Link to={`/packages/${slug}`} className="block hover:opacity-90">
                      <div className={`text-[10px] uppercase tracking-[0.18em] mb-1 ${active ? "text-foreground/80" : "text-foreground/50"}`}>
                        {pkg.mode === "subscription" ? "Retainer" : "One-off"}
                      </div>
                      <div className="text-sm font-semibold">
                        {pkg.name}
                        {isEnterprise && isLarge && (
                          <span className="ml-1 inline-flex items-center align-middle text-foreground/60">
                            <Plus className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-base font-bold">{priceLabel}</div>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.feature} className="border-b border-foreground/5 last:border-0">
                <td className="sticky left-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 text-foreground/80 font-medium whitespace-nowrap">
                  {row.feature}
                </td>
                {COMPARISON_SLUGS.map((slug) => {
                  const raw = row.values[slug];
                  const val = valueForCell(row.feature, slug, raw ?? "");
                  const active = slug === highlightSlug;
                  const isEmpty = val === "—" || !val;
                  return (
                    <td
                      key={slug}
                      className={`px-3 py-3 align-top ${active ? "bg-foreground/[0.05]" : ""} ${isEmpty ? "text-foreground/40" : "text-foreground/90"}`}
                    >
                      <div className="flex items-start gap-2">
                        {isEmpty ? (
                          <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/30" />
                        ) : (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
                        )}
                        <span className="text-xs leading-snug">{val}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="sticky left-0 z-10 bg-background/80 backdrop-blur-md px-4 py-4" />
              {COMPARISON_SLUGS.map((slug) => {
                const active = slug === highlightSlug;
                return (
                  <td key={slug} className={`px-3 py-4 ${active ? "bg-foreground/[0.05]" : ""}`}>
                    <Link
                      to={`/packages/${slug}`}
                      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-semibold text-foreground/80 hover:text-foreground"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
