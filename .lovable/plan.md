## Goal
Make every carousel card show the same subtle dark gradient behind the label so the text area has a consistent "colour render" effect across all projects (not just Bricks-hosted ones).

## Change
In `src/components/ui/circular-gallery.tsx`, remove the `bricks.`-only domain check around the gradient overlay so it renders unconditionally on every card.

Before:
```tsx
{/(^|\.)bricks\./i.test(item.photo.by ?? '') && (
  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
)}
```

After:
```tsx
<div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
```

Everything else (glass label, click-to-open, hover glow, rotation, sensitivity) stays untouched.

## Verification
- Spin the carousel: SEC Digital, Ponzi, and every other card now show the same darkened gradient under the label text.
- Label text remains readable on bright thumbnails.
- Click behaviour on front-facing cards still opens the company link in a new tab.
