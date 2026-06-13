# Upgrade Vision Generator image model

## Change
In `supabase/functions/generate-vision/index.ts` (line 284), swap the image-generation model:

- **From:** `google/gemini-3-pro-image-preview`
- **To:** `google/gemini-3.1-flash-image-preview` (Nano Banana 2)

## Why
- Pro-level visual quality, but noticeably faster — users wait less for their mockup.
- Lower cost per generation → more samples per credit.
- Same request shape (chat-completions + `modalities: ["image","text"]`), same response shape (`choices[0].message.images[0].image_url.url`) — no parsing changes needed.

## What stays the same
- `extract-vision-brand-kit` keeps `google/gemini-3-flash-preview` (works well for structured palette/font JSON).
- `generate-vision` brief/copy step keeps `google/gemini-3-flash-preview`.
- All prompts, error handling (429/402/500), and downstream upload/preview logic untouched.

## Verification
- Deploy the edge function.
- Trigger one Vision Generator run end-to-end from the site.
- Confirm the mockup renders, brand-kit extraction still succeeds, and the preview page loads.

## Rollback
One-line revert of the model string if quality regresses on real briefs.
