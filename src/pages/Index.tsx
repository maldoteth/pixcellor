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
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const pkg = (e: Event) => setPackagesOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    const svc = (e: Event) => setServicesOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener("pixcellor:packages-open-change", pkg as EventListener);
    window.addEventListener("pixcellor:services-open-change", svc as EventListener);
    return () => {
      window.removeEventListener("pixcellor:packages-open-change", pkg as EventListener);
      window.removeEventListener("pixcellor:services-open-change", svc as EventListener);
    };
  }, []);

  const overlayOpen = packagesOpen || servicesOpen;

  return (
    <div className="w-full">
      <div className="relative h-screen h-dvh overflow-hidden">
        <IntroAnimation onVirtualScrollChange={(value) => setHeroScrolled(value > 80)} />
        <PackagesDialog mobileTop hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
        <CustomerAccess hidden={heroScrolled || overlayOpen} chatOpen={chatOpen} />
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled || overlayOpen} />
        <ServicesDialog />
        <FalloffConsentBanner />
      </div>
    </div>
  );
};

export default Index;