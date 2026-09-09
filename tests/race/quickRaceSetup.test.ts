import { describe, expect, it } from 'vitest';
import { RaceMastery, getMasteryEvent } from '../../src/game/mastery';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';
import { SELECTABLE_POD_APPEARANCES, selectablePodAppearance } from '../../src/game/vehicleAppearance';

function launch(eventId: string) {
  const event = getMasteryEvent(eventId);
  return new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: event.seed,
    competitionProfile: event.profile, totalLaps: event.laps, mode: event.mode,
    aiDifficulty: event.difficulty, countdownSeconds: 0 });
}

describe('simple race setup choices', () => {
  it('starts a new session with seven moving opponents and working weapons', () => {
    const mastery = new RaceMastery(null);
    expect(mastery.selectedEvent.id).toBe('inkstorm-battle');
    const race = launch(mastery.selectedEvent.id);
    expect(race.state.entries).toHaveLength(8);
    const before = race.state.entries.slice(1).map(entry => ({ ...entry.vehicle.position }));
    for (let tick = 0; tick < 180; tick++) race.step({ throttle: 1, fire: true, mine: true });
    expect(race.state.entries[0]!.galactic!.weapon.shotsFired).toBeGreaterThan(0);
    expect(race.state.entries[0]!.galactic!.mine.deployed).toBeGreaterThan(0);
    for (let i = 1; i < 8; i++) {
      const point = before[i - 1]!, now = race.state.entries[i]!.vehicle.position;
      expect(Math.hypot(now.x - point.x, now.z - point.z)).toBeGreaterThan(2);
    }
  });

  it('keeps Race populated and Time Trial explicitly solo with combat disabled', () => {
    for (const [eventId, size] of [['inkstorm-race', 8], ['inkstorm-trial', 1]] as const) {
      const race = launch(eventId);
      expect(race.state.entries).toHaveLength(size);
      for (let tick = 0; tick < 30; tick++) race.step({ throttle: 1, fire: true, mine: true });
      expect(race.state.entries[0]!.galactic!.weapon.shotsFired).toBe(0);
      expect(race.state.entries[0]!.galactic!.mine.deployed).toBe(0);
    }
  });

  it('maps legacy procedural appearance to an inspectable pod without offering legacy classes', () => {
    expect(selectablePodAppearance('procedural')).toBe('teemto');
    for (const appearance of SELECTABLE_POD_APPEARANCES) {
      expect(selectablePodAppearance(appearance)).toBe(appearance);
    }
    expect(SELECTABLE_POD_APPEARANCES).not.toContain('procedural');
  });
});
