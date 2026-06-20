// Client wrapper for the wallet-otp edge function.
import { supabase } from "@/integrations/supabase/client";

export type OtpPurpose = "send" | "cash_out" | "reveal";

interface OtpResponse {
  ok?: boolean;
  error?: string;
  expiresInSeconds?: number;
}

async function call(action: "request" | "verify", purpose: OtpPurpose, code?: string): Promise<OtpResponse> {
  const { data, error } = await supabase.functions.invoke<OtpResponse>("wallet-otp", {
    body: { action, purpose, code },
  });
  if (error) {
    // supabase-js wraps non-2xx responses in FunctionsHttpError; try to read body
    const ctx = (error as { context?: { json?: () => Promise<OtpResponse> } }).context;
    if (ctx?.json) {
      try {
        const j = await ctx.json();
        return j ?? { error: error.message };
      } catch {
        /* ignore */
      }
    }
    return { error: error.message };
  }
  return data ?? { error: "Empty response" };
}

export async function requestWalletOtp(purpose: OtpPurpose): Promise<OtpResponse> {
  return call("request", purpose);
}

export async function verifyWalletOtp(purpose: OtpPurpose, code: string): Promise<OtpResponse> {
  return call("verify", purpose, code);
}
