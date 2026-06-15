## Why the video feels like MSN 2006

The audio works because audio is tiny (≈40 kbps) and self-recovers. Video stutters because nothing in the current `CallRoom.tsx` setup tells the browser how to behave when bandwidth or CPU is tight, and the ICE setup may be forcing a long-haul path. Specifically:

1. **No bitrate / framerate / degradation hints on the video sender.** We just `addTrack` and let the browser pick. Default in Chromium is "maintain-resolution", which keeps 720p and drops frames the moment bandwidth wobbles → exactly the "slideshow" feel.
2. **VP9 (or AV1) may be negotiated.** VP9/AV1 encode is heavy on mid-range phones — frames pile up in the encoder, audio overtakes video → lip-sync lag.
3. **`getUserMedia` requests 1280×720 with no `frameRate` ceiling.** With most laptop cams that pushes ~1.3 Mbps; on a mobile uplink it constantly congests.
4. **TURN is optional.** If `METERED_TURN_*` secrets aren't set, peers stuck behind symmetric NAT (most carrier 4G/5G) try to hairpin through STUN, which means the path is fragile or unreachable. Audio survives the loss; video doesn't.
5. **No `transceiver` direction set up-front** — the first offer is created before media is fully attached in some race conditions, leading to one-way renegotiations and the initial freeze that never recovers.

## Plan (frontend-only, surgical to `src/pages/CallRoom.tsx`, plus one ICE check)

### 1. Cap the camera at sane mobile-friendly numbers
Change preflight `getUserMedia` to:
```ts
video: {
  width:  { ideal: 1280, max: 1280 },
  height: { ideal: 720,  max: 720  },
  frameRate: { ideal: 30, max: 30 },
}
```
This makes the source predictable; without `max`, the camera can deliver weird intermediate sizes the encoder has to rescale every frame.

### 2. After negotiation, set sender parameters
For the video `RTCRtpSender`, apply:
```ts
const params = sender.getParameters();
params.degradationPreference = 'maintain-framerate'; // smoothness > pixels
params.encodings = [{
  maxBitrate: 1_200_000,   // 1.2 Mbps cap (HD-quality, mobile-safe)
  maxFramerate: 30,
  scaleResolutionDownBy: 1,
}];
await sender.setParameters(params);
```
For **screen share**, swap to `maintain-resolution` + 2.5 Mbps when the screen track is in place, so text stays crisp.

### 3. Prefer VP8 over VP9/AV1
After creating the peer, if `RTCRtpSender.getCapabilities('video')` is available, reorder codecs so `video/VP8` is first and call `transceiver.setCodecPreferences(...)`. VP8 has hardware encoders on basically every device — VP9/AV1 software-encoded on a phone is the #1 cause of jitter.

### 4. Pre-add transceivers
Before `createOffer`, explicitly:
```ts
pc.addTransceiver('audio', { direction: 'sendrecv' });
pc.addTransceiver('video', { direction: 'sendrecv' });
```
…then attach tracks via `replaceTrack` on the existing transceivers. Stops the "first connect is broken until renegotiation" race.

### 5. Verify TURN is actually configured
Check whether `METERED_TURN_URLS`, `METERED_TURN_USERNAME`, `METERED_TURN_CREDENTIAL` are set in Cloud secrets. If not, mobile-to-mobile or mobile-to-corporate-Wi-Fi calls will silently fall back to a bad path. No code change in the edge function — just a status check + ask you to add a TURN credential if missing. (Metered has a free tier.)

### 6. Lightweight in-call diagnostics
Add a dev-only `getStats()` poll every 3 s that logs `framesPerSecond`, `bytesSent`, and `packetsLost` for the outbound video. Lets us confirm whether the fix actually moved the needle without guessing.

## What I won't touch
- Signalling / Realtime channel logic.
- `get-call-config` edge function (other than recommending the TURN env vars).
- UI, controls, recording flow, rejoin behaviour.

## After implementing
- Test in a fresh tab; expect ~30 fps smooth video, slightly softer image when uplink dips (by design).
- If TURN is still missing, I'll flag it and ask you to add a credential before declaring "fixed".

Want me to switch to build mode and apply this?
