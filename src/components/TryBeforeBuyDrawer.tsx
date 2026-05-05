import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { consumeCheckoutPending, clearCheckoutPending } from "@/lib/checkoutTracking";
import { supabase } from "@/integrations/supabase/client";

const SHOWN_KEY = "pixcellor_try_before_buy_shown";

const glassPanel = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
} as const;

const glassButton = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
  border: "1px solid rgba(255,255,255,0.28)",
  boxShadow: "0 6px 20px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.25)",
} as const;

const MIN_DELAY_MS = 1500;

export default function TryBeforeBuyDrawer() {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  const shownRef = useRef(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(SHOWN_KEY)) shownRef.current = true; } catch { /* ignore */ }
    let checking = false;
    const check = async () => {
      if (checking || shownRef.current) return;
      const pending = consumeCheckoutPending();
      if (!pending) return;
      if (Date.now() - pending.startedAt < MIN_DELAY_MS) return;
      checking = true;
      try {
        // If we have a Stripe session id, verify with backend whether it was paid
        if (pending.sessionId) {
          try {
            const { data } = await supabase.functions.invoke("check-order-status", {
              body: { sessionId: pending.sessionId },
            });
            if (data?.confirmed) {
              clearCheckoutPending();
              return;
            }
          } catch {
            // network error: fall through and show drawer (better to ask than miss a lead)
          }
        }
        if (shownRef.current) return;
        shownRef.current = true;
        try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* ignore */ }
        setVisible(true);
      } finally {
        checking = false;
      }
    };

    const onFocus = () => { void check(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
    const onPageShow = () => { void check(); };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    const t = window.setTimeout(() => { void check(); }, 2000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    clearCheckoutPending();
    setVisible(false);
  };

  const openChat = () => {
    clearCheckoutPending();
    setVisible(false);
    window.dispatchEvent(new Event("pixcellor:open-letstalk"));
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[10020] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            initial={{ y: isMobile ? "100%" : 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: isMobile ? "100%" : 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className={
              isMobile
                ? "fixed inset-x-0 bottom-0 z-[10021] rounded-t-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
                : "fixed inset-x-0 bottom-0 z-[10021] rounded-t-2xl p-6"
            }
            style={glassPanel}
          >
            {isMobile ? (
              <>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Try before you buy!</h3>
                  <p className="mt-1 text-sm text-foreground/75 leading-relaxed pr-6">
                    No need to pay upfront. Talk to sales today and we'll build a free preview of your site so you can check it before you commit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openChat}
                  className="mt-5 h-11 w-full rounded-md text-sm font-semibold text-foreground transition hover:brightness-125 focus:outline-none"
                  style={glassButton}
                >
                  Talk to sales
                </button>
              </>
            ) : (
              <div className="mx-auto flex max-w-6xl items-center gap-6 pr-8">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground">Try before you buy!</h3>
                  <p className="mt-1 text-sm text-foreground/75 leading-relaxed">
                    No need to pay upfront. Talk to sales today and we'll build a free preview of your site so you can check it before you commit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openChat}
                  className="h-11 flex-shrink-0 rounded-md px-6 text-sm font-semibold text-foreground transition hover:brightness-125 focus:outline-none"
                  style={glassButton}
                >
                  Talk to sales
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
