import type { TemplatePreview } from "./templates";

/**
 * Tiny CSS-only "site wireframe" thumbnail.
 * Renders distinct mini layouts (hero shape, sections) using the template's
 * palette so each card is visually unique without needing AI imagery.
 */
export function TemplateThumb({ preview, label }: { preview: TemplatePreview; label: string }) {
  const { bg, surface, accent, text, shape } = preview;
  const dim = (op: number) => `${text}${Math.round(op * 255).toString(16).padStart(2, "0")}`;

  const Block = ({ w, h, c, r = 2, style }: { w: string; h: string; c: string; r?: number; style?: React.CSSProperties }) => (
    <div style={{ width: w, height: h, background: c, borderRadius: r, ...style }} />
  );

  const Bar = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderBottom: `1px solid ${dim(0.08)}` }}>
      <Block w="22%" h="6px" c={text} r={2} />
      <div style={{ display: "flex", gap: 4 }}>
        <Block w="18px" h="4px" c={dim(0.4)} />
        <Block w="18px" h="4px" c={dim(0.4)} />
        <Block w="26px" h="6px" c={accent} r={3} />
      </div>
    </div>
  );

  const SectionGap = () => <div style={{ height: 6 }} />;

  const Hero = () => {
    switch (shape) {
      case "hero-image-right":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 6, padding: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              <Block w="40%" h="4px" c={dim(0.4)} />
              <Block w="90%" h="9px" c={text} />
              <Block w="70%" h="9px" c={text} />
              <Block w="50%" h="4px" c={dim(0.5)} />
              <Block w="28%" h="9px" c={accent} r={4} style={{ marginTop: 2 }} />
            </div>
            <Block w="100%" h="56px" c={surface} r={4} />
          </div>
        );
      case "hero-centered":
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 12 }}>
            <Block w="26%" h="4px" c={accent} />
            <Block w="78%" h="9px" c={text} />
            <Block w="60%" h="9px" c={text} />
            <Block w="50%" h="4px" c={dim(0.5)} />
            <Block w="30%" h="9px" c={accent} r={4} style={{ marginTop: 2 }} />
          </div>
        );
      case "hero-split-bold":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 0 }}>
            <div style={{ background: text, padding: 10, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              <Block w="80%" h="10px" c={bg} />
              <Block w="60%" h="10px" c={bg} />
              <Block w="40%" h="7px" c={accent} r={3} style={{ marginTop: 4 }} />
            </div>
            <Block w="100%" h="66px" c={accent} r={0} />
          </div>
        );
      case "hero-editorial":
        return (
          <div style={{ padding: 10, textAlign: "center" }}>
            <Block w="40%" h="4px" c={dim(0.4)} style={{ margin: "0 auto" }} />
            <div style={{ height: 4 }} />
            <Block w="84%" h="14px" c={text} style={{ margin: "0 auto" }} />
            <div style={{ height: 4 }} />
            <Block w="60%" h="4px" c={dim(0.4)} style={{ margin: "0 auto" }} />
          </div>
        );
      case "hero-fullbleed":
        return (
          <div style={{ position: "relative" }}>
            <Block w="100%" h="66px" c={surface} r={0} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 8, gap: 3 }}>
              <Block w="60%" h="8px" c={bg === "#FFFFFF" ? "#0A0A0A" : "#FFFFFF"} />
              <Block w="28%" h="6px" c={accent} r={3} />
            </div>
          </div>
        );
      case "hero-grid":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Block key={i} w="100%" h="22px" c={i % 3 === 1 ? accent : surface} r={3} />
            ))}
          </div>
        );
      case "hero-bento":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gridTemplateRows: "1fr 1fr", gap: 4, padding: 8, height: 66 }}>
            <Block w="100%" h="100%" c={accent} r={4} style={{ gridRow: "span 2" }} />
            <Block w="100%" h="100%" c={surface} r={4} />
            <Block w="100%" h="100%" c={text} r={4} />
          </div>
        );
      case "hero-mono":
        return (
          <div style={{ padding: 8, fontFamily: "ui-monospace, monospace" }}>
            <Block w="30%" h="4px" c={accent} />
            <div style={{ height: 4 }} />
            <Block w="92%" h="8px" c={text} />
            <div style={{ height: 3 }} />
            <Block w="74%" h="6px" c={dim(0.6)} />
            <div style={{ height: 6 }} />
            <Block w="60%" h="10px" c={surface} r={2} />
          </div>
        );
    }
  };

  const Features = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, padding: "0 8px" }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Block w="40%" h="6px" c={accent} r={2} />
          <Block w="100%" h="4px" c={dim(0.25)} />
          <Block w="70%" h="4px" c={dim(0.25)} />
        </div>
      ))}
    </div>
  );

  return (
    <div
      aria-label={`${label} template preview`}
      style={{
        width: "100%",
        aspectRatio: "16 / 10",
        background: bg,
        color: text,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)",
        position: "relative",
      }}
    >
      <Bar />
      <Hero />
      <SectionGap />
      <Features />
    </div>
  );
}
