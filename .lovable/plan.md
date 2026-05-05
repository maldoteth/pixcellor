# Match Services to Pricing + animate both (desktop/tablet only)

Mobile drawer behavior for both dialogs stays untouched.

## 1. Restyle `ServicesDialog` desktop to match Pricing cards

Replace the current glass cards in `src/components/ServicesDialog.tsx` (desktop branch) with the same visual language used by `DesktopCards` in `PackagesDialog.tsx`:

- Three cards in a row, sharp-cornered (`rounded-none`), `border-border/40`, `bg-background`, with the same dual `boxShadow` (outer drop + inset highlight/shadow) used by the Full Works / Retainer cards.
- Add the `lava-blob` background trio (`lava-blob-1/2/3`) inside each card with a `relative z-10` content wrapper, mirroring the Pricing cards.
- Tilt layout to match Pricing: left card `rotate(-6deg)`, center card `rotate(0)` slightly elevated (`y: -20`, `scale: 1.05`) and using the heavier "featured" shadow + `lava-blob-featured-1/2/3`, right card `rotate(6deg)`.
- Card internals:
  - Icon chip: same 40px square with the gradient/border treatment already present, kept on top.
  - Title: `text-lg font-bold text-foreground`.
  - Bulleted list: replace dot bullets with `Check` icons (`w-5 h-5 text-foreground mt-0.5 shrink-0`) and `text-base text-muted-foreground`, matching Pricing.
  - CTA: replace `pricing-button` custom class with `<GlassBuyButton>`-equivalent `<Button variant="pricing">` so it visually matches the Pricing buy buttons. Labels remain "View Pricing" / "Speak to Sales".
- Keep mouse-tracking glow: reuse the same `handleMouseMove`/`handleMouseLeave` setting `--mouse-x` / `--mouse-y` CSS vars.
- Width parity: outer cards `w-[302px]`, center `w-[336px]`, container `flex items-center justify-center gap-6` with `md:max-lg:scale-[0.72] md:max-lg:origin-center` so it scales down on tablet exactly like Pricing.
- Header "Our Services" title is removed on desktop (Pricing has no in-dialog title); close button stays top-right.

## 2. Smooth open/close animations (desktop/tablet only)

Both `PackagesDialog` and `ServicesDialog` currently rely on Radix's default dialog overlay/content animation. Upgrade to a Framer Motion entrance/exit while keeping mobile drawers untouched:

- Wrap the desktop `DialogContent` children in a `motion.div` with:
  - `initial={{ opacity: 0, scale: 0.96, y: 12 }}`
  - `animate={{ opacity: 1, scale: 1, y: 0 }}`
  - `exit={{ opacity: 0, scale: 0.96, y: 12 }}`
  - `transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}`
- Use `<AnimatePresence mode="wait">` around the motion wrapper, gated on `effectiveOpen`/`open` so the exit plays before unmount.
- The card-level entrance motion (`y`, `rotate`, `scale` on each Pricing card) is preserved and reused on the new Services cards with the same staggered `delay: 0.1 / 0.2 / 0.3`.

## 3. Smooth cross-switching between Services <-> Pricing

Today, "View Pricing" inside the Services card calls `onClose()` then immediately dispatches `pixcellor:open-packages`, causing a hard cut. Make the handoff feel like one continuous motion:

- In `ServiceCard.handleClick` (services -> pricing): close Services first, then dispatch `pixcellor:open-packages` after a `~280ms` delay (slightly less than the exit duration) so the Services exit animation runs and the Pricing entrance starts as it finishes.
- Add a symmetric Services trigger from Pricing if/when needed (not required by this request, but the same delay pattern will be used).
- Both dialogs already broadcast `pixcellor:packages-open-change` / `pixcellor:services-open-change`; no change needed there.

## 4. Files touched

- `src/components/ServicesDialog.tsx` — desktop branch rewritten to mirror Pricing card structure; add Framer Motion wrappers and delayed cross-open in `handleClick`.
- `src/components/PackagesDialog.tsx` — wrap desktop `DialogContent` body in `AnimatePresence` + `motion.div` for open/close. No changes to mobile `Drawer` or to the existing per-card motion.

## Out of scope

- Mobile (`<Drawer>`) layouts and behavior — left exactly as-is.
- Pricing card content, prices, Stripe badge, Enterprise flow.
- Global animation tokens in `tailwind.config.ts` / `index.css` (using existing `lava-blob*`, `pricing` button variant, and Framer Motion only).
