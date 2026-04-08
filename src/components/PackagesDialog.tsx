import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function PackagesDialog() {
  const isMobile = useIsMobile();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="mb-6 px-8 py-3 rounded-sm text-base font-semibold text-foreground flex items-center justify-center relative"
          aria-label="View our web development packages and pricing"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.3),
              inset 0 1px 1px rgba(255,255,255,0.3),
              inset 0 -1px 1px rgba(0,0,0,0.1)
            `,
          }}
        >
          <div
            className="absolute inset-1 rounded-sm opacity-60 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
            }}
          />
          Packages
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-background border-border/50 p-6 md:p-10 max-h-[90vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground text-center mb-8">
            Our Packages
          </DialogTitle>
        </DialogHeader>

        {isMobile ? (
          <MobileCards />
        ) : (
          <DesktopCards />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DesktopCards() {
  return (
    <div className="flex items-center justify-center gap-6 py-8">
      {/* Full Works - tilted left */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -6 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative z-10 w-72 rounded-2xl border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] transition-transform hover:scale-105"
        style={{
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.15),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        <div className="mb-2 text-lg font-bold text-primary">Full Works</div>
        <div className="mb-1 text-3xl font-extrabold text-foreground">$100</div>
        <p className="text-xs text-muted-foreground line-through mb-4">RRP $500</p>
        <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Modern, super fast loading website
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Clean, professional design
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            1 year maintenance included
          </li>
        </ul>
      </motion.div>

      {/* Elite - center, elevated, highlighted */}
      <motion.div
        initial={{ opacity: 0, y: 60, rotate: 0 }}
        animate={{ opacity: 1, y: -20, rotate: 0 }}
        transition={{ type: "spring", duration: 0.7 }}
        className="relative z-20 w-80 scale-110 rounded-3xl border-2 border-primary/50 bg-primary/5 px-10 py-14 shadow-xl transition-transform hover:scale-[1.12]"
        style={{
          boxShadow: `
            0 12px 40px rgba(0,0,0,0.4),
            0 0 30px hsl(210 100% 60% / 0.15),
            inset 0 1px 2px rgba(255,255,255,0.2),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary px-5 py-1 text-xs font-extrabold text-primary-foreground shadow"
        >
          Most Popular
        </motion.div>
        <div className="mb-2 text-lg font-bold text-primary">Elite</div>
        <div className="mb-1 text-5xl font-black text-foreground">$500</div>
        <p className="text-xs text-muted-foreground line-through mb-4">RRP $2,500</p>
        <ul className="mb-6 space-y-2 text-base text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Animated, interactive cutting edge site
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            1 year maintenance included
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Unlimited edits
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            SEO & AEO optimisation
          </li>
        </ul>
      </motion.div>

      {/* Retainer - tilted right */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 6 }}
        animate={{ opacity: 1, y: 0, rotate: 6 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative z-10 w-72 rounded-2xl border border-border/40 bg-background px-8 py-10 shadow-[0_0_0_1px_rgba(255,255,255,.05)_inset] transition-transform hover:scale-105"
        style={{
          boxShadow: `
            0 8px 32px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.15),
            inset 0 -1px 1px rgba(0,0,0,0.1)
          `,
        }}
      >
        <div className="mb-2 text-lg font-bold text-primary">Retainer</div>
        <div className="mb-1 text-3xl font-extrabold text-foreground">$1,200/mo</div>
        <p className="text-xs text-muted-foreground line-through mb-4">RRP $3,600/mo</p>
        <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Your own tech department
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Sites, apps & everything you need
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            Billed monthly ($12,000/year)
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            RRP $36,000/year
          </li>
        </ul>
      </motion.div>
    </div>
  );
}

function MobileCards() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {[
        {
          name: "Full Works",
          price: "$100",
          rrp: "$500",
          features: ["Modern, super fast loading website", "Clean, professional design", "1 year maintenance included"],
        },
        {
          name: "Elite",
          price: "$500",
          rrp: "$2,500",
          featured: true,
          features: ["Animated, interactive cutting edge site", "1 year maintenance included", "Unlimited edits", "SEO & AEO optimisation"],
        },
        {
          name: "Retainer",
          price: "$1,200/mo",
          rrp: "$3,600/mo",
          features: ["Your own tech department", "Sites, apps & everything you need", "Billed monthly ($12,000/year)", "RRP $36,000/year"],
        },
      ].map((pkg) => (
        <div
          key={pkg.name}
          className={`rounded-xl p-5 flex flex-col border ${
            pkg.featured
              ? "border-primary bg-background ring-1 ring-primary/30"
              : "border-border bg-background"
          }`}
        >
          {pkg.featured && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
              Most Popular
            </span>
          )}
          <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
          <div className="mt-3 mb-1">
            <span className="text-3xl font-extrabold text-foreground">{pkg.price}</span>
          </div>
          <p className="text-xs text-muted-foreground line-through mb-4">RRP {pkg.rrp}</p>
          <ul className="space-y-2 flex-1">
            {pkg.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
