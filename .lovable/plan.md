
## Add Pixcellor "P" Logo to Page Header

Add the provided "P" logo image to the top of the page with responsive positioning - centered on mobile, left-aligned on desktop/tablet.

---

### Implementation Steps

**Step 1: Copy the logo image to project assets**

Copy the uploaded logo from `user-uploads://Screenshot_2026-02-01_043730-3.png` to `src/assets/logo-icon.png`

---

**Step 2: Add logo to the hero component**

**File: `src/components/ui/scroll-morph-hero.tsx`**

Add the logo as a fixed-position element at the top of the page:

1. Import the logo asset at the top of the file:
```typescript
import logoIcon from '@/assets/logo-icon.png';
```

2. Add a logo container with responsive positioning just inside the main container (around line 259-260):
```tsx
{/* Logo - Mobile: center, Desktop/Tablet: left */}
<div className="absolute top-6 left-1/2 -translate-x-1/2 md:left-6 md:translate-x-0 z-20">
  <img 
    src={logoIcon} 
    alt="Pixcellor" 
    className="w-10 h-10 md:w-12 md:h-12"
  />
</div>
```

---

### Responsive Behavior

| Device | Position | Alignment |
|--------|----------|-----------|
| Mobile (< 768px) | Top center | Horizontally centered using `left-1/2 -translate-x-1/2` |
| Tablet/Desktop (≥ 768px) | Top left | Left-aligned with `md:left-6 md:translate-x-0` |

---

### Technical Notes

- The logo uses `z-20` to ensure it stays above the animated cards
- Sizing is `40x40px` on mobile, `48x48px` on desktop for good visibility
- The logo maintains its square aspect ratio to match the sharp-edged design system
