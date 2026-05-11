## Goal
Make the admin Portal load fast by fetching only the first 10 rows of every list on initial load, with "Load more" / scroll pagination for the rest.

## Backend changes

1. Update `portal_fetch_snapshot()` to take an optional `_limit int default 10`:
   - Apply `LIMIT _limit` to every list (orders, falloffs, conversations, messages, profiles, inquiries, contacts, contactEvents, contactPersons, projectRequirements, editRequests, sampleRequests, aiSampleGenerations, emailLogs).
   - Add a `counts` object with the total row count for each section so the UI can show "10 of N" and know when to stop paginating.

2. Add `portal_fetch_section(_section text, _limit int default 20, _offset int default 0)` returning a JSON array. Used by "Load more" buttons. Whitelisted section names map to the same queries/orderings as the snapshot.

Both functions remain `SECURITY DEFINER` and call `portal_require_admin()`.

## Frontend changes (`src/pages/Portal.tsx`)

1. Initial `loadPortalSnapshot()` already calls the RPC with no args — keep that, server defaults to 10. Store `counts` in state.

2. For each list section, add a `loadMore(section)` helper that calls `portal_fetch_section`, appends results to the matching state array, and tracks an offset.

3. Add a `Load more` button (or IntersectionObserver-driven auto-load) at the bottom of these lists that currently render everything:
   - Orders / stripe sessions
   - Visitor fall-offs
   - Chat conversations (sidebar list)
   - Contacts (CRM table)
   - AI sample generations (Vision Studio)
   - Edit requests
   - Sample requests
   - Email logs
   - Inquiries

4. Keep existing client-side pagination for `clientsVisibleCount` and `callbacksVisibleCount`, but make them trigger a server `loadMore` once the visible count exceeds what's loaded.

5. Realtime subscriptions: when an event fires, instead of a full re-fetch, prepend the changed row to the matching list (already partly implemented). Fallback to a `loadPortalSnapshot()` for unknown changes — still cheap because of the 10-row cap.

## Out of scope

- No UI redesign — same tables, same tabs.
- Search/filter still operates on loaded rows; if the user types a query and matches are sparse, we'll add a "search server-side" fetch in a follow-up.
