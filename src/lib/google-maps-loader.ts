// Lazy-loads the Google Maps JS API (Places library) once.
declare global { interface Window { __gmapsLoader?: Promise<any>; google?: any; __initGMaps?: () => void; } }

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.__gmapsLoader) return window.__gmapsLoader;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps browser key not configured"));

  window.__gmapsLoader = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google); return; }
    window.__initGMaps = () => resolve(window.google);
    const params = new URLSearchParams({ key: BROWSER_KEY, v: "weekly", libraries: "places", loading: "async", callback: "__initGMaps" });
    if (CHANNEL) params.set("channel", CHANNEL);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__gmapsLoader;
}
