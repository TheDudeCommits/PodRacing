import { describe, expect, it } from 'vitest';
import {
  applyGalacticImpact,
  augmentGalacticAIInput,
  beginGalacticWreck,
  completeGalacticRecovery,
  createGalacticRacerState,
  createGalacticWorldState,
  deriveGalacticVehicleConfig,
  snapshotGalacticRacer,
  spawnHeatLance,
  stepGalacticRacerAction,
  stepGalacticWorld,
  type GalacticImpact,
  type GalacticRacerSnapshot,
  type GalacticVehicleClass,
} from '../../src/game/galactic';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import {
  DEFAULT_PODRACER_CONFIG,
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
} from '../../src/game/simulation';

const VEHICLE_CLASSES: readonly GalacticVehicleClass[] = [
  'podracer',
  'landspeeder',
  'speeder-bike',
  'skim-speeder',
];

function makeSnapshot(
  id: string,
  z: number,
  vehicleClass: GalacticVehicleClass = 'podracer',
): GalacticRacerSnapshot {
  const galactic = createGalacticRacerState(vehicleClass);
  const config = deriveGalacticVehicleConfig(vehicleClass, DEFAULT_PODRACER_CONFIG, galactic.upgrades);
  const vehicle = createPodracerState({
    id,
    position: { x: 0, z },
    terrain: FLAT_HEIGHT_SAMPLER,
  }, config);
  return snapshotGalacticRacer(id, vehicle, galactic, 0, 0, false);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('Galactic Racer deterministic gameplay systems', () => {
  it('keeps Heat Lance and Scrap Mine on independent semantic actions', () => {
    const shooter = makeSnapshot('shooter', 0);
    const fired = stepGalacticRacerAction(shooter.galactic, {
      step: 1,
      delta: 1 / 120,
      racing: true,
      input: normalizePlayerInput({ fire: true, brake: 1 }),
      self: shooter,
      opponents: [],
    });
    expect(fired.fireHeatLance).toBe(true);
    expect(fired.deployMine).toBe(false);

    const miner = makeSnapshot('miner', 0);
    const deployed = stepGalacticRacerAction(miner.galactic, {
      step: 1,
      delta: 1 / 120,
      racing: true,
      input: normalizePlayerInput({ mine: true }),
      self: miner,
      opponents: [],
    });
    expect(deployed.deployMine).toBe(true);
    expect(deployed.fireHeatLance).toBe(false);

    const combined = makeSnapshot('combined', 0);
    const both = stepGalacticRacerAction(combined.galactic, {
      step: 1,
      delta: 1 / 120,
      racing: true,
      input: normalizePlayerInput({ fire: true, mine: true }),
      self: combined,
      opponents: [],
    });
    expect(both.deployMine).toBe(true);
    expect(both.fireHeatLance).toBe(true);
  });

  it('gives AI forward Heat Lance intent and a distinct rear Mine intent', () => {
    const self = makeSnapshot('ai-racer', 0);
    const ahead = makeSnapshot('ahead', 40);
    const behind = makeSnapshot('behind', -32);
    let firedAhead = false;
    let minedBehind = false;
    for (let step = 0; step < 800; step += 1) {
      const forwardIntent = augmentGalacticAIInput(
        normalizePlayerInput(), self, [ahead], step,
      );
      const rearIntent = augmentGalacticAIInput(
        normalizePlayerInput(), self, [behind], step,
      );
      firedAhead ||= forwardIntent.fire;
      minedBehind ||= rearIntent.mine;
      expect(forwardIntent.mine).toBe(false);
      expect(rearIntent.fire).toBe(false);
    }
    expect(firedAhead).toBe(true);
    expect(minedBehind).toBe(true);
  });

  it('derives four materially distinct vehicle tunes without changing fixed cadence', () => {
    const configs = VEHICLE_CLASSES.map((vehicleClass) => {
      const state = createGalacticRacerState(vehicleClass);
      return deriveGalacticVehicleConfig(vehicleClass, DEFAULT_PODRACER_CONFIG, state.upgrades);
    });

    expect(new Set(configs.map((config) => config.mass)).size).toBe(4);
    expect(new Set(configs.map((config) => config.maxSpeed)).size).toBe(4);
    expect(configs.every((config) => config.fixedDelta === DEFAULT_PODRACER_CONFIG.fixedDelta)).toBe(true);
    expect(configs.every((config) => config.probes.length === 6)).toBe(true);
  });

  it('activates Pulse Shell on an edge and blocks most incoming weapon damage', () => {
    const state = createGalacticRacerState('landspeeder');
    const config = deriveGalacticVehicleConfig('landspeeder', DEFAULT_PODRACER_CONFIG, state.upgrades);
    const vehicle = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }, config);
    const self = snapshotGalacticRacer('shielded', vehicle, state, 0, 0, false);
    const action = stepGalacticRacerAction(state, {
      step: 1,
      delta: config.fixedDelta,
      racing: true,
      input: normalizePlayerInput({ shield: true }),
      self,
      opponents: [],
    });
    const impact: GalacticImpact = {
      targetId: 'shielded',
      sourceId: 'attacker',
      cause: 'heat-lance',
      weapon: 'heat-lance',
      damage: 0.3,
      heat: 0.2,
      impulseX: 8,
      impulseY: 2,
      impulseZ: 0,
      status: 'ionized',
      statusDuration: 1,
      hazardId: null,
      hazardKind: null,
    };
    const result = applyGalacticImpact('shielded', state, vehicle, config, impact);

    expect(action.activateShield).toBe(true);
    expect(state.shield.active).toBe(true);
    expect(result.shielded).toBe(true);
    expect(result.appliedDamage).toBeLessThan(impact.damage * 0.2);
    expect(result.events.some((event) => event.type === 'shield-block')).toBe(true);
  });

  it('uses swept Heat Lance collision so a fast projectile cannot tunnel through a racer', () => {
    const world = createGalacticWorldState(17);
    world.hazards = [];
    world.pickups = [];
    const shooter = makeSnapshot('shooter', 0);
    const target = makeSnapshot('target', 28, 'skim-speeder');
    const projectile = spawnHeatLance(world, shooter);
    const result = stepGalacticWorld(world, [shooter, target], 0.1);

    expect(projectile.position.z).toBeGreaterThan(target.z);
    expect(result.impacts).toHaveLength(1);
    expect(result.impacts[0]).toMatchObject({
      targetId: 'target',
      sourceId: 'shooter',
      cause: 'heat-lance',
      weapon: 'heat-lance',
    });
    expect(world.projectiles).toHaveLength(0);
  });

  it('triggers authored hazards and claims run-local upgrade pickups by course progress', () => {
    const hazardWorld = createGalacticWorldState(29);
    const hazard = hazardWorld.hazards[2]!;
    const hazardRacer = makeSnapshot('hazard-racer', 0);
    hazardRacer.courseProgress = hazard.progress;
    hazardRacer.lateralOffset = hazard.lateralOffset;
    const hazardResult = stepGalacticWorld(hazardWorld, [hazardRacer], 1 / 120);

    expect(hazardResult.impacts[0]).toMatchObject({
      targetId: 'hazard-racer',
      cause: 'rockfall',
      hazardId: hazard.id,
    });
    expect(hazardResult.events.some((event) => event.type === 'hazard-hit')).toBe(true);

    const pickupWorld = createGalacticWorldState(29);
    const pickup = pickupWorld.pickups[0]!;
    const pickupRacer = makeSnapshot('pickup-racer', 0);
    pickupRacer.courseProgress = pickup.progress;
    pickupRacer.lateralOffset = pickup.lateralOffset;
    const pickupResult = stepGalacticWorld(pickupWorld, [pickupRacer], 1 / 120);

    expect(pickupResult.pickupClaims).toEqual([{
      racerId: 'pickup-racer',
      pickupId: pickup.id,
      part: pickup.part,
    }]);
    expect(pickupWorld.pickups[0]?.collectedBy).toBe('pickup-racer');
  });

  it('wrecks, spends a player recovery token and deterministically reaches recovery', () => {
    const world = createGalacticWorldState(41);
    const state = createGalacticRacerState();
    const vehicle = createPodracerState({ id: 'player', terrain: FLAT_HEIGHT_SAMPLER });
    vehicle.damage = 0.9;
    const events = beginGalacticWreck(
      'player', state, vehicle, world, 'impact', 'rival', true,
    );

    expect(state.wreck.phase).toBe('wrecked');
    expect(world.runTokens).toBe(2);
    expect(events.some((event) => event.type === 'takedown')).toBe(true);

    let recovered = false;
    for (let step = 0; step < 300 && !recovered; step += 1) {
      const self = snapshotGalacticRacer('player', vehicle, state, 0, 0, false);
      const result = stepGalacticRacerAction(state, {
        step,
        delta: 1 / 120,
        racing: true,
        input: normalizePlayerInput(),
        self,
        opponents: [],
      });
      recovered = result.recoverNow;
    }
    expect(recovered).toBe(true);
    completeGalacticRecovery(state, vehicle);
    expect(state.wreck.phase).toBe('recovering');
    expect(state.wreck.invulnerable).toBeGreaterThan(1);
    expect(vehicle.damage).toBeLessThanOrEqual(0.42);
  });

  it('produces identical JSON world state and events for the same seed and stream', () => {
    const first = createGalacticWorldState(0x1234abcd);
    const second = createGalacticWorldState(0x1234abcd);
    const racersA = [makeSnapshot('a', 0), makeSnapshot('b', 50, 'speeder-bike')];
    const racersB = clone(racersA);
    const eventsA: unknown[] = [];
    const eventsB: unknown[] = [];

    for (let step = 0; step < 240; step += 1) {
      const progress = (step * 0.0037) % 1;
      racersA[0]!.courseProgress = progress;
      racersB[0]!.courseProgress = progress;
      racersA[0]!.lateralOffset = Math.sin(step * 0.11) * 7;
      racersB[0]!.lateralOffset = Math.sin(step * 0.11) * 7;
      const a = stepGalacticWorld(first, racersA, 1 / 120);
      const b = stepGalacticWorld(second, racersB, 1 / 120);
      eventsA.push(a);
      eventsB.push(b);
    }

    expect(second).toEqual(first);
    expect(eventsB).toEqual(eventsA);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('integrates grid vehicle cycling and player fire/mine/shield actions into RaceSimulation', () => {
    const gridRace = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 1,
      seed: 71,
    });
    const player = gridRace.state.entries.find((entry) => entry.isPlayer)!;
    const cycled = gridRace.step({ cycleVehicle: true });
    const held = gridRace.step({ cycleVehicle: true });

    expect(player.galactic?.vehicleClass).toBe('landspeeder');
    expect(cycled.galacticEvents).toContainEqual({
      type: 'vehicle-class-changed',
      racerId: player.id,
      vehicleClass: 'landspeeder',
    });
    expect(held.galacticEvents.some((event) => event.type === 'vehicle-class-changed')).toBe(false);

    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed: 72,
    });
    const fired = race.step({ fire: true });
    const mined = race.step({ mine: true });
    const shielded = race.step({ shield: true });
    const playerId = race.state.entries.find((entry) => entry.isPlayer)!.id;

    expect(fired.galacticEvents.some(
      (event) => event.type === 'heat-lance-fired' && event.racerId === playerId,
    )).toBe(true);
    expect(shielded.galacticEvents.some(
      (event) => event.type === 'pulse-shell' && event.racerId === playerId && event.active,
    )).toBe(true);
    expect(mined.galacticEvents.some(
      (event) => event.type === 'scrap-mine-deployed' && event.racerId === playerId,
    )).toBe(true);
    expect(race.state.galacticWorld.projectiles.some(
      (projectile) => projectile.ownerId === playerId,
    )).toBe(true);
  });

  it('accepts an exact pre-race card choice and locks it for the full race', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 3,
      seed: 73,
    });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;

    expect(race.playerVehicleSelectionLocked).toBe(false);
    expect(race.selectPlayerVehicle('skim-speeder')).toEqual({
      type: 'vehicle-class-changed',
      racerId: player.id,
      vehicleClass: 'skim-speeder',
    });
    expect(player.galactic?.vehicleClass).toBe('skim-speeder');

    race.lockPlayerVehicleSelection();
    expect(race.playerVehicleSelectionLocked).toBe(true);
    expect(race.selectPlayerVehicle('speeder-bike')).toBeNull();
    const attemptedCycle = race.step({ cycleVehicle: true });
    expect(player.galactic?.vehicleClass).toBe('skim-speeder');
    expect(attemptedCycle.galacticEvents.some(
      (event) => event.type === 'vehicle-class-changed',
    )).toBe(false);
  });
});
