import { Facebook, Linkedin, LogIn, MessageSquare, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer
      className="relative w-full text-foreground py-3 px-4 md:backdrop-blur-2xl md:backdrop-saturate-150 md:bg-white/5 md:border-t md:border-white/10"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      {/* Liquid-glass progressive blur: stronger at bottom, fades to clear at top */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -top-2 md:hidden overflow-hidden">
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', maskImage: 'linear-gradient(to bottom, transparent 30%, black 60%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 30%, black 60%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', maskImage: 'linear-gradient(to bottom, transparent 55%, black 80%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 55%, black 80%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(40px) saturate(160%)', WebkitBackdropFilter: 'blur(40px) saturate(160%)', maskImage: 'linear-gradient(to bottom, transparent 72%, black 95%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 72%, black 95%)' }} />
        {/* Subtle dark tint to kill see-through at the very bottom */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, hsl(var(--background) / 0.55) 90%, hsl(var(--background) / 0.85) 100%)' }} />
      </div>
      <div className="relative max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] md:text-xs text-foreground">
        <span className="font-semibold text-foreground w-full md:w-auto text-center text-sm py-[5px]">
          Pixcellor™
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
