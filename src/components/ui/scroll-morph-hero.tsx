"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue, animate } from "framer-motion";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import PackagesDialog from "@/components/PackagesDialog";
import Footer from "@/components/Footer";
import { recordFalloff, recordScrollDepth } from "@/lib/checkoutTracking";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";
import { supabase } from "@/integrations/supabase/client";

// Import hero UI images
import ui1 from '@/assets/hero/ui-1.png';
import pixcellorWordmarkWhite from '@/assets/pixcellor-wordmark-white.png';
import ui2 from '@/assets/hero/ui-2.png';
import ui3 from '@/assets/hero/ui-3.png';
import ui4 from '@/assets/hero/ui-4.png';
import ui5 from '@/assets/hero/ui-5.png';
import ui6 from '@/assets/hero/ui-6.png';
import ui7 from '@/assets/hero/ui-7.png';
import ui8 from '@/assets/hero/ui-8.png';
import ui9 from '@/assets/hero/ui-9.png';
import ui10 from '@/assets/hero/ui-10.png';
import ui11 from '@/assets/hero/ui-11.png';
import ui12 from '@/assets/hero/ui-12.png';
import ui13 from '@/assets/hero/ui-13.png';
import ui14 from '@/assets/hero/ui-14.png';
import ui15 from '@/assets/hero/ui-15.png';
import ui16 from '@/assets/hero/ui-16.png';

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

interface FlipCardProps {
    src: string;
    index: number;
    total: number;
    phase: AnimationPhase;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
    onViewDetails?: () => void;
}

// --- FlipCard Component ---
const IMG_WIDTH = 70;
const IMG_HEIGHT = 70;

function FlipCard({
    src,
    index,
    phase,
    target,
    onViewDetails,
}: FlipCardProps) {
    const handleOpen = (event: React.MouseEvent | React.KeyboardEvent) => {
        event.stopPropagation();
        event.preventDefault();
        onViewDetails?.();
    };

    return (
        <motion.div
            onClick={handleOpen}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") handleOpen(event);
            }}
            role="link"
            tabIndex={0}
            aria-label="Open a random portfolio project"
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            whileHover={{ z: 200, scale: target.scale * 1.05 }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d",
                perspective: "1000px",
                zIndex: 45,
                pointerEvents: "auto",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-none shadow-lg bg-muted"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img
                        src={src}
                        alt={`hero-${index}`}
                        className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-none shadow-lg bg-card flex flex-col items-center justify-center p-4 border border-border"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="text-center cursor-pointer pointer-events-auto"
                    >
                        <p className="text-[8px] font-bold text-primary uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-foreground">Details</p>
                    </button>
                </div>
            </motion.div>
        </motion.div>
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
const CAROUSEL_SCROLL_SENSITIVITY = 0.9;

// UI Template Images (16 unique + 4 repeated to fill 20 slots)
const IMAGES = [
    ui1, ui2, ui3, ui4, ui5, ui6, ui7, ui8, ui9, ui10,
    ui11, ui12, ui13, ui14, ui15, ui16, ui1, ui2, ui3, ui4
];

interface IntroAnimationProps {
    onVirtualScrollChange?: (value: number) => void;
}

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export default function IntroAnimation({ onVirtualScrollChange }: IntroAnimationProps) {
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const introPhaseRef = useRef<AnimationPhase>("scatter");
    const introTimersRef = useRef<number[]>([]);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [packagesOpen, setPackagesOpen] = useState(false);
    const dismissedAtEndRef = useRef(false);
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

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const forceCirclePhase = () => {
            if (introPhaseRef.current === "circle") return;
            introPhaseRef.current = "circle";
            setIntroPhase("circle");
            introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
            introTimersRef.current = [];
        };

        const applyVirtualScrollDelta = (delta: number, source: "wheel" | "touch") => {
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
            if (isInteractive(e.target)) return;
            if (isInsideOverlay(e)) return;

            const touchY = e.touches[0].clientY;
            const touchX = e.touches[0].clientX;
            const deltaY = touchStartY - touchY;
            const deltaX = touchStartX - touchX;

            if (gestureAxis === "none") {
                const absX = Math.abs(touchX - touchStartX);
                const absY = Math.abs(touchY - touchStartY);
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

            // Combine vertical + horizontal across the whole page so side-swipes
            // anywhere drive the virtual scroll (swipe left = advance, right = back).
            const inCarousel = scrollRef.current >= HERO_MORPH_END;
            const combinedDelta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;

            const w = window.innerWidth;
            const boost = w < 768 ? MOBILE_SCROLL_BOOST : w < 1024 ? TABLET_SCROLL_BOOST : 1;
            const carouselMult = inCarousel ? CAROUSEL_SCROLL_SENSITIVITY : 1;
            const scrollDelta = combinedDelta * boost * carouselMult;
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

    // Auto-open behavior removed — packages dialog now only opens via user click.

    // Desktop: listen for global open-packages event (e.g. from ServicesDialog "View Pricing")
    useEffect(() => {
        const handler = () => setPackagesOpen(true);
        window.addEventListener("pixcellor:open-packages", handler);
        return () => window.removeEventListener("pixcellor:open-packages", handler);
    }, []);

    const handlePackagesOpenChange = (open: boolean) => {
        setPackagesOpen(open);
        if (open) void recordFalloff({ event: "pricing_opened" });
        if (!open) {
            // Mark dismissed and cancel any pending auto-open so it stays closed
            // until user scrolls meaningfully back up
            dismissedAtEndRef.current = true;
        }
    };

    // --- Content Opacity ---
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);
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
    const ctaOpacity = useTransform([introFadeIn, morphFadeFast], ([f, m]: number[]) => f * m * 0.95);
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
    // Cursor-follow drift for the center glow (desktop only). Light gently follows the pointer.
    const glowOffsetX = useMotionValue(0);
    const glowOffsetY = useMotionValue(0);
    const smoothGlowOffsetX = useSpring(glowOffsetX, { stiffness: 50, damping: 20, mass: 0.6 });
    const smoothGlowOffsetY = useSpring(glowOffsetY, { stiffness: 50, damping: 20, mass: 0.6 });
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.matchMedia("(pointer: coarse)").matches) return;
        const el = containerRef.current;
        if (!el) return;
        const onMove = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1..1
            const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            // Subtle drift: ±5% horizontal, ±3.5% vertical
            glowOffsetX.set(nx * 11);
            glowOffsetY.set(ny * 7);
        };
        const onLeave = () => {
            glowOffsetX.set(0);
            glowOffsetY.set(0);
        };
        el.addEventListener("pointermove", onMove, { passive: true });
        el.addEventListener("pointerleave", onLeave);
        return () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerleave", onLeave);
        };
    }, [glowOffsetX, glowOffsetY]);
    const glowBg = useTransform(
        [smoothGlowW, smoothGlowH, smoothGlowAlphaScale, smoothGlowOffsetX, smoothGlowOffsetY],
        ([w, h, a, ox, oy]: number[]) => {
            const center = glowBaseAlpha * a;
            const cx = 50 + ox;
            const cy = 50 + oy;
            return `radial-gradient(ellipse ${w}% ${h}% at ${cx}% ${cy}%, hsla(0,0%,100%,${center}) 0%, hsla(0,0%,100%,${center * 0.5}) 35%, transparent ${glowFadeStop}%)`;
        }
    );

    // Portfolio gallery items pulled from DB; rotation driven by hero virtual scroll
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
    const portfolioLinksRef = useRef<string[]>([]);
    const openRandomPortfolioLink = () => {
        const links = portfolioLinksRef.current;
        if (links.length === 0) return;
        const raw = links[Math.floor(Math.random() * links.length)];
        const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

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
        (async () => {
            const { data } = await supabase
                .from("portfolio_projects")
                .select("name,url,category,description,image_url")
                .order("display_order", { ascending: true });
            if (!data) return;
            portfolioLinksRef.current = data.map((p: { url: string }) => p.url).filter(Boolean);
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
        })();
    }, []);
    const galleryRotation = useTransform(virtualScroll, [HERO_MORPH_END, CAROUSEL_SCROLL_END], isSmallViewport ? [0, 360] : [0, 720]);
    const smoothGalleryRotation = useSpring(galleryRotation, { stiffness: 40, damping: 20 });
    const [galleryRotationValue, setGalleryRotationValue] = useState(0);
    useEffect(() => {
        const unsub = smoothGalleryRotation.on("change", setGalleryRotationValue);
        return () => unsub();
    }, [smoothGalleryRotation]);

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
                    className="absolute left-1/2 top-[calc(50%+6.8rem)] z-[120] hidden h-12 w-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer touch-manipulation border-0 bg-transparent pointer-events-auto md:block"
                    style={{ opacity: arrowOpacity }}
                />

                {/* Intro Text (Fades out) */}
                <div className="absolute z-[100] flex flex-col items-center justify-center text-center pointer-events-none top-[230px] md:top-1/2 md:-translate-y-1/2">
                    <motion.h1
                        initial={{ y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" ? { y: 0, filter: "blur(0px)" } : { filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        style={{ opacity: titleOpacity }}
                        className="text-2xl md:text-[4.8rem] lg:text-6xl font-medium tracking-tight text-foreground md:mt-[20px] lg:mt-[10px]"
                    >
                        <img src={pixcellorWordmarkWhite} alt="Pixcellor™" className="h-[3.96rem] md:h-[8.4rem] lg:h-[7rem] w-auto" />
                    </motion.h1>
                    <motion.p
                        style={{ opacity: subtitleOpacity }}
                        className="-mt-2 text-xs md:text-sm lg:text-base font-normal tracking-[0.2em] text-foreground/90"
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
                        className="md:hidden relative z-[110] mt-1 h-10 w-10 pointer-events-auto cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center touch-manipulation"
                        style={{ opacity: arrowOpacity, filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
                    >
                        <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ChevronDown className="w-5 h-5" strokeWidth={2.25} />
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
                        className="hidden md:flex relative z-[110] mt-3 md:mt-7 md:-translate-y-[10px] -mx-12 px-12 py-6 pointer-events-auto cursor-pointer text-foreground/80 hover:text-foreground transition-colors items-center justify-center touch-manipulation"
                        style={{ opacity: arrowOpacity, filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
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
                <motion.div
                    style={{ opacity: ctaOpacity }}
                    className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto bottom-[34px] md:bottom-[38px] w-full md:w-auto px-[1.5rem] md:px-0"
                >
                    {/* Mobile: stacked */}
                    <div className="md:hidden flex flex-col items-stretch gap-2 w-full">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } })); }}
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center text-xs font-semibold rounded-md"
                        >
                            Services
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const start = scrollRef.current;
                                const end = Math.min(Math.max(start, 0) + 2000, MAX_SCROLL);
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
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center text-xs font-semibold rounded-md"
                        >
                            Portfolio
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk")); }}
                            className="pricing-button text-foreground transition h-[34px] w-full flex items-center justify-center text-xs font-semibold rounded-md"
                        >
                            Let's Talk
                        </button>
                    </div>
                    {/* Desktop: row */}
                    <div className="hidden md:flex justify-center items-center gap-3">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                const start = scrollRef.current;
                                const end = Math.min(Math.max(start, 0) + 2000, MAX_SCROLL);
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
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center text-sm font-semibold rounded-md"
                        >
                            Portfolio
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { services: true } })); }}
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center text-sm font-semibold rounded-md"
                        >
                            Services
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("pixcellor:open-letstalk")); }}
                            className="pricing-button text-foreground transition h-11 w-[144px] flex items-center justify-center text-sm font-semibold rounded-md"
                        >
                            Let's Talk
                        </button>
                    </div>
                </motion.div>

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
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[5%] z-10 flex flex-col items-center justify-center text-center pointer-events-auto px-4"
                >
                    <h2 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight mb-4">
                        Portfolio
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed mb-8">
                        A full stack digital services studio for websites, apps, AI agents and an array of bespoke business solutions.
                    </p>
                    <PackagesDialog open={packagesOpen} onOpenChange={handlePackagesOpenChange} hidden />
                </motion.div>

                {/* Circular Portfolio Gallery — appears with What We Do title */}
                {galleryItems.length > 0 && (
                    <motion.div
                        style={{ opacity: contentOpacity }}
                        className="absolute inset-x-0 top-[calc(28%-20px)] md:top-[32%] bottom-[calc(18%+64px)] md:bottom-[18%] z-[50] pointer-events-none"
                    >
                        <CircularGallery
                            items={galleryItems}
                            // Scale radius with item count so cards stay nicely spaced as the portfolio grows.
                            // Baseline tuned for 16 items; add ~14px per extra item on desktop, ~9px on mobile.
                            radius={
                                containerSize.width < 768
                                    ? 225 + Math.max(0, galleryItems.length - 12) * 8
                                    : 360 + Math.max(0, galleryItems.length - 12) * 13
                            }
                            externalRotation={galleryRotationValue}
                        />
                    </motion.div>
                )}

                {/* Main Container */}
                <div className="relative flex items-start md:items-center justify-center w-full h-full pt-[240px] md:pt-0">
                    {IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

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
                                rotation: circleAngle + 90,
                            };

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
                                scale: isMobile ? 1.4 : 1.8,
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
                                onViewDetails={openRandomPortfolioLink}
                            />
                        );
                    })}
                </div>
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
                className="absolute left-1/2 -translate-x-1/2 z-[130] pointer-events-none"
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
                    className={`md:hidden relative z-[140] -mx-10 px-10 py-6 cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center touch-manipulation ${footerInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
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
                    className={`hidden md:flex relative z-[140] -mx-12 px-12 py-6 cursor-pointer text-foreground/80 hover:text-foreground transition-colors items-center justify-center touch-manipulation ${footerInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
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
                className="pricing-button lg:hidden absolute z-50 flex items-center justify-center w-7 h-7 rounded-md text-foreground transition pointer-events-auto"
            >
                <X className="w-3.5 h-3.5" strokeWidth={2.25} />
            </motion.button>
        </div>
    );
}
