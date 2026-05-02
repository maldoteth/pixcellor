import { useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);

  return (
    <div className="w-full">
      <div className="relative h-dvh overflow-hidden">
        <IntroAnimation onVirtualScrollChange={(value) => setHeroScrolled(value > 80)} />
        <CustomerAccess hidden={heroScrolled} chatOpen={chatOpen} />
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled} />
      </div>
      <FalloffConsentBanner />
    </div>
  );
};

export default Index;