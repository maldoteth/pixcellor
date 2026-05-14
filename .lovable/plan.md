## Change Info Buttons to Drawers on Desktop

### What
The `ServiceItemRow` component in `PackagesDialog.tsx` currently shows **custom tooltips** on desktop (hover to reveal, click to pin) and **bottom drawers** on mobile. This change makes the info buttons open **drawers on all screen sizes** — desktop included.

### How
Replace the desktop-only tooltip implementation in `ServiceItemRow` with the existing `Drawer` component:

- Remove: `isDesktop` media-query state, `pos` positioning state, `createPortal` tooltip, `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` hover handlers, `useLayoutEffect` scroll/resize listeners, and `useEffect` outside-click dismiss logic.
- Keep: `open` state, click handler on the info button, and the `Drawer` component already used for mobile.
- Result: Clicking any info button opens the same bottom drawer regardless of device, showing the service name and description.

### Scope
Single file: `src/components/PackagesDialog.tsx`. No backend or design-system changes needed.
