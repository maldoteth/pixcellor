import { useEffect, useRef, useState } from "react";

interface TelesalesHeroProps {
  shineColor?: string;
}

/**
 * Hero scene for the "Telesales campaigns" service.
 * A vertical light-bar that tracks the cursor anywhere on the page,
 * casting a soft warm glow across the dark banner. Container-scoped
 * so it sits inside the banner card like every other service hero.
 */
export default function TelesalesHero({
  shineColor = "#5FB0F7",
}: TelesalesHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lampRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const lightenColor = (color: string, percent: number) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const newR = Math.min(255, Math.floor(r + ((255 - r) * percent) / 100));
    const newG = Math.min(255, Math.floor(g + ((255 - g) * percent) / 100));
    const newB = Math.min(255, Math.floor(b + ((255 - b) * percent) / 100));
    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  const boxShadow = (() => {
    const l20 = lightenColor(shineColor, 20);
    const l10 = lightenColor(shineColor, 10);
    const l5 = lightenColor(shineColor, 5);
    return `
      0 0 1vh 0.5vh ${l20},
      0 0 2vh 1vh ${l20},
      0 0 5vh 1vh ${l10},
      0 0 10vh 1vh ${l5},
      0 0 15vh 1vh ${shineColor},
      0 0 20vh 1vh ${shineColor},
      0 0 25vh 1vh ${shineColor},
      0 0 50vh 1vh ${shineColor}
    `;
  })();

  useEffect(() => {
    const container = containerRef.current;
    const lamp = lampRef.current;
    if (!container || !lamp) return;

    const move = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      lamp.style.transform = `translate(${x - lamp.offsetWidth / 2}px, ${y - lamp.offsetHeight / 2}px)`;
    };

    const onMouse = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) move(e.touches[0].clientX, e.touches[0].clientY);
    };

    // Intro animation
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    move(cx, cy);
    const t1 = window.setTimeout(() => move(rect.left + rect.width * 0.9, rect.top + rect.height * 0.8), 100);
    const t2 = window.setTimeout(() => move(rect.left + rect.width * 0.25, rect.top + rect.height * 0.15), 1000);
    const t3 = window.setTimeout(() => setReady(true), 2000);

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-black"
    >
      <div
        ref={lampRef}
        className="absolute left-0 top-0 z-10 ease-out"
        style={{
          height: "50vh",
          width: "4vh",
          backgroundColor: "#fff",
          borderRadius: "2vh",
          boxShadow,
          transition: "transform 500ms ease-out",
          opacity: ready ? 1 : 1,
        }}
      />
    </div>
  );
}
