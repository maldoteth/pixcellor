I tested the mobile preview at the current 384x620-sized viewport. The footer does exist, but it is pinned to the bottom of the viewport as an overlay, not placed below the carousel area. On mobile this means it can be hidden behind the consent banner, browser safe-area, or visually swallowed by the bottom of the carousel. It is not behaving like a real “below the carousel” footer.

Plan:

1. Move the mobile footer out of the overlay behavior
   - Keep desktop as-is if needed.
   - On mobile, render the footer as a fixed bottom-safe foreground strip or a dedicated bottom slot that is not sharing space with the carousel cards.
   - Ensure it appears the moment the carousel/portfolio appears, not at initial home load.

2. Reserve real space for it on mobile
   - Increase the carousel’s bottom clearance based on the actual footer height plus safe-area inset.
   - Stop the carousel cards from extending into the footer zone.
   - This is the main reason it currently feels invisible: the carousel is using the same lower screen area.

3. Make the footer visually obvious on mobile
   - Use brighter text from the first visible frame.
   - Give the mobile footer a stronger black/glass background so it does not blend into the black page or card shadows.
   - Keep the Pixcellor/social icons compact but readable.

4. Prevent the consent banner from masking the issue
   - The consent banner currently sits over the same bottom area and can completely cover the footer on first visit.
   - I’ll either lift the carousel footer above the consent banner when needed, or add enough bottom offset so both can coexist without hiding each other.

5. Verify on actual mobile aspect ratios
   - Test 320x568, 360x800, 390x844, 414x896, and the current 384x620 preview.
   - Confirm: hidden on first hero screen, visible immediately when portfolio/carousel appears, readable, not covered by carousel cards, and not covered by the consent banner.