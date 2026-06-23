import React, { useEffect, useRef } from "react";

/**
 * Social Media Automation hero — animated 3D rotating cube with poem-style text.
 * Based on a CSS 3D cube animation. Self-contained: no external images required.
 */
const POEM_HTML = `
  <p>Post.</p>
  <p>Schedule.</p>
  <p>Engage.</p>
  <p>Repeat.</p>
  <p>Automated.</p>
`;

const SocialMediaAutomationHero: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const adjust = () => {
      const wrap = wrapRef.current;
      const content = contentRef.current;
      if (!wrap || !content) return;
      const { width, height } = wrap.getBoundingClientRect();
      const scale = Math.min(width / 1000, height / 562);
      content.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    adjust();
    const ro = new ResizeObserver(adjust);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", adjust);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", adjust);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-black">
      <style>{`
        .sma-content {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1000px;
          height: 562px;
          transform-origin: center center;
          perspective: 1200px;
        }
        .sma-full {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .sma-hue {
          position: absolute;
          inset: -10%;
          background:
            radial-gradient(circle at 30% 30%, rgba(255,80,180,0.35), transparent 55%),
            radial-gradient(circle at 70% 60%, rgba(60,140,255,0.35), transparent 55%),
            radial-gradient(circle at 50% 80%, rgba(150,80,255,0.30), transparent 60%);
          filter: blur(40px) saturate(140%);
          animation: sma-hue 14s linear infinite;
        }
        @keyframes sma-hue {
          0% { filter: hue-rotate(0deg) blur(40px) saturate(140%); }
          100% { filter: hue-rotate(360deg) blur(40px) saturate(140%); }
        }
        .sma-stage {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1600px;
        }
        .sma-reflect {
          position: absolute;
          left: 0; right: 0; bottom: -40%;
          height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1600px;
          transform: scaleY(-1);
          opacity: 0.18;
          filter: blur(2px);
          mask-image: linear-gradient(to top, black, transparent 70%);
          -webkit-mask-image: linear-gradient(to top, black, transparent 70%);
        }
        .sma-cube {
          position: relative;
          width: 260px;
          height: 260px;
          transform-style: preserve-3d;
          animation: sma-spin 18s linear infinite;
        }
        @keyframes sma-spin {
          from { transform: rotateX(-20deg) rotateY(0deg); }
          to   { transform: rotateX(-20deg) rotateY(360deg); }
        }
        .sma-face {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 0 40px rgba(255,255,255,0.05) inset;
        }
        .sma-face.text {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-weight: 600;
          font-size: 22px;
          line-height: 1.5;
          letter-spacing: 0.02em;
          text-align: center;
          padding: 18px;
        }
        .sma-face.text p { margin: 2px 0; }
        .sma-face.top    { transform: rotateX( 90deg) translateZ(130px); }
        .sma-face.bottom { transform: rotateX(-90deg) translateZ(130px); }
        .sma-face.left   { transform: rotateY(-90deg) translateZ(130px); }
        .sma-face.right  { transform: rotateY( 90deg) translateZ(130px); }
        .sma-face.front  { transform: translateZ(130px); }
        .sma-face.back   { transform: rotateY(180deg) translateZ(130px); }
      `}</style>

      <div ref={contentRef} className="sma-content">
        <div className="sma-full">
          <div className="sma-hue" />

          <div className="sma-stage">
            <div className="sma-cube">
              <div className="sma-face top" />
              <div className="sma-face bottom" />
              <div className="sma-face left text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
              <div className="sma-face right text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
              <div className="sma-face front" />
              <div className="sma-face back text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
            </div>
          </div>

          <div className="sma-reflect">
            <div className="sma-cube">
              <div className="sma-face top" />
              <div className="sma-face bottom" />
              <div className="sma-face left text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
              <div className="sma-face right text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
              <div className="sma-face front" />
              <div className="sma-face back text" dangerouslySetInnerHTML={{ __html: POEM_HTML }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaAutomationHero;
