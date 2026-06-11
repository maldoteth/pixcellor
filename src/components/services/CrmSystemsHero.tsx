import { Waves } from "@/components/ui/wave-background";

/**
 * Hero scene for the "CRM Systems" service.
 * Cursor-reactive simplex-noise wave grid, scoped to its container.
 */
export default function CrmSystemsHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Waves strokeColor="#ffffff" backgroundColor="#000000" />
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
