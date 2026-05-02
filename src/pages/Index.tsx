import { useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import FalloffConsentBanner from "@/components/FalloffConsentBanner";
import CustomerAccess from "@/components/CustomerAccess";
import ServicesSection from "@/components/ServicesSection";
import Footer from "@/components/Footer";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [heroScrolled, setHeroScrolled] = useState(false);

  return (
    <div className="w-full overflow-x-hidden">
      {/* Tall scroll container — hero sticks inside while page scrolls */}
      <div className="relative" style={{ height: "260vh" }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <IntroAnimation onVirtualScrollChange={(value) => setHeroScrolled(value > 80)} />
        </div>
      </div>
      <CustomerAccess hidden={heroScrolled} />
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} hidden={heroScrolled} />
      <ServicesSection />
      <Footer />
      <FalloffConsentBanner />
    </div>
  );
};

export default Index;