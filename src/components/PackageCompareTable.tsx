import { ArrowRight, Check, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { COMPARISON_ROWS, COMPARISON_SLUGS, PACKAGE_DETAILS } from "@/data/packages";

export default function PackageCompareTable({ highlightSlug }: { highlightSlug?: string }) {
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
                return (
                  <th
                    key={slug}
                    className={`px-3 py-4 align-bottom min-w-[140px] ${active ? "bg-foreground/[0.06]" : ""}`}
                  >
                    <Link
                      to={`/packages/${slug}`}
                      className="block hover:opacity-90"
                    >
                      <div className={`text-[10px] uppercase tracking-[0.18em] mb-1 ${active ? "text-foreground/80" : "text-foreground/50"}`}>
                        {pkg.mode === "subscription" ? "Retainer" : "One-off"}
                      </div>
                      <div className="text-sm font-semibold">{pkg.name}</div>
                      <div className="mt-1 text-base font-bold">{pkg.price}</div>
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
                  const val = row.values[slug];
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
