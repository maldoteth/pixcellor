import { useEffect, useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";
import PackagesDialog from "@/components/PackagesDialog";
import ServicesDialog from "@/components/ServicesDialog";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setPackagesOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    };
    window.addEventListener("pixcellor:packages-open-change", handler as EventListener);
    return () => window.removeEventListener("pixcellor:packages-open-change", handler as EventListener);
  }, []);

  return (
    <div className="w-full">
      <div className="relative h-dvh overflow-hidden">
        <IntroAnimation onVirtualScrollChange={(value) => setHeroScrolled(value > 80)} />
        <PackagesDialog mobileTop hidden={heroScrolled || packagesOpen} chatOpen={chatOpen} />
        <CustomerAccess hidden={heroScrolled || packagesOpen} chatOpen={chatOpen} />
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled || packagesOpen} />
        <ServicesDialog />
      </div>
      <FalloffConsentBanner />
    </div>
  );
};

export default Index;