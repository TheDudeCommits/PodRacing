import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';

describe('rivalry beats', () => {
  it('settles the grudge with an event when you wreck the racer who wrecked you', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 11, countdownSeconds: 0, competitionProfile: 'clean-race', fieldSize: 3 });
    race.step({});
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const rival = race.state.entries.find((entry) => !entry.isPlayer)!;
    player.galactic!.rivalry.rivalId = rival.id;
    player.galactic!.rivalry.remaining = 30;
    rival.galactic!.wreck.recentAggressorId = player.id;
    rival.galactic!.wreck.recentAggressorTime = 1.5;
    expect(race.forceWreck(rival.id)).toBe(true);
    const result = race.step({});
    expect(result.galacticEvents).toContainEqual({ type: 'takedown', attackerId: player.id, victimId: rival.id, cause: 'impact' });
    expect(result.galacticEvents).toContainEqual({ type: 'rivalry-settled', racerId: player.id, rivalId: rival.id });
    expect(player.galactic!.rivalry.rivalId).toBeNull();
    expect(race.state.galacticWorld.debris!.length).toBeGreaterThan(0);
  });

  it('calls a revenge pass when the racer you pass is your marked rival', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 11, countdownSeconds: 0, competitionProfile: 'clean-race', fieldSize: 3 });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const rivals = race.state.entries.filter((entry) => !entry.isPlayer);
    const place = (entry: typeof player, progress: number, speed: number) => {
      const sample = race.course.sampleAtProgress(progress);
      entry.vehicle.position.x = sample.x; entry.vehicle.position.z = sample.z; entry.vehicle.position.y = sample.y + 2.45;
      entry.vehicle.orientation.yaw = Math.atan2(sample.tangentX, sample.tangentZ);
      entry.vehicle.velocity.x = sample.tangentX * speed; entry.vehicle.velocity.z = sample.tangentZ * speed;
      entry.progress.courseProgress = progress; entry.progress.unwrappedProgress = progress; entry.progress.previousProgress = progress;
    };
    place(player, 0.100, 120);
    place(rivals[0]!, 0.102, 10);
    place(rivals[1]!, 0.05, 10);
    player.galactic!.rivalry.rivalId = rivals[0]!.id;
    player.galactic!.rivalry.remaining = 30;
    const externalInputs = Object.fromEntries(rivals.map((entry) => [entry.id, { throttle: 0, brake: 1 }]));
    let pass = null as null | { racerId: string; rivalId: string };
    for (let tick = 0; tick < 240 && !pass; tick += 1) {
      const result = race.step({ throttle: 1 }, externalInputs);
      for (const event of result.galacticEvents) if (event.type === 'revenge-pass') pass = { racerId: event.racerId, rivalId: event.rivalId };
    }
    expect(pass).toEqual({ racerId: player.id, rivalId: rivals[0]!.id });
  });
});
