import { describe, expect, it } from 'vitest';
import {
  LANCE_MAGAZINE,
  LANCE_RELOAD_SECONDS,
  LANCE_SPEED,
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

describe('Heat Lance magazine', () => {
  it('fires five rounds on the press, then reloads on a five-second timer and comes back full', () => {
    const self = snapshot('shooter', 0, 0);
    expect(self.galactic.weapon.charges).toBe(LANCE_MAGAZINE);
    expect(self.galactic.weapon.reload).toBe(0);
    const events: string[] = [];
    let shots = 0;
    // The trigger fires on the press, so the test pulses it like a player tapping E.
    const pulse = (ticks: number, fire: (step: number) => boolean) => {
      for (let step = 0; step < ticks; step += 1) {
        const action = stepGalacticRacerAction(self.galactic, {
          step, delta: 1 / 120, racing: true, input: normalizePlayerInput({ fire: fire(step) }), self, opponents: [],
        });
        shots += action.fireHeatLance ? 1 : 0;
        for (const event of action.events) if (event.type === 'lance-reload' || event.type === 'lance-reloaded') events.push(event.type);
      }
    };
    // Four seconds of tapping empties the five-round magazine and starts the reload.
    pulse(120 * 4, (step) => step % 2 === 0);
    expect(shots).toBe(LANCE_MAGAZINE);
    expect(self.galactic.weapon.charges).toBe(0);
    expect(self.galactic.weapon.reload).toBeGreaterThan(0);
    expect(events).toEqual(['lance-reload']);
    const reloading = deriveGalacticHudViewModel(self.galactic)!;
    expect(reloading.weaponCharges).toBe(0);
    expect(reloading.weaponReload).toBeGreaterThan(0);
    // The trigger does nothing at all while the magazine is out.
    const beforeReload = shots;
    // The reload began at ~2.8 s and runs for LANCE_RELOAD_SECONDS; three more
    // seconds of tapping land inside it and fire nothing at all.
    expect(LANCE_RELOAD_SECONDS).toBe(5);
    pulse(120 * 3, (step) => step % 2 === 0);
    expect(shots).toBe(beforeReload);
    // Ammunition itself is unlimited: the magazine returns full with no pickup.
    pulse(120 * 1.2, () => false);
    expect(self.galactic.weapon.charges).toBe(LANCE_MAGAZINE);
    expect(self.galactic.weapon.reload).toBe(0);
    expect(events).toEqual(['lance-reload', 'lance-reloaded']);
    expect(deriveGalacticHudViewModel(self.galactic)!.weaponReload).toBe(0);
    pulse(120 * 3, (step) => step % 2 === 0);
    expect(shots).toBe(beforeReload + LANCE_MAGAZINE);
    expect(self.galactic.weapon.reload).toBeGreaterThan(0);
  });

  it('carries no ammunition pickups on the course', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0 });
    for (const pickup of race.state.galacticWorld.pickups) {
      expect(pickup.part).not.toBe('lance-cells');
    }
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    expect(player.galactic!.weapon.charges).toBe(LANCE_MAGAZINE);
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
