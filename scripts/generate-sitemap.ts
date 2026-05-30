// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Writes public/sitemap.xml with today's date for lastmod on every run.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://pixcellor.com";
const today = new Date().toISOString().split("T")[0];

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const serviceSlugs = [
  "telesales-campaigns",
  "gtm-lead-generation",
  "token-launches",
  "seo-aeo-optimisation",
  "social-media-automation",
  "paid-ads-retargeting",
  "landing-pages",
  "animated-sites",
  "full-web-apps",
  "internal-tools",
  "crm-systems",
  "ecommerce-stores",
  "blockchain-integrations",
  "recruitment-ats",
  "payroll-hr-tooling",
  "ai-integrations-agents",
  "consultations-audits",
  "analytics-dashboards",
  "api-third-party",
  "product-project-management",
];

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/services", changefreq: "weekly", priority: "0.9" },
  ...serviceSlugs.map((slug) => ({
    path: `/services/${slug}`,
    changefreq: "monthly" as const,
    priority: "0.8",
  })),
  { path: "/legal", changefreq: "monthly", priority: "0.4" },
  { path: "/legal/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/legal/privacy", changefreq: "monthly", priority: "0.3" },
  { path: "/legal/refund", changefreq: "monthly", priority: "0.3" },
  { path: "/legal/acceptable-use", changefreq: "monthly", priority: "0.3" },
];

function generateSitemap(items: SitemapEntry[]) {
  const urls = items.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    ``,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries, lastmod=${today})`);
