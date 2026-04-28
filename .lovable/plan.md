## What I found

The admin account and button are fine. The failure is in the “Mark delivered” flow.

Current flow:

```text
Admin clicks Mark delivered
  -> frontend calls backend function: send-order-complete
  -> function checks admin role
  -> function updates order to delivered via portal_mark_order_delivered
  -> function sends completion email through send-transactional-email
  -> if email send step fails, whole function returns 500
```

Recent live request evidence shows:

- `has_role` returns `true`, so admin access is not the problem.
- `portal_mark_order_undelivered` worked, so admin database RPC access is not the problem.
- `send-order-complete` returns `500` with only `{ "error": "Could not complete order" }`.
- Logs show `send-order-complete failed { message: "Could not complete order" }` twice.
- The order is still open afterwards, meaning the delivery update did not persist successfully through the full flow.

## Most likely cause

This was likely caused by the recent undo / function state drift.

I found `send-order-complete` exists in code, but `supabase/config.toml` does not include a config block for it, while similar functions do:

```toml
[functions.send-order-confirmation]
verify_jwt = false

[functions.send-requirements-reminder]
verify_jwt = false
```

There is no equivalent:

```toml
[functions.send-order-complete]
verify_jwt = false
```

That is suspicious because this function is called from the browser with the logged-in admin token, then it internally calls the transactional email function using the service key. If deployment/config got reverted or partially undone, this can produce exactly the kind of generic backend failure you’re seeing.

I also found a second issue: the function marks the order delivered before sending the email, but if the email step fails, the function throws and returns failure. The frontend then does not refresh as “delivered”. This makes the button feel broken even if part of the work happened or was attempted.

## What I would fix

1. Add the missing backend function config for `send-order-complete`.
   - Match the other admin-triggered email functions.
   - Set `verify_jwt = false` so the function can handle its own admin validation consistently.

2. Improve `send-order-complete` error logging.
   - Log the exact failing step: admin check, order lookup, database mark-delivered RPC, transactional email response, or JSON parsing.
   - Include email sender response status/body in logs.
   - Return a clearer user-facing error instead of only “Could not complete order”.

3. Make the delivery flow more robust.
   - Keep admin validation server-side.
   - Update order delivery status only when the function can complete the full action, or clearly separate “marked delivered” from “email failed”.
   - I recommend: mark delivered, attempt email, and if email fails return something like: “Order marked delivered, but completion email failed.” Then the portal still refreshes accurately.

4. Add the completion email template/status mismatch fix.
   - The portal’s snapshot currently looks for completion email template names like:
     - `full-works-order-complete`
     - `elite-order-complete`
     - `retainer-order-complete`
   - But the actual function sends `order-complete`.
   - This means even after the email sends, the “Completion sent” badge may not show correctly.
   - Update the snapshot function to include `order-complete` as a completion email.

5. Redeploy the affected backend functions after changes.
   - `send-order-complete`
   - `send-transactional-email` only if needed after the logging/template-status check

## Verification after implementation

After approval, I’ll test the full flow against the live backend:

1. Call `send-order-complete` for the same order with `website.com`.
2. Confirm the order row updates to:
   - `order_status = delivered`
   - `delivered_domain = website.com`
   - `delivered_at` set
3. Confirm the completion email is queued/logged.
4. Confirm the portal refresh shows it in Completed with the right badge.

## Short answer

Yes, it very likely broke because of an undo or partial revert around the backend function/config. The admin access is working; the failure is in the delivery completion backend function, probably around missing function config and weak error handling around the email-send step.