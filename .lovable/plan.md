I found why this is happening: the lead bot currently asks Firecrawl for only one narrow Checkatrade search query and then only inspects about `limit * 2` results, capped at 10 profile URLs. If several of those are already in your contacts, it stops with fewer/new zero leads instead of broadening the search. It also only checks duplicates in app code, so it can keep seeing the same top-ranked Checkatrade profiles again on the next run.

Plan:

1. Add persistent lead-source tracking
   - Add a `source_url` field to contacts so every lead added from Checkatrade stores the exact profile URL it came from.
   - Add a database-level unique index for lead-agent Checkatrade URLs so the same profile cannot be inserted twice.
   - Keep existing admin-only contact security unchanged.

2. Make duplicate detection stronger and more precise
   - Include `source_url` in the existing duplicate check.
   - Continue checking phone/email/company name too, but only use source URL as the strongest identity for Checkatrade profiles.
   - Stop relying on the first 1000 contacts only; query existing lead URLs/identifiers more intentionally.

3. Make the bot keep searching when duplicates are found
   - Instead of one query, generate multiple query variations for the same trade/location, e.g. singular/plural trade, nearby wording, “Checkatrade profile”, “members”, and location/trade order swaps.
   - Request a larger pool of candidates than the requested lead count.
   - Keep looping through candidate profile URLs until it either fills the requested number of new leads or exhausts a larger safety cap.
   - Return a clearer summary like: “Checked 35 profiles, skipped 12 duplicates, added 5.”

4. Prevent repeated runs from re-checking the exact same profiles
   - Store rejected/seen Checkatrade source URLs when practical, or at minimum use stored contact `source_url` so already-added profiles are skipped immediately.
   - Add query variation so the next run is less likely to only hit the same first page of search results.

5. Preserve the separate fields you just requested
   - Company name remains `name`.
   - Contact name remains separate.
   - Job title/trade stays in the job title field.
   - Location stays only in location.
   - No trade/location text will be put into company name.

6. Fix the schema mismatch I found
   - The code expects an `industry` field, but the live contacts table currently does not have that column even though earlier code paths reference it.
   - I’ll add/restore the `industry` column properly so lead rows don’t need to use the fallback that strips industry.

After approval, I’ll update the database schema and `find-local-leads` function, then redeploy/test the lead bot.