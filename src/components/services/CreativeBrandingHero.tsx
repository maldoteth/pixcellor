import videoAsset from "@/assets/video/creative-branding.mp4.asset.json";

/**
 * Hero scene for the "Creative & branding" service.
 * Plays a looping muted brand video, scoped to its container with the same
 * dark vignette as the other service banners.
 */
export default function CreativeBrandingHero() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        src={videoAsset.url}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%)",
        }}
      />
    </div>
  );
}
