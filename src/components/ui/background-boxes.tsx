"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style animated background boxes.
 * Desktop: tilted grid; each cell flashes a random pastel color on hover.
 * Mobile/touch: auto-flashes random cells, and lights up where the user taps.
 */
export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const rows = new Array(60).fill(1);
  const cols = new Array(40).fill(1);

  const colors = React.useMemo(
    () => [
      "rgb(125 211 252)",
      "rgb(249 168 212)",
      "rgb(134 239 172)",
      "rgb(253 224 71)",
      "rgb(252 165 165)",
      "rgb(216 180 254)",
      "rgb(147 197 253)",
      "rgb(165 180 252)",
      "rgb(196 181 253)",
    ],
    []
  );
  const getRandomColor = React.useCallback(
    () => colors[Math.floor(Math.random() * colors.length)],
    [colors]
  );

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cellRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const flashCell = React.useCallback(
    (el: HTMLDivElement | null | undefined) => {
      if (!el) return;
      el.style.transition = "background-color 0s";
      el.style.backgroundColor = getRandomColor();
      window.setTimeout(() => {
        el.style.transition = "background-color 2s";
        el.style.backgroundColor = "";
      }, 50);
    },
    [getRandomColor]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const isTouch = mq.matches;

    let interval: number | undefined;
    if (isTouch) {
      interval = window.setInterval(() => {
        const keys = Array.from(cellRefs.current.keys());
        if (!keys.length) return;
        const burst = 2 + Math.floor(Math.random() * 3);
        for (let k = 0; k < burst; k++) {
          const key = keys[Math.floor(Math.random() * keys.length)];
          flashCell(cellRefs.current.get(key));
        }
      }, 350);
    }

    const onTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const target = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        const cell = target?.closest("[data-cell]") as HTMLDivElement | null;
        if (cell) flashCell(cell);
      }
    };

    // Desktop: find cell beneath overlays via elementsFromPoint so buttons stay clickable
    let lastCell: HTMLDivElement | null = null;
    const onMove = (e: MouseEvent) => {
      const stack = document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[];
      const cell = stack.find((el) => el.hasAttribute?.("data-cell")) as HTMLDivElement | undefined;
      if (cell && cell !== lastCell) {
        lastCell = cell;
        flashCell(cell);
      }
    };

    const node = containerRef.current;
    if (isTouch) {
      node?.addEventListener("touchstart", onTouch, { passive: true });
      node?.addEventListener("touchmove", onTouch, { passive: true });
    } else {
      window.addEventListener("mousemove", onMove);
    }

    return () => {
      if (interval) window.clearInterval(interval);
      node?.removeEventListener("touchstart", onTouch);
      node?.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mousemove", onMove);
    };
  }, [flashCell]);


  return (
    <div
      ref={containerRef}
      style={{
        transform:
          "translate(-50%,-50%) skewX(-48deg) skewY(14deg) scale(0.7) rotate(0deg) translateZ(0)",
      }}
      className={cn(
        "absolute left-1/2 top-1/2 z-0 flex h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 p-4",
        className
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className="relative h-8 w-16 border-l border-foreground/20"
        >
          {cols.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: getRandomColor(),
                transition: { duration: 0 },
              }}
              animate={{ transition: { duration: 2 } }}
              key={`col-${j}`}
              data-cell=""
              ref={(el) => {
                const key = `${i}-${j}`;
                if (el) cellRefs.current.set(key, el);
                else cellRefs.current.delete(key);
              }}
              className="relative h-8 w-16 border-r border-t border-foreground/20"
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="pointer-events-none absolute -left-[22px] -top-[14px] h-6 w-10 stroke-[1px] text-foreground/30"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
