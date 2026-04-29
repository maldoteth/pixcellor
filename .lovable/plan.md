The emails are showing a plain typed “P” because the email templates currently hard-code that mark as text instead of using the uploaded Pixcellor logo image. I found the actual logo asset already available in the project (`public/pixcellor-email-logo.png` and `src/assets/customer-portal-p-logo.png`), but the email templates still render `<Text>P</Text>`.

Plan:

1. Update branded auth email templates
   - Replace the plain text P mark with the actual Pixcellor logo image in:
     - magic link/login emails
     - signup emails
     - invite emails
     - email change emails
     - password recovery emails
     - reauthentication emails
   - Keep the email-safe white outer background and square/no-radius styling.

2. Update app/order email templates
   - Replace the same plain P mark in customer/order templates:
     - Full Works order confirmation
     - Elite order confirmation
     - Retainer order confirmation
     - project requirements reminder
     - order complete email
   - Keep spacing aligned with the current email header layout.

3. Use an email-safe logo URL
   - Use the public logo asset URL from the live site so inboxes can load it reliably.
   - Add proper `alt="Pixcellor"`, fixed width/height, and square styling.

4. Deploy the updated email functions
   - Because email templates are served from backend functions, changing the files is not enough; I will redeploy the affected email functions so new emails immediately use the real logo.

Technical details:

- The replacement will use React Email’s `Img` component rather than text.
- I will update both auth email templates and app email templates under `supabase/functions/_shared/...`.
- After edits, I will deploy the relevant backend email functions (`auth-email-hook`, `send-transactional-email`, and any email preview/sending functions that import these templates if needed).