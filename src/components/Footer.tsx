import { Facebook, Linkedin, LogIn, MessageSquare, Phone, ScrollText, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer
      className="relative w-full text-foreground py-3 px-4"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      <div className="relative max-w-6xl mx-auto flex flex-nowrap items-center justify-center gap-x-4 text-[11px] md:text-xs text-foreground">
        <span className="font-semibold text-foreground text-sm py-[5px]">
          Pixcellor™
        </span>
        <a
          href="tel:+441483912430"
          aria-label="Call Pixcellor"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61569263824416"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pixcellor on Facebook"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Facebook className="w-3.5 h-3.5" />
        </a>
        <a
          href="https://www.linkedin.com/company/pixcellor/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Pixcellor on LinkedIn"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Linkedin className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          aria-label="Open live chat"
          className="flex items-center hover:text-foreground transition-colors"
          onClick={() => window.dispatchEvent(new Event("pixcellor:open-chat"))}
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="View services"
          className="flex items-center hover:text-foreground transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } }))}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
        </button>
        <Link
          to="/legal"
          aria-label="Legal documents"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <ScrollText className="w-3.5 h-3.5" />
        </Link>
        <button
          type="button"
          aria-label="Customer log in"
          className="flex items-center hover:text-foreground transition-colors"
          onClick={() => window.dispatchEvent(new Event("pixcellor:open-login"))}
        >
          <LogIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};

export default Footer;
