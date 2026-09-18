import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PODRACER_CONFIG as config,
  DRIVE5_COMPATIBILITY_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
  stepPodracer,
} from '../../src/game/simulation';

const TICK = 1 / 120;

/** Drives into a held drift and reports the eased authority and lateral speed per tick. */
function slide(tune = config, ticks = 90, steer = 1) {
  const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 120 }, tune);
  const blends: number[] = [];
  const laterals: number[] = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    stepPodracer(state, { throttle: 1, drift: true, steer }, { terrain: FLAT_HEIGHT_SAMPLER }, tune);
    blends.push(state.drift.blend);
    const forwardX = Math.sin(state.orientation.yaw), forwardZ = Math.cos(state.orientation.yaw);
    laterals.push(Math.abs(state.velocity.x * forwardZ - state.velocity.z * forwardX));
  }
  return { state, blends, laterals };
}

describe('drift feel', () => {
  it('ramps the slide in over the entry blend instead of snapping to full grip loss', () => {
    const { blends, laterals } = slide();
    expect(blends[0]).toBeLessThan(0.05);
    expect(blends[0]).toBeGreaterThan(0);
    // Roughly the authored entry time to reach full authority, and monotonic on the way.
    const full = blends.findIndex((value) => value >= 1);
    expect(full * TICK).toBeGreaterThan(config.driftEntryBlendTime * 0.8);
    expect(full * TICK).toBeLessThan(config.driftEntryBlendTime * 1.2);
    for (let index = 1; index < full; index += 1) expect(blends[index]!).toBeGreaterThanOrEqual(blends[index - 1]!);
    // The lateral speed follows the ramp: no single tick jumps most of the way.
    const peak = Math.max(...laterals);
    const biggestStep = Math.max(...laterals.map((value, index) => index === 0 ? value : value - laterals[index - 1]!));
    expect(peak).toBeGreaterThan(4);
    expect(biggestStep).toBeLessThan(peak * 0.28);
  });

  it('unwinds the slide over the exit blend and keeps the direction until it is gone', () => {
    const { state } = slide();
    expect(state.drift.blend).toBe(1);
    const direction = state.drift.direction;
    expect(direction).not.toBe(0);
    let ticksToZero = 0;
    while (state.drift.blend > 0 && ticksToZero < 240) {
      stepPodracer(state, { throttle: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
      ticksToZero += 1;
      if (state.drift.blend > 0) expect(state.drift.direction).toBe(direction);
    }
    expect(ticksToZero * TICK).toBeGreaterThan(config.driftExitBlendTime * 0.8);
    expect(ticksToZero * TICK).toBeLessThan(config.driftExitBlendTime * 1.3);
    expect(state.drift.blend).toBe(0);
    stepPodracer(state, { throttle: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
    expect(state.drift.direction).toBe(0);
  });

  it('holds a slide when the stick eases off mid-corner instead of dropping it', () => {
    const { state } = slide();
    expect(state.drift.active).toBe(true);
    for (let tick = 0; tick < 30; tick += 1) {
      stepPodracer(state, { throttle: 1, drift: true, steer: 0.09 }, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    // Above the hold threshold but below the entry threshold: the drift survives.
    expect(config.driftHoldSteer).toBeLessThan(0.12);
    expect(state.drift.active).toBe(true);
    expect(state.drift.blend).toBe(1);
    for (let tick = 0; tick < 30; tick += 1) {
      stepPodracer(state, { throttle: 1, drift: true, steer: 0.01 }, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    expect(state.drift.active).toBe(false);
  });

  it('reproduces the legacy snap for the archived replay tune', () => {
    const { blends } = slide(DRIVE5_COMPATIBILITY_CONFIG, 10);
    expect(blends[0]).toBe(1);
    expect(DRIVE5_COMPATIBILITY_CONFIG.driftEntryBlendTime).toBe(0);
  });
});
