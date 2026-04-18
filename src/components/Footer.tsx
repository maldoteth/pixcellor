import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-background/60 backdrop-blur-sm text-foreground py-3 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] md:text-xs text-foreground/70">
        <span className="font-medium text-foreground/90 w-full md:w-auto text-center">
          Pixcellor™ c/o DeLabs LTD · 14204424
        </span>
        <div className="flex items-center justify-center gap-x-4 flex-nowrap">
          <a
            href="mailto:dev@delabs.co.uk"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Mail className="w-3 h-3" />
            dev@delabs.co.uk
          </a>
          <a
            href="tel:+441483912430"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Phone className="w-3 h-3" />
            01483 912430
          </a>
        </div>
        <span className="hidden md:flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          3rd Floor, 207 Regent Street, London, W1B 3HH
        </span>
      </div>
    </footer>
  );
};

export default Footer;
