import { useEffect } from "react";

export const PORTAL_REFRESH_EVENT = "portal:refresh";

/**
 * Fire a portal-wide refresh. Any component using `usePortalRefresh` re-runs
 * its loader without remounting / resetting local UI state (open dialogs,
 * scroll, selections, etc.).
 */
export function emitPortalRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_REFRESH_EVENT));
}

/**
 * Subscribe a panel to portal-wide refresh events. Pass the loader you'd
 * normally call inside a useEffect — it runs again every time the refresh
 * button is pressed.
 */
export function usePortalRefresh(loader: () => void | Promise<void>) {
  useEffect(() => {
    const handler = () => { void loader(); };
    window.addEventListener(PORTAL_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PORTAL_REFRESH_EVENT, handler);
  }, [loader]);
}
