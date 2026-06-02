## Goal
Replace the generic "No valid recipients found" / "Send failed" errors in the email composer with messages that tell the user exactly why nothing was sent.

## Backend — `supabase/functions/send-broadcast/index.ts`

Track recipient state through the pipeline and return specific 400 responses:

1. Before suppression filtering, capture `initialCount = recipients.size`.
2. After filtering against `suppressed_emails`, capture `suppressedCount = initialCount - recipients.size` and keep the list of suppressed emails (already in `supSet`).
3. Replace the single `"No valid recipients found"` branch with:
   - If no source selected and no extras and no test recipient → `"Add at least one recipient: pick a source, add emails, or set a test recipient."`
   - If `initialCount === 0` (source selected but produced 0 matches) → `"The selected recipient source returned 0 contacts. Adjust filters or add emails manually."`
   - If `initialCount > 0 && recipients.size === 0` (everyone filtered out) → `"All ${initialCount} recipient(s) are unsubscribed and were skipped. Nothing to send."` plus include `suppressedEmails` in the response payload so the UI can show them.
   - Apply the same shape to the preview branch (return `suppressedCount` alongside `recipientCount`).
4. Keep existing `"Subject is required"` and `"Email body is required"` (already specific).

## Frontend — `src/components/BroadcastCampaigns.tsx`

1. In the send handler (around line 159), surface the server `error` field as-is when present, and when the response includes `suppressedEmails`, append a short hint like " (e.g. malik@dehub.net)" using the first one.
2. Replace generic fallbacks:
   - `"Subject and body are required"` → split into `"Add a subject line."` and `"Add an email body."` based on which is missing.
   - `"Enter a test recipient email"` → `"Enter a valid test recipient email address."`
   - `"Preview failed"` fallback → `"Couldn't load preview — check subject, body, and recipient source."`
   - `"Send failed"` fallback → `"Couldn't send broadcast — check recipients and try again."`
3. In the preview panel, if `suppressedCount > 0`, render a small muted line: `"{n} unsubscribed contact(s) will be skipped."`

## Out of scope
SMS composer, transactional email functions, auth flows. UI layout unchanged apart from the new preview hint line.
