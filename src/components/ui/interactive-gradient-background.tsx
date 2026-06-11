'use client';

import { useEffect, useRef } from 'react';

type InteractiveGradientBackgroundProps = {
  className?: string;
  children?: React.ReactNode;
  /** 0..1.5 strength */
  intensity?: number;
  /** enable pointer interaction */
  interactive?: boolean;
  /** initial offset in px */
  initialOffset?: { x?: number; y?: number };
  /** force dark mode look */
  dark?: boolean;
};

export default function InteractiveGradientBackground({
  className = '',
  children,
  intensity = 1,
  interactive = true,
  initialOffset,
  dark = false,
}: InteractiveGradientBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;

    host.style.setProperty('--posX', String(initialOffset?.x ?? 0));
    host.style.setProperty('--posY', String(initialOffset?.y ?? 0));

    if (!interactive) return;

    const schedule = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const ev = pendingRef.current;
        if (!host || !ev) return;
        const rect = host.getBoundingClientRect();
        const px = ev.clientX - rect.left - rect.width / 2;
        const py = ev.clientY - rect.top - rect.height / 2;

        const prefersReduced =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        const k = prefersReduced ? 0.1 : intensity;

        host.style.setProperty('--posX', String(px * k));
        host.style.setProperty('--posY', String(py * k));
      });
    };

    const onPointer = (e: PointerEvent) => {
      pendingRef.current = { clientX: e.clientX, clientY: e.clientY };
      schedule();
    };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches.length) return;
      pendingRef.current = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      schedule();
    };
    const reset = () => {
      host.style.setProperty('--posX', '0');
      host.style.setProperty('--posY', '0');
    };

    host.addEventListener('pointermove', onPointer, { passive: true });
    host.addEventListener('touchmove', onTouch, { passive: true });
    host.addEventListener('pointerleave', reset);
    host.addEventListener('touchend', reset);
    host.addEventListener('touchcancel', reset);

    return () => {
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('touchmove', onTouch);
      host.removeEventListener('pointerleave', reset);
      host.removeEventListener('touchend', reset);
      host.removeEventListener('touchcancel', reset);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [interactive, intensity, initialOffset?.x, initialOffset?.y]);

  const showDark = dark;

  return (
    <div
      ref={ref}
      aria-label="Interactive gradient background"
      role="img"
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '100%',
        overflow: 'hidden',
        background: showDark ? '#05060a' : '#f5f6fa',
        // @ts-expect-error css vars
        '--posX': '0',
        '--posY': '0',
      }}
    >
      {/* Light layer */}
      {!showDark && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-20%',
            pointerEvents: 'none',
            transform:
              'translate3d(calc(var(--posX) * 1px), calc(var(--posY) * 1px), 0)',
            transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            background:
              'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), transparent 55%),' +
              'radial-gradient(circle at 70% 40%, rgba(236,72,153,0.45), transparent 55%),' +
              'radial-gradient(circle at 50% 80%, rgba(56,189,248,0.5), transparent 60%),' +
              'radial-gradient(circle at 80% 80%, rgba(250,204,21,0.35), transparent 60%)',
            filter: 'blur(60px) saturate(140%)',
          }}
        />
      )}

      {/* Dark layer */}
      {showDark && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-20%',
              pointerEvents: 'none',
              transform:
                'translate3d(calc(var(--posX) * 1px), calc(var(--posY) * 1px), 0)',
              transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
              background:
                'radial-gradient(circle at 25% 30%, rgba(139,92,246,0.55), transparent 55%),' +
                'radial-gradient(circle at 75% 35%, rgba(244,63,94,0.45), transparent 55%),' +
                'radial-gradient(circle at 50% 80%, rgba(14,165,233,0.55), transparent 60%),' +
                'radial-gradient(circle at 85% 75%, rgba(34,197,94,0.35), transparent 60%)',
              filter: 'blur(70px) saturate(160%)',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 85%, #000 100%)',
            }}
          />
        </>
      )}

      {children ? (
        <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export { InteractiveGradientBackground };
