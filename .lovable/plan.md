## Goal

Add an **Affiliate** tab to the customer portal sidebar that gives any logged-in user the same Clients/CRM experience admins have in `src/pages/Portal.tsx` (the "profiles" tab) — but scoped strictly to contacts they themselves created. Plus: prevent adding a duplicate client, and as the user types a name (>3 chars) show a dropdown of close matches from their own CRM.

## Scope of the copy

The admin Clients tab in `Portal.tsx` is ~1,500 lines tightly coupled to dozens of admin-only states (orders, profiles_q, contact_events, lead scoring, media uploads, duplicate panel, CSV import, etc.). A literal copy-paste into `CustomerPortal.tsx` would drag in admin-only data and break.

Two realistic options — please pick one before I build:

### Option A — Faithful clone (recommended, larger change)
Extract the existing Clients tab into a reusable `<ClientsCrmPanel mode="admin" | "affiliate" userId={...} />` component. Use it unchanged in Portal.tsx and mount it under the new Affiliate tab in CustomerPortal.tsx. Affiliate mode hides admin-only controls (CSV import to global pool, duplicate-merge across all users, lead scoring batch jobs) and filters every query to `created_by_user_id = auth.uid()`.

- Pros: pixel-identical UI, single source of truth going forward.
- Cons: ~1-2 days of careful refactor; risk of regressions in the admin Clients tab while extracting.

### Option B — Lean affiliate CRM (fast)
Build a new, smaller `AffiliateCrmPanel` that reuses the same visual styles (cards, table rows, status chips, search bar) but only the core fields: name, contact_name, email, phone, website, industry, status, notes, plus a simple events/notes timeline. No CSV import, no lead-score batch, no media uploads.

- Pros: ships today, no risk to admin tab.
- Cons: not literally the same code — visually matches, feature set is the subset that makes sense for one user's own pipeline.

## Database changes (same for both options)

1. Add RLS policies so authenticated users can `SELECT/INSERT/UPDATE/DELETE` rows in `public.contacts`, `public.contact_events`, `public.contact_persons` **only where `created_by_user_id = auth.uid()`**. Admin policies stay as-is.
2. Trigger on `contacts` insert: if `created_by_user_id` is null, set it to `auth.uid()`.
3. Duplicate prevention: unique partial index on `(created_by_user_id, lower(name))` and on `(created_by_user_id, lower(email)) where email is not null`. App-side check runs first and surfaces a friendly error before insert.

## Duplicate detection + live match dropdown

- On the "Add client" form, debounce the `name` input. When length ≥ 3, query the user's own contacts: `name ILIKE %q%` ordered by similarity (use `pg_trgm` `similarity()` if available, else simple `ILIKE` + length sort), limit 8.
- Render a dropdown under the input. Clicking a match opens that contact instead of creating a new one.
- On submit, re-check for exact case-insensitive name or email match in the user's own contacts; block with toast "You already have a client called X".

## Frontend wiring

- `src/pages/CustomerPortal.tsx`:
  - Add `"affiliate"` to the `PortalTab` union.
  - Add `{ title: "Affiliate", value: "affiliate", icon: Users }` to `navItems` (position: TBD — end of list unless you want it elsewhere).
  - Add matching `<TabsContent value="affiliate">` rendering the panel from the chosen option.

## What I need from you

1. **Option A or Option B?** (A = literal clone via refactor; B = same look, lean feature set, ships now.)
2. Where should the **Affiliate** tab sit in the sidebar — at the end, or right after a specific item?
