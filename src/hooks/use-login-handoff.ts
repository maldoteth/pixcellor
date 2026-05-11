import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type HandoffStatus = "idle" | "waiting" | "claiming" | "claimed" | "error";

/**
 * When a user requests a magic link on this device but opens it on another,
 * we still want THIS tab to log itself in. Flow:
 *  1. Generate a random nonce (`sid`) before sending the email.
 *  2. The redirect URL placed in the email includes `?sid=<sid>`.
 *  3. The other device, after Supabase signs them in, calls
 *     `complete-cross-device-login` which writes a one-time token into
 *     `login_handoffs` keyed by the sid.
 *  4. This hook subscribes to that row via Realtime and, the moment the
 *     token arrives, redeems it via `verifyOtp` so this tab is signed in.
 */
export function useLoginHandoff(redirectTarget = "/customer-portal") {
  const navigate = useNavigate();
  const [status, setStatus] = useState<HandoffStatus>("idle");
  const sidRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const claimingRef = useRef(false);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const redeem = useCallback(
    async (tokenHash: string) => {
      if (claimingRef.current) return;
      claimingRef.current = true;
      setStatus("claiming");
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "magiclink",
        });
        if (error) throw error;
        setStatus("claimed");
        cleanup();
        navigate(redirectTarget, { replace: true });
      } catch (err) {
        console.error("handoff redeem failed", err);
        setStatus("error");
        claimingRef.current = false;
      }
    },
    [cleanup, navigate, redirectTarget],
  );

  /**
   * Returns the redirect URL to feed into `signInWithOtp`'s
   * `emailRedirectTo`, AND starts listening for the handoff token.
   */
  const start = useCallback(
    (basePath = "/auth/handoff"): string => {
      cleanup();
      claimingRef.current = false;

      // 256-bit random nonce, base64url-encoded.
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const sid = btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
      sidRef.current = sid;
      setStatus("waiting");

      // Subscribe BEFORE the email is sent so we don't miss the INSERT.
      const channel = supabase
        .channel(`login_handoff:${sid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "login_handoffs",
            filter: `id=eq.${sid}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as
              | { token?: string | null }
              | undefined;
            if (row?.token) redeem(row.token);
          },
        )
        .subscribe();
      channelRef.current = channel;

      const target = `${window.location.origin}${basePath}?sid=${encodeURIComponent(sid)}`;
      return target;
    },
    [cleanup, redeem],
  );

  return { start, status, sid: sidRef.current };
}
