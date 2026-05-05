## Goal
Match the footer layout in the screenshot: one centered horizontal row containing `Pixcellor™` followed inline by the phone, Facebook, LinkedIn, chat, and login icons — on every viewport.

## Current behavior
In `src/components/Footer.tsx`, the brand span uses `w-full md:w-auto text-center`, which forces `Pixcellor™` onto its own line on mobile and only sits inline from `md` upward. The icons are also split across two flex groups with different gaps.

## Changes (single file: `src/components/Footer.tsx`)

1. Remove `w-full md:w-auto` from the `Pixcellor™` span so it always sits inline with the icons. Keep the small font size and weight.
2. Flatten the icon layout: drop the inner `<div className="flex ... flex-nowrap">` wrapper around the phone link so all five icons (phone, Facebook, LinkedIn, chat, login) are direct children of the same flex container, sharing one consistent gap (e.g. `gap-x-4`).
3. Keep the outer container as `flex items-center justify-center` with `flex-nowrap` so brand + icons stay on one line and centered, matching the screenshot.
4. Leave the mobile progressive-blur backdrop, safe-area padding, and existing accessibility labels untouched.

## Out of scope
No changes to icons, links, colors, or the blur/glass background — only the row layout.
