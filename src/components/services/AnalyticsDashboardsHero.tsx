import { useEffect, useRef } from "react";

interface Props {
  trailOpacity?: number;
  particleCount?: number;
  speed?: number;
}

/**
 * Analytics Dashboards hero — neural flow-field, mostly black/white/grey,
 * with sprinkled rainbow squares that energise around the cursor.
 */
const AnalyticsDashboardsHero: React.FC<Props> = ({
  trailOpacity = 0.12,
  particleCount = 800,
  speed = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let particles: Particle[] = [];
    let animationFrameId = 0;
    const mouse = { x: -1000, y: -1000, active: false };

    const hslToCss = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;

    class Particle {
      x = 0; y = 0; vx = 0; vy = 0; age = 0; life = 0;
      // Style: greyscale brightness OR rainbow hue (only used when colorful)
      colorful = false;
      hue = 0;
      grey = 200;
      size = 1.5;
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0; this.vy = 0;
        this.age = initial ? Math.random() * 100 : 0;
        this.life = Math.random() * 200 + 120;
        // ~12% of particles are rainbow squares — the rest are B/W/grey.
        this.colorful = Math.random() < 0.12;
        this.hue = Math.random() * 360;
        this.grey = Math.floor(140 + Math.random() * 115); // 140..255
        this.size = this.colorful ? 2.2 : 1.5;
      }
      update() {
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
        this.vx += Math.cos(angle) * 0.2 * speed;
        this.vy += Math.sin(angle) * 0.2 * speed;

        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const R = 240; // bigger interaction radius
          if (distance < R) {
            const force = (R - distance) / R;
            // Stronger push + small swirl for more "alive" feel
            this.vx -= dx * force * 0.18;
            this.vy -= dy * force * 0.18;
            this.vx += -dy * force * 0.04;
            this.vy += dx * force * 0.04;
          }
        }

        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.92; this.vy *= 0.92;
        this.age++;
        if (this.age > this.life) this.reset();
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }
      draw(c: CanvasRenderingContext2D) {
        const alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;
        // Boost when close to cursor → "pop"
        let boost = 0;
        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) boost = 1 - d / 180;
        }
        c.globalAlpha = Math.max(0, Math.min(1, alpha + boost * 0.3));
        if (this.colorful) {
          c.fillStyle = hslToCss(this.hue, 95, 55 + boost * 10);
        } else {
          const g = Math.min(255, this.grey + Math.floor(boost * 40));
          c.fillStyle = `rgb(${g},${g},${g})`;
        }
        const s = this.size + boost * 1.6;
        c.fillRect(this.x - s / 2, this.y - s / 2, s, s);
      }
    }

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);
      particles.forEach((p) => { p.update(); p.draw(ctx); });
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
    };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const handleMouseLeave = () => { mouse.active = false; mouse.x = -1000; mouse.y = -1000; };
    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    };

    init();
    animate();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleMouseLeave);
    };
  }, [trailOpacity, particleCount, speed]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
};

export default AnalyticsDashboardsHero;
