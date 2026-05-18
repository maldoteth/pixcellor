## Goal

Keep the gold gradient color of the sales/CTA buttons, but rebuild their styling to match the `pricing-button` glass treatment used on the Buy Now / Talk to Sales buttons in the pricing cards (sharp corners, heavy shadow, inset highlights, shimmer sweep on hover, uppercase label).

## Where the gold buttons live

- `src/components/services/ServiceSalesView.tsx` — `CtaButton` primary variant (hero + footer band)
- `src/components/PackagesDialog.tsx` — `FreeSamplesBadge` inner "Request" pill (small gold button inside the starburst)

The numbered process-step circles in `ServiceSalesView` also use the gold gradient, but they aren't buttons — leave those untouched.

## What pricing buttons look like (reference)

`.pricing-button` in `src/index.css` (lines 158–204):
- `border-radius: 0` (sharp corners)
- 1px translucent border, glass gradient background
- Heavy outer shadow + inset highlight/shadow
- `backdrop-filter: blur(28px) saturate(160%)`
- `::after` shimmer sweep on hover, `filter: brightness(1.25)` on hover
- Used via `<Button variant="pricing">` which also applies uppercase text

## Plan

1. **Add a new `.pricing-button-gold` class in `src/index.css`** that mirrors `.pricing-button` exactly (sharp corners, same shadow stack, same `::before` inner highlight, same `::after` shimmer sweep, same hover brightness) but swaps:
   - `background` → gold gradient `linear-gradient(135deg, #f5e6a8 0%, #d4af37 50%, #8a6a1f 100%)`
   - `border` → `1px solid #d4af37`
   - `color` → `#1a1205` (dark for contrast on gold)
   - Outer shadow gains a subtle gold glow: `0 0 18px rgba(212,175,55,0.35)` layered with the existing deep shadow
   - `::before` highlight uses a warm white tint so it reads on gold
   - `::after` shimmer uses a brighter gold-tinted sweep

2. **Add a matching `goldPricing` variant to `src/components/ui/button.tsx`** that applies `pricing-button-gold` plus the same uppercase/tracking/transition utilities the `pricing` variant uses. Keeps the API consistent so callers just do `<Button variant="goldPricing">`.

3. **Update `CtaButton` primary in `src/components/services/ServiceSalesView.tsx`** to render `<Button variant="goldPricing">` instead of the inline-styled `<button>`. Keep the `ArrowRight` icon. Remove the inline `style` block and the `rounded-md` (sharp corners now). Keep `dispatchCta(action)` wiring untouched.

4. **Update the "Request" pill inside `FreeSamplesBadge` in `src/components/PackagesDialog.tsx`** to use the same `pricing-button-gold` class (kept small via size utilities) so the badge's mini CTA matches. Preserve its existing click handler and stopPropagation.

5. **Leave untouched**: the gold numbered step circles in `ServiceSalesView`, the gold starburst outline in `FreeSamplesBadge`, the existing `pricing-button` class and its usages, and all `Buy Now` / `Talk to sales` buttons.

## Technical notes

- The secondary CTA variant in `ServiceSalesView` (glass/outline) already matches the project's secondary style — leaving it as-is.
- `Button` variant additions go inside the existing `cva` `variants.variant` block; no other shadcn changes needed.
- Hover behavior stays purely CSS (shimmer + brightness) — consistent with the no-CSS-hover-scale memory rule, since this is filter/brightness, not transform-scale.
- All color values are kept in the new CSS class so components don't carry raw hex.

## Out of scope

- No copy changes, no layout changes, no changes to secondary CTAs, no changes to the starburst, step circles, or any non-gold buttons.
