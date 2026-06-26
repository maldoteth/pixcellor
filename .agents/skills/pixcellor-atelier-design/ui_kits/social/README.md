# Atelier — Social UI Kit

Content-post templates for the Pixcellor Atelier system. Designed at **1080×1350**
(Instagram portrait) — the primary social format for the studio.

## Templates

| File              | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| `Posts.jsx`       | React components for every post template                     |
| `index.html`      | Gallery view — all templates rendered side-by-side            |
| `post-hero.html`  | Hero claim — big typography, single gold word                |
| `post-price.html` | Pricing — RRP cross-out + gold conic price                   |
| `post-services.html` | Service grid — four-up silver-plate tiles                 |
| `post-quote.html` | Editorial quote — Fraunces italic, gold rule                 |
| `post-carousel.html` | Carousel page — pixel-numbered "01/05" tip                |

## How to use

Copy the inline styles + markup from any post file into a new 1080×1350 frame,
then swap copy. Every post uses tokens from `colors_and_type.css` — never
hard-coded colours.

## Heuristics

- **One gold element per post.** Maximum. A gold price OR a gold word OR a gold
  badge — pick one.
- **Always include a pixel mark** (`✕`, `▦`, etc.) somewhere — a credit line,
  the wordmark, a divider. It anchors the brand DNA.
- **Pixel sparkle** can sit behind the headline at low opacity for ambient texture.
- **Reserve Fraunces** for one emotional word per post, never a full sentence.
