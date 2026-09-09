import type { PlayerInputState } from '../input/actions';
import type { PodracerConfig } from '../simulation/config';
import type { Vec3State } from '../simulation/types';

export type GalacticVehicleClass =
  | 'podracer'
  | 'landspeeder'
  | 'speeder-bike'
  | 'skim-speeder';

/** The workshop has a fixed five-bay layout so saves and UI remain compatible. */
export type WorkshopSlot = 'engine' | 'cooling' | 'armour' | 'steering' | 'gadget';

export type WorkshopPartId =
  | 'balanced-ion-drive'
  | 'nova-burst-turbines'
  | 'krayt-torque-core'
  | 'siege-pulse-reactor'
  | 'desert-fin-array'
  | 'cryoflux-radiator'
  | 'venturi-sand-scoop'
  | 'sealed-heat-sink'
  | 'durasteel-ribcage'
  | 'ceramic-skirmish-shell'
  | 'reactive-plating'
  | 'stripped-racing-frame'
  | 'vector-vane-rack'
  | 'gyro-lock-yoke'
  | 'countersteer-fins'
  | 'long-course-stabilizers'
  | 'pulse-shield-relay'
  | 'heat-lance-amplifier'
  | 'scrap-mine-printer'
  | 'repulsor-recuperator';

/** Decimal modifiers: 0.08 is an eight-percent improvement and -0.08 is a penalty. */
export type WorkshopStat =
  | 'topSpeed'
  | 'acceleration'
  | 'boost'
  | 'cooling'
  | 'armour'
  | 'handling'
  | 'drift'
  | 'weaponPower'
  | 'shield'
  | 'mineCapacity';

export interface WorkshopStatModifier {
  stat: WorkshopStat;
  amount: number;
}

export interface WorkshopPartDefinition {
  id: WorkshopPartId;
  slot: WorkshopSlot;
  name: string;
  description: string;
  modifiers: readonly WorkshopStatModifier[];
  /** Stable tuning vocabulary used to explain a part without driving save semantics. */
  tags: readonly string[];
}

/** Versioned, JSON-safe data intended to be stored outside the race simulation. */
export interface WorkshopLoadout {
  version: 1;
  vehicleClass: GalacticVehicleClass;
  slots: Readonly<Record<WorkshopSlot, WorkshopPartId>>;
}

export type WorkshopValidationIssueCode =
  | 'invalid-root'
  | 'invalid-version'
  | 'invalid-vehicle-class'
  | 'invalid-slots'
  | 'missing-part'
  | 'unknown-part'
  | 'wrong-slot'
  | 'unexpected-slot';

export interface WorkshopValidationIssue {
  code: WorkshopValidationIssueCode;
  path: string;
  /** A display-safe description rather than the potentially non-serializable input value. */
  received: string | null;
  replacement: string;
}

export interface WorkshopValidationResult {
  valid: boolean;
  loadout: WorkshopLoadout;
  issues: readonly WorkshopValidationIssue[];
}

export interface WorkshopEffectSummary {
  stat: WorkshopStat;
  amount: number;
  /** Part or synergy display names, in deterministic application order. */
  sources: readonly string[];
}

export interface WorkshopSynergySummary {
  id: string;
  name: string;
  description: string;
  modifiers: readonly WorkshopStatModifier[];
}

/** A deterministic presentation/gameplay projection of one sanitized loadout. */
export interface WorkshopSummary {
  version: 1;
  vehicleClass: GalacticVehicleClass;
  loadout: WorkshopLoadout;
  bonuses: readonly WorkshopEffectSummary[];
  penalties: readonly WorkshopEffectSummary[];
  synergies: readonly WorkshopSynergySummary[];
  /** Net decimal modifier per stat, after parts and named synergies. */
  totals: Readonly<Record<WorkshopStat, number>>;
}

export type GalacticUpgradePart =
  | 'afterburner-coils'
  | 'vector-vanes'
  | 'reinforced-frame'
  | 'pulse-capacitor'
  | 'landing-recuperator'
  | 'mine-printer'
  | 'emp-cell'
  | 'repair-salvage';

export type GalacticHazardKind =
  | 'sand-geyser'
  | 'heat-vent'
  | 'rockfall'
  | 'dust-interference';

export type GalacticWreckCause =
  | 'impact'
  | 'heat-lance'
  | 'scrap-mine'
  | 'redline-explosion'
  | 'rockfall'
  | 'hazard';

export interface GalacticVehicleDefinition {
  id: GalacticVehicleClass;
  label: string;
  /** Short card-facing identity; this is presentation data, not a physics flag. */
  role: string;
  /** One-sentence selection guidance kept deliberately concise for the grid. */
  description: string;
  /** Authored 1–5 ratings that summarize the real tune below for quick comparison. */
  stats: Readonly<{
    speed: number;
    acceleration: number;
    drift: number;
    defence: number;
    weapons: number;
  }>;
  advantages: readonly string[];
  tradeoff: string;
  collisionRadius: number;
  incomingDamageScale: number;
  shieldDuration: number;
  shieldCooldown: number;
  weaponCooldown: number;
  weaponDamage: number;
  redlineHeatRate: number;
  redlineCoolingRate: number;
  redlineAcceleration: number;
  /** Applied to a supplied/base tune once when the derived config is requested. */
  configScale: Readonly<Partial<Record<keyof PodracerConfig, number>>>;
  probeScaleX: number;
  probeScaleZ: number;
}

export interface GalacticShieldState {
  active: boolean;
  remaining: number;
  cooldown: number;
  absorbedDamage: number;
}

export interface GalacticWeaponState {
  cooldown: number;
  triggerHeld: boolean;
  shotsFired: number;
  hits: number;
}

export interface GalacticMineRackState {
  cooldown: number;
  charges: number;
  deployed: number;
}

export interface GalacticRedlineState {
  active: boolean;
  heat: number;
  lockout: number;
  peakHeat: number;
}

export type GalacticWreckPhase = 'running' | 'wrecked' | 'recovering';

export interface GalacticWreckState {
  phase: GalacticWreckPhase;
  timer: number;
  invulnerable: number;
  crashCount: number;
  cause: GalacticWreckCause | null;
  sourceId: string | null;
  takedownBy: string | null;
  /** Recent racer aggression can be credited when a later wall/hazard hit wrecks the victim. */
  recentAggressorId: string | null;
  recentAggressorTime: number;
}

export interface GalacticStatusState {
  sandGeyser: number;
  heatVent: number;
  rockfallStun: number;
  dustInterference: number;
  ionized: number;
}

export interface GalacticUpgradeState {
  afterburner: number;
  cornering: number;
  resilience: number;
  parts: GalacticUpgradePart[];
  collectedPickupIds: string[];
}

export interface GalacticControlMemoryState {
  fireHeld: boolean;
  shieldHeld: boolean;
  cycleVehicleHeld: boolean;
}

/** Additive per-entry gameplay state. It contains JSON data only. */
export interface GalacticRacerState {
  version: 1;
  vehicleClass: GalacticVehicleClass;
  shield: GalacticShieldState;
  weapon: GalacticWeaponState;
  mine: GalacticMineRackState;
  redline: GalacticRedlineState;
  wreck: GalacticWreckState;
  status: GalacticStatusState;
  upgrades: GalacticUpgradeState;
  takedowns: number;
  controls: GalacticControlMemoryState;
}

export interface HeatLanceProjectileState {
  id: string;
  ownerId: string;
  position: Vec3State;
  previousPosition: Vec3State;
  velocity: Vec3State;
  remaining: number;
  radius: number;
  damage: number;
  heat: number;
}

export interface ScrapMineState {
  id: string;
  ownerId: string;
  position: Vec3State;
  remaining: number;
  armTime: number;
  triggerRadius: number;
  damage: number;
}

export interface GalacticHazardState {
  id: string;
  kind: GalacticHazardKind;
  progress: number;
  lateralOffset: number;
  progressRadius: number;
  lateralRadius: number;
  cooldowns: Record<string, number>;
}

export interface GalacticUpgradePickupState {
  id: string;
  progress: number;
  lateralOffset: number;
  progressRadius: number;
  lateralRadius: number;
  part: GalacticUpgradePart;
  collectedBy: string | null;
  /** Combat pickups only: simulation seconds until another eligible racer can claim. */
  respawnRemaining?: number;
}

/** Serializable world entities and run-local resources owned by RaceSimulation. */
export interface GalacticWorldState {
  version: 1;
  step: number;
  rngState: number;
  projectileSequence: number;
  mineSequence: number;
  projectiles: HeatLanceProjectileState[];
  mines: ScrapMineState[];
  hazards: GalacticHazardState[];
  pickups: GalacticUpgradePickupState[];
  runTokens: number;
  runCurrency: number;
}

export interface GalacticRacerSnapshot {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  damage: number;
  heat: number;
  courseProgress: number;
  lateralOffset: number;
  finished: boolean;
  galactic: GalacticRacerState;
}

export interface GalacticActionContext {
  step: number;
  delta: number;
  racing: boolean;
  input: PlayerInputState;
  /** Internal fast path for inputs already normalized at the simulation boundary. */
  normalizedInput?: boolean;
  self: GalacticRacerSnapshot;
  opponents: readonly GalacticRacerSnapshot[];
}

export interface GalacticActionResult {
  input: PlayerInputState;
  deployMine: boolean;
  fireHeatLance: boolean;
  activateShield: boolean;
  recoverNow: boolean;
  redlineExploded: boolean;
  redlineAcceleration: number;
  events: GalacticEvent[];
}

export interface GalacticImpact {
  targetId: string;
  sourceId: string | null;
  cause: GalacticWreckCause;
  weapon: 'heat-lance' | 'scrap-mine' | null;
  damage: number;
  heat: number;
  impulseX: number;
  impulseY: number;
  impulseZ: number;
  status: keyof GalacticStatusState | null;
  statusDuration: number;
  hazardId: string | null;
  hazardKind: GalacticHazardKind | null;
}

export interface GalacticPickupClaim {
  racerId: string;
  pickupId: string;
  part: GalacticUpgradePart;
}

export interface GalacticWorldStepResult {
  impacts: GalacticImpact[];
  pickupClaims: GalacticPickupClaim[];
  events: GalacticEvent[];
}

export interface GalacticImpactResult {
  appliedDamage: number;
  shielded: boolean;
  events: GalacticEvent[];
}

export type GalacticEvent =
  | { type: 'emp-pulse'; racerId: string; pickupId: string; radius: number; targetIds: string[]; blockedIds: string[]; clearedOrdnance: number }
  | { type: 'emp-hit'; attackerId: string; targetId: string; blocked: boolean; duration: number }
  | { type: 'repair-salvage-collected'; racerId: string; pickupId: string; repaired: number; cooled: number; coreCooled: number }
  | { type: 'vehicle-class-changed'; racerId: string; vehicleClass: GalacticVehicleClass }
  | { type: 'pulse-shell'; racerId: string; active: boolean; cooldown: number }
  | { type: 'shield-block'; racerId: string; sourceId: string | null; absorbed: number }
  | { type: 'heat-lance-fired'; racerId: string; projectileId: string }
  | {
      type: 'weapon-hit';
      attackerId: string;
      targetId: string;
      weapon: 'heat-lance' | 'scrap-mine';
      damage: number;
      shielded: boolean;
    }
  | { type: 'scrap-mine-deployed'; racerId: string; mineId: string }
  | { type: 'scrap-mine-triggered'; racerId: string; ownerId: string; mineId: string }
  | { type: 'redline-surge'; racerId: string; active: boolean; heat: number; lockout: number }
  | { type: 'redline-explosion'; racerId: string; heat: number }
  | { type: 'hazard-hit'; racerId: string; hazardId: string; hazard: GalacticHazardKind; intensity: number }
  | {
      type: 'wreck';
      racerId: string;
      cause: GalacticWreckCause;
      sourceId: string | null;
      takedownBy: string | null;
      runTokens: number;
    }
  | { type: 'recovery-start'; racerId: string; duration: number }
  | { type: 'recovered'; racerId: string; invulnerable: number }
  | { type: 'takedown'; attackerId: string; victimId: string; cause: GalacticWreckCause }
  | {
      type: 'upgrade-collected';
      racerId: string;
      pickupId: string;
      part: GalacticUpgradePart;
      level: number;
    };
