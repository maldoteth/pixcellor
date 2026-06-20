# Embedded Wallets (ETH + SOL)

Per-user ETH + Solana wallets generated and encrypted **in the browser**. The server stores only ciphertext + public addresses — it physically cannot sign. Users unlock signing/reveal actions by entering a wallet password they set on creation.

## How keys are protected

- Keys are generated client-side using audited libraries (`ethers` for ETH, `@solana/web3.js` + `bip39` for SOL).
- A single BIP-39 seed phrase backs both wallets (ETH derivation path `m/44'/60'/0'/0/0`, SOL path `m/44'/501'/0'/0'`).
- The seed phrase is encrypted with **AES-256-GCM** via the browser's WebCrypto API.
- The AES key is derived from the user's **wallet password** with **PBKDF2-SHA256, 310,000 iterations**, using a per-user random 16-byte salt.
- Ciphertext, salt, IV, and the two public addresses are stored in `public.user_wallets` under RLS scoped to `auth.uid()`. The plaintext key never leaves the browser and is never sent over the network.

### Wallet password ≠ login password

Decoupling avoids the "user reset their login password and lost their wallet" footgun. On wallet creation the user:
1. Sets a wallet password (min 10 chars).
2. Is shown the 12-word seed phrase **once**, must tick "I've saved this" before continuing.
3. Can download an encrypted JSON backup.

If they forget the password, recovery = import the seed phrase + set a new password.

## Database

New table `public.user_wallets`:

- `user_id` (PK, FK → auth.users)
- `eth_address`, `sol_address` (text, public)
- `encrypted_seed` (text, base64 AES-GCM ciphertext of the BIP-39 mnemonic)
- `salt`, `iv` (text, base64)
- `kdf_iterations` (int, default 310000) — future-proofing
- `created_at`, `updated_at`

RLS: each user can select/insert/update/delete only their own row. Grants to `authenticated` + `service_role`. No `anon`.

## UI — new "Wallet" tab in CustomerPortal

```text
┌───────────────────────────────────────────────┐
│  Wallet                                       │
│                                               │
│  Ethereum            0x7a…3b9   [Copy] [QR]  │
│  Balance: 0.0421 ETH ($142.18)                │
│                                               │
│  Solana              5Fc…uPq    [Copy] [QR]  │
│  Balance: 1.204 SOL ($186.07)                 │
│                                               │
│  [ Send ]   [ Receive ]   [ Reveal keys ]    │
└───────────────────────────────────────────────┘
```

### Flows
- **First visit / no wallet row** → "Create wallet" wizard: set password → show seed → confirm saved → encrypt + persist.
- **Receive** → modal with address + QR (lib: `qrcode`).
- **Send** → choose chain → recipient + amount → enter wallet password → decrypt seed in-memory → sign + broadcast via public RPC → discard plaintext immediately. Shows tx hash + explorer link.
- **Reveal keys** → re-prompt password → display seed phrase + private keys with a 30-second auto-hide, plus "copy" buttons.
- **Import existing seed** → on the create screen, "I already have a seed phrase" option.

### Balances + RPC
- ETH: public Cloudflare endpoint `https://cloudflare-eth.com` via `ethers.JsonRpcProvider`.
- SOL: `https://api.mainnet-beta.solana.com` via `@solana/web3.js`. (Easy to swap to a paid RPC later if rate-limited.)

## Files

- `supabase/migrations/<ts>_user_wallets.sql` — table + GRANTs + RLS + updated_at trigger.
- `src/lib/wallet/crypto.ts` — PBKDF2 + AES-GCM helpers.
- `src/lib/wallet/derive.ts` — mnemonic → ETH + SOL keypairs.
- `src/lib/wallet/rpc.ts` — balance + send helpers for both chains.
- `src/components/wallet/WalletPanel.tsx` — main tab view.
- `src/components/wallet/CreateWalletDialog.tsx`
- `src/components/wallet/SendDialog.tsx`
- `src/components/wallet/ReceiveDialog.tsx`
- `src/components/wallet/RevealKeysDialog.tsx`
- `src/components/wallet/PasswordPrompt.tsx`
- `src/pages/CustomerPortal.tsx` — add "Wallet" tab entry.

## Dependencies

`bun add ethers @solana/web3.js bip39 ed25519-hd-key qrcode` (+ `@types/qrcode`).

## Security boundaries (what this does and does not protect)

- Server compromise → attacker gets ciphertext only; brute-forcing PBKDF2(310k) on a strong password is infeasible.
- Weak wallet password → vulnerable to offline brute force once ciphertext leaks. The UI enforces min length + strength meter.
- Malicious browser extension or XSS on our domain → can scrape the plaintext seed during unlock. Standard CSP is already in place; no further mitigation in v1.
- This is **not** MPC / TEE security. For institutional-grade guarantees, Option C (Privy/Turnkey) remains the upgrade path and the data model here is compatible with migrating addresses out.

## Out of scope (v1)

- Token (ERC-20 / SPL) transfers — only native ETH and SOL.
- Multi-account / multiple addresses per user.
- Hardware wallet connect.
- Auto-funding, gas sponsorship, fiat on-ramp.
- Transaction history beyond the most recent send confirmation toast (we can add a paginated history later).
