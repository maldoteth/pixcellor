import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-background text-foreground py-10 px-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="text-base font-semibold mb-3">Pixcellor™</h3>
          <p className="text-foreground/70 leading-relaxed">
            Pixcellor c/o DeLabs LTD
            <br />
            Company No. 14204424
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Contact</h3>
          <ul className="space-y-2 text-foreground/70">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0" />
              <a
                href="mailto:dev@delabs.co.uk"
                className="hover:text-foreground transition-colors"
              >
                dev@delabs.co.uk
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0" />
              <a
                href="tel:+441483912430"
                className="hover:text-foreground transition-colors"
              >
                01483 912430
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-semibold mb-3">Address</h3>
          <p className="text-foreground/70 leading-relaxed flex items-start gap-2">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              3rd Floor Suite, 207 Regent Street,
              <br />
              London, England, W1B 3HH
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-white/10 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} Pixcellor™ — All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
