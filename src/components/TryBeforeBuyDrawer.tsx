import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { clearCheckoutPending, consumeCheckoutPending } from "@/lib/checkoutTracking";

// Keys
const SHOWN_SESSION_KEY = "pixcellor_try_before_buy_shown_session";
const DISMISSED_UNTIL_KEY = "pixcellor_try_before_buy_dismissed_until";
const RECENTLY_PAID_KEY = "pixcellor_recent_order_completed_at";

const DISMISS_COOLDOWN_DAYS = 7;
const RECENT_PAID_WINDOW_MS = 1000 * 60 * 60 * 24; // 24h

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

function shouldSuppress(): boolean {
  try {
    if (sessionStorage.getItem(SHOWN_SESSION_KEY)) return true;
    const until = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
    if (until && Date.now() < until) return true;
    const paidAt = Number(localStorage.getItem(RECENTLY_PAID_KEY) || 0);
    if (paidAt && Date.now() - paidAt < RECENT_PAID_WINDOW_MS) return true;
  } catch { /* ignore */ }
  return false;
}

function markShown() {
  try { sessionStorage.setItem(SHOWN_SESSION_KEY, "1"); } catch { /* ignore */ }
}

function cleanCanceledParam() {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === "canceled") {
      url.searchParams.delete("payment");
      const search = url.searchParams.toString();
      window.history.replaceState({}, "", url.pathname + (search ? `?${search}` : "") + url.hash);
    }
  } catch { /* ignore */ }
}

export default function TryBeforeBuyDrawer() {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();
  const shownRef = useRef(false);

  useEffect(() => {
    if (visible) {
      window.dispatchEvent(new Event("pixcellor:try-before-buy-open"));
    } else {
      window.dispatchEvent(new Event("pixcellor:try-before-buy-close"));
    }
  }, [visible]);

  const show = () => {
    if (shownRef.current || shouldSuppress()) return;
    shownRef.current = true;
    markShown();
    setVisible(true);
  };

  // Trigger 1: ?payment=canceled in URL (cancelled Stripe checkout)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "canceled") {
        // Slight delay so the page settles
        const t = window.setTimeout(() => {
          cleanCanceledParam();
          clearCheckoutPending();
          show();
        }, 600);
        return () => window.clearTimeout(t);
      }
    } catch { /* ignore */ }
  }, []);

  // Trigger 2: genuine exit-intent (desktop only) — pointer leaves the top of the viewport
  // after the user has at least started a checkout in this session (pending exists).
  useEffect(() => {
    if (isMobile) return;
    const onMouseOut = (e: MouseEvent) => {
      // Pointer leaving toward the top of the window
      if (e.relatedTarget || (e as MouseEvent).clientY > 4) return;
      // Only fire if they actually started a checkout (so we don't ambush casual visitors)
      const pending = consumeCheckoutPending();
      if (!pending) return;
      show();
    };
    window.addEventListener("mouseout", onMouseOut);
    return () => window.removeEventListener("mouseout", onMouseOut);
  }, [isMobile]);

  const dismiss = () => {
    try {
      localStorage.setItem(
        DISMISSED_UNTIL_KEY,
        String(Date.now() + DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch { /* ignore */ }
    clearCheckoutPending();
    setVisible(false);
  };

  const openChat = () => {
    clearCheckoutPending();
    setVisible(false);
    // Dispatch with mode so LetsTalkPrompt picks the right flow.
    window.dispatchEvent(
      new CustomEvent("pixcellor:open-letstalk", { detail: { mode: "consultation" } }),
    );
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
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="absolute top-3 right-3 h-8 w-8 rounded-full text-foreground/60 hover:text-foreground hover:bg-foreground/10 transition flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
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
