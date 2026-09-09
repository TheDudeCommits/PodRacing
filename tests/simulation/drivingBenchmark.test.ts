import { describe, expect, it } from 'vitest';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState, stepPodracer } from '../../src/game/simulation';

describe('Inkstorm stock driving benchmark', () => {
  it('scrubs a fast approach to corner entry inside a marked 120 m braking zone', () => {
    const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 150 });
    const startZ = state.position.z;
    let ticks = 0;
    while (state.telemetry.speed > 70 && ticks < 240) {
      stepPodracer(state, { throttle: 0, brake: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
      ticks += 1;
    }
    expect(ticks).toBeLessThan(125);
    expect(state.position.z - startZ).toBeGreaterThan(60);
    expect(state.position.z - startZ).toBeLessThan(120);
    expect(state.damage).toBe(0);
  });

  it('recovers a sideways slide after release while preserving forward momentum', () => {
    const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 90 });
    state.velocity.x = 24;
    for (let tick = 0; tick < 60; tick += 1) {
      stepPodracer(state, { throttle: 0.5, steer: 0, drift: false }, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    expect(Math.abs(state.velocity.x)).toBeLessThan(0.35);
    expect(state.telemetry.speed).toBeGreaterThan(85);
    expect(DEFAULT_PODRACER_CONFIG.fixedDelta).toBe(1 / 120);
  });
});
