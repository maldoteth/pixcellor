# Move custom payment links into the admin panel

The "Custom links" tab is currently in `/customer-portal` (customer-facing dashboard, only shown if you're an admin). You're on `/portal`, the admin panel — different page. I'll move it there.

## Changes

1. **Add "Payment links" tab** in `src/pages/Portal.tsx`:
   - Add a new `<TabsTrigger value="payment_links">` (with `Link2` icon, "Payment links" label) in the `TabsList` next to Studio/Alerts.
   - Bump `TabsList` from `xl:grid-cols-9` → `xl:grid-cols-10`.
   - Add a matching `<TabsContent value="payment_links">` that renders the existing `CustomLinksTab` component.

2. **Remove it from `/customer-portal`** (`src/pages/CustomerPortal.tsx`):
   - Drop the `custom_links` PortalTab value, the conditional nav item, and the conditional `TabsContent`.
   - Remove the `CustomLinksTab` import and the `Link2` icon import.

3. **No backend changes** — table, edge function, and webhook hook stay the same.

After this, sign in to `/portal`, look for the "Payment links" tab in the top tab row.
