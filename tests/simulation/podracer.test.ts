import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PODRACER_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  applyCollisionImpulse,
  createPodracerState,
  stepPodracer,
  type CollisionImpulse,
  type HeightSampler,
  type PodracerEvent,
} from '../../src/game/simulation';

const rollingDunes: HeightSampler = {
  heightAt(x, z) {
    return (
      Math.sin(x * 0.021 + z * 0.007) * 2.4 +
      Math.sin(z * 0.053 - x * 0.011) * 0.75
    );
  },
};

function collectNumbers(value: unknown, result: number[] = []): number[] {
  if (typeof value === 'number') {
    result.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, result);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectNumbers(item, result);
  }
  return result;
}

describe('podracer fixed-step simulation', () => {
  it('is bit-for-bit deterministic and contains only serializable state', () => {
    const first = createPodracerState({
      id: 'determinism-a',
      seed: 0x504f4452,
      terrain: rollingDunes,
      initialSpeed: 38,
    });
    const second = createPodracerState({
      id: 'determinism-a',
      seed: 0x504f4452,
      terrain: rollingDunes,
      initialSpeed: 38,
    });

    for (let frame = 0; frame < 1_800; frame += 1) {
      const steer = Math.sin(frame * 0.017) * 0.82;
      const input = {
        throttle: frame < 1_500 ? 1 : 0.35,
        brake: frame >= 1_500 ? 0.2 : 0,
        steer,
        drift: frame > 380 && frame < 650,
        boost: frame > 1_000 && frame < 1_080,
      };
      const collision: CollisionImpulse | undefined =
        frame === 900
          ? {
              impulse: { x: 4_100, y: 1_500, z: -3_200 },
              localPoint: { x: -3.2, y: 0, z: 2.1 },
              sourceId: 'test-pylon',
              damage: 0.02,
            }
          : undefined;
      const collisions = collision ? [collision] : [];
      stepPodracer(first, input, { terrain: rollingDunes, collisions });
      stepPodracer(second, input, { terrain: rollingDunes, collisions });
    }

    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first.probes.map((probe) => probe.id)).toEqual([
      'cockpit-front',
      'cockpit-rear',
      'engine-left-front',
      'engine-left-rear',
      'engine-right-front',
      'engine-right-rear',
    ]);
  });

  it('charges a powerslide and converts release into a real speed boost', () => {
    const state = createPodracerState({
      terrain: FLAT_HEIGHT_SAMPLER,
      initialSpeed: 92,
    });

    for (let frame = 0; frame < 300; frame += 1) {
      stepPodracer(
        state,
        { throttle: 1, steer: 0.9, drift: true },
        { terrain: FLAT_HEIGHT_SAMPLER },
      );
    }

    const storedCharge = state.drift.charge;
    const speedAtRelease = state.telemetry.speed;
    const released = stepPodracer(
      state,
      { throttle: 1, steer: 0.75, drift: false },
      { terrain: FLAT_HEIGHT_SAMPLER },
    );

    expect(storedCharge).toBeGreaterThan(0.45);
    expect(released.events.some((event) => event.type === 'drift-boost')).toBe(true);
    expect(released.events.some((event) => event.type === 'boost-start')).toBe(true);
    expect(state.boost.active).toBe(true);
    expect(state.drift.charge).toBe(0);

    for (let frame = 0; frame < 45; frame += 1) {
      stepPodracer(
        state,
        { throttle: 1, steer: 0.2 },
        { terrain: FLAT_HEIGHT_SAMPLER },
      );
    }
    expect(state.telemetry.speed).toBeGreaterThan(speedAtRelease + 8);
    expect(state.heat).toBeGreaterThan(0.08);
  });

  it('uses all terrain probes to settle into slope pitch and roll', () => {
    const slopedTerrain: HeightSampler = {
      heightAt(x, z) {
        return x * 0.11 + z * 0.17;
      },
    };
    const state = createPodracerState({ terrain: slopedTerrain });

    for (let frame = 0; frame < 720; frame += 1) {
      stepPodracer(state, {}, { terrain: slopedTerrain });
    }

    expect(state.orientation.pitch).toBeGreaterThan(0.11);
    expect(state.orientation.pitch).toBeLessThan(0.23);
    expect(state.orientation.roll).toBeGreaterThan(0.06);
    expect(state.orientation.roll).toBeLessThan(0.17);
    expect(state.telemetry.support).toBeGreaterThan(0.8);
    expect(state.probes.every((probe) => Number.isFinite(probe.clearance))).toBe(true);
  });

  it('leaves support over a crest gap and emits landing, spray and shake events', () => {
    const crestGap: HeightSampler = {
      heightAt(_x, z) {
        if (z < 14) return 0;
        if (z < 43) return -18;
        return 0;
      },
    };
    const state = createPodracerState({
      terrain: crestGap,
      initialSpeed: 58,
      position: { z: 0 },
    });
    let sawAirborne = false;
    let landing: Extract<PodracerEvent, { type: 'landing' }> | undefined;
    let sawSpray = false;
    let sawLandingShake = false;

    for (let frame = 0; frame < 220; frame += 1) {
      const result = stepPodracer(
        state,
        { throttle: 0.6 },
        { terrain: crestGap },
      );
      for (const event of result.events) {
        if (event.type === 'airborne') sawAirborne = true;
        if (event.type === 'landing') landing = event;
        if (event.type === 'sand-spray') sawSpray = true;
        if (event.type === 'camera-shake' && event.reason === 'landing') {
          sawLandingShake = true;
        }
      }
    }

    expect(sawAirborne).toBe(true);
    expect(landing).toBeDefined();
    expect(landing?.airTime).toBeGreaterThan(0.2);
    expect(landing?.verticalSpeed).toBeGreaterThan(5);
    expect(sawSpray).toBe(true);
    expect(sawLandingShake).toBe(true);
    expect(state.position.z).toBeGreaterThan(43);
  });

  it('keeps repeated hard dune landings consequential without terminal lap-one damage', () => {
    const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER });
    let damagingLandings = 0;

    for (let landing = 0; landing < 30; landing += 1) {
      state.position.y = DEFAULT_PODRACER_CONFIG.hoverHeight + 3.5;
      state.velocity.y = -24;
      state.grounded = false;
      state.airborneTime = 0.55;
      let touchedDown = false;
      for (let frame = 0; frame < 90 && !touchedDown; frame += 1) {
        const result = stepPodracer(state, { brake: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
        if (result.events.some((event) => event.type === 'landing')) touchedDown = true;
        if (result.events.some((event) => event.type === 'damage' && event.reason === 'landing')) {
          damagingLandings += 1;
        }
      }
      expect(touchedDown).toBe(true);
    }

    expect(damagingLandings).toBeGreaterThan(20);
    expect(state.damage).toBeGreaterThan(0.05);
    expect(state.damage).toBeLessThan(0.35);
  });

  it('bounds extreme input and collision hooks so every state number stays finite', () => {
    const state = createPodracerState({ terrain: rollingDunes, initialSpeed: 80 });

    applyCollisionImpulse(state, {
      impulse: { x: 1e12, y: -1e12, z: 1e12 },
      localPoint: { x: 1e6, y: 0, z: -1e6 },
      sourceId: null,
      damage: 5,
    });

    for (let frame = 0; frame < 900; frame += 1) {
      stepPodracer(
        state,
        {
          throttle: frame % 2 === 0 ? Number.POSITIVE_INFINITY : -50,
          brake: Number.NaN,
          steer: frame % 3 === 0 ? 500 : -500,
          drift: true,
          boost: true,
        },
        { terrain: rollingDunes },
      );
    }

    expect(collectNumbers(state).every(Number.isFinite)).toBe(true);
    expect(state.damage).toBeGreaterThanOrEqual(0);
    expect(state.damage).toBeLessThanOrEqual(1);
    expect(state.heat).toBeGreaterThanOrEqual(0);
    expect(state.heat).toBeLessThanOrEqual(1.25);
    expect(state.telemetry.speed).toBeLessThanOrEqual(
      DEFAULT_PODRACER_CONFIG.boostMaxSpeed + 0.001,
    );
  });

  it('resets once per button edge to the configured terrain-relative pose', () => {
    const terrain: HeightSampler = { heightAt: () => 7 };
    const state = createPodracerState({
      terrain,
      position: { x: 10, z: 20 },
      respawn: { x: -5, z: 12, y: null, yaw: 0.5 },
      initialSpeed: 90,
    });

    const first = stepPodracer(state, { reset: true }, { terrain });
    const held = stepPodracer(state, { reset: true }, { terrain });
    stepPodracer(state, { reset: false }, { terrain });
    const second = stepPodracer(state, { reset: true }, { terrain });

    expect(first.events.filter((event) => event.type === 'reset')).toHaveLength(1);
    expect(held.events.filter((event) => event.type === 'reset')).toHaveLength(0);
    expect(second.events.filter((event) => event.type === 'reset')).toHaveLength(1);
    expect(state.position).toEqual({
      x: -5,
      y: 7 + DEFAULT_PODRACER_CONFIG.hoverHeight,
      z: 12,
    });
    expect(state.orientation.yaw).toBeCloseTo(0.5);
  });
});
