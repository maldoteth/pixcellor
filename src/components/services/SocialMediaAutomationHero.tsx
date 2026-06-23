import { useEffect, useRef } from "react";

declare global {
  interface Window {
    p5: any;
    gsap: any;
  }
}

const SocialMediaAutomationHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing) {
          if ((existing as any)._loaded) return resolve();
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject());
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => {
          (s as any)._loaded = true;
          resolve();
        };
        s.onerror = () => reject();
        document.head.appendChild(s);
      });

    const init = async () => {
      try {
        if (!window.p5) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js");
        if (!window.gsap) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js");
      } catch {
        return;
      }
      if (cancelled || !containerRef.current || !window.p5 || !window.gsap) return;

      const container = containerRef.current;

      const sketch = (p: any) => {
        const particles: any[] = [];
        const getSize = () => {
          const rect = container.getBoundingClientRect();
          return { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
        };
        const amount = window.innerWidth < 600 || window.innerHeight < 600 ? 1000 : 2000;
        const durationShrink = 8;
        const durationGrow = 8;
        const total = durationShrink + durationGrow;
        // Full hue spectrum (rainbow accents)
        const theme = [
          "#ff3b3b", "#ff8a3b", "#ffd23b", "#5dff3b", "#3bffd2",
          "#3b8aff", "#7a3bff", "#e23bff", "#ff3b8a", "#ffffff",
        ];
        const proxy = { progress: 1, val: 0 };
        let progress: any;
        let interpolator: any;

        class Particle {
          i: number;
          cos: number;
          sin: number;
          r: number;
          offset: number;
          color: string;
          constructor(i: number) {
            this.i = i;
            this.cos = p.cos(i * p.TWO_PI);
            this.sin = p.sin(i * p.TWO_PI);
            this.r = p.floor(p.random(2, 8));
            this.offset = p.pow(p.random(1, 2), 2.5) * p.random(-0.015, 0.015);
            this.color = p.random(theme);
          }
          draw() {
            interpolator.progress((proxy.progress + this.i) % 1);
            const radius = Math.min(p.width, p.height) * (0.35 + proxy.val * this.offset);
            const x = this.cos * radius + p.width / 2;
            const y = this.sin * radius + p.height / 2;
            p.fill(this.color);
            // Square instead of circle
            p.rect(x - this.r / 2, y - this.r / 2, this.r, this.r);
          }
        }

        p.setup = () => {
          const { w, h } = getSize();
          const canvas = p.createCanvas(w, h);
          canvas.parent(container);
          p.noStroke();
          if (navigator.userAgent.indexOf("Firefox") < 0) {
            p.blendMode(p.SCREEN);
          }
          const gsap = window.gsap;
          progress = gsap.to(proxy, { progress: 0, ease: "none", duration: total, repeat: -1 });
          interpolator = gsap
            .timeline({ paused: true, reverse: true })
            .to(proxy, { val: 1, duration: durationShrink, ease: "elastic.in(1.5, 0.15)" })
            .to(proxy, { val: 0, duration: durationGrow, ease: "back.in(3)" });
          for (let i = 0; i < amount; i++) particles.push(new Particle(i / amount));
        };

        p.windowResized = () => {
          const { w, h } = getSize();
          p.resizeCanvas(w, h);
        };

        const onMove = (x: number, y: number) => {
          let a = p.atan2(y - p.height / 2, x - p.width / 2);
          a = a < 0 ? a + p.TWO_PI : a;
          a = p.abs(a / p.TWO_PI) * total;
          progress.time(a);
        };

        p.touchMoved = () => {
          if (p.touches.length === 0) return;
          onMove(p.touches[0].x, p.touches[0].y);
        };
        p.mouseMoved = () => onMove(p.mouseX, p.mouseY);

        p.draw = () => {
          p.clear();
          particles.forEach((particle) => particle.draw());
        };
      };

      sketchRef.current = new window.p5(sketch);

      // Resize observer to keep canvas matched to container
      const ro = new ResizeObserver(() => {
        if (sketchRef.current?.windowResized) sketchRef.current.windowResized();
      });
      ro.observe(container);
      (sketchRef.current as any)._ro = ro;
    };

    init();

    return () => {
      cancelled = true;
      if (sketchRef.current?._ro) sketchRef.current._ro.disconnect();
      if (sketchRef.current) {
        try { sketchRef.current.remove(); } catch {}
        sketchRef.current = null;
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: "none" }}
      />
      <style>{`
        .sma-particles canvas {
          display: block;
          filter: drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.35));
        }
      `}</style>
    </div>
  );
};

export default SocialMediaAutomationHero;
