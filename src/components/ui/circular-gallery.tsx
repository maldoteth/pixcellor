import React, { useState, useEffect, useRef, HTMLAttributes } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ');

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
    const cardW = isMobile ? 76 : 120;
    const cardH = isMobile ? 109 : 160;
    const effectiveRadius = isMobile ? Math.max(radius, 340) : radius;

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

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 pointer-events-auto"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  transform: `rotateY(${itemAngle + effectiveRotation}deg) translateZ(${effectiveRadius}px)`,
                  transformStyle: 'preserve-3d',
                  filter: `brightness(${depthDim})`,
                  transition: 'opacity 0.3s ease-out',
                }}
              >
                <div
                  className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-black cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const raw = item.photo.by ?? '';
                    if (!raw || !/\./.test(raw)) return;
                    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const raw = item.photo.by ?? '';
                      if (!raw || !/\./.test(raw)) return;
                      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  aria-label={`Open ${item.common}`}
                >
                  <img
                    src={item.photo.url}
                    alt={item.photo.text}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: item.photo.pos ?? '50% 50%' }}
                    loading="lazy"
                  />
                  {/(^|\.)bricks\./i.test(item.photo.by ?? '') && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                  )}
                  <div className="carousel-label-glass absolute inset-x-0 bottom-0 px-2 py-1 md:px-3 md:py-1.5 text-foreground">
                    <div className="relative z-[1] leading-none">
                      <h3 className="font-semibold text-xs md:text-base leading-tight drop-shadow truncate m-0">{item.common}</h3>
                      <p className="hidden md:block text-[10px] md:text-xs italic text-muted-foreground truncate drop-shadow m-0 mt-0.5">{item.binomial}</p>
                    </div>
                  </div>
                </div>
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
