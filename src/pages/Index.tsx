import { useState } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatBot from "@/components/ChatBot";
import Footer from "@/components/Footer";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="h-screen overflow-hidden">
        <IntroAnimation />
      </div>
      <Footer />
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  );
};

export default Index;