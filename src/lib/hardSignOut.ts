import { supabase } from "@/integrations/supabase/client";

/**
 * Sign the user out and force a hard navigation to a fresh home feed.
 * Clears local/session storage so switching accounts never inherits stale
 * cache, in-memory state, or React Query data from the previous user.
 */
export async function hardSignOut(target: string = "/") {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — we still want to wipe local state and redirect
  }

  try {
    // Wipe Supabase auth tokens and any app-scoped cached state
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") || k.startsWith("supabase.") || k.startsWith("pixcellor_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    // storage may be unavailable (private mode) — ignore
  }

  // Hard reload — drops React state, React Query cache, and any in-memory user data
  window.location.replace(target);
}
