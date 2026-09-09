import { describe, expect, it } from 'vitest';
import { RaceSimulation, type RaceStepResult } from '../../src/game/race/RaceSimulation';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';
import { RaceMastery, getMasteryEvent } from '../../src/game/mastery';
import { CombatPresentationController, type CombatPresentationContext } from '../../src/render/combat/CombatPresentationController';

const event = getMasteryEvent('inkstorm-trial');
const makeRace = () => new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: event.seed,
  competitionProfile: 'time-trial', countdownSeconds: 0, totalLaps: 1 });
const makeMastery = () => {
  const mastery = new RaceMastery(null, () => new Date('2026-09-09T00:00:00Z'));
  mastery.beginRun({ event, courseSeed: event.seed, directorSeed: event.seed,
    vehicleClass: 'podracer', tune: DEFAULT_PODRACER_CONFIG });
  return mastery;
};
const context = (role: 'solo' | 'host' | 'guest', invalidated: boolean): CombatPresentationContext => ({
  role, localRacerId: 'player', racing: true, paused: false, capture: false,
  reducedMotion: false, motionIntensity: 1, allowOffensiveSlowMotion: false,
  allowVictimSlowMotion: invalidated, racerName: (id) => id,
});

function ordinaryOverheat(role: 'solo' | 'host' = 'solo', pacing = true) {
  const race = makeRace(); const mastery = makeMastery();
  const controller = new CombatPresentationController();
  let wall = 0; let accumulator = 0; let invalidated = false; let wreckTick = -1;
  let explosionTick = -1; let minimumScale = 1; let last: RaceStepResult | null = null;
  const dt = DEFAULT_PODRACER_CONFIG.fixedDelta;
  while (race.state.step < 720 && wall < 10_000) {
    wall += 1000 / 60;
    accumulator += pacing ? controller.scheduleDelta(1 / 60, wall, context(role, invalidated)) : 1 / 60;
    while (accumulator >= dt && race.state.step < 720) {
      // Ordinary semantic inputs only; no health/heat/world/event fixture writes.
      last = race.step({ brake: 1, boost: race.state.step < 420 });
      mastery.step(last);
      if (last.galacticEvents.some((item) => item.type === 'redline-explosion' && item.racerId === 'player')) explosionTick = race.state.step;
      if (last.galacticEvents.some((item) => item.type === 'wreck' && item.racerId === 'player')) {
        invalidated = true; wreckTick = race.state.step;
      }
      controller.consume(last.galacticEvents.map((item, index) => ({ id: `${race.state.step}:${index}`, event: item })),
        wall, context(role, invalidated));
      accumulator -= dt;
    }
    minimumScale = Math.min(minimumScale, controller.frame(wall, context(role, invalidated)).timeScale);
  }
  expect(last).not.toBeNull();
  expect(race.state.step).toBe(720);
  expect(explosionTick).toBeGreaterThan(0);
  expect(wreckTick).toBe(explosionTick);
  return { race, mastery, last: last!, controller, wall, minimumScale };
}

/**
 * A deliberately synthetic finish boundary isolates mastery persistence after
 * the real overheat ticks. It does not claim the brake/boost drive completed a lap.
 */
function finishBoundaryFixture(last: RaceStepResult): RaceStepResult {
  const result = structuredClone(last);
  result.state.step += 1;
  result.state.phase = 'finished';
  const player = result.state.entries.find((entry) => entry.id === 'player')!;
  player.status = 'finished'; player.progress.completedLaps = 1;
  player.progress.finishTime = result.state.raceTime;
  player.progress.lapTimes = [result.state.raceTime];
  result.events = []; result.galacticEvents = []; result.vehicleEvents = {};
  return result;
}

describe('combat presentation at the actual simulation boundary', () => {
  it('produces a real input-driven overheat/wreck and preserves exact deterministic truth under scheduler pacing', () => {
    const unpaced = ordinaryOverheat('solo', false);
    const paced = ordinaryOverheat('solo', true);
    expect(paced.minimumScale).toBe(0.18);
    expect(paced.wall - unpaced.wall).toBeGreaterThan(450);
    expect(paced.wall - unpaced.wall).toBeLessThan(650);
    expect(paced.race.snapshot()).toEqual(unpaced.race.snapshot());
    expect(paced.race.state.raceTime).toBeCloseTo(720 / 120, 10);
    expect(paced.race.state.entries[0]?.galactic?.wreck.crashCount).toBeGreaterThan(0);
  });

  it('retains the existing wreck record rejection with and without a cinematic, using an explicit synthetic finish boundary', () => {
    for (const pacing of [false, true]) {
      const run = ordinaryOverheat('solo', pacing);
      run.mastery.step(finishBoundaryFixture(run.last));
      expect(run.mastery.result).toMatchObject({ personalBest: false, medal: 'none' });
      expect(run.mastery.result?.invalidReason).toContain('Recovery used');
      expect(run.mastery.profile.records).toEqual({});
      expect(run.mastery.profile.history.at(-1)?.valid).toBe(false);
    }
  });

  it('keeps the host clock real time through actual wreck events and gives a guest only restored authority plus feedback', () => {
    const host = ordinaryOverheat('host', true);
    expect(host.minimumScale).toBe(1);
    expect(host.wall).toBeCloseTo(6000, 5);
    const guest = makeRace(); const controller = new CombatPresentationController();
    const authority = makeRace(); let observedWreck = false;
    for (let tick = 0; tick < 420; tick += 1) {
      const result = authority.step({ brake: 1, boost: true });
      // The guest never calls step: it receives the host's real event and snapshot.
      guest.restoreAuthoritativeSnapshot(authority.snapshot(), 'player');
      controller.consume(result.galacticEvents.map((item, index) => ({ id: `${tick}:${index}`, event: item })),
        tick * 1000 / 120, context('guest', true));
      expect(controller.scheduleDelta(1 / 60, tick * 1000 / 120, context('guest', true))).toBe(1 / 60);
      if (result.galacticEvents.some((item) => item.type === 'wreck' && item.racerId === 'player')) {
        observedWreck = true;
        expect(controller.frame(tick * 1000 / 120, context('guest', true))).toMatchObject({
          cue: { kind: 'wreck' }, timeScale: 1, cinematic: { active: false },
        });
      }
    }
    expect(observedWreck).toBe(true);
    expect(guest.snapshot()).toEqual(authority.snapshot());
  });

  it('has no outgoing offense in an actual clean-profile drive; synthetic outgoing policy is covered separately', () => {
    const race = makeRace(); const controller = new CombatPresentationController();
    for (let tick = 0; tick < 180; tick += 1) {
      const result = race.step({ brake: 1, fire: true, mine: true, shield: true });
      expect(result.galacticEvents.some((item) => ['heat-lance-fired', 'scrap-mine-deployed', 'takedown'].includes(item.type))).toBe(false);
      controller.consume(result.galacticEvents.map((item, index) => ({ id: `${tick}:${index}`, event: item })), tick * 1000 / 120, context('solo', false));
      expect(controller.scheduleDelta(1 / 60, tick * 1000 / 120, context('solo', false))).toBe(1 / 60);
    }
    expect(race.state.galacticWorld.projectiles).toEqual([]);
    expect(race.state.galacticWorld.mines).toEqual([]);
  });
});
