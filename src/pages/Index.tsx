import { useState, useRef } from "react";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import ChatSection from "@/components/ChatSection";
import ChatBot from "@/components/ChatBot";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  const handleOpenChat = () => {
    setChatOpen(true);
  };

  return (
    <div className="w-full">
      <div className="h-screen overflow-hidden">
        <IntroAnimation />
      </div>
      <div ref={chatSectionRef}>
        <ChatSection onOpenChat={handleOpenChat} />
      </div>
      <ChatBot isOpen={chatOpen} setIsOpen={setChatOpen} />
    </div>
  );
};

export default Index;
