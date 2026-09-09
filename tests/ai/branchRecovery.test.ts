import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { createPodracerState } from '../../src/game/simulation/podracer';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

describe('legal shortcut recovery boundary', () => {
  it('keeps a craft on the Glass Cup shortcut even when the main road is far away', () => {
    const terrain = { heightAt: sampleTerrainHeight };
    const race = createRaceSimulation({ terrain, seed: 0x474c4153, competitionProfile: 'time-trial',
      countdownSeconds: 0, offCourseRecoverySeconds: 0.5 });
    race.step();
    const branch = race.course.branches.find((route) => route.kind === 'shortcut')!;
    const point = branch.points[Math.floor(branch.points.length / 2)]!;
    const next = branch.points[Math.floor(branch.points.length / 2) + 1]!;
    const canonical = race.course.sampleAtProgress(point.canonicalProgress);
    const canonicalLateral = Math.abs((point.x - canonical.x) * canonical.rightX
      + (point.z - canonical.z) * canonical.rightZ);
    expect(canonicalLateral - canonical.width).toBeGreaterThan(60);

    const player = race.state.entries[0]!;
    player.vehicle = createPodracerState({ id: player.id, terrain, position: { x: point.x, z: point.z },
      yaw: Math.atan2(next.x - point.x, next.z - point.z) });
    player.progress.courseProgress = point.canonicalProgress;
    player.progress.previousProgress = point.canonicalProgress;
    player.progress.unwrappedProgress = point.canonicalProgress;
    player.progress.offCourseDistance = 0;
    let resets = 0;
    // The pose is an initial test fixture. All subsequent movement uses normal
    // fixed simulation steps; no repeated teleport can conceal a recovery.
    for (let tick = 0; tick < 180; tick += 1) {
      const result = race.step({ throttle: 0, brake: 1 });
      resets += (result.vehicleEvents[player.id] ?? []).filter((event) => event.type === 'reset').length;
    }
    expect(resets).toBe(0);
    expect(player.progress.offCourseDistance).toBe(0);
    expect(Math.hypot(player.vehicle.position.x - point.x, player.vehicle.position.z - point.z)).toBeLessThan(10);
  });
});
