## Goal

Replace the inline "Tell us where to reach you" form on the **Vision Preview page** (`/preview/:slug`) with the **exact Let's Talk consultation flow** — same drawer on mobile, same step-by-step prompts, same AI lead processing — but seeded with the preview's image + brief so it's attached to the resulting CRM contact/lead. Phone becomes **required** in this flow.

## What to change

### 1. `src/pages/VisionPreview.tsx` — wire "Get started" into Let's Talk

- Delete the inline `capturing` state, `contactName/contactEmail` inputs, `submitAnonLead`, and the form block that renders them.
- Both the signed-in and anonymous "Get started" buttons now do the same thing:
  1. Stash the preview into `sessionStorage` under `pixcellor:consultation-context`:
     ```
     {
       imageUrl: <public URL of preview image>,
       brief: <preview.brief or title fallback>,
       previewSlug: preview.slug,
       previewTitle: preview.title,
       email: authedEmail ?? null,
     }
     ```
  2. Dispatch `window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "consultation" } }))`.
- Drop the local `requested` "thanks" panel (the Let's Talk drawer/dialog already shows its own success state). Keep the MagicLinkSignup section, but only show it once Let's Talk has confirmed (listen for a new `pixcellor:letstalk-submitted` event dispatched from LetsTalkPrompt on success — see step 3).
- Keep `MagicLinkSignup` as-is but render it on the success event for anonymous visitors so they can claim their dashboard.

### 2. `src/components/LetsTalkPrompt.tsx` — make phone required + carry preview metadata

- In the `consultation` context loader (already reads `pixcellor:consultation-context`), additionally read `previewSlug`, `previewTitle`, and store them in two new state fields (`previewSlug`, `previewTitle`).
- In `requestConsultation()` (and `orderThisStyle()` for the "Order this style" path), include in `request_details`:
  ```
  preview_slug, preview_title, source_preview_image_url
  ```
  Append the preview image URL to `attachment_urls` so it's saved against the contact (the existing `ensureHostedVisionUrl` already handles hosting if needed — for an already-hosted public URL it returns it as-is).
- Make phone **required** in consultation mode:
  - In `handleSkip`, if `mode === "consultation"` and `step === "phone"`, block skip and show "Please enter your number so we can reach you." (today phone-skip is only blocked when email was skipped).
  - In the same condition for `step === "email"`, still allow skipping email (so the flow can be phone-only) — the current behavior is fine, we only tighten phone.
  - The existing `phoneSchema` validation in `handleNext` already enforces a valid number, no change needed there.
- After `requestConsultation()` (and `orderThisStyle()`) succeed, dispatch `window.dispatchEvent(new CustomEvent("pixcellor:letstalk-submitted", { detail: { source: "consultation" } }))` so the VisionPreview page knows to swap to its success/MagicLinkSignup view.

### 3. Mobile + desktop parity

- LetsTalkPrompt already renders a `Drawer` on mobile (`useIsMobile`) and a `Dialog` on desktop with the identical step UI. By routing the preview "Get started" into the same component, mobile/desktop behave identically by construction.

### 4. AI / CRM follow-through

- `requestConsultation` already inserts into `lets_talk_leads` AND invokes the `process-lets-talk-lead` edge function — the same path used by the homepage Let's Talk button. That function is what creates/enriches the contact and runs the AI follow-through. By reusing it untouched, the preview "Get started" inherits the full flow without duplicating logic.

## Out of scope

- No edge function changes. `process-lets-talk-lead` already accepts `request_details` and `attachment_urls`; the new `preview_*` keys ride along inside `request_details` and are surfaced to admins through the existing CRM views.
- No schema changes. The preview image goes into existing `attachment_urls`; preview slug/title go into existing `request_details` JSON.
- No changes to the homepage Let's Talk behavior (talk + request modes are unchanged — only the consultation path gets the phone-required tightening, which matches user expectation for that flow).

## Files touched

- `src/pages/VisionPreview.tsx` — strip inline form, dispatch open-letstalk on Get started, listen for success event.
- `src/components/LetsTalkPrompt.tsx` — load preview metadata, attach preview image, attach preview info to `request_details`, enforce phone required in consultation mode, dispatch success event.
