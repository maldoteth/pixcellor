import { Briefcase, Facebook, Linkedin, MessageSquare, Phone, ScrollText, ShoppingCart, User } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const iconClass = "w-4 h-4 md:w-3.5 md:h-3.5";
  const itemClass = "flex items-center justify-center hover:text-foreground transition-colors p-1";

  return (
    <footer
      className="relative w-full text-foreground py-3 px-4"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)',
      }}
    >
      <div className="relative max-w-6xl mx-auto flex flex-nowrap items-center gap-x-2 md:justify-center md:gap-x-4 text-[11px] md:text-xs text-foreground">
        <span className="font-semibold text-foreground text-sm py-[5px] shrink-0">
          Pixcellor™
        </span>
        <div className="flex flex-1 items-center justify-between md:flex-none md:justify-center md:gap-x-4 ml-2 md:ml-0">
          <a
            href="tel:+441483912430"
            aria-label="Call Pixcellor"
            className={itemClass}
          >
            <Phone className={iconClass} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61569263824416"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pixcellor on Facebook"
            className={itemClass}
          >
            <Facebook className={iconClass} />
          </a>
          <a
            href="https://www.linkedin.com/company/pixcellor/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Pixcellor on LinkedIn"
            className={itemClass}
          >
            <Linkedin className={iconClass} />
          </a>
          <button
            type="button"
            aria-label="Open live chat"
            className={itemClass}
            onClick={() => window.dispatchEvent(new Event("pixcellor:open-chat"))}
          >
            <MessageSquare className={iconClass} />
          </button>
          <button
            type="button"
            aria-label="View services"
            className={itemClass}
            onClick={() => window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } }))}
          >
            <ShoppingCart className={iconClass} />
          </button>
          <Link
            to="/legal"
            aria-label="Legal documents"
            className={itemClass}
          >
            <ScrollText className={iconClass} />
          </Link>
          <Link
            to="/jobs/apply"
            aria-label="Looking for work"
            title="Looking for work?"
            className={itemClass}
          >
            <Briefcase className={iconClass} />
          </Link>
          <button
            type="button"
            aria-label="Customer log in"
            className={itemClass}
            onClick={() => window.dispatchEvent(new Event("pixcellor:open-login"))}
          >
            <User className={iconClass} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
