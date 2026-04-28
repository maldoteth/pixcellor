import { useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="relative h-screen overflow-hidden">
        <IntroAnimation />
        <CustomerAccess />
        <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
      </div>
      <FalloffConsentBanner />
    </div>
  );
};

export default Index;