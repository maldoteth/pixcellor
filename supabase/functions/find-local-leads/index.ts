/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const THUNDERBIT_V1 = "https://openapi.thunderbit.com/openapi/v1";
const CHECKATRADE_HOST_RE = /(^|\.)checkatrade\.com$/i;
// Known directory/listing hosts — used for platform recognition + to identify "not a real own-domain" sources
const DIRECTORY_HOSTS = [
  "checkatrade.com", "yell.com", "tripadvisor.co.uk", "tripadvisor.com",
  "restaurantguru.com", "trustatrader.com", "ratedpeople.com", "mybuilder.com",
  "bark.com", "facebook.com", "instagram.com", "google.com", "goo.gl",
  "maps.google.com", "bing.com", "apple.com", "nextdoor.co.uk", "nextdoor.com",
  "thomsonlocal.com", "cylex-uk.co.uk", "hotfrog.co.uk", "freeindex.co.uk",
  "scoot.co.uk", "yelp.com", "yelp.co.uk", "192.com", "tupalo.co.uk",
  "opendi.co.uk", "brownbook.net", "linkedin.com", "x.com", "twitter.com",
  "tiktok.com", "youtube.com",
];
// Hosts to outright reject as "source" — junk, infra, news, encyclopedia
const EXCLUDED_HOSTS = new Set([
  "wikipedia.org", "wikimedia.org", "wiktionary.org",
  "bbc.co.uk", "bbc.com", "theguardian.com", "dailymail.co.uk", "telegraph.co.uk",
  "indeed.com", "indeed.co.uk", "reed.co.uk", "totaljobs.com", "glassdoor.com",
  "gov.uk", "parliament.uk", "europa.eu",
  "schema.org", "w3.org", "gstatic.com", "googleapis.com", "googletagmanager.com",
  "google-analytics.com", "doubleclick.net", "cloudfront.net", "cookielaw.org",
  "onetrust.com", "sentry.io", "stripe.com", "microsoft.com",
  "amazon.com", "amazon.co.uk", "ebay.co.uk", "ebay.com",
  "reddit.com", "quora.com", "pinterest.com", "pinterest.co.uk",
  "trustpilot.com",
]);
const IGNORED_EXTERNAL_HOSTS = new Set([
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "google.com",
  "goo.gl",
  "maps.google.com",
  "wa.me",
  "whatsapp.com",
  "yell.com",
  "trustatrader.com",
  "ratedpeople.com",
  "mybuilder.com",
  "bark.com",
  "checkatrade.com",
  "schema.org",
  "w3.org",
  "gstatic.com",
  "googleapis.com",
  "googletagmanager.com",
  "google-analytics.com",
  "doubleclick.net",
  "cloudfront.net",
  "cookielaw.org",
  "onetrust.com",
  "sentry.io",
  "stripe.com",
  "apple.com",
  "microsoft.com",
]);

type Candidate = {
  name: string;
  trade?: string;
  industry?: string;
  phone?: string;
  email?: string;
  location?: string;
  source_url?: string;
  source_platform?: string;
  evidence?: string;
  has_standalone_website?: boolean;
  website_url?: string;
  social_url?: string;
  website_status?: string;
  lead_score?: number;
  lead_score_reason?: string;
};

type SearchResult = {
  url: string;
  title: string;
  description: string;
  markdown: string;
};

type ScrapedPage = {
  url: string;
  title: string;
  markdown: string;
  html: string;
  links: string[];
  statusCode: number;
};

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const cleanEmail = (value: unknown) => {
  const email = cleanText(value, 255).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const normalize = (value: unknown) => cleanText(value, 200).toLowerCase().replace(/[^a-z0-9]+/g, "");
const normalizePhone = (value: unknown) => cleanText(value, 40).replace(/\D/g, "");
const unique = <T,>(items: T[]) => [...new Set(items)];
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function cleanCompanyName(value: unknown, trade: string, location: string) {
  let name = cleanText(value, 180)
    .replace(/\s*\|\s*Checkatrade.*$/i, "")
    .replace(/\s*-\s*Checkatrade.*$/i, "")
    .replace(/^reviews?\s+for\s+/i, "")
    .trim();

  const tradeText = cleanText(trade, 80);
  const locationText = cleanText(location, 120);
  const tradePattern = tradeText ? escapeRegExp(tradeText).replace(/s$/i, "s?") : "";
  const locationPattern = locationText ? escapeRegExp(locationText) : "";
  const noisyPart = new RegExp(
    ["checkatrade", tradePattern, locationPattern, "\\b(?:in|near|based in|serving|covering)\\b"].filter(Boolean).join("|"),
    "i",
  );

  const parts = name.split(/\s+(?:\||-|–|—)\s+|\s*,\s+/).map((part) => cleanText(part, 120)).filter(Boolean);
  const cleanPart = parts.find((part) => !noisyPart.test(part));
  if (cleanPart) name = cleanPart;

  if (tradePattern && locationPattern) {
    name = name
      .replace(new RegExp(`\\s*(?:,|\\||-|–|—)?\\s*${tradePattern}\\s*(?:in|near|around|based in|serving|covering)?\\s*${locationPattern}\\s*$`, "i"), "")
      .replace(new RegExp(`^\\s*${tradePattern}\\s*(?:in|near|around|based in|serving|covering)\\s*${locationPattern}\\s*(?:,|\\||-|–|—)?\\s*`, "i"), "");
  }
  if (locationPattern) {
    name = name.replace(new RegExp(`\\s*(?:,|\\||-|–|—)?\\s*(?:in|near|around|based in|serving|covering)\\s*${locationPattern}\\s*$`, "i"), "");
  }
  if (tradePattern) {
    name = name.replace(new RegExp(`\\s*(?:,|\\||-|–|—)?\\s*${tradePattern}\\s*$`, "i"), "");
  }

  return cleanText(name.replace(/\s+(?:,|\||-|–|—)\s*$/g, ""), 100);
}

function inferIndustry(value: unknown) {
  const text = cleanText(value, 400).toLowerCase();
  if (/(electrician|electrical|roofer|roofing|plumber|plumbing|builder|building|construction|carpenter|joiner|decorator|painter|landscap|driveway|window|glazing|heating|gas engineer|tiler|flooring|brick|scaffold|bathroom|kitchen fitter)/i.test(text)) return "construction";
  if (/(restaurant|cafe|bar|pub|hotel|catering|takeaway|hospitality|food)/i.test(text)) return "hospitality";
  if (/(salon|barber|beauty|spa|aesthetic|nail|hair)/i.test(text)) return "beauty";
  if (/(gym|fitness|personal trainer|physio|clinic|health|dentist|medical)/i.test(text)) return "healthcare";
  if (/(estate agent|property|letting|mortgage|real estate)/i.test(text)) return "property";
  if (/(accountant|solicitor|lawyer|consultant|finance|insurance)/i.test(text)) return "professional services";
  if (/(shop|retail|boutique|ecommerce|e-commerce|store)/i.test(text)) return "retail";
  if (/(mechanic|garage|mot|vehicle|car dealer|automotive)/i.test(text)) return "automotive";
  return "general";
}

function isCheckatradeUrl(rawUrl: unknown) {
  try {
    const parsed = new URL(cleanText(rawUrl, 1000));
    return CHECKATRADE_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

function getSourcePlatform(rawUrl: unknown) {
  try {
    const host = new URL(cleanText(rawUrl, 1000)).hostname.replace(/^www\./i, "").toLowerCase();
    if (host.includes("checkatrade")) return "Checkatrade";
    if (host.includes("yell")) return "Yell";
    if (host.includes("tripadvisor")) return "Tripadvisor";
    if (host.includes("restaurantguru")) return "Restaurant Guru";
    if (host.includes("trustatrader")) return "TrustATrader";
    if (host.includes("ratedpeople")) return "Rated People";
    if (host.includes("mybuilder")) return "MyBuilder";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("google.com/maps") || host === "maps.google.com" || host.includes("google.com")) return "Google Maps";
    if (host.includes("bing.com")) return "Bing";
    if (host.includes("apple.com")) return "Apple Maps";
    if (host.includes("nextdoor")) return "Nextdoor";
    if (host.includes("thomsonlocal")) return "Thomson Local";
    if (host.includes("cylex")) return "Cylex";
    if (host.includes("hotfrog")) return "Hotfrog";
    if (host.includes("freeindex")) return "FreeIndex";
    if (host.includes("scoot")) return "Scoot";
    if (host.includes("yelp")) return "Yelp";
    if (host.includes("192.com")) return "192.com";
    if (host.includes("linkedin")) return "LinkedIn";
    return host.split(".")[0]?.replace(/\b\w/g, (c) => c.toUpperCase()) || "Web";
  } catch {
    return "Web";
  }
}

// Accept any http(s) URL except clearly junk hosts. Replaces the old directory whitelist.
function isAcceptedSourceUrl(rawUrl: unknown) {
  try {
    const parsed = new URL(cleanText(rawUrl, 1000));
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (!host || host.length < 4) return false;
    for (const blocked of EXCLUDED_HOSTS) {
      if (host === blocked || host.endsWith(`.${blocked}`)) return false;
    }
    // Block obvious asset/infra hosts
    if (/cdn|assets|static|fonts|analytics|tracking|tagmanager|cookie|consent/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

// True if this URL is a directory/social/maps listing rather than a company's own website
function isDirectoryHost(rawUrl: unknown) {
  try {
    const host = new URL(cleanText(rawUrl, 1000)).hostname.replace(/^www\./i, "").toLowerCase();
    return DIRECTORY_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalizeUrl(rawUrl: unknown, base = "https://www.checkatrade.com") {
  const value = cleanText(rawUrl, 1000);
  if (!value) return "";
  try {
    const parsed = new URL(value, base);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function isLikelyProfileUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.toLowerCase();
    if (!isAcceptedSourceUrl(rawUrl)) return false;
    if (!CHECKATRADE_HOST_RE.test(url.hostname)) return !/(search|find|category|categories|near-me|best-|things-to-do|restaurants$|pubs$|cafes$)/i.test(path);
    return path.includes("/trades/") || path.includes("/trade/") || path.includes("/profile/");
  } catch {
    return false;
  }
}

function isIgnoredExternalHost(hostname: string) {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return [...IGNORED_EXTERNAL_HOSTS].some((ignored) => host === ignored || host.endsWith(`.${ignored}`));
}

function looksLikeInfrastructureOrAssetUrl(parsed: URL) {
  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (isIgnoredExternalHost(host)) return true;
  if (/\.(?:png|jpe?g|webp|gif|svg|ico|css|js|json|woff2?|ttf|map)(?:$|[?#])/i.test(path)) return true;
  if (/cdn|assets|static|images|fonts|analytics|tracking|tagmanager|cookie|consent/.test(host)) return true;
  return false;
}

function hasWebsiteContext(link: string, combined: string) {
  const escaped = link.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contextMatch = combined.match(new RegExp(`.{0,140}${escaped}.{0,140}`, "i"))?.[0] ?? "";
  return /website|web site|visit site|visit website|company site|external site|business website|profile-website|websiteurl/i.test(contextMatch);
}

function extractWebsiteButtonLinks(page: ScrapedPage) {
  const explicitLinks: string[] = [];
  const combined = `${page.markdown}\n${page.html}`;

  for (const match of combined.matchAll(/\[[^\]]*(?:website|visit site|web site|company site|business website)[^\]]*\]\(([^)]+)\)/gi)) {
    explicitLinks.push(match[1]);
  }

  for (const match of combined.matchAll(/<a\b([^>]*?href=["']([^"']+)["'][^>]*)>([\s\S]{0,240}?)<\/a>/gi)) {
    const attrs = match[1] ?? "";
    const href = match[2] ?? "";
    const label = `${attrs} ${match[3] ?? ""}`.replace(/<[^>]+>/g, " ");
    if (/website|web site|visit site|visit website|company site|business website|profile-website|websiteurl/i.test(label) && !/share|save|favourite|favorite/i.test(label)) {
      explicitLinks.push(href);
    }
  }

  for (const match of combined.matchAll(/<(?:button|span|div)[^>]*(?:website|visit site|web site)[^>]*>[\s\S]{0,300}?<a[^>]+href=["']([^"']+)["']/gi)) {
    explicitLinks.push(match[1]);
  }

  for (const match of combined.matchAll(/https?:\/\/[^\s)"'<>]+/gi)) {
    const raw = match[0];
    if (hasWebsiteContext(raw, combined)) explicitLinks.push(raw);
  }

  return unique(explicitLinks.map((link) => normalizeUrl(link, page.url)).filter(Boolean));
}

function externalWebsiteLinks(page: ScrapedPage) {
  const explicitLinks = extractWebsiteButtonLinks(page);
  const combined = `${page.markdown}\n${page.html}`;

  return unique(explicitLinks).filter((link) => {
    try {
      const parsed = new URL(link);
      if (!["http:", "https:"].includes(parsed.protocol)) return false;
      if (CHECKATRADE_HOST_RE.test(parsed.hostname)) return false;
      if (/mailto:|tel:/i.test(link)) return false;
      if (looksLikeInfrastructureOrAssetUrl(parsed)) return false;
      return hasWebsiteContext(link, combined) || extractWebsiteButtonLinks(page).includes(link);
    } catch {
      return false;
    }
  });
}

function extractPhones(text: string) {
  const matches = text.match(/(?:\+44\s?\(?0?\)?|0)(?:\d[\s().-]?){9,11}\d/g) ?? [];
  return unique(matches.map((phone) => phone.replace(/\s+/g, " ").trim())).filter((phone) => normalizePhone(phone).length >= 10);
}

function extractEmails(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return unique(matches.map((email) => cleanEmail(email)).filter(Boolean));
}

function extractProfileUrls(results: SearchResult[], pages: ScrapedPage[]) {
  const urls: string[] = [];
  for (const result of results) if (isLikelyProfileUrl(result.url)) urls.push(result.url);
  for (const page of pages) {
    for (const link of page.links) {
      const normalized = normalizeUrl(link, page.url);
      if (isLikelyProfileUrl(normalized)) urls.push(normalized);
    }
    for (const match of `${page.markdown}\n${page.html}`.matchAll(/https?:\/\/[^\s)"'<>]+checkatrade\.com[^\s)"'<>]+/gi)) {
      const normalized = normalizeUrl(match[0]);
      if (isLikelyProfileUrl(normalized)) urls.push(normalized);
    }
  }
  return unique(urls).slice(0, 80);
}

function guessBusinessName(page: ScrapedPage, trade: string, location: string) {
  const title = cleanCompanyName(page.title, trade, location);
  if (title && !/checkatrade|find a tradesperson|search results/i.test(title)) return cleanText(title, 100);
  const heading = page.markdown.match(/^#\s+(.+)$/m)?.[1] ?? page.markdown.match(/^##\s+(.+)$/m)?.[1] ?? "";
  return cleanCompanyName(heading, trade, location);
}

async function parseCandidateFromProfile(page: ScrapedPage, trade: string, location: string, apiKey: string, opts?: { skipVerify?: boolean }): Promise<Candidate | null> {
  const text = `${page.title}\n${page.markdown}\n${page.html}`;
  const name = guessBusinessName(page, trade, location);
  if (!name || /checkatrade|find a tradesperson|search results|reviews for/i.test(name)) return null;

  const linkedWebsites = externalWebsiteLinks(page);
  const phones = extractPhones(text);
  const emails = extractEmails(text).filter((email) => !email.endsWith("@checkatrade.com"));
  const linkedSocial = page.links.find((link) => /facebook\.com|instagram\.com/i.test(link)) ?? "";
  const sourcePlatform = getSourcePlatform(page.url);

  // Decide whether we even need to call Firecrawl again to verify the website
  const sourceIsSocial = /facebook|instagram/i.test(sourcePlatform);
  const sourceIsOwnDomain = !isDirectoryHost(page.url) && !sourceIsSocial;
  const linkedOwnDomain = linkedWebsites.find((u) => !isDirectoryHost(u));

  let verified = { ownDomainUrl: "", socialUrl: "" };
  if (!opts?.skipVerify && !linkedOwnDomain && !sourceIsOwnDomain && !sourceIsSocial) {
    verified = await verifyOwnWebsite(apiKey, name, location);
  }

  const ownDomainUrl = linkedOwnDomain || (sourceIsOwnDomain ? page.url : "") || verified.ownDomainUrl || "";
  const socialUrl = linkedSocial || (sourceIsSocial ? page.url : "") || verified.socialUrl || "";

  const websiteStatus = ownDomainUrl ? "has_website" : socialUrl ? "social_only" : "no_website_found";
  const onGoogleMaps = sourcePlatform === "Google Maps";
  let score = 50;
  if (!ownDomainUrl) score += 40;
  else score -= 25;
  if (!ownDomainUrl && socialUrl) score += 25;
  if (phones[0]) score += 15;
  if (emails[0]) score += 10;
  if (onGoogleMaps) score += 5;
  score = Math.min(100, Math.max(10, score));

  const evidence = cleanText(
    page.markdown.split("\n").find((line) => /website|phone|contact|about|services|based|menu|booking|reviews|address/i.test(line) && line.length > 30) ??
      `${sourcePlatform} listing inspected for ${name}.`,
    220,
  );

  return {
    name,
    trade,
    industry: inferIndustry(`${trade} ${name} ${page.markdown.slice(0, 800)}`),
    phone: phones[0] ?? "",
    email: emails[0] ?? "",
    location,
    source_url: page.url,
    source_platform: sourcePlatform,
    evidence,
    has_standalone_website: !!ownDomainUrl,
    website_url: ownDomainUrl,
    social_url: socialUrl,
    website_status: websiteStatus,
    lead_score: score,
    lead_score_reason: cleanText(`${websiteStatus.replace(/_/g, " ")}; ${phones[0] ? "phone found" : "phone missing"}; via ${sourcePlatform}. ${evidence}`, 500),
  };
}

function pageFromSearchResult(result: SearchResult): ScrapedPage {
  return {
    url: normalizeUrl(result.url) || result.url,
    title: result.title,
    markdown: cleanText(`${result.title}\n${result.description}\n${result.markdown}`, 18000),
    html: "",
    links: [],
    statusCode: 200,
  };
}

function isLikelyDuplicate(candidate: Candidate, existing: Array<Record<string, unknown>>) {
  const sourceUrl = normalizeUrl(candidate.source_url);
  const name = normalize(candidate.name);
  const phone = normalizePhone(candidate.phone);
  const email = cleanEmail(candidate.email);
  const location = normalize(candidate.location);

  return existing.some((contact) => {
    const contactSourceUrl = normalizeUrl(contact.source_url);
    if (sourceUrl && contactSourceUrl && sourceUrl === contactSourceUrl) return true;
    const contactPhone = normalizePhone(contact.phone);
    const contactEmail = cleanEmail(contact.email);
    if (email && contactEmail && email === contactEmail) return true;
    if (phone && contactPhone && phone.length >= 8 && phone === contactPhone) return true;
    const contactName = normalize(contact.name);
    const contactLocation = normalize(contact.location);
    return name && contactName && name === contactName && (!location || !contactLocation || location === contactLocation);
  });
}

function generalQueryVariants(trade: string, location: string) {
  const t = cleanText(trade, 80);
  const l = cleanText(location, 120);
  // Trimmed to high-signal queries only — fewer Firecrawl calls per run
  return [
    `"${t}" "${l}" -site:checkatrade.com -site:yell.com`,
    `${t} in ${l} contact phone`,
    `"${t}" "${l}" "Facebook"`,
    `site:google.com/maps ${t} ${l}`,
    `site:yell.com ${t} ${l}`,
    `site:facebook.com ${t} ${l}`,
  ];
}

function tradeQueryVariants(trade: string, location: string) {
  const cleanTrade = cleanText(trade, 80);
  const singularTrade = cleanTrade.replace(/s\b/i, "");
  const pluralTrade = /s\b/i.test(cleanTrade) ? cleanTrade : `${cleanTrade}s`;
  const industry = inferIndustry(cleanTrade);
  const general = generalQueryVariants(cleanTrade, location);

  if (industry === "hospitality") return unique([
    ...general,
    `site:tripadvisor.co.uk ${cleanTrade} ${location}`,
    `site:restaurantguru.com ${cleanTrade} ${location}`,
  ]);
  if (industry === "construction") return unique([
    ...general,
    `site:checkatrade.com/trades ${cleanTrade} ${location}`,
    `site:checkatrade.com/trades ${singularTrade} ${location} profile`,
    `site:checkatrade.com/trades ${pluralTrade} ${location} members`,
    `site:trustatrader.com ${cleanTrade} ${location}`,
    `site:ratedpeople.com ${cleanTrade} ${location}`,
    `site:mybuilder.com ${cleanTrade} ${location}`,
  ]);
  return unique([
    ...general,
    `site:instagram.com ${cleanTrade} ${location}`,
    `${singularTrade} near ${location} contact phone`,
  ]);
}

async function requireAdmin(req: Request, supabase: ReturnType<typeof createClient>) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Admin sign-in required");
  const { data: hasAdminRole } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!hasAdminRole) throw new Error("Admin access required");
}

async function searchFirecrawl(apiKey: string, query: string, limit: number) {
  const response = await fetch(`${FIRECRAWL_V2}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, country: "gb" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firecrawl search failed (${response.status}): ${data?.error ?? "unknown error"}`);
  const rawResults = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.web)
      ? data.web
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data?.web)
          ? data.data.web
          : [];
  return rawResults.slice(0, limit).map((item: Record<string, unknown>) => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    const sourceUrl = item.url ?? item.sourceURL ?? item.link ?? metadata.sourceURL;
    return {
      url: cleanText(sourceUrl, 500),
      title: cleanText(item.title ?? metadata.title, 180),
      description: cleanText(item.description ?? item.snippet ?? metadata.description, 300),
      markdown: cleanText(item.markdown ?? item.content ?? item.description ?? item.snippet, 1200),
    };
  }).filter((item: SearchResult) => item.url && isAcceptedSourceUrl(item.url));
}

// Verify whether a company has its OWN domain on the open web.
// Returns { ownDomainUrl: string | "", socialUrl: string | "" }.
async function verifyOwnWebsite(apiKey: string, name: string, location: string): Promise<{ ownDomainUrl: string; socialUrl: string }> {
  const cleanName = cleanText(name, 120);
  if (!cleanName) return { ownDomainUrl: "", socialUrl: "" };
  try {
    const response = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `"${cleanName}" ${location} official website`, limit: 8, country: "gb" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ownDomainUrl: "", socialUrl: "" };
    const rawResults = Array.isArray(data?.data) ? data.data : Array.isArray(data?.web) ? data.web : [];
    let ownDomainUrl = "";
    let socialUrl = "";
    const nameTokens = cleanName.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((t) => t.length >= 3);
    for (const item of rawResults) {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const url = cleanText(item.url ?? item.sourceURL ?? item.link ?? metadata.sourceURL, 500);
      if (!url) continue;
      try {
        const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
        if (/facebook\.com|instagram\.com/i.test(host)) {
          if (!socialUrl) socialUrl = url;
          continue;
        }
        if (isDirectoryHost(url)) continue;
        if (EXCLUDED_HOSTS.has(host)) continue;
        for (const blocked of EXCLUDED_HOSTS) {
          if (host.endsWith(`.${blocked}`)) { continue; }
        }
        // Heuristic: domain should contain at least one name token, OR the name appears in title
        const title = cleanText(item.title ?? metadata.title, 200).toLowerCase();
        const hostNoTld = host.split(".").slice(0, -1).join("");
        const matchesName = nameTokens.some((tok) => hostNoTld.includes(tok)) || nameTokens.every((tok) => title.includes(tok));
        if (matchesName && !ownDomainUrl) {
          ownDomainUrl = `https://${host}`;
        }
      } catch { /* skip */ }
    }
    return { ownDomainUrl, socialUrl };
  } catch {
    return { ownDomainUrl: "", socialUrl: "" };
  }
}

async function revealPhoneFromProfile(apiKey: string, url: string) {
  const selectors = [
    "button[aria-label*='Show number' i]",
    "button[aria-label*='phone' i]",
    "button[data-testid*='phone' i]",
    "a[href^='tel:']",
  ];

  for (const selector of selectors) {
    const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false,
        maxAge: 0,
        waitFor: 300,
        location: { country: "GB", languages: ["en-GB", "en"] },
        actions: [
          { type: "wait", milliseconds: 300 },
          { type: "click", selector },
          { type: "wait", milliseconds: 700 },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) continue;
    const payload = data?.data ?? data;
    const actionScrapes = Array.isArray(payload?.actions?.scrapes) ? payload.actions.scrapes : [];
    const text = [payload?.markdown, payload?.html, ...actionScrapes.flatMap((scrape: Record<string, unknown>) => [scrape.markdown, scrape.html])]
      .map((value) => cleanText(value, 12000))
      .join("\n");
    const phone = extractPhones(text)[0];
    if (phone) return phone;
  }

  return "";
}

// Run a list of async tasks with a max parallelism cap
async function runChunked<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(slice.map(worker));
    for (const r of settled) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

// ---------- Thunderbit: full-page fetch + structured extraction ----------
const THUNDERBIT_LEAD_SCHEMA = {
  business_name: "official business or trading name",
  phone: "primary UK phone number in original format",
  email: "primary contact email address",
  website_url: "the business's own external website URL (not the directory page itself)",
  social_url: "primary Facebook or Instagram profile URL for the business",
  address: "street address or service area",
  about: "1-2 sentence summary of what the business does",
};

type ThunderbitExtract = Partial<Record<keyof typeof THUNDERBIT_LEAD_SCHEMA, string>>;

async function thunderbitFetch(path: string, body: Record<string, unknown>, apiKey: string, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${THUNDERBIT_V1}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) throw new Error(`Thunderbit ${path} failed (${response.status}): ${JSON.stringify(data).slice(0, 240)}`);
    return data as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

async function thunderbitDistillAndExtract(url: string, apiKey: string): Promise<{ markdown: string; extract: ThunderbitExtract }> {
  const [distillRes, extractRes] = await Promise.allSettled([
    thunderbitFetch("/distill", { url, render_mode: "basic", country_code: "GB", timeout: 20000 }, apiKey),
    thunderbitFetch("/extract", { url, schema: THUNDERBIT_LEAD_SCHEMA, render_mode: "basic", country_code: "GB", timeout: 20000 }, apiKey),
  ]);

  const distillData = distillRes.status === "fulfilled" ? distillRes.value : {};
  const extractData = extractRes.status === "fulfilled" ? extractRes.value : {};

  const markdown = cleanText(
    (distillData?.markdown as string) ??
      (distillData?.content as string) ??
      ((distillData?.data as Record<string, unknown>)?.markdown as string) ??
      "",
    18000,
  );

  const rawExtract =
    (extractData?.data as Record<string, unknown>) ??
    (extractData?.result as Record<string, unknown>) ??
    (extractData?.fields as Record<string, unknown>) ??
    extractData ??
    {};

  const extract: ThunderbitExtract = {};
  for (const key of Object.keys(THUNDERBIT_LEAD_SCHEMA) as Array<keyof typeof THUNDERBIT_LEAD_SCHEMA>) {
    const v = (rawExtract as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) extract[key] = cleanText(v, 500);
  }
  return { markdown, extract };
}

function pageFromThunderbit(url: string, markdown: string, fallbackTitle: string): ScrapedPage {
  return {
    url: normalizeUrl(url) || url,
    title: cleanText(fallbackTitle, 200),
    markdown: cleanText(markdown, 18000),
    html: "",
    links: [],
    statusCode: 200,
  };
}

async function runLeadGeneration(jobId: string, supabase: ReturnType<typeof createClient>, firecrawlKey: string, trade: string, location: string, limit: number, thunderbitKey?: string) {
  const startedAt = Date.now();
  const wallClockBudgetMs = 110_000; // ~110s safety budget

  const updateJob = async (patch: Record<string, unknown>) => {
    await supabase.from("processing_jobs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", jobId);
  };

  try {
    await updateJob({ status: "processing", progress: 5 });

    const queries = tradeQueryVariants(trade, location);
    // Cap parallel Firecrawl searches to 4 at a time
    const searchBatchesNested = await runChunked(queries, 4, (query) =>
      searchFirecrawl(firecrawlKey, query, Math.min(Math.max(limit * 4, 12), 20)).catch(() => [] as SearchResult[]),
    );
    const searchResults = unique(searchBatchesNested.flat().map((result) => JSON.stringify(result))).map((result) => JSON.parse(result) as SearchResult);
    const profileUrls = unique(searchResults.map((result) => result.url).filter(isLikelyProfileUrl)).slice(0, Math.min(Math.max(limit * 10, 35), 60));

    await updateJob({ progress: 30 });

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name, phone, email, location, source_url")
      .or(`source.eq.lead_agent,location.ilike.%${location.replace(/[%_,]/g, "")}%`)
      .limit(5000);

    const { data: leadHistory } = await supabase
      .from("lead_search_history")
      .select("source_url")
      .eq("trade", trade.toLowerCase())
      .eq("location", location.toLowerCase())
      .limit(5000);
    const seenSourceUrls = new Set((leadHistory ?? []).map((item: Record<string, unknown>) => normalizeUrl(item.source_url)).filter(Boolean));

    const added: Candidate[] = [];
    const skippedDuplicates: Candidate[] = [];
    const rejectedWithWebsites: Candidate[] = [];
    const rejectedInvalidSources: Candidate[] = [];
    const rejectedInvalid: Candidate[] = [];
    let profilePagesScraped = 0;
    let candidatesExtracted = 0;
    let verifyBudget = 12; // cap calls to verifyOwnWebsite per run
    let phoneRevealBudget = 6; // cap calls to revealPhoneFromProfile per run
    let thunderbitBudget = thunderbitKey ? 12 : 0; // cap Thunderbit calls per run
    let thunderbitUsed = 0;

    for (const url of profileUrls) {
      if (Date.now() - startedAt > wallClockBudgetMs) break;
      const snippet = searchResults.find((result) => normalizeUrl(result.url) === normalizeUrl(url));

      // Try Thunderbit first for full-page content + structured fields
      let tbExtract: ThunderbitExtract = {};
      let page: ScrapedPage;
      if (thunderbitKey && thunderbitBudget > 0) {
        thunderbitBudget -= 1;
        try {
          const { markdown, extract } = await thunderbitDistillAndExtract(url, thunderbitKey);
          tbExtract = extract;
          const fallbackTitle = extract.business_name || snippet?.title || "";
          page = markdown
            ? pageFromThunderbit(url, `${fallbackTitle}\n${markdown}`, fallbackTitle)
            : pageFromSearchResult(snippet ?? { url, title: fallbackTitle, description: "", markdown: "" });
          thunderbitUsed += 1;
        } catch (err) {
          console.warn("Thunderbit fallback to snippet", url, err instanceof Error ? err.message : err);
          page = pageFromSearchResult(snippet ?? { url, title: "", description: "", markdown: "" });
        }
      } else {
        page = pageFromSearchResult(snippet ?? { url, title: "", description: "", markdown: "" });
      }

      profilePagesScraped += 1;
      // If Thunderbit already gave us a website_url, we can skip the costly verify call
      const skipVerify = verifyBudget <= 0 || !!tbExtract.website_url;
      const candidate = await parseCandidateFromProfile(page, trade, location, firecrawlKey, { skipVerify });
      if (!candidate) continue;
      if (!skipVerify) verifyBudget -= 1;

      // Merge Thunderbit-extracted fields (preferred over heuristic regex)
      if (tbExtract.business_name) candidate.name = cleanCompanyName(tbExtract.business_name, trade, location) || candidate.name;
      if (tbExtract.phone && !candidate.phone) candidate.phone = cleanText(tbExtract.phone, 40);
      if (tbExtract.email && !candidate.email) candidate.email = cleanEmail(tbExtract.email);
      if (tbExtract.website_url && !candidate.website_url) {
        const normalized = normalizeUrl(tbExtract.website_url);
        if (normalized && !isDirectoryHost(normalized) && isAcceptedSourceUrl(normalized)) {
          candidate.website_url = normalized;
          candidate.has_standalone_website = true;
          candidate.website_status = "has_website";
        }
      }
      if (tbExtract.social_url && !candidate.social_url) {
        const normalized = normalizeUrl(tbExtract.social_url);
        if (normalized) candidate.social_url = normalized;
      }

      candidatesExtracted += 1;
      const name = cleanText(candidate.name, 100);
      const sourceUrl = cleanText(candidate.source_url, 500);
      if (seenSourceUrls.has(normalizeUrl(sourceUrl))) {
        skippedDuplicates.push(candidate);
        continue;
      }
      if (!name || !sourceUrl || !isAcceptedSourceUrl(sourceUrl)) {
        rejectedInvalidSources.push(candidate);
        continue;
      }
      if (candidate.has_standalone_website === true && (candidate.lead_score ?? 0) < 50) {
        rejectedWithWebsites.push(candidate);
        continue;
      }
      if (isLikelyDuplicate(candidate, [...(existing ?? []), ...added])) {
        skippedDuplicates.push(candidate);
        continue;
      }
      if (!cleanText(candidate.phone, 40) && phoneRevealBudget > 0) {
        phoneRevealBudget -= 1;
        candidate.phone = await revealPhoneFromProfile(firecrawlKey, sourceUrl).catch(() => "");
      }
      added.push({ ...candidate, name, source_url: sourceUrl });
      seenSourceUrls.add(normalizeUrl(sourceUrl));
      if (added.length >= limit) break;
    }

    console.log(`[find-local-leads] thunderbit_used=${thunderbitUsed} profiles=${profilePagesScraped} added=${added.length}`);

    await updateJob({ progress: 75 });

    const historyRows = [
      ...added.map((c) => ({ source_url: normalizeUrl(c.source_url), trade: trade.toLowerCase(), location: location.toLowerCase(), outcome: "added", reason: null })),
      ...skippedDuplicates.map((c) => ({ source_url: normalizeUrl(c.source_url), trade: trade.toLowerCase(), location: location.toLowerCase(), outcome: "skipped", reason: "duplicate" })),
      ...rejectedWithWebsites.map((c) => ({ source_url: normalizeUrl(c.source_url), trade: trade.toLowerCase(), location: location.toLowerCase(), outcome: "rejected", reason: "has_website" })),
      ...rejectedInvalidSources.map((c) => ({ source_url: normalizeUrl(c.source_url), trade: trade.toLowerCase(), location: location.toLowerCase(), outcome: "rejected", reason: "invalid_source" })),
    ].filter((row) => row.source_url);
    if (historyRows.length > 0) {
      await supabase.from("lead_search_history").upsert(historyRows, { onConflict: "source_url" });
    }

    const rows = added.map((candidate) => {
      const industry = cleanText(candidate.industry, 80) || inferIndustry(candidate.trade || trade);
      return {
        name: cleanText(candidate.name, 100),
        contact_name: null,
        phone: cleanText(candidate.phone, 40) || null,
        email: cleanEmail(candidate.email) || null,
        location: cleanText(candidate.location, 160) || location,
        industry,
        website: cleanText(candidate.source_url, 500),
        source_url: cleanText(candidate.source_url, 500),
        source_platform: cleanText(candidate.source_platform, 80),
        actual_website_url: cleanText(candidate.website_url, 500) || null,
        social_url: cleanText(candidate.social_url, 500) || null,
        website_status: cleanText(candidate.website_status, 80) || "unknown",
        lead_score: candidate.lead_score ?? null,
        lead_score_reason: cleanText(candidate.lead_score_reason, 500) || null,
        notes: cleanText(candidate.trade, 80) || trade,
        source: "lead_agent",
      };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("contacts").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
      if (error && /contact_name.*schema cache|column.*contact_name|industry.*schema cache|column.*industry/i.test(error.message)) {
        const fallbackRows = rows.map(({ contact_name: _contactName, industry: _industry, ...row }) => row);
        const { error: fallbackError } = await supabase.from("contacts").upsert(fallbackRows, { onConflict: "source_url", ignoreDuplicates: true });
        if (fallbackError) throw new Error(fallbackError.message);
      } else if (error && /duplicate key|unique constraint|23505/i.test(error.message)) {
        // ignore — application-level checks will skip next time
      } else if (error) throw new Error(error.message);
    }

    const partial = Date.now() - startedAt > wallClockBudgetMs;
    const result = {
      ok: true,
      partial,
      query: queries.join(" | "),
      searched: searchResults.length,
      profile_pages_scraped: profilePagesScraped,
      candidates_extracted: candidatesExtracted,
      added: rows.length,
      skipped_duplicates: skippedDuplicates.length,
      rejected_with_websites: rejectedWithWebsites.length,
      rejected_invalid_sources: rejectedInvalidSources.length,
      rejected_invalid: rejectedInvalid.length,
      contacts: rows.map((row) => ({ name: row.name, industry: row.industry, phone: row.phone, email: row.email, location: row.location, website: row.website, lead_score: row.lead_score, website_status: row.website_status, notes: row.notes })),
      message: `Added ${rows.length}. Checked ${searchResults.length} results, parsed ${profilePagesScraped} profiles, extracted ${candidatesExtracted}. Skipped ${skippedDuplicates.length} duplicates, rejected ${rejectedWithWebsites.length} with websites and ${rejectedInvalidSources.length} invalid.${partial ? " (Time budget reached — partial run.)" : ""}`,
    };

    await updateJob({ status: "complete", progress: 100, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await updateJob({ status: "failed", error: message });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trade: rawTrade, location: rawLocation, limit: rawLimit } = await req.json();
    const trade = cleanText(rawTrade, 80);
    const location = cleanText(rawLocation, 120);
    const limit = Math.min(Math.max(Number(rawLimit) || 3, 1), 5);
    if (!trade || !location) throw new Error("Trade and location are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const thunderbitKey = Deno.env.get("THUNDERBIT_API_KEY");
    if (!firecrawlKey) throw new Error("Firecrawl connector is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate that the caller is an admin (reuses the access-token approach)
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Admin sign-in required");
    const { data: hasAdminRole } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!hasAdminRole) throw new Error("Admin access required");

    // Create the job row, then run heavy work in the background
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        job_type: "find_leads",
        status: "queued",
        progress: 0,
        payload: { trade, location, limit },
        created_by: userData.user.id,
      })
      .select("id")
      .single();
    if (jobError || !job) throw new Error(jobError?.message || "Failed to queue job");

    // @ts-ignore - EdgeRuntime is provided by the Supabase Edge runtime
    EdgeRuntime.waitUntil(runLeadGeneration(job.id as string, supabase, firecrawlKey, trade, location, limit));

    return new Response(JSON.stringify({ ok: true, job_id: job.id, status: "queued" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: /required|invalid|sign-in|access/i.test(message) ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
