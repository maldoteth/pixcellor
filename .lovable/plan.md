## Plan: Black 3D Frame for Portfolio Cards

### Goal
Apply a glass-morphism 3D frame to every portfolio card (CircularGallery items) so they match the visual vibe of the existing `pricing-button` styling — dark, dimensional, with subtle highlights and depth.

### Where the cards live
- `src/components/ui/circular-gallery.tsx` — `GalleryCard` component, line ~180
- Current card shell: `relative w-full h-full overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black`

### What to change

#### 1. Add a reusable `.portfolio-card-frame` utility in `src/index.css`
   Reuse the same visual language as `.pricing-button`:
   - Subtle white border (`rgba(255,255,255,0.15)`)
   - Gradient background for glass depth
   - Inset top highlight + bottom shadow
   - Backdrop blur / saturate
   - Soft outer shadow for lift
   - Keep `rounded-2xl` since cards are square-ish (unlike buttons which are `rounded-none`)

#### 2. Replace the card shell className in `GalleryCard`
   Swap the current `shadow-2xl border border-white/10 bg-black` combo for the new `.portfolio-card-frame` class. Keep `relative w-full h-full overflow-hidden rounded-2xl`.

### Design details
- The inner image, gradient overlay, liquid-glass blur bubble, and text labels remain exactly as they are — only the outer frame gets the 3D treatment.
- On mobile (`mobileMode`), the touch-driven halo glow behind the card stays untouched.
- No functional or behavioral changes; purely visual.

### Files affected
- `src/index.css` — add new utility class
- `src/components/ui/circular-gallery.tsx` — swap card wrapper className