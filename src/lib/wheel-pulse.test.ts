import { describe, expect, it } from "vitest";
import { advanceWheelPulse, createWheelPulseState } from "./wheel-pulse";

const run = (packets: Array<{ delta: number; at: number }>) => {
  let state = createWheelPulseState();
  const starts: boolean[] = [];

  for (const packet of packets) {
    const result = advanceWheelPulse(state, packet.delta, packet.at);
    state = result.state;
    starts.push(result.startsNewPulse);
  }

  return starts;
};

describe("advanceWheelPulse", () => {
  it("treats a decaying momentum stream as one gesture", () => {
    expect(run([
      { delta: 140, at: 1 },
      { delta: 112, at: 24 },
      { delta: 86, at: 53 },
      { delta: 61, at: 87 },
      { delta: 39, at: 126 },
      { delta: 22, at: 170 },
      { delta: 11, at: 219 },
      { delta: 5, at: 273 },
    ])).toEqual([true, false, false, false, false, false, false, false]);
  });

  it("does not split a noisy momentum tail into extra gestures", () => {
    expect(run([
      { delta: 140, at: 1 },
      { delta: 102, at: 30 },
      { delta: 69, at: 61 },
      { delta: 35, at: 94 },
      { delta: 17, at: 129 },
      { delta: 23, at: 166 },
      { delta: 14, at: 205 },
      { delta: 8, at: 246 },
    ])).toEqual([true, false, false, false, false, false, false, false]);
  });

  it("rearms the first packet after a genuine idle gap", () => {
    expect(run([
      { delta: 120, at: 1 },
      { delta: 60, at: 50 },
      { delta: 20, at: 100 },
      { delta: 90, at: 320 },
    ])).toEqual([true, false, false, true]);
  });

  it("recognises an immediate strong rebound as the next gesture", () => {
    expect(run([
      { delta: 140, at: 1 },
      { delta: 100, at: 42 },
      { delta: 60, at: 83 },
      { delta: 24, at: 124 },
      { delta: 10, at: 165 },
      { delta: 72, at: 206 },
    ])).toEqual([true, false, false, false, false, true]);
  });

  it("counts rapid deliberate swipes once each, including during a transition", () => {
    expect(run([
      { delta: 150, at: 1 },
      { delta: 98, at: 35 },
      { delta: 47, at: 70 },
      { delta: 18, at: 106 },
      { delta: 9, at: 143 },
      { delta: 82, at: 181 },
      { delta: 55, at: 214 },
      { delta: 24, at: 249 },
      { delta: 10, at: 286 },
      { delta: 78, at: 326 },
    ])).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it("rearms immediately when the user reverses direction", () => {
    expect(run([
      { delta: 100, at: 1 },
      { delta: 70, at: 35 },
      { delta: -60, at: 55 },
    ])).toEqual([true, false, true]);
  });
});

