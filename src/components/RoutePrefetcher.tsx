import { useEffect } from "react";

/**
 * Map of internal route path prefixes to their dynamic import factories.
 * Order matters: longer/more-specific prefixes first.
 * Vite dedupes these imports against the same `import()` calls in App.tsx,
 * so prefetching here warms the exact same chunk the router will use.
 */
const ROUTE_LOADERS: Array<{ test: (p: string) => boolean; load: () => Promise<unknown> }> = [
  { test: (p) => p.startsWith("/packages/"), load: () => import("@/pages/PackageDetail") },
  { test: (p) => p === "/packages", load: () => import("@/pages/Packages") },
  { test: (p) => p === "/portfolio", load: () => import("@/pages/Portfolio") },
  { test: (p) => p === "/work", load: () => import("@/pages/Work") },
  { test: (p) => p === "/services", load: () => import("@/pages/ServicesIndex") },
  { test: (p) => p.startsWith("/services/"), load: () => import("@/pages/ServicePage") },
  { test: (p) => p === "/get-started", load: () => import("@/pages/GetStarted") },
  { test: (p) => p === "/byow", load: () => import("@/pages/ByowLanding") },
  { test: (p) => p === "/customer-login", load: () => import("@/pages/CustomerAuth") },
  { test: (p) => p === "/customer-portal", load: () => import("@/pages/CustomerPortal") },
  { test: (p) => p === "/legal" || p.startsWith("/legal/"), load: () => import("@/pages/Legal") },
];

const warmed = new Set<string>();

function prefetchPath(path: string) {
  if (warmed.has(path)) return;
  const hit = ROUTE_LOADERS.find((r) => r.test(path));
  if (!hit) return;
  warmed.add(path);
  // Fire and forget — chunk lands in the browser cache.
  hit.load().catch(() => warmed.delete(path));
}

function extractInternalPath(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a");
  if (!anchor) return null;
  const href = anchor.getAttribute("href");
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  // Ignore download / new-tab links.
  if (anchor.hasAttribute("download")) return null;
  const target_ = anchor.getAttribute("target");
  if (target_ && target_ !== "_self") return null;
  return href.split("#")[0].split("?")[0];
}

/**
 * Mounted once near the app root. On hover, focus, or touchstart of an
 * internal link, warm only the route chunk the visitor is likely to use.
 */
export function RoutePrefetcher() {
  useEffect(() => {
    const onPointer = (e: Event) => {
      const path = extractInternalPath(e.target);
      if (path) prefetchPath(path);
    };

    // Use capture so we see the event before React stops propagation.
    document.addEventListener("pointerenter", onPointer, { capture: true, passive: true });
    document.addEventListener("focusin", onPointer, { capture: true });
    document.addEventListener("touchstart", onPointer, { capture: true, passive: true });

    return () => {
      document.removeEventListener("pointerenter", onPointer, { capture: true } as EventListenerOptions);
      document.removeEventListener("focusin", onPointer, { capture: true } as EventListenerOptions);
      document.removeEventListener("touchstart", onPointer, { capture: true } as EventListenerOptions);
    };
  }, []);

  return null;
}

export default RoutePrefetcher;
