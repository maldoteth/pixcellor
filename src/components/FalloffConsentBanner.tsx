import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-sm border border-border bg-card/90 p-4 text-card-foreground shadow-2xl backdrop-blur-xl"
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
      )}
    </AnimatePresence>
  );
}