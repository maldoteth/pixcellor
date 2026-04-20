import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-background/60 backdrop-blur-sm text-foreground py-3 px-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] md:text-xs text-foreground/70">
        <span className="font-medium text-foreground/90 w-full md:w-auto text-center">
          Pixcellor™ c/o DeLabs LTD<span className="hidden md:inline"> · 14204424</span>
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
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=3rd+Floor%2C+207+Regent+Street%2C+London%2C+W1B+3HH"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <MapPin className="w-3 h-3" />
          3rd Floor, 207 Regent Street, London, W1B 3HH
        </a>
      </div>
    </footer>
  );
};

export default Footer;
