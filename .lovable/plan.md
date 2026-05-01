# Beautifully formatted broadcast emails

Right now broadcasts send as a plain `<p>` of text inside a bare HTML shell. Two things to upgrade:

1. **Composer** — a real rich-text editor in the Campaigns tab, plus quick blocks (heading, button/CTA, image, divider).
2. **Email template** — a branded, mobile-tested HTML wrapper around your content so every send looks like Pixcellor (not a generic Resend email).

---

## 1. Rich editor (Campaigns tab)

Replace the plain `<textarea>` with a Tiptap editor (already a common, lightweight choice). Toolbar:

- Bold / italic / underline
- H1 / H2 / paragraph
- Bullet + numbered lists
- Link
- **Insert image** (upload to a new `email-assets` storage bucket, public read)
- **Insert button** (CTA — label + URL, renders as a styled button block)
- Divider
- Undo / redo

The editor stores HTML, which gets passed to the edge function as `bodyHtml` (already supported).

A **live preview pane** sits next to the editor (or below on mobile) showing exactly what recipients will see, rendered inside the branded template at ~600px width — same view on desktop, narrow, and dark-mode-clipped.

## 2. Branded email template

Rebuild `buildHtml()` in `send-broadcast/index.ts` as a proper marketing-email layout:

- 600px centered container, white card on light grey body background
- **Header**: Pixcellor wordmark logo (hosted PNG), centered, ~32px tall
- **Body**: the editor's HTML, restyled with email-safe inline CSS (system font stack, 16px / 1.6 line-height, dark text, headings styled, links underlined in brand color, images responsive `max-width:100%`, CTA buttons rendered as bulletproof table-based buttons that work in Outlook)
- **Footer**: smaller grey text — short tagline, social links (LinkedIn, Instagram, Facebook, X), physical line "Pixcellor™ · UK", and the unsubscribe link
- Plain-text fallback auto-generated from the HTML (strip tags) and sent in the `text` field for better deliverability

Email-safe rules baked in:
- Inline styles only (no `<style>` blocks except a tiny `@media` for mobile)
- Table-based layout for the outer shell (Outlook-safe)
- No web fonts — system stack
- `role="presentation"` on layout tables
- Preheader text (hidden preview snippet) — pulled from the first 90 chars of body or settable in the composer

## 3. Reusable templates (small bonus)

Add 3 starter templates the user can load into the editor with one click:

- **Announcement** — heading, paragraph, CTA button
- **Newsletter** — heading, two short sections, image, CTA
- **Plain note** — just a heading and paragraph (closer to a personal email)

Stored as static HTML snippets in the frontend; clicking loads them into the editor.

---

## Technical changes

- `package.json`: add `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`
- New `src/components/email/RichEmailEditor.tsx` — Tiptap wrapper with the toolbar above
- New `src/components/email/EmailPreview.tsx` — renders the same branded template client-side for live preview
- New `src/components/email/emailTemplate.ts` — single source of truth for the HTML wrapper (used by both preview and edge function via duplicated string, since edge functions can't import from `src/`)
- New Supabase storage bucket `email-assets` (public read, admin-only write) for inline images
- `supabase/functions/send-broadcast/index.ts`: replace `buildHtml()` with the new branded template; auto-generate plain-text fallback; add preheader support
- `BroadcastCampaigns.tsx`: swap textarea for `RichEmailEditor`, add preview pane, add template-picker buttons, add optional preheader input

No DB schema changes needed beyond the storage bucket. Existing send pipeline, suppression, logging, and rate-pacing all stay the same.

