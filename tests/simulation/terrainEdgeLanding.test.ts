import { describe, expect, it } from 'vitest';
import { DEFAULT_PODRACER_CONFIG as config, createPodracerState, stepPodracer } from '../../src/game/simulation';

describe('local terrain support at a straddled edge', () => {
  it.each([0, Math.PI / 2, Math.PI / 4].flatMap(yaw => [-1, -2.8].map(start => ({yaw, start}))))(
    'does not turn a 3 m step into a ramp at heading $yaw and start $start', ({yaw, start}) => {
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const terrain = {heightAt: (x: number, z: number) => x * sin + z * cos >= 0 ? 3 : 0};
    const state = createPodracerState({terrain, yaw, initialSpeed: 120,
      position: {x: start * sin, y: 3.3, z: start * cos}});
    state.velocity.y = -4;
    state.grounded = false;
    state.airborneTime = .2;
    const result = stepPodracer(state, {throttle: .65}, {terrain});
    const landing = result.events.find(event => event.type === 'landing');
    expect(landing?.type).toBe('landing');
    if (landing?.type !== 'landing') throw new Error('Expected the actual edge landing');
    expect(landing.verticalSpeed).toBeCloseTo(4, 9);
    expect(state.velocity.y).toBeGreaterThanOrEqual(0);
    expect(state.velocity.y).toBeLessThan(.3);
    expect(state.damage).toBe(0);
    expect(state.probes.some(probe => probe.groundHeight === 0)).toBe(true);
    expect(state.probes.some(probe => probe.groundHeight === 3)).toBe(true);
    for (let tick = 1; tick < 60; tick += 1) stepPodracer(state, {throttle: .65}, {terrain});
    expect(state.position.y).toBeGreaterThan(4.5);
    expect(state.position.y).toBeLessThan(6);
    expect(state.damage).toBe(0);
    expect(state.telemetry.speed).toBeGreaterThan(120);
    expect(state.probes.every(probe => probe.clearance >= config.hardDeckClearance - 1e-9)).toBe(true);
  });

  it('bounds terrain queries through ordinary support and hard-deck correction', () => {
    let queries = 0;
    const terrain = {heightAt: (_x: number, z: number) => { queries += 1; return .12 * z; }};
    const state = createPodracerState({terrain, initialSpeed: 100});
    for (let tick = 0; tick < 120; tick += 1) {
      queries = 0;
      stepPodracer(state, {throttle: .45}, {terrain});
      expect(queries).toBeLessThanOrEqual(18);
    }
    state.position.y -= state.telemetry.groundClearance;
    state.velocity.y = -4;
    queries = 0;
    stepPodracer(state, {throttle: .45}, {terrain});
    expect(queries).toBeLessThanOrEqual(24);
    expect(state.probes.every(probe => probe.clearance >= config.hardDeckClearance - 1e-9)).toBe(true);
  });
});
