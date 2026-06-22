## Why that line is there

The phrase **"This notification was sent automatically by Pixcellor on behalf of …"** lives only in one template: `customer-lead-notification.tsx` (line 54). It was written for white-label scenarios (a customer's website forwarding a lead), but it reads weird when the "customer" is Pixcellor itself — you end up with "Pixcellor on behalf of Pixcellor".

Separately, Lovable's email system **automatically appends a global unsubscribe footer** to every transactional email (with the real one-click unsubscribe link tied to our `handle-email-unsubscribe` system + `List-Unsubscribe` header). So this in-template line is duplicating the footer area.

## On spam: is the new wording safe?

Yes. Including an unsubscribe link and a clear "sent by" line *helps* deliverability — it's exactly what Gmail/Outlook want to see. Things that *would* hurt: ALL CAPS, "FREE!!!", hidden text, no unsubscribe link, mismatched sender domain. A short line like "This email was sent by Pixcellor. If you don't recognise it, unsubscribe here." is squeaky clean.

One subtle thing: the system already appends an unsubscribe link, so saying "unsubscribe here" with our own second link would give two links. I'll make the wording point at the same system link (no duplication) so it stays clean and spam-safe.

## Changes

### 1. `customer-lead-notification.tsx`
Replace the existing footer line with:

> *This email was sent by Pixcellor. If you don't recognise it, you can unsubscribe below.*

The "below" refers to the system-appended unsubscribe link, so there's only ever one unsubscribe action visible — better UX and better for spam filters.

### 2. Sweep other templates
Quick check across `supabase/functions/_shared/transactional-email-templates/` for any other "sent automatically" / "on behalf of" footer wording. The audit shows only `customer-lead-notification.tsx` has this footer line — the other templates already let the system footer do the work, so no other edits needed.

### 3. Deploy
Redeploy `send-transactional-email` so the new template ships.

## What I will NOT do

- Won't add a second unsubscribe link (system already adds one with the proper token + `List-Unsubscribe` header).
- Won't touch the global system footer — it's managed by Lovable Cloud infra and already does the right thing.
- Won't change any auth emails (signup, password reset, etc.) — different system, not affected.
