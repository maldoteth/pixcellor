// DB access for wallet passkey envelopes. Kept separate so the `as any` casts
// around the not-yet-generated `user_wallet_passkeys` table type live in one
// place. Lovable will regenerate src/integrations/supabase/types.ts on next
// sync, after which these casts can be dropped.
import { supabase } from "@/integrations/supabase/client";
import type { PasskeyEnvelope } from "@/lib/wallet/webauthn";

interface PasskeyRow {
  credential_id: string;
  transports: string | null;
  prf_salt: string;
  ciphertext: string;
  iv: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function loadPasskeys(userId: string): Promise<PasskeyEnvelope[]> {
  const { data, error } = await (supabase as any).from("user_wallet_passkeys")
    .select("credential_id, transports, prf_salt, ciphertext, iv")
    .eq("user_id", userId);
  if (error || !data) return [];
  return (data as PasskeyRow[]).map((r) => ({
    credentialId: r.credential_id,
    transports: r.transports ? (JSON.parse(r.transports) as string[]) : null,
    prfSalt: r.prf_salt,
    ciphertext: r.ciphertext,
    iv: r.iv,
  }));
}

export async function savePasskey(userId: string, env: PasskeyEnvelope): Promise<void> {
  const { error } = await (supabase.from("user_wallet_passkeys") as any).insert({
    user_id: userId,
    credential_id: env.credentialId,
    transports: env.transports ? JSON.stringify(env.transports) : null,
    prf_salt: env.prfSalt,
    ciphertext: env.ciphertext,
    iv: env.iv,
  });
  if (error) throw error;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function hasPasskey(userId: string): Promise<boolean> {
  return (await loadPasskeys(userId)).length > 0;
}
