## Problem

The most recent magic-link requests for `dehub.bsc@gmail.com` (and `blocjerk123@gmail.com`) are still failing.

Inspecting the live `auth_emails` queue shows messages enqueued at 19:19 and 19:20 with:
- `purpose: "transactional"` (should be `"auth"`)
- `run_id: null` (should be the value forwarded from the webhook)

The on-disk source for `supabase/functions/auth-email-hook/index.ts` already has the correct values (`purpose: 'auth'` and `run_id` from `verifyWebhookRequest`). This means the deployed edge function is still serving an older build — the previous redeploy did not pick up the fix.

The Email API rejects every dispatch with `400 Missing run_id or idempotency_key`, the dispatcher retries 5×, and the message is moved to DLQ — so no email ever leaves.

## Fix

1. Force a fresh redeploy of `auth-email-hook` so the live function matches the source on disk (`purpose: 'auth'`, real `run_id`).
2. Drain the stuck messages currently in the `auth_emails` queue and any pending retries (they all carry the bad payload — leaving them there just produces more DLQ noise).
3. Trigger one new magic link to `dehub.bsc@gmail.com` and verify in `email_send_log` that the row goes from `pending` → `sent` (not `failed` / `dlq`).
4. If the new send still fails with `Missing run_id`, inspect the deployed function bundle directly (curl it) to confirm which build is actually running, and re-check the webhook payload shape to make sure `run_id` is present at `payload.run_id` (vs. nested somewhere else).

## Technical notes

- Verification query used: `SELECT msg_id, message->>'purpose', message->>'run_id' FROM pgmq.q_auth_emails ORDER BY msg_id DESC` — confirmed bad payloads still being enqueued post-deploy.
- No code changes are needed in the source file itself — only redeploy + queue cleanup + a fresh test send.
- Step 2 (queue drain) needs a migration since it's a delete; selects/inserts are not enough.