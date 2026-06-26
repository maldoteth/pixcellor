/* global React, ReactDOM */
const { useEffect, useMemo, useRef } = React;

// ============================================================
// Shared frame — every variation shares this skeleton, only the
// pixel treatment differs. Frame is 480×600 (4:5 post aspect).
// ============================================================
const FRAME = { width: 480, height: 600 };

function Frame({ children, bg, light }) {
  return (
    <div style={{
      width: FRAME.width, height: FRAME.height,
      position: "relative", overflow: "hidden",
      background: bg || "var(--bg-0)",
      color: light ? "#16140F" : "var(--fg-0)",
      fontFamily: "var(--font-sans)",
    }}>
      {children}
    </div>
  );
}

function Wordmark({ src = "../../assets/logo-wordmark-white.png", height = 32 }) {
  return <img src={src} alt="Pixcellor" style={{ height, display: "block" }} />;
}

function Header({ children, light }) {
  return (
    <div style={{
      position: "absolute", top: 28, left: 32, right: 32,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      zIndex: 5,
    }}>
      <Wordmark src={light ? "../../assets/logo-wordmark-black.png" : "../../assets/logo-wordmark-white.png"} height={22} />
      <span style={{
        font: "500 9px/1 var(--font-pixel)",
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: light ? "rgba(22,20,15,0.55)" : "var(--fg-2)",
      }}>{children}</span>
    </div>
  );
}

function Footer({ left, right, light }) {
  return (
    <div style={{
      position: "absolute", bottom: 24, left: 32, right: 32,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      font: "500 10px/1 var(--font-pixel)",
      letterSpacing: "0.08em",
      color: light ? "rgba(22,20,15,0.55)" : "var(--fg-3)",
      zIndex: 5,
    }}>
      <span>{left}</span><span>{right}</span>
    </div>
  );
}

const SPECTRUM = ["#E84B5A","#ED8A3F","#E8C46B","#8EC273","#5FB8C9","#5476B8","#8C70B8","#C26BA0"];
const SPECTRUM_FULL = [...SPECTRUM, ...SPECTRUM]; // 16 stops for the ring

// ============================================================
// V1 — THE RING  (signature recreation of pixcellor.com hero)
// ============================================================
function V1Ring() {
  const stops = SPECTRUM_FULL.map((c, i) => {
    const start = (i / 16) * 360;
    const end = ((i + 1) / 16) * 360;
    return `${c} ${start}deg ${end}deg`;
  }).join(", ");
  return (
    <Frame>
      <Header>Hero · ring</Header>
      {/* glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(380px 280px at 50% 50%, rgba(226,188,101,0.18), transparent 65%)",
      }} />
      {/* ring */}
      <div style={{
        position: "absolute", top: 100, left: 90, width: 300, height: 300,
        borderRadius: "50%",
        background: `conic-gradient(from 0deg, ${stops})`,
        filter: "saturate(0.85)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
      }}>
        {/* inner mask */}
        <div style={{
          position: "absolute", inset: 36,
          borderRadius: "50%", background: "var(--bg-0)",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.8), 0 0 60px rgba(226,188,101,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ textAlign: "center" }}>
            <Wordmark height={32} />
            <div style={{ font: "500 10px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", marginTop: 12 }}>
              Digital Services
            </div>
          </div>
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 80, left: 0, right: 0,
        textAlign: "center",
        font: "500 11px/1.5 var(--font-sans)", color: "var(--fg-2)",
      }}>Sixteen spectrum sectors · the signature</div>
      <Footer left="V1 · Ring" right="✕ Atelier" />
    </Frame>
  );
}

// ============================================================
// V2 — PIXEL MOSAIC HERO  (full-bleed grid of colored squares)
// ============================================================
function V2Mosaic() {
  // 12 cols × 15 rows = 180 cells
  const grid = useMemo(() => {
    const cells = [];
    const cols = 12, rows = 15;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      // mostly dark, ~22% colored
      const colored = Math.random() < 0.22;
      cells.push({
        x: c, y: r,
        color: colored ? SPECTRUM[Math.floor(Math.random() * 8)] : null,
        alpha: 0.45 + Math.random() * 0.45,
      });
    }
    return cells;
  }, []);
  const cell = 40;
  return (
    <Frame bg="#06060A">
      <Header>Hero · mosaic</Header>
      {/* mosaic */}
      <div style={{ position: "absolute", inset: 0 }}>
        {grid.map((g, i) => (
          <div key={i} style={{
            position: "absolute",
            left: g.x * cell, top: g.y * cell,
            width: cell, height: cell,
            background: g.color || "transparent",
            opacity: g.color ? g.alpha : 0,
          }} />
        ))}
      </div>
      {/* center glass plate */}
      <div style={{
        position: "absolute", top: 220, left: 60, right: 60, padding: "32px 24px",
        background: "rgba(244,244,242,0.06)",
        border: "1px solid rgba(244,244,242,0.18)",
        backdropFilter: "blur(32px) saturate(160%)",
        WebkitBackdropFilter: "blur(32px) saturate(160%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.4), 0 18px 40px rgba(0,0,0,0.5)",
        borderRadius: 18, textAlign: "center",
      }}>
        <Wordmark height={32} />
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", marginTop: 14 }}>Hand-built websites</div>
      </div>
      <Footer left="V2 · Mosaic" right="✕ 180 px" />
    </Frame>
  );
}

// ============================================================
// V3 — SPECTRUM HAIRLINE  (minimal — silver dominant, single thin spectrum bar)
// ============================================================
function V3Hairline() {
  return (
    <Frame bg="#0B0B10">
      <Header>Hero · hairline</Header>
      <div style={{ position: "absolute", top: 180, left: 32, right: 32 }}>
        <div style={{
          font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--fg-2)", marginBottom: 18,
        }}>★ Atelier · Volume one</div>
        <h1 style={{
          margin: 0, font: "600 56px/0.95 var(--font-display)",
          letterSpacing: "-0.03em", color: "var(--fg-0)",
        }}>Hand-built<br/>for serious operators.</h1>
      </div>
      {/* the one spectrum moment */}
      <div style={{
        position: "absolute", top: 388, left: 32, width: 180, height: 4,
        background: `linear-gradient(90deg, ${SPECTRUM.join(",")})`,
        borderRadius: 2,
      }} />
      <div style={{
        position: "absolute", top: 408, left: 32, right: 32,
        font: "400 14px/1.5 var(--font-sans)", color: "var(--fg-2)", maxWidth: 360,
      }}>The spectrum is a whisper — one 4px rule under the eyebrow, the rest silver.</div>
      <Footer left="V3 · Hairline" right="✕ Minimal" />
    </Frame>
  );
}

// ============================================================
// V4 — PIXEL TYPE  (wordmark / headline filled with spectrum)
// ============================================================
function V4Type() {
  return (
    <Frame bg="#0B0B10">
      <Header>Hero · type fill</Header>
      <div style={{
        position: "absolute", top: 140, left: 32, right: 32,
      }}>
        <div style={{
          font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--fg-2)", marginBottom: 24,
        }}>★ Spectrum type</div>
        <h1 style={{
          margin: 0,
          font: "700 96px/0.92 var(--font-pixel)",
          letterSpacing: "-0.01em",
          background: `linear-gradient(135deg, ${SPECTRUM.join(",")})`,
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
        }}>Pixcellor</h1>
        <div style={{
          font: "400 14px/1.5 var(--font-sans)", color: "var(--fg-2)",
          marginTop: 32, maxWidth: 380,
        }}>Wordmark + display heads filled with the full eight-colour spectrum. Reserve for the brand voice — never use on body copy.</div>
      </div>
      <Footer left="V4 · Type fill" right="✕ Wordmark" />
    </Frame>
  );
}

// ============================================================
// V5 — CONSTELLATION  (scattered colored stars)
// ============================================================
function V5Constellation() {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 80; i++) {
      arr.push({
        x: Math.random() * 100, y: Math.random() * 100,
        c: SPECTRUM[Math.floor(Math.random() * 8)],
        s: 2 + Math.random() * 4,
        o: 0.35 + Math.random() * 0.55,
      });
    }
    return arr;
  }, []);
  return (
    <Frame bg="#06060A">
      <Header>Hero · constellation</Header>
      <div style={{ position: "absolute", inset: 0 }}>
        {stars.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s,
            background: s.c, opacity: s.o,
            boxShadow: `0 0 ${s.s * 3}px ${s.c}`,
            borderRadius: 1,
          }} />
        ))}
      </div>
      <div style={{
        position: "absolute", top: 240, left: 32, right: 32, textAlign: "center",
      }}>
        <Wordmark height={36} />
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", marginTop: 14 }}>Studio · since 2024</div>
      </div>
      <Footer left="V5 · Constellation" right="✕ 80 px" />
    </Frame>
  );
}

// ============================================================
// V6 — PROGRESS BAR  (chunked pixel blocks)
// ============================================================
function V6Progress() {
  const total = 32, filled = 22;
  return (
    <Frame bg="#0B0B10">
      <Header>Build · progress</Header>
      <div style={{
        position: "absolute", top: 150, left: 32, right: 32,
      }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)" }}>Day 5 of 7</div>
        <h2 style={{ margin: "16px 0 0", font: "600 36px/1.05 var(--font-display)", letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          Shipping the studio
        </h2>
      </div>
      <div style={{
        position: "absolute", top: 290, left: 32, right: 32,
        display: "flex", gap: 3,
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 28,
            background: i < filled ? SPECTRUM[i % 8] : "rgba(244,244,242,0.06)",
            borderRadius: 2,
            boxShadow: i < filled ? `0 0 8px ${SPECTRUM[i % 8]}55` : "none",
          }} />
        ))}
      </div>
      <div style={{
        position: "absolute", top: 340, left: 32, right: 32,
        display: "flex", justifyContent: "space-between",
        font: "500 10px/1 var(--font-pixel)", color: "var(--fg-3)", letterSpacing: "0.1em",
      }}>
        <span>22 / 32 blocks</span>
        <span style={{
          background: `linear-gradient(135deg, ${SPECTRUM.join(",")})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          fontWeight: 600,
        }}>68%</span>
      </div>
      <Footer left="V6 · Progress" right="✕ 32 px" />
    </Frame>
  );
}

// ============================================================
// V7 — MARQUEE STRIP  (diagonal banner of spectrum blocks)
// ============================================================
function V7Marquee() {
  return (
    <Frame bg="#0B0B10">
      <Header>Hero · marquee</Header>
      {/* angled stripe */}
      <div style={{
        position: "absolute", top: 180, left: -60, right: -60,
        transform: "rotate(-6deg)",
        display: "flex", gap: 4,
        boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
      }}>
        {[...SPECTRUM, ...SPECTRUM].map((c, i) => (
          <div key={i} style={{ flex: 1, height: 80, background: c }} />
        ))}
      </div>
      {/* second thinner band */}
      <div style={{
        position: "absolute", top: 290, left: -60, right: -60,
        transform: "rotate(-6deg)",
        display: "flex", gap: 4,
      }}>
        {SPECTRUM.map((c, i) => (
          <div key={i} style={{ flex: 1, height: 14, background: c, opacity: 0.6 }} />
        ))}
      </div>
      <div style={{
        position: "absolute", top: 380, left: 32, right: 32,
      }}>
        <h2 style={{ margin: 0, font: "600 38px/1.0 var(--font-display)", letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          The studio<br/>has notes.
        </h2>
        <p style={{ margin: "12px 0 0", font: "400 13px/1.5 var(--font-sans)", color: "var(--fg-2)", maxWidth: 360 }}>
          Reserve the full spectrum stripe for hero announcements — campaign launches, release notes, hiring posts.
        </p>
      </div>
      <Footer left="V7 · Marquee" right="✕ Banner" />
    </Frame>
  );
}

// ============================================================
// V8 — COLOR-TAG CARDS  (one spectrum colour per tile)
// ============================================================
function V8TagCards() {
  const items = [
    { tag: "Web", color: SPECTRUM[0] },
    { tag: "Full-stack", color: SPECTRUM[1] },
    { tag: "Mobile", color: SPECTRUM[2] },
    { tag: "SEO", color: SPECTRUM[3] },
    { tag: "AEO", color: SPECTRUM[4] },
    { tag: "Web3", color: SPECTRUM[5] },
    { tag: "AI", color: SPECTRUM[6] },
    { tag: "Retainer", color: SPECTRUM[7] },
  ];
  return (
    <Frame bg="#0B0B10">
      <Header>Services · tag grid</Header>
      <div style={{
        position: "absolute", top: 84, left: 32, right: 32,
      }}>
        <h2 style={{ margin: 0, font: "600 28px/1.05 var(--font-display)", letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          Eight disciplines.
        </h2>
      </div>
      <div style={{
        position: "absolute", top: 160, left: 32, right: 32,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            position: "relative",
            padding: "16px 18px",
            background: "rgba(244,244,242,0.045)",
            border: "1px solid rgba(244,244,242,0.10)",
            borderRadius: 14,
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", gap: 12,
            overflow: "hidden",
          }}>
            {/* colored bar */}
            <div style={{
              width: 6, height: 32, background: it.color, borderRadius: 2,
              boxShadow: `0 0 12px ${it.color}88`,
            }} />
            <div>
              <div style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.2em", textTransform: "uppercase", color: it.color }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ font: "600 17px/1.1 var(--font-display)", color: "var(--fg-0)", marginTop: 4 }}>{it.tag}</div>
            </div>
          </div>
        ))}
      </div>
      <Footer left="V8 · Tag cards" right="✕ 8 hues" />
    </Frame>
  );
}

// ============================================================
// V9 — PIXEL MARK  (large P logo made of colored squares)
// ============================================================
function V9PixelMark() {
  // P-shape grid 6 wide × 8 tall
  const P = [
    "111110",
    "100001",
    "100001",
    "111110",
    "100000",
    "100000",
    "100000",
    "100000",
  ];
  const flagX = [
    "0001",
    "0010",
    "0100",
    "1000",
  ];
  const cell = 32;
  return (
    <Frame bg="#06060A">
      <Header>Brand · pixel mark</Header>
      <div style={{ position: "absolute", top: 120, left: 80 }}>
        {P.map((row, r) => (
          <div key={r} style={{ display: "flex" }}>
            {row.split("").map((c, i) => (
              <div key={i} style={{
                width: cell, height: cell,
                background: c === "1" ? SPECTRUM[(r + i) % 8] : "transparent",
                boxShadow: c === "1" ? `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.4)` : "none",
              }} />
            ))}
          </div>
        ))}
        {/* X flag — sits on top-right of P */}
        <div style={{ position: "absolute", top: 0, left: cell * 4 + 8, transform: "rotate(-8deg)", transformOrigin: "top left" }}>
          {flagX.map((row, r) => (
            <div key={r} style={{ display: "flex" }}>
              {row.split("").map((c, i) => (
                <div key={i} style={{
                  width: 14, height: 14,
                  background: c === "1" ? "var(--fg-0)" : "transparent",
                  border: c === "1" ? "1px solid rgba(0,0,0,0.4)" : "none",
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 80, left: 32, right: 32,
      }}>
        <Wordmark height={28} />
        <div style={{ font: "500 11px/1.5 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", marginTop: 14 }}>
          The mark, in 48 px
        </div>
      </div>
      <Footer left="V9 · Pixel mark" right="✕ 8-bit" />
    </Frame>
  );
}

// ============================================================
// V10 — WHISPER (silver-dominant, six tiny spectrum dots in corners)
// ============================================================
function V10Whisper() {
  return (
    <Frame bg="#0B0B10">
      <Header>Hero · whisper</Header>
      {/* corner sparkle */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
        {[
          { x: "12%", y: "15%", c: SPECTRUM[4] },
          { x: "85%", y: "10%", c: SPECTRUM[7] },
          { x: "92%", y: "30%", c: SPECTRUM[2] },
          { x: "8%", y: "45%", c: SPECTRUM[3] },
          { x: "88%", y: "78%", c: SPECTRUM[6] },
          { x: "16%", y: "92%", c: SPECTRUM[0] },
          { x: "62%", y: "12%", c: SPECTRUM[1] },
          { x: "40%", y: "88%", c: SPECTRUM[5] },
        ].map((d, i) => (
          <div key={i} style={{
            position: "absolute", left: d.x, top: d.y,
            width: 4, height: 4, background: d.c,
            boxShadow: `0 0 16px ${d.c}99`,
            opacity: 0.7,
          }} />
        ))}
      </div>
      {/* silver-plate emblem */}
      <div style={{
        position: "absolute", top: 200, left: "50%", transform: "translateX(-50%)",
        width: 88, height: 88, borderRadius: 22,
        background: "linear-gradient(180deg,#2E2D2A 0%,#4A4844 14%,#7A7872 30%,#6E6C66 48%,#888680 64%,#5C5A55 82%,#3A3835 100%)",
        border: "1px solid rgba(0,0,0,0.5)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.55), 0 14px 28px rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <img src="../../assets/logo-mark-white.png" style={{ width: 48, height: 48 }} alt="" />
      </div>
      <div style={{
        position: "absolute", top: 310, left: 32, right: 32, textAlign: "center",
      }}>
        <h2 style={{ margin: 0, font: "600 32px/1.05 var(--font-display)", letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          Quiet by default.
        </h2>
        <p style={{ margin: "12px auto 0", font: "400 14px/1.5 var(--font-sans)", color: "var(--fg-2)", maxWidth: 320 }}>
          Eight tiny spectrum dots in the corners — the Atelier baseline. Almost subliminal.
        </p>
      </div>
      <Footer left="V10 · Whisper" right="✕ 8 px" />
    </Frame>
  );
}

// ============================================================
// APP
// ============================================================
function App() {
  return (
    <DesignCanvas title="Pixel spectrum — 10 variations" subtitle="From the signature ring to the whisper baseline.">
      <DCSection id="ring" title="Hero treatments" subtitle="The pixel-spectrum as the main visual moment">
        <DCArtboard id="v1" label="V1 · The Ring (signature)" width={FRAME.width} height={FRAME.height}><V1Ring /></DCArtboard>
        <DCArtboard id="v2" label="V2 · Mosaic backdrop" width={FRAME.width} height={FRAME.height}><V2Mosaic /></DCArtboard>
        <DCArtboard id="v4" label="V4 · Wordmark filled" width={FRAME.width} height={FRAME.height}><V4Type /></DCArtboard>
        <DCArtboard id="v9" label="V9 · Pixel mark mosaic" width={FRAME.width} height={FRAME.height}><V9PixelMark /></DCArtboard>
        <DCArtboard id="v7" label="V7 · Diagonal marquee" width={FRAME.width} height={FRAME.height}><V7Marquee /></DCArtboard>
      </DCSection>

      <DCSection id="accents" title="Accent treatments" subtitle="Spectrum as an accent, not the hero">
        <DCArtboard id="v3" label="V3 · Hairline (minimal)" width={FRAME.width} height={FRAME.height}><V3Hairline /></DCArtboard>
        <DCArtboard id="v6" label="V6 · Pixel progress bar" width={FRAME.width} height={FRAME.height}><V6Progress /></DCArtboard>
        <DCArtboard id="v8" label="V8 · Color tag grid" width={FRAME.width} height={FRAME.height}><V8TagCards /></DCArtboard>
        <DCArtboard id="v5" label="V5 · Constellation" width={FRAME.width} height={FRAME.height}><V5Constellation /></DCArtboard>
        <DCArtboard id="v10" label="V10 · Whisper (baseline)" width={FRAME.width} height={FRAME.height}><V10Whisper /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
