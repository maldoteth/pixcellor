## Goals

1. Show the **brand colour palette** and **typography** on every generated preview — both in the admin Generations tab and on the public/customer-facing share page.
2. Improve the prompt so the AI picks **Google Fonts** from a curated, industry-aware shortlist instead of generic defaults.
3. Cost impact answer.

---

## 1. Capture colours + fonts per generation

Currently `generate-vision` only stores the image. We'll add a small structured-output step in the same edge function so every generation gets a brand kit.

**Backend (`supabase/functions/generate-vision/index.ts`)**
- After the image is generated, make one extra call using `google/gemini-3-flash-preview` with tool-calling (cheap text model) that takes the brief + the generated image and returns:
  - `palette`: 3–5 entries of `{ name, hex }` (primary, secondary, accent, neutral light, neutral dark)
  - `fonts`: `{ heading: { family, weights }, body: { family, weights } }` — both must be valid Google Fonts
- Persist these on the `vision_previews` row.

**DB migration**
- Add nullable `palette jsonb` and `fonts jsonb` columns to `vision_previews`.

---

## 2. Smarter font selection in the prompt

Update `SYSTEM_PROMPT` + `embellishBrief` in `generate-vision` to include a **curated Google Fonts shortlist** grouped by use-case, e.g.:

- Modern / SaaS: Inter, Manrope, Plus Jakarta Sans, Space Grotesk, DM Sans
- Editorial / Luxury: Playfair Display, Cormorant Garamond, Fraunces, Libre Caslon Text
- Bold / Display: Bricolage Grotesque, Archivo, Unbounded, Syne
- Friendly / Playful: Outfit, Poppins, Quicksand, Nunito
- Serif body: Lora, Source Serif, Merriweather
- Mono accents: JetBrains Mono, IBM Plex Mono

Instruction to model: pick **one heading + one body font** from the shortlist that best fit the industry/vibe. Avoid generic system fonts (Arial, Helvetica, default Roboto) unless the brief explicitly asks. Same fonts must be returned in the structured metadata so the UI can load and display them.

---

## 3. Display brand kit everywhere (admins + customers)

A shared `<BrandKit palette fonts />` component renders:
- Colour swatches: small rounded chips with hex code underneath
- Fonts: heading family name rendered in the actual heading font + body family name in body font (Google Fonts loaded on demand via injected `<link rel="stylesheet">`)

Used in:
- `src/components/portal/VisionStudio.tsx` — admin Generations cards (latest preview + list)
- Public `/preview/:slug` page — under the image, visible to the customer
- The "thanks" / sample-delivered confirmation view inside `VisionGenerator.tsx` so the user sees their kit immediately after generation
- Email template `send-vision-preview` — include a simple HTML version (swatches as coloured table cells, font names as text) so the kit shows in the client's inbox too

---

## 4. Cost impact

- Image generation cost: **unchanged**.
- Extra metadata call: one small request to `gemini-3-flash-preview` (~few hundred output tokens). Effectively a fraction of a cent per generation — negligible compared to the image call which dominates cost.
- Longer system prompt with the font shortlist adds a few hundred input tokens; cost impact rounds to zero.

**Net: barely measurable increase.**

---

## Files touched

- `supabase/functions/generate-vision/index.ts` — expanded prompt, font shortlist, structured metadata extraction, return + persist palette/fonts
- New migration — add `palette jsonb`, `fonts jsonb` to `vision_previews`
- `src/components/portal/VisionStudio.tsx` — render `<BrandKit />` on cards
- Public preview page (`src/pages/Preview.tsx` or equivalent) — render `<BrandKit />`
- `src/components/VisionGenerator.tsx` — show kit on the post-generation thanks screen
- `supabase/functions/send-vision-preview/index.ts` — include kit in the email
- New `src/components/BrandKit.tsx` + small Google Fonts loader helper
