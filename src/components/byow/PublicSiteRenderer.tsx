import { CSSProperties, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

export type SiteDoc = {
  brand: {
    logo_url?: string;
    colors: { primary: string; accent: string; bg: string; surface: string; text: string; muted: string };
    fonts: { title: string; subtitle: string; body: string };
    font_href?: string;
  };
  sections: any[];
};

function getIcon(name: string) {
  const C = (LucideIcons as any)[name];
  return C || Sparkles;
}

export default function PublicSiteRenderer({ doc }: { doc: SiteDoc }) {
  const { brand, sections } = doc;
  const c = brand.colors;

  useEffect(() => {
    if (brand.font_href) {
      const id = `byow-font-${btoa(brand.font_href).slice(0, 12)}`;
      if (!document.getElementById(id)) {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = brand.font_href;
        l.id = id;
        document.head.appendChild(l);
      }
    }
  }, [brand.font_href]);

  const styleVars: CSSProperties = {
    // @ts-ignore CSS vars
    "--bp": c.primary, "--ba": c.accent, "--bbg": c.bg, "--bsurf": c.surface,
    "--btext": c.text, "--bmuted": c.muted,
    "--ftitle": `'${brand.fonts.title}', system-ui, sans-serif`,
    "--fsub": `'${brand.fonts.subtitle}', system-ui, sans-serif`,
    "--fbody": `'${brand.fonts.body}', system-ui, sans-serif`,
    background: c.bg,
    color: c.text,
    fontFamily: `var(--fbody)`,
  };

  return (
    <div style={styleVars} className="min-h-screen">
      {/* Top bar */}
      <header className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: c.muted + "33" }}>
        <div className="flex items-center gap-3">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-md" style={{ background: c.primary }} />
          )}
        </div>
        <a href="#contact" className="text-sm px-4 py-2 rounded-md font-medium" style={{ background: c.primary, color: c.bg, fontFamily: "var(--fsub)" }}>
          Get in touch
        </a>
      </header>

      {sections.map((s, i) => {
        switch (s.type) {
          case "hero":
            return (
              <section key={i} className="px-6 py-24 max-w-5xl mx-auto text-center">
                {s.eyebrow && (
                  <div className="inline-block text-xs uppercase tracking-widest mb-5 px-3 py-1 rounded-full border" style={{ borderColor: c.muted + "44", color: c.muted, fontFamily: "var(--fsub)" }}>
                    {s.eyebrow}
                  </div>
                )}
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight" style={{ fontFamily: "var(--ftitle)", color: c.text }}>
                  {s.headline}
                </h1>
                <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: c.muted, fontFamily: "var(--fbody)" }}>{s.sub}</p>
                <a href={s.cta_href || "#contact"} className="inline-block mt-8 px-7 py-3 rounded-md font-semibold" style={{ background: c.primary, color: c.bg, fontFamily: "var(--fsub)" }}>
                  {s.cta_label}
                </a>
              </section>
            );
          case "features":
            return (
              <section key={i} className="px-6 py-20" style={{ background: c.surface }}>
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: "var(--ftitle)" }}>{s.title}</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                    {s.items?.map((it: any, k: number) => {
                      const Icon = getIcon(it.icon);
                      return (
                        <div key={k} className="p-6 rounded-xl border" style={{ borderColor: c.muted + "33", background: c.bg }}>
                          <Icon className="h-6 w-6" style={{ color: c.accent }} />
                          <div className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--fsub)" }}>{it.title}</div>
                          <p className="mt-2 text-sm leading-relaxed" style={{ color: c.muted }}>{it.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          case "pricing":
            return (
              <section key={i} className="px-6 py-20">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: "var(--ftitle)" }}>{s.title}</h2>
                  <div className="grid md:grid-cols-3 gap-5 mt-12">
                    {s.tiers?.map((t: any, k: number) => (
                      <div
                        key={k}
                        className="p-6 rounded-xl border flex flex-col"
                        style={{
                          borderColor: t.featured ? c.primary : c.muted + "33",
                          background: t.featured ? c.surface : c.bg,
                          boxShadow: t.featured ? `0 0 0 2px ${c.primary}33` : "none",
                        }}
                      >
                        <div className="text-sm uppercase tracking-wider" style={{ color: c.muted, fontFamily: "var(--fsub)" }}>{t.name}</div>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-4xl font-bold" style={{ fontFamily: "var(--ftitle)" }}>{t.price}</span>
                          {t.per && <span className="text-sm" style={{ color: c.muted }}>{t.per}</span>}
                        </div>
                        <p className="text-sm mt-3" style={{ color: c.muted }}>{t.blurb}</p>
                        <ul className="mt-5 space-y-2 flex-1">
                          {t.features?.map((f: string, j: number) => (
                            <li key={j} className="text-sm flex gap-2"><span style={{ color: c.accent }}>✓</span> {f}</li>
                          ))}
                        </ul>
                        <a href="#contact" className="mt-6 inline-block px-5 py-2.5 rounded-md text-center text-sm font-semibold" style={{ background: t.featured ? c.primary : "transparent", color: t.featured ? c.bg : c.text, border: t.featured ? "none" : `1px solid ${c.muted}55`, fontFamily: "var(--fsub)" }}>
                          Choose {t.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          case "faq":
            return (
              <section key={i} className="px-6 py-20" style={{ background: c.surface }}>
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: "var(--ftitle)" }}>{s.title}</h2>
                  <div className="mt-10 space-y-3">
                    {s.items?.map((q: any, k: number) => (
                      <details key={k} className="rounded-xl border p-4" style={{ borderColor: c.muted + "33", background: c.bg }}>
                        <summary className="cursor-pointer font-semibold" style={{ fontFamily: "var(--fsub)" }}>{q.q}</summary>
                        <p className="mt-2 text-sm" style={{ color: c.muted }}>{q.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            );
          case "contact":
            return (
              <section key={i} id="contact" className="px-6 py-24 text-center">
                <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--ftitle)" }}>{s.title}</h2>
                {s.sub && <p className="mt-3" style={{ color: c.muted }}>{s.sub}</p>}
                <a href={`mailto:${s.email}`} className="inline-block mt-6 px-7 py-3 rounded-md font-semibold" style={{ background: c.primary, color: c.bg, fontFamily: "var(--fsub)" }}>
                  {s.email}
                </a>
              </section>
            );
          case "footer":
            return (
              <footer key={i} className="px-6 py-10 border-t" style={{ borderColor: c.muted + "22" }}>
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm" style={{ color: c.muted }}>
                  <div>{s.tagline}</div>
                  <div className="flex gap-4">
                    {s.links?.map((l: any, k: number) => (
                      <a key={k} href={l.href} className="hover:underline">{l.label}</a>
                    ))}
                  </div>
                </div>
              </footer>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
