## Goal
Make the lead agent work for **any** type of business, not just construction/hospitality/etc. Specifically: find companies that show up on Google (Maps, business listings, directories) but have **no real website of their own**, and save them as high-score leads.

## What's wrong today
- Source URLs are restricted to a hardcoded directory whitelist (Checkatrade, Yell, TripAdvisor, etc.). A generic Google-search hit (Google Maps page, local council listing, niche directory) gets thrown away.
- Queries are industry-routed — if your trade doesn't match construction/hospitality/beauty/etc., you fall back to Checkatrade-only queries.
- No explicit "Google Maps / Google Business" pass.
- Scoring penalises any standalone website even if it's clearly social-only or a directory profile.

## Plan

### 1. New "general" search mode (any industry)
Add a generic query set that runs for every search and is the **only** set used when industry = "general". Targets Google's local index broadly:
- `"<trade>" "<location>" -site:checkatrade.com -site:yell.com` (open web)
- `site:google.com/maps <trade> <location>`
- `"<trade>" "<location>" "Facebook"` / `"Instagram"`
- `"<trade>" "<location>" phone -site:facebook.com` (companies surfacing only via local listings)
- `"<trade>" "<location>" site:yell.com OR site:bing.com/maps OR site:apple.com/maps`
- `"<trade>" near "<location>" no website`
- `"<trade>" "<location>" small business contact`

Industry-specific queries still run as a bonus when detected, but general queries always run too.

### 2. Drop the strict directory whitelist
Replace `isAcceptedSourceUrl` (directory-only) with a softer rule:
- Accept any http(s) URL **except** clearly junk hosts (asset CDNs, trackers, wikipedia, gov.uk policy pages, news sites).
- Keep an `EXCLUDED_HOSTS` blocklist (analytics, image CDNs, news, wiki, jobs boards) instead of a whitelist.
- Add Google Maps, Bing Maps, Apple Maps, Nextdoor, Thomson Local, Cylex, Hotfrog, FreeIndex, Scoot, Bing Places to recognised platforms in `getSourcePlatform`.

### 3. Better "do they have a website?" check
For each candidate's company name + location:
- Run a Firecrawl search: `"<company name>" "<location>" official website` and check whether any returned URL is the company's own domain (i.e. not a directory/social/maps host).
- If none found → mark `website_status = "no_website_found"`, score 85–95.
- If only Facebook/Instagram → `website_status = "social_only"`, score 75–85.
- If a real domain is found → `website_status = "has_website"`, score 30–50, still saved but lower priority (no longer rejected outright unless score < 50, configurable).

This is the key change that makes it actually answer "active on Google with no website".

### 4. Google Maps profile parsing
When a Google Maps URL is found, scrape it with Firecrawl and extract: business name, phone, address, and the "Website" button (if any). If no website button → strong "no website" signal.

### 5. Scoring tweak
Promote "no real website" as the dominant factor:
```
+40  no real website found anywhere
+25  social-only presence
+15  phone present
+10  email present
+5   listed on Google Maps (proves they're active)
-25  has own domain (kept but deprioritised)
```

### 6. UI / behaviour
No frontend changes required — the existing Lead Score and Website Status badges in `Portal.tsx` will reflect the richer data automatically. Optionally add an "Any industry" hint under the Trade input.

## Technical changes
- `supabase/functions/find-local-leads/index.ts`
  - Add `generalQueryVariants(trade, location)` and merge it into `tradeQueryVariants` for all industries.
  - Replace `DIRECTORY_HOSTS` whitelist with `EXCLUDED_HOSTS` blocklist; rewrite `isAcceptedSourceUrl` accordingly.
  - Extend `getSourcePlatform` with Google Maps, Bing/Apple Maps, Nextdoor, Cylex, Hotfrog, FreeIndex, Scoot, Thomson Local.
  - Add `verifyOwnWebsite(apiKey, name, location)` helper that searches the open web for the company's own domain.
  - Update `parseCandidateFromProfile` to call the verifier and set `website_status` / `lead_score` from the new rules.
  - Loosen the rejection: only reject candidates with a confirmed own-domain website **and** score < 50.

No DB migration needed — all required columns (`source_platform`, `actual_website_url`, `social_url`, `website_status`, `lead_score`, `lead_score_reason`) already exist.

## Out of scope
- Direct Google Places API integration (would need a separate paid key). Firecrawl + Google Maps scraping covers the same ground for now; we can add Places later if results aren't dense enough.
