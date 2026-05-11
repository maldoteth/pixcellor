import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RequestLinkResult = {
  ok: boolean;
  rateLimited?: boolean;
  retryAfter?: number;
  message?: string;
};

/**
 * Request a customer magic-link via the backend `request-customer-login-link`
 * function. The backend bypasses GoTrue's per-email cooldown and instead
 * enforces our product rule: max 3 requests per email per 2 minutes.
 *
 * Exposes a UI-friendly cooldown timer so the button can show
 * "Resend in Ns" and re-enable automatically.
 */
export function useRequestLoginLink() {
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCooldown = useCallback(
    (seconds: number) => {
      stopTimer();
      setCooldown(seconds);
      intervalRef.current = window.setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            stopTimer();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  useEffect(() => () => stopTimer(), [stopTimer]);

  const requestLink = useCallback(
    async (email: string, redirectTo: string): Promise<RequestLinkResult> => {
      setBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "request-customer-login-link",
          { body: { email, redirectTo } },
        );

        // 429 rate-limit responses come back via FunctionsHttpError. The
        // body still parses to { error, retryAfter }.
        if (error) {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            try {
              const parsed = await ctx.clone().json();
              if (parsed?.error === "rate_limited") {
                const retry = Math.max(1, Math.ceil(Number(parsed.retryAfter) || 30));
                startCooldown(retry);
                return { ok: false, rateLimited: true, retryAfter: retry };
              }
              return {
                ok: false,
                rateLimited: false,
                message: parsed?.error || error.message || "Could not send link",
              };
            } catch {
              /* fall through */
            }
          }
          return { ok: false, rateLimited: false, message: error.message || "Could not send link" };
        }

        if (data?.error) {
          return { ok: false, rateLimited: false, message: data.error };
        }

        // Soft 10-second cooldown so users don't hammer the button.
        startCooldown(10);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          rateLimited: false,
          message: err instanceof Error ? err.message : "Could not send link",
        };
      } finally {
        setBusy(false);
      }
    },
    [startCooldown],
  );

  return { requestLink, busy, cooldown };
}
