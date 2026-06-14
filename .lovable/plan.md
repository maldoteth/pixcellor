## What's changing

### 1. Add a "check spam/junk" note in two places

**a) The success screen** users see right after booking a call (in `src/pages/GetStarted.tsx`, the final step of the booking stepper).

Add a small line under the "Confirmation sent" message:

> 📬 **Don't see it?** Check your spam / junk folder for an email from `pixcellor.com` and mark it as "Not Junk" so future ones land in your inbox.

Styled to match the existing glass-card aesthetic (subtle, low-contrast, but visible).

**b) The confirmation email itself** (`supabase/functions/_shared/transactional-email-templates/call-booking-confirmation.tsx`) — add a small note near the top of the email body:

> *If you're forwarding this to a colleague, ask them to whitelist `pixcellor.com` so the call link doesn't get blocked.*

This won't help the recipient who already received it, but it primes the next person.

### 2. Fix the 404

This isn't a code change — your `/call/:bookingId` route exists in the codebase and works in preview. The 404 happens because the **live site at `pixcellor.com` hasn't been republished** since the route was added.

**Action**: hit Publish. Once republished, the same link you clicked will work.

After republishing, test by:
1. Booking another test slot
2. Opening the email link on your laptop (guest view)
3. Opening the host link (from the internal notification email) on your phone
4. Both sides should connect

### Files touched
- `src/pages/GetStarted.tsx` — add spam note to confirmation step
- `supabase/functions/_shared/transactional-email-templates/call-booking-confirmation.tsx` — add forwarding note
- Deploy `send-transactional-email` after template edit

No DB changes, no new secrets, no new routes.
