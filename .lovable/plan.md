Plan to add the missing order success screen:

1. Change checkout success redirect
   - Update the checkout session success URL from the homepage query string to a dedicated route like `/order-success?session_id=...`.
   - Keep the cancel redirect as-is unless it needs a separate cancellation screen later.

2. Add a new `/order-success` page
   - Create a branded Pixcellor success screen instead of dumping the buyer back on the homepage.
   - Show a “Payment received / order confirmed” state, package/order details when available, and clear next steps telling the client to check their email and reply with specifics, colours, images, social links, copy, requests, etc.
   - Include a button back to the homepage.

3. Confirm the order after redirect
   - Add a small backend function that checks the checkout session/order status safely by `session_id`.
   - The success page will poll for a short period because Stripe’s webhook can arrive slightly after the browser redirect.
   - While waiting, show a polished “confirming your order” state.

4. Add the fansite-style confetti
   - Install/use `canvas-confetti` like the referenced fansite project.
   - Recreate the two-side fireworks plus center burst effect after the page confirms the order.
   - Fire it once per successful page load, not repeatedly while polling.

5. Register and deploy
   - Add the `/order-success` route in `src/App.tsx`.
   - Deploy the changed checkout/backend functions so Stripe uses the new success URL.

Technical details:
- Likely files to change/create:
  - `supabase/functions/create-checkout/index.ts`
  - new `supabase/functions/check-order-status/index.ts`
  - `supabase/config.toml` if needed for the new function entry
  - new `src/pages/OrderSuccess.tsx`
  - `src/App.tsx`
  - `package.json` / lockfile for `canvas-confetti`
- The order check will not expose private portal/admin data; it will only return limited confirmation fields for the specific checkout session.