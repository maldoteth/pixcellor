## Goal
Let anyone with the guest link join an in-progress call. The host gets a knock popup to admit (or deny) each guest, including late joiners.

## Current state
- `CallRoom.tsx` is a single peer connection (`pcRef`). Host ↔ one guest only.
- `guest_token` on `call_bookings` is shared by everyone who has the link, but the room logic assumes one peer.
- "Start call" is a single global step that begins negotiation with whoever happens to be in the channel.

## Changes (frontend-only, `src/pages/CallRoom.tsx`)

### Signaling
- All signal messages already carry `from: PEER_ID`. Add a `to?: string` field so messages can be addressed to a specific peer.
- Guests address everything to the host's PEER_ID once known. Host addresses each guest by their PEER_ID.
- The `hello` reply from host now also includes `role: "host"` so guests learn the host's PEER_ID.

### Host: multi-peer mesh
- Replace `pcRef: RTCPeerConnection | null` with `peersRef: Map<peerId, { pc, stream, name }>`.
- When a guest's `hello` arrives:
  - If the call hasn't started yet → add to a `pendingGuests` list (knock queue).
  - If the call is live → show a "X wants to join" popup with Admit / Deny buttons.
- On Admit: create a new `RTCPeerConnection` for that peer, attach local tracks, create offer, send `{type:"offer", to: peerId}`.
- On Deny: send `{type:"deny", to: peerId}` and ignore further signals from that peer.
- Render remote videos in a responsive grid (1 → big, 2 → split, 3+ → tiled). Local preview stays as PiP.

### Guest
- One PC to host. On load, send `hello`. Wait for either `offer` (admitted) or `deny` (rejected — show "Host declined your request to join").
- Show "Waiting for host to let you in…" until offer arrives.
- Multiple guests using the same link is fine because each has a unique `PEER_ID`.

### Host UI additions
- Pre-call waiting room: list all pending guests with Admit All / individual Admit.
- During call: top-right toast "<name> is asking to join" with Admit / Deny. Stacks if multiple.
- Display name: guests don't currently send a name. Use `room.display_name` from the DB (the booking's customer name) for the first guest, and "Guest 2", "Guest 3"… for additional ones — or have guests send their name in `hello`. Plan: include `name` in `hello` payload; guest UI prompts for name only if `display_name` is empty (it normally isn't for the booked customer; extras get "Guest").

### Hangup / cleanup
- Close every PC in the map, stop remote streams, send `bye` to all.
- If a single guest leaves (`bye` from that peer), only tear down their PC and remove their tile.

## Out of scope
- Guest-to-guest video. Only host sees & is seen by all guests; guests see host only. (Adding mesh between guests multiplies bandwidth and isn't part of the ask.)
- Server-side ACL changes — the existing `guest_token` already permits anyone with the link, which is the intended behaviour.
- Recording changes — recorder still captures host's local stream.

## Files touched
- `src/pages/CallRoom.tsx` (only)
