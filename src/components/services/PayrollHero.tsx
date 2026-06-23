import { useEffect, useMemo, useRef, useState } from "react";
import { Delaunay } from "d3-delaunay";

interface PayrollHeroProps {
  pointCount?: number;
}

type Pt = { x: number; y: number; id: number };

// Deterministic PRNG so the layout is stable across renders.
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Hero scene for the "Payroll & HR tooling" service.
 * A cursor-reactive Voronoi mesh (orange/pink gradient on the hovered
 * cell + its neighbours, on a black background) — feels like a payroll
 * ledger reorganising itself in real time.
 */
export default function PayrollHero({ pointCount = 150 }: PayrollHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<number | null>(null);
  const [neighbors, setNeighbors] = useState<Set<number>>(new Set());

  // Stable point set in unit coords [0,1]
  const points = useMemo<Pt[]>(() => {
    const rng = seededRandom(0.88 * 1000);
    return Array.from({ length: pointCount }, (_, i) => ({
      x: rng(),
      y: rng(),
      id: i,
    }));
  }, [pointCount]);

  // Recompute Voronoi when size or points change
  const { polygons, scaled, delaunay } = useMemo(() => {
    const w = Math.max(1, size.w);
    const h = Math.max(1, size.h);
    const scaled = points.map((p) => [p.x * w, p.y * h] as [number, number]);
    const d = Delaunay.from(scaled);
    const v = d.voronoi([0, 0, w, h]);
    const polys = points.map((_, i) => v.cellPolygon(i));
    return { polygons: polys, scaled, delaunay: d };
  }, [points, size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handle = (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setHovered(null);
        setNeighbors(new Set());
        return;
      }
      const idx = delaunay.find(x, y);
      if (idx !== hovered) {
        const nbs = new Set<number>();
        for (const n of delaunay.neighbors(idx)) nbs.add(n);
        setNeighbors(nbs);
        setHovered(idx);
      }
    };
    const onMouse = (e: MouseEvent) => handle(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) handle(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [delaunay, hovered]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      {size.w > 0 && size.h > 0 && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          className="block h-full w-full"
        >
          <defs>
            <linearGradient id="payroll_silver_base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3a3a3d" />
              <stop offset="100%" stopColor="#0e0e10" />
            </linearGradient>
            <linearGradient id="payroll_silver_hot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5f5f7" />
              <stop offset="50%" stopColor="#c8ccd2" />
              <stop offset="100%" stopColor="#6e7278" />
            </linearGradient>
          </defs>
          <g>
            {polygons.map((poly, i) => {
              if (!poly) return null;
              const d = "M" + poly.map((p) => `${p[0]},${p[1]}`).join("L") + "Z";
              const isHovered = hovered === i;
              const isNeighbor = neighbors.has(i);
              const fill =
                isHovered || isNeighbor
                  ? "url(#payroll_silver_hot)"
                  : "url(#payroll_silver_base)";
              const opacity = isNeighbor && !isHovered ? 0.55 : 1;
              return (
                <path
                  key={`poly-${i}`}
                  d={d}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke="#000"
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
              );
            })}
            {scaled.map(([cx, cy], i) => (
              <circle
                key={`pt-${i}`}
                cx={cx}
                cy={cy}
                r={2}
                fill={i === hovered ? "#ffffff" : "#d6d6d8"}
                fillOpacity={0.85}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
