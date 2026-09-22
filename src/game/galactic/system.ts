import { normalizePlayerInput, type PlayerInputState } from '../input/actions';
import type { PodracerConfig } from '../simulation/config';
import type { PodracerState } from '../simulation/types';
import { GALACTIC_VEHICLES } from './catalog';
import { COMBAT_PICKUP_RESPAWN_SECONDS, isCombatPickup } from './combatPickups';
import type { GalacticAICombatStyle, GalacticOrdnanceKind } from './types';
import type {
  GalacticActionContext,
  GalacticActionResult,
  GalacticAITactics,
  GalacticEvent,
  GalacticHazardState,
  GalacticImpact,
  GalacticImpactResult,
  GalacticRacerSnapshot,
  GalacticRacerState,
  GalacticUpgradePart,
  GalacticUpgradePickupState,
  GalacticVehicleClass,
  GalacticWorldOccluder,
  GalacticWorldState,
  GalacticWorldStepResult,
  HeatLanceProjectileState,
  ScrapMineState,
} from './types';

const DEFAULT_WORLD_SEED = 0x47414c43; // GALC
const WRECK_DAMAGE_THRESHOLD = 0.86;
const WRECK_DURATION = 2.15;
/**
 * The Heat Lance carries unlimited ammunition but only five rounds in the
 * magazine. Emptying it starts a five-second reload; nothing else refills it.
 */
export const LANCE_MAGAZINE = 5;
export const LANCE_RELOAD_SECONDS = 5;
/** Overcharge: hold the trigger after a shot with three rounds loaded; release fires one wide, shield-piercing bolt. */
export const OVERCHARGE_CELLS = 3;
export const OVERCHARGE_CHARGE_SECONDS = 0.8;
export const OVERCHARGE_SPEED = 105;
export const OVERCHARGE_LIFETIME = 2.2;
export const OVERCHARGE_RADIUS = 3.2;
export const OVERCHARGE_DAMAGE_SCALE = 2.4;
export const ORDNANCE_CAPACITY: Readonly<Record<GalacticOrdnanceKind, { perPickup: number; cap: number }>> = Object.freeze({
  'tow-cable': { perPickup: 1, cap: 2 },
});
/** Tow cable: latch onto the pod ahead, get pulled for up to three seconds, release for a slingshot. A raised shield cuts the line. */
export const TOW_RANGE = 70;
export const TOW_DURATION = 3;
export const TOW_PULL = 42;
export const TOW_GAP = 14;
export const TOW_COOLDOWN = 4;
export const TOW_RELEASE_KICK = 16;
/** Pickups that are consumables rather than one-time upgrades: any racer may take a respawned one again. */
export const FARMABLE_COMBAT_PARTS: ReadonlySet<GalacticUpgradePart> = new Set<GalacticUpgradePart>(['tow-cable', 'nitro-cell']);
/** Lance speed relative to the shooter: slow enough that leading a target is a skill. */
export const LANCE_SPEED = 150;
export const LANCE_LIFETIME = 1.6;
/** How long a racer that wrecked you stays marked. */
export const RIVALRY_DURATION = 45;
const RECOVERY_INVULNERABILITY = 1.55;
/** Each consecutive wreck buys a longer protected return, bounded at three steps. */
const RECOVERY_INVULNERABILITY_STEP = 0.45;
const RECOVERY_INVULNERABILITY_MAX_STEPS = 3;

/** A returning racer is protected longer after repeated wrecks. */
export function recoveryInvulnerability(crashCount: number): number {
  const repeats = clamp(Math.floor(Number.isFinite(crashCount) ? crashCount : 1) - 1, 0, RECOVERY_INVULNERABILITY_MAX_STEPS);
  return RECOVERY_INVULNERABILITY + repeats * RECOVERY_INVULNERABILITY_STEP;
}

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
    ...(isCombatPickup(part) ? { respawnRemaining: 0 } : {}),
  };
}

export function createGalacticRacerState(
  vehicleClass: GalacticVehicleClass = 'podracer',
): GalacticRacerState {
  return {
    version: 1,
    vehicleClass,
    shield: { active: false, remaining: 0, cooldown: 0, absorbedDamage: 0 },
    weapon: { cooldown: 0, triggerHeld: false, shotsFired: 0, hits: 0, charges: LANCE_MAGAZINE, reload: 0, overcharge: 0 },
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
    controls: { fireHeld: false, shieldHeld: false, cycleVehicleHeld: false, mineHeld: false },
    ordnance: { kind: null, charges: 0, cooldown: 0 },
    tow: { targetId: null, remaining: 0, cooldown: 0 },
    rivalry: { rivalId: null, remaining: 0 },
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
      // Forward ordnance and the nitro cell; RaceSimulation aligns them to the generated sections.
      makePickup('cable-sweeper', 0.3, -8, 'tow-cable'),
      makePickup('cable-recovery', 0.66, 8, 'tow-cable'),
      makePickup('nitro-hairpin', 0.8, 0, 'nitro-cell'),
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
  // An empty magazine reloads on its own; ammunition itself is unlimited.
  if ((state.weapon.reload ?? 0) > 0) {
    state.weapon.reload = Math.max(0, state.weapon.reload - delta);
    if (state.weapon.reload === 0) {
      state.weapon.charges = LANCE_MAGAZINE;
      events.push({ type: 'lance-reloaded', racerId, charges: state.weapon.charges });
    }
  }
  state.mine.cooldown = Math.max(0, state.mine.cooldown - delta);
  if (state.ordnance) state.ordnance.cooldown = Math.max(0, state.ordnance.cooldown - delta);
  if (state.tow) state.tow.cooldown = Math.max(0, state.tow.cooldown - delta);
  state.redline.lockout = Math.max(0, state.redline.lockout - delta);
  state.wreck.invulnerable = Math.max(0, state.wreck.invulnerable - delta);
  state.wreck.recentAggressorTime = Math.max(0, state.wreck.recentAggressorTime - delta);
  if (state.wreck.recentAggressorTime <= 0) state.wreck.recentAggressorId = null;
  state.rivalry.remaining = Math.max(0, state.rivalry.remaining - delta);
  if (state.rivalry.remaining <= 0) state.rivalry.rivalId = null;
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
      const invulnerable = recoveryInvulnerability(state.wreck.crashCount);
      state.wreck.phase = 'recovering';
      state.wreck.invulnerable = invulnerable;
      recoverNow = true;
      events.push({ type: 'recovered', racerId: context.self.id, invulnerable });
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

  const armed = context.racing && state.wreck.phase !== 'wrecked';
  const ordnance = state.ordnance ??= { kind: null, charges: 0, cooldown: 0 };
  const tow = state.tow ??= { targetId: null, remaining: 0, cooldown: 0 };
  if (ordnance.kind && ordnance.charges <= 0) ordnance.kind = null;
  const minePressed = input.mine && !(state.controls.mineHeld ?? false);
  let fireOrdnance: GalacticOrdnanceKind | null = null;
  let releaseTow = false;
  if (armed && minePressed && tow.targetId) {
    releaseTow = true;
  } else if (armed && minePressed && ordnance.kind && ordnance.charges > 0 && ordnance.cooldown <= 0
    && tow.cooldown <= 0) {
    fireOrdnance = ordnance.kind;
  }
  // Mines keep their hold-to-repeat cadence, but only while no forward ordnance is loaded.
  const wantsMine = input.mine
    && !ordnance.kind
    && !tow.targetId
    && state.mine.cooldown <= 0
    && state.mine.charges > 0;
  const deployMine = armed && wantsMine;
  // The lance fires on the press. Keeping the trigger held after the cooldown
  // charges an overcharge when three cells are racked; releasing fires it.
  const firePressed = input.fire && !state.controls.fireHeld;
  const fireHeatLance = armed
    && firePressed
    && state.weapon.cooldown <= 0
    && (state.weapon.reload ?? 0) <= 0
    && state.weapon.charges > 0;
  const overchargeBefore = state.weapon.overcharge ?? 0;
  let overcharge = overchargeBefore;
  let fireOvercharge = false;
  if (armed && input.fire && state.controls.fireHeld && !fireHeatLance
    && state.weapon.cooldown <= 0 && (state.weapon.reload ?? 0) <= 0
    && state.weapon.charges >= OVERCHARGE_CELLS) {
    overcharge = Math.min(1, overcharge + context.delta / OVERCHARGE_CHARGE_SECONDS);
  } else if (!input.fire) {
    if (armed && state.controls.fireHeld && overcharge >= 1 && state.weapon.charges >= OVERCHARGE_CELLS) fireOvercharge = true;
    overcharge = 0;
  }
  state.weapon.overcharge = overcharge;
  if ((overchargeBefore > 0) !== (overcharge > 0)) {
    events.push({ type: 'overcharge-charging', racerId: context.self.id, active: overcharge > 0 });
  }
  if (deployMine) {
    state.mine.cooldown = 2.4;
    state.mine.charges -= 1;
    state.mine.deployed += 1;
  }
  if (fireHeatLance) {
    state.weapon.cooldown = definition.weaponCooldown;
    state.weapon.shotsFired += 1;
    state.weapon.charges -= 1;
  }
  if (fireOvercharge) {
    state.weapon.cooldown = definition.weaponCooldown * 1.6;
    state.weapon.shotsFired += 1;
    state.weapon.charges -= OVERCHARGE_CELLS;
  }
  if ((fireHeatLance || fireOvercharge) && state.weapon.charges <= 0) {
    state.weapon.charges = 0;
    state.weapon.reload = LANCE_RELOAD_SECONDS;
    events.push({ type: 'lance-reload', racerId: context.self.id, seconds: LANCE_RELOAD_SECONDS });
  }

  state.controls.fireHeld = input.fire;
  state.controls.mineHeld = input.mine;
  state.controls.shieldHeld = input.shield;
  state.controls.cycleVehicleHeld = input.cycleVehicle;
  state.weapon.triggerHeld = input.fire;
  return {
    input,
    deployMine,
    fireHeatLance,
    fireOvercharge,
    fireOrdnance,
    releaseTow,
    activateShield,
    recoverNow,
    redlineExploded,
    redlineAcceleration,
    events,
  };
}

/** Heat Lance engagement envelope: a narrow cone that widens with range. */
const LANCE_MIN_RANGE = 6;
const LANCE_MAX_RANGE = 190;
const LANCE_CONE_BASE = 5;
const LANCE_CONE_PER_METRE = 0.08;
/** Deliberate spacing: one half-second firing window every two seconds. */
const LANCE_WINDOW_PERIOD = 240;
const LANCE_WINDOW_OPEN = 60;
/** One half-second mine window every six seconds, only with a real pursuer. */
const MINE_WINDOW_PERIOD = 720;
const MINE_WINDOW_OPEN = 60;
/** Metres per second before a rival is considered to be racing rather than launching. */
const ATTACK_MINIMUM_SPEED = 25;

export interface GalacticAIThreatAssessment {
  targetId: string | null;
  /** Nearest shielded rival in the cone: worthless to a lance, exactly what an overcharge is for. */
  shieldedTargetId: string | null;
  pursuerId: string | null;
  inboundProjectileId: string | null;
  mineAheadId: string | null;
  aimedAtBy: string | null;
}

/**
 * Pure perception for a rival: what it can shoot, who is chasing it and what
 * is about to hit it. Exported so tests and telemetry can inspect the reasons
 * behind an attack or a shield without replaying the whole simulation.
 */
export function assessGalacticThreats(
  self: Readonly<GalacticRacerSnapshot>,
  opponents: readonly GalacticRacerSnapshot[],
  tactics?: GalacticAITactics,
): GalacticAIThreatAssessment {
  const forwardX = Math.sin(self.yaw);
  const forwardZ = Math.cos(self.yaw);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  const selfSpeed = Math.hypot(self.velocityX, self.velocityZ);
  // Preferred quarry: the racer that wrecked us, then (for a hunter) the human.
  const grudge = self.galactic.rivalry.remaining > 0 ? self.galactic.rivalry.rivalId : null;
  const hunted = tactics?.style === 'aggressive' ? tactics.playerId ?? null : null;
  const priority = (id: string): number => (id === grudge ? 0 : id === hunted ? 1 : 2);
  let targetId: string | null = null;
  let targetDistance = Number.POSITIVE_INFINITY;
  let targetPriority = 3;
  let pursuerId: string | null = null;
  let pursuerDistance = Number.POSITIVE_INFINITY;
  let aimedAtBy: string | null = null;
  let shieldedTargetId: string | null = null;
  let shieldedDistance = Number.POSITIVE_INFINITY;

  for (const opponent of opponents) {
    if (opponent.finished || opponent.galactic.wreck.phase === 'wrecked') continue;
    const dx = opponent.x - self.x;
    const dz = opponent.z - self.z;
    const forward = dx * forwardX + dz * forwardZ;
    const lateral = dx * rightX + dz * rightZ;
    const distance = Math.hypot(dx, dz);

    // A returning or shielded racer is not a worthwhile shot; wasting the
    // lance on it is what made rivals look mindless and made recoveries cruel.
    const shootable = opponent.galactic.wreck.invulnerable <= 0 && !opponent.galactic.shield.active;
    const inCone = forward > LANCE_MIN_RANGE && forward < LANCE_MAX_RANGE
      && Math.abs(lateral) < LANCE_CONE_BASE + forward * LANCE_CONE_PER_METRE
      && Math.abs(opponent.y - self.y) < 7;
    const rank = priority(opponent.id);
    const better = rank < targetPriority || (rank === targetPriority && distance < targetDistance);
    if (shootable && inCone && better
      && (!tactics?.hasLineOfFire || tactics.hasLineOfFire(opponent))) {
      targetId = opponent.id;
      targetDistance = distance;
      targetPriority = rank;
    }
    if (inCone && opponent.galactic.wreck.invulnerable <= 0 && opponent.galactic.shield.active && distance < shieldedDistance
      && (!tactics?.hasLineOfFire || tactics.hasLineOfFire(opponent))) {
      shieldedTargetId = opponent.id;
      shieldedDistance = distance;
    }

    const opponentForwardSpeed = opponent.velocityX * forwardX + opponent.velocityZ * forwardZ;
    const behind = forward < -LANCE_MIN_RANGE && forward > -48 && Math.abs(lateral) < 9;
    if (behind && opponentForwardSpeed >= selfSpeed * 0.9 - 2 && distance < pursuerDistance) {
      pursuerId = opponent.id;
      pursuerDistance = distance;
    }

    if (forward < 0 && forward > -70 && Math.abs(lateral) < 12 && opponent.galactic.weapon.cooldown <= 0) {
      const toSelfX = -dx / Math.max(1e-6, distance);
      const toSelfZ = -dz / Math.max(1e-6, distance);
      const aim = Math.sin(opponent.yaw) * toSelfX + Math.cos(opponent.yaw) * toSelfZ;
      if (aim > 0.985) aimedAtBy = opponent.id;
    }
  }

  let inboundProjectileId: string | null = null;
  let inboundTime = Number.POSITIVE_INFINITY;
  for (const projectile of tactics?.projectiles ?? []) {
    if (projectile.ownerId === self.id) continue;
    const relX = self.x - projectile.position.x;
    const relZ = self.z - projectile.position.z;
    const distance = Math.hypot(relX, relZ);
    if (distance > 110 || distance < 1e-6) continue;
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.z);
    if (speed < 1) continue;
    const closing = (relX * projectile.velocity.x + relZ * projectile.velocity.z) / distance;
    if (closing < speed * 0.6) continue;
    const miss = Math.abs(relX * projectile.velocity.z - relZ * projectile.velocity.x) / speed;
    const time = distance / speed;
    if (miss < 9 && time < 0.55 && time < inboundTime) {
      inboundProjectileId = projectile.id;
      inboundTime = time;
    }
  }

  let mineAheadId: string | null = null;
  let mineDistance = Number.POSITIVE_INFINITY;
  for (const mine of tactics?.mines ?? []) {
    if (mine.ownerId === self.id) continue;
    const dx = mine.position.x - self.x;
    const dz = mine.position.z - self.z;
    const forward = dx * forwardX + dz * forwardZ;
    const lateral = dx * rightX + dz * rightZ;
    if (forward > 0 && forward < 42 && Math.abs(lateral) < 9 && selfSpeed > 20 && forward < mineDistance) {
      mineAheadId = mine.id;
      mineDistance = forward;
    }
  }

  return {
    targetId,
    shieldedTargetId,
    pursuerId, inboundProjectileId, mineAheadId, aimedAtBy };
}

/**
 * Adds deterministic combat intent to an existing spline-driving AI action.
 * Attacks need a real target in the lance cone with a clear line of fire and
 * respect a deliberate cadence; mines need a genuine pursuer; the shield is a
 * reaction to an inbound shot, an unavoidable mine or an aimed rival, never a
 * timer. Everything is a pure function of the supplied snapshots.
 */
export function augmentGalacticAIInput(
  input: Readonly<PlayerInputState>,
  self: Readonly<GalacticRacerSnapshot>,
  opponents: readonly GalacticRacerSnapshot[],
  step: number,
  tactics?: GalacticAITactics,
): PlayerInputState {
  // No style means the neutral rule set; only a declared personality shifts it.
  const style: GalacticAICombatStyle | undefined = tactics?.style;
  const phase = (step + hashString(self.id)) >>> 0;
  // Hunters keep the trigger window open longer; erratic rivals mine more often.
  const fireOpen = style === 'aggressive' ? LANCE_WINDOW_OPEN * 1.5 : LANCE_WINDOW_OPEN;
  const minePeriod = style === 'erratic' ? MINE_WINDOW_PERIOD / 2 : MINE_WINDOW_PERIOD;
  const fireWindow = phase % LANCE_WINDOW_PERIOD < fireOpen;
  const mineWindow = phase % minePeriod < MINE_WINDOW_OPEN;
  const own = self.galactic;
  // Attacks are a racing decision: nobody opens fire from the grid or while
  // crawling out of a wreck. Defence stays available at any speed.
  const underway = Math.hypot(self.velocityX, self.velocityZ) >= ATTACK_MINIMUM_SPEED;
  const canFire = underway && fireWindow && own.weapon.cooldown <= 0 && own.weapon.charges > 0
    && (own.weapon.reload ?? 0) <= 0 && own.wreck.phase !== 'wrecked';
  // The world line-of-fire sweep is the expensive perception. Only pay for it
  // on a tick where the lance could actually leave the muzzle.
  const perception = tactics && !canFire && tactics.hasLineOfFire
    ? { ...tactics, hasLineOfFire: undefined }
    : tactics;
  const threats = assessGalacticThreats(self, opponents, perception);
  // The trigger fires on the press, so a rival pulses it to keep the old
  // cadence. Against a raised shield with three cells racked it holds the
  // trigger instead and lets go once the overcharge is full.
  const target = threats.targetId !== null ? opponents.find((opponent) => opponent.id === threats.targetId) ?? null : null;
  // Held through the post-shot cooldown too: the charge only starts once it ends.
  const wantOvercharge = threats.shieldedTargetId !== null && threats.targetId === null && underway
    && own.weapon.charges >= OVERCHARGE_CELLS && (own.weapon.reload ?? 0) <= 0
    && own.wreck.phase !== 'wrecked';
  const charging = (own.weapon.overcharge ?? 0) > 0 && (own.weapon.overcharge ?? 0) < 1;
  const fire = wantOvercharge
    ? (own.weapon.overcharge ?? 0) < 1
    : charging ? false : canFire && target !== null && !own.controls.fireHeld;
  // Loaded ordnance goes forward at the same target, one press per shot; a
  // cable only when nothing is already on the line.
  const ordnance = own.ordnance;
  const ordnanceReady = ordnance?.kind && ordnance.charges > 0 && ordnance.cooldown <= 0 && underway
    && own.wreck.phase !== 'wrecked' && !(own.controls.mineHeld ?? false)
    && (ordnance.kind !== 'tow-cable' || (!own.tow?.targetId && (own.tow?.cooldown ?? 0) <= 0));
  const useOrdnance = Boolean(ordnanceReady) && target !== null;
  // Erratic rivals seed the technical sections whether or not someone is close;
  // everyone else only mines a genuine pursuer.
  const technical = tactics?.sectionTag === 'chicane' || tactics?.sectionTag === 'hairpin';
  const mineReason = threats.pursuerId !== null || (style === 'erratic' && technical);
  const mine = useOrdnance || (!ordnance?.kind && underway && mineWindow && mineReason && own.mine.cooldown <= 0 && own.mine.charges > 0);
  const shieldReady = own.shield.cooldown <= 0 && !own.shield.active;
  // Clean drivers shield as soon as a rival lines them up; others wait until hurt.
  const aimedThreshold = style === 'clean' ? 0 : 0.45;
  const shield = shieldReady && (
    threats.inboundProjectileId !== null
    || threats.mineAheadId !== null
    || (threats.aimedAtBy !== null && self.damage >= aimedThreshold && (style === 'clean' || self.damage > 0))
  );
  return normalizePlayerInput({
    ...input,
    fire,
    mine,
    shield,
    ability: false,
    cycleVehicle: false,
  });
}

export function spawnHeatLance(
  world: GalacticWorldState,
  racer: Readonly<GalacticRacerSnapshot>,
  kind: 'heat-lance' | 'overcharge' = 'heat-lance',
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
  const speed = kind === 'overcharge' ? OVERCHARGE_SPEED : LANCE_SPEED;
  const prefix = kind === 'overcharge' ? 'overcharge' : 'lance';
  const projectile: HeatLanceProjectileState = {
    id: `${prefix}-${racer.id}-${world.projectileSequence}`,
    ownerId: racer.id,
    position,
    previousPosition: { ...position },
    velocity: {
      x: racer.velocityX + forwardX * speed,
      y: racer.velocityY * 0.2,
      z: racer.velocityZ + forwardZ * speed,
    },
    remaining: kind === 'overcharge' ? OVERCHARGE_LIFETIME : LANCE_LIFETIME,
    radius: kind === 'overcharge' ? OVERCHARGE_RADIUS : 1.15,
    damage: kind === 'overcharge' ? definition.weaponDamage * OVERCHARGE_DAMAGE_SCALE : definition.weaponDamage,
    heat: kind === 'overcharge' ? 0.2 : 0.13,
    progressHint: wrapProgress(racer.courseProgress),
    kind,
    piercing: kind === 'overcharge',
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

/**
 * Entry fraction of a planar sweep into a circle, or null when it misses.
 * A sweep that starts inside the circle hits at zero, so a point-blank shot
 * still resolves against the nearest hull rather than the first roster entry.
 */
export function sweepCircleEntry(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  px: number,
  pz: number,
  radius: number,
): number | null {
  const dx = bx - ax;
  const dz = bz - az;
  const fx = ax - px;
  const fz = az - pz;
  const c = fx * fx + fz * fz - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dz * dz;
  if (a <= 1e-12) return null;
  const b = 2 * (fx * dx + fz * dz);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

function hazardImpact(hazard: GalacticHazardState, racer: GalacticRacerSnapshot): GalacticImpact {
  const tangent = ((hashString(hazard.id) & 1) === 0 ? -1 : 1);
  const hit = { hitX: racer.x, hitY: racer.y, hitZ: racer.z };
  switch (hazard.kind) {
    case 'sand-geyser':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0.025, heat: 0, impulseX: tangent * 1.8, impulseY: 16, impulseZ: 0,
        status: 'sandGeyser', statusDuration: 1.2,
        hazardId: hazard.id, hazardKind: hazard.kind, ...hit,
      };
    case 'heat-vent':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0.035, heat: 0.28, impulseX: 0, impulseY: 4, impulseZ: 0,
        status: 'heatVent', statusDuration: 1.8,
        hazardId: hazard.id, hazardKind: hazard.kind, ...hit,
      };
    case 'rockfall':
      return {
        targetId: racer.id, sourceId: null, cause: 'rockfall', weapon: null,
        damage: 0.2, heat: 0, impulseX: tangent * 12, impulseY: 7, impulseZ: -9,
        status: 'rockfallStun', statusDuration: 1.05,
        hazardId: hazard.id, hazardKind: hazard.kind, ...hit,
      };
    case 'dust-interference':
      return {
        targetId: racer.id, sourceId: null, cause: 'hazard', weapon: null,
        damage: 0, heat: 0, impulseX: 0, impulseY: 0, impulseZ: 0,
        status: 'dustInterference', statusDuration: 2.4,
        hazardId: hazard.id, hazardKind: hazard.kind, ...hit,
      };
  }
}

/**
 * Advances bounded projectile, mine, hazard and pickup state for one fixed tick.
 * The optional occluder lets authored scenery and canyon walls stop a lance;
 * the nearest hit along the sweep always wins, whether it is a hull or a wall.
 */
export function stepGalacticWorld(
  world: GalacticWorldState,
  racers: readonly GalacticRacerSnapshot[],
  delta: number,
  occluder?: GalacticWorldOccluder,
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
    let targetEntry = Number.POSITIVE_INFINITY;
    for (const racer of racers) {
      if (racer.id === projectile.ownerId || racer.finished) continue;
      const radius = GALACTIC_VEHICLES[racer.galactic.vehicleClass].collisionRadius + projectile.radius;
      const entry = sweepCircleEntry(
        projectile.previousPosition.x, projectile.previousPosition.z,
        projectile.position.x, projectile.position.z,
        racer.x, racer.z, radius,
      );
      if (entry === null || Math.abs(projectile.position.y - racer.y) >= 7) continue;
      // Ties resolve by stable id so hosts and guests agree on the victim.
      if (entry < targetEntry || (entry === targetEntry && target && racer.id.localeCompare(target.id) < 0)) {
        target = racer;
        targetEntry = entry;
      }
    }
    const worldEntry = occluder
      ? occluder(
          projectile.previousPosition.x, projectile.previousPosition.y, projectile.previousPosition.z,
          projectile.position.x, projectile.position.y, projectile.position.z,
          projectile.progressHint,
        )
      : null;
    if (worldEntry !== null && worldEntry < targetEntry) {
      const blocked = clamp(worldEntry, 0, 1);
      events.push({
        type: 'heat-lance-blocked', ownerId: projectile.ownerId, projectileId: projectile.id,
        x: projectile.previousPosition.x + (projectile.position.x - projectile.previousPosition.x) * blocked,
        y: projectile.previousPosition.y + (projectile.position.y - projectile.previousPosition.y) * blocked,
        z: projectile.previousPosition.z + (projectile.position.z - projectile.previousPosition.z) * blocked,
      });
      world.projectiles.splice(index, 1);
      continue;
    }
    if (target) {
      const speed = Math.max(1, Math.hypot(projectile.velocity.x, projectile.velocity.z));
      const entry = clamp(targetEntry, 0, 1);
      const kind = projectile.kind ?? 'heat-lance';
      const shove = kind === 'overcharge' ? 14 : 8;
      impacts.push({
        targetId: target.id,
        sourceId: projectile.ownerId,
        cause: 'heat-lance',
        weapon: kind === 'overcharge' ? 'overcharge-lance' : 'heat-lance',
        damage: projectile.damage,
        heat: projectile.heat,
        impulseX: projectile.velocity.x / speed * shove,
        impulseY: 1.8,
        impulseZ: projectile.velocity.z / speed * shove,
        status: 'ionized',
        statusDuration: kind === 'overcharge' ? 1 : 0.72,
        piercing: projectile.piercing === true,
        hazardId: null,
        hazardKind: null,
        // The hull point the lance actually reached, not the racer's centre.
        hitX: projectile.previousPosition.x + (projectile.position.x - projectile.previousPosition.x) * entry,
        hitY: projectile.previousPosition.y + (projectile.position.y - projectile.previousPosition.y) * entry,
        hitZ: projectile.previousPosition.z + (projectile.position.z - projectile.previousPosition.z) * entry,
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
    let targetDistance = Number.POSITIVE_INFINITY;
    if (mine.armTime <= 0) {
      for (const racer of racers) {
        if (racer.id === mine.ownerId || racer.finished) continue;
        const distance = Math.hypot(racer.x - mine.position.x, racer.z - mine.position.z);
        if (distance > mine.triggerRadius) continue;
        if (distance < targetDistance || (distance === targetDistance && target && racer.id.localeCompare(target.id) < 0)) {
          target = racer;
          targetDistance = distance;
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
        hitX: mine.position.x, hitY: mine.position.y, hitZ: mine.position.z,
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
    const combat = isCombatPickup(pickup.part);
    if (combat && pickup.collectedBy !== null) {
      const remaining = clamp(pickup.respawnRemaining ?? COMBAT_PICKUP_RESPAWN_SECONDS, 0, COMBAT_PICKUP_RESPAWN_SECONDS) - safeDelta;
      // Absorb only floating-point subtraction residue at the fixed-tick boundary.
      pickup.respawnRemaining = remaining > 1e-9 ? remaining : 0;
      if (pickup.respawnRemaining === 0) pickup.collectedBy = null;
    }
    if (pickup.collectedBy !== null) continue;
    let collector: GalacticRacerSnapshot | undefined;
    for (const racer of racers) {
      if (
        racer.finished
        || (combat && (racer.galactic.wreck.phase === 'wrecked'
          // Lance cells are ammunition: any racer may take a respawned rack again each lap.
          || (!FARMABLE_COMBAT_PARTS.has(pickup.part) && racer.galactic.upgrades.collectedPickupIds.includes(pickup.id))))
        || progressDistance(racer.courseProgress, pickup.progress) > pickup.progressRadius
        || Math.abs(racer.lateralOffset - pickup.lateralOffset) > pickup.lateralRadius
      ) continue;
      if (!collector || racer.id.localeCompare(collector.id) < 0) collector = racer;
    }
    if (!collector) continue;
    pickup.collectedBy = collector.id;
    if (combat) pickup.respawnRemaining = COMBAT_PICKUP_RESPAWN_SECONDS;
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
  // An overcharge bolt goes straight through a raised shield.
  const shielded = state.shield.active && impact.piercing !== true;
  const appliedDamage = baseDamage * (shielded ? 0.16 : 1);
  if (shielded && baseDamage > 0) {
    const absorbed = baseDamage - appliedDamage;
    state.shield.absorbedDamage += absorbed;
    state.shield.remaining = Math.max(0, state.shield.remaining - absorbed * 1.7);
    events.push({ type: 'shield-block', racerId, sourceId: impact.sourceId, absorbed, x: impact.hitX, y: impact.hitY, z: impact.hitZ });
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
      weapon: impact.weapon, damage: appliedDamage, shielded, x: impact.hitX, y: impact.hitY, z: impact.hitZ,
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
  if (state.tow) { state.tow.targetId = null; state.tow.remaining = 0; }
  if (state.weapon.overcharge) state.weapon.overcharge = 0;
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
  if (credited) {
    events.push({ type: 'takedown', attackerId: credited, victimId: racerId, cause });
    // The victim remembers who did it: rivals hunt them back and the HUD calls it out.
    state.rivalry.rivalId = credited;
    state.rivalry.remaining = RIVALRY_DURATION;
    events.push({ type: 'rivalry-marked', racerId, rivalId: credited, duration: RIVALRY_DURATION });
  }
  return events;
}

export function completeGalacticRecovery(
  state: GalacticRacerState,
  vehicle: PodracerState,
): void {
  state.wreck.phase = 'recovering';
  state.wreck.timer = 0;
  state.wreck.invulnerable = recoveryInvulnerability(state.wreck.crashCount);
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
