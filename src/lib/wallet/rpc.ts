// Balance lookup + transaction sending for ETH and SOL using public RPCs.
import { JsonRpcProvider, Wallet as EthWallet, parseEther, formatEther, isAddress } from "ethers";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const ETH_RPC = "https://cloudflare-eth.com";
const SOL_RPC = "https://api.mainnet-beta.solana.com";

export const ethProvider = new JsonRpcProvider(ETH_RPC, "mainnet", { staticNetwork: true });
export const solConnection = new Connection(SOL_RPC, "confirmed");

export async function getEthBalance(address: string): Promise<string> {
  try {
    const wei = await ethProvider.getBalance(address);
    return formatEther(wei);
  } catch {
    return "0";
  }
}

export async function getSolBalance(address: string): Promise<string> {
  try {
    const lamports = await solConnection.getBalance(new PublicKey(address));
    return (lamports / LAMPORTS_PER_SOL).toString();
  } catch {
    return "0";
  }
}

export function isValidEthAddress(addr: string): boolean {
  return isAddress(addr);
}

export function isValidSolAddress(addr: string): boolean {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}

export async function sendEth(privateKey: string, to: string, amountEth: string): Promise<string> {
  const wallet = new EthWallet(privateKey, ethProvider);
  const tx = await wallet.sendTransaction({ to, value: parseEther(amountEth) });
  return tx.hash;
}

export async function sendSol(secretKeyB64: string, to: string, amountSol: string): Promise<string> {
  const secret = Uint8Array.from(Buffer.from(secretKeyB64, "base64"));
  const keypair = Keypair.fromSecretKey(secret);
  const lamports = Math.round(Number(amountSol) * LAMPORTS_PER_SOL);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    }),
  );
  const sig = await sendAndConfirmTransaction(solConnection, tx, [keypair]);
  return sig;
}

export interface GbpPrices {
  eth: number;
  sol: number;
}
// Backward-compat alias
export type UsdPrices = GbpPrices;

export async function getGbpPrices(): Promise<GbpPrices> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana&vs_currencies=gbp",
    );
    const json = (await res.json()) as { ethereum?: { gbp?: number }; solana?: { gbp?: number } };
    return {
      eth: Number(json.ethereum?.gbp ?? 0),
      sol: Number(json.solana?.gbp ?? 0),
    };
  } catch {
    return { eth: 0, sol: 0 };
  }
}

export const getUsdPrices = getGbpPrices;

export function ethExplorer(hash: string): string {
  return `https://etherscan.io/tx/${hash}`;
}

export function solExplorer(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}
