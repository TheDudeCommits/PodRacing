import type { PodracerConfig } from './simulation/config';
import type { VehicleAppearanceId } from './vehicleAppearance';

/**
 * A pod identity is the handling, weight, heat tolerance and engine voice that
 * belong to one registered appearance. It layers on top of the physics class
 * tune and the workshop build: the class decides the broad chassis, the
 * identity decides how this particular pod feels. Identities are data only and
 * never touch the renderer, so a snapshot can carry them to any client.
 */
export type PodIdentityId = VehicleAppearanceId;
export type PodRole = 'balanced' | 'agile' | 'heavy' | 'fast';
/** Sourced engine loop identities; the audio catalogue owns their files. */
export type EngineVoiceId = 'twin-turbine' | 'split-x' | 'turbofan' | 'diesel';

export interface PodIdentityStats {
  speed: number;
  handling: number;
  weight: number;
  /** Heat tolerance: 5 shrugs off long boosts, 1 overheats quickly. */
  heat: number;
}

export interface PodIdentity {
  id: PodIdentityId;
  label: string;
  role: PodRole;
  roleLabel: string;
  tagline: string;
  /** Where this pod is expected to be competitive; presentation guidance only. */
  bestOn: string;
  /** Authored 1–5 ratings that summarize the real tune below. */
  stats: Readonly<PodIdentityStats>;
  /** Multiplicative scales applied once to the derived class/workshop tune. */
  configScale: Readonly<Partial<Record<keyof PodracerConfig, number>>>;
  /** Weapon, hazard and contact damage taken by this hull. */
  incomingDamageScale: number;
  engineVoice: EngineVoiceId;
}

export const DEFAULT_POD_IDENTITY: PodIdentityId = 'teemto';

const BALANCED_STATS: Readonly<PodIdentityStats> = Object.freeze({ speed: 4, handling: 4, weight: 3, heat: 3 });

export const POD_IDENTITIES: Readonly<Record<PodIdentityId, PodIdentity>> = Object.freeze({
  teemto: Object.freeze({
    id: 'teemto', label: 'Teemto', role: 'balanced', roleLabel: 'Balanced racer',
    tagline: 'Honest, forgiving and quick everywhere. The reference pod for learning a lap.',
    bestOn: 'Any circuit',
    stats: BALANCED_STATS,
    configScale: Object.freeze({}),
    incomingDamageScale: 1,
    engineVoice: 'twin-turbine',
  }),
  sebulba: Object.freeze({
    id: 'sebulba', label: 'Sebulba', role: 'fast', roleLabel: 'Fast, heat-sensitive',
    tagline: 'The highest top speed and the hungriest boost. Cools slowly, so ration the heat.',
    bestOn: 'Long straights and the salt run',
    stats: Object.freeze({ speed: 5, handling: 3, weight: 2, heat: 2 }),
    configScale: Object.freeze({
      mass: 0.95,
      maxSpeed: 1.05, boostMaxSpeed: 1.06,
      engineAcceleration: 1.05, boostAcceleration: 1.12,
      steeringRateHighSpeed: 0.94, lateralGrip: 0.96,
      boostHeatRate: 1.4, driftHeatRate: 1.25, passiveHeatCooling: 0.82,
      overheatDamageRate: 1.25,
    }),
    incomingDamageScale: 1.1,
    engineVoice: 'split-x',
  }),
  polwo: Object.freeze({
    id: 'polwo', label: 'Polwo', role: 'agile', roleLabel: 'Agile specialist',
    tagline: 'Light and eager to turn, with the strongest drift charge. Gives up top speed and takes hard landings badly.',
    bestOn: 'Canyon, chicane and hairpin',
    stats: Object.freeze({ speed: 3, handling: 5, weight: 2, heat: 3 }),
    configScale: Object.freeze({
      mass: 0.85,
      maxSpeed: 0.965, boostMaxSpeed: 0.97, engineAcceleration: 1.03,
      steeringRateLowSpeed: 1.16, steeringRateHighSpeed: 1.22, steeringResponse: 1.18,
      lateralGrip: 1.12, driftLateralGrip: 1.2, driftChargeRate: 1.2, driftBoostMaxTime: 1.1,
      maxBank: 1.15, landingDamageScale: 1.15,
    }),
    incomingDamageScale: 1.05,
    engineVoice: 'turbofan',
  }),
  blockrunner: Object.freeze({
    id: 'blockrunner', label: 'Blockrunner', role: 'heavy', roleLabel: 'Heavy bruiser',
    tagline: 'Slow to turn but hard to move. Shrugs off contact and heat, and brakes with authority.',
    bestOn: 'Armed Battle and heavy traffic',
    stats: Object.freeze({ speed: 3, handling: 2, weight: 5, heat: 5 }),
    configScale: Object.freeze({
      mass: 1.32,
      maxSpeed: 0.975, engineAcceleration: 0.92, brakeAcceleration: 1.1,
      steeringRateLowSpeed: 0.86, steeringRateHighSpeed: 0.9, steeringResponse: 0.9,
      lateralGrip: 0.9, driftSlip: 1.12,
      landingDamageScale: 0.65, damageAccelerationPenalty: 0.75, damageSteeringPenalty: 0.8,
      passiveHeatCooling: 1.25, boostHeatRate: 0.82, overheatDamageRate: 0.8,
    }),
    incomingDamageScale: 0.82,
    engineVoice: 'diesel',
  }),
  verdigris: Object.freeze({id: 'verdigris', label: 'Verdigris', role: 'balanced', roleLabel: 'Endurance racer',
    tagline: 'Wood, brass and long-haul cooling. Predictable grip with a patient launch.', bestOn: 'Ember Rift and long races',
    stats: Object.freeze({"speed": 3, "handling": 4, "weight": 4, "heat": 5}), configScale: Object.freeze({"mass": 1.12, "maxSpeed": 0.98, "engineAcceleration": 0.95, "passiveHeatCooling": 1.32, "boostHeatRate": 0.84}),
    incomingDamageScale: 0.94, engineVoice: 'diesel',
  }),
  skybolt: Object.freeze({id: 'skybolt', label: 'Skybolt', role: 'fast', roleLabel: 'Sprint specialist',
    tagline: 'A narrow twin-engine racer. Quick off the line; demands careful heat management.', bestOn: 'Frostline and open straights',
    stats: Object.freeze({"speed": 5, "handling": 3, "weight": 2, "heat": 2}), configScale: Object.freeze({"mass": 0.88, "maxSpeed": 1.035, "boostMaxSpeed": 1.045, "engineAcceleration": 1.12, "boostHeatRate": 1.24, "passiveHeatCooling": 0.9, "steeringRateHighSpeed": 0.95}),
    incomingDamageScale: 1.12, engineVoice: 'twin-turbine',
  }),
  needle: Object.freeze({id: 'needle', label: 'Needle', role: 'agile', roleLabel: 'Precision racer',
    tagline: 'Exposed turbines and a light chassis. Strong turn-in with less protection.', bestOn: 'Verdant Run and technical routes',
    stats: Object.freeze({"speed": 4, "handling": 5, "weight": 1, "heat": 3}), configScale: Object.freeze({"mass": 0.8, "steeringRateHighSpeed": 1.16, "steeringResponse": 1.2, "lateralGrip": 1.16, "driftChargeRate": 1.12, "landingDamageScale": 1.18}),
    incomingDamageScale: 1.18, engineVoice: 'turbofan',
  }),
  pog: Object.freeze({id: 'pog', label: 'Pog Racer', role: 'heavy', roleLabel: 'Compact brawler',
    tagline: 'One big turbine under an enclosed cockpit. Resists contact and carries a long boost.', bestOn: 'Battle and frozen traffic',
    stats: Object.freeze({"speed": 3, "handling": 3, "weight": 5, "heat": 4}), configScale: Object.freeze({"mass": 1.24, "maxSpeed": 0.97, "engineAcceleration": 0.94, "steeringRateHighSpeed": 0.92, "passiveHeatCooling": 1.15, "boostHeatRate": 0.88, "landingDamageScale": 0.75}),
    incomingDamageScale: 0.86, engineVoice: 'split-x',
  }),
  procedural: Object.freeze({
    id: 'procedural', label: 'Classic', role: 'balanced', roleLabel: 'Balanced racer',
    tagline: 'The original racing frame with the reference tune.',
    bestOn: 'Any circuit',
    stats: BALANCED_STATS,
    configScale: Object.freeze({}),
    incomingDamageScale: 1,
    engineVoice: 'twin-turbine',
  }),
});

export const POD_IDENTITY_STAT_LABELS: Readonly<Record<keyof PodIdentityStats, string>> = Object.freeze({
  speed: 'Speed', handling: 'Handling', weight: 'Weight', heat: 'Heat tolerance',
});

export function isPodIdentityId(value: unknown): value is PodIdentityId {
  return typeof value === 'string' && Object.hasOwn(POD_IDENTITIES, value);
}

/** Unknown or non-string values fall back to the reference pod. */
export function resolvePodIdentity(value: unknown): PodIdentityId {
  return isPodIdentityId(value) ? value : DEFAULT_POD_IDENTITY;
}

/** Builds one immutable tune; fixed cadence and probe geometry are never scaled. */
export function derivePodIdentityConfig(
  identity: PodIdentityId,
  base: Readonly<PodracerConfig>,
): Readonly<PodracerConfig> {
  const definition = POD_IDENTITIES[identity] ?? POD_IDENTITIES[DEFAULT_POD_IDENTITY];
  const entries = Object.entries(definition.configScale);
  if (entries.length === 0) return base;
  const result = { ...base } as PodracerConfig;
  for (const [key, scale] of entries) {
    const typedKey = key as keyof PodracerConfig;
    if (typedKey === 'fixedDelta' || typedKey === 'probes' || typeof scale !== 'number' || !Number.isFinite(scale)) continue;
    const value = base[typedKey];
    if (typeof value === 'number') {
      (result as unknown as Record<string, number>)[typedKey] = value * scale;
    }
  }
  result.fixedDelta = base.fixedDelta;
  result.probes = base.probes;
  return Object.freeze(result);
}

export function podIdentityStatRows(identity: PodIdentityId): { label: string; value: number }[] {
  const stats = (POD_IDENTITIES[identity] ?? POD_IDENTITIES[DEFAULT_POD_IDENTITY]).stats;
  return (Object.keys(POD_IDENTITY_STAT_LABELS) as (keyof PodIdentityStats)[])
    .map((key) => ({ label: POD_IDENTITY_STAT_LABELS[key], value: stats[key] }));
}
