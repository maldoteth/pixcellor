import React, { useState, useEffect, useRef, HTMLAttributes } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ');

// Build responsive variant URLs for portfolio PNGs that have pre-generated
// AVIF/WebP siblings (see scripts/convert-portfolio.mjs). Returns null for
// any URL that doesn't follow the /portfolio/<name>.png pattern (e.g. thum.io).
function portfolioVariants(url: string) {
  const match = /^\/portfolio\/([^/]+)\.png$/i.exec(url);
  if (!match) return null;
  const base = `/portfolio/${match[1]}`;
  return {
    avif: `${base}-sm.avif 640w, ${base}-lg.avif 960w`,
    webp: `${base}-sm.webp 640w, ${base}-lg.webp 960w`,
  };
}

// Pick the lightweight WebP variant for warmup/color extraction so the
// 300-500KB PNG never gets fetched on devices that don't display it.
function pickWarmupUrl(url: string) {
  const v = portfolioVariants(url);
  if (!v) return url;
  const m = /^\/portfolio\/([^/]+)\.png$/i.exec(url);
  return m ? `/portfolio/${m[1]}-sm.webp` : url;
}

// Cache extracted dominant colors per image url across renders
const colorCache = new Map<string, { r: number; g: number; b: number }>();
const imageElementCache = new Map<string, HTMLImageElement>();
const imageDecodeCache = new Map<string, Promise<void>>();

function preloadGalleryImage(url: string) {
  if (!url || typeof window === 'undefined') return Promise.resolve();
  const existingPromise = imageDecodeCache.get(url);
  if (existingPromise) return existingPromise;

  const img = imageElementCache.get(url) ?? new Image();
  if (!imageElementCache.has(url)) {
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.loading = 'eager';
    img.fetchPriority = 'high';
    imageElementCache.set(url, img);
  }

  const promise = new Promise<void>((resolve) => {
    const settle = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => undefined).finally(resolve);
      } else {
        resolve();
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      settle();
      return;
    }

    img.onload = settle;
    img.onerror = () => resolve();
    if (!img.src) img.src = url;
  });

  imageDecodeCache.set(url, promise);
  if (!img.src) img.src = url;
  return promise;
}

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
    preloadGalleryImage(url).then(() => {
      const img = imageElementCache.get(url);
      if (!img || cancelled) return;
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
    });
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
  /** When false, cards stay visible but cannot receive pointer/click events. */
  interactive?: boolean;
}

interface GalleryCardProps {
  item: GalleryItem;
  interactive: boolean;
  mobileMode?: boolean;
}

const GalleryCard = React.memo(function GalleryCard({
  item,
  interactive,
  mobileMode = false,
}: GalleryCardProps) {
  // Sampling runs once per image and is cached; card memoization prevents the
  // parent ring's rotation updates from rerendering the finished card.
  const color = useDominantColor(pickWarmupUrl(item.photo.url));
  const pointerStartRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClickRef = useRef(false);

  const openLink = (e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const url = item.photo.by;
    if (!url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    pointerStartRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.sqrt(dx * dx + dy * dy) <= 14) {
      suppressClickRef.current = true;
      openLink(e);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    openLink(e);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  // Fallback to a neutral warm tone when extraction fails (CORS etc.) so every
  // card glows with the same intensity — only the hue differs.
  const r = color?.r ?? 200;
  const g = color?.g ?? 200;
  const b = color?.b ?? 200;
  const tintStrong = `rgba(${r}, ${g}, ${b}, 0.7)`;
  const tintMid = `rgba(${r}, ${g}, ${b}, 0.35)`;
  const glow = `rgba(${r}, ${g}, ${b}, 0.35)`;

  return (
    <div
      className={cn('relative w-full h-full', interactive && 'cursor-pointer')}
      style={{ pointerEvents: interactive ? 'auto' : 'none', touchAction: 'none' }}
      role="link"
      tabIndex={interactive ? 0 : -1}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openLink(e as unknown as React.MouseEvent);
      }}
    >
      <div
        className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl silver-shimmer-hover"
        style={{
          padding: '2px',
          boxShadow: mobileMode
            ? '0 0 0 1px rgba(255,255,255,0.06)'
            : `0 8px 24px -10px ${glow}, 0 0 0 1px rgba(255,255,255,0.06)`,
          isolation: 'isolate',
          contain: 'layout paint style',
        }}
      >
        <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      {(() => {
        const variants = mobileMode ? null : portfolioVariants(item.photo.url);
        const sizes = '(max-width: 768px) 320px, 480px';
        return (
          <picture>
            {variants && <source type="image/avif" srcSet={variants.avif} sizes={sizes} />}
            {variants && <source type="image/webp" srcSet={variants.webp} sizes={sizes} />}
            <img
              src={mobileMode ? pickWarmupUrl(item.photo.url) : item.photo.url}
              alt={item.photo.text}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                objectPosition: item.photo.pos ?? '0% 50%',
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              loading="eager"
              decoding="async"
              // @ts-expect-error fetchPriority is valid HTML
              fetchpriority="high"
            />
          </picture>
        );
      })()}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${tintStrong} 0%, ${tintMid} 55%, transparent 100%)`,
        }}
      />
      {/* Liquid-glass blur bubble — bottom 40%, faded out toward the top */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '40%',
          backdropFilter: mobileMode ? 'none' : 'blur(10px) saturate(140%)',
          WebkitBackdropFilter: mobileMode ? 'none' : 'blur(10px) saturate(140%)',
          background: mobileMode
            ? 'linear-gradient(to top, rgba(6,6,6,0.72), rgba(6,6,6,0.25), transparent)'
            : 'transparent',
          maskImage: mobileMode
            ? 'none'
            : 'linear-gradient(to top, black 0%, black 45%, transparent 100%)',
          WebkitMaskImage: mobileMode
            ? 'none'
            : 'linear-gradient(to top, black 0%, black 45%, transparent 100%)',
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
    </div>
  );
});

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, externalRotation, interactive = true, ...props }, ref) => {
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
    const [isMobile, setIsMobile] = useState(
      () => typeof window !== 'undefined' && window.innerWidth < 768
    );
    useEffect(() => {
      const media = window.matchMedia('(max-width: 767px)');
      const check = () => setIsMobile(media.matches);
      check();
      media.addEventListener?.('change', check);
      return () => media.removeEventListener?.('change', check);
    }, []);
    const cardW = isMobile ? 100 : 138;
    const cardH = isMobile ? 144 : 184;
    const effectiveRadius = isMobile ? Math.max(radius * 1.1, 374) : radius * 1.25;

    // Decode the exact lightweight mobile assets before the carousel arrives.
    // The module cache makes later visits reuse the same decoded images.
    useEffect(() => {
      items.forEach((it) => {
        void preloadGalleryImage(pickWarmupUrl(it.photo.url));
      });
    }, [items]);

    return (
      <div
        ref={ref}
        data-pixcellor-horizontal-swipe="true"
        className={cn('relative w-full h-full flex items-center justify-center', className)}
        style={{
          perspective: isMobile ? '800px' : '1200px',
          perspectiveOrigin: '50% 50%',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${effectiveRotation}deg) translateZ(0)`,
            WebkitTransform: `rotateY(${effectiveRotation}deg) translateZ(0)`,
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {items.map((item, i) => {
              const itemAngle = i * anglePerItem;
              let depthDim = 1;
              if (!isMobile) {
                const totalRotation = effectiveRotation % 360;
                const relativeAngle = (itemAngle + totalRotation + 360) % 360;
                const normalizedAngle = Math.abs(
                  relativeAngle > 180 ? 360 - relativeAngle : relativeAngle
                );
                depthDim = Math.max(0.68, 1 - normalizedAngle / 420);
              }

              return (
                <div
                  key={`${item.photo.url}-${item.common}`}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    width: cardW,
                    height: cardH,
                    marginLeft: -cardW / 2,
                    marginTop: -cardH / 2,
                    transform: `rotateY(${itemAngle}deg) translateZ(${effectiveRadius}px) translateZ(0)`,
                    WebkitTransform: `rotateY(${itemAngle}deg) translateZ(${effectiveRadius}px) translateZ(0)`,
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    pointerEvents: interactive ? 'auto' : 'none',
                  }}
                >
                  <GalleryCard
                    item={item}
                    interactive={interactive}
                    mobileMode={isMobile}
                  />
                  <div
                    className="absolute inset-0 bg-black pointer-events-none rounded-2xl"
                    style={{ opacity: isMobile ? 0 : 1 - depthDim }}
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
