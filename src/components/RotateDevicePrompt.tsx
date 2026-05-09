import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Shown only on mobile devices held in landscape orientation.
 * Prompts the user to rotate back to portrait with an animated gesture.
 */
export default function RotateDevicePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer: coarse)").matches &&
        Math.min(window.innerWidth, window.innerHeight) < 600;
      const isLandscape = window.innerWidth > window.innerHeight;
      setShow(Boolean(isMobile && isLandscape));
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white px-6 text-center"
          style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <motion.div
            aria-hidden
            initial={{ rotate: -90 }}
            animate={{ rotate: [-90, 0, 0, -90] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity, times: [0, 0.4, 0.7, 1] }}
            className="mb-6"
          >
            {/* Phone outline */}
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none">
              <rect x="20" y="6" width="24" height="52" rx="5" stroke="white" strokeWidth="2.5" />
              <rect x="28" y="10" width="8" height="2" rx="1" fill="white" opacity="0.6" />
              <circle cx="32" cy="53" r="1.6" fill="white" opacity="0.6" />
            </svg>
          </motion.div>
          <p className="text-lg font-semibold tracking-tight">Please rotate your device</p>
          <p className="mt-2 text-sm text-white/70">Pixcellor is best viewed in portrait mode.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
