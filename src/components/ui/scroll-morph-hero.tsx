"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";
import { ChevronDown } from "lucide-react";
import BookSlider from "./book-slider";
import PackagesDialog from "@/components/PackagesDialog";
import Footer from "@/components/Footer";
import { recordFalloff, recordScrollDepth } from "@/lib/checkoutTracking";

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
}

// --- FlipCard Component ---
const IMG_WIDTH = 70;
const IMG_HEIGHT = 70;

function FlipCard({
    src,
    index,
    phase,
    target,
}: FlipCardProps) {
    return (
        <motion.div
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
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d",
                perspective: "1000px",
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
                    <div className="text-center">
                        <p className="text-[8px] font-bold text-primary uppercase tracking-widest mb-1">View</p>
                        <p className="text-xs font-medium text-foreground">Details</p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;

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

        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);

        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });

        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0);

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

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            forceCirclePhase();

            // Apply 5x multiplier on mobile for faster scrolling (both directions)
            const isMobile = window.innerWidth < 768;
            const scrollDelta = isMobile ? e.deltaY * 24 : e.deltaY;

            const newScroll = Math.min(Math.max(scrollRef.current + scrollDelta, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
            onVirtualScrollChangeRef.current?.(newScroll);
            recordScrollDepth((newScroll / MAX_SCROLL) * 100);
        };

        let touchStartY = 0;
        const isInteractive = (target: EventTarget | null) => {
            const el = target as HTMLElement | null;
            const interactiveEl = el?.closest('button, a, [role="button"], input, textarea, select');
            return !!interactiveEl && !interactiveEl.closest('[data-hero-scroll-control="true"]');
        };
        const handleTouchStart = (e: TouchEvent) => {
            // Always capture starting Y so the next move has a correct baseline,
            // even if the gesture began on an interactive element.
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (isInteractive(e.target)) return;
            e.preventDefault();
            forceCirclePhase();
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            touchStartY = touchY;

            const isMobile = window.innerWidth < 768;
            const scrollDelta = isMobile ? deltaY * 24 : deltaY;

            const newScroll = Math.min(Math.max(scrollRef.current + scrollDelta, 0), MAX_SCROLL);
            scrollRef.current = newScroll;
            virtualScroll.set(newScroll);
            onVirtualScrollChangeRef.current?.(newScroll);
            recordScrollDepth((newScroll / MAX_SCROLL) * 100);
        };

        // Lock native scroll/zoom on the hero so the browser doesn't waste the
        // first swipe deciding between native scroll and our handler.
        const previousTouchAction = container.style.touchAction;
        container.style.touchAction = "none";

        const touchTarget = window.matchMedia("(max-width: 767px)").matches ? window : container;

        const touchListenerOptions: AddEventListenerOptions = { passive: false, capture: true };

        container.addEventListener("wheel", handleWheel, { passive: false });
        // Non-passive touchstart commits the gesture to JS immediately, so the
        // first swipe registers instead of being eaten by the scroll heuristic.
        touchTarget.addEventListener("touchstart", handleTouchStart, touchListenerOptions);
        touchTarget.addEventListener("touchmove", handleTouchMove, touchListenerOptions);

        return () => {
            container.removeEventListener("wheel", handleWheel);
            touchTarget.removeEventListener("touchstart", handleTouchStart, touchListenerOptions);
            touchTarget.removeEventListener("touchmove", handleTouchMove, touchListenerOptions);
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
    // Mobile: footer slides up into view as user scrolls (instead of lifting page content)
    const footerRevealProgress = useTransform(virtualScroll, [900, 1900], [0, 1]);
    const smoothFooterReveal = useSpring(footerRevealProgress, { stiffness: 40, damping: 20 });
    const mobileFooterY = useTransform(smoothFooterReveal, [0, 1], [80, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden">
            {/* Subtle center stage light */}
            <div className="absolute inset-0 pointer-events-none z-0" style={{
                background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsla(0,0%,100%,0.15) 0%, transparent 70%)',
            }} />
            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                {/* Intro Text (Fades out) */}
                <div className="absolute z-30 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2">
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="text-2xl md:text-[4.8rem] lg:text-6xl font-medium tracking-tight text-foreground"
                    >
                        <img src={pixcellorWordmarkWhite} alt="Pixcellor™" className="h-[3.6rem] md:h-[8.84rem] lg:h-[7rem] w-auto" />
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.8 - morphValue * 1.6 } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="-mt-2 text-xs md:text-sm lg:text-base font-bold tracking-[0.2em] text-foreground/90"
                    >
                        The Digital Builders
                    </motion.p>
                    <motion.button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const start = scrollRef.current;
                            const end = Math.min(Math.max(start + 1500, 1500), MAX_SCROLL);
                            console.log("[arrow-desktop] scroll", { start, end });
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
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.3 ? { opacity: 0.9 - morphValue * 3 } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        aria-label="Scroll down"
                        className="hidden md:block mt-6 md:mt-10 pointer-events-auto cursor-pointer text-foreground/80 hover:text-foreground transition-colors"
                        style={{ filter: "drop-shadow(0 0 6px hsla(0,0%,100%,0.7)) drop-shadow(0 0 12px hsla(0,0%,100%,0.4))" }}
                    >
                        <motion.div
                            animate={{ y: [0, 4, 0] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <ChevronDown className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
                        </motion.div>
                    </motion.button>
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
                    className="md:hidden fixed left-1/2 -translate-x-1/2 cursor-pointer text-foreground/80 hover:text-foreground transition-colors flex items-center justify-center"
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
                    className="absolute top-[5%] bottom-[60px] z-10 flex flex-col items-center justify-start text-center pointer-events-auto px-4 overflow-y-auto w-full"
                >
                    <h2 className="text-3xl md:text-5xl font-semibold text-foreground tracking-tight mb-4">
                        You Dream It - We Build It
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-lg leading-relaxed mb-8">
                        A full stack digital services studio for websites, apps, AI agents and an array of bespoke business solutions.
                    </p>
                    <PackagesDialog open={packagesOpen} onOpenChange={handlePackagesOpenChange} />
                    <BookSlider />
                </motion.div>

                {/* Main Container */}
                <div className="relative flex items-center justify-center w-full h-full">
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

                            const circleRadius = Math.min(minDimension * 0.35, 350);

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
                            />
                        );
                    })}
                </div>
            </div>

            {/* Footer fades in with arc content */}
            <motion.div
                style={{
                    opacity: contentOpacity,
                    y: containerSize.width < 768 ? mobileFooterY : 0,
                    pointerEvents: morphValue > 0.85 ? "auto" : "none"
                }}
                className="absolute bottom-0 left-0 right-0 z-30"
            >
                <Footer />
            </motion.div>
        </div>
    );
}
