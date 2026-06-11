'use client';
import { useEffect, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';

interface Point {
  x: number;
  y: number;
  wave: { x: number; y: number };
  cursor: { x: number; y: number; vx: number; vy: number };
}

interface WavesProps {
  className?: string;
  strokeColor?: string;
  backgroundColor?: string;
}

export function Waves({
  className = '',
  strokeColor = '#ffffff',
  backgroundColor = '#000000',
}: WavesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mouseRef = useRef({
    x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false,
  });
  const pathsRef = useRef<SVGPathElement[]>([]);
  const linesRef = useRef<Point[][]>([]);
  const noiseRef = useRef<((x: number, y: number) => number) | null>(null);
  const rafRef = useRef<number | null>(null);
  const boundingRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const svg = svgRef.current;
    if (!container || !svg) return;

    noiseRef.current = createNoise2D();

    const setSize = () => {
      boundingRef.current = container.getBoundingClientRect();
      const { width, height } = boundingRef.current;
      svg.style.width = `${width}px`;
      svg.style.height = `${height}px`;
    };

    const setLines = () => {
      if (!boundingRef.current) return;
      const { width, height } = boundingRef.current;
      linesRef.current = [];
      pathsRef.current.forEach((p) => p.remove());
      pathsRef.current = [];

      const xGap = 10;
      const yGap = 10;
      const oWidth = width + 200;
      const oHeight = height + 30;
      const totalLines = Math.ceil(oWidth / xGap);
      const totalPoints = Math.ceil(oHeight / yGap);
      const xStart = (width - xGap * totalLines) / 2;
      const yStart = (height - yGap * totalPoints) / 2;

      for (let i = 0; i < totalLines; i++) {
        const points: Point[] = [];
        for (let j = 0; j < totalPoints; j++) {
          points.push({
            x: xStart + xGap * i,
            y: yStart + yGap * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          });
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', '1');
        svg.appendChild(path);
        pathsRef.current.push(path);
        linesRef.current.push(points);
      }
    };

    const updateMousePosition = (x: number, y: number) => {
      if (!boundingRef.current) return;
      const mouse = mouseRef.current;
      const rect = container.getBoundingClientRect();
      mouse.x = x - rect.left;
      mouse.y = y - rect.top;
      if (!mouse.set) {
        mouse.sx = mouse.x;
        mouse.sy = mouse.y;
        mouse.lx = mouse.x;
        mouse.ly = mouse.y;
        mouse.set = true;
      }
    };

    const onResize = () => { setSize(); setLines(); };
    const onMouseMove = (e: MouseEvent) => updateMousePosition(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updateMousePosition(t.clientX, t.clientY);
    };

    const movePoints = (time: number) => {
      const noise = noiseRef.current;
      if (!noise) return;
      const mouse = mouseRef.current;
      linesRef.current.forEach((points) => {
        points.forEach((p) => {
          const move = noise(
            (p.x + time * 0.008) * 0.003,
            (p.y + time * 0.003) * 0.002,
          ) * 8;
          p.wave.x = Math.cos(move) * 12;
          p.wave.y = Math.sin(move) * 6;

          const dx = p.x - mouse.sx;
          const dy = p.y - mouse.sy;
          const d = Math.hypot(dx, dy);
          const l = Math.max(175, mouse.vs);
          if (d < l) {
            const s = 1 - d / l;
            const f = Math.cos(d * 0.001) * s;
            p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 0.00035;
            p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 0.00035;
          }
          p.cursor.vx += (0 - p.cursor.x) * 0.01;
          p.cursor.vy += (0 - p.cursor.y) * 0.01;
          p.cursor.vx *= 0.95;
          p.cursor.vy *= 0.95;
          p.cursor.x += p.cursor.vx;
          p.cursor.y += p.cursor.vy;
          p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
          p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
        });
      });
    };

    const moved = (p: Point, withCursorForce = true) => ({
      x: p.x + p.wave.x + (withCursorForce ? p.cursor.x : 0),
      y: p.y + p.wave.y + (withCursorForce ? p.cursor.y : 0),
    });

    const drawLines = () => {
      linesRef.current.forEach((points, lIndex) => {
        const path = pathsRef.current[lIndex];
        if (!path || points.length < 2) return;
        const first = moved(points[0], false);
        let d = `M ${first.x} ${first.y}`;
        for (let i = 1; i < points.length; i++) {
          const c = moved(points[i]);
          d += `L ${c.x} ${c.y}`;
        }
        path.setAttribute('d', d);
      });
    };

    const tick = (time: number) => {
      const mouse = mouseRef.current;
      mouse.sx += (mouse.x - mouse.sx) * 0.1;
      mouse.sy += (mouse.y - mouse.sy) * 0.1;
      const dx = mouse.x - mouse.lx;
      const dy = mouse.y - mouse.ly;
      const d = Math.hypot(dx, dy);
      mouse.v = d;
      mouse.vs += (d - mouse.vs) * 0.1;
      mouse.vs = Math.min(100, mouse.vs);
      mouse.lx = mouse.x;
      mouse.ly = mouse.y;
      mouse.a = Math.atan2(dy, dx);
      movePoints(time);
      drawLines();
      rafRef.current = requestAnimationFrame(tick);
    };

    setSize();
    setLines();
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('touchmove', onTouchMove);
      pathsRef.current.forEach((p) => p.remove());
      pathsRef.current = [];
    };
  }, [strokeColor]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, background: backgroundColor, overflow: 'hidden' }}
    >
      <svg ref={svgRef} style={{ display: 'block' }} />
    </div>
  );
}

export default Waves;
