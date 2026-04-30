Plan to replace the broad lead finder with a targeted Checkatrade-first flow.

1. Keep the existing AI lead finder UI
- The Portal form can stay as-is: trade, location/city, and limit.
- The first implementation will be optimized for `electricians + city`, but still keep the trade input so it can later support plumbers, roofers, etc.
- The results will continue saving into the existing contacts list with `source: lead_agent`.

2. Rewrite the `find-local-leads` backend function around Checkatrade
- Instead of a broad query across Google Business, Yell, Facebook, Instagram, etc., the function will use targeted Checkatrade discovery.
- Build focused search queries such as:
  - `site:checkatrade.com/trades electricians Bristol Checkatrade`
  - `site:checkatrade.com electricians Bristol Checkatrade no website`
  - `Checkatrade electricians Bristol`
- Use Firecrawl search to discover Checkatrade result/profile URLs.
- Filter discovered URLs so only Checkatrade pages are considered.

3. Scrape listing and profile pages separately
- Scrape each Checkatrade result/profile page with Firecrawl.
- From listing pages, extract candidate profile URLs.
- From profile pages, extract:
  - business name
  - phone number if visible
  - email if visible
  - city/location
  - Checkatrade profile URL
  - evidence text
  - whether a standalone website appears to be present

4. Add stricter website detection
- Treat a business as having a website if the profile text/links include an external website URL/button.
- Ignore Checkatrade internal URLs, telephone links, email links, social links, tracking URLs, and generic directory URLs.
- Only save businesses where no standalone website is found.

5. Add deterministic parsing before AI fallback
- First use regex/link parsing on scraped markdown/html/links for business names, phones, external domains, and profile URLs.
- Then use Lovable AI only to normalize messy profile content into structured fields.
- This reduces hallucinations compared with asking AI to infer leads from broad search snippets.

6. Improve rejection/debug output
- Return better summary counts to the UI:
  - Checkatrade pages searched
  - profile pages scraped
  - candidates extracted
  - rejected because they had websites
  - rejected because source page could not be verified
  - rejected as duplicates
  - contacts added
- Keep the existing toast/summary display compatible with the current Portal UI.

7. Preserve existing safeguards
- Keep admin-only access for running the lead finder.
- Keep duplicate detection against existing contacts.
- Keep source validation so saved contacts have a real Checkatrade evidence page.
- Keep the 1–25 lead limit.

Technical details
- Main file to update: `supabase/functions/find-local-leads/index.ts`.
- Existing frontend invocation in `src/pages/Portal.tsx` can stay the same unless we decide to add a “Checkatrade mode” label later.
- The implementation will use the existing `FIRECRAWL_API_KEY` and `LOVABLE_API_KEY` runtime secrets already expected by the function.
- No database schema changes should be needed.

Important limitation
- Checkatrade may hide some contact details, use dynamic rendering, rate-limit scraping, or block pages. The scraper will be much more targeted than the current bot, but it still depends on what Checkatrade exposes to Firecrawl. If Checkatrade blocks or omits website/contact fields, those leads may be skipped rather than guessed.