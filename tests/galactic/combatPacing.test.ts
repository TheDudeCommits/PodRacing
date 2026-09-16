import { describe, expect, it } from 'vitest';
import {
  LANCE_SPEED,
  LANCE_STARTING_CHARGES,
  RIVALRY_DURATION,
  applyGalacticImpact,
  assessGalacticThreats,
  augmentGalacticAIInput,
  beginGalacticWreck,
  createGalacticRacerState,
  createGalacticWorldState,
  deriveGalacticVehicleConfig,
  snapshotGalacticRacer,
  spawnHeatLance,
  stepGalacticRacerAction,
  stepGalacticWorld,
  type GalacticRacerSnapshot,
} from '../../src/game/galactic';
import { LANCE_CELLS_PER_PICKUP, collectCombatPickup, isCombatPickup } from '../../src/game/galactic/combatPickups';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState } from '../../src/game/simulation';
import { mapGameEventsToAudioCues } from '../../src/audio/model';
import { deriveGalacticHudViewModel } from '../../src/ui/model';

function snapshot(id: string, x: number, z: number, velocityZ = 80): GalacticRacerSnapshot {
  const galactic = createGalacticRacerState('podracer');
  const config = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, galactic.upgrades);
  const vehicle = createPodracerState({ id, position: { x, z }, terrain: FLAT_HEIGHT_SAMPLER }, config);
  vehicle.velocity.z = velocityZ;
  return snapshotGalacticRacer(id, vehicle, galactic, 0, 0, false);
}

describe('lance cells and pacing', () => {
  it('starts with a finite rack, spends one cell per shot and refuses to fire empty', () => {
    const self = snapshot('shooter', 0, 0);
    expect(self.galactic.weapon.charges).toBe(LANCE_STARTING_CHARGES);
    let shots = 0;
    // Four seconds: the rack empties in ~4.2 s of firing and the trickle needs six more.
    for (let step = 0; step < 120 * 4; step += 1) {
      const action = stepGalacticRacerAction(self.galactic, {
        step, delta: 1 / 120, racing: true, input: normalizePlayerInput({ fire: true }), self, opponents: [],
      });
      shots += action.fireHeatLance ? 1 : 0;
    }
    expect(shots).toBe(LANCE_STARTING_CHARGES);
    expect(self.galactic.weapon.charges).toBe(0);
    const hud = deriveGalacticHudViewModel(self.galactic)!;
    expect(hud.weaponCharges).toBe(0);
  });

  it('refills from an authored lance-cell pickup that respawns like other combat pickups', () => {
    const self = snapshot('collector', 0, 0);
    self.galactic.weapon.charges = 1;
    expect(isCombatPickup('lance-cells')).toBe(true);
    const world = createGalacticWorldState();
    const events = collectCombatPickup('lance-cells-canyon', 'lance-cells',
      { id: self.id, vehicle: createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }), galactic: self.galactic }, [], world);
    expect(events).toEqual([{ type: 'lance-cells-collected', racerId: 'collector', pickupId: 'lance-cells-canyon', charges: 1 + LANCE_CELLS_PER_PICKUP }]);
    expect(world.pickups.filter((pickup) => pickup.part === 'lance-cells')).toHaveLength(4);
    expect(mapGameEventsToAudioCues(events, { playerId: 'collector' })).toHaveLength(1);
  });

  it('aligns lance cells to the canyon, chicane, hairpin and straight in a real race and lets a racer collect them', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0 });
    const cells = race.state.galacticWorld.pickups.filter((pickup) => pickup.part === 'lance-cells');
    const tags = cells.map((pickup) => race.course.sampleAtProgress(pickup.progress).tag);
    expect(tags).toEqual(['narrow-canyon', 'chicane', 'hairpin', 'fast-straight']);
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    player.galactic!.weapon.charges = 0;
    const target = cells[3]!;
    const sample = race.course.sampleAtProgress(target.progress - 0.002);
    player.vehicle.position.x = sample.x; player.vehicle.position.z = sample.z;
    player.vehicle.orientation.yaw = Math.atan2(sample.tangentX, sample.tangentZ);
    player.vehicle.velocity.x = sample.tangentX * 60; player.vehicle.velocity.z = sample.tangentZ * 60;
    player.progress.courseProgress = sample.progress;
    let collected = false;
    for (let tick = 0; tick < 240 && !collected; tick += 1) {
      collected = race.step({ throttle: 0.5 }).galacticEvents.some((event) => event.type === 'lance-cells-collected' && event.racerId === player.id);
    }
    expect(collected).toBe(true);
    expect(player.galactic!.weapon.charges).toBe(LANCE_CELLS_PER_PICKUP);
  });

  it('flies the lance slowly enough that leading matters and records where it struck the hull', () => {
    const shooter = snapshot('shooter', 0, 0, 0);
    const victim = snapshot('victim', 0, 40, 0);
    const world = createGalacticWorldState();
    const lance = spawnHeatLance(world, shooter);
    expect(Math.hypot(lance.velocity.x, lance.velocity.z)).toBeCloseTo(LANCE_SPEED, 6);
    let impact = null;
    for (let tick = 0; tick < 120 && !impact; tick += 1) impact = stepGalacticWorld(world, [shooter, victim], 1 / 120).impacts[0] ?? null;
    expect(impact).not.toBeNull();
    // Hit point sits on the victim's hull radius, well short of the centre.
    expect(impact!.hitZ).toBeLessThan(40 - 5);
    expect(impact!.hitZ).toBeGreaterThan(20);
    const state = victim.galactic;
    const config = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, state.upgrades);
    const vehicle = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }, config);
    const result = applyGalacticImpact('victim', state, vehicle, config, impact!);
    const hit = result.events.find((event) => event.type === 'weapon-hit');
    expect(hit && hit.type === 'weapon-hit' ? hit.z : null).toBeCloseTo(impact!.hitZ, 9);
  });

  it('locks the player onto a rival in the cone and announces it once', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0 });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const rival = race.state.entries.find((entry) => !entry.isPlayer)!;
    const sample = race.course.sampleAtProgress(0.05);
    const yaw = Math.atan2(sample.tangentX, sample.tangentZ);
    for (const [entry, ahead] of [[player, 0], [rival, 45]] as const) {
      entry.vehicle.position.x = sample.x + sample.tangentX * ahead;
      entry.vehicle.position.z = sample.z + sample.tangentZ * ahead;
      entry.vehicle.position.y = 2.45;
      entry.vehicle.orientation.yaw = yaw;
      entry.progress.courseProgress = 0.05;
    }
    for (const entry of race.state.entries.slice(2)) entry.vehicle.position.z += 900;
    let locks = 0;
    for (let tick = 0; tick < 40; tick += 1) {
      locks += race.step({}).galacticEvents.filter((event) => event.type === 'target-lock' && event.targetId === rival.id).length;
    }
    expect(locks).toBe(1);
    expect(race.lockedTargetId).toBe(rival.id);
    expect(mapGameEventsToAudioCues([{ type: 'target-lock', racerId: player.id, targetId: rival.id }], { playerId: player.id })).toHaveLength(1);
    expect(mapGameEventsToAudioCues([{ type: 'target-lock', racerId: player.id, targetId: null }], { playerId: player.id })).toHaveLength(0);
  });
});

describe('rival personalities and grudges', () => {
  it('hunts the human when aggressive, prefers the grudge target for everyone, and mines chicanes when erratic', () => {
    const self = snapshot('ai', 0, 0);
    const human = snapshot('player', 3, 70);
    const nearer = snapshot('ai-other', -1, 40);
    expect(assessGalacticThreats(self, [human, nearer], { projectiles: [], mines: [], style: 'clean', playerId: 'player' }).targetId).toBe('ai-other');
    expect(assessGalacticThreats(self, [human, nearer], { projectiles: [], mines: [], style: 'aggressive', playerId: 'player' }).targetId).toBe('player');
    self.galactic.rivalry = { rivalId: 'player', remaining: 20 };
    expect(assessGalacticThreats(self, [human, nearer], { projectiles: [], mines: [], style: 'clean', playerId: 'player' }).targetId).toBe('player');
    self.galactic.rivalry = { rivalId: null, remaining: 0 };

    const alone = snapshot('lonely', 0, 0);
    let erraticMines = 0, cleanMines = 0, straightMines = 0;
    for (let step = 0; step < 1500; step += 1) {
      erraticMines += augmentGalacticAIInput(normalizePlayerInput(), alone, [], step, { projectiles: [], mines: [], style: 'erratic', sectionTag: 'chicane' }).mine ? 1 : 0;
      cleanMines += augmentGalacticAIInput(normalizePlayerInput(), alone, [], step, { projectiles: [], mines: [], style: 'clean', sectionTag: 'chicane' }).mine ? 1 : 0;
      straightMines += augmentGalacticAIInput(normalizePlayerInput(), alone, [], step, { projectiles: [], mines: [], style: 'erratic', sectionTag: 'fast-straight' }).mine ? 1 : 0;
    }
    expect(erraticMines).toBeGreaterThan(0);
    expect(cleanMines).toBe(0);
    expect(straightMines).toBe(0);
  });

  it('shields early when clean and only when hurt otherwise', () => {
    const self = snapshot('ai', 0, 0);
    const aimed = snapshot('attacker', 0, -40);
    const cleanShield = augmentGalacticAIInput(normalizePlayerInput(), self, [aimed], 5, { projectiles: [], mines: [], style: 'clean' }).shield;
    const aggressiveShield = augmentGalacticAIInput(normalizePlayerInput(), self, [aimed], 5, { projectiles: [], mines: [], style: 'aggressive' }).shield;
    expect(cleanShield).toBe(true);
    expect(aggressiveShield).toBe(false);
  });

  it('marks the attacker after a takedown, keeps the grudge for a while and shows it on the HUD', () => {
    const state = createGalacticRacerState('podracer');
    const config = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, state.upgrades);
    const vehicle = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }, config);
    vehicle.damage = 0.9;
    const events = beginGalacticWreck('victim', state, vehicle, createGalacticWorldState(), 'heat-lance', 'ai-vexa', true);
    expect(events.some((event) => event.type === 'rivalry-marked' && event.rivalId === 'ai-vexa')).toBe(true);
    expect(state.rivalry).toEqual({ rivalId: 'ai-vexa', remaining: RIVALRY_DURATION });
    expect(deriveGalacticHudViewModel(state)!.rivalName).toBe('ai-vexa');
    const self = snapshotGalacticRacer('victim', vehicle, state, 0, 0, false);
    for (let step = 0; step < 120 * (RIVALRY_DURATION + 1); step += 1) {
      stepGalacticRacerAction(state, { step, delta: 1 / 120, racing: true, input: normalizePlayerInput(), self, opponents: [] });
    }
    expect(state.rivalry.rivalId).toBeNull();
    expect(deriveGalacticHudViewModel(state)!.rivalName).toBeNull();
  });
});

describe('lance ammunition never dies for a whole race', () => {
  it('lets the same racer refill from a rack again once it has respawned', () => {
    const world = createGalacticWorldState(93); world.hazards = [];
    world.pickups = world.pickups.filter((pickup) => pickup.part === 'lance-cells');
    const pickup = world.pickups[0]!;
    const self = snapshot('collector', 0, 0);
    const atPickup = () => ({ ...self, courseProgress: pickup.progress, lateralOffset: pickup.lateralOffset });
    const collector = { id: self.id, vehicle: createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }), galactic: self.galactic };
    self.galactic.weapon.charges = 0;
    expect(stepGalacticWorld(world, [atPickup()], 1 / 120).pickupClaims).toEqual([{ racerId: 'collector', pickupId: pickup.id, part: 'lance-cells' }]);
    expect(collectCombatPickup(pickup.id, 'lance-cells', collector, [], world)).toHaveLength(1);
    expect(self.galactic.weapon.charges).toBe(LANCE_CELLS_PER_PICKUP);
    // The rack is not a one-time upgrade: no ledger entry, so the next lap can take it again.
    expect(self.galactic.upgrades.collectedPickupIds).toEqual([]);
    self.galactic.weapon.charges = 0;
    let claimed = 0;
    for (let tick = 0; tick < 601; tick += 1) claimed += stepGalacticWorld(world, [atPickup()], 1 / 120).pickupClaims.length;
    expect(claimed).toBe(1);
    expect(collectCombatPickup(pickup.id, 'lance-cells', collector, [], world)).toHaveLength(1);
    expect(self.galactic.weapon.charges).toBe(LANCE_CELLS_PER_PICKUP);
  });

  it('trickles one cell back every six seconds while the rack is below three, and shows it on the HUD', () => {
    const self = snapshot('shooter', 0, 0);
    self.galactic.weapon.charges = 0;
    const step = () => stepGalacticRacerAction(self.galactic, {
      step: 0, delta: 1 / 120, racing: true, input: normalizePlayerInput({}), self, opponents: [],
    });
    for (let tick = 0; tick < 120 * 3; tick += 1) step();
    expect(self.galactic.weapon.charges).toBe(0);
    const hud = deriveGalacticHudViewModel(self.galactic)!;
    expect(hud.weaponCharges).toBe(0);
    expect(hud.weaponRegen).toBeCloseTo(0.5, 2);
    for (let tick = 0; tick < 120 * 3; tick += 1) step();
    expect(self.galactic.weapon.charges).toBe(1);
    for (let tick = 0; tick < 120 * 12; tick += 1) step();
    expect(self.galactic.weapon.charges).toBe(3);
    // At the floor the trickle stops: pickups are still the way to a full rack.
    for (let tick = 0; tick < 120 * 12; tick += 1) step();
    expect(self.galactic.weapon.charges).toBe(3);
    expect(deriveGalacticHudViewModel(self.galactic)!.weaponRegen).toBe(0);
    // Firing the trickled cells works exactly like pickup cells.
    let shots = 0;
    for (let tick = 0; tick < 120 * 3; tick += 1) {
      const action = stepGalacticRacerAction(self.galactic, {
        step: tick, delta: 1 / 120, racing: true, input: normalizePlayerInput({ fire: true }), self, opponents: [],
      });
      shots += action.fireHeatLance ? 1 : 0;
    }
    expect(shots).toBe(3);
  });
});
