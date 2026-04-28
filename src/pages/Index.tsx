import { useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="h-screen overflow-hidden">
        <IntroAnimation />
      </div>
      <CustomerAccess />
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
      <FalloffConsentBanner />
    </div>
  );
};

export default Index;