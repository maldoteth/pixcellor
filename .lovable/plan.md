## Goal
Make magic-link login send a fresh link whenever someone requests one, while preventing spam with the rule: **maximum 3 requests per email in 2 minutes**.

## What I found
- The login UI currently sets `linkSent = true` after a send and disables the button forever until the email field changes. That makes it look like the app refuses to send new links “ages later”.
- The current code calls the built-in auth magic-link sender directly from the browser, which has its own stricter resend cooldown. That is why the user sees “already sent” even when the intended product rule is different.
- Existing email delivery logs show magic-link emails being queued and sent correctly; this is mainly a request/resend flow issue.

## Plan
1. **Move magic-link request handling into a backend function**
   - Add a `request-customer-login-link` backend function that receives an email + handoff id.
   - Validate the email and generate the magic link server-side.
   - Enforce the product rate limit: allow up to **3 login-link requests per email within 2 minutes**.
   - Return a clear success or rate-limited response with a retry time.

2. **Track login-link request attempts**
   - Add a small `login_link_requests` database table storing email, created time, and lightweight request metadata.
   - Keep access locked to the backend only.
   - Add an index for fast counting by email/time window.

3. **Update the login UI behavior**
   - Replace direct browser `signInWithOtp` calls in customer login components with the new backend function.
   - After a successful send, keep the page in “waiting for link” mode, but do **not** permanently block future sends.
   - Add a resend option/countdown so users can request another link later.
   - If they hit 3 in 2 minutes, show a clear message like: “Too many login links requested. Try again in X seconds.”

4. **Preserve cross-device login**
   - Continue generating the `sid` handoff id and including it in the magic-link redirect URL.
   - Keep the desktop tab listening for the mobile click and auto-login behavior.

5. **Validate**
   - Check the request function response for normal sends and rate-limited sends.
   - Confirm the UI no longer gets stuck on “Magic link sent”.
   - Confirm the existing auth handoff page still completes cross-device login.