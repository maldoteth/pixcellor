import React from "react";

/**
 * Visitor Intel & Falloff Capture hero — animated CSS 3D MacBook opening,
 * with keys cascading. All styles are scoped via a local <style> block.
 */
const VisitorIntelHero: React.FC = () => {
  const keyBase =
    "vi-key float-left m-[1px] rounded-[2px] bg-[#444] w-[6px] h-[6px] shadow-[0_-2px_0_#222]";

  return (
    <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
      <style>{`
        .vi-stage { perspective: 700px; }
        .vi-inner { transform-style: preserve-3d; transform: rotateX(-20deg) rotateY(0deg) rotateZ(0deg); animation: vi-rotate 8s ease-in-out infinite; }
        .vi-screen { transform-style: preserve-3d; transform-origin: 50% 100%; transform: rotateX(0deg); animation: vi-lid-screen 6s ease-in-out infinite; }
        .vi-screen-face { transform: translateZ(2px); }
        .vi-body { transform-style: preserve-3d; transform-origin: 50% 100%; transform: rotateX(-90deg); animation: vi-lid-body 6s ease-in-out infinite; }
        .vi-body-face { transform: translateZ(-2px); animation: vi-keyboard-area 6s ease-in-out infinite; }
        .vi-keyboard { transform-style: preserve-3d; }
        .vi-key { transform: translateZ(-2px); animation: vi-keys 6s ease-in-out infinite; }
        .vi-shadow { transform: rotateX(80deg); animation: vi-shadow 6s ease-in-out infinite; }
        .vi-screen-shade { animation: vi-screen-shade 4s linear infinite; }

        @keyframes vi-rotate {
          0%   { transform: rotateX(-20deg) rotateY(0deg)   rotateZ(0deg); }
          50%  { transform: rotateX(-30deg) rotateY(180deg) rotateZ(0deg); }
          100% { transform: rotateX(-20deg) rotateY(360deg) rotateZ(0deg); }
        }
        @keyframes vi-lid-screen {
          0%, 100% { transform: rotateX(0deg); }
          40%, 60% { transform: rotateX(-90deg); }
        }
        @keyframes vi-lid-body {
          0%, 100% { transform: rotateX(-90deg); }
          40%, 60% { transform: rotateX(0deg); }
        }
        @keyframes vi-keyboard-area {
          0%, 100% { background-color: #dfdfdf; }
          40%, 60% { background-color: #cfcfcf; }
        }
        @keyframes vi-keys {
          0%, 35%, 65%, 100% { transform: translateZ(-2px); }
          45%, 55% { transform: translateZ(0px); }
        }
        @keyframes vi-shadow {
          0%, 100% { box-shadow: 0 0 60px 40px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 0 80px 60px rgba(0,0,0,0.5); }
        }
        @keyframes vi-screen-shade {
          0%   { background-position: 0px 0px; }
          100% { background-position: 300px 0px; }
        }
      `}</style>

      <div className="vi-stage relative w-[150px] h-[96px]">
        <div className="vi-inner absolute inset-0 z-20">
          {/* Screen */}
          <div className="vi-screen absolute left-0 bottom-0 w-[150px] h-[96px] rounded-[7px] bg-[#ddd] shadow-[inset_0_3px_7px_rgba(255,255,255,0.5)]"
               style={{ backgroundImage: "linear-gradient(45deg,rgba(0,0,0,0.34) 0%,rgba(0,0,0,0) 100%)" }}>
            <div className="vi-screen-face absolute left-0 bottom-0 w-[150px] h-[96px] rounded-[7px] bg-[#d3d3d3]"
                 style={{ backgroundImage: "linear-gradient(45deg,rgba(0,0,0,0.24) 0%,rgba(0,0,0,0) 100%)" }}>
              <div className="w-[3px] h-[3px] rounded-full bg-black absolute left-1/2 top-[4px] ml-[-1.5px]" />
              <div className="w-[130px] h-[74px] m-[10px] bg-black rounded-[1px] relative shadow-[inset_0_0_2px_rgba(0,0,0,1)] overflow-hidden">
                <div className="vi-screen-shade absolute left-0 top-0 w-[130px] h-[74px]"
                     style={{ backgroundImage: "linear-gradient(-135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.18) 47%,rgba(255,255,255,0) 48%)", backgroundSize: "300px 200px" }} />
              </div>
              <span className="absolute top-[85px] left-[57px] text-[6px] text-[#666]">MacBook Air</span>
            </div>
          </div>

          {/* Body */}
          <div className="vi-body absolute left-0 bottom-0 w-[150px] h-[96px] rounded-[7px] bg-[#cbcbcb]"
               style={{ backgroundImage: "linear-gradient(45deg,rgba(0,0,0,0.24) 0%,rgba(0,0,0,0) 100%)" }}>
            <div className="vi-body-face absolute left-0 bottom-0 w-[150px] h-[96px] rounded-[7px] bg-[#dfdfdf]"
                 style={{ backgroundImage: "linear-gradient(30deg,rgba(0,0,0,0.24) 0%,rgba(0,0,0,0) 100%)" }}>
              <div className="w-[40px] h-[31px] absolute left-1/2 top-1/2 rounded-[4px] mt-[-44px] ml-[-18px] bg-[#cdcdcd] shadow-[inset_0_0_3px_#888]"
                   style={{ backgroundImage: "linear-gradient(30deg,rgba(0,0,0,0.24) 0%,rgba(0,0,0,0) 100%)" }} />
              <div className="vi-keyboard w-[130px] h-[45px] absolute left-[7px] top-[41px] rounded-[4px] bg-[#cdcdcd] shadow-[inset_0_0_3px_#777] pl-[2px] overflow-hidden"
                   style={{ backgroundImage: "linear-gradient(30deg,rgba(0,0,0,0.24) 0%,rgba(0,0,0,0) 100%)" }}>
                {Array.from({ length: 58 }).map((_, i) => (
                  <div key={`k-${i}`} className={keyBase} />
                ))}
                <div className={`${keyBase} w-[45px]`} />
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={`f-${i}`} className={`${keyBase} h-[3px]`} />
                ))}
              </div>
            </div>
            <div className="w-[5px] h-[5px] bg-[#333] rounded-full absolute left-[20px] top-[20px]" />
            <div className="w-[5px] h-[5px] bg-[#333] rounded-full absolute right-[20px] top-[20px]" />
            <div className="w-[5px] h-[5px] bg-[#333] rounded-full absolute right-[20px] bottom-[20px]" />
            <div className="w-[5px] h-[5px] bg-[#333] rounded-full absolute left-[20px] bottom-[20px]" />
          </div>
        </div>

        <div className="vi-shadow absolute w-[60px] h-0 left-[40px] top-[160px] shadow-[0_0_60px_40px_rgba(0,0,0,0.3)]" />
      </div>
    </div>
  );
};

export default VisitorIntelHero;
