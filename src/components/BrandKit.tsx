import { useEffect, useMemo } from "react";

export interface BrandPaletteEntry {
  name?: string;
  hex: string;
}

export interface BrandFontEntry {
  family: string;
  weights?: (number | string)[];
}

export interface BrandFonts {
  heading?: BrandFontEntry;
  body?: BrandFontEntry;
}

export interface BrandKitProps {
  palette?: BrandPaletteEntry[] | null;
  fonts?: BrandFonts | null;
  compact?: boolean;
  className?: string;
}

const loadedFonts = new Set<string>();

function ensureGoogleFont(family?: string, weights?: (number | string)[]) {
  if (!family || typeof document === "undefined") return;
  const cleaned = family.trim();
  if (!cleaned) return;
  const cacheKey = `${cleaned}|${(weights ?? []).join(",")}`;
  if (loadedFonts.has(cacheKey)) return;
  loadedFonts.add(cacheKey);
  const ws = (weights && weights.length ? weights : [400, 600, 700]).join(";");
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleaned).replace(/%20/g, "+")}:wght@${ws}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-brandkit-font", cleaned);
  document.head.appendChild(link);
}

export default function BrandKit({ palette, fonts, compact, className }: BrandKitProps) {
  const cleanPalette = useMemo(
    () => (palette ?? []).filter((p) => p && typeof p.hex === "string" && /^#?[0-9a-fA-F]{3,8}$/.test(p.hex.trim())),
    [palette],
  );
  const headingFamily = fonts?.heading?.family?.trim();
  const bodyFamily = fonts?.body?.family?.trim();

  useEffect(() => {
    ensureGoogleFont(headingFamily, fonts?.heading?.weights);
    ensureGoogleFont(bodyFamily, fonts?.body?.weights);
  }, [headingFamily, bodyFamily, fonts?.heading?.weights, fonts?.body?.weights]);

  if (cleanPalette.length === 0 && !headingFamily && !bodyFamily) return null;

  const swatchSize = compact ? "h-7 w-7" : "h-10 w-10";
  const labelSize = compact ? "text-[9px]" : "text-[10px]";

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {cleanPalette.length > 0 && (
        <div>
          <p className={`${labelSize} uppercase tracking-[0.18em] text-muted-foreground mb-1.5`}>Brand colours</p>
          <div className="flex flex-wrap gap-2">
            {cleanPalette.map((p, i) => {
              const hex = p.hex.startsWith("#") ? p.hex : `#${p.hex}`;
              return (
                <div key={`${hex}-${i}`} className="flex flex-col items-center gap-0.5">
                  <span
                    className={`${swatchSize} rounded-none border border-border/40 shadow-sm`}
                    style={{ backgroundColor: hex }}
                    title={`${p.name ? `${p.name} — ` : ""}${hex}`}
                  />
                  <span className={`${labelSize} text-muted-foreground font-mono`}>{hex.toUpperCase()}</span>
                  {p.name && !compact && (
                    <span className="text-[10px] text-muted-foreground/80 truncate max-w-[64px]">{p.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(headingFamily || bodyFamily) && (
        <div>
          <p className={`${labelSize} uppercase tracking-[0.18em] text-muted-foreground mb-1.5`}>Typography</p>
          <div className="space-y-1">
            {headingFamily && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`${labelSize} text-muted-foreground`}>Heading:</span>
                <span
                  className={compact ? "text-sm" : "text-base"}
                  style={{ fontFamily: `'${headingFamily}', system-ui, sans-serif`, fontWeight: 700 }}
                >
                  {headingFamily}
                </span>
              </div>
            )}
            {bodyFamily && (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`${labelSize} text-muted-foreground`}>Body:</span>
                <span
                  className={compact ? "text-sm" : "text-base"}
                  style={{ fontFamily: `'${bodyFamily}', system-ui, sans-serif`, fontWeight: 400 }}
                >
                  {bodyFamily}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
