// Derives ETH + SOL keypairs from a single BIP-39 mnemonic.
import * as bip39 from "bip39";
import { HDNodeWallet, Mnemonic } from "ethers";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";

export const ETH_PATH = "m/44'/60'/0'/0/0";
export const SOL_PATH = "m/44'/501'/0'/0'";

export interface DerivedWallet {
  mnemonic: string;
  ethAddress: string;
  ethPrivateKey: string; // 0x-prefixed hex
  solAddress: string;
  solSecretKeyB64: string; // 64-byte secret key (seed||pub) base64
}

export function generateMnemonic12(): string {
  return bip39.generateMnemonic(128); // 12 words
}

export function isValidMnemonic(phrase: string): boolean {
  return bip39.validateMnemonic(phrase.trim().toLowerCase());
}

export async function deriveFromMnemonic(rawMnemonic: string): Promise<DerivedWallet> {
  const mnemonic = rawMnemonic.trim().toLowerCase();
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid recovery phrase");
  }

  // ETH
  const ethWallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), ETH_PATH);

  // SOL (SLIP-0010 ed25519 hardened derivation)
  const seedBuf = await bip39.mnemonicToSeed(mnemonic);
  const seedHex = Buffer.from(seedBuf).toString("hex");
  const { key } = derivePath(SOL_PATH, seedHex);
  const solKeypair = Keypair.fromSeed(new Uint8Array(key));

  return {
    mnemonic,
    ethAddress: ethWallet.address,
    ethPrivateKey: ethWallet.privateKey,
    solAddress: solKeypair.publicKey.toBase58(),
    solSecretKeyB64: Buffer.from(solKeypair.secretKey).toString("base64"),
  };
}
