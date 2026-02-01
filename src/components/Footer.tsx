import React, { useState } from "react";
import { ArrowUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactModal from "./ContactModal";
import logo from "@/assets/logo.png";

interface FooterProps {
  onGoToTop: () => void;
}

export default function Footer({ onGoToTop }: FooterProps) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <footer className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 bg-background/80 backdrop-blur-sm border-t border-border/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left - Logo and Brand */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Pixcellor Logo" className="h-8 w-8 object-contain" />
            <span className="text-sm font-medium text-foreground tracking-tight">
              Pixcellor<sup className="text-[8px] align-super">™</sup>
            </span>
          </div>

          {/* Center - Go to Top */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onGoToTop}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowUp className="h-4 w-4 mr-1" />
            Go to top
          </Button>

          {/* Right - Contact Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setContactOpen(true)}
            className="border-border text-foreground hover:bg-accent"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact
          </Button>
        </div>
      </footer>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
