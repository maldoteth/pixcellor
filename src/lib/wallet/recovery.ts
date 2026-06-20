// Recovery-code helpers. The recovery code is a fresh 24-word BIP-39 mnemonic
// (256-bit entropy) that we use as a second password to encrypt the seed.
// Stored separately in user_wallet_recovery so a forgotten wallet password
// can be reset without losing the wallet.
import * as bip39 from "bip39";
import { encryptString, decryptString, type EncryptedPayload } from "./crypto";

export function generateRecoveryCode(): string {
  // 24 words / 256 bits of entropy
  return bip39.generateMnemonic(256);
}

export function isValidRecoveryCode(code: string): boolean {
  return bip39.validateMnemonic(code.trim().toLowerCase());
}

export async function encryptSeedWithRecoveryCode(
  seedMnemonic: string,
  recoveryCode: string,
): Promise<EncryptedPayload> {
  return encryptString(seedMnemonic, normalize(recoveryCode));
}

export async function decryptSeedWithRecoveryCode(
  payload: EncryptedPayload,
  recoveryCode: string,
): Promise<string> {
  return decryptString(payload, normalize(recoveryCode));
}

function normalize(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, " ");
}
