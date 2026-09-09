import { describe, expect, it } from 'vitest';
import { RaceSimulation, type RaceStepResult } from '../../src/game/race/RaceSimulation';
import { FLAT_HEIGHT_SAMPLER, DEFAULT_PODRACER_CONFIG } from '../../src/game/simulation';
import { createRacerLaunchState, resolveLaunchOutcome, stepLaunchCharge } from '../../src/game/race/dynamics';
import {
  CHAMPIONSHIP_EVENT_IDS, DrivingTutorial, MASTERY_STORAGE_KEY, RaceMastery,
  createRecordIdentity, dailyMasteryEvent, emptyMasteryProfile, getMasteryEvent,
  parseMasteryProfile, recordIdentityKey, sampleGhost, saveMasteryProfile,
  type MasteryStartOptions, type MasteryStorage,
} from '../../src/game/mastery';

class MemoryStorage implements MasteryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}
const fixedNow = () => new Date('2026-09-06T11:00:00.000Z');
const trial = getMasteryEvent('inkstorm-trial');
const options = (event = trial): MasteryStartOptions => ({ event, courseSeed: event.seed, directorSeed: event.seed,
  vehicleClass: 'podracer', tune: DEFAULT_PODRACER_CONFIG });
const race = new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: trial.seed, competitionProfile: 'time-trial', totalLaps: 1 });
const base = race.snapshot();

/** Replay-authority fixture with ordered timing gates and physically smooth poses. */
function frame(time: number, totalTime: number, event = trial, reset = false): RaceStepResult {
  const state = structuredClone(base);
  state.step = Math.round(time * 120) + 1;
  state.phase = time === 0 ? 'countdown' : time >= totalTime ? 'finished' : 'racing';
  state.raceTime = time;
  state.totalLaps = event.laps;
  const player = state.entries[0]!;
  player.status = time >= totalTime ? 'finished' : 'racing';
  player.vehicle.position.z = time * 30;
  player.vehicle.telemetry.speed = 30;
  player.progress.placement = 1;
  if (time >= totalTime / 2) player.progress.splits.push({ lap: 1, checkpointIndex: 1, raceTime: totalTime / 2, segmentTime: totalTime / 2 });
  if (time >= totalTime) {
    player.progress.completedLaps = event.laps;
    player.progress.finishTime = totalTime;
    player.progress.lapTimes = Array.from({ length: event.laps }, () => totalTime / event.laps);
    player.progress.splits.push({ lap: event.laps, checkpointIndex: 0, raceTime: totalTime, segmentTime: totalTime / 2 });
    state.results = [
      { id: 'player', name: 'You', placement: 1, finishTime: totalTime, lapTimes: player.progress.lapTimes, splits: player.progress.splits },
      { id: 'ai-vexa', name: 'Vexa Ruun', placement: 2, finishTime: totalTime + 2, lapTimes: [], splits: [] },
    ];
  }
  return { state, events: [], aiEvents: [], galacticEvents: [], inputs: {},
    vehicleEvents: reset ? { player: [{ type: 'reset', position: player.vehicle.position }] } : {} };
}

function finish(mastery: RaceMastery, totalTime: number, event = trial, recovered = false): void {
  mastery.beginRun(options(event));
  for (let sample = 0; sample <= totalTime * 10; sample += 1) {
    const time = sample / 10;
    mastery.step(frame(time, totalTime, event, recovered && sample === 5));
  }
}

describe('persistent driving mastery', () => {
  it('carries a measured pursuit into the same retry without changing stored records', () => {
    const storage = new MemoryStorage(), mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 100); finish(mastery, 110);
    const record = JSON.stringify(mastery.profile.records);
    expect(mastery.result?.retryTarget).toMatchObject({ sectorIndex: 1, loss: 5 });
    mastery.beginRun(options());
    expect(mastery.model().retryTarget).toMatchObject({ sectorIndex: 1, loss: 5 });
    expect(mastery.model({ ...options(), vehicleClass: 'speeder-bike' }).retryTarget).toBeNull();
    expect(JSON.stringify(mastery.profile.records)).toBe(record);
    mastery.selectEvent('flight-school'); expect(mastery.model().retryTarget).toBeNull();
  });
  it('clears competitive pace immediately on recovery and gives no invalid retry target', () => {
    const mastery = new RaceMastery(new MemoryStorage(), fixedNow);
    finish(mastery, 100); mastery.beginRun(options());
    mastery.step(frame(60, 110));
    expect(mastery.model().latestSector?.paceDelta).toBe(5);
    mastery.step(frame(61, 110, trial, true));
    expect(mastery.model().latestSector?.paceDelta).toBeNull();
    mastery.step(frame(110, 110));
    expect(mastery.result?.retryTarget).toBeNull();
  });
  it('clears a pursuit when a faster total replaces the PB despite a slower sector', () => {
    const mastery = new RaceMastery(new MemoryStorage(), fixedNow);
    finish(mastery, 100);
    finish(mastery, 110);
    expect(mastery.model().retryTarget).not.toBeNull();
    mastery.beginRun(options());
    for (let sample = 0; sample <= 970; sample++) {
      const time = sample / 10, result = frame(time, 97);
      result.state.entries[0]!.progress.splits = [
        ...(time >= 45 ? [{ lap: 1, checkpointIndex: 1, raceTime: 45, segmentTime: 45 }] : []),
        ...(time >= 97 ? [{ lap: 1, checkpointIndex: 0, raceTime: 97, segmentTime: 52 }] : []),
      ];
      mastery.step(result);
    }
    expect(mastery.result).toMatchObject({ personalBest: true, bestTime: 97,
      sectors: [{ delta: -5 }, { delta: 2 }], retryTarget: null });
    expect(Object.values(mastery.profile.records)[0]!.sectors).toEqual([45, 52]);
    mastery.beginRun(options());
    expect(mastery.model()).toMatchObject({ bestTime: 97, retryTarget: null });
    mastery.step(frame(50, 94));
    expect(mastery.model().latestSector).toMatchObject({ time: 47, delta: 2, paceDelta: 2 });
  });
  it('saves exact conditions, gate sectors, medal and a replayable personal-best ghost through reload', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 100);
    expect(mastery.result).toMatchObject({ personalBest: true, medal: 'silver', time: 100, nextMedal: { medal: 'gold', time: 90 } });
    const reloaded = new RaceMastery(storage, fixedNow);
    reloaded.beginRun(options());
    expect(reloaded.model()).toMatchObject({ bestTime: 100, ghostAvailable: true, medal: 'silver' });
    expect(reloaded.ghostPose(50)?.z).toBeCloseTo(1500);
    expect(reloaded.ghostPose(100.01)).toBeNull();
    expect(Object.values(reloaded.profile.records)[0]!.sectors).toEqual([50, 50]);
  });

  it('compares matching sectors and keeps a slower or tied attempt from replacing the ghost', () => {
    const mastery = new RaceMastery(new MemoryStorage(), fixedNow);
    finish(mastery, 100);
    finish(mastery, 110);
    expect(mastery.result).toMatchObject({ personalBest: false, bestTime: 100, sectors: [{ delta: 5 }, { delta: 5 }] });
    finish(mastery, 100);
    expect(mastery.result?.personalBest).toBe(false);
    finish(mastery, 90);
    expect(mastery.result).toMatchObject({ personalBest: true, improvement: 10, medal: 'gold', sectors: [{ delta: -5 }, { delta: -5 }] });
  });

  it('never awards records or medals for a recovery or diagnostic run', () => {
    const mastery = new RaceMastery(new MemoryStorage(), fixedNow);
    finish(mastery, 90, trial, true);
    expect(mastery.result?.invalidReason).toContain('Recovery');
    expect(mastery.result?.medal).toBe('none');
    expect(Object.keys(mastery.profile.records)).toHaveLength(0);
    mastery.beginRun({ ...options(), recordEligible: false });
    mastery.step(frame(90, 90));
    expect(Object.keys(mastery.profile.records)).toHaveLength(0);
    expect(mastery.profile.history).toHaveLength(1);
  });

  it('does not merge classes, builds, physics tunes, rules, laps or seeds', () => {
    const original = createRecordIdentity(options());
    const key = recordIdentityKey(original);
    for (const changed of [
      { vehicleClass: 'speeder-bike' }, { loadoutKey: 'other-build' }, { tuneKey: 'other-tune' },
      { courseSeed: original.courseSeed + 1 }, { laps: 2 }, { rulesVersion: 'next' },
      { physicsVersion: 'next' }, { generatorVersion: 'next' }, { directorSeed: 123 },
      { mode: 'combat-race' }, { profile: 'chaos' }, { difficulty: 'hard' },
    ]) expect(recordIdentityKey({ ...original, ...changed } as typeof original)).not.toBe(key);
    const a = createRecordIdentity({ ...options(), tune: { b: 2, a: 1 } });
    const b = createRecordIdentity({ ...options(), tune: { a: 1, b: 2 } });
    expect(recordIdentityKey(a)).toBe(recordIdentityKey(b));
  });

  it('rejects mismatched physics versions and malformed ghosts without losing unrelated records', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 100);
    const value = JSON.parse(storage.getItem(MASTERY_STORAGE_KEY)!);
    const record = Object.values(value.records)[0] as { identity: { physicsVersion: string }; ghost: { frames: number[][] } };
    record.ghost.frames[2]![0] = -1;
    expect(Object.values(parseMasteryProfile(JSON.stringify(value)).records)[0]?.ghost).toBeNull();
    record.identity.physicsVersion = 'obsolete';
    expect(Object.keys(parseMasteryProfile(JSON.stringify(value)).records)).toHaveLength(0);
    expect(parseMasteryProfile('{invalid')).toEqual(emptyMasteryProfile());
    expect(parseMasteryProfile('{"version":2}')).toEqual(emptyMasteryProfile());
  });

  it('stores favorites, exposes them as runnable events, and deduplicates by seed', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    mastery.saveCourse(456);
    mastery.saveCourse(456);
    const reloaded = new RaceMastery(storage, fixedNow);
    expect(reloaded.profile.favorites).toHaveLength(1);
    expect(reloaded.selectEvent('saved-456')).toMatchObject({ seed: 456, profile: 'time-trial' });
    expect(reloaded.model().courseSaved).toBe(true);
    expect(reloaded.model().events.some((event) => event.id === 'saved-456')).toBe(true);
  });

  it('records championship rounds once, enforces order and restores cumulative named-rival points', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 180, getMasteryEvent('cup-foundry'));
    expect(mastery.profile.championship.rounds).toHaveLength(0);
    for (const id of CHAMPIONSHIP_EVENT_IDS) finish(mastery, 180, getMasteryEvent(id));
    expect(mastery.profile.championship.rounds).toHaveLength(3);
    expect(mastery.model().championship).toEqual([
      { name: 'You', points: 45, isPlayer: true }, { name: 'Vexa Ruun', points: 36, isPlayer: false },
    ]);
    finish(mastery, 180, getMasteryEvent('cup-glass'));
    expect(mastery.profile.championship.rounds).toHaveLength(3);
    const reloaded = new RaceMastery(storage, fixedNow);
    expect(reloaded.model().championshipRound).toBe(3);
    reloaded.restartChampionship();
    expect(reloaded.profile.championship.rounds).toHaveLength(0);
    expect(reloaded.selectedEvent.id).toBe('cup-canyon');
  });

  it('keeps a completed cup and records through selection/reload, then starts only a fresh points series on replay', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    mastery.saveCourse();
    mastery.toggleGhost();
    for (const id of CHAMPIONSHIP_EVENT_IDS) finish(mastery, 180, getMasteryEvent(id));
    const completed = structuredClone(mastery.profile);
    expect(mastery.result?.nextEventId).toBeNull();
    expect(mastery.result?.nextObjective).toContain('Cup complete');

    const reloaded = new RaceMastery(storage, fixedNow);
    reloaded.selectEvent('cup-canyon');
    expect(reloaded.model().championshipContext?.title).toBe('Single-round practice');
    expect(reloaded.profile).toEqual(completed);

    reloaded.restartChampionship();
    expect(reloaded.selectedEvent.id).toBe('cup-canyon');
    expect(reloaded.model()).toMatchObject({ championship: [], championshipRound: 0, result: null,
      championshipContext: { title: 'Cup round 1 of 3', actionLabel: 'Start championship' } });
    expect(reloaded.profile).toEqual({ ...completed, championship: { version: 1, rounds: [] } });
    expect(new RaceMastery(storage, fixedNow).profile).toEqual(reloaded.profile);

    // A slower replay banks new-series points without replacing a prior PB/ghost.
    const canyon = getMasteryEvent('cup-canyon');
    finish(reloaded, 200, canyon);
    reloaded.step(frame(200, 200, canyon));
    reloaded.step(frame(201, 200, canyon));
    expect(reloaded.profile.championship.rounds).toHaveLength(1);
    expect(reloaded.model().championship).toEqual([
      { name: 'You', points: 15, isPlayer: true }, { name: 'Vexa Ruun', points: 12, isPlayer: false },
    ]);
    expect(reloaded.result?.nextEventId).toBe('cup-foundry');
    expect(reloaded.profile.records).toEqual(completed.records);
    expect(reloaded.profile.favorites).toEqual(completed.favorites);
    expect(reloaded.profile.history).toHaveLength(completed.history.length + 1);
    expect(new RaceMastery(storage, fixedNow).model().championshipRound).toBe(1);
  });

  it('deduplicates observed ticks and persists ghost visibility preferences', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 100);
    mastery.step(frame(100, 100));
    expect(mastery.profile.history).toHaveLength(1);
    mastery.toggleGhost();
    expect(new RaceMastery(storage, fixedNow).profile.ghostEnabled).toBe(false);
  });

  it('uses an identical UTC daily course across time zones and rotates on the next day', () => {
    expect(dailyMasteryEvent(new Date('2026-09-06T08:00:00+07:00')))
      .toEqual(dailyMasteryEvent(new Date('2026-09-05T18:00:00-07:00')));
    expect(dailyMasteryEvent(new Date('2026-09-06T23:59:59Z')).seed)
      .not.toBe(dailyMasteryEvent(new Date('2026-09-07T00:00:00Z')).seed);
  });

  it('retains valid best times when ghost quota fails and reports total storage failure truthfully', () => {
    const storage = new MemoryStorage();
    const mastery = new RaceMastery(storage, fixedNow);
    finish(mastery, 100);
    const small: MasteryStorage = { getItem: () => null, setItem: (key, value) => {
      if (value.length > 10000) throw new Error('quota');
      storage.setItem(key, value);
    } };
    expect(saveMasteryProfile(mastery.profile, small)).toContain('Ghost storage is full');
    expect(new RaceMastery(storage, fixedNow).model(options()).bestTime).toBe(100);
    expect(saveMasteryProfile(mastery.profile, { getItem: () => null, setItem: () => { throw new Error('quota'); } })).toContain('until the page closes');
  });

  it('interpolates heading across the wrap and hides implausible ghost jumps', () => {
    const ghost = { version: 1 as const, identityKey: 'test', duration: 1, sampleHz: 10 as const,
      frames: [[0, 0, 0, 0, 3.1, 0, 0, 0], [1, 1, 0, 0, -3.1, 0, 0, 0]] as [number, number, number, number, number, number, number, number][] };
    expect(Math.abs(sampleGhost(ghost, 0.5)!.yaw)).toBeCloseTo(Math.PI);
    ghost.frames[1]![1] = 500;
    expect(sampleGhost(ghost, 0.5)).toBeNull();
  });
});

describe('fixed competition and driving lessons', () => {
  it('makes trials solo and clean while preserving original chaos and grid locks', () => {
    const trialRace = new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, competitionProfile: 'time-trial', countdownSeconds: 0 });
    expect(trialRace.state.entries).toHaveLength(1);
    expect(trialRace.state.galacticWorld.hazards).toHaveLength(0);
    expect(trialRace.state.galacticWorld.pickups).toHaveLength(0);
    expect(trialRace.state.director.events).toHaveLength(0);
    trialRace.lockPlayerVehicleSelection();
    expect(trialRace.selectPlayerVehicle('speeder-bike')).toBeNull();
    for (let tick = 0; tick < 120; tick += 1) trialRace.step({ fire: true, mine: true, shield: true, throttle: 0.7 });
    expect(trialRace.state.entries[0]!.galactic!.weapon.shotsFired).toBe(0);
    expect(trialRace.state.entries[0]!.galactic!.mine.deployed).toBe(0);
    expect(trialRace.state.galacticWorld.projectiles).toHaveLength(0);
    const chaos = new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER });
    expect(chaos.state.entries).toHaveLength(8);
    expect(chaos.state.galacticWorld.hazards.length).toBeGreaterThan(0);
    expect(chaos.state.director.events.length).toBeGreaterThan(0);
  });

  it('keeps clean-race AI at its authored pace and keeps hazards disabled when laps change', () => {
    const clean = new RaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, competitionProfile: 'clean-race', countdownSeconds: 0 });
    clean.state.entries[0]!.progress.unwrappedProgress = 10;
    clean.step({});
    expect(clean.state.entries.slice(1).every((entry) => entry.ai!.telemetry.rubberBand === 0)).toBe(true);
    clean.reset();
    clean.state.phase = 'countdown';
    clean.setTotalLaps(2);
    expect(clean.state.director.events).toHaveLength(0);
  });

  it('allows feathered binary throttle to earn a perfect launch', () => {
    const launch = createRacerLaunchState();
    for (let tick = 0; tick < 360; tick += 1) {
      const throttle = launch.displayedRev < launch.targetThrottle ? 1 : 0;
      stepLaunchCharge(launch, throttle, 3 - tick / 120, 1 / 120, 0x51);
    }
    expect(resolveLaunchOutcome(launch)).toBe('perfect');
  });

  it('advances tutorial only when actual speed, braking, drift boost and cooldown evidence arrive', () => {
    const lesson = new DrivingTutorial();
    const input = frame(1, 100);
    const player = input.state.entries[0]!;
    lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(1);
    for (let tick = 0; tick < 20; tick += 1) lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(1);
    input.inputs = { player: { throttle: 1, brake: 0, steer: 0, drift: false, boost: false, fire: false, mine: false, shield: false, cycleVehicle: false, reset: false, pause: false } };
    player.vehicle.telemetry.speed = 6;
    lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(2);
    player.vehicle.telemetry.speed = 55;
    lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(3);
    input.inputs = { player: { ...input.inputs.player!, brake: 1 } };
    player.vehicle.telemetry.speed = 44;
    lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(4);
    input.vehicleEvents = { player: [{ type: 'drift-boost', charge: 0.3, duration: 1 }] };
    lesson.observe(input, 'player');
    expect(lesson.cue.step).toBe(5);
    input.inputs = { player: { ...input.inputs.player!, boost: true } };
    player.galactic!.redline.heat = 0.3;
    lesson.observe(input, 'player');
    expect(lesson.complete).toBe(false);
    input.inputs = { player: { ...input.inputs.player!, boost: false } };
    player.galactic!.redline.heat = 0.1;
    lesson.observe(input, 'player');
    expect(lesson.complete).toBe(true);
  });
});
