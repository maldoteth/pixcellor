export type FontTriple = {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  googleHref: string;
};

// Loaded via injected <link> when picked. Stack falls back to system-ui.
export const FONT_PRESETS: FontTriple[] = [
  {
    key: "system",
    label: "System (default)",
    title: "system-ui",
    subtitle: "system-ui",
    body: "system-ui",
    googleHref: "",
  },
  {
    key: "inter-mix",
    label: "Inter / Inter / Inter",
    title: "Inter",
    subtitle: "Inter",
    body: "Inter",
    googleHref: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap",
  },
  {
    key: "space-inter",
    label: "Space Grotesk / Inter / Inter",
    title: "Space Grotesk",
    subtitle: "Inter",
    body: "Inter",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap",
  },
  {
    key: "playfair-inter",
    label: "Playfair Display / Inter / Inter",
    title: "Playfair Display",
    subtitle: "Inter",
    body: "Inter",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Playfair+Display:wght@600;800&display=swap",
  },
  {
    key: "dm-mono",
    label: "DM Serif Display / DM Sans / DM Sans",
    title: "DM Serif Display",
    subtitle: "DM Sans",
    body: "DM Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap",
  },
  {
    key: "manrope",
    label: "Manrope / Manrope / Manrope",
    title: "Manrope",
    subtitle: "Manrope",
    body: "Manrope",
    googleHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&display=swap",
  },
  {
    key: "fraunces-inter",
    label: "Fraunces / Inter / Inter",
    title: "Fraunces",
    subtitle: "Inter",
    body: "Inter",
    googleHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700&family=Inter:wght@400;500;700&display=swap",
  },
  {
    key: "ibm",
    label: "IBM Plex Sans / IBM Plex Sans / IBM Plex Sans",
    title: "IBM Plex Sans",
    subtitle: "IBM Plex Sans",
    body: "IBM Plex Sans",
    googleHref:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;700&display=swap",
  },
];

const LOADED = new Set<string>();
export function ensureFontLoaded(href: string) {
  if (!href || typeof document === "undefined" || LOADED.has(href)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  LOADED.add(href);
}
