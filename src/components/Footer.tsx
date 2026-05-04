import { Facebook, Linkedin, LogIn, MessageSquare, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer
      className="relative isolate w-full overflow-visible text-foreground py-3 px-4 border-t border-border/40"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      {/* Liquid-glass progressive blur: stronger at bottom, fades to clear at top */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -top-40 overflow-hidden">
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(16px) saturate(190%)', WebkitBackdropFilter: 'blur(16px) saturate(190%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(36px) saturate(210%)', WebkitBackdropFilter: 'blur(36px) saturate(210%)', maskImage: 'linear-gradient(to bottom, transparent 12%, black 44%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 12%, black 44%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(72px) saturate(230%) brightness(0.78)', WebkitBackdropFilter: 'blur(72px) saturate(230%) brightness(0.78)', maskImage: 'linear-gradient(to bottom, transparent 34%, black 78%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 34%, black 78%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(110px) saturate(260%) brightness(0.72)', WebkitBackdropFilter: 'blur(110px) saturate(260%) brightness(0.72)', maskImage: 'linear-gradient(to bottom, transparent 52%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 52%, black 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--foreground) / 0.05) 36%, hsl(var(--background) / 0.82) 76%, hsl(var(--background) / 0.96) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: 'linear-gradient(115deg, hsl(var(--foreground) / 0.08), transparent 32%, hsl(var(--foreground) / 0.06) 58%, transparent 82%)' }} />
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
