## What actually happened

You weren't logged in, so when you clicked **Get started** on `/preview/:slug`, the code in `src/pages/VisionPreview.tsx` (lines 152–159) just flips a local `requested` flag and shows the success message. It does **not** insert anything into `lets_talk_leads`, does not send an email, and does not store anything against a cache or visitor ID.

In short: nobody was notified, no record was created, and we don't have your details. The confirmation message was a UI lie for anonymous visitors. The "logged-in" branch (lines 138–151) does insert a lead — but that path didn't run for you.

## Fix plan

Rework the anonymous flow on `VisionPreview.tsx` so the success message only appears after we actually capture something:

1. **Anonymous click on "Get started"** → instead of jumping straight to the success card, show the email + magic-link block first (the same `MagicLinkSignup` UI that's currently hidden inside the success card).
2. **On email submit** → insert into `lets_talk_leads` with `source: "vision_preview_get_started"`, `email`, `request_details: { previewSlug, title, anonymous: true }`, then trigger the existing magic-link sign-in. Only then flip to the "Our team will be in touch" success state.
3. **Logged-in click** → unchanged (already inserts a lead with the authed email).
4. **Guard** so a misclick that closes the email form without submitting doesn't leave a false success state.

Optional small polish: also stamp the visitor's `visitor_id` (already tracked in falloff logic) into `request_details` so we can correlate the click with their session even before they give us an email — but the source of truth for "in touch" stays the email submission.

### Files touched
- `src/pages/VisionPreview.tsx` — restructure the `!requested` / `requested` blocks so anonymous users see the email capture before the confirmation, and the lead insert happens on submit.

No DB schema, edge function, or RLS changes needed (`lets_talk_leads` already allows anon inserts).