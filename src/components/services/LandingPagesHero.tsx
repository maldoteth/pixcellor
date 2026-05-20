import { Boxes } from "@/components/ui/background-boxes";

/**
 * Hero scene for the "Landing Pages" service.
 * Animated tilted grid (hover to highlight cells) faded into the dark frame
 * via a radial mask. The mask sits below the boxes so hover still works.
 */
export default function LandingPagesHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Boxes />
      {/* Radial fade — pointer-events-none so cells remain hoverable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.85) 80%, #000 100%)",
        }}
      />
    </div>
  );
}
