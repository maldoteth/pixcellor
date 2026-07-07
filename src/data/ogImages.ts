// Per-page Open Graph / social share images.
// Each entry imports a CDN-backed .asset.json pointer.

import home from "@/assets/og/01-home.png.asset.json";
import getStarted from "@/assets/og/02-get-started.png.asset.json";
import packagesImg from "@/assets/og/03-packages.png.asset.json";
import portfolio from "@/assets/og/04-portfolio.png.asset.json";
import services from "@/assets/og/05-services.png.asset.json";
import legal from "@/assets/og/06-legal.png.asset.json";

import pkgRetainerGrowth from "@/assets/og/09-retainer-growth.png.asset.json";
import pkgRetainerScale from "@/assets/og/10-retainer-scale.png.asset.json";
import pkgRetainerEnterprise from "@/assets/og/11-retainer-enterprise.png.asset.json";

import svcTelesales from "@/assets/og/12-telesales-campaigns.png.asset.json";
import svcGtm from "@/assets/og/13-gtm-lead-generation.png.asset.json";
import svcToken from "@/assets/og/14-token-launches.png.asset.json";
import svcSeo from "@/assets/og/15-seo-aeo-optimisation.png.asset.json";
import svcSocial from "@/assets/og/16-social-media-automation.png.asset.json";
import svcPaid from "@/assets/og/17-paid-ads-retargeting.png.asset.json";
import svcCreative from "@/assets/og/18-creative-branding-makeovers.png.asset.json";
import svcLanding from "@/assets/og/19-landing-pages.png.asset.json";
import svcAnimated from "@/assets/og/20-animated-sites.png.asset.json";
import svcWebApps from "@/assets/og/21-full-web-apps.png.asset.json";
import svcInternal from "@/assets/og/22-internal-tools.png.asset.json";
import svcCrm from "@/assets/og/23-crm-systems.png.asset.json";
import svcEcom from "@/assets/og/24-ecommerce-stores.png.asset.json";
import svcBlockchain from "@/assets/og/25-blockchain-integrations.png.asset.json";
import svcVideo from "@/assets/og/26-video-3d-animations.png.asset.json";
import svcRecruit from "@/assets/og/27-recruitment-ats.png.asset.json";
import svcPayroll from "@/assets/og/28-payroll-hr-tooling.png.asset.json";
import svcAi from "@/assets/og/29-ai-integrations-agents.png.asset.json";
import svcConsult from "@/assets/og/30-consultations-audits.png.asset.json";
import svcAnalytics from "@/assets/og/31-analytics-dashboards.png.asset.json";
import svcApi from "@/assets/og/32-api-third-party.png.asset.json";
import svcPm from "@/assets/og/33-product-project-management.png.asset.json";
import svcDocs from "@/assets/og/34-documents-and-decks.png.asset.json";

import legalTerms from "@/assets/og/35-legal-terms.png.asset.json";
import legalPrivacy from "@/assets/og/36-legal-privacy.png.asset.json";
import legalRefund from "@/assets/og/37-legal-refund.png.asset.json";
import legalAcceptable from "@/assets/og/38-legal-acceptable-use.png.asset.json";

const ORIGIN = "https://pixcellor.com";

const toAbsolute = (u: string) =>
  u.startsWith("http") ? u : `${ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;

export const OG_HOME = toAbsolute(home.url);
export const OG_GET_STARTED = toAbsolute(getStarted.url);
export const OG_PACKAGES = toAbsolute(packagesImg.url);
export const OG_PORTFOLIO = toAbsolute(portfolio.url);
export const OG_SERVICES = toAbsolute(services.url);
export const OG_LEGAL = toAbsolute(legal.url);

export const OG_PACKAGE_BY_SLUG: Record<string, string> = {
  "retainer-growth": toAbsolute(pkgRetainerGrowth.url),
  "retainer-scale": toAbsolute(pkgRetainerScale.url),
  "retainer-enterprise": toAbsolute(pkgRetainerEnterprise.url),
};

export const OG_SERVICE_BY_SLUG: Record<string, string> = {
  "telesales-campaigns": toAbsolute(svcTelesales.url),
  "gtm-lead-generation": toAbsolute(svcGtm.url),
  "token-launches": toAbsolute(svcToken.url),
  "seo-aeo-optimisation": toAbsolute(svcSeo.url),
  "social-media-automation": toAbsolute(svcSocial.url),
  "paid-ads-retargeting": toAbsolute(svcPaid.url),
  "creative-branding-makeovers": toAbsolute(svcCreative.url),
  "landing-pages": toAbsolute(svcLanding.url),
  "animated-sites": toAbsolute(svcAnimated.url),
  "full-web-apps": toAbsolute(svcWebApps.url),
  "internal-tools": toAbsolute(svcInternal.url),
  "cyber-security": toAbsolute(svcInternal.url),
  "crm-systems": toAbsolute(svcCrm.url),
  "ecommerce-stores": toAbsolute(svcEcom.url),
  "blockchain-integrations": toAbsolute(svcBlockchain.url),
  "video-3d-animations": toAbsolute(svcVideo.url),
  "recruitment-ats": toAbsolute(svcRecruit.url),
  "payroll-hr-tooling": toAbsolute(svcPayroll.url),
  "ai-integrations-agents": toAbsolute(svcAi.url),
  "consultations-audits": toAbsolute(svcConsult.url),
  "analytics-dashboards": toAbsolute(svcAnalytics.url),
  "api-third-party": toAbsolute(svcApi.url),
  "product-project-management": toAbsolute(svcPm.url),
  "documents-and-decks": toAbsolute(svcDocs.url),
};

export const OG_LEGAL_BY_SLUG: Record<string, string> = {
  terms: toAbsolute(legalTerms.url),
  privacy: toAbsolute(legalPrivacy.url),
  refund: toAbsolute(legalRefund.url),
  "acceptable-use": toAbsolute(legalAcceptable.url),
};
