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
    let cycleId: number | undefined;
    const GOLD_HUE = 45;
    const STEP = 0.6; // degrees per tick — smooth rainbow loop back to gold
    let hue = GOLD_HUE;

    const hsl = (h: number, s: number, l: number) =>
      `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`;

    const tick = () => {
      const app = appRef.current;
      if (!app) return;
      hue = (hue + STEP) % 360;
      app.tubes.setColors([
        hsl(hue, 85, 55),
        hsl(hue + 25, 90, 65),
        hsl(hue - 25, 70, 40),
      ]);
      app.tubes.setLightsColors([
        hsl(hue + 10, 90, 70),
        hsl(hue, 85, 55),
        "#ffffff",
        hsl(hue - 20, 80, 45),
      ]);
    };

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
              colors: [hsl(GOLD_HUE, 85, 55), hsl(GOLD_HUE + 25, 90, 65), hsl(GOLD_HUE - 25, 70, 40)],
              lights: {
                intensity: 200,
                colors: [hsl(GOLD_HUE + 10, 90, 70), hsl(GOLD_HUE, 85, 55), "#ffffff", hsl(GOLD_HUE - 20, 80, 45)],
              },
            },
          });
          cycleId = window.setInterval(tick, 80);
        })
        .catch((err) => console.error("Failed to load TubesCursor:", err));
    }, 100);

    return () => {
      clearTimeout(t);
      if (cycleId !== undefined) clearInterval(cycleId);
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
