I found both issues:

1. The sender display name is hardcoded as `morph-glide-show`, so inboxes show the old project name even though the email address is correct.
2. The order email template uses a basic dark card, but it does not have enough safe email spacing/structure. In the screenshot it renders cramped at the top and the content block feels unfinished.

Plan:

1. Fix sender branding
   - Change the app email sender display name from `morph-glide-show` to `Pixcellor™`.
   - Keep the sender address as `projects@pixcellor.com` and reply-to as `projects@pixcellor.com`.
   - Check auth email branding too, since the same old project name is also present there.

2. Redesign order confirmation emails
   - Update all customer order templates: Full Works, Elite, and Retainer.
   - Make them match Pixcellor’s black minimal / glass style while still rendering cleanly in email clients.
   - Add better vertical rhythm: larger top padding, clearer brand header, cleaner hero title, separated sections, and better order-detail spacing.
   - Avoid cramped text by replacing the current single dense block with structured rows/sections.
   - Keep the email body white for email-client compatibility, with a polished black Pixcellor card inside.

3. Polish internal order alert too
   - Apply the same improved spacing and card styling to the internal “new order received” email so the Pixcellor admin alert looks consistent.

4. Redeploy the email sender
   - Deploy the updated app email function so future emails use the fixed name and improved templates.

5. Verify after deployment
   - Render/check the templates through the existing preview function where possible.
   - Confirm the sender name is now Pixcellor™ in the outgoing payload.

Technical details:
- Files to update:
  - `supabase/functions/send-transactional-email/index.ts`
  - `supabase/functions/auth-email-hook/index.ts` if needed for consistent branding
  - `supabase/functions/_shared/transactional-email-templates/full-works-order-confirmation.tsx`
  - `supabase/functions/_shared/transactional-email-templates/elite-order-confirmation.tsx`
  - `supabase/functions/_shared/transactional-email-templates/retainer-order-confirmation.tsx`
  - `supabase/functions/_shared/transactional-email-templates/internal-new-order-notification.tsx`
- Functions to redeploy:
  - `send-transactional-email`
  - `preview-transactional-email` if template previews depend on the shared updated templates
  - `auth-email-hook` only if its sender/site name is changed