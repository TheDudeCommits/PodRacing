import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PODRACER_CONFIG as config,
  DRIVE5_COMPATIBILITY_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
  stepPodracer,
  type HeightSampler,
} from '../../src/game/simulation';
import { closestHullContact, hullPrimitives, createRaceSimulation } from '../../src/game/race';
import { GALACTIC_VEHICLES } from '../../src/game/galactic';

/** Lowest hull point: the engine noses nineteen metres ahead of the origin. */
function noseClearance(state: ReturnType<typeof createPodracerState>, terrain: HeightSampler): number {
  const sinYaw = Math.sin(state.orientation.yaw), cosYaw = Math.cos(state.orientation.yaw);
  let minimum = Number.POSITIVE_INFINITY;
  for (const localX of [-4.1, 4.1]) {
    const localZ = 19;
    const x = state.position.x + localX * cosYaw + localZ * sinYaw;
    const z = state.position.z - localX * sinYaw + localZ * cosYaw;
    const hullY = state.position.y + Math.sin(state.orientation.pitch) * localZ + Math.sin(state.orientation.roll) * localX;
    minimum = Math.min(minimum, hullY - terrain.heightAt(x, z));
  }
  return minimum;
}

describe('hull contact', () => {
  it('keeps the engine noses out of a rising slope where the six-probe tune buried them', () => {
    const ramp: HeightSampler = { heightAt: (_x, z) => (z > 60 ? (z - 60) * 0.42 : 0) };
    const run = (tune: typeof config) => {
      const state = createPodracerState({ terrain: ramp, initialSpeed: 90 }, tune);
      let worst = Number.POSITIVE_INFINITY;
      for (let tick = 0; tick < 240; tick += 1) {
        stepPodracer(state, { throttle: 0.6 }, { terrain: ramp }, tune);
        if (state.position.z > 40 && state.position.z < 140) worst = Math.min(worst, noseClearance(state, ramp));
      }
      return { worst, pitch: state.orientation.pitch };
    };
    const current = run(config);
    const legacy = run(DRIVE5_COMPATIBILITY_CONFIG);
    expect(legacy.worst).toBeLessThan(-0.5);
    expect(current.worst).toBeGreaterThan(legacy.worst + 1);
    expect(current.worst).toBeGreaterThan(-0.4);
    expect(current.pitch).toBeGreaterThan(0.15);
  });

  it('rolls an engine up off a step under one side instead of leaving it in the ground', () => {
    const shelf: HeightSampler = { heightAt: (x) => (x > 2 ? 1.6 : 0) };
    // Hovering in place: at speed the bank assist would simply steer off the shelf.
    const state = createPodracerState({ terrain: shelf });
    for (let tick = 0; tick < 120; tick += 1) stepPodracer(state, {}, { terrain: shelf });
    // Right side is high, so the craft rolls positive (right lifted) and the right engine clears.
    expect(state.orientation.roll).toBeGreaterThan(0.08);
    const rightEngineY = state.position.y + Math.sin(state.orientation.roll) * 4.1;
    expect(rightEngineY - 1.6).toBeGreaterThan(0.3);
  });

  it('describes the hull as two engine capsules and a cockpit sphere', () => {
    const primitives = hullPrimitives(GALACTIC_VEHICLES.podracer);
    expect(primitives).toHaveLength(3);
    expect(primitives[0]!.ax).toBeLessThan(0);
    expect(primitives[1]!.ax).toBeGreaterThan(0);
    expect(primitives[0]!.bz).toBeGreaterThan(15);
    expect(primitives[2]!.az).toBeLessThan(0);
  });

  it('lets two pods run side by side until their engines actually touch', () => {
    const a = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, position: { x: 0, z: 0 } });
    const b = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, position: { x: 12, z: 0 } });
    // Twelve metres apart: engines are 4.1 m from each origin with a 2.4 m radius, so the gap is 12 - 8.2 - 4.8 < 0.
    expect(closestHullContact(a, GALACTIC_VEHICLES.podracer, b, GALACTIC_VEHICLES.podracer, 1)).not.toBeNull();
    b.position.x = 13.2;
    expect(closestHullContact(a, GALACTIC_VEHICLES.podracer, b, GALACTIC_VEHICLES.podracer, 1)).toBeNull();
    // The old circle test would have reported contact anywhere inside 14.4 m.
    b.position.x = 14;
    b.position.z = -12;
    expect(closestHullContact(a, GALACTIC_VEHICLES.podracer, b, GALACTIC_VEHICLES.podracer, 1)).toBeNull();
    // Nose into a cockpit from behind resolves at the actual hull points: the
    // trailing pod's left engine runs into the leader's cockpit pod.
    b.position.x = 4.1;
    b.position.z = -24.5;
    const contact = closestHullContact(a, GALACTIC_VEHICLES.podracer, b, GALACTIC_VEHICLES.podracer, 1)!;
    expect(contact).not.toBeNull();
    expect(contact.normalZ).toBeLessThan(-0.9);
    expect(contact.localAZ).toBeLessThan(0);
    expect(contact.localBZ).toBeGreaterThan(15);
  });

  it('trades pace in a side-by-side rub and deals less damage than a head-on shove', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0, competitionProfile: 'clean-race', fieldSize: 4 });
    const [player, rival] = race.state.entries;
    const sample = race.course.sampleAtProgress(0.02);
    const yaw = Math.atan2(sample.tangentX, sample.tangentZ);
    const place = (entry: typeof player, lateral: number, speed: number) => {
      entry!.vehicle.position.x = sample.x + sample.rightX * lateral;
      entry!.vehicle.position.z = sample.z + sample.rightZ * lateral;
      entry!.vehicle.position.y = sample.y + 2.45;
      entry!.vehicle.orientation.yaw = yaw;
      entry!.vehicle.velocity.x = sample.tangentX * speed;
      entry!.vehicle.velocity.z = sample.tangentZ * speed;
      entry!.progress.courseProgress = 0.02;
    };
    place(player, -6, 60);
    place(rival, 6.2, 95);
    for (const entry of race.state.entries.slice(2)) entry.vehicle.position.z -= 400;
    const slowBefore = player!.vehicle.telemetry.speed;
    let rubbed = false;
    for (let tick = 0; tick < 6; tick += 1) {
      const result = race.step({ throttle: 0.5 });
      rubbed ||= (result.vehicleEvents[player!.id] ?? []).some((event) => event.type === 'collision' && event.sourceId === rival!.id);
    }
    expect(rubbed).toBe(true);
    const gained = player!.vehicle.velocity.x * sample.tangentX + player!.vehicle.velocity.z * sample.tangentZ - slowBefore;
    expect(gained).toBeGreaterThan(0.3);
    expect(player!.vehicle.damage).toBeLessThan(0.006);
  });
});
