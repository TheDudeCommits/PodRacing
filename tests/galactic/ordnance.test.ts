import { stageRaceProgress } from '../helpers/stageRaceProgress';
import { describe, expect, it } from 'vitest';
import {
  LANCE_MAGAZINE,
  OVERCHARGE_CELLS,
  TOW_DURATION,
  applyGalacticImpact,
  augmentGalacticAIInput,
  createGalacticRacerState,
  createGalacticWorldState,
  deriveGalacticVehicleConfig,
  snapshotGalacticRacer,
  spawnHeatLance,
  stepGalacticRacerAction,
  stepGalacticWorld,
  type GalacticRacerSnapshot,
} from '../../src/game/galactic';
import { collectCombatPickup } from '../../src/game/galactic/combatPickups';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState } from '../../src/game/simulation';
import { deriveGalacticHudViewModel } from '../../src/ui/model';

function racer(id: string, x: number, z: number, velocityZ = 80) {
  const galactic = createGalacticRacerState('podracer');
  const config = deriveGalacticVehicleConfig('podracer', DEFAULT_PODRACER_CONFIG, galactic.upgrades);
  const vehicle = createPodracerState({ id, position: { x, z }, terrain: FLAT_HEIGHT_SAMPLER }, config);
  vehicle.velocity.z = velocityZ;
  // Course progress follows z so a racer ahead in space is ahead on the course too.
  const snapshot = (): GalacticRacerSnapshot => snapshotGalacticRacer(id, vehicle, galactic, vehicle.position.z / 8000, 0, false);
  return { galactic, vehicle, config, snapshot };
}

const act = (self: ReturnType<typeof racer>, input: Partial<Parameters<typeof normalizePlayerInput>[0]>, step = 0) =>
  stepGalacticRacerAction(self.galactic, { step, delta: 1 / 120, racing: true, input: normalizePlayerInput(input), self: self.snapshot(), opponents: [] });

describe('overcharge lance', () => {
  it('fires on the press, charges while held with three rounds loaded, and releases one wide piercing bolt for three rounds', () => {
    const self = racer('shooter', 0, 0);
    expect(self.galactic.weapon.charges).toBe(LANCE_MAGAZINE);
    expect(act(self, { fire: true }).fireHeatLance).toBe(true);
    expect(self.galactic.weapon.charges).toBe(LANCE_MAGAZINE - 1);
    // Holding through the cooldown does not autofire; it starts the overcharge.
    let charging = false;
    for (let tick = 0; tick < 120 * 1.6; tick += 1) {
      const result = act(self, { fire: true }, tick);
      expect(result.fireHeatLance).toBe(false);
      charging ||= result.events.some((event) => event.type === 'overcharge-charging' && event.active);
    }
    expect(charging).toBe(true);
    expect(self.galactic.weapon.overcharge).toBe(1);
    expect(deriveGalacticHudViewModel(self.galactic)!.weaponOvercharge).toBe(1);
    const release = act(self, { fire: false });
    expect(release.fireOvercharge).toBe(true);
    expect(self.galactic.weapon.charges).toBe(LANCE_MAGAZINE - 1 - OVERCHARGE_CELLS);
    expect(self.galactic.weapon.overcharge).toBe(0);
    const world = createGalacticWorldState(); world.hazards = [];
    const bolt = spawnHeatLance(world, self.snapshot(), 'overcharge');
    expect(bolt.piercing).toBe(true);
    expect(bolt.radius).toBeGreaterThan(2);
    expect(Math.hypot(bolt.velocity.x, bolt.velocity.z - 80)).toBeLessThan(150);
  });

  it('goes through a raised shield', () => {
    const victim = racer('victim', 0, 40);
    victim.galactic.shield.active = true;
    victim.galactic.shield.remaining = 1.5;
    const world = createGalacticWorldState(); world.hazards = [];
    const shooter = racer('shooter', 0, 0);
    spawnHeatLance(world, shooter.snapshot(), 'overcharge');
    let impact = null;
    for (let tick = 0; tick < 240 && !impact; tick += 1) impact = stepGalacticWorld(world, [shooter.snapshot(), victim.snapshot()], 1 / 120).impacts[0] ?? null;
    expect(impact).toMatchObject({ weapon: 'overcharge-lance', piercing: true });
    const result = applyGalacticImpact('victim', victim.galactic, victim.vehicle, victim.config, impact!);
    expect(result.shielded).toBe(false);
    expect(result.appliedDamage).toBeGreaterThan(0.2);
  });

  it('holds the trigger for an overcharge only when the target is shielded', () => {
    const self = racer('bot', 0, 0);
    const target = racer('target', 0, 45);
    target.galactic.shield.active = true;
    let held = 0, released = false;
    for (let step = 0; step < 120 * 3 && !released; step += 1) {
      const input = augmentGalacticAIInput(normalizePlayerInput({ throttle: 1 }), self.snapshot(), [target.snapshot()], step);
      const result = stepGalacticRacerAction(self.galactic, { step, delta: 1 / 120, racing: true, input, self: self.snapshot(), opponents: [target.snapshot()] });
      held += input.fire ? 1 : 0;
      released ||= result.fireOvercharge;
    }
    expect(held).toBeGreaterThan(60);
    expect(released).toBe(true);
  });
});

describe('nitro cell', () => {
  it('refills the meter and clears the overheat penalty once', () => {
    const self = racer('driver', 0, 0);
    self.vehicle.boost.energy = 0.1;
    self.vehicle.boost.overheated = true;
    self.vehicle.boost.overheatHandlingTimer = 1.5;
    self.vehicle.heat = 1.1;
    const world = createGalacticWorldState(); world.hazards = [];
    const events = collectCombatPickup('nitro-hairpin', 'nitro-cell', { id: 'driver', vehicle: self.vehicle, galactic: self.galactic }, [], world);
    expect(events).toEqual([{ type: 'nitro-collected', racerId: 'driver', pickupId: 'nitro-hairpin' }]);
    expect(self.vehicle.boost).toMatchObject({ energy: 1, overheated: false, overheatHandlingTimer: 0 });
    expect(self.vehicle.heat).toBeLessThanOrEqual(0.45);
  });

  it('sits on the inside of the hairpin apex in a real race', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0 });
    const nitro = race.state.galacticWorld.pickups.find((pickup) => pickup.part === 'nitro-cell')!;
    const apex = race.course.sampleAtProgress(nitro.progress);
    expect(apex.tag).toBe('hairpin');
    const before = race.course.sampleAtProgress(nitro.progress - 0.02), after = race.course.sampleAtProgress(nitro.progress + 0.02);
    const chordX = (before.x + after.x) / 2, chordZ = (before.z + after.z) / 2;
    const inside = Math.hypot(apex.x + apex.rightX * nitro.lateralOffset - chordX, apex.z + apex.rightZ * nitro.lateralOffset - chordZ);
    const outside = Math.hypot(apex.x - apex.rightX * nitro.lateralOffset - chordX, apex.z - apex.rightZ * nitro.lateralOffset - chordZ);
    expect(inside).toBeLessThan(outside);
    expect(Math.abs(nitro.lateralOffset)).toBeGreaterThan(3);
  });
});

describe('tow cable', () => {
  function raceWithCable() {
    // Combat inputs only exist in the chaos profile; clean races strip them.
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 11, countdownSeconds: 0, fieldSize: 3 });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    const rivals = race.state.entries.filter((entry) => !entry.isPlayer);
    for (const entry of race.state.entries) { entry.galactic!.upgrades.collectedPickupIds.length = 0; }
    const place = (entry: typeof player, progress: number, speed: number, lateral = 0) => {
      const sample = race.course.sampleAtProgress(progress);
      entry.vehicle.position.x = sample.x + sample.rightX * lateral; entry.vehicle.position.z = sample.z + sample.rightZ * lateral;
      entry.vehicle.position.y = sample.y + 2.45;
      entry.vehicle.orientation.yaw = Math.atan2(sample.tangentX, sample.tangentZ);
      entry.vehicle.velocity.x = sample.tangentX * speed; entry.vehicle.velocity.z = sample.tangentZ * speed;
      stageRaceProgress(entry, race.course, progress);
    };
    place(player, 0.100, 60);
    place(rivals[0]!, 0.100 + 40 / race.course.totalLength, 60);
    place(rivals[1]!, 0.02, 10);
    player.galactic!.ordnance = { kind: 'tow-cable', charges: 1, cooldown: 0 };
    const externalInputs = Object.fromEntries(rivals.map((entry) => [entry.id, { throttle: 0.5 }]));
    return { race, player, rival: rivals[0]!, externalInputs };
  }

  it('latches onto the pod ahead, pulls, and slingshots on release', () => {
    const { race, player, rival, externalInputs } = raceWithCable();
    const first = race.step({ throttle: 0.5, mine: true }, externalInputs);
    expect(first.galacticEvents).toContainEqual({ type: 'tow-attached', racerId: player.id, targetId: rival.id });
    expect(player.galactic!.ordnance!.charges).toBe(0);
    expect(deriveGalacticHudViewModel(player.galactic!)!.towActive).toBe(true);
    const speedBefore = player.vehicle.telemetry.speed;
    for (let tick = 0; tick < 120; tick += 1) race.step({ throttle: 0.5 }, externalInputs);
    expect(player.vehicle.telemetry.speed).toBeGreaterThan(speedBefore + 8);
    // Pressing the key again lets go with a kick along the nose.
    const before = player.vehicle.telemetry.speed;
    const release = race.step({ throttle: 0.5, mine: true }, externalInputs);
    expect(release.galacticEvents.some((event) => event.type === 'tow-released' && event.racerId === player.id && !event.timeout)).toBe(true);
    expect(player.vehicle.telemetry.speed).toBeGreaterThan(before + 5);
    expect(player.galactic!.tow!.targetId).toBeNull();
  });

  it('is cut by the target raising its shield, and runs out after three seconds otherwise', () => {
    const cut = raceWithCable();
    cut.race.step({ throttle: 0.5, mine: true }, cut.externalInputs);
    expect(cut.player.galactic!.tow!.targetId).toBe(cut.rival.id);
    // The shield goes up in the racer step; the cable is checked at the next tow step.
    const cutEvents = [];
    for (let tick = 0; tick < 3; tick += 1) cutEvents.push(...cut.race.step({ throttle: 0.5 }, { ...cut.externalInputs, [cut.rival.id]: { throttle: 0.5, shield: true } }).galacticEvents);
    expect(cutEvents).toContainEqual({ type: 'tow-cut', racerId: cut.player.id, targetId: cut.rival.id, reason: 'shield' });
    const timeout = raceWithCable();
    timeout.race.step({ throttle: 0.5, mine: true }, timeout.externalInputs);
    let released = null as null | { timeout: boolean };
    for (let tick = 0; tick < 120 * (TOW_DURATION + 0.5) && !released; tick += 1) {
      for (const event of timeout.race.step({ throttle: 0.5 }, timeout.externalInputs).galacticEvents) {
        if (event.type === 'tow-released' && event.racerId === timeout.player.id) released = { timeout: event.timeout };
      }
    }
    expect(released).toEqual({ timeout: true });
  });
});
