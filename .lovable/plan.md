## Why your emails are landing in spam

I checked your setup. The good news: emails are sending successfully via `notify.pixcellor.com` (verified) and most show `status: sent`. The spam problem is about **deliverability signals**, not failed sends.

Here's what I found:

### 1. Missing SPF record on `pixcellor.com` (root)
Your `From:` header uses the root domain (e.g. `hello@pixcellor.com`), but the root domain has **no SPF TXT record**. Gmail/Outlook see "this server claims to send for pixcellor.com but pixcellor.com hasn't authorised any sender" → spam signal.

DKIM still aligns via the subdomain (relaxed mode), and your DMARC is `p=none`, so mail isn't rejected — but missing SPF is a strong negative signal that pushes borderline mail to Junk.

### 2. DMARC is `p=none` with no enforcement / aggregate-only reporting
`p=none; rua=mailto:dmarcreports@lovable.dev` means "monitor only". Once SPF is in place, we should consider tightening to `p=quarantine` so legit aligned mail is favoured.

### 3. Sales welcome email (`sales-welcome-info`) reads like a marketing pitch
Subject: *"How Pixcellor builds your website — packages, process and portfolio"* sent to leads who filled the contact form. This is borderline marketing, and bulk-style content from a fresh sender domain trips Gmail's promotions/spam filters fast. We should make it shorter, more 1:1, and clearly transactional ("Thanks for reaching out — here's what happens next").

### 4. Order confirmation templates are 260+ lines
Long HTML, lots of inline styling, multiple links/buttons → looks promotional to filters. They're legit transactional content but we can tighten them.

### 5. Domain is new / low reputation
`pixcellor.com` is a young sending domain. Reputation builds over weeks. Until then, every spam signal hurts more.

---

## Plan

### Step 1 — Fix DNS at the root domain (you'll do this at your registrar; I'll give exact records)

Add at `pixcellor.com`:

```text
Type: TXT
Name: @  (or pixcellor.com)
Value: v=spf1 include:notify.pixcellor.com -all
```

This tells receivers: "Only the senders authorised on notify.pixcellor.com may send as pixcellor.com." Aligns SPF with your From.

(DMARC and DKIM are already handled — no change needed there yet.)

### Step 2 — Rewrite `sales-welcome-info` to be clearly transactional
Shorter subject ("Thanks for reaching out to Pixcellor"), 1:1 tone, single CTA, no "packages and portfolio" pitch in the subject. Move sales content to a follow-up the user clicks into, not the auto-reply.

### Step 3 — Slim down order confirmation templates
- Reduce HTML weight
- One primary CTA per email
- Plain-text fallback (helps a lot — currently HTML-only)
- Avoid spammy phrases / excessive emoji / ALL CAPS in headings

### Step 4 — Add plain-text version to all templates
Currently the send function only sends HTML. Adding a `text` body alongside `html` is one of the highest-impact deliverability wins.

### Step 5 — Optional: switch From to subdomain
Sending `from: hello@notify.pixcellor.com` (matching the verified sending domain exactly) gives perfect SPF + DKIM alignment with no DNS changes needed at the root. Trade-off: the recipient sees `notify.pixcellor.com` in the From address, which looks slightly less clean but is neutral for trust once they recognise the brand.

---

## What I need from you before I start

A couple of choices — I'll ask once the plan is approved:

1. Do you want **From: pixcellor.com (cleaner)** + you add the SPF record at your registrar, or **From: notify.pixcellor.com (zero DNS work)**?
2. OK to rewrite `sales-welcome-info` to a short transactional auto-reply (and move the "packages & process" content into a separate follow-up the user opts into via a CTA)?
3. OK to add plain-text bodies to all transactional emails (purely additive — won't change how they look)?

---

## Technical details (for reference)

- `SENDER_DOMAIN = notify.pixcellor.com` (verified, DKIM signs here)
- `FROM_DOMAIN  = pixcellor.com` (no SPF → alignment gap)
- DMARC: `v=DMARC1; p=none; pct=100; rua=mailto:dmarcreports@lovable.dev`
- Send function: `supabase/functions/send-transactional-email/index.ts`
- Templates: `supabase/functions/_shared/transactional-email-templates/*.tsx`
- No code change can fix #1 — that's a DNS record at your domain registrar. Everything else (steps 2–5) I can implement directly.
