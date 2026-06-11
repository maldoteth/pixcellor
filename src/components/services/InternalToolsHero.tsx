import InteractiveGradientBackground from "@/components/ui/interactive-gradient-background";

/**
 * Hero scene for the "Internal Tools" service.
 * Interactive multi-color gradient blobs that follow the cursor,
 * scoped to its container with the same dark vignette as other banners.
 */
export default function InternalToolsHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <InteractiveGradientBackground dark intensity={1.1} />
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
