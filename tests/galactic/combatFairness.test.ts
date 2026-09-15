import { describe, expect, it } from 'vitest';
import {
  assessGalacticThreats,
  augmentGalacticAIInput,
  createGalacticRacerState,
  createGalacticWorldState,
  deriveGalacticVehicleConfig,
  recoveryInvulnerability,
  snapshotGalacticRacer,
  spawnHeatLance,
  stepGalacticWorld,
  sweepCircleEntry,
  type GalacticRacerSnapshot,
  type GalacticVehicleClass,
  type GalacticWorldOccluder,
} from '../../src/game/galactic';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, createPodracerState } from '../../src/game/simulation';

function snapshot(
  id: string,
  x: number,
  z: number,
  options: { yaw?: number; vehicleClass?: GalacticVehicleClass; velocityZ?: number } = {},
): GalacticRacerSnapshot {
  const vehicleClass = options.vehicleClass ?? 'podracer';
  const galactic = createGalacticRacerState(vehicleClass);
  const config = deriveGalacticVehicleConfig(vehicleClass, DEFAULT_PODRACER_CONFIG, galactic.upgrades);
  const vehicle = createPodracerState({ id, position: { x, z }, yaw: options.yaw ?? 0, terrain: FLAT_HEIGHT_SAMPLER }, config);
  if (options.velocityZ !== undefined) vehicle.velocity.z = options.velocityZ;
  return snapshotGalacticRacer(id, vehicle, galactic, 0, 0, false);
}

function fly(world: ReturnType<typeof createGalacticWorldState>, racers: GalacticRacerSnapshot[], ticks: number, occluder?: GalacticWorldOccluder) {
  const impacts = [];
  const events = [];
  for (let tick = 0; tick < ticks; tick += 1) {
    const result = stepGalacticWorld(world, racers, 1 / 120, occluder);
    impacts.push(...result.impacts);
    events.push(...result.events);
  }
  return { impacts, events };
}

describe('sweep resolution', () => {
  it('returns the entry fraction along the sweep and zero for a point-blank start', () => {
    expect(sweepCircleEntry(0, 0, 0, 100, 0, 50, 10)).toBeCloseTo(0.4, 6);
    expect(sweepCircleEntry(0, 0, 0, 100, 30, 50, 10)).toBeNull();
    expect(sweepCircleEntry(0, 0, 0, 100, 0, 5, 10)).toBe(0);
    expect(sweepCircleEntry(0, 0, 0, 100, 0, 130, 10)).toBeNull();
  });
});

describe('fair Heat Lance resolution', () => {
  it('hits the nearest hull along the sweep even when a farther racer is listed first', () => {
    const shooter = snapshot('shooter', 0, 0);
    const far = snapshot('far', 0, 60);
    const near = snapshot('near', 0, 30);
    const world = createGalacticWorldState();
    spawnHeatLance(world, shooter);
    const { impacts } = fly(world, [shooter, far, near], 40);
    expect(impacts).toHaveLength(1);
    expect(impacts[0]?.targetId).toBe('near');
  });

  it('stops at scenery before the racer behind it and reports the blocked point', () => {
    const shooter = snapshot('shooter', 0, 0);
    const victim = snapshot('victim', 0, 60);
    const wallAtZ = 30;
    const occluder: GalacticWorldOccluder = (_x0, _y0, z0, _x1, _y1, z1) => {
      if (z0 < wallAtZ && z1 >= wallAtZ) return (wallAtZ - z0) / (z1 - z0);
      return null;
    };
    const world = createGalacticWorldState();
    const projectile = spawnHeatLance(world, shooter);
    const { impacts, events } = fly(world, [shooter, victim], 60, occluder);
    expect(impacts).toHaveLength(0);
    const blocked = events.find((event) => event.type === 'heat-lance-blocked');
    expect(blocked?.type).toBe('heat-lance-blocked');
    if (blocked?.type !== 'heat-lance-blocked') throw new Error('expected a blocked lance');
    expect(blocked.projectileId).toBe(projectile.id);
    expect(blocked.z).toBeCloseTo(wallAtZ, 3);
    expect(world.projectiles).toHaveLength(0);
  });

  it('lets a hull in front of the wall take the hit', () => {
    const shooter = snapshot('shooter', 0, 0);
    const victim = snapshot('victim', 0, 20);
    const occluder: GalacticWorldOccluder = (_x0, _y0, z0, _x1, _y1, z1) => (z0 < 30 && z1 >= 30 ? (30 - z0) / (z1 - z0) : null);
    const world = createGalacticWorldState();
    spawnHeatLance(world, shooter);
    const { impacts } = fly(world, [shooter, victim], 40, occluder);
    expect(impacts.map((impact) => impact.targetId)).toEqual(['victim']);
  });

  it('does not let a lance pass through the authored canyon wall in a real race', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0 });
    const canyon = race.course.getRenderData(512).points.filter((point) => point.tag === 'narrow-canyon');
    const inside = race.course.sampleAtProgress(canyon[Math.floor(canyon.length / 2)]!.progress);
    const shooter = race.state.entries.find((entry) => entry.isPlayer)!;
    // Aim straight at the right wall from the centre line.
    shooter.vehicle.position.x = inside.x;
    shooter.vehicle.position.z = inside.z;
    shooter.vehicle.position.y = inside.y + DEFAULT_PODRACER_CONFIG.hoverHeight;
    shooter.vehicle.orientation.yaw = Math.atan2(inside.rightX, inside.rightZ);
    shooter.progress.courseProgress = inside.progress;
    const self = snapshotGalacticRacer(shooter.id, shooter.vehicle, shooter.galactic!, inside.progress, 0, false);
    const projectile = spawnHeatLance(race.state.galacticWorld, self);
    let blocked = false;
    for (let tick = 0; tick < 30 && !blocked; tick += 1) {
      blocked = race.step({ throttle: 0 }).galacticEvents.some((event) => event.type === 'heat-lance-blocked' && event.projectileId === projectile.id);
    }
    expect(blocked).toBe(true);
    const wallDistance = inside.width + 7.8;
    expect(Math.abs(projectile.position.x - inside.x) + Math.abs(projectile.position.z - inside.z)).toBeLessThan(wallDistance * 1.5 + 6);
  });
});

describe('threat-aware rivals', () => {
  it('fires only with a target in the cone and a clear line, on a deliberate cadence', () => {
    const self = snapshot('ai', 0, 0, { velocityZ: 90 });
    const ahead = snapshot('ahead', 2, 50);
    const wide = snapshot('wide', 40, 50);
    let fired = 0;
    let firedWide = 0;
    let firedBlocked = 0;
    for (let step = 0; step < 1200; step += 1) {
      fired += augmentGalacticAIInput(normalizePlayerInput(), self, [ahead], step).fire ? 1 : 0;
      firedWide += augmentGalacticAIInput(normalizePlayerInput(), self, [wide], step).fire ? 1 : 0;
      firedBlocked += augmentGalacticAIInput(normalizePlayerInput(), self, [ahead], step, {
        projectiles: [], mines: [], hasLineOfFire: () => false,
      }).fire ? 1 : 0;
    }
    expect(fired).toBeGreaterThan(0);
    // Five two-second cycles of a half-second window: never a constant stream.
    expect(fired).toBeLessThanOrEqual(5 * 60);
    expect(firedWide).toBe(0);
    expect(firedBlocked).toBe(0);
  });

  it('never targets a returning or shielded racer, and never attacks from the grid', () => {
    const parked = snapshot('parked', 0, 0);
    let firedParked = 0;
    for (let step = 0; step < 600; step += 1) firedParked += augmentGalacticAIInput(normalizePlayerInput(), parked, [snapshot('open', 0, 40)], step).fire ? 1 : 0;
    expect(firedParked).toBe(0);
    const self = snapshot('ai', 0, 0);
    const returning = snapshot('returning', 0, 40);
    returning.galactic.wreck.invulnerable = 1;
    const shielded = snapshot('shielded', 0, 40);
    shielded.galactic.shield.active = true;
    expect(assessGalacticThreats(self, [returning]).targetId).toBeNull();
    expect(assessGalacticThreats(self, [shielded]).targetId).toBeNull();
    expect(assessGalacticThreats(self, [snapshot('open', 0, 40)]).targetId).toBe('open');
  });

  it('drops a mine only for a genuine pursuer and raises the shield for an inbound lance', () => {
    const self = snapshot('ai', 0, 0, { velocityZ: 60 });
    const pursuer = snapshot('pursuer', 1, -25, { velocityZ: 64 });
    const straggler = snapshot('straggler', 1, -25, { velocityZ: 10 });
    let mined = 0;
    let minedStraggler = 0;
    for (let step = 0; step < 1500; step += 1) {
      mined += augmentGalacticAIInput(normalizePlayerInput(), self, [pursuer], step).mine ? 1 : 0;
      minedStraggler += augmentGalacticAIInput(normalizePlayerInput(), self, [straggler], step).mine ? 1 : 0;
    }
    expect(mined).toBeGreaterThan(0);
    expect(minedStraggler).toBe(0);

    const attacker = snapshot('attacker', 0, -40);
    const world = createGalacticWorldState();
    const lance = spawnHeatLance(world, attacker);
    const calm = augmentGalacticAIInput(normalizePlayerInput(), self, [attacker], 3, { projectiles: [], mines: [] });
    const threatened = augmentGalacticAIInput(normalizePlayerInput(), self, [attacker], 3, { projectiles: [lance], mines: [] });
    expect(calm.shield).toBe(false);
    expect(threatened.shield).toBe(true);
    // A lance flying away is not a threat.
    const receding = { ...lance, velocity: { x: 0, y: 0, z: -268 } };
    expect(augmentGalacticAIInput(normalizePlayerInput(), self, [attacker], 3, { projectiles: [receding], mines: [] }).shield).toBe(false);
  });

  it('shields against an unavoidable mine directly ahead and never on a timer', () => {
    const self = snapshot('ai', 0, 0, { velocityZ: 70 });
    const mine = { id: 'mine-x', ownerId: 'rival', position: { x: 1, y: 0, z: 25 }, remaining: 10, armTime: 0, triggerRadius: 8.5, damage: 0.19 };
    expect(augmentGalacticAIInput(normalizePlayerInput(), self, [], 9, { projectiles: [], mines: [mine] }).shield).toBe(true);
    let timerShields = 0;
    for (let step = 0; step < 4000; step += 1) {
      timerShields += augmentGalacticAIInput(normalizePlayerInput(), self, [], step).shield ? 1 : 0;
    }
    expect(timerShields).toBe(0);
  });
});

describe('protected returns', () => {
  it('extends recovery immunity for repeated wrecks up to a bound', () => {
    expect(recoveryInvulnerability(1)).toBeCloseTo(1.55, 6);
    expect(recoveryInvulnerability(2)).toBeGreaterThan(recoveryInvulnerability(1));
    expect(recoveryInvulnerability(4)).toBeCloseTo(recoveryInvulnerability(9), 6);
    expect(recoveryInvulnerability(9)).toBeLessThan(3.5);
  });
});
