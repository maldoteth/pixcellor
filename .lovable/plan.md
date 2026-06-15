## Diagnosis

TURN secrets (`METERED_TURN_URLS / USERNAME / CREDENTIAL`) ARE configured in Cloud — so the "stuck on connecting" is **not** a TURN problem. The remaining causes are two real code bugs in `src/pages/CallRoom.tsx`:

### Bug 1 — ICE candidates dropped before `setRemoteDescription`
Host sends offer then immediately bursts ICE candidates. Realtime broadcast callbacks run concurrently, so `ice` messages frequently fire while the `offer` handler is still `await`-ing `setRemoteDescription`. `addIceCandidate` then throws `InvalidStateError`, the candidate is swallowed by the `console.warn`, and lost. Losing early candidates can prevent the connection from ever forming.

### Bug 2 — Failure states are invisible, "Connected" only watches one signal
`pc.onconnectionstatechange` only handles the `"connected"` case. On older iOS Safari, `connectionState` can lag behind `iceConnectionState`, so the UI hangs on "Connecting…" while media is actually flowing. There's also no handling for `failed` / `disconnected` — a dead negotiation spins forever with no error and no retry.

### Bonus — guest m-line ordering
Guest currently pre-`addTrack`s before the offer arrives. If the host's offer ever emits m-lines in a different order (codec preference side-effects, screen share already attached), `setRemoteDescription` throws inside the Realtime callback and disappears. Belt-and-braces fix: drop pre-add on the guest, attach via `replaceTrack` on the transceivers created by the offer.

## Implementation (one file: `src/pages/CallRoom.tsx`)

### A. ICE candidate buffer
- Add `pendingIceRef = useRef<RTCIceCandidateInit[]>([])`.
- In the `ice` branch: if `peer.remoteDescription` is null, push into `pendingIceRef` and return. Otherwise `addIceCandidate`.
- After every successful `setRemoteDescription` (guest after offer, host after answer), drain the queue with `for (const c of pendingIceRef.current) await peer.addIceCandidate(c)` then clear it.

### B. Robust connection-state handling + 15s watchdog
- Add `pc.oniceconnectionstatechange`: flip to `connected` when state is `"connected"` or `"completed"`.
- Extend `pc.onconnectionstatechange`: on `"failed"` or `"disconnected"`, first call `pc.restartIce()`; if still not connected after 5s, set `status = "failed"` with a user-friendly message.
- Add a 15-second watchdog started when `status` becomes `"calling"`. If not connected by then, set `status = "failed"` with: *"Connection couldn't be established. This is usually a corporate firewall or restrictive network. Try a different network or use mobile data."*
- Add a `"failed"` Stage with a retry card (reuses the existing "ended" layout) — buttons: **Try again** (reload) and **Close**.

### C. Wrap signal handler in try/catch
Wrap the entire broadcast handler body in `try / catch (e) { console.error("[call] signal error", e); }` so future SDP issues stop dying silently.

### D. Guest: attach via offer-created transceivers
- In `enterWaitingRoom`, for guests (`room.role === "guest"`) **skip** the `pc.addTrack` loop.
- In the `offer` branch (guest path): after `setRemoteDescription`, iterate `pc.getTransceivers()`. For each transceiver where `receiver.track.kind` is `audio` or `video`, find the matching local track on `localStreamRef.current` and call `transceiver.sender.replaceTrack(localTrack)` + set `transceiver.direction = "sendrecv"`. Then apply `preferVP8` + `tuneVideoSender` to the video transceiver, `createAnswer`, `setLocalDescription`, broadcast answer.
- Host path unchanged — host is the offerer and owns m-line order.

## Not touched
Signaling protocol, `get-call-config`, recording, screen share toggle, UI/controls, styling, every other file.

## Verification
After edit: re-read the file, then ask you to start a call admin-side. Expected outcomes:
- Call connects on most networks (ICE buffer fix).
- If it still fails, you'll see "Connection couldn't be established…" within 15s instead of spinning forever — that's diagnostic gold.