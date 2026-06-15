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
      const ch: any = channelRef.current;
      if (typeof ch.unsubscribe === "function" && !ch.topic) {
        ch.unsubscribe();
      } else {
        supabase.removeChannel(ch);
      }
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const redeem = useCallback(
    async (tokenHash: string, loginUrl?: string) => {
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
        if (loginUrl) {
          cleanup();
          window.location.assign(loginUrl);
          return;
        }
        setStatus("error");
        claimingRef.current = false;
      }
    },
    [cleanup, navigate, redirectTarget],
  );

  const continueWithClaim = useCallback(
    (claim: { token?: string; login_url?: string } | null) => {
      if (claim?.token) {
        redeem(claim.token, claim.login_url);
        return;
      }
      if (claim?.login_url) {
        claimingRef.current = true;
        setStatus("claiming");
        cleanup();
        window.location.assign(claim.login_url);
      }
    },
    [cleanup, redeem],
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
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
      sidRef.current = sid;
      setStatus("waiting");

      // Poll the secure RPC — login_handoffs is no longer publicly readable.
      const startedAt = Date.now();
      const intervalMs = 5000;
      const maxMs = 5 * 60 * 1000;
      const handle = window.setInterval(async () => {
        if (claimingRef.current || sidRef.current !== sid) return;
        if (Date.now() - startedAt > maxMs) {
          window.clearInterval(handle);
          return;
        }
        const { data } = await (supabase as any).rpc("claim_login_handoff", { _sid: sid });
        const claim = data as { token?: string; login_url?: string } | null;
        if (claim?.login_url || claim?.token) {
          window.clearInterval(handle);
          continueWithClaim(claim);
        }
      }, intervalMs);
      // Stash on channelRef-shaped slot so cleanup clears it.
      channelRef.current = {
        unsubscribe: () => window.clearInterval(handle),
      } as any;

      const target = `${window.location.origin}${basePath}?sid=${encodeURIComponent(sid)}`;
      return target;
    },
    [cleanup, continueWithClaim],
  );

  return { start, status, sid: sidRef.current };
}
