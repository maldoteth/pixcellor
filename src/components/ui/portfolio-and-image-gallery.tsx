'use client';

import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, {
  forwardRef,
  HTMLAttributes,
  ReactNode,
  Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

function useMergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return useMemo(() => {
    if (refs.every((r) => r == null)) return null;
    return (node: T) => {
      refs.forEach((ref) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref != null) {
          (ref as React.MutableRefObject<T>).current = node;
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

function useResponsiveValue(baseValue: number, mobileValue: number) {
  const [value, setValue] = useState(baseValue);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setValue(window.innerWidth < 768 ? mobileValue : baseValue);
    };
    handleResize();
    let timeoutId: ReturnType<typeof setTimeout>;
    const debounced = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };
    window.addEventListener('resize', debounced);
    return () => {
      window.removeEventListener('resize', debounced);
      clearTimeout(timeoutId);
    };
  }, [baseValue, mobileValue]);
  return value;
}

export interface RadialScrollGalleryProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children: (hoveredIndex: number | null) => ReactNode[];
  scrollDuration?: number;
  visiblePercentage?: number;
  baseRadius?: number;
  mobileRadius?: number;
  startTrigger?: string;
  onItemSelect?: (index: number) => void;
  direction?: 'ltr' | 'rtl';
  disabled?: boolean;
}

export const RadialScrollGallery = forwardRef<HTMLDivElement, RadialScrollGalleryProps>(
  (
    {
      children,
      scrollDuration = 2500,
      visiblePercentage = 45,
      baseRadius = 550,
      mobileRadius = 220,
      className = '',
      startTrigger = 'center center',
      onItemSelect,
      direction = 'ltr',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const pinRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const childRef = useRef<HTMLDivElement>(null);

    const mergedRef = useMergeRefs<HTMLDivElement>(ref, pinRef);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [childSize, setChildSize] = useState<{ w: number; h: number } | null>(null);

    const currentRadius = useResponsiveValue(baseRadius, mobileRadius);
    const circleDiameter = currentRadius * 2;

    const { visibleDecimal } = useMemo(() => {
      const clamped = Math.max(10, Math.min(100, visiblePercentage));
      return { visibleDecimal: clamped / 100 };
    }, [visiblePercentage]);

    const childrenNodes = useMemo(
      () => React.Children.toArray(children(hoveredIndex)),
      [children, hoveredIndex]
    );
    const childrenCount = childrenNodes.length;

    useEffect(() => {
      if (!childRef.current) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setChildSize({ w: entry.contentRect.width, h: entry.contentRect.height });
        }
        ScrollTrigger.refresh();
      });
      observer.observe(childRef.current);
      return () => observer.disconnect();
    }, [childrenCount]);

    useGSAP(
      () => {
        if (!pinRef.current || !containerRef.current || childrenCount === 0) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;

        gsap.fromTo(
          containerRef.current.children,
          { scale: 0, autoAlpha: 0 },
          {
            scale: 1,
            autoAlpha: 1,
            duration: 1.2,
            ease: 'back.out(1.2)',
            stagger: 0.05,
            scrollTrigger: {
              trigger: pinRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );

        gsap.to(containerRef.current, {
          rotation: 360,
          ease: 'none',
          scrollTrigger: {
            trigger: pinRef.current,
            pin: true,
            start: startTrigger,
            end: `+=${scrollDuration}`,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      },
      { scope: pinRef, dependencies: [scrollDuration, currentRadius, startTrigger, childrenCount] }
    );

    if (childrenCount === 0) return null;

    const scaleFactor = 1.25;
    const calculatedBuffer = childSize ? childSize.h * scaleFactor - childSize.h + 60 : 150;
    const visibleAreaHeight = childSize
      ? circleDiameter * visibleDecimal + childSize.h / 2 + calculatedBuffer
      : circleDiameter * visibleDecimal + 200;

    return (
      <div
        ref={mergedRef as React.Ref<HTMLDivElement>}
        className={`relative w-full overflow-hidden ${className}`}
        style={{ height: visibleAreaHeight }}
        {...rest}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 0,
            width: circleDiameter,
            height: circleDiameter,
          }}
        >
          <div
            ref={containerRef}
            className={`relative w-full h-full ${disabled ? 'grayscale pointer-events-none' : ''}`}
            style={{ transformOrigin: '50% 50%' }}
          >
            {childrenNodes.map((child, index) => {
              const angle = (index / childrenCount) * 2 * Math.PI;
              let x = currentRadius * Math.cos(angle);
              const y = currentRadius * Math.sin(angle);
              if (direction === 'rtl') x = -x;

              const rotationAngle = (angle * 180) / Math.PI;
              const isHovered = hoveredIndex === index;
              const isAnyHovered = hoveredIndex !== null;

              return (
                <div
                  key={index}
                  className="absolute top-1/2 left-1/2"
                  style={{
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${-rotationAngle}deg)`,
                  }}
                >
                  <div
                    ref={index === 0 ? childRef : undefined}
                    style={{ transform: `rotate(${rotationAngle}deg)` }}
                  >
                    <div
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      onClick={() => !disabled && onItemSelect?.(index)}
                      onKeyDown={(e) => {
                        if (disabled) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onItemSelect?.(index);
                        }
                      }}
                      onMouseEnter={() => !disabled && setHoveredIndex(index)}
                      onMouseLeave={() => !disabled && setHoveredIndex(null)}
                      onFocus={() => !disabled && setHoveredIndex(index)}
                      onBlur={() => !disabled && setHoveredIndex(null)}
                      className={`
                        block cursor-pointer outline-none text-left
                        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                        rounded-xl transition-all duration-500 ease-out will-change-transform
                        ${isHovered ? 'scale-125 -translate-y-8' : 'scale-100'}
                        ${
                          isAnyHovered && !isHovered
                            ? 'blur-[2px] opacity-40 grayscale'
                            : 'blur-0 opacity-100'
                        }
                      `}
                    >
                      {child}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

RadialScrollGallery.displayName = 'RadialScrollGallery';
