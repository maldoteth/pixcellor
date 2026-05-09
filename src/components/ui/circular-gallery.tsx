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
}

const GalleryCard: React.FC<GalleryCardProps> = ({ item, isFrontFacing }) => {
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

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black',
        isFrontFacing && 'cursor-pointer'
      )}
      style={{
        pointerEvents: isFrontFacing ? 'auto' : 'none',
        boxShadow: `0 8px 24px -10px ${glow}, 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
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
    const cardW = isMobile ? 87 : 138;
    const cardH = isMobile ? 125 : 184;
    const effectiveRadius = isMobile ? Math.max(radius, 340) : radius * 1.25;

    return (
      <div
        ref={ref}
        className={cn('relative w-full h-full flex items-center justify-center', className)}
        style={{ perspective: isMobile ? '800px' : '1200px' }}
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
                <GalleryCard item={item} isFrontFacing={isFrontFacing} />
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
