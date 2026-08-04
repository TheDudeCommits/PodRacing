import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { createPodracerState } from '../../src/game/simulation/podracer';
import type { HeightSampler } from '../../src/game/simulation/types';

const dunes: HeightSampler = {
  heightAt(x, z) {
    return Math.sin(x * 0.017 + z * 0.004) * 2.3 + Math.cos(z * 0.012) * 1.1;
  },
};

describe('eight-racer coordinator', () => {
  it('emits a three-beat countdown, a single start horn and then advances race time', () => {
    const race = createRaceSimulation({ terrain: dunes });
    const cues: Array<3 | 2 | 1 | 'go'> = [];
    let horns = 0;
    for (let step = 0; step < 380; step += 1) {
      const result = race.step({ throttle: 1 });
      for (const event of result.events) {
        if (event.type === 'countdown') cues.push(event.cue);
        if (event.type === 'start-horn') horns += 1;
      }
    }
    expect(cues).toEqual([3, 2, 1, 'go']);
    expect(horns).toBe(1);
    expect(race.state.phase).toBe('racing');
    expect(race.state.raceTime).toBeGreaterThan(0);
    expect(race.state.entries).toHaveLength(8);
  });

  it('is deterministic across vehicles, AI memory, race rules and emitted events', () => {
    const first = createRaceSimulation({ terrain: dunes, countdownSeconds: 0, seed: 0x12345678, fieldSize: 4 });
    const second = createRaceSimulation({ terrain: dunes, countdownSeconds: 0, seed: 0x12345678, fieldSize: 4 });
    const firstEvents: unknown[] = [];
    const secondEvents: unknown[] = [];
    for (let step = 0; step < 1_400; step += 1) {
      const input = {
        throttle: 1,
        steer: Math.sin(step * 0.013) * 0.55,
        drift: step % 410 > 290 && step % 410 < 355,
        boost: step % 530 > 470,
      };
      const a = first.step(input);
      const b = second.step(input);
      firstEvents.push(...a.events, ...a.aiEvents);
      secondEvents.push(...b.events, ...b.aiEvents);
    }
    expect(second.snapshot()).toEqual(first.snapshot());
    expect(secondEvents).toEqual(firstEvents);
    expect(JSON.parse(JSON.stringify(first.state))).toEqual(first.state);
    expect(first.state.entries.map((entry) => entry.ai?.personality ?? 'player')).toEqual([
      'player', 'aggressive', 'clean', 'erratic',
    ]);
  });

  it('finishes all racers, freezes ordered placements and builds complete results', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0, fieldSize: 4 });
    for (let entryIndex = 0; entryIndex < race.state.entries.length; entryIndex += 1) {
      const entry = race.state.entries[entryIndex]!;
      const before = race.course.sampleAtDistance(race.course.totalLength - 0.08);
      const lane = (entryIndex - 1.5) * 16;
      entry.progress.courseProgress = before.progress;
      entry.progress.previousProgress = before.progress;
      entry.progress.unwrappedProgress = 2.999;
      entry.progress.completedLaps = 2;
      entry.progress.currentLap = 3;
      entry.progress.nextCheckpointIndex = 0;
      entry.progress.lapTimes = [51, 49];
      entry.progress.lapStartTime = 100;
      entry.vehicle.position.x = before.x + before.rightX * lane;
      entry.vehicle.position.z = before.z + before.rightZ * lane;
      entry.vehicle.position.y = dunes.heightAt(before.x, before.z) + 2.45;
      entry.vehicle.orientation.yaw = Math.atan2(before.tangentX, before.tangentZ);
      entry.vehicle.velocity.x = before.tangentX * 90;
      entry.vehicle.velocity.z = before.tangentZ * 90;
      entry.vehicle.telemetry.speed = 90;
    }
    race.state.raceTime = 148;
    const result = race.step({ throttle: 1 });
    expect(race.state.phase).toBe('finished');
    expect(race.state.results).toHaveLength(4);
    expect(race.state.results.map((entry) => entry.placement)).toEqual([1, 2, 3, 4]);
    expect(race.state.results.every((entry) => entry.finishTime !== null)).toBe(true);
    expect(result.events.filter((event) => event.type === 'finish')).toHaveLength(4);
    expect(result.events.some((event) => event.type === 'results')).toBe(true);
  });

  it('classifies the remaining field shortly after the player finishes', () => {
    const race = createRaceSimulation({
      terrain: dunes,
      countdownSeconds: 0,
      fieldSize: 4,
      resultsGraceSeconds: 2,
    });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    player.status = 'finished';
    player.progress.finishTime = 120;
    player.progress.completedLaps = 3;
    player.progress.currentLap = 3;
    player.progress.lapTimes = [41, 39, 40];
    race.state.raceTime = 120;

    let resultsEvents = 0;
    for (let tick = 0; tick < 260 && race.state.phase !== 'finished'; tick += 1) {
      const result = race.step();
      resultsEvents += result.events.filter((event) => event.type === 'results').length;
    }

    expect(race.state.phase).toBe('finished');
    expect(race.state.raceTime).toBeLessThan(122.2);
    expect(resultsEvents).toBe(1);
    expect(race.state.results).toHaveLength(4);
    expect(race.state.results.map((entry) => entry.placement)).toEqual([1, 2, 3, 4]);
    expect(race.state.results.every((entry) => entry.finishTime !== null)).toBe(true);
    expect(race.state.results.every((entry) => entry.lapTimes.length === 3)).toBe(true);
  });

  it('latches a sustained pylon overlap instead of emitting impacts every tick', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0 });
    race.step();
    const marker = (race as unknown as {
      markerColliders: readonly { x: number; z: number; id: string }[];
    }).markerColliders[0]!;
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    let pylonHits = 0;

    for (let tick = 0; tick < 72; tick += 1) {
      player.vehicle.position.x = marker.x;
      player.vehicle.position.z = marker.z;
      player.vehicle.position.y = dunes.heightAt(marker.x, marker.z) + 2.5;
      player.vehicle.velocity.x = 0;
      player.vehicle.velocity.z = 0;
      const result = race.step();
      pylonHits += (result.vehicleEvents[player.id] ?? []).filter(
        (event) => event.type === 'collision' && event.sourceId === marker.id,
      ).length;
    }

    expect(pylonHits).toBe(1);

    // A real separation re-arms the latch, while the time gate prevents
    // boundary jitter from manufacturing a rapid second hit.
    player.vehicle.position.x = marker.x + 40;
    player.vehicle.position.z = marker.z + 40;
    race.step();
    for (let tick = 0; tick < 108; tick += 1) race.step();
    player.vehicle.position.x = marker.x;
    player.vehicle.position.z = marker.z;
    player.vehicle.velocity.x = 0;
    player.vehicle.velocity.z = 0;
    const reentry = race.step();
    const reentryHits = (reentry.vehicleEvents[player.id] ?? []).filter(
      (event) => event.type === 'collision' && event.sourceId === marker.id,
    );
    expect(reentryHits).toHaveLength(1);
  });

  it('blocks a racer at the authored canyon wall and emits one physical impact', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0 });
    race.step();
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const canyon = Array.from({ length: 512 }, (_, index) => race.course.sampleAtProgress(index / 512))
      .find((sample) => sample.tag === 'narrow-canyon')!;
    player.progress.courseProgress = canyon.progress;
    player.progress.previousProgress = canyon.progress;
    player.vehicle.position.x = canyon.x + canyon.rightX * (canyon.width + 12);
    player.vehicle.position.z = canyon.z + canyon.rightZ * (canyon.width + 12);
    player.vehicle.position.y = dunes.heightAt(player.vehicle.position.x, player.vehicle.position.z) + 2.45;
    player.vehicle.orientation.yaw = Math.atan2(canyon.rightX, canyon.rightZ);
    player.vehicle.velocity.x = canyon.rightX * 80;
    player.vehicle.velocity.y = 0;
    player.vehicle.velocity.z = canyon.rightZ * 80;
    player.vehicle.telemetry.speed = 80;

    const impact = race.step({ throttle: 0 });
    const wallHits = (impact.vehicleEvents[player.id] ?? []).filter(
      (event) => event.type === 'collision' && event.sourceId === 'canyon-wall-right',
    );
    const afterImpact = race.course.projectPoint(
      player.vehicle.position.x,
      player.vehicle.position.z,
      canyon.progress,
    );
    const outwardSpeed = player.vehicle.velocity.x * afterImpact.rightX
      + player.vehicle.velocity.z * afterImpact.rightZ;
    expect(wallHits).toHaveLength(1);
    expect(afterImpact.lateralOffset).toBeLessThan(canyon.width + 3);
    expect(outwardSpeed).toBeLessThan(80);
    expect(player.vehicle.damage).toBeGreaterThan(0);

    let repeatHits = 0;
    for (let tick = 0; tick < 90; tick += 1) {
      const contact = race.step({ throttle: 1 });
      repeatHits += (contact.vehicleEvents[player.id] ?? []).filter(
        (event) => event.type === 'collision' && event.sourceId === 'canyon-wall-right',
      ).length;
    }
    const heldAtWall = race.course.projectPoint(
      player.vehicle.position.x,
      player.vehicle.position.z,
      canyon.progress,
    );
    expect(repeatHits).toBe(0);
    expect(heldAtWall.lateralOffset).toBeLessThan(canyon.width + 3);
  });

  it('automatically recovers an extreme player excursion to the latest safe pose', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0 });
    race.step();
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const section = race.course.sampleAtProgress(0.16);
    const safePose = { ...player.progress.resetPose };
    player.progress.courseProgress = section.progress;
    player.progress.previousProgress = section.progress;
    player.vehicle.position.x = section.x + section.rightX * (section.width + 210);
    player.vehicle.position.z = section.z + section.rightZ * (section.width + 210);
    player.vehicle.position.y = dunes.heightAt(player.vehicle.position.x, player.vehicle.position.z) + 2.45;
    player.vehicle.velocity.x = section.rightX * 40;
    player.vehicle.velocity.z = section.rightZ * 40;
    player.vehicle.controls.resetHeld = true;

    const recovered = race.step({ throttle: 1, reset: true });
    expect(recovered.inputs[player.id]?.reset).toBe(true);
    expect((recovered.vehicleEvents[player.id] ?? []).some((event) => event.type === 'reset')).toBe(true);
    expect(player.vehicle.position.x).toBeCloseTo(safePose.x, 8);
    expect(player.vehicle.position.z).toBeCloseTo(safePose.z, 8);
    expect(player.vehicle.velocity.x).toBe(0);
    expect(player.vehicle.velocity.z).toBe(0);
  });

  it('recovers a sustained major off-course deviation without punishing a brief one', () => {
    const race = createRaceSimulation({
      terrain: dunes,
      countdownSeconds: 0,
      offCourseRecoverySeconds: 0.5,
      offCourseRecoveryDistance: 50,
      extremeOffCourseRecoveryDistance: 180,
      fieldSize: 4,
    });
    race.step();
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const section = race.course.sampleAtProgress(0.16);
    const x = section.x + section.rightX * (section.width + 70);
    const z = section.z + section.rightZ * (section.width + 70);
    let recoveredAt = -1;
    for (let tick = 0; tick < 75; tick += 1) {
      player.vehicle.position.x = x;
      player.vehicle.position.z = z;
      player.vehicle.position.y = dunes.heightAt(x, z) + 2.45;
      player.vehicle.velocity.x = 0;
      player.vehicle.velocity.z = 0;
      const result = race.step();
      if ((result.vehicleEvents[player.id] ?? []).some((event) => event.type === 'reset')) {
        recoveredAt = tick;
        break;
      }
    }
    expect(recoveredAt).toBeGreaterThanOrEqual(58);
    expect(recoveredAt).toBeLessThan(65);
  });

  it('requests checkpoint recovery when an AI makes no forward race progress', () => {
    const race = createRaceSimulation({
      terrain: dunes,
      countdownSeconds: 0,
      aiStallRecoverySeconds: 2,
    });
    race.step();
    const rival = race.state.entries.find((entry) => entry.ai !== null)!;
    const frozen = { x: rival.vehicle.position.x, z: rival.vehicle.position.z };
    let requestedRecovery = false;

    for (let tick = 0; tick < 270 && !requestedRecovery; tick += 1) {
      rival.vehicle.position.x = frozen.x;
      rival.vehicle.position.z = frozen.z;
      rival.vehicle.position.y = dunes.heightAt(frozen.x, frozen.z) + 2.5;
      rival.vehicle.velocity.x = 0;
      rival.vehicle.velocity.z = 0;
      rival.vehicle.telemetry.speed = 0;
      const result = race.step();
      requestedRecovery = result.inputs[rival.id]?.reset === true;
    }

    expect(requestedRecovery).toBe(true);
  });

  it('recovers an AI just before a required checkpoint it already passed', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0 });
    race.step();
    const rival = race.state.entries.find((entry) => entry.ai !== null)!;
    const expected = race.course.checkpoints[5]!;
    const farPast = race.course.sampleAtProgress((expected.progress + 0.24) % 1);
    rival.progress.nextCheckpointIndex = expected.index;
    rival.progress.lastCheckpointIndex = expected.index - 1;
    rival.progress.courseProgress = farPast.progress;
    rival.progress.previousProgress = farPast.progress;
    rival.vehicle.position.x = farPast.x;
    rival.vehicle.position.z = farPast.z;
    rival.vehicle.position.y = dunes.heightAt(farPast.x, farPast.z) + 2.45;

    const result = race.step();
    const recovery = race.course.projectPoint(
      rival.vehicle.respawn.x,
      rival.vehicle.respawn.z,
      expected.progress,
    );
    const forwardToGate = (expected.progress - recovery.progress + 1) % 1;

    expect(result.inputs[rival.id]?.reset).toBe(true);
    expect(forwardToGate * race.course.totalLength).toBeCloseTo(18, 0);
    expect(rival.progress.nextCheckpointIndex).toBe(expected.index);
  });

  it('fully refreshes a supplied player in place for recovery and a new race', () => {
    const supplied = createPodracerState({
      id: 'old-player',
      seed: 17,
      position: { x: 900, y: 80, z: -700 },
      yaw: 1.2,
      terrain: dunes,
    });
    const race = createRaceSimulation({
      terrain: dunes,
      playerVehicle: supplied,
      playerId: 'player',
      countdownSeconds: 0,
      seed: 0x13572468,
    });
    const initialVehicle = structuredClone(supplied);
    const initialEntry = race.state.entries[0];
    expect(initialEntry?.vehicle).toBe(supplied);
    expect(supplied.respawn.x).toBeCloseTo(initialEntry?.progress.resetPose.x ?? 0, 10);
    expect(supplied.respawn.z).toBeCloseTo(initialEntry?.progress.resetPose.z ?? 0, 10);

    supplied.id = 'corrupted';
    supplied.seed = 0;
    supplied.step = 12_345;
    supplied.simulationTime = 91;
    Object.assign(supplied.position, { x: 1_000, y: -99, z: 2_000 });
    Object.assign(supplied.velocity, { x: 80, y: -20, z: 40 });
    Object.assign(supplied.orientation, { yaw: -2, pitch: 0.4, roll: -0.3, bank: 0.2 });
    Object.assign(supplied.angularVelocity, { yaw: 2, pitch: -3, roll: 1, bank: -1 });
    Object.assign(supplied.probes[0]!, {
      worldX: 555,
      worldZ: -555,
      groundHeight: 42,
      clearance: -8,
      compression: 9,
      lift: 777,
      active: false,
    });
    Object.assign(supplied.drift, { active: true, charge: 0.9, slipAngle: 1, direction: -1 });
    Object.assign(supplied.boost, {
      energy: 0.01,
      active: true,
      driftBoostTime: 3,
      overheated: true,
    });
    supplied.heat = 1.2;
    supplied.damage = 0.95;
    supplied.grounded = false;
    supplied.airborneTime = 8;
    Object.assign(supplied.respawn, { x: 0, y: 99, z: 0, yaw: 2.5 });
    Object.assign(supplied.controls, { driftHeld: true, boostHeld: true, resetHeld: true });
    Object.assign(supplied.telemetry, {
      speed: 200,
      forwardSpeed: 180,
      lateralSpeed: 60,
      normalizedSpeed: 1.4,
      groundClearance: -3,
      support: 0,
      engineTorque: 1,
      landingIntensity: 1,
    });

    race.reset();

    expect(race.state.entries[0]?.vehicle).toBe(supplied);
    expect(supplied).toEqual(initialVehicle);

    const recovery = { ...supplied.respawn };
    race.step({ reset: true });
    expect(supplied.position.x).toBeCloseTo(recovery.x, 10);
    expect(supplied.position.z).toBeCloseTo(recovery.z, 10);
    expect(supplied.position.x).not.toBeCloseTo(0, 2);
    expect(supplied.position.z).not.toBeCloseTo(0, 2);
  });

  it('produces bounded equal-and-opposite racer collision events', () => {
    const race = createRaceSimulation({ terrain: dunes, countdownSeconds: 0 });
    race.step(); // zero-second countdown transitions into racing
    const player = race.state.entries[0]!;
    const rival = race.state.entries[1]!;
    Object.assign(player.vehicle.position, { x: 120, y: 5, z: 220 });
    Object.assign(rival.vehicle.position, { x: 130, y: 5.2, z: 220 });
    Object.assign(player.vehicle.velocity, { x: 42, y: 0, z: 0 });
    Object.assign(rival.vehicle.velocity, { x: -28, y: 0, z: 0 });

    const result = race.step({ throttle: 0 });
    const playerHits = result.vehicleEvents[player.id]?.filter((event) => event.type === 'collision');
    const rivalHits = result.vehicleEvents[rival.id]?.filter((event) => event.type === 'collision');
    expect(playerHits).toHaveLength(1);
    expect(rivalHits).toHaveLength(1);
    expect(player.vehicle.velocity.x).toBeLessThan(42);
    expect(rival.vehicle.velocity.x).toBeGreaterThan(-28);
    expect(player.vehicle.damage).toBeGreaterThan(0);
    expect(rival.vehicle.damage).toBeGreaterThan(0);
    expect(Number.isFinite(player.vehicle.position.x)).toBe(true);
    expect(Number.isFinite(rival.vehicle.position.x)).toBe(true);

    let repeatedPlayerHits = 0;
    let repeatedRivalHits = 0;
    for (let tick = 0; tick < 72; tick += 1) {
      Object.assign(player.vehicle.position, { x: 120, y: 5, z: 220 });
      Object.assign(rival.vehicle.position, { x: 130, y: 5.2, z: 220 });
      Object.assign(player.vehicle.velocity, { x: 0, y: 0, z: 0 });
      Object.assign(rival.vehicle.velocity, { x: 0, y: 0, z: 0 });
      const sustained = race.step({ throttle: 0 });
      repeatedPlayerHits += (sustained.vehicleEvents[player.id] ?? []).filter(
        (event) => event.type === 'collision' && event.sourceId === rival.id,
      ).length;
      repeatedRivalHits += (sustained.vehicleEvents[rival.id] ?? []).filter(
        (event) => event.type === 'collision' && event.sourceId === player.id,
      ).length;
    }
    expect(repeatedPlayerHits).toBe(0);
    expect(repeatedRivalHits).toBe(0);
  });
});
