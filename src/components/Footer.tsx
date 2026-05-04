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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -top-32 overflow-hidden">
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(10px) saturate(180%)', WebkitBackdropFilter: 'blur(10px) saturate(180%)', maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(24px) saturate(190%)', WebkitBackdropFilter: 'blur(24px) saturate(190%)', maskImage: 'linear-gradient(to bottom, transparent 18%, black 48%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 18%, black 48%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(44px) saturate(200%)', WebkitBackdropFilter: 'blur(44px) saturate(200%)', maskImage: 'linear-gradient(to bottom, transparent 40%, black 72%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 40%, black 72%)' }} />
        <div className="absolute inset-0" style={{ backdropFilter: 'blur(72px) saturate(220%) brightness(0.82)', WebkitBackdropFilter: 'blur(72px) saturate(220%) brightness(0.82)', maskImage: 'linear-gradient(to bottom, transparent 58%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 58%, black 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.34) 38%, hsl(var(--background) / 0.74) 78%, hsl(var(--background) / 0.9) 100%)' }} />
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
