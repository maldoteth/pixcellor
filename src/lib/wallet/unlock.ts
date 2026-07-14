// Client helper for the wallet-unlock edge function. Verifies the emailed
// 6-digit OTP server-side and returns the encrypted seed payload so the
// caller can decrypt locally with the wallet password.
import { supabase } from "@/integrations/supabase/client";
import type { EncryptedPayload } from "@/lib/wallet/crypto";
import type { OtpPurpose } from "@/lib/wallet/otp";

interface UnlockResponse {
  ciphertext?: string;
  salt?: string;
  iv?: string;
  iterations?: number;
  error?: string;
}

export async function unlockSeed(purpose: OtpPurpose, code: string): Promise<EncryptedPayload> {
  const { data, error } = await supabase.functions.invoke<UnlockResponse>("wallet-unlock", {
    body: { purpose, code },
  });
  if (error) {
    const ctx = (error as { context?: { json?: () => Promise<UnlockResponse> } }).context;
    if (ctx?.json) {
      try {
        const j = await ctx.json();
        if (j?.error) throw new Error(j.error);
      } catch (e) {
        if (e instanceof Error && e.message) throw e;
      }
    }
    throw new Error(error.message);
  }
  if (!data || data.error) throw new Error(data?.error ?? "Unlock failed");
  if (!data.ciphertext || !data.salt || !data.iv || typeof data.iterations !== "number") {
    throw new Error("Malformed unlock response");
  }
  return {
    ciphertext: data.ciphertext,
    salt: data.salt,
    iv: data.iv,
    iterations: data.iterations,
  };
}
