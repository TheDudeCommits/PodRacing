import { normalizePlayerInput, type PlayerInputState } from '../input/actions';
import type { PodracerConfig } from '../simulation/config';
import type { PodracerState } from '../simulation/types';
import { GALACTIC_VEHICLES } from './catalog';
import type {
  GalacticActionContext,
  GalacticActionResult,
  GalacticEvent,
  GalacticHazardState,
  GalacticImpact,
  GalacticImpactResult,
  GalacticRacerSnapshot,
  GalacticRacerState,
  GalacticUpgradePart,
  GalacticUpgradePickupState,
  GalacticVehicleClass,
  GalacticWorldState,
  GalacticWorldStepResult,
  HeatLanceProjectileState,
  ScrapMineState,
} from './types';

const DEFAULT_WORLD_SEED = 0x47414c43; // GALC
const WRECK_DAMAGE_THRESHOLD = 0.86;
const WRECK_DURATION = 2.15;
const RECOVERY_INVULNERABILITY = 1.55;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function wrapProgress(progress: number): number {
  const wrapped = (Number.isFinite(progress) ? progress : 0) % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function progressDistance(a: number, b: number): number {
  // Live race and authored world progress are already normalized. Preserve a
  // defensive slow path for direct callers without paying two modulo
  // operations for every racer/hazard and racer/pickup comparison.
  const normalizedA = a >= 0 && a < 1 ? a : wrapProgress(a);
  const normalizedB = b >= 0 && b < 1 ? b : wrapProgress(b);
  const direct = Math.abs(normalizedA - normalizedB);
  return Math.min(direct, 1 - direct);
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function tickRng(state: GalacticWorldState): number {
  let value = state.rngState >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rngState = value >>> 0;
  return (state.rngState >>> 0) / 0x1_0000_0000;
}

function makeHazard(
  id: string,
  kind: GalacticHazardState['kind'],
  progress: number,
  lateralOffset: number,
  progressRadius: number,
  lateralRadius: number,
): GalacticHazardState {
  return { id, kind, progress, lateralOffset, progressRadius, lateralRadius, cooldowns: {} };
}

function makePickup(
  id: string,
  progress: number,
  lateralOffset: number,
  part: GalacticUpgradePart,
): GalacticUpgradePickupState {
  return {
    id,
    progress,
    lateralOffset,
    progressRadius: 0.0045,
    lateralRadius: 8,
    part,
    collectedBy: null,
  };
}

export function createGalacticRacerState(
  vehicleClass: GalacticVehicleClass = 'podracer',
): GalacticRacerState {
  return {
    version: 1,
    vehicleClass,
    shield: { active: false, remaining: 0, cooldown: 0, absorbedDamage: 0 },
    weapon: { cooldown: 0, triggerHeld: false, shotsFired: 0, hits: 0 },
    mine: { cooldown: 0, charges: 3, deployed: 0 },
    redline: { active: false, heat: 0.08, lockout: 0, peakHeat: 0.08 },
    wreck: {
      phase: 'running', timer: 0, invulnerable: 0, crashCount: 0,
      cause: null, sourceId: null, takedownBy: null,
      recentAggressorId: null, recentAggressorTime: 0,
    },
    status: {
      sandGeyser: 0,
      heatVent: 0,
      rockfallStun: 0,
      dustInterference: 0,
      ionized: 0,
    },
    upgrades: {
      afterburner: 0,
      cornering: 0,
      resilience: 0,
      parts: [],
      collectedPickupIds: [],
    },
    takedowns: 0,
    controls: { fireHeld: false, shieldHeld: false, cycleVehicleHeld: false },
  };
}

export function createGalacticWorldState(seed = DEFAULT_WORLD_SEED): GalacticWorldState {
  return {
    version: 1,
    step: 0,
    rngState: (seed ^ DEFAULT_WORLD_SEED) >>> 0,
    projectileSequence: 0,
    mineSequence: 0,
    projectiles: [],
    mines: [],
    hazards: [
      makeHazard('geyser-launch', 'sand-geyser', 0.145, -3, 0.006, 15),
      makeHazard('vent-canyon', 'heat-vent', 0.438, 4, 0.007, 13),
      makeHazard('fall-chicane', 'rockfall', 0.605, -5, 0.006, 14),
      makeHazard('dust-hairpin', 'dust-interference', 0.79, 0, 0.01, 24),
    ],
    pickups: [
      makePickup('part-afterburner', 0.205, -7, 'afterburner-coils'),
      makePickup('part-vector', 0.39, 8, 'vector-vanes'),
      makePickup('part-frame', 0.57, -7, 'reinforced-frame'),
      makePickup('part-pulse', 0.705, 7, 'pulse-capacitor'),
      makePickup('part-landing', 0.845, -5, 'landing-recuperator'),
      makePickup('part-mine', 0.93, 6, 'mine-printer'),
      // Authored additions: old pickup coordinates and the RNG stream stay fixed.
      makePickup('combat-emp', 0.315, -9, 'emp-cell'),
      makePickup('combat-repair', 0.805, 8, 'repair-salvage'),
    ],
    runTokens: 3,
    runCurrency: 0,
  };
}

export function snapshotGalacticRacer(
  id: string,
  vehicle: Readonly<PodracerState>,
  galactic: GalacticRacerState,
  courseProgress: number,
  lateralOffset: number,
  finished: boolean,
): GalacticRacerSnapshot {
  return {
    id,
    x: vehicle.position.x,
    y: vehicle.position.y,
    z: vehicle.position.z,
    yaw: vehicle.orientation.yaw,
    velocityX: vehicle.velocity.x,
    velocityY: vehicle.velocity.y,
    velocityZ: vehicle.velocity.z,
    damage: vehicle.damage,
    heat: vehicle.heat,
    courseProgress,
    lateralOffset,
    finished,
    galactic,
  };
}

function decrementRacerTimers(
  racerId: string,
  state: GalacticRacerState,
  delta: number,
  events: GalacticEvent[],
): void {
  state.weapon.cooldown = Math.max(0, state.weapon.cooldown - delta);
  state.mine.cooldown = Math.max(0, state.mine.cooldown - delta);
  state.redline.lockout = Math.max(0, state.redline.lockout - delta);
  state.wreck.invulnerable = Math.max(0, state.wreck.invulnerable - delta);
  state.wreck.recentAggressorTime = Math.max(0, state.wreck.recentAggressorTime - delta);
  if (state.wreck.recentAggressorTime <= 0) state.wreck.recentAggressorId = null;
  state.status.sandGeyser = Math.max(0, state.status.sandGeyser - delta);
  state.status.heatVent = Math.max(0, state.status.heatVent - delta);
  state.status.rockfallStun = Math.max(0, state.status.rockfallStun - delta);
  state.status.dustInterference = Math.max(0, state.status.dustInterference - delta);
  state.status.ionized = Math.max(0, state.status.ionized - delta);

  state.shield.cooldown = Math.max(0, state.shield.cooldown - delta);
  if (state.shield.active) {
    state.shield.remaining = Math.max(0, state.shield.remaining - delta);
    if (state.shield.remaining <= 0) {
      state.shield.active = false;
      events.push({ type: 'pulse-shell', racerId, active: false, cooldown: state.shield.cooldown });
    }
  }
}

/**
 * Advances abilities and returns a safe driving action. The function is pure
 * with respect to browser/render state and consumes exactly one fixed tick.
 */
export function stepGalacticRacerAction(
  state: GalacticRacerState,
  context: GalacticActionContext,
): GalacticActionResult {
  const delta = clamp(context.delta, 0, 0.1);
  const definition = GALACTIC_VEHICLES[state.vehicleClass];
  const events: GalacticEvent[] = [];
  decrementRacerTimers(context.self.id, state, delta, events);
  let input = context.normalizedInput
    ? context.input
    : normalizePlayerInput(context.input);
  let recoverNow = false;
  let redlineExploded = false;
  let redlineAcceleration = 0;

  if (state.wreck.phase === 'wrecked') {
    state.wreck.timer = Math.max(0, state.wreck.timer - delta);
    if (state.wreck.timer <= 0) {
      state.wreck.phase = 'recovering';
      state.wreck.invulnerable = RECOVERY_INVULNERABILITY;
      recoverNow = true;
      events.push({ type: 'recovered', racerId: context.self.id, invulnerable: RECOVERY_INVULNERABILITY });
    }
    input = normalizePlayerInput({ brake: 0.6, reset: recoverNow });
  } else if (state.wreck.phase === 'recovering') {
    if (state.wreck.invulnerable <= 0) {
      state.wreck.phase = 'running';
      state.wreck.cause = null;
      state.wreck.sourceId = null;
      state.wreck.takedownBy = null;
    }
  }

  const pulseCapacitor = state.upgrades.parts.includes('pulse-capacitor');
  const shieldPressed = input.shield && !state.controls.shieldHeld;
  const activateShield = context.racing
    && state.wreck.phase !== 'wrecked'
    && shieldPressed
    && state.shield.cooldown <= 0;
  if (activateShield) {
    const duration = definition.shieldDuration * (pulseCapacitor ? 1.25 : 1);
    state.shield.active = true;
    state.shield.remaining = duration;
    state.shield.cooldown = duration + definition.shieldCooldown * (pulseCapacitor ? 0.78 : 1);
    events.push({ type: 'pulse-shell', racerId: context.self.id, active: true, cooldown: state.shield.cooldown });
  }

  const previousRedline = state.redline.active;
  const redlineAllowed = context.racing
    && state.wreck.phase !== 'wrecked'
    && state.redline.lockout <= 0
    && state.status.ionized <= 0
    && input.boost;
  state.redline.active = redlineAllowed;
  if (redlineAllowed) {
    const coolingPart = state.upgrades.parts.includes('afterburner-coils') ? 0.88 : 1;
    state.redline.heat += definition.redlineHeatRate * coolingPart * delta;
    state.redline.peakHeat = Math.max(state.redline.peakHeat, state.redline.heat);
    redlineAcceleration = definition.redlineAcceleration * (1 + state.upgrades.afterburner * 0.07);
    if (state.redline.heat >= 1) {
      state.redline.heat = 1;
      state.redline.active = false;
      state.redline.lockout = 3.4;
      redlineExploded = true;
      input = { ...input, boost: false };
      events.push({ type: 'redline-explosion', racerId: context.self.id, heat: 1 });
    }
  } else {
    state.redline.heat = Math.max(0, state.redline.heat - definition.redlineCoolingRate * delta);
    if (previousRedline && state.redline.heat > 0.5) {
      state.redline.lockout = Math.max(state.redline.lockout, 0.65 + state.redline.heat * 1.25);
    }
    if (state.redline.lockout > 0) input = { ...input, boost: false };
  }
  if (previousRedline !== state.redline.active) {
    events.push({
      type: 'redline-surge', racerId: context.self.id,
      active: state.redline.active, heat: state.redline.heat, lockout: state.redline.lockout,
    });
  }

  if (state.status.rockfallStun > 0) {
    input = { ...input, throttle: input.throttle * 0.22, brake: Math.max(input.brake, 0.38), boost: false };
  }
  if (state.status.ionized > 0) {
    input = { ...input, throttle: input.throttle * 0.7, boost: false };
  }
  if (state.status.dustInterference > 0) {
    const phase = context.step * 0.173 + (hashString(context.self.id) & 255) * 0.031;
    input = { ...input, steer: clamp(input.steer + Math.sin(phase) * 0.16, -1, 1) };
  }

  const wantsMine = input.mine
    && state.mine.cooldown <= 0
    && state.mine.charges > 0;
  const deployMine = context.racing && state.wreck.phase !== 'wrecked' && wantsMine;
  const fireHeatLance = context.racing
    && state.wreck.phase !== 'wrecked'
    && input.fire
    && state.weapon.cooldown <= 0;
  if (deployMine) {
    state.mine.cooldown = 2.4;
    state.mine.charges -= 1;
    state.mine.deployed += 1;
  }
  if (fireHeatLance) {
    state.weapon.cooldown = definition.weaponCooldown;
    state.weapon.shotsFired += 1;
  }

  state.controls.fireHeld = input.fire;
  state.controls.shieldHeld = input.shield;
  state.controls.cycleVehicleHeld = input.cycleVehicle;
  state.weapon.triggerHeld = input.fire;
  return {
    input,
    deployMine,
    fireHeatLance,
    activateShield,
    recoverNow,
    redlineExploded,
    redlineAcceleration,
    events,
  };
}

/** Adds deterministic combat intent to an existing spline-driving AI action. */
export function augmentGalacticAIInput(
  input: Readonly<PlayerInputState>,
  self: Readonly<GalacticRacerSnapshot>,
  opponents: readonly GalacticRacerSnapshot[],
  step: number,
): PlayerInputState {
  const forwardX = Math.sin(self.yaw);
  const forwardZ = Math.cos(self.yaw);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  let targetAhead = false;
  let targetBehind = false;
  for (const opponent of opponents) {
    if (opponent.finished || opponent.galactic.wreck.phase === 'wrecked') continue;
    const dx = opponent.x - self.x;
    const dz = opponent.z - self.z;
    const forward = dx * forwardX + dz * forwardZ;
    const lateral = dx * rightX + dz * rightZ;
    targetAhead ||= forward > 5 && forward < 210 && Math.abs(lateral) < 34;
    targetBehind ||= forward < -5 && forward > -68 && Math.abs(lateral) < 27;
  }
  const phase = (step + hashString(self.id)) >>> 0;
  const fireWindow = phase % 31 < 3;
  const mineWindow = phase % 97 < 3;
  const shieldWindow = phase % 643 === 0 || (self.damage > 0.55 && phase % 181 === 0);
  return normalizePlayerInput({
    ...input,
    fire: fireWindow && targetAhead,
    mine: mineWindow && targetBehind,
    shield: shieldWindow,
    cycleVehicle: false,
  });
}

export function spawnHeatLance(
  world: GalacticWorldState,
  racer: Readonly<GalacticRacerSnapshot>,
): HeatLanceProjectileState {
  world.projectileSequence += 1;
  const definition = GALACTIC_VEHICLES[racer.galactic.vehicleClass];
  const forwardX = Math.sin(racer.yaw);
  const forwardZ = Math.cos(racer.yaw);
  const position = {
    x: racer.x + forwardX * (definition.collisionRadius + 2.5),
    y: racer.y + 0.6,
    z: racer.z + forwardZ * (definition.collisionRadius + 2.5),
  };
  const projectile: HeatLanceProjectileState = {
    id: `lance-${racer.id}-${world.projectileSequence}`,
    ownerId: racer.id,
    position,
    previousPosition: { ...position },
    velocity: {
      x: racer.velocityX + forwardX * 268,
      y: racer.velocityY * 0.2,
      z: racer.velocityZ + forwardZ * 268,
    },
    remaining: 1.35,
    radius: 1.15,
    damage: definition.weaponDamage,
    heat: 0.13,
  };
  world.projectiles.push(projectile);
  return projectile;
}

export function deployScrapMine(
  world: GalacticWorldState,
  racer: Readonly<GalacticRacerSnapshot>,
): ScrapMineState {
  world.mineSequence += 1;
  const forwardX = Math.sin(racer.yaw);
  const forwardZ = Math.cos(racer.yaw);
  const mine: ScrapMineState = {
    id: `mine-${racer.id}-${world.mineSequence}`,
    ownerId: racer.id,
    position: {
      x: racer.x - forwardX * 8,
      y: racer.y - 1.2,
      z: racer.z - forwardZ * 8,
    },
    remaining: 16,
    armTime: 0.38,
    triggerRadius: 8.5,
    damage: 0.19,
  };
  world.mines.push(mine);
  return mine;
}

function segmentPointDistanceSquared(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared <= 1e-9
    ? 0
    : clamp(((px - ax) * dx + (pz - az) * dz) / lengthSquared, 0, 1);
  const closestX = ax + dx * amount;
  const closestZ = az + dz * amount;
  return (px - closestX) ** 2 + (pz - closestZ) ** 2;
}

function hazardImpact(hazard: GalacticHazardState, racer: GalacticRacerSnapshot): GalacticImpact {
  const tangent = ((hashString(hazard.id) & 1) === 0 ? -1 : 1);
  switch (hazard.kind) {
    case 'sand-geyser':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0.025, heat: 0, impulseX: tangent * 1.8, impulseY: 16, impulseZ: 0,
        status: 'sandGeyser', statusDuration: 1.2,
        hazardId: hazard.id, hazardKind: hazard.kind,
      };
    case 'heat-vent':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0.035, heat: 0.28, impulseX: 0, impulseY: 4, impulseZ: 0,
        status: 'heatVent', statusDuration: 1.8,
        hazardId: hazard.id, hazardKind: hazard.kind,
      };
    case 'rockfall':
      return {
        targetId: racer.id, sourceId: null, cause: 'rockfall', weapon: null,
        damage: 0.2, heat: 0, impulseX: tangent * 12, impulseY: 7, impulseZ: -9,
        status: 'rockfallStun', statusDuration: 1.05,
        hazardId: hazard.id, hazardKind: hazard.kind,
      };
    case 'dust-interference':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0, heat: 0, impulseX: 0, impulseY: 0, impulseZ: 0,
        status: 'dustInterference', statusDuration: 2.4,
        hazardId: hazard.id, hazardKind: hazard.kind,
      };
  }
}

/** Advances bounded projectile, mine, hazard and pickup state for one fixed tick. */
export function stepGalacticWorld(
  world: GalacticWorldState,
  racers: readonly GalacticRacerSnapshot[],
  delta: number,
): GalacticWorldStepResult {
  const safeDelta = clamp(delta, 0, 0.1);
  const impacts: GalacticImpact[] = [];
  const pickupClaims: GalacticWorldStepResult['pickupClaims'] = [];
  const events: GalacticEvent[] = [];
  world.step += 1;

  for (let index = world.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = world.projectiles[index];
    if (!projectile) continue;
    projectile.remaining -= safeDelta;
    Object.assign(projectile.previousPosition, projectile.position);
    projectile.position.x += projectile.velocity.x * safeDelta;
    projectile.position.y += projectile.velocity.y * safeDelta;
    projectile.position.z += projectile.velocity.z * safeDelta;
    let target: GalacticRacerSnapshot | null = null;
    for (const racer of racers) {
      if (racer.id === projectile.ownerId || racer.finished) continue;
      const radius = GALACTIC_VEHICLES[racer.galactic.vehicleClass].collisionRadius + projectile.radius;
      const distanceSquared = segmentPointDistanceSquared(
        projectile.previousPosition.x, projectile.previousPosition.z,
        projectile.position.x, projectile.position.z,
        racer.x, racer.z,
      );
      if (distanceSquared <= radius * radius && Math.abs(projectile.position.y - racer.y) < 7) {
        target = racer;
        break;
      }
    }
    if (target) {
      const speed = Math.max(1, Math.hypot(projectile.velocity.x, projectile.velocity.z));
      impacts.push({
        targetId: target.id,
        sourceId: projectile.ownerId,
        cause: 'heat-lance',
        weapon: 'heat-lance',
        damage: projectile.damage,
        heat: projectile.heat,
        impulseX: projectile.velocity.x / speed * 8,
        impulseY: 1.8,
        impulseZ: projectile.velocity.z / speed * 8,
        status: 'ionized',
        statusDuration: 0.72,
        hazardId: null,
        hazardKind: null,
      });
      world.projectiles.splice(index, 1);
    } else if (projectile.remaining <= 0) {
      world.projectiles.splice(index, 1);
    }
  }

  for (let index = world.mines.length - 1; index >= 0; index -= 1) {
    const mine = world.mines[index];
    if (!mine) continue;
    mine.remaining -= safeDelta;
    mine.armTime = Math.max(0, mine.armTime - safeDelta);
    let target: GalacticRacerSnapshot | null = null;
    if (mine.armTime <= 0) {
      for (const racer of racers) {
        if (racer.id === mine.ownerId || racer.finished) continue;
        if (Math.hypot(racer.x - mine.position.x, racer.z - mine.position.z) <= mine.triggerRadius) {
          target = racer;
          break;
        }
      }
    }
    if (target) {
      const dx = target.x - mine.position.x;
      const dz = target.z - mine.position.z;
      const length = Math.max(1, Math.hypot(dx, dz));
      impacts.push({
        targetId: target.id, sourceId: mine.ownerId, cause: 'scrap-mine', weapon: 'scrap-mine',
        damage: mine.damage, heat: 0.08,
        impulseX: dx / length * 14, impulseY: 8, impulseZ: dz / length * 14,
        status: 'rockfallStun', statusDuration: 0.66,
        hazardId: null, hazardKind: null,
      });
      events.push({ type: 'scrap-mine-triggered', racerId: target.id, ownerId: mine.ownerId, mineId: mine.id });
      world.mines.splice(index, 1);
    } else if (mine.remaining <= 0) {
      world.mines.splice(index, 1);
    }
  }

  for (const hazard of world.hazards) {
    for (const racerId in hazard.cooldowns) {
      const remaining = Math.max(0, (hazard.cooldowns[racerId] ?? 0) - safeDelta);
      if (remaining <= 0) delete hazard.cooldowns[racerId];
      else hazard.cooldowns[racerId] = remaining;
    }
    for (const racer of racers) {
      if (racer.finished || racer.galactic.wreck.phase === 'wrecked') continue;
      if ((hazard.cooldowns[racer.id] ?? 0) > 0) continue;
      if (progressDistance(racer.courseProgress, hazard.progress) > hazard.progressRadius) continue;
      if (Math.abs(racer.lateralOffset - hazard.lateralOffset) > hazard.lateralRadius) continue;
      const jitter = 0.88 + tickRng(world) * 0.24;
      const impact = hazardImpact(hazard, racer);
      impact.damage *= jitter;
      impact.heat *= jitter;
      impacts.push(impact);
      hazard.cooldowns[racer.id] = hazard.kind === 'dust-interference' ? 3.2 : 4.5;
      events.push({
        type: 'hazard-hit', racerId: racer.id, hazardId: hazard.id,
        hazard: hazard.kind, intensity: clamp(jitter, 0, 1),
      });
    }
  }

  for (const pickup of world.pickups) {
    if (pickup.collectedBy !== null) continue;
    let collector: GalacticRacerSnapshot | undefined;
    for (const racer of racers) {
      if (
        racer.finished
        || ((pickup.part === 'emp-cell' || pickup.part === 'repair-salvage') && racer.galactic.wreck.phase === 'wrecked')
        || progressDistance(racer.courseProgress, pickup.progress) > pickup.progressRadius
        || Math.abs(racer.lateralOffset - pickup.lateralOffset) > pickup.lateralRadius
      ) continue;
      if (!collector || racer.id.localeCompare(collector.id) < 0) collector = racer;
    }
    if (!collector) continue;
    pickup.collectedBy = collector.id;
    pickupClaims.push({ racerId: collector.id, pickupId: pickup.id, part: pickup.part });
  }
  return { impacts, pickupClaims, events };
}

/** Applies damage/status while respecting Pulse Shell and recovery immunity. */
export function applyGalacticImpact(
  racerId: string,
  state: GalacticRacerState,
  vehicle: PodracerState,
  config: Readonly<PodracerConfig>,
  impact: Readonly<GalacticImpact>,
): GalacticImpactResult {
  const events: GalacticEvent[] = [];
  if (state.wreck.invulnerable > 0 || state.wreck.phase === 'wrecked') {
    return { appliedDamage: 0, shielded: false, events };
  }
  const definition = GALACTIC_VEHICLES[state.vehicleClass];
  const resilience = clamp(state.upgrades.resilience, 0, 3);
  const framePart = state.upgrades.parts.includes('reinforced-frame') ? 0.88 : 1;
  const baseDamage = Math.max(0, impact.damage)
    * definition.incomingDamageScale
    * (1 - resilience * 0.08)
    * framePart;
  const shielded = state.shield.active;
  const appliedDamage = baseDamage * (shielded ? 0.16 : 1);
  if (shielded && baseDamage > 0) {
    const absorbed = baseDamage - appliedDamage;
    state.shield.absorbedDamage += absorbed;
    state.shield.remaining = Math.max(0, state.shield.remaining - absorbed * 1.7);
    events.push({ type: 'shield-block', racerId, sourceId: impact.sourceId, absorbed });
  }
  vehicle.damage = clamp(vehicle.damage + appliedDamage, 0, 1);
  vehicle.heat = clamp(vehicle.heat + Math.max(0, impact.heat) * (shielded ? 0.35 : 1), 0, 1.25);
  const impulseScale = shielded ? 0.32 : 1;
  vehicle.velocity.x = clamp(vehicle.velocity.x + impact.impulseX * impulseScale, -config.boostMaxSpeed, config.boostMaxSpeed);
  vehicle.velocity.y = clamp(vehicle.velocity.y + impact.impulseY * impulseScale, -85, 62);
  vehicle.velocity.z = clamp(vehicle.velocity.z + impact.impulseZ * impulseScale, -config.boostMaxSpeed, config.boostMaxSpeed);
  if (impact.status) {
    state.status[impact.status] = Math.max(state.status[impact.status], impact.statusDuration * (shielded ? 0.3 : 1));
  }
  if (impact.sourceId && impact.sourceId !== racerId) {
    state.wreck.recentAggressorId = impact.sourceId;
    state.wreck.recentAggressorTime = 1.5;
  }
  if (impact.weapon) {
    events.push({
      type: 'weapon-hit', attackerId: impact.sourceId ?? 'world', targetId: racerId,
      weapon: impact.weapon, damage: appliedDamage, shielded,
    });
  }
  return { appliedDamage, shielded, events };
}

export function beginGalacticWreck(
  racerId: string,
  state: GalacticRacerState,
  vehicle: PodracerState,
  world: GalacticWorldState,
  cause: GalacticImpact['cause'],
  sourceId: string | null,
  isPlayer: boolean,
  force = false,
): GalacticEvent[] {
  if (state.wreck.phase === 'wrecked' || state.wreck.invulnerable > 0) return [];
  if (!force && vehicle.damage < WRECK_DAMAGE_THRESHOLD) return [];
  const credited = sourceId && sourceId !== racerId
    ? sourceId
    : state.wreck.recentAggressorTime > 0
      ? state.wreck.recentAggressorId
      : null;
  state.wreck.phase = 'wrecked';
  state.wreck.timer = WRECK_DURATION;
  state.wreck.crashCount += 1;
  state.wreck.cause = cause;
  state.wreck.sourceId = sourceId;
  state.wreck.takedownBy = credited;
  state.shield.active = false;
  state.redline.active = false;
  state.redline.lockout = Math.max(state.redline.lockout, 2.8);
  vehicle.boost.active = false;
  vehicle.boost.driftBoostTime = 0;
  vehicle.drift.active = false;
  vehicle.velocity.x *= 0.42;
  vehicle.velocity.z *= 0.42;
  vehicle.velocity.y = Math.max(vehicle.velocity.y, 8.5);
  vehicle.angularVelocity.yaw = clamp(vehicle.angularVelocity.yaw + 1.7, -2.5, 2.5);
  vehicle.angularVelocity.roll = clamp(vehicle.angularVelocity.roll - 1.5, -3.5, 3.5);
  if (isPlayer) world.runTokens = Math.max(0, world.runTokens - 1);
  const events: GalacticEvent[] = [{
    type: 'wreck', racerId, cause, sourceId, takedownBy: credited,
    runTokens: world.runTokens,
  }, {
    type: 'recovery-start', racerId, duration: WRECK_DURATION,
  }];
  if (credited) events.push({ type: 'takedown', attackerId: credited, victimId: racerId, cause });
  return events;
}

export function completeGalacticRecovery(
  state: GalacticRacerState,
  vehicle: PodracerState,
): void {
  state.wreck.phase = 'recovering';
  state.wreck.timer = 0;
  state.wreck.invulnerable = RECOVERY_INVULNERABILITY;
  state.status.rockfallStun = 0;
  state.status.ionized = 0;
  state.status.sandGeyser = 0;
  state.redline.heat = Math.min(state.redline.heat, 0.3);
  vehicle.damage = Math.min(vehicle.damage, 0.42);
  vehicle.heat = Math.min(vehicle.heat, 0.38);
}

export function noteGalacticRacerAggression(
  victim: GalacticRacerState,
  sourceId: string | null,
): void {
  if (!sourceId) return;
  victim.wreck.recentAggressorId = sourceId;
  victim.wreck.recentAggressorTime = 1.5;
}

export function collectGalacticUpgrade(
  racerId: string,
  state: GalacticRacerState,
  pickupId: string,
  part: GalacticUpgradePart,
): GalacticEvent | null {
  // Instant combat pickups require the authoritative vehicle/world boundary.
  if (part === 'emp-cell' || part === 'repair-salvage') return null;
  if (state.upgrades.collectedPickupIds.includes(pickupId)) return null;
  state.upgrades.collectedPickupIds.push(pickupId);
  let level = 1;
  switch (part) {
    case 'afterburner-coils':
      state.upgrades.afterburner = Math.min(3, state.upgrades.afterburner + 1);
      level = state.upgrades.afterburner;
      break;
    case 'vector-vanes':
      state.upgrades.cornering = Math.min(3, state.upgrades.cornering + 1);
      level = state.upgrades.cornering;
      break;
    case 'reinforced-frame':
      state.upgrades.resilience = Math.min(3, state.upgrades.resilience + 1);
      level = state.upgrades.resilience;
      break;
    default:
      if (!state.upgrades.parts.includes(part)) state.upgrades.parts.push(part);
      if (part === 'mine-printer') state.mine.charges = Math.min(5, state.mine.charges + 2);
      break;
  }
  return { type: 'upgrade-collected', racerId, pickupId, part, level };
}
