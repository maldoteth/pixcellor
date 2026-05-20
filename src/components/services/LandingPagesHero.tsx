import React from "react";

/**
 * Hero scene for the "Landing Pages" service.
 * A frosted-glass hover grid laid over an image — fills the hero frame
 * exactly like the TubesCursor scene on the Animated Sites service.
 */
const HOVER_AREAS = 30;
const IMAGE_SRC =
  "https://images.pexels.com/photos/5516061/pexels-photo-5516061.jpeg";

const LINEAR_TABLE =
  "0.000 0.016 0.032 0.048 0.063 0.079 0.095 0.111 0.127 0.143 0.159 0.175 0.190 0.206 0.222 0.238 0.254 0.270 0.286 0.302 0.317 0.333 0.349 0.365 0.381 0.397 0.413 0.429 0.444 0.460 0.476 0.492 0.508 0.524 0.540 0.556 0.571 0.587 0.603 0.619 0.635 0.651 0.667 0.683 0.698 0.714 0.730 0.746 0.762 0.778 0.794 0.810 0.825 0.841 0.857 0.873 0.889 0.905 0.921 0.937 0.952 0.968 0.984 1.000";

const QUANT_TABLE = Array.from({ length: 60 }, () => "0.000 0.333 0.667 1.000").join(" ");

type NavStyle = React.CSSProperties & { "--max-a": number };

export function FrostedHoverNav() {
  const navStyle: NavStyle = { "--max-a": HOVER_AREAS };
  const areaCount = HOVER_AREAS * HOVER_AREAS;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <style>{`
        .frosted-nav-wrap nav {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
        }
        .frosted-nav-wrap nav img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }
        .frosted-nav-wrap nav .hover-area {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(var(--max-a), 1fr);
          grid-template-rows: repeat(var(--max-a), 1fr);
          z-index: 2;
        }
        .frosted-nav-wrap nav .hover-area i {
          position: relative;
          display: block;
          background: transparent;
          overflow: visible;
        }
        .frosted-nav-wrap nav .hover-area i::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: clamp(88px, 12vw, 150px);
          height: clamp(70px, 9vw, 118px);
          border-radius: 42% 58% 48% 52% / 52% 44% 56% 48%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.55) rotate(-8deg);
          transform-origin: center;
          background: hsl(0 0% 100% / 0.16);
          box-shadow: inset 0 0 22px hsl(0 0% 100% / 0.32), 0 0 18px hsl(190 100% 85% / 0.22);
          backdrop-filter: url(#frosted-snowflake) blur(4px) saturate(1.45) contrast(1.08);
          -webkit-backdrop-filter: url(#frosted-snowflake) blur(4px) saturate(1.45) contrast(1.08);
          pointer-events: none;
          transition: opacity .18s ease, transform .38s cubic-bezier(.22, 1, .36, 1), border-radius .55s ease;
        }
        .frosted-nav-wrap nav .hover-area i::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: clamp(60px, 8vw, 110px);
          height: clamp(42px, 6vw, 78px);
          border-radius: 999px;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.5);
          background: radial-gradient(circle, hsl(0 0% 100% / 0.42) 0%, hsl(0 0% 100% / 0.14) 45%, transparent 72%);
          filter: blur(8px);
          pointer-events: none;
          transition: opacity .2s ease, transform .42s cubic-bezier(.22, 1, .36, 1);
        }
        .frosted-nav-wrap nav .hover-area i:hover::before {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1) rotate(3deg);
          border-radius: 58% 42% 54% 46% / 44% 58% 42% 56%;
        }
        .frosted-nav-wrap nav .hover-area i:hover::after {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.08);
        }
      `}</style>

      <div className="frosted-nav-wrap absolute inset-0">
        <nav style={navStyle}>
          <img src={IMAGE_SRC} alt="" />
          <aside className="hover-area" aria-hidden="true">
            {Array.from({ length: areaCount }).map((_, index) => (
              <i key={index} />
            ))}
          </aside>
        </nav>
      </div>

      <svg
        data-defs
        height="0"
        width="0"
        viewBox="0 0 1 1"
        colorInterpolationFilters="sRGB"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <filter
            id="frosted-snowflake"
            primitiveUnits="userSpaceOnUse"
            x="0%"
            y="0%"
            width="120%"
            height="120%"
          >
            <feComponentTransfer result="SourceBackground" in="SourceGraphic">
              <feFuncR type="discrete" tableValues={LINEAR_TABLE} />
              <feFuncG type="discrete" tableValues={LINEAR_TABLE} />
              <feFuncB type="discrete" tableValues={LINEAR_TABLE} />
            </feComponentTransfer>
            <feBlend result="blend-0" in="SourceBackground" in2="none" />
            <feGaussianBlur result="gaussian-blur-6" in="blend-0" stdDeviation="10" />
            <feTurbulence result="turbulence-0" baseFrequency="0.420" type="fractalNoise" />
            <feDisplacementMap
              result="displacement-map-0"
              in="gaussian-blur-6"
              in2="turbulence-0"
              scale="150"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feComponentTransfer result="SourceMask" in="SourceGraphic">
              <feFuncR type="discrete" tableValues={QUANT_TABLE} />
              <feFuncG type="discrete" tableValues={QUANT_TABLE} />
              <feFuncB type="discrete" tableValues={QUANT_TABLE} />
            </feComponentTransfer>
            <feBlend result="SourceMask" />
            <feColorMatrix
              result="color-matrix-0"
              in="SourceMask"
              values="0.761905 0.190476 0.047619 0 0 0.761905 0.190476 0.047619 0 0 0.761905 0.190476 0.047619 0 0 0 0 0 1 0"
            />
            <feColorMatrix result="color-matrix-1" in="color-matrix-0" type="luminanceToAlpha" />
            <feGaussianBlur result="gaussian-blur-0" in="color-matrix-1" stdDeviation="0" />
            <feComposite
              result="composite-1"
              in="displacement-map-0"
              in2="gaussian-blur-0"
              operator="in"
            />
            <feMerge result="merge-0">
              <feMergeNode in="blend-0" />
              <feMergeNode in="composite-1" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default FrostedHoverNav;
