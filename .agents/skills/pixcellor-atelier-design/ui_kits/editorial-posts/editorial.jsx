/* global React, ReactDOM */
const { useMemo } = React;

const FRAME = { width: 480, height: 600 };
const SPECTRUM = ["#E84B5A","#ED8A3F","#E8C46B","#8EC273","#5FB8C9","#5476B8","#8C70B8","#C26BA0"];

// ── shared chrome ──────────────────────────────────────────────
function Frame({ children, bg }) {
  return (
    <div style={{
      width: FRAME.width, height: FRAME.height,
      position: "relative", overflow: "hidden",
      background: bg || "var(--bg-0)",
      color: "var(--fg-0)",
      fontFamily: "var(--font-sans)",
    }}>
      {children}
    </div>
  );
}
function Header({ children }) {
  return (
    <div style={{
      position: "absolute", top: 24, left: 32, right: 32,
      display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5,
    }}>
      <img src="../../assets/logo-wordmark-white.png" alt="" style={{ height: 18 }} />
      <span style={{
        font: "500 9px/1 var(--font-pixel)",
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--fg-2)",
      }}>{children}</span>
    </div>
  );
}
function Footer({ left, right }) {
  return (
    <div style={{
      position: "absolute", bottom: 22, left: 32, right: 32,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.08em",
      color: "var(--fg-3)", zIndex: 5,
    }}>
      <span>{left}</span><span>{right}</span>
    </div>
  );
}
// Tiny 8-pip spectrum row — the subtle signature
function PixRow({ size = 5, gap = 4, opacity = 0.85, style = {} }) {
  return (
    <div style={{ display: "flex", gap, ...style }}>
      {SPECTRUM.map((c, i) => (
        <div key={i} style={{ width: size, height: size, background: c, opacity }} />
      ))}
    </div>
  );
}
// Italic Fraunces helper
function Em({ children, size }) {
  return <em style={{
    font: `500 italic ${size}px/1 var(--font-editorial)`,
    fontStyle: "italic",
    background: "linear-gradient(135deg,#FBE8B0,#C99B3F 35%,#8E6620 55%,#ECC971 75%,#FBE8B0)",
    WebkitBackgroundClip: "text", backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  }}>{children}</em>;
}

// ============================================================
// E1 — MANIFESTO
// ============================================================
function E1Manifesto() {
  return (
    <Frame>
      <Header>★ Studio notes · 022</Header>
      <div style={{ position: "absolute", top: 88, left: 32, right: 32 }}>
        <div style={{ font: "600 36px/1.0 var(--font-pixel)", letterSpacing: "-0.01em",
          background: "linear-gradient(135deg,#FBE8B0,#C99B3F 40%,#8E6620 60%,#FBE8B0)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>“</div>
      </div>
      <h2 style={{
        position: "absolute", top: 168, left: 32, right: 32, margin: 0,
        font: "600 38px/1.05 var(--font-display)", letterSpacing: "-0.025em", color: "var(--fg-0)",
      }}>
        We don't optimise<br/>for engagement.<br/>We optimise for <Em size={38}>shipped</Em>.
      </h2>

      <div style={{ position: "absolute", top: 420, left: 32, width: 60, height: 1, background: "linear-gradient(90deg,#FBE8B0,#C99B3F,#8E6620)" }} />
      <div style={{ position: "absolute", top: 436, left: 32, right: 32 }}>
        <div style={{ font: "500 13px/1.2 var(--font-sans)", color: "var(--fg-0)" }}>The studio manifesto</div>
        <div style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-2)", marginTop: 6 }}>
          From the atelier · vol. 02
        </div>
      </div>
      <PixRow size={4} gap={3} opacity={0.7} style={{ position: "absolute", bottom: 60, left: 32 }} />
      <Footer left="E1 · Manifesto" right="✕" />
    </Frame>
  );
}

// ============================================================
// E2 — STAT
// ============================================================
function E2Stat() {
  return (
    <Frame>
      <Header>▦ Build · benchmark</Header>
      <div style={{ position: "absolute", top: 100, left: 32 }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 28, height: 1, background: "linear-gradient(90deg,#FBE8B0,#C99B3F)" }} />
          Every Atelier build
        </div>
      </div>
      <div style={{ position: "absolute", top: 150, left: 32, right: 32, display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          font: "600 232px/0.85 var(--font-display)", letterSpacing: "-0.05em",
          background: "linear-gradient(135deg,#FBE8B0,#ECC971 25%,#C99B3F 50%,#8E6620 65%,#ECC971 85%,#FBE8B0)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 16px 28px rgba(201,155,63,0.25))",
        }}>0.8</span>
        <span style={{ font: "600 80px/1 var(--font-display)", color: "var(--fg-2)" }}>s</span>
        <div style={{ width: 4, height: 4, background: SPECTRUM[4], boxShadow: `0 0 12px ${SPECTRUM[4]}`, marginLeft: 6, alignSelf: "center" }} />
      </div>
      <div style={{ position: "absolute", top: 400, left: 32, right: 32 }}>
        <div style={{ font: "600 18px/1.2 var(--font-display)", letterSpacing: "-0.015em", color: "var(--fg-0)" }}>
          LCP target. Hit, or we don't ship.
        </div>
        <p style={{ margin: "8px 0 0", font: "400 13px/1.5 var(--font-sans)", color: "var(--fg-2)", maxWidth: 380 }}>
          Largest contentful paint under 800&thinsp;ms — measured on a mid-tier device over 3G. No exceptions.
        </p>
      </div>
      <PixRow size={4} gap={3} opacity={0.6} style={{ position: "absolute", bottom: 60, left: 32 }} />
      <Footer left="E2 · Stat" right="✕ 0.8s" />
    </Frame>
  );
}

// ============================================================
// E3 — THEN / NOW
// ============================================================
function E3ThenNow() {
  return (
    <Frame>
      <Header>★ The studio · cadence</Header>
      <div style={{ position: "absolute", top: 88, left: 32, right: 32 }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)" }}>
          Then &nbsp;·&nbsp; Now
        </div>
      </div>
      {/* Then row */}
      <div style={{ position: "absolute", top: 150, left: 32, right: 32, paddingBottom: 26, borderBottom: "1px solid rgba(244,244,242,0.10)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <em style={{ font: "500 italic 24px/1 var(--font-editorial)", color: "var(--fg-3)" }}>Then</em>
          <div style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-3)" }}>2019 · agency era</div>
        </div>
        <div style={{ font: "600 60px/1 var(--font-display)", letterSpacing: "-0.025em", color: "var(--fg-2)", marginTop: 8 }}>
          6 weeks<span style={{ color: "var(--fg-3)" }}> to launch.</span>
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 14 }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, background: "rgba(244,244,242,0.10)" }} />
          ))}
        </div>
      </div>
      {/* Now row */}
      <div style={{ position: "absolute", top: 340, left: 32, right: 32, paddingBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <em style={{ font: "500 italic 24px/1 var(--font-editorial)",
            background: "linear-gradient(135deg,#FBE8B0,#C99B3F)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Now</em>
          <div style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-2)" }}>2026 · atelier</div>
        </div>
        <div style={{ font: "600 60px/1 var(--font-display)", letterSpacing: "-0.025em", color: "var(--fg-0)", marginTop: 8 }}>
          7 days<span style={{ color: "var(--fg-2)" }}> to ship.</span>
        </div>
        {/* spectrum mini bar */}
        <div style={{ display: "flex", gap: 3, marginTop: 14 }}>
          {[...SPECTRUM, ...SPECTRUM, ...SPECTRUM].map((c, i) => (
            <div key={i} style={{ flex: 1, height: 4, background: c, opacity: 0.85 }} />
          ))}
        </div>
      </div>
      <Footer left="E3 · Then / Now" right="✕ 1/9 the time" />
    </Frame>
  );
}

// ============================================================
// E4 — TESTIMONIAL
// ============================================================
function E4Testimonial() {
  return (
    <Frame>
      <Header>★ Client note · 003</Header>
      <div style={{
        position: "absolute", top: 110, left: 32,
        font: "600 64px/0.6 var(--font-editorial)",
        background: "linear-gradient(135deg,#FBE8B0,#C99B3F)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        opacity: 0.9,
      }}>“</div>
      <p style={{
        position: "absolute", top: 170, left: 32, right: 32, margin: 0,
        font: "500 26px/1.3 var(--font-display)", letterSpacing: "-0.015em", color: "var(--fg-0)",
      }}>
        They quoted £500. The site that came back<br/>
        was <Em size={26}>better</Em> than the £18&thinsp;000 one<br/>
        we'd been quoted elsewhere.
      </p>

      {/* author block */}
      <div style={{ position: "absolute", bottom: 100, left: 32, right: 32, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "linear-gradient(180deg,#2E2D2A,#7A7872 30%,#888680 60%,#3A3835)",
          border: "1px solid rgba(0,0,0,0.5)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          font: "600 18px/1 var(--font-pixel)", color: "#F4F2EE",
        }}>R</div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 14px/1.2 var(--font-sans)", color: "var(--fg-0)" }}>Rohit — founder, DeHub</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ width: 4, height: 4, background: SPECTRUM[0] }} />
            <div style={{ width: 4, height: 4, background: SPECTRUM[3] }} />
            <div style={{ width: 4, height: 4, background: SPECTRUM[6] }} />
            <span style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-3)", marginLeft: 4 }}>
              Verified · 14 Aug
            </span>
          </div>
        </div>
      </div>
      <Footer left="E4 · Testimonial" right="✕" />
    </Frame>
  );
}

// ============================================================
// E5 — VOLUME COVER
// ============================================================
function E5Volume() {
  return (
    <Frame>
      <Header>★ The atelier · catalogue</Header>
      <div style={{ position: "absolute", top: 116, left: 32 }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)" }}>
          A catalogue of work
        </div>
        <div style={{
          marginTop: 18,
          font: "600 200px/0.85 var(--font-display)", letterSpacing: "-0.05em",
          color: "var(--fg-0)",
        }}>Vol.
        </div>
        <div style={{
          marginTop: -10,
          font: "600 200px/0.85 var(--font-display)", letterSpacing: "-0.05em",
          background: "linear-gradient(135deg,#FBE8B0,#ECC971 25%,#C99B3F 50%,#8E6620 65%,#ECC971 85%,#FBE8B0)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 16px 28px rgba(201,155,63,0.20))",
        }}>02</div>
      </div>
      <div style={{ position: "absolute", bottom: 90, left: 32, right: 32 }}>
        <div style={{ height: 1, background: "linear-gradient(90deg,#FBE8B0,#C99B3F,#8E6620,transparent)", marginBottom: 16 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ font: "600 13px/1.2 var(--font-display)", color: "var(--fg-0)" }}>Twenty-six builds, one studio</div>
            <div style={{ font: "500 9px/1 var(--font-pixel)", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-3)", marginTop: 6 }}>2025–2026 · Pixcellor</div>
          </div>
          <PixRow size={4} gap={3} opacity={0.6} />
        </div>
      </div>
      <Footer left="E5 · Volume" right="✕ cover" />
    </Frame>
  );
}

// ============================================================
// E6 — RULES LIST
// ============================================================
function E6Rules() {
  const items = [
    "We won't template.",
    "We won't outsource.",
    "We won't ghost.",
    "We won't pad timelines.",
    "We won't ship slow.",
  ];
  return (
    <Frame>
      <Header>★ The atelier · rules</Header>
      <h2 style={{
        position: "absolute", top: 88, left: 32, right: 32, margin: 0,
        font: "600 36px/1.0 var(--font-display)", letterSpacing: "-0.025em", color: "var(--fg-0)",
      }}>
        Five things<br/>we <Em size={36}>won't</Em> do.
      </h2>
      <div style={{ position: "absolute", top: 220, left: 32, right: 32, display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 18,
            padding: "14px 0",
            borderBottom: i < items.length - 1 ? "1px solid rgba(244,244,242,0.08)" : "none",
          }}>
            <span style={{
              font: "600 11px/1 var(--font-pixel)", letterSpacing: "0.18em",
              color: "var(--fg-3)", width: 32,
            }}>0{i + 1}</span>
            <div style={{ width: 6, height: 6, background: SPECTRUM[i + 1], boxShadow: `0 0 8px ${SPECTRUM[i + 1]}66` }} />
            <span style={{ font: "500 20px/1.1 var(--font-display)", letterSpacing: "-0.015em", color: "var(--fg-0)", flex: 1 }}>{it}</span>
          </div>
        ))}
      </div>
      <Footer left="E6 · Rules" right="✕ five" />
    </Frame>
  );
}

// ============================================================
// E7 — CURSOR MOMENT
// ============================================================
function E7Cursor() {
  return (
    <Frame>
      <Header>★ Live from the studio</Header>
      <div style={{ position: "absolute", top: 170, left: 32, right: 32 }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)", marginBottom: 24 }}>
          Currently shipping —
        </div>
        <h1 style={{
          margin: 0,
          font: "600 56px/1.0 var(--font-display)", letterSpacing: "-0.03em", color: "var(--fg-0)",
          display: "inline",
        }}>
          We make <Em size={56}>websites</Em>
        </h1>
        {/* the cursor */}
        <span style={{
          display: "inline-block",
          width: 8, height: 56, marginLeft: 6, verticalAlign: "-8px",
          background: SPECTRUM[4],
          boxShadow: `0 0 14px ${SPECTRUM[4]}aa`,
          animation: "blink 1s steps(2) infinite",
        }} />
        <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
      </div>
      <div style={{ position: "absolute", bottom: 130, left: 32, right: 32 }}>
        <div style={{ height: 1, background: "rgba(244,244,242,0.1)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, alignItems: "center" }}>
          <span style={{ font: "500 12px/1.2 var(--font-sans)", color: "var(--fg-1)" }}>3 builds shipping this week.</span>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 6, height: 6, background: SPECTRUM[3] }} />
            <div style={{ width: 6, height: 6, background: SPECTRUM[3] }} />
            <div style={{ width: 6, height: 6, background: SPECTRUM[3] }} />
          </div>
        </div>
      </div>
      <Footer left="E7 · Cursor" right="✕ live" />
    </Frame>
  );
}

// ============================================================
// E8 — INDEX (table of contents)
// ============================================================
function E8Index() {
  const rows = [
    { ch: "01", title: "What we build", page: "002" },
    { ch: "02", title: "The studio cadence", page: "008" },
    { ch: "03", title: "Pricing, plainly", page: "014" },
    { ch: "04", title: "Selected work", page: "022" },
    { ch: "05", title: "Letters from clients", page: "036" },
    { ch: "06", title: "The team behind it", page: "044" },
  ];
  return (
    <Frame>
      <Header>★ Vol. 02 · index</Header>
      <div style={{ position: "absolute", top: 110, left: 32, right: 32 }}>
        <div style={{ font: "500 11px/1 var(--font-pixel)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--fg-2)" }}>
          Inside this volume
        </div>
        <h2 style={{ margin: "16px 0 0", font: "600 38px/1.0 var(--font-display)", letterSpacing: "-0.025em", color: "var(--fg-0)" }}>
          <Em size={38}>Six</Em> chapters.
        </h2>
      </div>
      <div style={{ position: "absolute", top: 250, left: 32, right: 32 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 12px 1fr auto",
            alignItems: "center", gap: 14,
            padding: "12px 0",
            borderBottom: i < rows.length - 1 ? "1px solid rgba(244,244,242,0.08)" : "none",
          }}>
            <span style={{ font: "500 10px/1 var(--font-pixel)", letterSpacing: "0.18em", color: "var(--fg-3)" }}>{r.ch}</span>
            <span style={{ width: 4, height: 4, background: SPECTRUM[i] }} />
            <span style={{ font: "500 16px/1.2 var(--font-sans)", color: "var(--fg-0)" }}>{r.title}</span>
            <span style={{ font: "500 11px/1 var(--font-mono)", color: "var(--fg-3)" }}>{r.page}</span>
          </div>
        ))}
      </div>
      <Footer left="E8 · Index" right="✕ 6 ch" />
    </Frame>
  );
}

// ============================================================
// APP
// ============================================================
function App() {
  return (
    <DesignCanvas title="Editorial posts · subtle pixel touches" subtitle="Dark, jeweled, restrained. The spectrum is a whisper.">
      <DCSection id="editorial" title="Atelier — editorial set" subtitle="More posts in the quote / carousel register">
        <DCArtboard id="e1" label="E1 · Manifesto" width={FRAME.width} height={FRAME.height}><E1Manifesto /></DCArtboard>
        <DCArtboard id="e2" label="E2 · Stat (0.8s)" width={FRAME.width} height={FRAME.height}><E2Stat /></DCArtboard>
        <DCArtboard id="e3" label="E3 · Then / Now" width={FRAME.width} height={FRAME.height}><E3ThenNow /></DCArtboard>
        <DCArtboard id="e4" label="E4 · Testimonial" width={FRAME.width} height={FRAME.height}><E4Testimonial /></DCArtboard>
        <DCArtboard id="e5" label="E5 · Volume cover" width={FRAME.width} height={FRAME.height}><E5Volume /></DCArtboard>
        <DCArtboard id="e6" label="E6 · Rules list" width={FRAME.width} height={FRAME.height}><E6Rules /></DCArtboard>
        <DCArtboard id="e7" label="E7 · Cursor" width={FRAME.width} height={FRAME.height}><E7Cursor /></DCArtboard>
        <DCArtboard id="e8" label="E8 · Index" width={FRAME.width} height={FRAME.height}><E8Index /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
