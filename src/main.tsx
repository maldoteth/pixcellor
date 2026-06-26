import { Buffer } from "buffer";
// Polyfill Node globals needed by bip39 / ed25519-hd-key / @solana/web3.js in the browser.
if (typeof (globalThis as unknown as { Buffer?: unknown }).Buffer === "undefined") {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
if (typeof (globalThis as unknown as { global?: unknown }).global === "undefined") {
  (globalThis as unknown as { global: typeof globalThis }).global = globalThis;
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureAffiliateRefFromUrl } from "./lib/affiliateRef";

// First-touch affiliate attribution: stamp ?ref=CODE into a 90-day cookie.
captureAffiliateRefFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
