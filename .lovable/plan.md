Plan:

1. Remove the VP8 codec-forcing path from `CallRoom.tsx`:
   - Delete `preferVP8()` and its `setCodecPreferences(...)` call.
   - Stop calling it after `addTrack(...)`.

2. Remove initial forced sender tuning from the call setup:
   - Stop calling `tuneVideoSender(..., "camera")` immediately after adding tracks.
   - This returns initial negotiation to the plain browser-managed `addTrack` flow that was working.

3. Keep the non-regression safety fixes:
   - Keep pending ICE candidate buffering/draining.
   - Keep the softer connection failure handling.
   - Keep the guest/host both using simple `addTrack(...)`.

4. Make failure copy less misleading:
   - Replace the “firewall/mobile carrier” wording with a neutral “The call could not connect. Please reload and try again.”

Technical note:
- Claude’s read matches the current code: `preferVP8()` is present and called before offer/answer, which can break cross-browser negotiation. I did not identify that before the last fix; the last fix focused on the transceiver/m-line regression and timeout behavior, but left this codec-forcing regression in place.