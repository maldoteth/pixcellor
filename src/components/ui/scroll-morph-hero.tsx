"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue, animate } from "framer-motion";
import { ChevronDown, ChevronUp, X, BookOpen, ShoppingCart, Phone, Tag } from "lucide-react";

import Footer from "@/components/Footer";
import ServiceSalesStory from "@/components/ServiceSalesStory";
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
            /* CORS or other â€“ fallback to white */
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
const PORTFOLIO_SCROLL_END = HERO_MORPH_END + 2400;
const SALES_SCENE_COUNT = 5;
const SALES_TRANSITION_DISTANCE = 700;
const SALES_SCENE_SCROLL_DISTANCE = 1100;
const SALES_STORY_SCROLL_START = PORTFOLIO_SCROLL_END + SALES_TRANSITION_DISTANCE;
const SALES_STORY_SCROLL_END =
    SALES_STORY_SCROLL_START + (SALES_SCENE_COUNT - 1) * SALES_SCENE_SCROLL_DISTANCE;
const MAX_SCROLL = SALES_STORY_SCROLL_END;
const SCROLL_BREAK_DURATION = 650;
const MOBILE_SCROLL_BOOST = 24;
const TABLET_SCROLL_BOOST = 12;
const DESKTOP_TOUCH_BOOST = 12; // matches tablet feel for â‰¥1024px touch screens
const CAROUSEL_SCROLL_SENSITIVITY = 0.9;
// Track the shape of each wheel pulse: accelerate, peak, then decay. A new
// same-direction swipe is the next acceleration after that decay. WheelEvent
// exposes no gesture-phase flag, so this valley detector is what lets a fresh
// swipe react immediately without treating one swipe's momentum as four pages.
const WHEEL_PULSE_GAP_MS = 20;
const WHEEL_TAIL_ARM_RATIO = 0.72;
const WHEEL_DEEP_TAIL_RATIO = 0.5;
const WHEEL_REBOUND_RATIO = 1.08;
const WHEEL_REBOUND_MIN_DELTA = 8;
const WHEEL_REBOUND_MIN_RISE = 3;
const WHEEL_TAIL_FALL_EVENTS = 2;
const WHEEL_REBOUND_RISE_EVENTS = 2;

// UI Template Images ordered around the colour wheel (red â†’ orange â†’ yellow â†’
// green â†’ blue â†’ purple â†’ magenta â†’ back to red) so the rotating circle
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
    const salesSnapIndexRef = useRef(-1);
    const salesSnapGenerationRef = useRef(0);
    const salesSnapControlsRef = useRef<{ stop: () => void } | null>(null);
    const salesSnapInFlightRef = useRef(false);
    const pendingSalesDirectionsRef = useRef<number[]>([]);
    const salesLandingFrameRef = useRef<number | null>(null);
    const salesSurfaceSyncingRef = useRef(false);
    const salesSurfaceSyncFrameRef = useRef<number | null>(null);
    const salesPortfolioExitArmedRef = useRef(false);
    const wheelGestureConsumedRef = useRef(false);
    const wheelGestureDeltaRef = useRef(0);
    const wheelLastEventAtRef = useRef(0);
    const wheelLastMagnitudeRef = useRef(0);
    const wheelPeakMagnitudeRef = useRef(0);
    const wheelTailReadyRef = useRef(false);
    const wheelDeepTailReadyRef = useRef(false);
    const wheelFallingEventsRef = useRef(0);
    const wheelRisingEventsRef = useRef(0);
    const wheelDirectionRef = useRef(0);
    const touchSnapTriggeredRef = useRef(false);
    const snapSalesByDirectionRef = useRef<(direction: number) => void>(() => undefined);
    const setVirtualScrollDriverRef = useRef<(value: number) => void>(() => undefined);

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

        const setVirtualScrollValue = (value: number, syncSalesSurface = true) => {
            const bounded = Math.min(Math.max(value, 0), MAX_SCROLL);
            scrollRef.current = bounded;
            virtualScroll.set(bounded);
            onVirtualScrollChangeRef.current?.(bounded);
            recordScrollDepth((bounded / MAX_SCROLL) * 100);

            if (syncSalesSurface && container.clientHeight > 0) {
                const salesOffset = Math.min(
                    SALES_SCENE_COUNT - 1,
                    Math.max(
                        0,
                        (bounded - SALES_STORY_SCROLL_START) / SALES_SCENE_SCROLL_DISTANCE,
                    ),
                );
                if (!salesSnapInFlightRef.current) {
                    salesSnapIndexRef.current = bounded >= SALES_STORY_SCROLL_START
                      …11271 tokens truncated…:bottom-[23px] w-full md:w-auto px-[1.5rem] md:px-0 ${overlayOpen ? "!opacity-0 !pointer-events-none" : ""}`}
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

                {/* Mobile-only scroll arrow â€” bottom of screen, aligned with chat button */}
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
                            setVirtualScrollDriverRef.current(v);
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
                    style={{ opacity: portfolioOpacity, y: portfolioY, scale: portfolioScale }}
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

                {/* Circular Portfolio Gallery â€” stays mounted so images remain cached while scrolling */}
                {galleryItems.length > 0 && (
                    <motion.div
                        style={{ opacity: portfolioOpacity, y: portfolioY, scale: portfolioScale, pointerEvents: portfolioInteractive ? "auto" : "none" }}
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

                {/* Sales story: four service acts followed by the contact close */}
                <motion.div
                    style={{
                        opacity: salesStoryOpacity,
                        y: salesStoryY,
                        scale: salesStoryScale,
                        pointerEvents: salesStoryPointerEvents,
                    }}
                    className="absolute inset-0 z-[170] origin-center"
                >
                    <ServiceSalesStory progress={smoothSalesStoryProgress} />
                </motion.div>

                {/* Main Container */}
                <motion.div
                    style={{ opacity: heroCardsOpacity, y: heroCardsY, scale: heroCardsScale }}
                    className="relative flex items-start md:items-center justify-center w-full h-full pt-[240px] md:pt-0 origin-center"
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

            {/* Up arrow above the footer â€” mirror of the hero down arrow */}
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
                        setVirtualScrollDriverRef.current(v);
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
            <div
                aria-hidden="true"
                className="absolute inset-0 grid grid-rows-5 pointer-events-none"
            >
                {Array.from({ length: SALES_SCENE_COUNT }, (_, index) => (
                    <div
                        key={`sales-snap-${index}`}
                        data-sales-snap-index={index}
                        className="h-full w-full snap-start snap-always"
                    />
                ))}
            </div>
            </div>
        </div>
    );
}


