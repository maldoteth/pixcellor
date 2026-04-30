## Why the last lead-gen request failed

The edge function logs show:

```
ERROR Http: connection closed before message completed
```

That's the classic edge-function timeout / forced disconnect — the request started, ran for ages, and the runtime killed the connection before a response was sent. No "Firecrawl error", no validation error — just "ran too long".

### Why it now runs too long

When we switched the bot to "any industry", we made it do drastically more work per request:

1. **Many more searches.** `tradeQueryVariants` always merges in the new `generalQueryVariants` set (12+ queries) on top of any industry-specific ones. Each query is a Firecrawl `/v2/search` call (~1–4s each). Even with `Promise.all`, Firecrawl rate-limits in parallel.
2. **More candidate pages to consider.** `profileUrls` cap raised to up to 80 URLs.
3. **A new secondary Firecrawl search per candidate** — `verifyOwnWebsite` runs once for *every* candidate that survives initial parsing, sequentially inside the `for` loop. With 30–80 candidates, that alone is 30–80 extra Firecrawl calls back-to-back.
4. **Plus** `revealPhoneFromProfile` doing further Firecrawl scrapes when phone is missing.

End result: tens of seconds to several minutes of synchronous work in one HTTP request → connection closed before completion. The function never gets to write anything to the DB, so from the UI it just "didn't work".

This matches the known Lovable Cloud edge-function constraint: ~2s CPU budget and a wall-clock cap; long Firecrawl chains must be backgrounded.

## Plan to fix it properly

Split the function into **enqueue + background worker**, polled from the UI. Same feature, no timeouts.

### 1. New `processing_jobs` table (DB migration)
Columns: `id uuid pk`, `job_type text` (`'find_leads'`), `status text` (`queued|processing|complete|failed`), `progress int`, `payload jsonb`, `result jsonb`, `error text`, `created_by uuid`, `created_at`, `updated_at`. RLS: only admins can select/insert/update their own rows (via `has_role`).

### 2. Refactor `find-local-leads` edge function
- On invoke: validate input + admin, insert a `processing_jobs` row with `status='queued'`, return `{ job_id }` immediately (sub-second response).
- Kick off the heavy work via `EdgeRuntime.waitUntil(runLeadGeneration(job_id, …))`.
- Inside `runLeadGeneration`:
  - Update status to `processing`, set `progress` as it advances (0 → 25 after searches, → 60 after candidate parsing, → 100 on save).
  - Cap parallelism: chunk Firecrawl searches in groups of 4 with `await` between groups.
  - Cap `verifyOwnWebsite` calls: run only on the top N (e.g. 12) candidates after a cheap pre-filter, not all 80.
  - Cap `revealPhoneFromProfile` to top 6 candidates.
  - Add a hard wall-clock guard (e.g. 90s) — if exceeded, finalize with whatever's been added and mark `complete` with a `partial: true` note instead of crashing.
  - Catch errors → update job to `failed` with the error message.
  - On success → write result `{ added, skippedDuplicates, rejectedWithWebsites, rejectedInvalidSources, profilePagesScraped, candidatesExtracted }` and set `status='complete'`.

### 3. New tiny `get-job-status` edge function (or RPC)
Admin-only, returns `{ status, progress, result, error }` for a given job id. Cheaper than going through the snapshot RPC.

### 4. UI changes in `src/pages/Portal.tsx` (lead-finder box)
- On submit, call `find-local-leads` → get `job_id`, store it in state, show a progress bar / "Searching… X%" status using the existing button area.
- Poll `get-job-status` every 2s until `status` is `complete` or `failed` (max ~120s).
- On complete: render the same toast/snapshot refresh as today using `result`.
- On failed: surface `error` in a toast and unlock the form.
- Keep the existing remembered trade/location inputs.

### 5. Reduce wasted work even with backgrounding
- Drop the universal query list from 12 → 8 by removing low-signal duplicates (`"no website"`, `"small business phone email"` – Firecrawl returns mostly noise).
- Skip `verifyOwnWebsite` entirely when the source URL is *already* the company's own domain (we already know).
- Skip it when source is Facebook/Instagram (we already classify as `social_only`).
- This alone should cut Firecrawl calls per run by ~60–70%.

## Technical changes
- **DB migration**: create `processing_jobs` with admin-only RLS using `has_role`.
- **`supabase/functions/find-local-leads/index.ts`**: rewrite handler to enqueue + `EdgeRuntime.waitUntil`. Move existing logic into `runLeadGeneration(jobId, supabase, …)`. Add chunked `Promise.all`, candidate caps, wall-clock guard, progress updates.
- **`supabase/functions/get-job-status/index.ts`** (new): admin-checked select from `processing_jobs`.
- **`src/pages/Portal.tsx`**: replace single `invoke` with invoke → poll loop, add progress UI in the lead-finder card.
- No frontend types changes besides adding a small `JobStatus` type locally.

## Out of scope
- Showing a job history list (we just keep the latest job in state).
- Cancellation of in-flight jobs.

## Expected outcome
- Submit returns instantly with a job id and a progress bar.
- The bot completes universal searches reliably without "connection closed" errors.
- If something does go wrong inside the background work, you see the actual error in the UI instead of a silent failure.