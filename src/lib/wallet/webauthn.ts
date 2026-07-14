// WebAuthn PRF-based wallet encryption.
//
// Instead of deriving the AES key from a user password (which leaves a
// brute-forceable blob in our DB), we derive it from a WebAuthn credential's
// PRF (pseudo-random function) output. That secret lives inside the
// authenticator — a platform biometric (Touch/Face ID, Windows Hello) or a
// security key — and is only released after user verification. A leaked
// `ciphertext` is therefore useless to anyone without the user's physical
// authenticator, which is the property a password-encrypted blob cannot offer.
//
// Losing the authenticator is recovered via the existing 24-word recovery code
// (256-bit, uncrackable). Passkeys are an ADDITIONAL unlock method layered on
// top of the wallet — they never replace the recovery-code backstop, and the
// legacy password path in crypto.ts is left completely untouched.
//
// NOTE: PRF requires WebAuthn "prf" extension support (recent Chrome/Edge/
// Safari + a compatible platform authenticator or security key). Callers must
// gate on isPasskeySupported() and fall back to password on unsupported
// devices. Requires a secure (https) origin.

const PRF_INFO = new TextEncoder().encode("pixcellor-wallet-prf-v1");

export interface PasskeyEnvelope {
  credentialId: string; // base64url of the credential rawId
  transports: string[] | null;
  prfSalt: string; // base64 — the PRF eval input (per-envelope, random)
  ciphertext: string; // base64 (AES-256-GCM)
  iv: string; // base64
}

// --- byte/base64 helpers ---
function b64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}
function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return fromB64(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}
function randBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

// The DOM lib doesn't yet type the PRF extension, so narrow it locally.
interface PrfExtensionResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.credentials &&
    // PRF is only meaningful over a secure context.
    (window.isSecureContext ?? false)
  );
}

async function hkdfAesKey(prfSecret: BufferSource, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", prfSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: PRF_INFO as BufferSource },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Run an assertion against a known credential to obtain its PRF secret for a
// given salt. Used both to fetch the secret right after enrollment (when the
// platform doesn't return it at create() time) and on every unlock.
async function evaluatePrf(
  rawId: BufferSource,
  transports: string[] | null,
  prfSalt: Uint8Array,
): Promise<ArrayBuffer | undefined> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randBytes(32) as BufferSource,
      allowCredentials: [
        {
          id: rawId,
          type: "public-key",
          ...(transports ? { transports: transports as AuthenticatorTransport[] } : {}),
        },
      ],
      userVerification: "required",
      timeout: 60_000,
      extensions: {
        prf: { eval: { first: prfSalt } },
      } as unknown as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) return undefined;
  const ext = assertion.getClientExtensionResults() as PrfExtensionResults;
  return ext.prf?.results?.first;
}

/**
 * Register a new passkey for this user and encrypt `seed` under its PRF output.
 * Throws if the device/authenticator doesn't support PRF.
 */
export async function enrollPasskey(opts: {
  userId: string;
  label: string;
  seed: string;
}): Promise<PasskeyEnvelope> {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys aren't supported on this device or browser.");
  }
  const prfSalt = randBytes(32);
  const userIdBytes = new TextEncoder().encode(opts.userId);

  const cred = (await navigator.credentials.create({
    publicKey: {
      rp: { name: "Pixcellor" }, // rp.id defaults to the current origin's domain
      user: { id: userIdBytes as BufferSource, name: opts.label, displayName: opts.label },
      challenge: randBytes(32) as BufferSource,
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
      extensions: {
        prf: { eval: { first: prfSalt } },
      } as unknown as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey creation was cancelled.");

  const ext = cred.getClientExtensionResults() as PrfExtensionResults;
  if (!ext.prf?.enabled) {
    throw new Error(
      "This authenticator doesn't support the PRF extension required to protect your wallet.",
    );
  }

  const transports =
    (cred.response as AuthenticatorAttestationResponse).getTransports?.() ?? null;

  // Some platforms return the PRF secret at create() time; others require a
  // follow-up get(). Handle both.
  let prfSecret = ext.prf.results?.first;
  if (!prfSecret) {
    prfSecret = await evaluatePrf(cred.rawId, transports, prfSalt);
  }
  if (!prfSecret) {
    throw new Error("Couldn't derive a key from this passkey. Try a different authenticator.");
  }

  const key = await hkdfAesKey(prfSecret, prfSalt);
  const iv = randBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(opts.seed) as BufferSource,
  );

  return {
    credentialId: b64url(new Uint8Array(cred.rawId)),
    transports,
    prfSalt: b64(prfSalt),
    ciphertext: b64(new Uint8Array(ct)),
    iv: b64(iv),
  };
}

/** Decrypt a seed previously stored under a passkey. */
export async function decryptWithPasskey(env: PasskeyEnvelope): Promise<string> {
  if (!isPasskeySupported()) {
    throw new Error("Passkeys aren't supported on this device or browser.");
  }
  const prfSalt = fromB64(env.prfSalt);
  const rawId = fromB64url(env.credentialId);
  const prfSecret = await evaluatePrf(rawId as BufferSource, env.transports, prfSalt);
  if (!prfSecret) {
    throw new Error("Passkey didn't return a key (cancelled or unsupported).");
  }
  const key = await hkdfAesKey(prfSecret, prfSalt);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(env.iv) as BufferSource },
      key,
      fromB64(env.ciphertext) as BufferSource,
    );
    return new TextDecoder().decode(pt);
  } catch {
    throw new Error("Couldn't unlock with this passkey.");
  }
}
