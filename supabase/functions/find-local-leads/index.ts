/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const CHECKATRADE_HOST_RE = /(^|\.)checkatrade\.com$/i;
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
  evidence?: string;
  has_standalone_website?: boolean;
  website_url?: string;
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

type LeadRunStats = {
  searched: number;
  checkatradePagesSearched: number;
  profilePagesScraped: number;
  candidatesExtracted: number;
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
    if (!CHECKATRADE_HOST_RE.test(url.hostname)) return false;
    const path = url.pathname.toLowerCase();
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

function guessBusinessName(page: ScrapedPage) {
  const title = page.title.replace(/\s*\|\s*Checkatrade.*$/i, "").replace(/\s*-\s*Checkatrade.*$/i, "").trim();
  if (title && !/checkatrade|find a tradesperson|search results/i.test(title)) return cleanText(title, 100);
  const heading = page.markdown.match(/^#\s+(.+)$/m)?.[1] ?? page.markdown.match(/^##\s+(.+)$/m)?.[1] ?? "";
  return cleanText(heading.replace(/\s*\|\s*Checkatrade.*$/i, ""), 100);
}

function parseCandidateFromProfile(page: ScrapedPage, trade: string, location: string): Candidate | null {
  const text = `${page.title}\n${page.markdown}\n${page.html}`;
  const name = guessBusinessName(page);
  if (!name || /checkatrade|find a tradesperson|search results|reviews for/i.test(name)) return null;

  const websites = externalWebsiteLinks(page);
  const phones = extractPhones(text);
  const emails = extractEmails(text).filter((email) => !email.endsWith("@checkatrade.com"));
  const evidence = cleanText(
    page.markdown.split("\n").find((line) => /electric|website|phone|contact|about|services|based/i.test(line) && line.length > 30) ??
      `Checkatrade profile inspected for ${name}.`,
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
    evidence,
    has_standalone_website: websites.length > 0,
    website_url: websites[0] ?? "",
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
  const name = normalize(candidate.name);
  const phone = normalizePhone(candidate.phone);
  const email = cleanEmail(candidate.email);
  const location = normalize(candidate.location);

  return existing.some((contact) => {
    const contactPhone = normalizePhone(contact.phone);
    const contactEmail = cleanEmail(contact.email);
    if (email && contactEmail && email === contactEmail) return true;
    if (phone && contactPhone && phone.length >= 8 && phone === contactPhone) return true;
    const contactName = normalize(contact.name);
    const contactLocation = normalize(contact.location);
    return name && contactName && name === contactName && (!location || !contactLocation || location === contactLocation);
  });
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
    body: JSON.stringify({ query, limit, country: "gb", scrapeOptions: { formats: ["markdown", "links"], onlyMainContent: true } }),
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
      markdown: cleanText(item.markdown ?? item.content, 6000),
    };
  }).filter((item: SearchResult) => item.url && isCheckatradeUrl(item.url));
}

async function scrapeFirecrawl(apiKey: string, url: string, options: { revealPhone?: boolean; fullPage?: boolean } = {}): Promise<ScrapedPage | null> {
  const body: Record<string, unknown> = {
    url,
    formats: ["markdown", "html", "links"],
    onlyMainContent: options.fullPage ? false : true,
    waitFor: options.revealPhone ? 1800 : 1200,
    location: { country: "GB", languages: ["en-GB", "en"] },
  };

  if (options.revealPhone) {
    body.maxAge = 0;
    body.actions = [
      { type: "wait", milliseconds: 800 },
      { type: "click", selector: "button[aria-label*='Show number' i]" },
      { type: "wait", milliseconds: 800 },
    ];
  }

  const response = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const payload = data?.data ?? data;
  const sourceUrl = cleanText(payload?.metadata?.sourceURL, 800) || url;
  const statusCode = Number(payload?.metadata?.statusCode ?? 0);
  const actionScrapes = Array.isArray(payload?.actions?.scrapes) ? payload.actions.scrapes : [];
  const actionText = actionScrapes.map((scrape: Record<string, unknown>) => `${cleanText(scrape.markdown, 12000)}\n${cleanText(scrape.html, 12000)}`).join("\n");
  const page = {
    url: normalizeUrl(sourceUrl) || url,
    title: cleanText(payload?.metadata?.title, 220),
    markdown: cleanText(`${payload?.markdown ?? ""}\n${actionText}`, 50000),
    html: cleanText(`${payload?.html ?? ""}\n${actionText}`, 50000),
    links: Array.isArray(payload?.links) ? payload.links.map((link: unknown) => cleanText(link, 1000)).filter(Boolean) : [],
    statusCode,
  };
  if (statusCode >= 400) return null;
  if (!isCheckatradeUrl(page.url)) return null;
  return page;
}

async function scrapeCheckatradeProfile(apiKey: string, url: string): Promise<ScrapedPage | null> {
  const basic = await scrapeFirecrawl(apiKey, url, { fullPage: true });
  if (!basic) return null;
  const text = `${basic.title}\n${basic.markdown}\n${basic.html}`;
  if (externalWebsiteLinks(basic).length > 0 || extractPhones(text).length > 0 || extractEmails(text).length > 0) return basic;
  return (await scrapeFirecrawl(apiKey, url, { revealPhone: true, fullPage: true })) ?? basic;
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
    if (!firecrawlKey) throw new Error("Firecrawl connector is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);
    await requireAdmin(req, supabase);

    const queries = unique([
      `site:checkatrade.com/trades ${trade} ${location} Checkatrade`,
      `site:checkatrade.com ${trade} ${location} Checkatrade`,
    ]);

    const searchBatches = await Promise.all(queries.map((query) => searchFirecrawl(firecrawlKey, query, Math.min(limit * 2, 8))));
    const searchResults = unique(searchBatches.flat().map((result) => JSON.stringify(result))).map((result) => JSON.parse(result) as SearchResult);
    const listingPages = searchResults.map(pageFromSearchResult);
    const profileUrls = unique(searchResults.map((result) => result.url).filter(isLikelyProfileUrl)).slice(0, Math.min(limit * 2, 10));

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name, phone, email, location")
      .limit(1000);

    const added: Candidate[] = [];
    const skippedDuplicates: Candidate[] = [];
    const rejectedWithWebsites: Candidate[] = [];
    const rejectedInvalidSources: Candidate[] = [];
    const rejectedInvalid: Candidate[] = [];
    let profilePagesScraped = 0;
    let candidatesExtracted = 0;

    for (const url of profileUrls) {
      const page = pageFromSearchResult(searchResults.find((result) => normalizeUrl(result.url) === normalizeUrl(url)) ?? { url, title: "", description: "", markdown: "" });
      profilePagesScraped += 1;
      const candidate = parseCandidateFromProfile(page, trade, location);
      if (!candidate) continue;
      candidatesExtracted += 1;
      const name = cleanText(candidate.name, 100);
      const sourceUrl = cleanText(candidate.source_url, 500);
      if (!name || !sourceUrl || !isCheckatradeUrl(sourceUrl)) {
        rejectedInvalidSources.push(candidate);
        continue;
      }
      if (candidate.has_standalone_website === true) {
        rejectedWithWebsites.push(candidate);
        continue;
      }
      if (!cleanText(candidate.phone, 40) && !cleanEmail(candidate.email)) {
        rejectedInvalid.push(candidate);
        continue;
      }
      if (isLikelyDuplicate(candidate, [...(existing ?? []), ...added])) {
        skippedDuplicates.push(candidate);
        continue;
      }
      added.push({ ...candidate, name, source_url: sourceUrl });
      if (added.length >= limit) break;
    }

    const rows = added.map((candidate) => ({
      name: cleanText(candidate.name, 100),
      industry: cleanText(candidate.industry, 80) || inferIndustry(candidate.trade || trade),
      phone: cleanText(candidate.phone, 40) || null,
      email: cleanEmail(candidate.email) || null,
      location: cleanText(candidate.location, 160) || location,
      website: null,
      notes: [
        `Trade: ${cleanText(candidate.trade, 80) || trade}`,
        "No website button found on Checkatrade profile.",
        cleanText(candidate.evidence, 220),
        candidate.source_url ? `Source: ${cleanText(candidate.source_url, 400)}` : "",
      ].filter(Boolean).join("\n"),
      source: "lead_agent",
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("contacts").insert(rows);
      if (error) throw new Error(error.message);
    }

    return new Response(JSON.stringify({
      ok: true,
      query: queries.join(" | "),
      searched: searchResults.length,
      checkatrade_pages_searched: searchResults.length,
      profile_pages_scraped: profilePagesScraped,
      candidates_extracted: candidatesExtracted,
      extracted: candidatesExtracted,
      added: rows.length,
      skipped_duplicates: skippedDuplicates.length,
      rejected_with_websites: rejectedWithWebsites.length,
      rejected_invalid_sources: rejectedInvalidSources.length,
      rejected_invalid: rejectedInvalid.length,
      contacts: rows.map((row) => ({ name: row.name, industry: row.industry, phone: row.phone, email: row.email, location: row.location, notes: row.notes })),
      message: `Added ${rows.length}. Checkatrade results checked ${searchResults.length}, profiles parsed ${profilePagesScraped}, candidates ${candidatesExtracted}. Skipped ${skippedDuplicates.length} duplicates. Rejected ${rejectedWithWebsites.length} with Checkatrade website buttons, ${rejectedInvalidSources.length} invalid sources, ${rejectedInvalid.length} without contact details in search data.`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: /required|invalid|sign-in|access/i.test(message) ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
