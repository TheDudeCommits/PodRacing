import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { stepDraftingField, wakeReach } from '../../src/game/race/dynamics';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';

function pair(behind: number) {
  const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 7, countdownSeconds: 0, competitionProfile: 'clean-race', fieldSize: 2 });
  const [leader, follower] = race.state.entries;
  for (const [entry, z] of [[leader, 0], [follower, -behind]] as const) {
    entry!.vehicle.position.x = 0; entry!.vehicle.position.z = z;
    entry!.vehicle.orientation.yaw = 0;
    entry!.vehicle.velocity.x = 0; entry!.vehicle.velocity.z = 90;
    entry!.vehicle.telemetry.speed = 90;
    entry!.status = 'racing';
  }
  return { race, leader: leader!, follower: follower! };
}

describe('catch-up through the draft', () => {
  it('reaches further behind the leader as the gap to the race leader grows', () => {
    expect(wakeReach(0)).toBe(70);
    expect(wakeReach(1)).toBe(120);
    expect(wakeReach(0.5)).toBe(95);
  });

  it('tows a trailing racer harder and charges the slingshot faster, never touching the leader', () => {
    const run = (catchUp: number) => {
      const { race, leader, follower } = pair(40);
      for (let tick = 0; tick < 240; tick += 1) stepDraftingField(race.state.entries, 1 / 120, () => catchUp);
      return { leaderZ: leader.vehicle.velocity.z, followerZ: follower.vehicle.velocity.z, charge: follower.drafting!.charge, catchUp: follower.drafting!.catchUp };
    };
    const plain = run(0), boosted = run(1);
    expect(plain.leaderZ).toBeCloseTo(90, 9);
    expect(boosted.leaderZ).toBeCloseTo(90, 9);
    expect(plain.followerZ).toBeGreaterThan(90);
    expect(boosted.followerZ - 90).toBeGreaterThan((plain.followerZ - 90) * 2.5);
    expect(boosted.charge).toBeGreaterThan(plain.charge);
    expect(boosted.catchUp).toBe(1);
  });

  it('only reaches a racer 100 m back when the catch-up factor is high', () => {
    const near = pair(100);
    stepDraftingField(near.race.state.entries, 1 / 120, () => 0);
    expect(near.follower.drafting!.leaderId).toBeNull();
    const far = pair(100);
    stepDraftingField(far.race.state.entries, 1 / 120, () => 1);
    expect(far.follower.drafting!.leaderId).toBe(far.leader.id);
  });

  it('derives the factor from distance behind the race leader in a real race', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 7, countdownSeconds: 0, competitionProfile: 'clean-race', fieldSize: 4 });
    for (let tick = 0; tick < 120 * 6; tick += 1) race.step({ throttle: 0 });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const leader = race.state.entries.find((entry) => entry.progress.placement === 1)!;
    expect(leader.drafting!.catchUp).toBe(0);
    const behind = (leader.progress.unwrappedProgress - player.progress.unwrappedProgress) * race.course.totalLength;
    expect(player.drafting!.catchUp).toBeCloseTo(Math.min(1, Math.max(0, (behind - 60) / 360)), 6);
  });
});
