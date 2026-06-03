import { useEffect, useState, lazy, Suspense } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import { useIsMobile } from "@/hooks/use-mobile";
import SeoHead from "@/components/SeoHead";

// Lazy-loaded: large bundles or overlays that mount on user events.
// Keeping these off the critical path shaves ~200KB of JS off first paint.
const PackagesDialog = lazy(() => import("@/components/PackagesDialog"));
const VisionGenerator = lazy(() => import("@/components/VisionGenerator"));
const CustomerAccess = lazy(() => import("@/components/CustomerAccess"));
const FalloffConsentBanner = lazy(() => import("@/components/FalloffConsentBanner"));
const RotateDevicePrompt = lazy(() => import("@/components/RotateDevicePrompt"));
const TryBeforeBuyDrawer = lazy(() => import("@/components/TryBeforeBuyDrawer"));
const LetsTalkPrompt = lazy(() => import("@/components/LetsTalkPrompt"));
const VisionPurchaseFlow = lazy(() => import("@/components/VisionPurchaseFlow"));

const Index = () => {
  const isMobile = useIsMobile();
  const [chatOpen, setChatOpen] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [letsTalkOpen, setLetsTalkOpen] = useState(false);
  const [tryBeforeBuyOpen, setTryBeforeBuyOpen] = useState(false);
  const [visionPurchaseOpen, setVisionPurchaseOpen] = useState(false);
  const [visionGenOpen, setVisionGenOpen] = useState(false);
  const [customerAccessOpen, setCustomerAccessOpen] = useState(false);

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

  useEffect(() => {
    const onOpen = () => setLetsTalkOpen(true);
    const onClose = () => setLetsTalkOpen(false);
    window.addEventListener("pixcellor:letstalk-open", onOpen as EventListener);
    window.addEventListener("pixcellor:letstalk-close", onClose as EventListener);
    return () => {
      window.removeEventListener("pixcellor:letstalk-open", onOpen as EventListener);
      window.removeEventListener("pixcellor:letstalk-close", onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    const onOpen = () => setTryBeforeBuyOpen(true);
    const onClose = () => setTryBeforeBuyOpen(false);
    window.addEventListener("pixcellor:try-before-buy-open", onOpen as EventListener);
    window.addEventListener("pixcellor:try-before-buy-close", onClose as EventListener);
    return () => {
      window.removeEventListener("pixcellor:try-before-buy-open", onOpen as EventListener);
      window.removeEventListener("pixcellor:try-before-buy-close", onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    const onOpen = () => setVisionPurchaseOpen(true);
    const onClose = () => setVisionPurchaseOpen(false);
    window.addEventListener("pixcellor:vision-purchase-open", onOpen as EventListener);
    window.addEventListener("pixcellor:vision-purchase-close", onClose as EventListener);
    return () => {
      window.removeEventListener("pixcellor:vision-purchase-open", onOpen as EventListener);
      window.removeEventListener("pixcellor:vision-purchase-close", onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    const onOpen = () => setVisionGenOpen(true);
    const onClose = () => setVisionGenOpen(false);
    window.addEventListener("pixcellor:vision-gen-open", onOpen as EventListener);
    window.addEventListener("pixcellor:vision-gen-close", onClose as EventListener);
    return () => {
      window.removeEventListener("pixcellor:vision-gen-open", onOpen as EventListener);
      window.removeEventListener("pixcellor:vision-gen-close", onClose as EventListener);
    };
  }, []);

  useEffect(() => {
    const onOpen = () => setCustomerAccessOpen(true);
    const onClose = () => setCustomerAccessOpen(false);
    window.addEventListener("pixcellor:customer-access-open", onOpen as EventListener);
    window.addEventListener("pixcellor:customer-access-close", onClose as EventListener);
    return () => {
      window.removeEventListener("pixcellor:customer-access-open", onOpen as EventListener);
      window.removeEventListener("pixcellor:customer-access-close", onClose as EventListener);
    };
  }, []);

  // On tablet/desktop the chat is a movable, mountable panel — keep the
  // logo and top buttons visible alongside it. On mobile the chat takes
  // over the screen, so treat it like other overlays.
  const otherOverlaysOpen = packagesOpen || letsTalkOpen || tryBeforeBuyOpen || visionPurchaseOpen || visionGenOpen || customerAccessOpen;
  const overlayOpen = otherOverlaysOpen || (isMobile && chatOpen);

  return (
    <div className="w-full">
      <SeoHead
        title="Pixcellor - Digital Services"
        description="AI powered business solutions by a team who have collectively launched over $500,000,000 in market cap and multi 7 figure GTM/Q1 revenue projects."
        path="/"
      />
      {/* Crawlable semantic heading — visually hidden, surfaces the page topic for SEO/AEO */}
      <h1 className="sr-only">Pixcellor — AI Powered Business Solutions</h1>
      <p className="sr-only">
        Pixcellor is a team of AI-powered business solution specialists who have collectively launched
        over $500,000,000 in market cap and multi 7 figure GTM/Q1 revenue projects.
      </p>
      <div className="relative overflow-hidden" style={{ height: "var(--pixcellor-viewport-height, 100dvh)" }}>
        <IntroAnimation
          onVirtualScrollChange={(value) => setHeroScrolled(value > 80)}
          onPackagesOpenChange={setPackagesOpen}
          overlayOpen={overlayOpen}
        />
        <Suspense fallback={null}>
          <PackagesDialog mobileTop hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
          <VisionGenerator hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
          <CustomerAccess hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
        </Suspense>
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled || overlayOpen} />
        <Suspense fallback={null}>
          <TryBeforeBuyDrawer />
          <LetsTalkPrompt />
          <VisionPurchaseFlow />
          <FalloffConsentBanner />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <RotateDevicePrompt />
      </Suspense>
    </div>
  );
};

export default Index;
