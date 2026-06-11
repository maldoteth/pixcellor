import { AiHeroBackground } from "@/components/ui/ai-hero-background";

/**
 * Hero scene for the "Ecommerce Stores" service.
 * Instanced dot grid with bloom + RGB-shift post FX, scoped to its container.
 */
export default function EcommerceStoresHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AiHeroBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 85%, #000 100%)",
        }}
      />
    </div>
  );
}
