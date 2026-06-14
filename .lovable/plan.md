## Goal
Give the Pixcellor team a place inside `/portal` to see scheduled call bookings and join each one as the host with one click — no digging through inbox for the host link.

## Where it lives
- New admin-only tab **"Calls"** in `src/pages/CustomerPortal.tsx`, gated by the existing `isAdmin` (`has_role('admin')`) check that already wraps the other admin tabs.
- New component `src/components/portal/CallBookingsPanel.tsx` rendered when that tab is active.

## What the panel shows
A single list grouped into two sections:

1. **Upcoming / pending** — `status` ≠ `cancelled` and either `scheduled_at >= now()` or `preference` ≠ `specific` (callback requests with no fixed slot), ordered by `scheduled_at` ascending (nulls first).
2. **Past** — `scheduled_at < now()`, ordered descending, collapsed by default (last 30 days only, "Show more" to load older).

Each row shows:
- When: formatted London time, or "Callback — {preference}" if no specific slot.
- Customer: name, company, email, phone (tap-to-call link).
- Brief (truncated, expandable).
- Status badge: `pending` / `confirmed` / `completed` / `cancelled`.
- Actions:
  - **Join as host** — primary button, opens `/call/{id}?t={host_token}` in a new tab.
  - **Copy guest link** — copies `/call/{id}?t={guest_token}` to clipboard (toast on success).
  - **Copy host link**.
  - Overflow menu: Mark completed, Mark cancelled.

Top of panel: small stat row (Today, This week, Pending callbacks) and a refresh button. Auto-refresh every 60 s.

## Data access
- `call_bookings` is currently service-role only. Add an RLS policy so admins can read and update it directly from the client:
  - `SELECT` for any user where `public.has_role(auth.uid(), 'admin')`.
  - `UPDATE` (status only) for admins.
- Grant `SELECT, UPDATE` on `public.call_bookings` to `authenticated` (service_role grant stays).
- No new tables, no new edge functions — the panel queries `call_bookings` directly with the supabase client.

## Status updates
"Mark completed/cancelled" updates `call_bookings.status` directly via the client (covered by the new admin UPDATE policy). After updating, refetch the list.

## Styling
Match existing portal aesthetic: black surface, white/10 borders, glass cards, Framer Motion fade-in on rows. Buttons use the existing `Button` variants. Status badges use the project's badge colors.

## Out of scope (not changing now)
- Internal-lead notification email content stays the same — host link is still in it as a fallback.
- No calendar `.ics` invite yet (option B/C wasn't chosen).
- No realtime/Supabase realtime subscription — polling every 60 s is enough.

## Files touched
- `supabase/migrations/<new>.sql` — RLS policies + grants on `call_bookings`.
- `src/pages/CustomerPortal.tsx` — add admin "Calls" tab trigger + content.
- `src/components/portal/CallBookingsPanel.tsx` — new component (list, actions, polling).

## Acceptance
- Admin logs in to `/portal`, sees a **Calls** tab.
- Tab shows the upcoming bookings, each with a working **Join as host** button that opens the call room as host.
- Non-admin users do not see the tab and cannot read `call_bookings`.
