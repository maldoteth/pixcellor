## Goal
Stop the "Connection failed" card from firing on calls that would otherwise connect, while keeping the real bug fixes from the last patch (ICE candidate buffering, signal-handler error logging).

## Changes (all in `src/pages/CallRoom.tsx` — no other files touched)

### 1. Revert guest to `addTrack` (the regression)
In `enterWaitingRoom`, remove the `if (room.role === "host")` gate. Both host and guest call `addTrack` for every local track before the channel subscribes, exactly like it worked before today. Delete the guest-side `getTransceivers()` / `replaceTrack` / `tx.direction = "sendrecv"` block inside the `offer` branch of the signal handler — guest just does `setRemoteDescription → drainPendingIce → createAnswer → setLocalDescription → send answer`.

### 2. Make the 15s watchdog non-fatal
Replace the `markFailed(...)` call inside the `useEffect` watchdog with a **soft warning state** only. Concretely: keep the timer, but instead of flipping `status` to `"failed"`, only set `failMessage` to a "Still connecting… this can take up to 30s on slow networks" hint shown under the existing Connecting spinner. The card only flips to `failed` when the peer connection itself reports `failed` (see #3). This means a slow-but-successful connect no longer gets killed by our timer.

### 3. Require sustained failure before showing the failed card
In `createPeer`:
- `onconnectionstatechange`: on `failed`, don't call `markFailed` immediately. Start a 4s confirm-timer; if state is still `failed` after 4s, then `markFailed`. If state recovers to `connected`/`connecting` in that window, cancel the timer.
- `oniceconnectionstatechange`: keep the existing `restartIce()` on `failed`, but raise the post-restart confirmation from 5s → 8s so an ICE restart actually has time to complete on relay.
- Keep `markConnected()` on `connected`/`completed` (clears all pending fail timers).

### 4. Keep these from the last patch (no changes)
- `pendingIceRef` queue + `drainPendingIce` after `setRemoteDescription` on both `offer` and `answer` branches.
- `try/catch` wrapper around the broadcast signal handler with `console.error`.
- The `failed` Stage render block (now only reachable via sustained pc-level failure, not the timer).

## Why this fixes it
The guest transceiver path was the actual regression — reverting it restores the working SDP flow. The watchdog and instant-failed handler were turning slow-but-recoverable connections into hard failures; softening both lets normal connects finish and only shows the failed UI when WebRTC itself gives up.

## Out of scope
Signaling protocol, `get-call-config`, recording, screen share, UI/styling, every other file.
