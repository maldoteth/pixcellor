## Plan

One lead in the database has the unrecognised `source = 'set_in_stone'`:
- **test name** (test@testemail.com / 07777…) — submitted 2026-06-03 13:00 UTC, with a tiling-services brief.

### Steps

1. **Retag the lead**: update `contacts.source` from `set_in_stone` → `set_in_stone_tiling` so it routes to George's portal (`setinstoneltd@outlook.com`) and shows under the Set In Stone Tiling LTD brand.

2. **Send the notification email** to `setinstoneltd@outlook.com` by invoking `send-transactional-email` with the `customer-lead-notification` template, populated from the lead's name/email/phone/message and brand label "Set In Stone Tiling LTD". Uses an idempotency key tied to the contact id so it can't double-send.

3. **Verify**: check `email_send_log` for the new row and confirm status is `pending`/`sent`.

### Note on the broader queue issue

This sends one email directly through the transactional pipeline. If the `process-email-queue` cron is stalled on Live, the row may sit at `pending`. If that happens we'll need a separate investigation into the queue cron — out of scope for this plan.