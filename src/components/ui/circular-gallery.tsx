import React, { useState, useEffect, useRef, HTMLAttributes, forwardRef } from 'react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

export interface GalleryItem {
  common: string;
  binomial: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
  href?: string;
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  radius?: number;
  autoRotateSpeed?: number;
  onItemSelect?: (index: number) => void;
}

const CircularGallery = forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, onItemSelect, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
      const autoRotate = () => {
        if (!isScrolling) setRotation((prev) => prev + autoRotateSpeed);
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };
      animationFrameRef.current = requestAnimationFrame(autoRotate);
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }, [isScrolling, autoRotateSpeed]);

    const anglePerItem = 360 / items.length;

    return (
      <div
        ref={ref}
        className={cn('relative w-full h-full flex items-center justify-center overflow-hidden', className)}
        {...props}
      >
        <div
          className="relative"
          style={{
            width: radius * 2,
            height: radius * 2,
            transform: `rotate(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.3, 1 - normalizedAngle / 180);

            return (
              <div
                key={`${item.common}-${i}`}
                className="absolute top-1/2 left-1/2"
                style={{
                  transform: `rotate(${itemAngle}deg) translate(0, -${radius}px) rotate(-${itemAngle}deg) translate(-50%, -50%)`,
                  transformOrigin: '0 0',
                }}
              >
                <button
                  type="button"
                  onClick={() => onItemSelect?.(i)}
                  style={{ opacity, transform: `rotate(${-rotation}deg)` }}
                  className="group relative block w-[180px] h-[240px] md:w-[220px] md:h-[300px] rounded-2xl overflow-hidden border border-white/15 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.6)] cursor-pointer transition-transform duration-300 hover:scale-105"
                >
                  <img
                    src={item.photo.url}
                    alt={item.photo.text}
                    loading="lazy"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: item.photo.pos ?? '50% 50%' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-left text-white">
                    <h3 className="text-base font-semibold tracking-tight truncate">{item.common}</h3>
                    <p className="text-xs text-white/70 italic truncate">{item.binomial}</p>
                    <p className="text-[10px] text-white/50 mt-1 truncate">Photo by: {item.photo.by}</p>
                  </div>
                </button>
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
