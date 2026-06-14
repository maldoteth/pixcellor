
# /get-started — Ad Landing Page

A dedicated, conversion-focused landing page to send Google Ads (Performance Max) traffic to. Short "book a call" form up top, supporting sections below, sticky CTA on scroll.

## Route & file
- New route: `/get-started` (add to `src/App.tsx`, lazy-loaded like other routes)
- New page: `src/pages/GetStarted.tsx`
- Keep the existing `LetsTalkPrompt` drawer intact — this page is a parallel, ad-only entry point that submits to the same backend (`lets_talk_leads` + `process-lets-talk-lead` edge function) so leads land in the same CRM with a new `source: "ads_landing"` tag.

## Page structure (top → bottom)

1. **Hero + form (above the fold)**
   - Left: H1 "AI websites, chatbots & apps — live in 24 hours", subhead, 3 trust bullets (UK studio · From £299 · 24-hr turnaround), and a small logo strip (Hays, Manpower, Randstad, ITS, BlueArrow — reuse `src/assets/logos`).
   - Right: glass card with the form — Name, Company, Email, Phone, optional "What do you need?" (1-line). CTA button: "Book my free call". Honeypot + anti-spam reused from `src/lib/anti-spam.ts`. Inline validation via zod (same schemas as `LetsTalkPrompt`).
   - On submit: insert into `lets_talk_leads` + invoke `process-lets-talk-lead` with `source: "ads_landing"`, then show inline success state ("We'll be in touch within 1 working hour") and fire conversion tracking.

2. **Why Pixcellor** — 3-up feature grid (Speed, Custom-built, AI-powered). Glass cards, framer-motion entrance.

3. **Portfolio strip** — horizontal scroll of 4–6 portfolio thumbnails (reuse `src/assets/portfolio` data already used elsewhere). Link "See full portfolio" → `/portfolio`.

4. **Pricing teaser** — 3 package cards summarising tiers (from `src/data/packages.ts`), CTA "See all packages" → `/packages`.

5. **Testimonials / reviews** — 2–3 quotes (reuse content style from `PackageReviews.tsx`).

6. **FAQ** — accordion: How fast? How much? Do I own it? What if I don't like it? Can you integrate X?

7. **Final CTA band** — repeat name/email/phone mini-form or a "Scroll to top / Book a call" button that scrolls to the hero form.

8. **Sticky mobile CTA bar** — fixed bottom "Book a free call" button that scrolls to the form (mobile only).

## Design
- Match homepage: fully black bg, white text, glass-morphism cards, system-ui font, framer-motion for entrance/hover (per project core rules).
- Reuse existing UI primitives: `Button`, `Input`, `Label`, `Textarea`, `Accordion`, `Footer`, `SeoHead`.
- No new design tokens; uses existing semantic tokens.

## Google Ads conversion tracking

Add a small helper `src/lib/ads-tracking.ts`:

```ts
declare global { interface Window { gtag?: (...args: unknown[]) => void } }
export const trackAdsConversion = (label?: string) => {
  const id = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_ID; // e.g. "AW-1234567890"
  const lbl = label ?? import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL; // e.g. "abc123"
  if (!id || !window.gtag) return;
  window.gtag("event", "conversion", { send_to: `${id}/${lbl}` });
};
```

- Load gtag.js in `index.html` (placeholder ID, you'll paste yours):
  ```html
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-CONVERSION_ID');</script>
  ```
- Call `trackAdsConversion()` after a successful form submit on `/get-started`.
- I'll add the env var placeholders and a clear `// TODO: paste your AW-... ID + conversion label` comment so you can drop them in.

## SEO
- `SeoHead` with title "Get Started — AI Websites in 24 Hours | Pixcellor" (<60 chars) and meta desc (<160).
- Single H1, semantic sections, alt text on logos/portfolio images.
- Add `/get-started` to `public/sitemap.xml` (priority 0.9).
- JSON-LD: `Service` schema with provider Pixcellor.

## Backend
- No schema changes — uses existing `lets_talk_leads` table and `process-lets-talk-lead` edge function.
- New `source` value: `"ads_landing"` (string column, no migration needed).

## Out of scope (ask if you want them)
- A/B variants of the page
- Calendly / live booking widget instead of callback request
- Meta/TikTok pixel (only Google Ads tracking included)
