I can build this as an admin-only AI prospecting agent inside your portal.

What it will do:

1. Connect Firecrawl
- Link the existing Firecrawl connector to this project so backend functions can search/scrape the web safely without exposing keys in the browser.
- Use it from server-side code only.

2. Add a lead-finder backend function
- Create a new backend function, e.g. `find-local-leads`.
- It will accept a trade + location + optional amount, for example:
  - `electricians in Manchester`
  - `roofers near Birmingham`
  - `plumbers in Leeds, find 20`
- It will search for local businesses likely to need a website.
- It will extract business name, phone, email if visible, location, trade/category, and source URL.
- It will detect whether they appear to have a real website.

3. Only add businesses that look like they have no proper website
- Exclude results that have a clear own-domain website.
- Allow leads from places like directories/social profiles where no standalone website is visible.
- Save why it was added in notes, e.g. `Trade: Roofer`, `No standalone website found`, `Found via directory/search result`.
- Avoid dumping raw links or messy scrape text into job title/notes.

4. Deduplicate contacts
- Before inserting, check existing contacts by name + phone/email/location.
- Skip duplicates instead of re-adding the same business.
- Return a summary like: `Added 12, skipped 4 duplicates, rejected 9 because they had websites`.

5. Add a portal control for the agent
- Add an admin UI section/button in the Contacts area such as `Find local leads`.
- Fields:
  - Trade/category
  - Location
  - Number of leads to add
- Show progress/loading state and a clean result summary.
- Refresh the contact list after the agent adds leads.

6. Optional chat command support
- Extend the existing dev AI chat so you can type things like:
  - `find 10 roofers in Bristol with no websites and add them to contacts`
- The AI will call the new lead-finder function instead of trying to manually guess contacts itself.

Technical details:
- Use the Firecrawl connector if linked; otherwise prompt to connect it first.
- Keep all web-search/scraping logic inside a backend function.
- Use the current `contacts` table, saving trade as the first line of `notes` in the existing format: `Trade: Electrician`.
- Keep contacts admin-protected under the existing RLS setup.
- Add validation and sensible limits so the agent cannot accidentally create hundreds of contacts in one run.

Important limitation:
- This will be a semi-automated prospecting agent: you give it a trade/location and it finds/imports leads. It will not run endlessly by itself unless we later add scheduled jobs and approval rules.