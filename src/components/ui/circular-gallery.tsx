import React, { useState, useEffect, useRef, HTMLAttributes } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ');

// Cache extracted dominant colors per image url across renders
const colorCache = new Map<string, { r: number; g: number; b: number }>();

function useDominantColor(url: string) {
  const [color, setColor] = useState<{ r: number; g: number; b: number } | null>(
    () => colorCache.get(url) ?? null
  );

  useEffect(() => {
    if (!url) return;
    const cached = colorCache.get(url);
    if (cached) {
      setColor(cached);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = 24;
        const h = 24;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Sample bottom half (where the label sits)
        ctx.drawImage(img, 0, img.height / 2, img.width, img.height / 2, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (!count) return;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // No artificial channel boosting — keep the true average so greyscale
        // images stay neutral instead of inventing a fake hue.
        const out = { r, g, b };
        colorCache.set(url, out);
        if (!cancelled) setColor(out);
      } catch {
        // CORS or other failures: leave color null
      }
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}

export interface GalleryItem {
  common: string;
  binomial: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  radius?: number;
  autoRotateSpeed?: number;
  /** External rotation driver in degrees (e.g. from a parent scroll value). When provided, window scroll is ignored. */
  externalRotation?: number;
}

interface GalleryCardProps {
  item: GalleryItem;
  isFrontFacing: boolean;
  mobileMode?: boolean;
  glowIntensity?: number;
}

const GalleryCard: React.FC<GalleryCardProps> = ({
  item,
  isFrontFacing,
  mobileMode = false,
  glowIntensity = 1,
}) => {
  const color = useDominantColor(item.photo.url);

  const openLink = () => {
    const url = item.photo.by;
    if (!url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  // Fallback to a neutral warm tone when extraction fails (CORS etc.) so every
  // card glows with the same intensity — only the hue differs.
  const r = color?.r ?? 200;
  const g = color?.g ?? 200;
  const b = color?.b ?? 200;
  const tintStrong = `rgba(${r}, ${g}, ${b}, 0.7)`;
  const tintMid = `rgba(${r}, ${g}, ${b}, 0.35)`;
  const glow = `rgba(${r}, ${g}, ${b}, 0.35)`;

  // Mobile: glow only when user is touching near the card (controlled by parent).
  // Desktop: keep the original static box-shadow halo.
  const haloOpacity = mobileMode ? Math.max(0, Math.min(1, glowIntensity)) : 0;

  return (
    <div
      className={cn('relative w-full h-full', isFrontFacing && 'cursor-pointer')}
      style={{ pointerEvents: isFrontFacing ? 'auto' : 'none' }}
      aria-hidden={!isFrontFacing}
      {...(isFrontFacing
        ? {
            role: 'link',
            tabIndex: 0,
            'aria-label': `Open ${item.common}`,
            onClick: openLink,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLink();
              }
            },
          }
        : {})}
    >
      {/* Touch-driven halo (mobile only). Sits behind the card; only the ring
          beyond the card's edge is visible because the inner card is opaque. */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-[28px]"
        style={{
          inset: -22,
          background: `radial-gradient(closest-side, rgba(${r}, ${g}, ${b}, 0.9), rgba(${r}, ${g}, ${b}, 0) 70%)`,
          filter: 'blur(18px)',
          opacity: haloOpacity,
          transition: 'opacity 140ms ease-out',
          willChange: haloOpacity > 0 ? 'opacity' : undefined,
        }}
      />
      <div
        className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black"
        style={{
          boxShadow: mobileMode
            ? '0 0 0 1px rgba(255,255,255,0.06)'
            : `0 8px 24px -10px ${glow}, 0 0 0 1px rgba(255,255,255,0.06)`,
        }}
      >
      <img
        src={item.photo.url}
        alt={item.photo.text}
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: item.photo.pos ?? '50% 50%' }}
        loading="lazy"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${tintStrong} 0%, ${tintMid} 55%, transparent 100%)`,
        }}
      />
      {/* Liquid-glass blur bubble — bottom 25%, faded out toward the top */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '25%',
          backdropFilter: 'blur(10px) saturate(140%)',
          WebkitBackdropFilter: 'blur(10px) saturate(140%)',
          background:
            'linear-gradient(to top, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0) 100%)',
          maskImage:
            'linear-gradient(to top, black 0%, black 45%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, black 45%, transparent 100%)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      />
      {/* Per-card title + subtitle, left-aligned over the bottom glass strip */}
      <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pointer-events-none text-left">
        <h3
          className="font-semibold text-white text-[11px] md:text-xs leading-tight m-0 truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
        >
          {item.common}
        </h3>
        <p
          className="italic text-white/80 text-[10px] md:text-[11px] leading-tight m-0 truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          {item.binomial}
        </p>
      </div>
      </div>
    </div>
  );
};

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, externalRotation, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const useExternal = externalRotation !== undefined;

    useEffect(() => {
      if (useExternal) return;
      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        setRotation(scrollProgress * 360);

        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }, [useExternal]);

    useEffect(() => {
      if (useExternal) return;
      const autoRotate = () => {
        if (!isScrolling) {
          setRotation((prev) => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };
      animationFrameRef.current = requestAnimationFrame(autoRotate);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }, [isScrolling, autoRotateSpeed, useExternal]);

    const effectiveRotation = useExternal ? (externalRotation as number) : rotation;
    const anglePerItem = 360 / items.length;
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    }, []);
    const cardW = isMobile ? 100 : 138;
    const cardH = isMobile ? 144 : 184;
    const effectiveRadius = isMobile ? Math.max(radius * 1.1, 374) : radius * 1.25;

    // Determine which item is most front-facing for the flat overlay label.
    let frontIndex = 0;
    let frontDelta = Infinity;
    items.forEach((_, i) => {
      const itemAngle = i * anglePerItem;
      const relativeAngle = (itemAngle + (effectiveRotation % 360) + 360) % 360;
      const normalizedAngle = Math.abs(
        relativeAngle > 180 ? 360 - relativeAngle : relativeAngle
      );
      if (normalizedAngle < frontDelta) {
        frontDelta = normalizedAngle;
        frontIndex = i;
      }
    });
    const frontItem = items[frontIndex];
    const frontStrength = Math.max(0, Math.min(1, 1 - frontDelta / 60));

    // --- Mobile touch-driven glow ---------------------------------------
    // While the user is touching the gallery, light up cards near the touch
    // point. Off entirely on desktop (which keeps its static box-shadow look).
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [glowIntensities, setGlowIntensities] = useState<number[]>(() =>
      items.map(() => 0)
    );
    const touchStateRef = useRef<{ active: boolean; x: number; y: number }>({
      active: false,
      x: 0,
      y: 0,
    });
    const glowRafRef = useRef<number | null>(null);
    const fadeOutRafRef = useRef<number | null>(null);

    useEffect(() => {
      // Reset cached refs array whenever the items count changes.
      cardRefs.current = cardRefs.current.slice(0, items.length);
    }, [items.length]);

    const stopGlowLoop = () => {
      if (glowRafRef.current != null) {
        cancelAnimationFrame(glowRafRef.current);
        glowRafRef.current = null;
      }
    };

    const startGlowLoop = () => {
      if (glowRafRef.current != null) return;
      const tick = () => {
        const t = touchStateRef.current;
        if (!t.active) {
          glowRafRef.current = null;
          return;
        }
        const next: number[] = new Array(cardRefs.current.length);
        for (let i = 0; i < cardRefs.current.length; i++) {
          const el = cardRefs.current[i];
          if (!el) {
            next[i] = 0;
            continue;
          }
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = cx - t.x;
          const dy = cy - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Falls from 1 (right on the card) to 0 over ~160px.
          const proximity = Math.max(0, Math.min(1, 1 - dist / 160));
          // Baseline glow while any touch is active (so dragging round the
          // ring lights everything up softly), boosted by proximity.
          next[i] = Math.max(0.22, proximity);
        }
        setGlowIntensities((prev) => {
          let changed = false;
          for (let i = 0; i < next.length; i++) {
            if (Math.abs((prev[i] ?? 0) - next[i]) > 0.02) {
              changed = true;
              break;
            }
          }
          return changed ? next : prev;
        });
        glowRafRef.current = requestAnimationFrame(tick);
      };
      glowRafRef.current = requestAnimationFrame(tick);
    };

    const fadeOutGlow = () => {
      if (fadeOutRafRef.current != null) cancelAnimationFrame(fadeOutRafRef.current);
      const step = () => {
        setGlowIntensities((prev) => {
          let stillOn = false;
          const next = prev.map((v) => {
            const nv = v > 0.01 ? v * 0.82 : 0;
            if (nv > 0.01) stillOn = true;
            return nv;
          });
          if (stillOn) {
            fadeOutRafRef.current = requestAnimationFrame(step);
          } else {
            fadeOutRafRef.current = null;
          }
          return next;
        });
      };
      fadeOutRafRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
      return () => {
        stopGlowLoop();
        if (fadeOutRafRef.current != null) cancelAnimationFrame(fadeOutRafRef.current);
      };
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!isMobile) return;
      const t = e.touches[0];
      if (!t) return;
      if (fadeOutRafRef.current != null) {
        cancelAnimationFrame(fadeOutRafRef.current);
        fadeOutRafRef.current = null;
      }
      touchStateRef.current = { active: true, x: t.clientX, y: t.clientY };
      startGlowLoop();
    };
    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isMobile) return;
      const t = e.touches[0];
      if (!t) return;
      touchStateRef.current.active = true;
      touchStateRef.current.x = t.clientX;
      touchStateRef.current.y = t.clientY;
    };
    const handleTouchEnd = () => {
      if (!isMobile) return;
      touchStateRef.current.active = false;
      stopGlowLoop();
      fadeOutGlow();
    };

    return (
      <div
        ref={ref}
        className={cn('relative w-full h-full flex items-center justify-center', className)}
        style={{ perspective: isMobile ? '800px' : '1200px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = effectiveRotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(
              relativeAngle > 180 ? 360 - relativeAngle : relativeAngle
            );
            const depthDim = Math.max(0.68, 1 - normalizedAngle / 420);
            const isFrontFacing = normalizedAngle < 75;

            return (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute top-1/2 left-1/2"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  transform: `rotateY(${itemAngle + effectiveRotation}deg) translateZ(${effectiveRadius}px)`,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transition: 'opacity 0.3s ease-out',
                  pointerEvents: isFrontFacing ? 'auto' : 'none',
                }}
              >
                <GalleryCard
                  item={item}
                  isFrontFacing={isFrontFacing}
                  mobileMode={isMobile}
                  glowIntensity={glowIntensities[i] ?? 0}
                />
                <div
                  className="absolute inset-0 bg-black pointer-events-none rounded-2xl"
                  style={{ opacity: 1 - depthDim }}
                  aria-hidden
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
