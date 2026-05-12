import { useEffect, useRef, useState } from "react";

/**
 * Honeypot + time-trap anti-spam for public forms.
 *
 * - `honeypotValue` / `setHoneypotValue` back a hidden field bots tend to fill in.
 * - `isHuman()` returns false if the honeypot has any value OR the form was
 *   submitted suspiciously fast (< MIN_FILL_MS after mount).
 *
 * Render the hidden field with `<HoneypotField />` from "@/components/HoneypotField".
 */

const MIN_FILL_MS = 1500;

export function useAntiSpam() {
  const mountedAt = useRef<number>(Date.now());
  const [honeypotValue, setHoneypotValue] = useState("");

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const isHuman = () => {
    if (honeypotValue.trim().length > 0) return false;
    if (Date.now() - mountedAt.current < MIN_FILL_MS) return false;
    return true;
  };

  return { honeypotValue, setHoneypotValue, isHuman };
}
