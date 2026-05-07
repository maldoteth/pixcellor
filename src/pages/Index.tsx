import { useEffect, useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";
import PackagesDialog from "@/components/PackagesDialog";

import TryBeforeBuyDrawer from "@/components/TryBeforeBuyDrawer";
import LetsTalkPrompt from "@/components/LetsTalkPrompt";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const apply = () => {
      // Samsung Internet/older Android WebViews can report stale values
      // for visualViewport.height during toolbar transitions. Use the
      // smallest reliable height to guarantee the footer stays in view.
      const vv = window.visualViewport?.height ?? 0;
      const inner = window.innerHeight || 0;
      const docEl = document.documentElement.clientHeight || 0;
      const candidates = [vv, inner, docEl].filter((n) => n > 0);
      const height = candidates.length ? Math.min(...candidates) : inner;
      document.documentElement.style.setProperty("--pixcellor-viewport-height", `${height}px`);
    };
    const updateViewportHeight = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(apply);
    };

    updateViewportHeight();
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("scroll", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);
    window.addEventListener("scroll", updateViewportHeight, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("scroll", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("orientationchange", updateViewportHeight);
      window.removeEventListener("scroll", updateViewportHeight);
      document.documentElement.style.removeProperty("--pixcellor-viewport-height");
    };
  }, []);

  useEffect(() => {
    const pkg = (e: Event) => setPackagesOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener("pixcellor:packages-open-change", pkg as EventListener);
    return () => {
      window.removeEventListener("pixcellor:packages-open-change", pkg as EventListener);
    };
  }, []);

  const overlayOpen = packagesOpen;

  return (
    <div className="w-full">
      <div className="relative overflow-hidden" style={{ height: "var(--pixcellor-viewport-height, 100dvh)" }}>
        <IntroAnimation onVirtualScrollChange={(value) => setHeroScrolled(value > 80)} />
        <PackagesDialog mobileTop hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
        <CustomerAccess hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled || overlayOpen} />
        <TryBeforeBuyDrawer />
        <LetsTalkPrompt />
        <FalloffConsentBanner />
      </div>
    </div>
  );
};

export default Index;