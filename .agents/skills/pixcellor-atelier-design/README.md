# Pixcellor Atelier — Design System

> **Premium evolution of Pixcellor.** Matte silver structure, shiny gold accents,
> whisper-quiet multicoloured pixels, and signature liquid-glass surfaces.
> Designed for social + content-post output that feels editorial, jeweled, and
> precisely engineered.

The original Pixcellor system was **midnight glass × neon arcade**. Atelier
keeps the pixel DNA and the wordmark, but trades the neon spectrum for a
jeweler's case — *matte silver, brushed and cool, against deep velvet black,
with a single conic-shimmer gold accent reserved for what truly matters.*

---

## Index

| File / Folder              | Purpose                                              |
|----------------------------|------------------------------------------------------|
| `README.md`                | This file. Brand context + content + visual rules.   |
| `SKILL.md`                 | Agent Skill manifest — drop into Claude Code.        |
| `colors_and_type.css`      | All design tokens (silver, gold, pixel, glass, type).|
| `assets/`                  | Logos (mark + wordmark, light + dark).               |
| `preview/`                 | Design-System-tab card files.                        |
| `ui_kits/social/`          | Content-post / social-post UI kit (Atelier's primary surface). |

---

## Sources

- **Logo files** — inherited from Pixcellor (`assets/logo-*.png`).
- **Reference imagery** — three boards provided by the user:
  bold-typography content posts with hero device mockups (Creative Lotus,
  AdAgency-style), and a phone mockup with dramatic stage lighting.
- **Aesthetic brief** *(verbatim from user)* — "matted silver and shiny gold,
  with multi coloured pixels and soft notes of glass morphism".
- **Parent system** — `Pixcellor Design System` (the spectrum + pixel
  vocabulary survives, muted).

**Flag for the user:** No codebase, Figma, or production screenshots were
provided for Atelier specifically. If you have actual production work in this
direction, attach it so we can tighten the system against ground truth.

---

## Content fundamentals

**Voice.** Atelier inherits Pixcellor's confident builder energy and adds a
craft-house formality. Less "we ship", more "we make". Outcomes still lead, but
the language gets one notch more measured — like the difference between a Tesla
ad and a Patek Philippe ad.

**Tone dial.** Quiet swagger. Where Pixcellor said *"You Dream It — We Build It"*,
Atelier says *"Hand-built for serious operators."* It's still cheeky in copy
($500 vs £2,500), but the chrome around the words is more refined.

**Casing.**
- Headlines: Title Case or sentence case. ALL CAPS only for short impact
  posters (the "HERE'S WHY YOU NEED US" reference).
- Eyebrows: ALL CAPS in pixel font, generous tracking (`--track-mega`).
- UI / buttons / chips: Sentence case.
- Logo always `Pixcellor™` — the trademark glyph is non-negotiable.

**Pronouns.** First-person plural for the studio, second-person for the
client. Never "users", never "consumers" — "operators", "founders", "teams".

**Em-dashes** are the rhythm tool. Don't substitute commas.

**Currency.** GBP with RRP framing. Numerals are *the* place to use the gold
sheen text fill — let the price feel like a piece of jewellery.

**Lexicon.**
- ✅ Hand-built · turnkey · operator · ship · craft · studio · lifetime · bespoke
- ✅ AI-native · full-stack · AEO · turnkey · retainer
- ❌ Solutions provider · synergy · leverage · unlock · pivot · streamline

**Emoji policy.** Zero. Replace incoming emoji with either a Lucide icon or
one of the pixel marks (`▦ ▮ ✕ ✦ ●`). The pixel `✕` (echo of the logo flag) is
the workhorse decorative glyph.

**Examples.**
> "Hand-built websites for serious operators."
> "You dream it. We engineer it. Forever."
> "Premium, without the premium."
> "Studio-grade work — at agency velocity."

---

## Visual foundations

### Mood
A jeweler's display case. Deep velvet black canvas, brushed-silver hardware,
glass plates that hover, and one rare gold detail that catches the light.
The **multicoloured pixels are a whisper** — present as ambient sparkle and
focus rings only, never as the hero. The hero is silver. The jewel is gold.

### Color

**Silver is dominant. Gold is rare. Pixels whisper.**

- **Canvas scale** — five stops `--bg-0` (deepest) → `--bg-4` (lifted/pressed).
  Dark mode lives at `--bg-0 #0B0B10` with a faint blue cast. Light mode is
  `#F6F4EF` warm paper.
- **Silver scale** — `--silver-0…5`, from champagne-white to gunmetal. The
  signature `--silver-brushed` and `--silver-brushed-hi` linear gradients give
  the actual brushed-metal feel for plates, ID cards, and accent chips.
- **Gold** — `--gold-0…3` flat tones plus `--gold-conic` (the polished-metal
  shimmer) and `--gold-sheen` (linear, for rules and text fills). Use gold for
  **at most one element per screen** — the hero CTA, a single number, a rule
  beneath a section title. If you have two gold things on a page, kill one.
- **Pixel spectrum** — eight muted hues (`--pix-red/orange/yellow/lime/cyan/
  blue/violet/magenta`). Intentionally desaturated vs Pixcellor's neon — they
  coexist with metal instead of fighting it. Use as: focus rings (cyan),
  semantic chips (success=lime, danger=red), ambient sparkle (all eight at
  ~0.35 opacity via the `.pixel-sparkle` helper).
- **Semantic mapping**: `--accent = gold`, `--success = pix-lime`,
  `--danger = pix-red`, `--warning = gold-1`, `--info = pix-cyan`.

**Dual-mode**: set `data-theme="light"` on `<html>` for the warm-paper variant.
Gold deepens (`#A87A28`) for contrast; silver gradients flip to the high-key
`--silver-brushed-hi`.

### Type

- **Display + UI**: **Geist** — modern grotesk, the Neue Haas Grotesk
  successor the user asked for. Tight tracking (`--track-tight`) on
  display sizes; normal at body. Weight 600 for display, 500–600 headings,
  400 body.
- **Editorial accent**: **Fraunces** italic, used *very* sparingly for
  one-word emotional moments (a single italic noun in a headline). Think:
  "We make **websites**" where *websites* is Fraunces italic.
- **Pixel**: **Pixelify Sans**, retained from Pixcellor — eyebrows, badges,
  the wordmark voice. Always uppercase, `--track-mega` tracking.
- **Mono**: **Geist Mono** — code, IDs, prices/dates in technical contexts.

*Substitution flag:* the live pixcellor.com wordmark may use a custom pixel
font. If a real file exists, drop it in `fonts/` and update `--font-pixel`.

### Backgrounds
- **Full-bleed canvas** (`--bg-0`) is the default. Optional: a soft gold
  radial-glow orb in one corner at ~7% opacity, paired with a tiny cyan one
  diagonally opposite.
- **Pixel sparkle** (`.pixel-sparkle`) — six ambient dots in spectrum colours
  at 35% opacity, `mix-blend-mode: screen`. Apply as an ambient overlay; never
  as the foreground.
- **1px grid overlay** (`rgba(244,244,242,0.03)`) for hero sections — reinforces
  the pixel grid heritage without being loud.
- **No multi-colour gradient backgrounds.** Use `--spectrum` for hairline
  borders or text fills only.

### Glass (signature)
1. Background: `rgba(244, 244, 242, 0.045)` (dark) / `rgba(22, 20, 15, 0.04)` (light).
2. Border: 1px `--glass-border` (`0.12` dark, `0.10` light).
3. Backdrop filter: `blur(32px) saturate(160%)` — strong enough that whatever
   sits behind reads as a colour wash, not a pattern.
4. Inner highlight: wet-edge top, shadow bottom — wrapped in `--glass-inner`.
5. Outer shadow: `--shadow-2` or `--shadow-3`. Never both glow and shadow.

Helper class: **`.glass`** applies all five.

### Brushed silver (signature)
The `.silver-plate` helper renders a brushed-metal fill: the
`--silver-brushed` gradient overlaid with a 1px horizontal grain pattern, inset
top-highlight and bottom-shadow. Use it for: logo lockup plates, premium
member badges, hero number plates, the back of phone-mockup chrome.

### Gold shimmer (signature, rare)
The `.gold-shimmer` helper applies `--gold-conic`. Use it for: a single hero
icon, a featured badge, an award ribbon, a thin gold rule under a section
title. Pair it with `.gold-text` for the rare gold price/number text fill.
**Maximum one gold element per screen.**

### Animation
- Easings: `--ease-out` for entries, `--ease-spring` for joyful taps.
- Durations: 120/240/440ms. Cap at 600ms.
- Entries: opacity 0→1 + translateY(8px→0).
- Pixel sparkle: optional ambient twinkle (0.25↔0.45 opacity, 3–5s loop, random delay).
- Gold shimmer: a slow `background-position` drift on `--gold-conic` (8–12s loop).
- **No bouncy hero animations.** Movement is precise, mechanical, then settles.

### Hover & press
- Hover: surface lifts one bg-step, border opacity bumps `0.12 → 0.20`,
  accent text shifts to `--accent-hover`. 240ms.
- Press: surface drops one step, element scales `0.98` for 120ms.
- Gold CTAs gain `--glow-gold` on hover. Silver/glass CTAs gain `--glow-silver`.
- Focus visible: 2px outline using `--pix-cyan` (the one place cyan shines),
  2px offset.

### Borders
- Hairline: `--line-1` (0.06).
- Card: `--line-2` (0.10).
- Prominent: `--line-3` (0.18).
- Gold linear-gradient borders (1px `--gold-sheen`) reserved for the rare hero CTA / featured card.

### Shadows
- Four elevation steps; values tuned for both dark and light modes via the
  `[data-theme]` override.
- Glows: `--glow-gold`, `--glow-silver`, `--glow-cyan`, `--glow-magenta`.
- Never combine a hard shadow and a glow on the same element.

### Layout
- Max content width: **1280px** desktop, **1080px** prose. Social posts
  default to **1080×1350** (Instagram portrait) or **1080×1080** (square).
- Gutters: `--s-7` (48px) desktop, `--s-5` (24px) mobile.
- Section rhythm: `--s-9` (96px) between major sections.
- Sticky elements: top nav always sticky, always glass.

### Corner radii
- `--r-0` (0px) — pixel-perfect chips, the mark, retro accents.
- `--r-1` (4px) — inputs, small chips.
- `--r-2` (10px) — buttons.
- `--r-3` (18px) — cards (rounder than Pixcellor's 14 — luxe).
- `--r-4` (28px) — hero panels, modals.
- `--r-pill` — capsules, status pills.

### Cards
Default card: `--r-3` (18px), `--bg-2` or glass surface, 1px `--line-2`,
`--shadow-2`. Title in `--t-h3`, body in `--t-body-sm`. No coloured left
borders. Featured cards get a 1px gold-sheen top stroke.

### Imagery
- Cool, dark, low-saturation. Black-on-velvet product shots. Studio-lit
  device mockups (per the user's reference board). Avoid sunlit / warm imagery
  unless it's the gold-toned editorial light from the AdAgency reference.
- Subtle film grain OK. No heavy filters.
- Hero treatment for product mockups: drop them onto a black-to-near-black
  vertical gradient, with a single warm key light from one edge (per the phone
  mockup reference).

---

## Iconography

**Lucide** at 1.5px stroke, 24×24 viewBox — inherited from Pixcellor. Load:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
```

Then `<i data-lucide="zap"></i>` + `lucide.createIcons()`.

For premium / certificate / award contexts, swap Lucide outlines for the
**gold-shimmer** treatment: wrap an icon in `.gold-shimmer` (round, `--r-pill`).

Decorative pixel marks (`▦ ▮ ✕ ✦ ●`) appear inline in copy, rendered in
`--font-pixel`. Never SVGs, never emoji. `✕` echoes the wordmark flag.

Logos in `assets/`:
- `logo-mark-white.png` / `logo-mark-black.png`
- `logo-wordmark-white.png` / `logo-wordmark-black.png`

Use white variants on dark surfaces (default), black on light.

---

## When to use which surface

| Need                          | Use                                |
|-------------------------------|------------------------------------|
| Default card                  | `.glass` or `--bg-2`               |
| Premium badge / hero number   | `.silver-plate`                    |
| THE one hero accent           | `.gold-shimmer`                    |
| Price / numeral emphasis      | `.gold-text` span                  |
| Single emotional word         | Fraunces italic via `.editorial`   |
| Tag / eyebrow                 | `.eyebrow` + pixel font            |
| Ambient texture in hero       | `.pixel-sparkle`                   |

---

## Caveats

- **No production codebase or Figma** was provided for Atelier. The system is
  derived from the user's verbal brief, the reference image board, and the
  parent Pixcellor system. If real production work exists in this direction,
  attach it.
- **Custom pixel font** for the Pixcellor wordmark may exist — Pixelify Sans
  is the Google Fonts approximation.
- **Image references** (phone-with-model, AdAgency, Creative Lotus) were used
  as inspiration for layout and tone, not copied. They aren't first-party.
