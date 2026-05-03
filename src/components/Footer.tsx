import { Facebook, Linkedin, LogIn, MessageSquare, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer
      className="w-full border-t border-transparent md:border-white/10 bg-background/60 backdrop-blur-sm text-foreground py-3 px-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] md:text-xs text-foreground/70">
        <span className="font-medium text-foreground/90 w-full md:w-auto text-center text-sm py-[5px]">
          Pixcellor
        </span>
        <div className="flex items-center justify-center gap-x-4 flex-nowrap">
          <a
            href="tel:+441483912430"
            aria-label="Call Pixcellor"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Phone className="w-3 h-3" />
          </a>
        </div>
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
