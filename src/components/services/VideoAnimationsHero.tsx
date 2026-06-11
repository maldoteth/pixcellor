import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

/**
 * Hero scene for the "Video & 3D Animations" service.
 * Interactive Spline 3D scene with a spotlight wash, scoped to its container.
 */
export default function VideoAnimationsHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      <SplineScene
        scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
        className="absolute inset-0 h-full w-full"
      />
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
