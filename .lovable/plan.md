## Email Broadcasting for Customers

A paid add-on inside the existing Customer Portal that lets clients send branded email campaigns from their own verified domains, manage contact lists, track opens/clicks, and view replies — powered by the Lovable Emails queue.

### 1. Database (migration)

New tables (all with GRANTs + RLS scoped by `client_user_id = auth.uid()`):

- `client_email_domains` — one row per client-verified sender domain. Stores `domain`, `spf_status`, `dkim_status`, `dmarc_status`, DKIM public/private key pair (private encrypted via Vault), verification tokens, `verified_at`.
- `client_contact_lists` — named lists per client (`name`, `description`, counts cached).
- `client_contacts` — subscribers (`list_id`, `email`, `first_name`, `last_name`, `custom_fields jsonb`, `status: subscribed|unsubscribed|bounced|complained`, `subscribed_at`).
- `client_campaigns` — `subject`, `preheader`, `from_name`, `from_email`, `reply_to`, `template_html`, `template_json` (editor state), `list_id`, `status: draft|scheduled|sending|sent|failed`, `scheduled_for`, `sent_at`, aggregate counts.
- `client_campaign_sends` — per-recipient row (`campaign_id`, `contact_id`, `message_id`, `status`, `opened_at`, `first_click_at`, `bounce_reason`) — powers analytics without hitting `email_send_log`.
- `client_campaign_events` — append-only open/click log (`type`, `url`, `user_agent`, `ip_hash`, `occurred_at`).
- `client_email_replies` — inbound replies threaded to the originating campaign (from Mailgun inbound route).
- `client_email_addon` — subscription state (`plan: starter|growth|scale`, `monthly_send_quota`, `sent_this_period`, `stripe_subscription_id`, `active`, `period_ends_at`).

Add `enqueue_broadcast_batch` RPC that inserts N rows into `client_campaign_sends` (status `pending`) and enqueues them into a new pgmq queue `broadcast_emails`.

### 2. Sending infrastructure (edge functions)

- `broadcast-send` — validates ownership + quota, creates the campaign send-rows, chunks recipients and enqueues into `broadcast_emails`. Rewrites every `<a href>` through `/t/c/{sendId}/{urlHash}` and injects a 1×1 pixel `/t/o/{sendId}.gif`. Adds `List-Unsubscribe` and `List-Unsubscribe-Post` headers pointing at `handle-email-unsubscribe` (extended to accept campaign sends).
- Extend `process-email-queue` to also drain `broadcast_emails` with lower priority than `auth_emails` and `transactional_emails`, respecting the client's domain in the `From` header and their per-plan rate limit.
- `broadcast-track` — public GET endpoint for `/t/o/*` (open pixel) and `/t/c/*` (click redirect). Writes to `client_campaign_events` and rolls up onto `client_campaign_sends`.
- `broadcast-inbound` — Mailgun inbound webhook. Matches `Reply-To`/`Message-Id` back to `client_campaigns` and inserts into `client_email_replies`.
- `verify-client-domain` — checks DNS for SPF include, DKIM TXT record, DMARC, and MX (for replies). Called on demand and by a cron sweep every hour until verified.
- `broadcast-scheduler` — cron every minute; picks `client_campaigns` where `status='scheduled'` and `scheduled_for <= now()` and invokes `broadcast-send`.

Reuse existing `email_send_log` write path for deliverability logging; broadcast-specific metrics live in the new tables.

### 3. Domain verification UX

New portal tab **Email → Domains**:
- Add domain → generates DKIM keypair server-side, shows the exact DNS records to add (SPF `include:`, DKIM `TXT`, DMARC `TXT`, optional MX pointing at Mailgun inbound for replies).
- "Check DNS" button calls `verify-client-domain`; status pills for each record.
- Once fully green, domain becomes selectable as a `From` address.

### 4. Portal UI (all inside existing `/customer-portal`)

Add a top-level **Email** tab, mobile-drawer-friendly, with sub-tabs:

- **Campaigns** — list + "New campaign" wizard: pick list → sender identity → subject/preheader → editor → review & send/schedule. Reuse `RichEmailEditor` and `emailTemplate.ts` shell; add merge-tag picker (`{{first_name}}`, `{{email}}`, custom fields), preview pane, send-test-to-me.
- **Contacts** — list manager with CSV import (papaparse, dedupe on email, validate + preview first 20 rows), manual add, bulk delete, unsubscribed/bounced views. Suppression list is enforced globally per client.
- **Domains** — described above.
- **Replies** — grouped inbox of `client_email_replies` per campaign; simple read/mark-handled state.
- **Analytics** — per-campaign dashboard: sent, delivered, open rate, click rate, unsubscribes, bounces, top links, hourly send timeline. Client-wide dashboard shows monthly usage vs quota.

### 5. Paid add-on gating

- New Stripe products created via `stripe--create_stripe_product_and_price`:
  - Starter — £29/mo, 2,500 sends, 1 domain, 1,000 contacts.
  - Growth — £79/mo, 15,000 sends, 3 domains, 10,000 contacts.
  - Scale — £199/mo, 75,000 sends, unlimited domains, 50,000 contacts.
- Extend `stripe-webhook` to write to `client_email_addon` on `checkout.session.completed` / `customer.subscription.updated/deleted`.
- Every broadcast entry point checks `client_email_addon.active` and quota; portal shows an upsell card when inactive with a checkout button.
- Reset `sent_this_period` on `period_ends_at` rollover.

### 6. "World's best" quality bar — what's baked in from day one

- **Deliverability**: per-client DKIM keys (not shared), enforced SPF/DMARC checks before first send, warmup ramp for new domains (100 → 500 → 2k/day), automatic bounce+complaint suppression, one-click List-Unsubscribe, plain-text alternative auto-generated.
- **Engagement**: per-recipient send-time optimization (store last-open hour, prefer sending near it within a 6-hour window), automatic link tracking with UTM injection toggle, subject-line A/B (split 10% test, winner to remaining 90% after 2h).
- **Compliance**: mandatory physical postal address in footer (collected at addon signup), unsubscribe page + confirmation, GDPR consent field on contact import, per-client suppression list respected across all campaigns.
- **Reputation**: dedicated IP pool tag per plan tier at the queue level (config only for now — Mailgun sub-account swap-in later); throttle per domain to protect shared reputation.
- **UX**: live preview matching the existing `EmailPreview` component, mobile-view toggle, spam-score hint (simple heuristics: all-caps ratio, link count, missing text alt), send-test-to-me before every send.

### 7. Rollout order (build phases)

1. Migration + Stripe products + addon gating card in portal.
2. Domains tab + `verify-client-domain` + DKIM keygen.
3. Contacts tab + CSV import + unsubscribe handling extension.
4. Campaigns wizard + `broadcast-send` + queue integration + tracking pixel/redirect.
5. Analytics + Replies (inbound webhook).
6. Optimizations: warmup ramp, send-time optimization, A/B, spam-score hint.

### Technical notes (for reference)

- Reuse `pgmq`, `process-email-queue`, `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens`.
- New pgmq queue `broadcast_emails`; drain order: `auth_emails` → `transactional_emails` → `broadcast_emails`.
- DKIM keypair generated with WebCrypto RSA-2048, private key encrypted with a project-level Vault secret.
- Tracking endpoints live under a short path served by an edge function to keep URLs compact.
- All new UI follows the existing Pixcellor black/glass aesthetic and mobile-drawer pattern used in `AffiliateCrmPanel`.
