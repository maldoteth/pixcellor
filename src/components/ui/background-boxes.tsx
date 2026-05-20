"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Aceternity-style animated background boxes.
 * Tilted grid; each cell flashes a random pastel color on hover.
 */
export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
  const rows = new Array(60).fill(1);
  const cols = new Array(40).fill(1);

  const colors = [
    "rgb(125 211 252)",
    "rgb(249 168 212)",
    "rgb(134 239 172)",
    "rgb(253 224 71)",
    "rgb(252 165 165)",
    "rgb(216 180 254)",
    "rgb(147 197 253)",
    "rgb(165 180 252)",
    "rgb(196 181 253)",
  ];
  const getRandomColor = () =>
    colors[Math.floor(Math.random() * colors.length)];

  return (
    <div
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
