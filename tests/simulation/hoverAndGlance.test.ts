import { describe, expect, it } from 'vitest';
import { DEFAULT_PODRACER_CONFIG as config, FLAT_HEIGHT_SAMPLER, applyCollisionImpulse,
  createPodracerState, stepPodracer } from '../../src/game/simulation';

describe('heading-independent collision response', () => {
  it('preserves the same local yaw impulse and planar motion at every course heading', () => {
    const yawKicks: number[] = [];
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const state = createPodracerState({terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 120, yaw});
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      applyCollisionImpulse(state, {
        impulse: {x: config.mass * (-6 * cos - 2 * sin), y: 0, z: config.mass * (6 * sin - 2 * cos)},
        localPoint: {x: 4, y: 0, z: 5}, sourceId: 'wall', damage: 0,
      });
      yawKicks.push(state.angularVelocity.yaw);
      expect(state.velocity.x * sin + state.velocity.z * cos).toBeCloseTo(118, 10);
      expect(state.velocity.x * cos - state.velocity.z * sin).toBeCloseTo(-6, 10);
    }
    expect(yawKicks[0]).toBeLessThan(0);
    for (const kick of yawKicks) expect(kick).toBeCloseTo(yawKicks[0]!, 12);
  });

  it('keeps a shallow wall glance driveable while the steering damper settles', () => {
    const state = createPodracerState({terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 120});
    applyCollisionImpulse(state, {impulse: {x: -6 * config.mass, y: 0, z: 0},
      localPoint: {x: 4, y: 0, z: 5}, sourceId: 'wall', damage: .004});
    for (let tick = 0; tick < 120; tick += 1) stepPodracer(state, {throttle: .65}, {terrain: FLAT_HEIGHT_SAMPLER});
    expect(state.position.z).toBeGreaterThan(115);
    expect(state.telemetry.speed).toBeGreaterThan(118);
    expect(Math.abs(state.orientation.yaw)).toBeLessThan(.12);
    expect(Math.abs(state.angularVelocity.yaw)).toBeLessThan(.001);
    expect(state.damage).toBeLessThan(.01);
  });
});
