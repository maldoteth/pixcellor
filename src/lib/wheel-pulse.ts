export interface WheelPulseState {
  lastEventAt: number;
  lastMagnitude: number;
  peakMagnitude: number;
  tailReady: boolean;
  deepTailReady: boolean;
  fallingEvents: number;
  risingEvents: number;
  direction: number;
}

export interface WheelPulseResult {
  state: WheelPulseState;
  startsNewPulse: boolean;
}

const PULSE_GAP_MS = 180;
const TAIL_ARM_RATIO = 0.72;
const DEEP_TAIL_RATIO = 0.5;
const REBOUND_RATIO = 1.18;
const REBOUND_MIN_DELTA = 8;
const REBOUND_MIN_RISE = 5;
const TAIL_FALL_EVENTS = 2;
const REBOUND_RISE_EVENTS = 2;
const STRONG_REBOUND_RATIO = 1.8;
const STRONG_REBOUND_MIN_DELTA = 24;
const STRONG_REBOUND_PEAK_RATIO = 0.4;

export const createWheelPulseState = (): WheelPulseState => ({
  lastEventAt: 0,
  lastMagnitude: 0,
  peakMagnitude: 0,
  tailReady: false,
  deepTailReady: false,
  fallingEvents: 0,
  risingEvents: 0,
  direction: 0,
});

export const advanceWheelPulse = (
  current: WheelPulseState,
  delta: number,
  now: number,
): WheelPulseResult => {
  if (!delta) return { state: current, startsNewPulse: false };

  const state = { ...current };
  const magnitude = Math.abs(delta);
  const direction = delta > 0 ? 1 : -1;
  const gap = state.lastEventAt === 0
    ? Number.POSITIVE_INFINITY
    : now - state.lastEventAt;
  const startsAfterGap = gap > PULSE_GAP_MS;
  const changesDirection = state.direction !== 0 && direction !== state.direction;
  let startsNewPulse = startsAfterGap || changesDirection;

  if (!startsNewPulse) {
    const previousMagnitude = state.lastMagnitude;
    const isFalling = previousMagnitude > 0 && magnitude < previousMagnitude;
    const risesEnough =
      previousMagnitude > 0 &&
      magnitude >= REBOUND_MIN_DELTA &&
      magnitude - previousMagnitude >= REBOUND_MIN_RISE &&
      magnitude >= previousMagnitude * REBOUND_RATIO;

    state.peakMagnitude = Math.max(state.peakMagnitude, magnitude);

    if (isFalling) {
      state.fallingEvents += 1;
    } else if (magnitude >= previousMagnitude) {
      state.fallingEvents = 0;
    }

    if (
      state.peakMagnitude >= REBOUND_MIN_DELTA &&
      magnitude <= state.peakMagnitude * DEEP_TAIL_RATIO
    ) {
      state.deepTailReady = true;
    }

    if (
      state.deepTailReady ||
      (
        state.fallingEvents >= TAIL_FALL_EVENTS &&
        magnitude <= state.peakMagnitude * TAIL_ARM_RATIO
      )
    ) {
      state.tailReady = true;
    }

    if (state.tailReady && risesEnough) {
      state.risingEvents += 1;
    } else if (isFalling) {
      state.risingEvents = 0;
    }

    const isStrongRebound =
      state.tailReady &&
      magnitude >= STRONG_REBOUND_MIN_DELTA &&
      magnitude >= previousMagnitude * STRONG_REBOUND_RATIO &&
      magnitude >= state.peakMagnitude * STRONG_REBOUND_PEAK_RATIO;

    startsNewPulse =
      state.tailReady &&
      risesEnough &&
      (isStrongRebound || state.risingEvents >= REBOUND_RISE_EVENTS);
  }

  if (startsNewPulse) {
    state.peakMagnitude = magnitude;
    state.tailReady = false;
    state.deepTailReady = false;
    state.fallingEvents = 0;
    state.risingEvents = 0;
  }

  state.lastEventAt = now;
  state.lastMagnitude = magnitude;
  state.direction = direction;

  return { state, startsNewPulse };
};

