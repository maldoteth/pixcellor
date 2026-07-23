"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue, animate } from "framer-motion";
import { ChevronDown, ChevronUp, X, BookOpen, ShoppingCart, Phone, Tag } from "lucide-react";

import Footer from "@/components/Footer";
import PackagesDialog from "@/components/PackagesDialog";
import { recordScrollDepth } from "@/lib/checkoutTracking";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";
import { supabase } from "@/integrations/supabase/client";

// Import hero UI images
import ui1 from '@/assets/hero/ui-1.webp';
// Served from /public so index.html can <link rel="preload"> it as the LCP image.
const pixcellorWordmarkWhite = '/pixcellor-wordmark-white.png';
import ui2 from '@/assets/hero/ui-2.webp';
import ui3 from '@/assets/hero/ui-3.webp';
import ui4 from '@/assets/hero/ui-4.webp';
import ui5 from '@/assets/hero/ui-5.webp';
import ui6 from '@/assets/hero/ui-6.webp';
import ui7 from '@/assets/hero/ui-7.webp';
import ui8 from '@/assets/hero/ui-8.webp';
import ui9 from '@/assets/hero/ui-9.webp';
import ui10 from '@/assets/hero/ui-10.webp';
import ui11 from '@/assets/hero/ui-11.webp';
import ui12 from '@/assets/hero/ui-12.webp';
import ui13 from '@/assets/hero/ui-13.webp';
import ui14 from '@/assets/hero/ui-14.webp';
import ui15 from '@/assets/hero/ui-15.webp';
import ui16 from '@/assets/hero/ui-16.webp';

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
    onViewDetails?: () => void;
    isMobile?: boolean;
    stackIndex?: number;
}

// --- FlipCard Component ---
const IMG_SIZE_DESKTOP = 70;
const IMG_SIZE_MOBILE = 74; // 5% larger on mobile

const PROXIMITY_RADIUS = 280;

function FlipCard({
    src,
    index,
    phase,
    target,
    onViewDetails,
    isMobile,
    stackIndex = 0,
}: FlipCardProps) {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const imgRef = React.useRef<HTMLImageElement>(null);
    const [proximity, setProximity] = React.useState(0); // 0..1
    const [glowColor, setGlowColor] = React.useState<string>("255, 255, 255");
    const imgSize = isMobile ? IMG_SIZE_MOBILE : IMG_SIZE_DESKTOP;

    // Sample dominant color from the image once it loads
    const handleImgLoad = React.useCallback(() => {
        const img = imgRef.current;
        if (!img) return;
        try {
            const canvas = document.createElement("canvas");
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
            // Boost saturation a touch
            const max = Math.max(r, g, b) || 1;
            const boost = 200 / max;
            r = Math.min(255, Math.round(r * boost));
            g = Math.min(255, Math.round(g * boost));
            b = Math.min(255, Math.round(b * boost));
            setGlowColor(`${r}, ${g}, ${b}`);
        } catch {
            /* CORS or other – fallback to white */
        }
    }, []);

    // Track pointer/touch proximity (desktop pointer + mobile touch)
    React.useEffect(() => {
        if (typeof window === "undefined") return;

        let raf = 0;
        const updateFromPoint = (clientX: number, clientY: number) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                const el = cardRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = clientX - cx;
                const dy = clientY - cy;
                const dist = Math.hypot(dx, dy);
                const next = Math.max(0, 1 - dist / PROXIMITY_RADIUS);
                setProximity((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
            });
        };

        const handlePointerMove = (e: PointerEvent) => updateFromPoint(e.clientX, e.clientY);
        const handleTouch = (e: TouchEvent) => {
            const t = e.touches[0] ?? e.changedTouches[0];
            if (!t) return;
            const target = e.target as Element | null;
            if (target && target.closest && target.closest('[data-hero-scroll-control="true"]')) {
                setProximity((prev) => (prev > 0.01 ? 0 : prev));
                return;
            }
            updateFromPoint(t.clientX, t.clientY);
        };
        const handleTouchEnd = () => {
            setProximity((prev) => (prev > 0.01 ? 0 : prev));
        };

        window.addEventListener("pointermove", handlePointerMove, { passive: true });
        window.addEventListener("touchstart", handleTouch, { passive: true });
        window.addEventListener("touchmove", handleTouch, { passive: true });
        window.addEventListener("touchend", handleTouchEnd, { passive: true });
        window.addEventListener("touchcancel", handleTouchEnd, { passive: true });
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("touchstart", handleTouch);
            window.removeEventListener("touchmove", handleTouch);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchEnd);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    const hoverScale = 1 + proximity * 0.22;
    const glowAlpha = 0.65 * proximity;
    const glowBlur = 18 + proximity * 28;
    const glowSpread = proximity * 8;
    const baseZIndex = 45 + stackIndex;

    return (
        <motion.div
            ref={cardRef}
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}
            style={{
                position: "absolute",
                width: imgSize,
                height: imgSize,
                zIndex: baseZIndex,
                pointerEvents: "auto",
            }}
            className="group"
        >
            <motion.div
                className="relative h-full w-full overflow-hidden rounded-none shadow-lg"
                animate={{ scale: hoverScale }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                style={{
                    backgroundColor: `hsl(${(index * 47) % 360}, 75%, 55%)`,
                    boxShadow: `0 0 ${glowBlur}px ${glowSpread}px rgba(${glowColor}, ${glowAlpha})`,
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={`hero-${index}`}
                    onLoad={handleImgLoad}
                    crossOrigin="anonymous"
                    decoding="async"
                    loading={index < 6 ? "eager" : "lazy"}
                    fetchPriority={index < 4 ? "high" : "low"}
                    className="h-full w-full object-cover"
                />
                <div
                    className="absolute inset-0 bg-black/10 transition-colors"
                    style={{ opacity: 1 - proximity }}
                />
            </motion.div>
        </motion.div>
    );
}

// Paragraph where individual letters within a soft radius around the cursor
// smoothly brighten to white, blending out with distance.
function ProximityWords({ text, className }: { text: string; className?: string }) {
    const containerRef = useRef<HTMLParagraphElement | null>(null);
    const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const words = useMemo(() => text.split(" ").map((word) => Array.from(word)), [text]);
    const letterCount = useMemo(() => words.reduce((total, word) => total + word.length, 0), [words]);
    const [intensities, setIntensities] = useState<number[]>(() => Array(letterCount).fill(0));
    const RADIUS = 220;
    const OUTSIDE_MARGIN = 260;

    useEffect(() => {
        setIntensities(Array(letterCount).fill(0));
    }, [letterCount]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        let raf = 0;
        const handleMove = (e: PointerEvent) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                const box = el.getBoundingClientRect();
                // If pointer is far outside the paragraph bounds, fade everything out
                const dx = e.clientX < box.left ? box.left - e.clientX : e.clientX > box.right ? e.clientX - box.right : 0;
                const dy = e.clientY < box.top ? box.top - e.clientY : e.clientY > box.bottom ? e.clientY - box.bottom : 0;
                if (Math.hypot(dx, dy) > OUTSIDE_MARGIN) {
                    setIntensities((prev) => prev.every((v) => v === 0) ? prev : Array(letterCount).fill(0));
                    return;
                }
                const next: number[] = [];
                for (let i = 0; i < letterCount; i++) {
                    const letter = letterRefs.current[i];
                    if (!letter) { next.push(0); continue; }
                    const r = letter.getBoundingClientRect();
                    const cx = r.left + r.width / 2;
                    const cy = r.top + r.height / 2;
                    const d = Math.hypot(e.clientX - cx, e.clientY - cy);
                    const t = Math.max(0, 1 - d / RADIUS);
                    next.push(t * t * (3 - 2 * t));
                }
                setIntensities((prev) => {
                    if (prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 0.02)) return prev;
                    return next;
                });
            });
        };
        const handleLeave = () => setIntensities(Array(letterCount).fill(0));
        window.addEventListener("pointermove", handleMove, { passive: true });
        window.addEventListener("pointerleave", handleLeave);
        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerleave", handleLeave);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [letterCount]);

    return (
        <p
            ref={containerRef}
            className={className}
            style={{ textShadow: "0 0 8px hsla(0,0%,100%,0.18), 0 0 18px hsla(0,0%,100%,0.10)" }}
        >
            {words.map((word, wordIndex) => {
                const startingIndex = words.slice(0, wordIndex).reduce((total, item) => total + item.length, 0);
                return (
                    <React.Fragment key={wordIndex}>
                        <span style={{ whiteSpace: "nowrap" }}>
                            {word.map((letter, letterIndex) => {
                                const index = startingIndex + letterIndex;
                                const t = intensities[index] ?? 0;
                                return (
                                    <span
                                        key={`${wordIndex}-${letterIndex}`}
                                        ref={(node) => { letterRefs.current[index] = node; }}
                                        style={{
                                            color: t > 0 ? `hsl(0 0% 100% / ${0.55 + 0.45 * t})` : undefined,
                                            textShadow: t > 0
                                                ? `0 0 ${6 + 14 * t}px hsla(0,0%,100%,${0.25 * t}), 0 0 ${12 + 22 * t}px hsla(0,0%,100%,${0.18 * t})`
                                                : undefined,
                                            transition: "color 120ms linear, text-shadow 120ms linear",
                                        }}
                                    >
                                        {letter}
                                    </span>
                                );
                            })}
                        </span>
                        {wordIndex < words.length - 1 ? " " : ""}
                    </React.Fragment>
                );
            })}
        </p>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const HERO_MORPH_END = 600;
const CAROUSEL_SCROLL_END = HERO_MORPH_END + 8000;
const MAX_SCROLL = CAROUSEL_SCROLL_END;
const SCROLL_BREAK_DURATION = 650;
const MOBILE_SCROLL_BOOST = 24;
const TABLET_SCROLL_BOOST = 12;
const DESKTOP_TOUCH_BOOST = 12; // matches tablet feel for ≥1024px touch screens
const CAROUSEL_SCROLL_SENSITIVITY = 0.9;
const CAROUSEL_HINT_ROTATION_DEGREES = 90;

// UI Template Images ordered around the colour wheel (red → orange → yellow →
// green → blue → purple → magenta → back to red) so the rotating circle
// reads as a continuous rainbow spectrum. 16 unique + 4 repeated to fill 20 slots.
const IMAGES = [
    ui16, ui3, ui4, ui5, ui6, ui7, ui8, ui1, ui9, ui10,
    ui13, ui11, ui12, ui14, ui15, ui2, ui16, ui3, ui4, ui5
];

interface IntroAnimationProps {
    onVirtualScrollChange?: (value: number) => void;
    overlayOpen?: boolean;
}

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export default function IntroAnimation({ onVirtualScrollChange, overlayOpen }: IntroAnimationProps) {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const introPhaseRef = useRef<AnimationPhase>("scatter");
    const introTimersRef = useRef<number[]>([]);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const onVirtualScrollChangeRef = useRef(onVirtualScrollChange);

    useEffect(() => {
        onVirtualScrollChangeRef.current = onVirtualScrollChange;
    }, [onVirtualScrollChange]);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (const entry of entries) {
                setContainerSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        };

        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        if (typeof ResizeObserver === "undefined") {
            const handleWindowResize = () => {
                if (!containerRef.current) return;
                setContainerSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            };
            window.addEventListener("resize", handleWindowResize);
            return () => window.removeEventListener("resize", handleWindowResize);
        }

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0);
    const scrollBreakUntilRef = useRef(0);
    const touchNeedsReleaseRef = useRef(false);
    const arrowActivationRef = useRef(0);
    const hintScrollControlsRef = useRef<{ stop: () => void } | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const forceCirclePhase = () => {
            if (introPhaseRef.current === "circle") return;
            introPhaseRef.current = "circle";
            setIntroPhase("circle");
            window.dispatchEvent(new CustomEvent("pixcellor:hero-circle"));
            introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
            introTimersRef.current = [];
        };

        const applyVirtualScrollDelta = (delta: number, source: "wheel" | "touch") => {
            hintScrollControlsRef.current?.stop();
            hintScrollControlsRef.current = null;

            const currentScroll = scrollRef.current;
            const now = performance.now();

            if (delta > 0) {
                if (source === "touch" && touchNeedsReleaseRef.current) return;
                if (currentScroll >= HERO_MORPH_END && currentScroll <= HERO_MORPH_END + 1 && now < scrollBreakUntilRef.current) return;
                if (currentScroll < HERO_MORPH_END && currentScroll + delta > HERO_MORPH_END) {
                    scrollRef.current = HERO_MORPH_END;
                    virtualScroll.set(HERO_MORPH_END);
                    onVirtualScrollChangeRef.current?.(HERO_MORPH_END);
                    recordScrollDepth((HERO_MORPH_END / MAX_SCROLL) * 100);
                    scrollBreakUntilRef.current = now + SCROLL_BREAK_DURATION;
                    if (source === "touch") touchNeedsReleaseRef.current = true;
                    return;
                }
            } else {
                scrollBreakUntilRef.current = 0;
                touchNeedsReleaseRef.current = false;
            }

            const newScroll = Math.min(Math.max(currentScroll + delta, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
            onVirtualScrollChangeRef.current?.(newScroll);
            recordScrollDepth((newScroll / MAX_SCROLL) * 100);
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            forceCirclePhase();

            const w = window.innerWidth;
            const boost = w < 768 ? MOBILE_SCROLL_BOOST : w < 1024 ? TABLET_SCROLL_BOOST : 1;
            const carouselMult = scrollRef.current >= HERO_MORPH_END ? CAROUSEL_SCROLL_SENSITIVITY : 1;
            const scrollDelta = e.deltaY * boost * carouselMult;
            applyVirtualScrollDelta(scrollDelta, "wheel");
        };

        let touchStartY = 0;
        let touchStartX = 0;
        let gestureAxis: "none" | "vertical" | "horizontal" = "none";
        const getEventElement = (target: EventTarget | null) => {
            if (target instanceof Element) return target;
            if (target instanceof Node) return target.parentElement;
            return null;
        };
        const isInteractive = (target: EventTarget | null) => {
            const el = getEventElement(target);
            const interactiveEl = el?.closest('button, a, [role="button"], input, textarea, select');
            return !!interactiveEl && !interactiveEl.closest('[data-hero-scroll-control="true"]');
        };
        const isInsideOverlay = (event: TouchEvent) => {
            const path = typeof event.composedPath === "function" ? event.composedPath() : [event.target];
            return path.some((node) => {
                if (!(node instanceof Element)) return false;
                return !!node.closest('[data-pixcellor-mobile-drawer="true"], [role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper], [data-radix-dialog-content], [data-radix-dialog-overlay], .stf__parent');
            });
        };
        const isInsideHorizontalSwipeZone = (target: EventTarget | null) => {
            const el = getEventElement(target);
            return !!el?.closest('.stf__parent, [data-pixcellor-horizontal-swipe="true"]');
        };
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            gestureAxis = "none";
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (isInsideOverlay(e)) return;

            const touchY = e.touches[0].clientY;
            const touchX = e.touches[0].clientX;
            const deltaY = touchStartY - touchY;
            const deltaX = touchX - touchStartX;
            const absX = Math.abs(touchX - touchStartX);
            const absY = Math.abs(touchY - touchStartY);

            // For taps on buttons/links, allow short movement to register as a tap.
            // Once vertical movement exceeds threshold, take over as a scroll gesture
            // so users can swipe through (e.g. over footer buttons) without dead zones.
            if (isInteractive(e.target) && absY < 12) return;

            if (gestureAxis === "none") {
                if (absX < 6 && absY < 6) return;
                if (absX > absY) {
                    // Horizontal swipe inside flipbook → let it handle natively
                    if (isInsideHorizontalSwipeZone(e.target)) {
                        gestureAxis = "horizontal";
                    } else {
                        // Otherwise (e.g. on the carousel) treat as scroll input
                        gestureAxis = "vertical";
                    }
                } else {
                    gestureAxis = "vertical";
                }
            }

            if (gestureAxis === "horizontal") {
                // Let the flipbook handle horizontal swipes natively
                return;
            }

            e.preventDefault();
            forceCirclePhase();
            touchStartY = touchY;
            touchStartX = touchX;

            // Once the gesture is locked to vertical, only use deltaY. On iOS Safari
            // finger jitter can briefly make |deltaX| > |deltaY| with the opposite
            // sign, which would otherwise lurch virtualScroll back and forth and make
            // the carousel spin erratically until the spring catches up.
            const inCarousel = scrollRef.current >= HERO_MORPH_END;
            const gestureDelta = gestureAxis === "vertical" ? deltaY : deltaX;

            const w = window.innerWidth;
            const boost = w < 768 ? MOBILE_SCROLL_BOOST : w < 1024 ? TABLET_SCROLL_BOOST : DESKTOP_TOUCH_BOOST;
            const carouselMult = inCarousel ? CAROUSEL_SCROLL_SENSITIVITY : 1;
            const scrollDelta = gestureDelta * boost * carouselMult;
            applyVirtualScrollDelta(scrollDelta, "touch");
        };
        const handleTouchEnd = () => {
            touchNeedsReleaseRef.current = false;
        };

        // Lock native scroll/zoom on the hero so the browser doesn't waste the
        // first swipe deciding between native scroll and our handler.
        const previousTouchAction = container.style.touchAction;
        container.style.touchAction = "none";

        const touchTarget = container;

        const touchListenerOptions: AddEventListenerOptions = { passive: false, capture: true };

        container.addEventListener("wheel", handleWheel, { passive: false });
        // Non-passive touchstart commits the gesture to JS immediately, so the
        // first swipe registers instead of being eaten by the scroll heuristic.
        touchTarget.addEventListener("touchstart", handleTouchStart, touchListenerOptions);
        touchTarget.addEventListener("touchmove", handleTouchMove, touchListenerOptions);
        touchTarget.addEventListener("touchend", handleTouchEnd, touchListenerOptions);
        touchTarget.addEventListener("touchcancel", handleTouchEnd, touchListenerOptions);

        // Keyboard navigation: arrows / PageUp-Down / Space / Home / End drive
        // the same virtual scroll as wheel + touch, so users can navigate the
        // whole page from the keyboard.
        const handleKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement as HTMLElement | null;
            if (active) {
                const tag = active.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) return;
            }
            // Don't fight the browser when a modifier is held (e.g. Cmd+ArrowDown).
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const ARROW_STEP = 220;
            const PAGE_STEP = 900;
            let delta = 0;
            switch (e.key) {
                case "ArrowDown":
                case "ArrowRight":
                    delta = ARROW_STEP; break;
                case "ArrowUp":
                case "ArrowLeft":
                    delta = -ARROW_STEP; break;
                case "PageDown":
                    delta = PAGE_STEP; break;
                case "PageUp":
                    delta = -PAGE_STEP; break;
                case " ":
                case "Spacebar":
                    delta = e.shiftKey ? -PAGE_STEP : PAGE_STEP; break;
                case "Home":
                    e.preventDefault();
                    forceCirclePhase();
                    applyVirtualScrollDelta(-MAX_SCROLL, "wheel");
                    return;
                case "End":
                    e.preventDefault();
                    forceCirclePhase();
                    applyVirtualScrollDelta(MAX_SCROLL, "wheel");
                    return;
                default:
                    return;
            }
            e.preventDefault();
            forceCirclePhase();
            applyVirtualScrollDelta(delta, "wheel");
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            container.removeEventListener("wheel", handleWheel);
            touchTarget.removeEventListener("touchstart", handleTouchStart, touchListenerOptions);
            touchTarget.removeEventListener("touchmove", handleTouchMove, touchListenerOptions);
            touchTarget.removeEventListener("touchend", handleTouchEnd, touchListenerOptions);
            touchTarget.removeEventListener("touchcancel", handleTouchEnd, touchListenerOptions);
            window.removeEventListener("keydown", handleKeyDown);
            container.style.touchAction = previousTouchAction;
        };
    }, [virtualScroll]);

    const morphProgress = useTransform(virtualScroll, [0, 600], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    const scrollRotate = useTransform(virtualScroll, [600, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;

            const normalizedX = (relativeX / rect.width) * 2 - 1;
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const setPhase = (phase: AnimationPhase) => {
            introPhaseRef.current = phase;
            setIntroPhase(phase);
            if (phase === "circle") {
                window.dispatchEvent(new CustomEvent("pixcellor:hero-circle"));
            }
        };
        const timer1 = window.setTimeout(() => setPhase("line"), 500);
        const timer2 = window.setTimeout(() => setPhase("circle"), 2500);
        introTimersRef.current = [timer1, timer2];
        return () => {
            introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
            introTimersRef.current = [];
        };
    }, []);

    // --- Random Scatter Positions ---
    const scatterPositions = useMemo(() => {
        return IMAGES.map(() => ({
            x: (Math.random() - 0.5) * 1500,
            y: (Math.random() - 0.5) * 1000,
            rotation: (Math.random() - 0.5) * 180,
            scale: 0.6,
            opacity: 0,
        }));
    }, []);

    // --- Render Loop ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // Dispatch a hero-visible event so the floating top buttons (AI, Chat, Login)
    // can fade/blur out when the user scrolls past the hero, matching their entry.
    const heroVisibleRef = useRef<boolean | null>(null);
    useEffect(() => {
        const visible = morphValue < 0.3;
        if (heroVisibleRef.current === visible) return;
        heroVisibleRef.current = visible;
        window.dispatchEvent(new CustomEvent("pixcellor:hero-visible", { detail: { visible } }));
    }, [morphValue]);

    // --- Content Opacity ---
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    // Preserve the depth-focus treatment: as the portfolio carousel becomes
    // foreground, the original site-card animation eases gently out of focus.
    const backgroundDefocusFilter = useTransform(
        contentOpacity,
        [0, 1],
        ["blur(0px)", "blur(2px)"]
    );
    const backgroundShadeOpacity = useTransform(contentOpacity, [0, 1], [0, 0.1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);
    const contentBlur = useTransform(smoothMorph, [0.8, 1], ["blur(10px)", "blur(0px)"]);
    // Hero intro elements: opacity tracks the morph spring directly so scroll-up
    // reveals them instantly (matching the circle/cards behavior) instead of
    // running a separate 1s tween via animate={}.
    // A separate fade-in multiplier handles the initial intro entrance once the
    // circle phase begins (0 → 1 over ~700ms), then scroll controls the rest.
    const introFadeIn = useMotionValue(0);
    useEffect(() => {
        if (introPhase !== "circle") return;
        const controls = animate(introFadeIn, 1, { duration: 0.7, ease: "easeOut" });
        return () => controls.stop();
    }, [introPhase, introFadeIn]);
    const morphFade = useTransform(smoothMorph, [0, 0.5], [1, 0]);
    const morphFadeFast = useTransform(smoothMorph, [0, 0.3], [1, 0]);
    const titleOpacity = useTransform([introFadeIn, morphFade], ([f, m]: number[]) => f * m);
    const subtitleOpacity = useTransform([introFadeIn, morphFade], ([f, m]: number[]) => f * m * 0.8);
    const ctaFadeIn = useMotionValue(0);
    useEffect(() => {
        const controls = animate(ctaFadeIn, 1, { duration: 0.7, ease: "easeOut" });
        return () => controls.stop();
    }, [ctaFadeIn]);
    const ctaOpacity = useTransform([ctaFadeIn, morphFadeFast], ([f, m]: number[]) => f * m * 0.95);
    const arrowOpacity = useTransform([introFadeIn, morphFadeFast], ([f, m]: number[]) => f * m * 0.9);
    // Footer fades in/out smoothly with the morph progress (matches other hero elements)
    const footerRevealProgress = useTransform(smoothMorph, [0.5, 1], [0, 1]);
    const [footerInteractive, setFooterInteractive] = useState(false);
    useEffect(() => {
        const unsub = footerRevealProgress.on("change", (v) => setFooterInteractive(v > 0.5));
        return () => unsub();
    }, [footerRevealProgress]);

    // Background glow morph: wide horizontal → narrow vertical as portfolio loads
    const isMobileViewport = containerSize.width > 0 && containerSize.width < 768;
    const isTabletViewport = containerSize.width >= 768 && containerSize.width < 1024;
    const isSmallViewport = isMobileViewport || isTabletViewport;
    const glowW = useTransform(
        virtualScroll,
        [0, 400, 800],
        isSmallViewport ? [130, 110, 90] : [60, 45, 30]
    );
    const glowH = useTransform(virtualScroll, [0, 400, 800], [50, 60, 75]);
    const smoothGlowW = useSpring(glowW, { stiffness: 60, damping: 22 });
    const smoothGlowH = useSpring(glowH, { stiffness: 60, damping: 22 });
    const glowFadeStop = isSmallViewport ? 95 : 70;
    const glowBaseAlpha = isSmallViewport ? 0.13 : 0.16;
    // Desktop: fade glow ~20% softer as second page loads
    const glowAlphaScale = useTransform(virtualScroll, [0, 400, 800], isSmallViewport ? [1, 1, 1] : [1, 0.9, 0.8]);
    const smoothGlowAlphaScale = useSpring(glowAlphaScale, { stiffness: 60, damping: 22 });
    const glowBg = useTransform(
        [smoothGlowW, smoothGlowH, smoothGlowAlphaScale, introFadeIn],
        ([w, h, a, fadeIn]: number[]) => {
            const center = glowBaseAlpha * a * fadeIn;
            // Narrower ellipse + smooth multi-stop fade so it reads as a soft gradient, not a bubble.
            const scaledW = w * 0.357;
            const scaledH = h * 0.51;
            return `radial-gradient(ellipse ${scaledW}% ${scaledH}% at 50% 50%, hsla(0,0%,100%,${center}) 0%, hsla(0,0%,100%,${center * 0.75}) 25%, hsla(0,0%,100%,${center * 0.4}) 55%, hsla(0,0%,100%,${center * 0.15}) 80%, transparent 100%)`;
        }
    );





    // Portfolio gallery items pulled from DB; rotation driven by hero virtual scroll
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

    const advanceHeroFromArrow = () => {
        const now = performance.now();
        if (now - arrowActivationRef.current < 250) return;
        arrowActivationRef.current = now;
        const start = scrollRef.current;
        const end = Math.min(Math.max(start + 1500, 1500), MAX_SCROLL);
        const duration = 1200;
        const t0 = performance.now();
        const step = (frameNow: number) => {
            const t = Math.min((frameNow - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = start + (end - start) * eased;
            scrollRef.current = v;
            virtualScroll.set(v);
            onVirtualScrollChangeRef.current?.(v);
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const reverseHeroFromArrow = () => {
        const now = performance.now();
        if (now - arrowActivationRef.current < 250) return;
        arrowActivationRef.current = now;
        const start = scrollRef.current;
        const end = 0;
        const duration = 1200;
        const t0 = performance.now();
        const step = (frameNow: number) => {
            const t = Math.min((frameNow - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const v = start + (end - start) * eased;
            scrollRef.current = v;
            virtualScroll.set(v);
            onVirtualScrollChangeRef.current?.(v);
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    useEffect(() => {
        let disposed = false;
        let loadStarted = false;
        let idleId: number | undefined;
        let timeoutId: number | undefined;

        const loadPortfolio = async () => {
            if (disposed || loadStarted) return;
            loadStarted = true;
            const { data } = await supabase
                .from("portfolio_projects")
                .select("name,url,category,description,image_url")
                .order("display_order", { ascending: true });
            if (!data || disposed) return;
            setGalleryItems(
                data.map((p: { name: string; url: string; category: string | null; description: string | null; image_url: string | null }) => ({
                    common: p.name,
                    binomial: p.category ?? "",
                    photo: {
                        url: p.image_url ?? `https://image.thum.io/get/width/900/crop/1200/https://${p.url}`,
                        text: p.description ?? p.name,
                        pos: "50% 0%",
                        by: p.url,
                    },
                }))
            );
        };

        const startWhenNeeded = virtualScroll.on("change", (value) => {
            if (value > HERO_MORPH_END * 0.4) void loadPortfolio();
        });
        const idleWindow = window as typeof window & {
            requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        if (idleWindow.requestIdleCallback) {
            idleId = idleWindow.requestIdleCallback(() => void loadPortfolio(), { timeout: 1800 });
        } else {
            timeoutId = window.setTimeout(() => void loadPortfolio(), 900);
        }

        return () => {
            disposed = true;
            startWhenNeeded();
            if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };
    }, [virtualScroll]);
    const galleryRotation = useTransform(virtualScroll, [HERO_MORPH_END, CAROUSEL_SCROLL_END], isSmallViewport ? [0, 360] : [0, 720]);
    const smoothGalleryRotation = useSpring(galleryRotation, { stiffness: 40, damping: 20 });
    const [galleryRotationValue, setGalleryRotationValue] = useState(0);
    const [portfolioInteractive, setPortfolioInteractive] = useState(false);
    const hintPlayedRef = useRef(false);
    useEffect(() => {
        const unsub = smoothGalleryRotation.on("change", setGalleryRotationValue);
        return () => unsub();
    }, [smoothGalleryRotation]);
    useEffect(() => {
        const unsub = virtualScroll.on("change", (value) => {
            setPortfolioInteractive(value > HERO_MORPH_END + 120);
        });
        return () => unsub();
    }, [virtualScroll]);
    // One-time rotation hint is real scroll progress, not a visual-only offset.
    // Skipped on iOS because the animation conflicts with in-progress touch
    // gestures on iOS Safari and causes runaway spinning.
    useEffect(() => {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isIOS = /iPad|iPhone|iPod/.test(ua) ||
            (ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document);
        if (isIOS) return;

        const playHint = (value: number) => {
            if (value < 0.8 || hintPlayedRef.current) return;
            hintPlayedRef.current = true;
            const rotationRange = isSmallViewport ? 360 : 720;
            const hintScrollOffset = ((CAROUSEL_SCROLL_END - HERO_MORPH_END) * CAROUSEL_HINT_ROTATION_DEGREES) / rotationRange;
            const start = Math.max(scrollRef.current, HERO_MORPH_END);
            const end = Math.min(start + hintScrollOffset, MAX_SCROLL);

            hintScrollControlsRef.current?.stop();
            hintScrollControlsRef.current = animate(start, end, {
                duration: 3.8,
                ease: [0.16, 1, 0.3, 1],
                onUpdate: (v) => {
                    scrollRef.current = v;
                    virtualScroll.set(v);
                    onVirtualScrollChangeRef.current?.(v);
                },
                onComplete: () => {
                    hintScrollControlsRef.current = null;
                },
            });
        };
        playHint(smoothMorph.get());
        const unsub = smoothMorph.on("change", playHint);
        return () => {
            hintScrollControlsRef.current?.stop();
            hintScrollControlsRef.current = null;
            unsub();
        };
    }, [isSmallViewport, smoothMorph, virtualScroll]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
            {/* Subtle center stage light — smoothly morphs from wide horizontal to narrow vertical */}
            <motion.div className="absolute inset-0 pointer-events-none z-0" style={{ background: glowBg }} />

            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                <motion.button
                    type="button"
                    data-hero-scroll-control="true"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        advanceHeroFromArrow();
                    }}
                    aria-label="Scroll down"
                    className={`absolute left-1/2 top-[calc(50%+6.8rem)] z-[120] hidden h-12 w-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation border-0 bg-transparent pointer-events-auto md:block ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                    style={{ opacity: arrowOpacity }}
                />

                {/* Intro Text (Fades out) */}
                <div className={`absolute z-[150] flex flex-col items-center justify-center text-center pointer-events-none top-[230px] md:top-1/2 md:translate-y-[calc(-50%+20px)] lg:translate-y-[calc(-50%+20px)] ${overlayOpen ? "!opacity-0" : ""}`}>
                    <motion.h1
                        initial={{ y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" ? { y: 0, filter: "blur(0px)" } : { filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        style={{ opacity: titleOpacity }}
                        className="text-2xl md:text-[4.8rem] lg:text-6xl font-medium tracking-tight text-foreground md:mt-[20px] lg:mt-[10px]"
                    >
                        <img src={pixcellorWordmarkWhite} alt="Pixcellor™" width={1200} height={628} fetchPriority="high" decoding="async" className="h-[4.36rem] md:h-[6.804rem] lg:h-[7rem] w-auto md:mt-[2.5px] lg:mt-[8px]" />
                    </motion.h1>
                    <motion.p
                        style={{ opacity: subtitleOpacity }}
                        className="-mt-2 text-[0.825rem] md:text-sm lg:text-base font-normal tracking-[0.2em] text-foreground/90"
                    >
                        Digital Services
                    </motion.p>
                    {/* Mobile-only arrow inside circle, below subtitle */}
                    <motion.button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            advanceHeroFromArrow();
                        }}
                        aria-label="Scroll down"
                        data-hero-scroll-control="true"
                        className={`md:hidden relative z-[110] mt-1 h-10 w-10 pointer-events-auto cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center touch-manipulation ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                        style={{ opacity: arrowOpacity, filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
                    >
                        <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ChevronDown className="w-[1.375rem] h-[1.375rem] md:w-5 md:h-5" strokeWidth={2.25} />
                        </motion.div>
                    </motion.button>
                    <motion.button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            advanceHeroFromArrow();
                        }}
                        aria-label="Scroll down"
                        data-hero-scroll-control="true"
                        className={`hidden md:flex relative z-[200] mt-3 md:mt-7 md:-translate-y-[20px] -mx-12 px-12 py-6 pointer-events-auto cursor-pointer text-foreground/80 hover:text-white transition-[color,filter] duration-200 items-center justify-center touch-manipulation [filter:drop-shadow(0_0_6px_hsla(0,0%,100%,0.7))_drop-shadow(0_0_12px_hsla(0,0%,100%,0.4))] hover:[filter:drop-shadow(0_0_4px_hsla(0,0%,100%,1))_drop-shadow(0_0_12px_hsla(0,0%,100%,1))_drop-shadow(0_0_24px_hsla(0,0%,100%,0.95))_drop-shadow(0_0_44px_hsla(0,0%,100%,0.8))_drop-shadow(0_0_72px_hsla(0,0%,100%,0.55))] ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                        style={{ opacity: arrowOpacity }}
                    >
                        <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ChevronDown className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
                        </motion.div>
                    </motion.button>
                </div>

                {/* Hero CTA buttons anchored at bottom of hero viewport */}
                <div
                    className={`absolute left-1/2 -translate-x-1/2 z-[10500] pointer-events-auto bottom-[34px] md:bottom-[23px] w-full md:w-auto px-[1.5rem] md:px-0 ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                >
                    {/* Mobile: stacked */}
                    <div className="md:hidden flex flex-col items-stretch gap-2 w-full">
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } })); }}
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md"
                        >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Services
                        </motion.button>
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages")); }}
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md"
                        >
                            <Tag className="w-3.5 h-3.5" />
                            Pricing
                        </motion.button>
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk")); }}
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center gap-1.5 text-xs font-semibold rounded-md"
                        >
                            <Phone className="w-3.5 h-3.5" />
                            Let's Talk
                        </motion.button>
                    </div>
                    {/* Desktop: row */}
                    <div className="hidden md:flex justify-center items-center gap-3">
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages")); }}
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center gap-2 text-sm font-semibold rounded-md"
                        >
                            <Tag className="w-4 h-4" />
                            Pricing
                        </motion.button>
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } })); }}
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center gap-2 text-sm font-semibold rounded-md"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            Services
                        </motion.button>
                        <motion.button
                            style={{ opacity: ctaOpacity }}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk")); }}
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center gap-2 text-sm font-semibold rounded-md"
                        >
                            <Phone className="w-4 h-4" />
                            Call Back
                        </motion.button>
                    </div>
                </div>

                {/* Mobile-only scroll arrow — bottom of screen, aligned with chat button */}
                <button
                    type="button"
                    data-hero-scroll-control="true"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const start = scrollRef.current;
                        const end = Math.min(Math.max(start + 1500, 1500), MAX_SCROLL);
                        console.log("[arrow-mobile] click", { start, end });
                        const duration = 1200;
                        const t0 = performance.now();
                        const step = (now: number) => {
                            const t = Math.min((now - t0) / duration, 1);
                            const eased = 1 - Math.pow(1 - t, 3);
                            const v = start + (end - start) * eased;
                            scrollRef.current = v;
                            virtualScroll.set(v);
                            onVirtualScrollChangeRef.current?.(v);
                            if (t < 1) requestAnimationFrame(step);
                        };
                        requestAnimationFrame(step);
                    }}
                    aria-label="Scroll down"
                    className="hidden fixed left-1/2 -translate-x-1/2 cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center"
                    style={{
                        bottom: "16px",
                        height: "64px",
                        width: "120px",
                        zIndex: 9999,
                        opacity: introPhase === "circle" && morphValue < 0.3 ? 0.9 - morphValue * 3 : 0.25,
                        pointerEvents: "auto",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                        background: "transparent",
                        border: "none",
                        filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))",
                    }}
                >
                    <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        style={{ pointerEvents: "none" }}
                    >
                        <ChevronDown className="w-5 h-5" strokeWidth={2.25} />
                    </motion.div>
                </button>

                {/* Arc Active Content (Fades in) */}
                <motion.div
                    style={{ opacity: contentOpacity, filter: contentBlur }}
                    className="absolute top-[5%] z-10 flex flex-col items-center justify-center text-center pointer-events-auto px-4"
                >
                    <h2 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight mb-4">
                        Portfolio
                    </h2>
                    <ProximityWords
                        text="AI-powered business solutions from a team that's driven $500M+ in market cap across multiple 7-figure launches."
                        className="text-[17.2px] md:text-[19.4px] lg:text-[19.2px] text-muted-foreground max-w-lg md:max-w-3xl lg:max-w-2xl leading-relaxed mb-8"
                    />
                </motion.div>

                {/* Circular Portfolio Gallery — stays mounted so images remain cached while scrolling */}
                {galleryItems.length > 0 && (
                    <motion.div
                        style={{ opacity: contentOpacity, filter: contentBlur, pointerEvents: portfolioInteractive ? "auto" : "none" }}
                        className="absolute inset-x-0 top-[calc(31%+11.9px)] md:top-[32%] bottom-[calc(15%+47.1px)] md:bottom-[18%] z-[100] md:scale-[0.85] origin-center"
                    >
                        <CircularGallery
                            items={galleryItems}
                            // Scale radius with item count so cards stay nicely spaced as the portfolio grows.
                            // Baseline tuned for 16 items; add ~14px per extra item on desktop, ~9px on mobile.
                            radius={
                                containerSize.width < 768
                                    ? 270 + Math.max(0, galleryItems.length - 12) * 11
                                    : 360 + Math.max(0, galleryItems.length - 12) * 13
                            }
                            externalRotation={galleryRotationValue}
                            interactive={portfolioInteractive}
                        />
                    </motion.div>
                )}

                {/* Main Container */}
                <motion.div
                    data-hero-background-layer="true"
                    style={{ filter: backgroundDefocusFilter }}
                    className="relative flex items-start md:items-center justify-center w-full h-full pt-[240px] md:pt-0"
                >
                    {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        let stackIndex = 0;

                        if (introPhase === "scatter") {
                            target = scatterPositions[i];
                        } else if (introPhase === "line") {
                            const lineSpacing = 70;
                            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
                            const lineX = i * lineSpacing - lineTotalWidth / 2;
                            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        } else {
                            const isMobile = containerSize.width < 768;
                            const minDimension = Math.min(containerSize.width, containerSize.height);

                            const circleRadius = isMobile ? Math.min(minDimension * 0.35, 350) : Math.min(minDimension * 0.26775, 267.75);

                            const circleAngle = (i / TOTAL_IMAGES) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                // Mobile: nudge tangent rotation the other way so corners tuck in.
                                rotation: circleAngle + 90 + (isMobile ? 8 : 0),
                            };
                            // Layer by visual depth instead of DOM order so the lower/front cards sit
                            // consistently above their neighbours, avoiding a visible seam at 6 o'clock.
                            stackIndex = Math.round((Math.sin(circleRad) + 1) * 20);

                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);

                            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
                            const arcCenterY = arcApexY + arcRadius;

                            const spreadAngle = isMobile ? 100 : 130;
                            const startAngle = -90 - (spreadAngle / 2);
                            const step = spreadAngle / (TOTAL_IMAGES - 1);

                            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);

                            const maxRotation = spreadAngle * 0.8;
                            const boundedRotation = -scrollProgress * maxRotation;

                            const currentArcAngle = startAngle + (i * step) + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;

                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.33 : 1.8,
                            };

                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: 1,
                            };
                        }

                        return (
                            <FlipCard
                                key={i}
                                src={src}
                                index={i}
                                total={TOTAL_IMAGES}
                                phase={introPhase}
                                target={target}
                                onViewDetails={advanceHeroFromArrow}
                                isMobile={containerSize.width < 768}
                                stackIndex={stackIndex}
                            />
                        );
                    })}
                    <motion.div
                        data-hero-depth-shade="true"
                        aria-hidden="true"
                        className="absolute inset-0 z-[90] bg-black pointer-events-none"
                        style={{ opacity: backgroundShadeOpacity }}
                    />
                </motion.div>
            </div>

            {/* Footer: anchored to bottom on every viewport, above carousel/cards */}
            <motion.div
                style={{
                    opacity: footerRevealProgress,
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    backgroundColor: 'hsl(var(--background) / 0.35)',
                }}
                className={`absolute bottom-0 left-0 right-0 z-40 ${footerInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
            >
                <Footer />
            </motion.div>

            {/* Up arrow above the footer — mirror of the hero down arrow */}
            <motion.div
                style={{
                    opacity: footerRevealProgress,
                    bottom: "calc(env(safe-area-inset-bottom, 0px) + 3.25rem)",
                }}
                className={`absolute left-1/2 -translate-x-1/2 z-[130] pointer-events-none ${overlayOpen ? "!opacity-0" : ""}`}
            >
                {/* Mobile arrow */}
                <motion.button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        reverseHeroFromArrow();
                    }}
                    aria-label="Scroll up"
                    data-hero-scroll-control="true"
                    className={`md:hidden relative z-[140] -mx-10 px-10 py-6 cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center touch-manipulation ${footerInteractive ? "pointer-events-auto" : "pointer-events-none"} ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                    style={{ filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
                >
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <ChevronUp className="w-5 h-5" strokeWidth={2.25} />
                    </motion.div>
                </motion.button>
                {/* Desktop/tablet arrow */}
                <motion.button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        reverseHeroFromArrow();
                    }}
                    aria-label="Scroll up"
                    data-hero-scroll-control="true"
                    className={`hidden md:flex relative z-[140] -mx-12 px-12 py-6 translate-y-[24.3px] cursor-pointer text-foreground/80 hover:text-foreground transition-colors items-center justify-center touch-manipulation ${footerInteractive ? "pointer-events-auto" : "pointer-events-none"} ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
                    style={{ filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
                >
                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <ChevronUp className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
                    </motion.div>
                </motion.button>
            </motion.div>
            <motion.button
                type="button"
                aria-label="Back to top"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const start = scrollRef.current;
                    const end = 0;
                    const duration = 900;
                    const t0 = performance.now();
                    const step = (now: number) => {
                        const t = Math.min((now - t0) / duration, 1);
                        const eased = 1 - Math.pow(1 - t, 3);
                        const v = start + (end - start) * eased;
                        scrollRef.current = v;
                        virtualScroll.set(v);
                        onVirtualScrollChangeRef.current?.(v);
                        if (t < 1) requestAnimationFrame(step);
                    };
                    requestAnimationFrame(step);
                }}
                style={{ opacity: footerRevealProgress, top: "calc(env(safe-area-inset-top, 0px) + 1rem)", right: "calc(env(safe-area-inset-right, 0px) + 1rem)" }}
                className={`pricing-button lg:hidden absolute z-50 flex items-center justify-center w-7 h-7 rounded-md text-foreground transition pointer-events-auto ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
            >
                <X className="w-3.5 h-3.5" strokeWidth={2.25} />
            </motion.button>
        </div>
    );
}
