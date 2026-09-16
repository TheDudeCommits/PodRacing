import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PODRACER_CONFIG as config,
  DRIVE5_COMPATIBILITY_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
  stepPodracer,
} from '../../src/game/simulation';

describe('boost as a decision', () => {
  it('charges the meter faster while sitting in a wake', () => {
    const run = (draftStrength: number) => {
      const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialBoostEnergy: 0.2, initialSpeed: 60 });
      for (let tick = 0; tick < 240; tick += 1) stepPodracer(state, { throttle: 0.4 }, { terrain: FLAT_HEIGHT_SAMPLER, draftStrength });
      return state.boost.energy;
    };
    const plain = run(0), drafting = run(1);
    expect(drafting - 0.2).toBeCloseTo((plain - 0.2) * (1 + config.draftBoostRegenBonus), 3);
  });

  it('refunds boost on a clean landing after a real jump, not on a hop', () => {
    const drop = (height: number, tune = config) => {
      const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialBoostEnergy: 0.3, initialSpeed: 60 }, tune);
      state.position.y = height;
      state.grounded = false;
      let refund = null as null | { amount: number };
      for (let tick = 0; tick < 480 && !refund; tick += 1) {
        for (const event of stepPodracer(state, { throttle: 0.4 }, { terrain: FLAT_HEIGHT_SAMPLER }, tune).events) {
          if (event.type === 'boost-refund') refund = { amount: event.amount };
        }
      }
      return { refund, energy: state.boost.energy, airborne: state.airborneTime };
    };
    const jump = drop(9);
    expect(jump.refund).not.toBeNull();
    expect(jump.refund!.amount).toBeGreaterThan(0.03);
    expect(drop(9, DRIVE5_COMPATIBILITY_CONFIG).refund).toBeNull();
    // A micro-hop over dune texture pays nothing.
    expect(drop(3.2).refund).toBeNull();
  });

  it('costs steering and grip for two seconds after an overheat, then recovers', () => {
    const steerAfterOverheat = (tune = config, heat = 0.9995) => {
      const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 80, initialBoostEnergy: 1 }, tune);
      state.heat = heat;
      stepPodracer(state, { throttle: 0.5, boost: heat > 0.5 }, { terrain: FLAT_HEIGHT_SAMPLER }, tune);
      const overheated = state.boost.overheated;
      for (let tick = 0; tick < 48; tick += 1) stepPodracer(state, { throttle: 0.5, steer: 1 }, { terrain: FLAT_HEIGHT_SAMPLER }, tune);
      return { overheated, yawRate: state.angularVelocity.yaw, timer: state.boost.overheatHandlingTimer };
    };
    const hot = steerAfterOverheat();
    const cool = steerAfterOverheat(config, 0.1);
    expect(hot.overheated).toBe(true);
    expect(cool.overheated).toBe(false);
    expect(hot.timer).toBeGreaterThan(1.4);
    expect(Math.abs(hot.yawRate)).toBeLessThan(Math.abs(cool.yawRate) * 0.8);
    const legacy = steerAfterOverheat(DRIVE5_COMPATIBILITY_CONFIG);
    expect(legacy.timer).toBe(0);
    const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 80 });
    state.heat = 0.9995;
    stepPodracer(state, { throttle: 0.5, boost: true }, { terrain: FLAT_HEIGHT_SAMPLER });
    for (let tick = 0; tick < 120 * 2.2; tick += 1) stepPodracer(state, { throttle: 0.5 }, { terrain: FLAT_HEIGHT_SAMPLER });
    expect(state.boost.overheatHandlingTimer).toBe(0);
  });
});
