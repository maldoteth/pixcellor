import { Boxes } from "@/components/ui/background-boxes";

/**
 * Hero scene for the "Full Web Apps" service.
 * Tilted multi-coloured pixel grid that lights up cells as the cursor moves,
 * faded into the dark frame via a radial mask. Mask sits below the boxes so
 * hover still works.
 */
export default function FullWebAppsHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Boxes />
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
