## What the logs say

Edge-function logs only show boot/shutdown — no errors — so `get-call-config` is fine. You said the phones get stuck on "Connecting…" forever (not a permissions / `getUserMedia` error). That means signaling worked, the host sent the offer, the phone answered, but **ICE never finds a working path between the two peers**.

## Most likely cause

Even though both devices are "on the same WiFi", desktop-to-desktop works because the browsers exchange direct LAN IP candidates. Mobile browsers (especially iOS Safari and Samsung Internet) only expose **mDNS-obfuscated `.local` candidates** instead of real LAN IPs. Many home/office routers (and almost every guest/corporate WiFi) block `.local` resolution between clients (AP/client isolation), so the LAN path silently fails. The connection then has to fall back to TURN — and right now the TURN secrets are set, but we never verify that the TURN URL list actually contains a relay-capable entry, and we never force a relay-only retry when ICE stalls.

That matches your symptom exactly: works on desktop⇄desktop (LAN candidates succeed), fails on mobile⇄desktop (LAN candidates fail, TURN never kicks in cleanly).

## Plan

1. **Edge function `get-call-config`** — harden the TURN config:
   - Log how many `turn:` / `turns:` URLs were emitted, so we can see in edge logs whether the secret is shaped correctly.
   - If `METERED_TURN_URLS` is just a single hostname, expand it to the canonical Metered set (`turn:<host>:80`, `turn:<host>:80?transport=tcp`, `turn:<host>:443`, `turns:<host>:443?transport=tcp`) so mobile networks that block UDP still have a TCP/TLS fallback.
   - Return a separate `relay_only_ice_servers` array (TURN entries only) for the client to use on retry.

2. **Client `CallRoom.tsx`** — make mobile ICE actually complete:
   - Add a "stuck on calling" watchdog: if `iceConnectionState` is still `checking`/`new` after ~6 s, tear the PC down and rebuild it with `iceTransportPolicy: 'relay'` using the relay-only ICE list, then re-negotiate (guest re-knocks, host re-offers).
   - Log every ICE candidate type that's emitted (`host` / `srflx` / `relay`) so we can confirm in the phone's remote debugger that relay candidates are actually being generated.
   - Surface a visible "Reconnecting over relay…" hint instead of an indefinite "Connecting…" so the user knows something is happening.
   - Drop the strict `frameRate: { max: 30 }` / `1280×720 max` constraints on mobile and use `{ ideal: … }` only — a few Samsung front cameras throw `OverconstrainedError` silently on the `max` form, which also presents as "stuck connecting".

3. **Verification**
   - Open the iPhone using Safari Web Inspector (Mac) or the Samsung in `chrome://inspect`, join the call, and confirm in console:
     - `[call] ... ice candidate type=relay` appears at least once on both sides, and
     - `iceConnectionState` reaches `connected`.
   - If relay candidates never appear, the TURN credentials/secret are wrong and we'll fix those next; the edge-function log line added in step 1 will tell us immediately.

## Out of scope

- No UI redesign of the call room.
- No change to booking flow, auth, or the rest of the portal.
- No change to host↔host or desktop↔desktop behaviour (those already work).