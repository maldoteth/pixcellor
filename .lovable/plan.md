## Problem

The Email/SMS sub-tabs inside the Campaigns tab (`src/pages/Portal.tsx` lines 2878-2880) use the same `pricing-button` style as the main top tab row (Sales / Orders / Campaigns / etc.). Two stacked rows of identical buttons read as one confusing block.

## Change

Swap the Email/SMS `TabsList` to a compact pill-toggle (segmented control) — visually distinct from the squared `pricing-button` tabs above.

- Container: inline pill, `rounded-full`, subtle border `border-white/10`, faint `bg-white/5` backdrop.
- Triggers: `rounded-full` pills, muted text by default, active state = solid white background with black text.
- Smaller (`h-8`, `px-4`) so it reads as a secondary control under the primary tab row.

Single edit in `src/pages/Portal.tsx` (lines 2878–2881), no other files affected.

Switch to build mode and I'll apply it.