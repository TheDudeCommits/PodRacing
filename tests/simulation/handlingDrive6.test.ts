import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PODRACER_CONFIG as config,
  DRIVE5_COMPATIBILITY_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
  stepPodracer,
  type HeightSampler,
} from '../../src/game/simulation';

const TICK = 1 / 120;

describe('drive 6 handling: predictable braking', () => {
  it('decelerates at one rate whether or not the throttle is still held', () => {
    const decelerationFor = (throttle: number): number => {
      const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 140 });
      const before = state.telemetry.speed;
      for (let tick = 0; tick < 60; tick += 1) stepPodracer(state, { throttle, brake: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
      return (before - state.telemetry.speed) / 0.5;
    };
    const released = decelerationFor(0);
    const held = decelerationFor(1);
    expect(released).toBeGreaterThan(65);
    // A held throttle can no longer cancel most of the brake; the two stops
    // differ by a small, consistent margin the player can feel and predict.
    expect(held).toBeGreaterThan(released * 0.8);
  });

  it('adds one constant brake deceleration on top of drag across the speed range', () => {
    const rateOver = (state: ReturnType<typeof createPodracerState>, brake: number): number => {
      const before = state.telemetry.speed;
      for (let tick = 0; tick < 12; tick += 1) stepPodracer(state, { brake }, { terrain: FLAT_HEIGHT_SAMPLER });
      return (before - state.telemetry.speed) / 0.1;
    };
    const brakeShares: number[] = [];
    for (const speed of [150, 120, 90, 60]) {
      const braking = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: speed });
      const coasting = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: speed });
      brakeShares.push(rateOver(braking, 1) - rateOver(coasting, 0));
    }
    for (const share of brakeShares) expect(Math.abs(share - config.brakeAcceleration) / config.brakeAcceleration).toBeLessThan(0.08);
  });

  it('straightens a slide while braking and tightens the line under trail braking', () => {
    const sliding = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 90 });
    sliding.velocity.x = 20;
    const coasting = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 90 });
    coasting.velocity.x = 20;
    for (let tick = 0; tick < 10; tick += 1) {
      stepPodracer(sliding, { brake: 1 }, { terrain: FLAT_HEIGHT_SAMPLER });
      stepPodracer(coasting, {}, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    expect(Math.abs(sliding.telemetry.lateralSpeed)).toBeLessThan(Math.abs(coasting.telemetry.lateralSpeed));

    const braking = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 100 });
    const cruising = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 100 });
    for (let tick = 0; tick < 60; tick += 1) {
      stepPodracer(braking, { steer: 1, brake: 0.6, throttle: 0.4 }, { terrain: FLAT_HEIGHT_SAMPLER });
      stepPodracer(cruising, { steer: 1, throttle: 0.4 }, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    expect(Math.abs(braking.orientation.yaw)).toBeGreaterThan(Math.abs(cruising.orientation.yaw));
  });
});

describe('drive 6 handling: controllable drifts', () => {
  function driftFor(ticks: number, steer: number) {
    const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 110 });
    for (let tick = 0; tick < ticks; tick += 1) stepPodracer(state, { throttle: 1, steer, drift: true }, { terrain: FLAT_HEIGHT_SAMPLER });
    return state;
  }

  it('shallows the slip angle when the stick is eased mid-drift', () => {
    const committed = driftFor(120, 1);
    const eased = driftFor(120, 0.3);
    expect(committed.drift.active).toBe(true);
    expect(eased.drift.active).toBe(true);
    expect(Math.abs(eased.drift.slipAngle)).toBeLessThan(Math.abs(committed.drift.slipAngle) * 0.85);
  });

  it('blends grip back after release so the exit never snaps and momentum is kept', () => {
    const state = driftFor(150, 1);
    const speedAtRelease = state.telemetry.speed;
    let previousLateral = Math.abs(state.telemetry.lateralSpeed);
    let maximumLateralLoss = 0;
    const released = stepPodracer(state, { throttle: 1, steer: 0 }, { terrain: FLAT_HEIGHT_SAMPLER });
    expect(released.events.some((event) => event.type === 'drift-boost')).toBe(true);
    expect(state.drift.exitTimer).toBeCloseTo(config.driftExitBlendTime - TICK, 6);
    for (let tick = 0; tick < 90; tick += 1) {
      stepPodracer(state, { throttle: 1, steer: 0 }, { terrain: FLAT_HEIGHT_SAMPLER });
      const lateral = Math.abs(state.telemetry.lateralSpeed);
      maximumLateralLoss = Math.max(maximumLateralLoss, previousLateral - lateral);
      previousLateral = lateral;
    }
    // Lateral speed leaves over many ticks (under 1.2 m/s per tick) rather than
    // in one bite, and the slide became forward travel on top of the boost.
    expect(maximumLateralLoss).toBeLessThan(1.2);
    expect(state.drift.exitTimer).toBe(0);
    expect(Math.abs(state.telemetry.lateralSpeed)).toBeLessThan(0.6);
    expect(state.telemetry.speed).toBeGreaterThan(speedAtRelease + 10);
  });
});

describe('drive 6 handling: hover, flight and landings', () => {
  it('carries lateral momentum through flight and regrips over a short blend after landing', () => {
    const cliff: HeightSampler = { heightAt: (_x, z) => (z > 20 ? -40 : 0) };
    const state = createPodracerState({ terrain: cliff, initialSpeed: 80 });
    let airborneAt = -1;
    let landedAt = -1;
    let lateralInFlight = 0;
    for (let tick = 0; tick < 480; tick += 1) {
      const result = stepPodracer(state, { throttle: 0.5 }, { terrain: cliff });
      if (airborneAt < 0 && result.events.some((event) => event.type === 'airborne')) {
        airborneAt = tick;
        // A sideways shove at take-off: the same shove on the ground vanishes
        // within a quarter second under full grip.
        state.velocity.x += 12;
      }
      if (airborneAt >= 0 && landedAt < 0 && tick === airborneAt + 60) lateralInFlight = Math.abs(state.telemetry.lateralSpeed);
      if (landedAt < 0 && result.events.some((event) => event.type === 'landing')) landedAt = tick;
    }
    expect(airborneAt).toBeGreaterThan(0);
    expect(landedAt).toBeGreaterThan(airborneAt + 60);
    expect(lateralInFlight).toBeGreaterThan(1.5);
    const grounded = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 80 });
    grounded.velocity.x = 12;
    for (let tick = 0; tick < 60; tick += 1) stepPodracer(grounded, { throttle: 0.5 }, { terrain: FLAT_HEIGHT_SAMPLER });
    expect(Math.abs(grounded.telemetry.lateralSpeed)).toBeLessThan(lateralInFlight * 0.2);
    expect(state.regripTimer).toBe(0);
    expect(state.telemetry.speed).toBeGreaterThan(70);
    expect(Math.abs(state.telemetry.lateralSpeed)).toBeLessThan(0.5);
  });

  it('hugs a crest closer than the drive-5 tune, while a real drop still flies', () => {
    const crest: HeightSampler = { heightAt: (_x, z) => 6 * Math.exp(-((z - 90) ** 2) / (2 * 30 ** 2)) };
    const fly = (tune: typeof config) => {
      const state = createPodracerState({ terrain: crest, initialSpeed: 120 }, tune);
      let maximumClearance = 0;
      let airborneTicks = 0;
      for (let tick = 0; tick < 300; tick += 1) {
        stepPodracer(state, { throttle: 0.8 }, { terrain: crest }, tune);
        maximumClearance = Math.max(maximumClearance, state.telemetry.groundClearance);
        if (!state.grounded) airborneTicks += 1;
      }
      return { maximumClearance, airborneTicks, damage: state.damage };
    };
    const current = fly(config);
    const legacy = fly(DRIVE5_COMPATIBILITY_CONFIG);
    expect(current.maximumClearance).toBeLessThan(legacy.maximumClearance * 0.92);
    expect(current.airborneTicks).toBeLessThan(legacy.airborneTicks);
    expect(current.damage).toBe(0);

    const drop: HeightSampler = { heightAt: (_x, z) => (z > 40 ? -30 : 0) };
    const flyer = createPodracerState({ terrain: drop, initialSpeed: 120 });
    let flew = false;
    for (let tick = 0; tick < 120; tick += 1) {
      flew ||= stepPodracer(flyer, { throttle: 0.8 }, { terrain: drop }).events.some((event) => event.type === 'airborne');
    }
    expect(flew).toBe(true);
  });

  it('turns toward the low side of a banked bed and stays straight on flat ground', () => {
    const banked: HeightSampler = { heightAt: (x) => x * Math.tan(0.24) };
    const onBank = createPodracerState({ terrain: banked, initialSpeed: 120 });
    const onFlat = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 120 });
    for (let tick = 0; tick < 60; tick += 1) {
      stepPodracer(onBank, { throttle: 0.7 }, { terrain: banked });
      stepPodracer(onFlat, { throttle: 0.7 }, { terrain: FLAT_HEIGHT_SAMPLER });
    }
    // Right side higher means the low side is racer-left: negative yaw.
    expect(onBank.telemetry.surfaceRoll).toBeGreaterThan(0.2);
    expect(onBank.orientation.yaw).toBeLessThan(-0.02);
    expect(Math.abs(onFlat.orientation.yaw)).toBeLessThan(1e-3);
    expect(onBank.damage).toBe(0);
    const legacy = createPodracerState({ terrain: banked, initialSpeed: 120 }, DRIVE5_COMPATIBILITY_CONFIG);
    for (let tick = 0; tick < 60; tick += 1) stepPodracer(legacy, { throttle: 0.7 }, { terrain: banked }, DRIVE5_COMPATIBILITY_CONFIG);
    expect(Math.abs(legacy.orientation.yaw)).toBeLessThan(1e-3);
  });

  it('remains deterministic and JSON-safe with the new state fields', () => {
    const dunes: HeightSampler = { heightAt: (x, z) => Math.sin(x * 0.03) * 2 + Math.cos(z * 0.02) * 1.5 };
    const run = () => {
      const state = createPodracerState({ terrain: dunes, initialSpeed: 60, seed: 7 });
      for (let tick = 0; tick < 900; tick += 1) {
        stepPodracer(state, {
          throttle: 1, steer: Math.sin(tick * 0.02), brake: tick % 200 < 30 ? 1 : 0,
          drift: tick % 300 > 200, boost: tick % 500 > 450,
        }, { terrain: dunes });
      }
      return state;
    };
    const first = run();
    const second = run();
    expect(second).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first.drift.exitTimer).toBeGreaterThanOrEqual(0);
    expect(first.regripTimer).toBeGreaterThanOrEqual(0);
    expect(TICK).toBe(config.fixedDelta);
  });
});
