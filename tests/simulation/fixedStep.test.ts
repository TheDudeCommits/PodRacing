import { describe, expect, it } from 'vitest';
import {
  PODRACER_FIXED_DELTA,
  advanceFixedStep,
  createFixedStepClock,
  stepFixedFrames,
} from '../../src/game/simulation';

describe('120 Hz fixed-step clock', () => {
  it('produces the same number of ticks for differently chunked frame deltas', () => {
    const smoothClock = createFixedStepClock();
    const unevenClock = createFixedStepClock();
    let smoothTicks = 0;
    let unevenTicks = 0;

    for (let frame = 0; frame < 120; frame += 1) {
      advanceFixedStep(smoothClock, 1 / 60, () => {
        smoothTicks += 1;
      });
    }

    const unevenDeltas = [0.004, 0.019, 0.011, 0.033, 0.007, 0.026];
    let elapsed = 0;
    let index = 0;
    while (elapsed < 2 - 1e-9) {
      const wanted = unevenDeltas[index % unevenDeltas.length] ?? 0;
      const delta = Math.min(wanted, 2 - elapsed);
      advanceFixedStep(unevenClock, delta, () => {
        unevenTicks += 1;
      });
      elapsed += delta;
      index += 1;
    }

    expect(smoothTicks).toBe(240);
    expect(unevenTicks).toBe(smoothTicks);
    expect(unevenClock.totalSteps).toBe(smoothClock.totalSteps);
  });

  it('supports exact capture stepping and bounds catch-up spirals', () => {
    const captureClock = createFixedStepClock();
    const samples: number[] = [];
    stepFixedFrames(captureClock, 360, (delta) => samples.push(delta));

    expect(samples).toHaveLength(360);
    expect(samples.every((delta) => delta === PODRACER_FIXED_DELTA)).toBe(true);
    expect(captureClock.simulationTime).toBeCloseTo(3);

    const realtimeClock = createFixedStepClock(PODRACER_FIXED_DELTA, 4);
    const result = advanceFixedStep(realtimeClock, 0.25, () => undefined);
    expect(result.steps).toBe(4);
    expect(result.droppedTime).toBeGreaterThan(0.2);
    expect(result.alpha).toBeGreaterThanOrEqual(0);
    expect(result.alpha).toBeLessThan(1);
  });
});
