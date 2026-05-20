import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { FALL_OFF_CONSENT_KEY, recordFalloff, recordVisitFalloffOnce, setFalloffConsent } from "@/lib/checkoutTracking";

const glassButtonStyle = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.2)",
  boxShadow: `
    0 8px 32px rgba(0,0,0,0.3),
    inset 0 1px 1px rgba(255,255,255,0.3),
    inset 0 -1px 1px rgba(0,0,0,0.1)
  `,
} as const;

export default function FalloffConsentBanner() {
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const consent = localStorage.getItem(FALL_OFF_CONSENT_KEY);
    setVisible(!consent);
    if (consent === "granted") void recordVisitFalloffOnce();
  }, []);

  const choose = async (granted: boolean) => {
    setFalloffConsent(granted);
    setVisible(false);
    if (granted) await recordFalloff({ consented_at: new Date().toISOString(), event: "consent_granted" });
  };

  return (
    <AnimatePresence>
      {visible && (
        isMobile ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => choose(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) choose(true);
              }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-2xl touch-pan-y"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
            >
              <div className="mx-auto mt-3 mb-4 h-1 w-[60px] rounded-full bg-muted" />
              <div className="px-5 pb-2 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Can Pixcellor remember your visit, device basics, and checkout progress so we can improve follow-up if you leave before ordering?
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => choose(false)} className="h-11 flex-1">No</Button>
                  <button
                    type="button"
                    onClick={() => choose(true)}
                    className="relative h-11 flex-1 overflow-hidden rounded-sm px-4 text-sm font-semibold text-foreground transition hover:brightness-125"
                    style={glassButtonStyle}
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out hover:translate-x-full pointer-events-none" />
                    <span className="relative">Allow</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-sm border border-b-0 border-border bg-card/90 p-4 text-card-foreground shadow-2xl backdrop-blur-xl"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Can Pixcellor remember your visit, device basics, and checkout progress so we can improve follow-up if you leave before ordering?
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => choose(false)} className="h-9 min-w-20 px-4">No</Button>
                <button
                  type="button"
                  onClick={() => choose(true)}
                  className="relative h-9 min-w-20 overflow-hidden rounded-sm px-4 text-sm font-semibold text-foreground transition hover:brightness-125"
                  style={glassButtonStyle}
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out hover:translate-x-full pointer-events-none" />
                  <span className="relative">Allow</span>
                </button>
              </div>
            </div>
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}
