## Goal

Close the security gap with Privy across three fronts: stronger encryption, recoverable wallets, and a second factor on every outbound transaction.

---

## 1. Harden what we have

**Key derivation**
- Bump PBKDF2 iterations from 310,000 → **600,000** (OWASP 2023 minimum for PBKDF2-SHA256).
- Store the iteration count per-wallet (already do) so existing wallets keep working and new wallets use the higher count.
- Add a one-time silent "re-wrap" on next successful unlock: re-encrypt the seed with 600k iterations and update the row. No user action required.

**Re-auth on every sensitive action**
- Send, Reveal keys, Cash out — already prompt for password. Add a 60-second in-memory cache toggle so users aren't prompted twice in a row, but never persist the password.
- Zero out decrypted seed/private key buffers immediately after use.

**Reduce XSS / supply-chain blast radius**
- Add a strict Content Security Policy via `<meta http-equiv>` in `index.html`: no inline scripts, no `eval`, restrict `connect-src` to Lovable Cloud + the ETH/SOL RPCs + CoinGecko, restrict `img-src`/`style-src` tightly.
- Add `Permissions-Policy` and `Referrer-Policy` meta tags.

**Rate limiting**
- Add an edge function `wallet-guard` that rate-limits decryption attempts per user (e.g. 5 failed unlocks in 10 minutes → 15-minute cooldown), tracked in a small `wallet_unlock_attempts` table. Failed attempts are reported by the client after a decrypt error.

---

## 2. Password recovery (encrypted backup)

When the user creates a wallet (and as an opt-in for existing wallets), generate a **24-word recovery code** and encrypt the seed a second time with it. Store both encrypted blobs.

- New table `user_wallet_recovery`: `user_id`, `encrypted_seed`, `salt`, `iv`, `kdf_iterations` (same shape as `user_wallets`, separate row).
- Flow on create: after the user sets a password, show the recovery code **once** in a "Save this somewhere safe" modal with copy + download buttons and a "I've saved it" checkbox before continuing.
- Flow on recovery: from the login screen, "Forgot wallet password" → user signs in normally with email/password → enters 24-word code → we decrypt the recovery blob, prompt for a new wallet password, re-encrypt the seed under it, overwrite `user_wallets` and `user_wallet_recovery`.
- Recovery code is never sent to the server in plaintext — decryption happens entirely in the browser.

Trade-off: this is a recovery code (like Coinbase Wallet), not Privy's email-link recovery. We can't do Privy's flow without their MPC server share.

---

## 3. Transaction MFA (email OTP)

Every Send and Cash out requires a 6-digit code emailed to the user's account email, in addition to the wallet password.

- New table `wallet_tx_otps`: `user_id`, `code_hash`, `purpose` (`send` / `cash_out`), `chain`, `expires_at`, `consumed_at`, `attempts`.
- New edge function `wallet-request-otp`: validates JWT, generates a 6-digit code, hashes it (SHA-256 + per-row salt), stores it with a 5-minute expiry, enqueues an email via the existing transactional email system. Rate-limited to 1 request per 30 seconds, max 5 per hour per user.
- New edge function `wallet-verify-otp`: validates JWT, checks the code, increments `attempts`, marks `consumed_at`. Max 5 attempts before the code is invalidated. Returns a short-lived signed token (10 minutes) the client must present to proceed.
- `SendDialog` and `CashOutDialog`: after the user enters amount + password, click "Send code", then enter the 6-digit code, then we sign and broadcast the transaction. The signed OTP token gates the action client-side and is logged server-side for audit.
- Reveal keys also requires OTP (it's effectively a full wallet exfiltration).
- Email template uses the existing transactional email infrastructure with a "You're authorizing a transaction" subject and clear warning copy.

If the email domain is not yet set up, we'll set it up first (one-time prompt), since OTP emails won't deliver reliably otherwise.

---

## Files to add / change

**New**
- `src/lib/wallet/recovery.ts` — generate recovery code, encrypt/decrypt seed under it
- `src/components/wallet/RecoveryCodeDialog.tsx` — show-once modal during create
- `src/components/wallet/RecoverWalletDialog.tsx` — recover with code, set new password
- `src/components/wallet/OtpPrompt.tsx` — shared 6-digit OTP entry component
- `supabase/functions/wallet-request-otp/index.ts`
- `supabase/functions/wallet-verify-otp/index.ts`
- `supabase/functions/wallet-guard/index.ts`
- Migration: `user_wallet_recovery`, `wallet_tx_otps`, `wallet_unlock_attempts` (all RLS + GRANTs)

**Changed**
- `src/lib/wallet/crypto.ts` — `DEFAULT_PBKDF2_ITERATIONS = 600_000`, add `reEncrypt` helper, zero-out buffers
- `src/components/wallet/CreateWalletDialog.tsx` — generate + display recovery code
- `src/components/wallet/SendDialog.tsx` — add OTP step
- `src/components/wallet/CashOutDialog.tsx` — add OTP step
- `src/components/wallet/RevealKeysDialog.tsx` — add OTP step
- `src/components/wallet/PasswordPrompt.tsx` — call `wallet-guard` to log failed unlocks; silent re-wrap on success
- `src/pages/CustomerPortal.tsx` — wire "Forgot wallet password" entry point
- `index.html` — CSP, Permissions-Policy, Referrer-Policy

---

## What we will still NOT match vs Privy

Even after this we won't have:
- TEE-isolated signing (keys always touch the browser process)
- MPC / Shamir split keys
- Per-transaction policy engine

Honest framing for users: "comparable to a hardened browser wallet with 2FA," not "comparable to a custodial MPC service." If matching Privy fully matters later, the right move is to swap in Privy's SDK rather than rebuild their TEE.
