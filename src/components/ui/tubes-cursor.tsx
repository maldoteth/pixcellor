import { useEffect, useRef } from "react";

type TubesApp = {
  tubes: {
    setColors: (c: string[]) => void;
    setLightsColors: (c: string[]) => void;
  };
  dispose?: () => void;
};

const randomColors = (count: number) =>
  Array.from(
    { length: count },
    () =>
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
  );

/**
 * Three.js tubes-cursor scene scoped to its parent (not full screen).
 * Loaded dynamically from the threejs-components CDN. Click to randomise colors.
 */
export default function TubesCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<TubesApp | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const url =
        "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";
      (import(/* @vite-ignore */ url) as Promise<{
        default: (canvas: HTMLCanvasElement, opts: unknown) => TubesApp;
      }>)
        .then((mod) => {
          const TubesCursorFn = mod.default;
          if (!canvasRef.current) return;
          appRef.current = TubesCursorFn(canvasRef.current, {
            tubes: {
              colors: ["#d4af37", "#f5e6a8", "#8a6a1f"],
              lights: {
                intensity: 200,
                colors: ["#f5e6a8", "#d4af37", "#ffffff", "#b8860b"],
              },
            },
          });
        })
        .catch((err) => console.error("Failed to load TubesCursor:", err));
    }, 100);

    return () => {
      clearTimeout(t);
      if (appRef.current?.dispose) appRef.current.dispose();
      appRef.current = null;
    };
  }, []);

  const handleClick = () => {
    if (!appRef.current) return;
    appRef.current.tubes.setColors(randomColors(3));
    appRef.current.tubes.setLightsColors(randomColors(4));
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
