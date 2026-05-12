## Two fixes for the customer dashboard

### 1. "Open vision" button leads to 404

`src/pages/CustomerPortal.tsx` links to `/vision/${preview.slug}` in two places (the card thumbnail link and the "Open vision" button). The actual route registered in `src/App.tsx` is `/preview/:slug` (handled by `VisionPreview.tsx`).

**Fix:** Change both links in `VisionPreviewCard` from `/vision/${preview.slug}` → `/preview/${preview.slug}`.

### 2. Show ALL of a user's AI generations

Today the portal shows rows from `vision_previews` filtered by `client_email = user_email` (via the `customer_fetch_portal` RPC). That table only gets populated by `generate-vision` when a `client_email` was passed in at generation time. Earlier generations the same person made before they entered an email — or generations where the email field was skipped — never get attached to their account, so the dashboard looks incomplete.

Every generation does, however, get logged in `ai_sample_generations` with `email`, `visitor_id`, `storage_path`, and `preview_slug`.

**Fix:** Update the `customer_fetch_portal` RPC so `visionPreviews` returns the union of:

- All `vision_previews` rows where `lower(client_email) = user_email`, **plus**
- All `ai_sample_generations` rows where `lower(email) = user_email` AND `preview_slug IS NOT NULL` AND that slug is NOT already in the first set.

Map the `ai_sample_generations` rows into the same shape the frontend already consumes:
```
id, slug (= preview_slug), title (= company or contact_name or 'AI vision'),
brief, image_path (= storage_path), created_at
```

Order combined results by `created_at DESC`, no LIMIT.

No frontend type changes needed — the shape stays identical.

### Technical notes

- Migration: `CREATE OR REPLACE FUNCTION public.customer_fetch_portal()` with the new union query for `visionPreviews`.
- Code edit: 2 string replacements in `src/pages/CustomerPortal.tsx` (`/vision/` → `/preview/`).
- No schema changes, no new tables, no RLS changes (RPC is `SECURITY DEFINER`).
