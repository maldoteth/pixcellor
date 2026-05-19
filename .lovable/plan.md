## Wire Twilio Messaging Service SID into outbound SMS

1. Add runtime secret `TWILIO_MESSAGING_SERVICE_SID` = `MGea1c47a75ffa7a327e0e167be001e9dd`.
2. `supabase/functions/process-sms-queue/index.ts` — already updated to prefer `MessagingServiceSid` over `From` when the env var is set. Verify and deploy.
3. `supabase/functions/send-sms-broadcast/index.ts` — inspect; if it calls Twilio directly, apply the same swap. Otherwise leave alone (it likely just enqueues into `sms_messages`).
4. Deploy affected functions.
5. Test: enqueue a test row (or trigger via existing UI) to +447474997046 from +447476942068, then invoke `process-sms-queue` and check `sms_messages` row + edge logs for absence of error 21663.

### Notes
- Falls back to raw `From` if the secret is unset, so this is safe to ship before the secret lands.
- No DB schema or UI changes.