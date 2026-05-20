import { Boxes } from "@/components/ui/background-boxes";

/**
 * Hero scene for the "Landing Pages" service.
 * Dark canvas with the Aceternity boxes grid that highlights on hover, plus
 * radial mask to fade edges into the surrounding theme.
 */
export default function LandingPagesHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Radial mask to fade boxes into the dark frame */}
      <div className="pointer-events-none absolute inset-0 z-20 h-full w-full bg-black [mask-image:radial-gradient(transparent,white)]" />
      <Boxes />
    </div>
  );
}
