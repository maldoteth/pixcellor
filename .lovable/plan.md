I checked the saved contact and confirmed this lead was created by the `find-local-leads` agent at 03:17 UTC:

- Name: Surrey Hills Electrical
- Source saved: `https://www.checkatrade.com/trades/surreyhillselectrical`
- Current result: Checkatrade returns “Sorry, we can't find that page!”

Why it happened: the agent currently trusts the search/extraction result too much. Firecrawl search can return indexed/stale directory URLs, and the AI extractor then saved that URL because the page content/evidence suggested a business listing with no standalone website. There is no final validation step that re-fetches the chosen `source_url` and rejects it if the page is now 404, redirected to a generic error page, or contains “can’t find that page”.

Plan to fix it:

1. Add source URL validation in the lead finder backend
   - Before inserting a candidate into contacts, verify `candidate.source_url` server-side.
   - Reject links that return 404/410, fail to load, redirect to generic pages, or include common dead-page text such as “can't find that page”, “page not found”, “old link”, or “moved”.
   - Keep valid directory/social links, since those are still useful evidence when a business has no standalone website.

2. Tighten the AI extraction prompt
   - Tell the extractor not to use search-result URLs that look stale, inaccessible, or generic.
   - Require the source URL to be an accessible evidence page for the specific business, not just a guessed directory slug.

3. Improve result reporting in the portal
   - Add a count for leads rejected due to invalid/dead source links, so the AI lead finder summary explains why fewer contacts may be added.

4. Clean up the bad existing contact
   - Update or remove the dead Checkatrade source from Surrey Hills Electrical’s notes.
   - If no valid alternate evidence URL is found, keep the contact but remove the dead source link and add a note that the previous source was invalid.

Files expected to change:
- `supabase/functions/find-local-leads/index.ts`
- `src/pages/Portal.tsx`
- Database contact note cleanup for the existing bad record