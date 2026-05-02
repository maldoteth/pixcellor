import { motion } from "framer-motion";
import { Code2, Palette, Rocket, Megaphone, ShoppingBag, Sparkles } from "lucide-react";

const services = [
  {
    icon: Code2,
    title: "Web Development",
    description: "Custom-built websites and web apps engineered for speed, scale, and conversion.",
  },
  {
    icon: Palette,
    title: "Design & Branding",
    description: "Distinctive visual identities and interfaces that make your brand unforgettable.",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce",
    description: "High-performance storefronts with seamless checkout and inventory flows.",
  },
  {
    icon: Rocket,
    title: "Launch & Growth",
    description: "From MVP to scale-up, we ship fast and iterate based on real user data.",
  },
  {
    icon: Megaphone,
    title: "Marketing Systems",
    description: "Email campaigns, automations, and analytics that turn visitors into customers.",
  },
  {
    icon: Sparkles,
    title: "AI Integrations",
    description: "Smart assistants, content generation, and workflows powered by modern AI.",
  },
];

export default function ServicesSection() {
  return (
    <section className="relative w-full bg-black text-foreground py-24 md:py-32 px-6">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 0%, hsla(0,0%,100%,0.08) 0%, transparent 70%)",
      }} />
      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 md:mb-20"
        >
          <p className="text-xs md:text-sm font-bold tracking-[0.25em] text-foreground/60 uppercase mb-4">
            What We Do
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-5">
            Services Built for Builders
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            End-to-end digital craftsmanship — from the first sketch to the final ship.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl p-6 md:p-7 border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:bg-white/20 transition-colors">
                  <Icon className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-2 tracking-tight">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
