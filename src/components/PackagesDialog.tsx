import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Full Works",
    price: "$100",
    rrp: "$500",
    features: [
      "Modern, super fast loading website",
      "Clean, professional design",
      "1 year maintenance included",
    ],
  },
  {
    name: "Elite",
    price: "$500",
    rrp: "$2,500",
    featured: true,
    features: [
      "Animated, interactive cutting edge site",
      "1 year maintenance included",
      "Unlimited edits",
      "SEO & AEO optimisation",
    ],
  },
  {
    name: "Retainer",
    price: "$1,200/mo",
    rrp: "$3,600/mo",
    features: [
      "Your own tech department",
      "Sites, apps & everything you need",
      "Billed monthly ($12,000/year)",
      "RRP $36,000/year",
    ],
  },
];

export default function PackagesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="mb-6 px-8 py-3 rounded-sm text-base font-semibold text-foreground flex items-center justify-center relative"
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
      <DialogContent className="max-w-3xl bg-background border-border/50 p-6 max-h-[90vh] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground text-center mb-6">
            Our Packages
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
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
      </DialogContent>
    </Dialog>
  );
}
