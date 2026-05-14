## Goal
On `/preview/:slug`, "Get started" should skip the contact form whenever we already have the visitor's details on file. If a phone number is missing, show only a phone prompt — nothing else.

## Behaviour matrix
Looked up server-side by the preview's `client_email`:

- Email + phone known → submit silently, show "We'll be in touch" success.
- Email known, phone unknown → show a tiny one-field "What's the best number to call you on?" prompt → submit → success. Phone may be skippable (same as the existing flow allows).
- Email unknown (preview never sent) → fall back to the current full LetsTalk consultation flow.

## Changes

### 1. New edge function: `request-preview-consultation`
- Input: `{ slug, phone? }`
- Service-role lookup of `vision_previews` by slug to get `client_email`, `title`, `brief`, `image_path`, `slug`.
- If no `client_email` → return `{ ok: false, reason: "no_client_email" }`.
- Look up the most recent phone for that email across `contacts.phone` and `lets_talk_leads.phone` (most recent non-null wins).
- If no phone on file AND no `phone` in the request body → return `{ ok: false, reason: "phone_required", email }`.
- Otherwise insert a `lets_talk_leads` row and invoke `process-lets-talk-lead` with the same payload shape `LetsTalkPrompt.requestConsultation` uses (source `consultation_request`, preview slug/title, image URL, brief). Use the known name from `contacts` if available, otherwise empty string.
- Return `{ ok: true, email }`.
- `verify_jwt = false` (public, gated by slug knowledge — same trust model as the preview page).

### 2. `src/pages/VisionPreview.tsx`
- "Get started" button calls the new function with no phone first.
  - `ok: true` → set `requested = true`, `submittedEmail = email`, render existing success block.
  - `ok: false, reason: "phone_required"` → reveal a small inline phone input + Submit button (with a Skip option). On submit, call the function again with `phone`. On success → success block.
  - `ok: false, reason: "no_client_email"` → fall back to the existing `openLetsTalk` consultation flow (unchanged code path).
  - Network/other errors → toast and let user retry.
- Add a small loading state on the button while requests are in flight.

### 3. No changes
- No DB schema changes.
- `LetsTalkPrompt`, success UI, magic-link block, and notification pipeline (`process-lets-talk-lead`) are all unchanged.
