## Confirmation of hard constraints

- I will NOT create or apply any database migration in this step.
- I will NOT modify any RLS policy or GRANT on any table (including `user_wallets`, `wallet_tx_otps`).
- I will NOT alter any table/column permissions.
- I will NOT publish or deploy to production; changes are preview-only (edge function auto-deploys to the preview project, no publish action).
- The passkey unlock path (`decryptWithPasskey`), `RecoverWalletDialog`, and the cash-out `OtpPrompt` inside `CashOutDialog` will be left completely untouched.

## Goal

Stop the browser from reading `user_wallets.encrypted_seed` directly. Instead, gate the ciphertext behind a new `wallet-unlock` edge function that requires a fresh emailed 6-digit OTP. The client still decrypts locally with the user's password (or passkey — unchanged).

## Design

### A. New edge function `supabase/functions/wallet-unlock/index.ts`

- `verify_jwt = true` (default for Lovable-managed functions — no `config.toml` change needed).
- CORS via `import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'`, OPTIONS preflight, corsHeaders on every response.
- Auth: read `Authorization: Bearer …`, call `supabase.auth.getClaims(token)` with the anon client to get `userId = claims.sub`. 401 on failure.
- Input validation (zod):
  ```
  { purpose: 'send' | 'cash_out' | 'reveal', code: string (6 digits) }
  ```
  400 on invalid body.
- OTP verification (service-role client, mirrors `wallet-otp` verify path exactly):
  1. Select latest `wallet_tx_otps` row for `(user_id = userId, purpose)` where `consumed_at IS NULL` and `expires_at > now()`, ordered by `created_at desc`, limit 1.
  2. If none → 400 `{ error: 'No active code' }`.
  3. If `attempts >= 5` → 400 `{ error: 'Too many attempts' }`.
  4. Compute `sha256(`${userId}:${code}`)` hex and compare to `code_hash`.
  5. On mismatch: `update wallet_tx_otps set attempts = attempts + 1 where id = row.id`; return 400 `{ error: 'Invalid code' }`.
  6. On match: `update wallet_tx_otps set consumed_at = now() where id = row.id`.
- After success: service-role `select ciphertext:encrypted_seed, salt, iv, iterations:kdf_iterations from user_wallets where user_id = userId`. If missing → 404. Otherwise return `{ ciphertext, salt, iv, iterations }` with 200.
- No SQL changes; only reads/writes rows using existing schema and existing policies (service role bypasses RLS, so no GRANT changes needed).

### B. New client helper `src/lib/wallet/unlock.ts`

```ts
export async function unlockSeed(purpose: OtpPurpose, code: string): Promise<EncryptedPayload>
```
- Wraps `supabase.functions.invoke('wallet-unlock', { body: { purpose, code } })`.
- Same error-unwrapping pattern as `src/lib/wallet/otp.ts` (read `error.context.json()` when supabase-js wraps a non-2xx).
- Returns `{ ciphertext, salt, iv, iterations }` — exact shape `decryptString` consumes.

### C. `SendDialog.tsx` (password path only)

- Keep passkey branch (`usePasskey === true`) unchanged.
- For password branch: replace the current `<OtpPrompt purpose="send" onVerified={…} />` + implicit re-use of the `encrypted` prop with an inline 6-digit code capture:
  - "Email me a code" button → calls existing `requestWalletOtp('send')`.
  - 6-digit `<input>` bound to local `code` state.
  - Enable Send when password + 6-digit code are present.
  - On submit (password path): `const payload = await unlockSeed('send', code); const mnemonic = await decryptString(payload, password);` then continue with existing derive + `sendEth`/`sendSol` logic.
- Remove reliance on the `encrypted` prop for the password path (still accept the prop for now to keep the API stable; will drop from types when `WalletPanel` stops passing it — see E).
- Drop the `otpVerified` two-step (unlock now consumes the code atomically in the function).

### D. `RevealKeysDialog.tsx`

- Same swap as SendDialog but with `purpose: 'reveal'`:
  - Add "Email me a code" + 6-digit input.
  - `const payload = await unlockSeed('reveal', code); const mnemonic = await decryptString(payload, password);`
  - Rest of reveal UI unchanged.

### E. `AddPasskeyDialog.tsx`

- Add "Email me a code" + 6-digit input alongside the existing password confirm.
- Replace `await decryptString(encrypted, password)` with:
  ```
  const payload = await unlockSeed('reveal', code);
  const seed = await decryptString(payload, password);
  ```
- Rest (enroll passkey, save envelope) unchanged.

### F. `WalletPanel.tsx`

- Change the wallet fetch to select only: `user_id, eth_address, sol_address, created_at, updated_at`.
- Drop the `encrypted` prop from `<SendDialog>`, `<RevealKeysDialog>`, `<AddPasskeyDialog>` and remove the `encrypted` `EncryptedPayload | null` memo.
- Keep `userId` on all three.
- Update the three dialogs' prop types to remove `encrypted` (make it optional in this step if there's any lingering reference, then delete once unused).

### G. Guardrail for later column lockdown

- Audit `user_wallets` writes and ensure NO `.select()` is chained on `insert`/`update`/`upsert` so PostgREST doesn't need read privilege on the ciphertext columns.
- Expected write sites to check: `CreateWalletDialog.tsx`, `RecoverWalletDialog.tsx`, anywhere in `src/lib/wallet/*`. Only change lines that currently chain `.select()` after a write — no other behavior changes.

### Cash-out OTP

- `CashOutDialog.tsx` and its `OtpPrompt` usage are OUT OF SCOPE and will not be touched.

## Exact file list

New:
- `supabase/functions/wallet-unlock/index.ts`
- `src/lib/wallet/unlock.ts`

Modified:
- `src/components/wallet/SendDialog.tsx` — password path uses `unlockSeed`; inline code UI; drop `encrypted` usage.
- `src/components/wallet/RevealKeysDialog.tsx` — same swap with `purpose: 'reveal'`.
- `src/components/wallet/AddPasskeyDialog.tsx` — add code input; use `unlockSeed('reveal', code)` before password decrypt.
- `src/components/wallet/WalletPanel.tsx` — narrow SELECT columns; stop passing `encrypted`.
- Any file that chains `.select()` on a `user_wallets` insert/update/upsert (audit-only; edit only if found). Candidates to inspect: `src/components/wallet/CreateWalletDialog.tsx`, `src/components/wallet/RecoverWalletDialog.tsx`, `src/lib/wallet/recovery.ts`.

Untouched:
- `src/lib/wallet/webauthn.ts`, `src/lib/wallet/passkeyStore.ts`, `src/lib/wallet/crypto.ts`, `src/lib/wallet/derive.ts`, `src/lib/wallet/rpc.ts`.
- `src/components/wallet/RecoverWalletDialog.tsx` recovery flow logic (only touched if it chains `.select()` on a write).
- `src/components/wallet/CashOutDialog.tsx` and `src/components/wallet/OtpPrompt.tsx`.
- Existing `supabase/functions/wallet-otp` function.
- `supabase/config.toml`, all migrations, all RLS/GRANT.

## Verification (preview only)

- `tsgo` typecheck after edits.
- Manual smoke on preview: Send (password), Reveal keys, Add passkey — each should now require the emailed code, then succeed with the correct password. Passkey unlock path should still work with no code prompt.

Ready to switch to build mode when you approve.
