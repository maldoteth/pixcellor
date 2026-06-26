/* global React, ReactDOM, DesignCanvas, DCSection, DCArtboard */

const SPEC = ["#E84B5A","#ED8A3F","#E8C46B","#8EC273","#5FB8C9","#5476B8","#8C70B8","#C26BA0"];

function Dots({ accent }) {
  const i = SPEC.indexOf(accent);
  const conf = [
    { l:"86%", t:"30%", c:accent, s:7, o:0.6 },
    { l:"92%", t:"58%", c:SPEC[((i+3)%8+8)%8] || "#5FB8C9", s:6, o:0.4 },
    { l:"79%", t:"76%", c:SPEC[((i+5)%8+8)%8] || "#C26BA0", s:5, o:0.4 },
  ];
  return conf.map((d,k)=>(
    <span key={k} style={{ position:"absolute", left:d.l, top:d.t, width:d.s, height:d.s,
      background:d.c, opacity:d.o, borderRadius:1, boxShadow:`0 0 18px ${d.c}`, zIndex:1 }} />
  ));
}

function ShareCard({ p }) {
  const titleSize = p.size === "lg" ? 88 : p.size === "sm" ? 58 : 72;
  return (
    <div style={{
      width:1200, height:630, position:"relative", overflow:"hidden",
      background:`radial-gradient(900px 600px at 100% -20%, color-mix(in srgb, ${p.accent} 14%, transparent), transparent 60%), #0B0B10`,
      color:"#F4F4F2", fontFamily:'"Geist",sans-serif',
    }}>
      <Dots accent={p.accent} />
      <div style={{ position:"absolute", inset:0, padding:"60px 72px", display:"flex", flexDirection:"column", justifyContent:"space-between", zIndex:2 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <img src="assets/logo-wordmark-white.png" alt="Pixcellor" style={{ height:32, display:"block" }} />
          <span style={{ font:'500 16px/1 "Pixelify Sans",monospace', letterSpacing:"0.18em", textTransform:"uppercase", color:"#6A6A66" }}>{p.cat}</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", alignItems:"center", gap:18, font:'500 19px/1 "Pixelify Sans",monospace', letterSpacing:"0.2em", textTransform:"uppercase", color:"#9A9A95", marginBottom:24 }}>
            <span style={{ width:54, height:2, borderRadius:1, background:"linear-gradient(135deg,#FBE8B0,#C99B3F 35%,#8E6620 55%,#ECC971 75%,#FBE8B0)" }} />
            {p.eyebrow}
          </div>
          <h1 style={{ margin:0, font:`600 ${titleSize}px/1.0 "Geist",sans-serif`, letterSpacing:"-0.03em", color:"#F4F4F2", maxWidth:1000, textWrap:"balance" }}
            dangerouslySetInnerHTML={{ __html: p.title.replace(/<em>/g,'<em style="font:500 italic 1em/1 \'Fraunces\',serif;background:linear-gradient(135deg,#FBE8B0,#C99B3F 35%,#8E6620 55%,#ECC971 75%,#FBE8B0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">') }} />
          <p style={{ margin:"22px 0 0", font:'400 27px/1.4 "Geist",sans-serif', color:"#9A9A95", maxWidth:840 }}>{p.sub}</p>
          {p.chip && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:10, marginTop:26, padding:"11px 20px", borderRadius:999, width:"fit-content",
              background:"conic-gradient(from 210deg at 50% 50%,#FBE8B0,#ECC971 60deg,#C99B3F 120deg,#8E6620 180deg,#C99B3F 240deg,#ECC971 300deg,#FBE8B0)",
              color:"#1A1208", border:"1px solid rgba(142,102,32,0.6)", boxShadow:"inset 0 1px 0 rgba(255,255,255,0.45)", font:'600 22px/1 "Geist",sans-serif' }}>★ {p.chip}</span>
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ font:'500 19px/1 "Geist Mono",monospace', color:"#6A6A66", letterSpacing:"0.02em" }}>{p.url}</span>
          <span style={{ display:"flex", gap:14, font:'600 20px/1 "Pixelify Sans",monospace', color:"#6A6A66" }}>▦&nbsp;&nbsp;✕</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const pages = window.SHARE_PAGES || [];
  const sections = [];
  const order = [];
  pages.forEach(p => { if(!order.includes(p.sec)){ order.push(p.sec); } });
  return (
    <DesignCanvas title="Pixcellor — Share images (1200×630)" subtitle="⋯ on any card → Download PNG for an exact og:image. Grouped by section.">
      {order.map(sec => (
        <DCSection key={sec} id={sec} title={sec} subtitle={`${pages.filter(p=>p.sec===sec).length} page(s)`}>
          {pages.filter(p=>p.sec===sec).map(p => (
            <DCArtboard key={p.file} id={p.file} label={p.file.replace(/^\d+-/,'') + " · " + p.url.replace('pixcellor.com','')} width={1200} height={630}>
              <ShareCard p={p} />
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
