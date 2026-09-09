import { describe, expect, it } from 'vitest';
import { collectCombatPickup, EMP_DISRUPTION_SECONDS, type CombatPickupRacer } from '../../src/game/galactic/combatPickups';
import { createGalacticRacerState, createGalacticWorldState, snapshotGalacticRacer, spawnHeatLance, stepGalacticRacerAction, stepGalacticWorld } from '../../src/game/galactic/system';
import { FLAT_HEIGHT_SAMPLER, createPodracerState } from '../../src/game/simulation';
import { createRaceSimulation } from '../../src/game/race';
import { normalizePlayerInput } from '../../src/game/input';

function racer(id: string, x = 0, y = 0, z = 0): CombatPickupRacer {
  const vehicle = createPodracerState({ id, position: { x, z }, terrain: FLAT_HEIGHT_SAMPLER });
  vehicle.position.y = y;
  return { id, vehicle, galactic: createGalacticRacerState() };
}
function snapshot(entry: CombatPickupRacer) {
  return snapshotGalacticRacer(entry.id, entry.vehicle, entry.galactic, 0.315, -9, false);
}

describe('deterministic instant combat pickups', () => {
  it('preserves all six old pickup placements and RNG while adding fixed, distinct chaos resources', () => {
    const world = createGalacticWorldState(93);
    expect(world.pickups.slice(0, 6).map(({ id, progress, lateralOffset, part }) => ({ id, progress, lateralOffset, part }))).toEqual([
      { id: 'part-afterburner', progress: 0.205, lateralOffset: -7, part: 'afterburner-coils' },
      { id: 'part-vector', progress: 0.39, lateralOffset: 8, part: 'vector-vanes' },
      { id: 'part-frame', progress: 0.57, lateralOffset: -7, part: 'reinforced-frame' },
      { id: 'part-pulse', progress: 0.705, lateralOffset: 7, part: 'pulse-capacitor' },
      { id: 'part-landing', progress: 0.845, lateralOffset: -5, part: 'landing-recuperator' },
      { id: 'part-mine', progress: 0.93, lateralOffset: 6, part: 'mine-printer' },
    ]);
    expect(world.pickups.slice(6).map((pickup) => pickup.part)).toEqual(['emp-cell', 'repair-salvage']);
    const rng = world.rngState;
    collectCombatPickup('emp', 'emp-cell', racer('player'), [racer('enemy', 10)], world);
    expect(world.rngState).toBe(rng);
    for (const competitionProfile of ['time-trial', 'training', 'clean-race'] as const) {
      const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 93, competitionProfile });
      expect(race.state.galacticWorld.pickups).toEqual([]);
      expect(race.state.galacticWorld.hazards).toEqual([]);
    }
  });

  it('interrupts nearby enemies without hull damage, conserves existing longer cooldowns, and cannot apply twice', () => {
    const owner = racer('player'); const target = racer('enemy', 20);
    target.vehicle.damage = 0.3; target.vehicle.boost.active = true;
    target.galactic.redline.active = true; target.galactic.weapon.cooldown = 2;
    const world = createGalacticWorldState(1);
    const result = collectCombatPickup('emp', 'emp-cell', owner, [target], world);
    expect(result).toContainEqual({ type: 'emp-hit', attackerId: 'player', targetId: 'enemy', blocked: false, duration: EMP_DISRUPTION_SECONDS });
    expect(target.vehicle.damage).toBe(0.3);
    expect(target.vehicle.boost.active).toBe(false);
    expect(target.galactic.weapon.cooldown).toBe(2);
    expect(target.galactic.mine.cooldown).toBe(EMP_DISRUPTION_SECONDS);
    expect(target.galactic.wreck.recentAggressorId).toBe('player');
    const action = stepGalacticRacerAction(target.galactic, { step: 1, delta: 1 / 120,
      racing: true, input: normalizePlayerInput({ throttle: 1, boost: true, fire: true, mine: true }), self: snapshot(target), opponents: [] });
    expect(action.input.boost).toBe(false);
    expect(action.redlineAcceleration).toBe(0);
    expect(action.fireHeatLance).toBe(false);
    expect(action.deployMine).toBe(false);
    expect(collectCombatPickup('emp', 'emp-cell', owner, [target], world)).toEqual([]);
    expect(owner.galactic.upgrades.parts).toEqual([]);
  });

  it('respects shields, recovery immunity, wrecks, and a three-dimensional range boundary', () => {
    const owner = racer('player'); const shield = racer('shield', 20);
    shield.galactic.shield.active = true; shield.galactic.shield.remaining = 1;
    const immune = racer('immune', 20); immune.galactic.wreck.invulnerable = 1;
    const wreck = racer('wreck', 20); wreck.galactic.wreck.phase = 'wrecked';
    const far = racer('far', 42.01); const above = racer('above', 0, 42.01);
    const edge = racer('edge', 42);
    const events = collectCombatPickup('emp', 'emp-cell', owner, [shield, immune, wreck, far, above, edge], createGalacticWorldState());
    expect(shield.galactic.shield.remaining).toBeCloseTo(0.55);
    expect(shield.galactic.status.ionized).toBe(0);
    for (const entry of [immune, wreck, far, above]) expect(entry.galactic.status.ionized).toBe(0);
    expect(edge.galactic.status.ionized).toBe(EMP_DISRUPTION_SECONDS);
    expect(events.at(-1)).toMatchObject({ type: 'emp-pulse', targetIds: ['edge'], blockedIds: ['shield'] });
  });

  it('clears only hostile in-range ordnance, with stable enemy ordering and no projectiles spawned', () => {
    const owner = racer('player'); const a = racer('a', 15); const b = racer('b', 20);
    const world = createGalacticWorldState();
    const ownBolt = spawnHeatLance(world, snapshot(owner));
    const hostileBolt = spawnHeatLance(world, snapshot(a));
    ownBolt.position = { x: 1, y: 0, z: 0 }; hostileBolt.position = { x: 2, y: 0, z: 0 };
    const sequence = world.projectileSequence;
    const events = collectCombatPickup('emp', 'emp-cell', owner, [b, a], world);
    expect(world.projectiles.map((projectile) => projectile.id)).toEqual([ownBolt.id]);
    expect(world.projectileSequence).toBe(sequence);
    expect(events.at(-1)).toMatchObject({ targetIds: ['a', 'b'], clearedOrdnance: 1 });
  });

  it('repairs and cools bounded amounts without free permanent upgrades, ammunition, or tokens', () => {
    const owner = racer('player'); const world = createGalacticWorldState();
    owner.vehicle.damage = 0.63; owner.vehicle.heat = 0.9;
    owner.galactic.redline.heat = 0.95; owner.galactic.redline.lockout = 2;
    owner.galactic.status.ionized = 1;
    const events = collectCombatPickup('repair', 'repair-salvage', owner, [], world);
    expect(events).toEqual([{ type: 'repair-salvage-collected', racerId: 'player', pickupId: 'repair', repaired: 0.24, cooled: 0.4, coreCooled: 0.4 }]);
    expect(owner.vehicle.damage).toBeCloseTo(0.39); expect(owner.vehicle.heat).toBeCloseTo(0.5);
    expect(owner.galactic.redline.heat).toBeCloseTo(0.55);
    expect(owner.galactic.redline.lockout).toBeCloseTo(1.2);
    expect(owner.galactic.status.ionized).toBe(0);
    expect(owner.galactic.upgrades.parts).toEqual([]);
    expect(owner.galactic.mine.charges).toBe(3); expect(world.runTokens).toBe(3);
    expect(collectCombatPickup('repair', 'repair-salvage', owner, [], world)).toEqual([]);
    owner.vehicle.damage = 0.03; owner.vehicle.heat = 0.07;
    expect(collectCombatPickup('repair2', 'repair-salvage', owner, [], world)[0]).toMatchObject({ repaired: 0.03, cooled: 0.07 });
    expect(owner.vehicle.damage).toBe(0); expect(owner.vehicle.heat).toBe(0);
    owner.galactic.redline.heat = 0.8;
    expect(collectCombatPickup('core-only', 'repair-salvage', owner, [], world)[0])
      .toMatchObject({ repaired: 0, cooled: 0, coreCooled: 0.4 });
    expect(owner.galactic.redline.heat).toBe(0.4);
  });

  it('resolves contested instant pickups deterministically and excludes wrecked collectors', () => {
    const a = racer('a'); const b = racer('b');
    const world = createGalacticWorldState(); world.hazards = [];
    world.pickups = world.pickups.filter((pickup) => pickup.part === 'emp-cell');
    const reversed = structuredClone(world);
    expect(stepGalacticWorld(world, [snapshot(b), snapshot(a)], 1 / 120).pickupClaims)
      .toEqual(stepGalacticWorld(reversed, [snapshot(a), snapshot(b)], 1 / 120).pickupClaims);
    expect(world.pickups[0]?.collectedBy).toBe('a');
    const wreckWorld = createGalacticWorldState(); wreckWorld.hazards = [];
    a.galactic.wreck.phase = 'wrecked';
    expect(stepGalacticWorld(wreckWorld, [snapshot(a)], 1 / 120).pickupClaims).toEqual([]);
  });

  it('applies claims inside RaceSimulation, respects team allies, and replays a saved snapshot identically', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 87,
      competitionProfile: 'chaos', mode: 'team-race', countdownSeconds: 0 });
    const player = race.state.entries[0]!;
    const ally = race.state.entries.find((entry) => entry.id !== player.id && entry.competition?.teamId === player.competition?.teamId)!;
    const enemy = race.state.entries.find((entry) => entry.competition?.teamId !== player.competition?.teamId)!;
    expect(ally).toBeDefined(); expect(enemy).toBeDefined();
    ally.vehicle.position = { ...player.vehicle.position, x: player.vehicle.position.x + 15 };
    enemy.vehicle.position = { ...player.vehicle.position, x: player.vehicle.position.x + 25 };
    const pickup = race.state.galacticWorld.pickups.find((value) => value.part === 'emp-cell')!;
    for (const entry of race.state.entries) if (entry.id !== player.id) entry.progress.lateralOffset = 100;
    pickup.progress = player.progress.courseProgress;
    pickup.lateralOffset = player.progress.lateralOffset;
    pickup.lateralRadius = 0.01;
    race.state.galacticWorld.hazards = [];
    const saved = race.snapshot();
    const first = race.step({ throttle: 0 });
    expect(first.galacticEvents.some((event) => event.type === 'emp-pulse' && event.racerId === player.id)).toBe(true);
    expect(first.galacticEvents.some((event) => event.type === 'emp-hit' && event.targetId === ally.id)).toBe(false);
    expect(first.galacticEvents.some((event) => event.type === 'emp-hit' && event.targetId === enemy.id)).toBe(true);
    const expectedEvents = structuredClone(first.galacticEvents); const expectedState = race.snapshot();
    race.restoreAuthoritativeSnapshot(saved, player.id);
    expect(race.step({ throttle: 0 }).galacticEvents).toEqual(expectedEvents);
    expect(race.snapshot()).toEqual(expectedState);
  });
});
