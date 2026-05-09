
# Buy a domain with your package — Porkbun-powered

## Recommendation: Porkbun

I researched Porkbun, Namecheap, Cloudflare Registrar, Dynadot, GoDaddy, and OpenSRS/Enom. **Porkbun wins for us by a wide margin.** Reasons:

| | Porkbun | Namecheap | Cloudflare | Dynadot | GoDaddy | OpenSRS/Enom |
|---|---|---|---|---|---|---|
| API format | **JSON** | XML | No public reg API | JSON | JSON (deprecated for new accounts) | XML |
| Static IP whitelist needed | **No** | **Yes** (blocks Edge Functions) | n/a | Yes | No | No |
| Works from Supabase Edge Functions out of the box | **Yes** | No (needs proxy) | n/a | No | Partial | Yes |
| Idempotency keys (prevents double-charge on retry) | **Yes, native `Idempotency-Key` header** | No | n/a | No | No | No |
| Eligibility / minimum funds | None | $50 + 20 domains or $50 spent | n/a | None | Reseller account | Reseller account |
| Free WHOIS privacy | Yes | Yes | Yes | Yes | Paid | Varies |
| Free SSL on every domain | **Yes** | No | Yes | No | No | No |
| Reseller agreement required | No (direct registrar use) | No | n/a (no resale) | No | Yes | Yes |
| Approx. .com first year | ~$11 | ~$9 | at-cost (~$10) | ~$10 | ~$12 | ~$9 |
| Promo TLDs (.xyz/.site/.online first year) | $1–$3 | $1–$2 | n/a | $1–$3 | $1–$5 | $1–$3 |
| Official MCP / agent support | **Yes** | No | No | No | No | No |

**Why not the others, in one line each:**
- **Namecheap** — IP whitelist makes it incompatible with Supabase Edge Functions without a paid static-IP proxy. XML parsing. Eligibility gate.
- **Cloudflare Registrar** — at-cost pricing is amazing, but they have **no public registration API** (you can only manage domains already in your account). Disqualified.
- **Dynadot** — works, but IP whitelist again, and the API is rougher.
- **GoDaddy** — they closed their public API to new accounts in 2024. Disqualified.
- **OpenSRS / Enom** — proper reseller path, slightly cheaper at scale, but requires a reseller contract, deposit, and XML/SOAP integration. Overkill until you're doing hundreds of domains/month.

**Conclusion:** Use Porkbun. We can revisit OpenSRS later if domain volume passes ~200/month.

## Confirmed flow

1. User searches a domain inside the package basket → `domain-search` edge function → Porkbun `checkDomain` returns `avail` + `price`.
2. User adds it to their basket (purely a UI/state action — **nothing is registered yet, no Porkbun call made**).
3. Stripe Checkout charges the package + (optional) domain top-up as one payment.
4. **Stripe webhook fires** on `checkout.session.completed` → `register-domain` edge function runs → Porkbun `domain/create` registers the domain with an `Idempotency-Key = stripe_session_id` so retries can never double-register.
5. Success → store registration on order row, email buyer with DNS pointer instructions for Lovable. Failure → flag order, email you, full Stripe refund of the domain top-up only (package payment stands).

```text
User basket: [Package] [+ mybrand.xyz]
        │
        ▼
Stripe Checkout (one payment, manual capture as today)
        │
   payment confirmed
        │
        ▼
stripe-webhook ──► register-domain
                        │
                        ├─► re-check price + availability via Porkbun checkDomain
                        ├─► if still free/within budget → domain/create with Idempotency-Key=session_id
                        ├─► store domain + expiry on order row
                        └─► email buyer + admin
```

The basket → backend-register flow is exactly as you described. Porkbun's native idempotency makes step 4 bulletproof — even if the webhook retries 5 times, Porkbun registers exactly once.

## Pricing rule

- Per-package allowance, configurable. Default: **£10**.
- For each search result we compute `topUp = max(0, ceil(price - allowance))`.
  - `topUp == 0` → badge "**Free with your package**"
  - `topUp > 0` → badge "**+£X one-off**"
  - `IsPremium` (Porkbun returns `premium: "yes"`) → "Premium — contact us", not registerable in-flow.
- Allowance covers .com (~£9 first year) and almost all promo TLDs.
- Tooltip text: *"First year on us. Renewal £X/yr — we'll email you 30 days before expiry with options to renew with us or transfer out."*

## Required Porkbun setup (one-time)

1. Create Porkbun account → ACCOUNT → API Access → enable + copy API key + secret.
2. Add card on file with auto top-up (so `domain/create` can never fail for funds).
3. **No IP whitelist needed.** No eligibility check. No deposit minimum.
4. We integrate sandbox-style by registering one cheap test domain end-to-end before going live.

## What I need from you before I build

I'll ask these as a single follow-up question:

- Allowance amount (suggest **£10**).
- Should the buyer be able to register a domain **without** buying a package? (suggest **no** — keeps it as an upsell.)
- Collect full registrant address at checkout, or default registrant info to your business address with the buyer's email? (Porkbun lets the registrar account holder be the registrant, so we can default to **your** business contact and just store the buyer's email — much smoother UX. ICANN-compliant because you're the account holder.)

## Technical details

**Secrets (added via `secrets--add_secret`)**
- `PORKBUN_API_KEY`
- `PORKBUN_SECRET_API_KEY`

**New edge functions**
- `domain-search` — `POST { query }` → returns `[{ domain, available, priceGbp, isPremium, freeWithPackage, topUpGbp }]`. Calls Porkbun `checkDomain` + a small TLD spread (`.com`, `.co`, `.io`, `.xyz`, `.site`, `.online`, `.shop`, `.studio`, `.app`). 60-second in-memory cache. Per-IP rate limit (10 req / 10s).
- `register-domain` — invoked from `stripe-webhook` after `checkout.session.completed`. Reads `domain_to_register` + `top_up_paid` from session metadata. Calls Porkbun `domain/create` with `Idempotency-Key = session.id`. Idempotent at our layer too (checks `domain_registrations.status` first).

**Modify**
- `create-checkout` — accept `domain` + `domainTopUpGbp` in body. Add a second Stripe `line_item` (`price_data`, GBP, name `Domain registration: <domain>`) when `topUpGbp > 0`. Stash `domain_to_register` in session metadata regardless of price (free domains still need to be registered post-payment).
- `stripe-webhook` — after the existing order-paid logic, if `metadata.domain_to_register`, call `register-domain` (or invoke it via `supabase.functions.invoke` so it can retry independently).

**DB migration**
- Add `domain TEXT`, `domain_status TEXT`, `domain_top_up_gbp NUMERIC` columns to the existing orders table.
- New `domain_registrations` table: `id`, `order_id`, `domain`, `registrar` ('porkbun'), `registrar_request_id`, `expires_at`, `status` ('pending'|'active'|'failed'|'refunded'), `error TEXT`, `created_at`, `updated_at`. RLS: admin-only read; service role writes.
- Unique index on `(order_id)` so we can't accidentally double-register per order.

**Frontend**
- New `DomainPicker` component used inside `PackagesDialog`, after the buyer details step.
  - Search input (debounced 350ms), results list, "Add to basket" / "Remove" toggle, total updated live.
  - Skip link: "No thanks, just the package."
- Basket UI shows the package + optional domain row + total.
- `handleCheckout` sends `{ domain, domainTopUpGbp }` along with the existing payload.
- Order success page shows the registered domain + a one-line DNS instruction for pointing it at Lovable.

**Failure modes covered**
- Domain taken between basket and webhook → `register-domain` returns `DOMAIN_NOT_AVAILABLE` → mark `failed`, refund top-up via Stripe, email buyer with 3 alternative suggestions.
- Porkbun price drift above allowance + top-up → don't register, refund top-up, email buyer.
- Webhook retry storm → idempotency key (= Stripe session ID) ensures exactly-once registration.
- Porkbun API down → status stays `pending`, retried by a small cron up to 6× over 1 hour, then escalates to admin email.

## Out of scope for v1

- DNS management UI (we link to Lovable's domain-setup docs).
- Email hosting / mailbox sales.
- Domain transfers in.
- Multi-year registration (always 1 year at first sale).
- SSL upsell (Porkbun + Lovable both give SSL for free).
