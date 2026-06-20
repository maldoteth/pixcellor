// AES-256-GCM + PBKDF2-SHA256 helpers backed by WebCrypto.
// All ciphertext / salt / iv values are stored as base64 strings.

const PBKDF2_ITERATIONS_DEFAULT = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  salt: string; // base64
  iv: string; // base64
  iterations: number;
}

export async function encryptString(
  plaintext: string,
  password: string,
  iterations = PBKDF2_ITERATIONS_DEFAULT,
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, iterations);
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(plaintext) as BufferSource,
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(ctBuf)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    iterations,
  };
}

export async function decryptString(payload: EncryptedPayload, password: string): Promise<string> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ct = base64ToBytes(payload.ciphertext);
  const key = await deriveKey(password, salt, payload.iterations);
  try {
    const ptBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
    return dec.decode(ptBuf);
  } catch {
    throw new Error("Incorrect password or corrupted data");
  }
}

export const DEFAULT_PBKDF2_ITERATIONS = PBKDF2_ITERATIONS_DEFAULT;
