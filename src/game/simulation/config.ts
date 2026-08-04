import type { TerrainProbeId } from './types';

export const PODRACER_FIXED_HZ = 120;
export const PODRACER_FIXED_DELTA = 1 / PODRACER_FIXED_HZ;

export interface TerrainProbeDefinition {
  id: TerrainProbeId;
  localX: number;
  localZ: number;
}

export interface PodracerConfig {
  fixedDelta: number;
  mass: number;
  gravity: number;
  hoverHeight: number;
  repulsorRange: number;
  hardDeckClearance: number;
  repulsorSpring: number;
  repulsorDamping: number;
  maxProbeLift: number;
  groundSupportThreshold: number;
  airborneClearance: number;
  landingMinSpeed: number;
  landingDamageSpeed: number;
  landingDamageScale: number;
  landingBounce: number;
  engineAcceleration: number;
  boostAcceleration: number;
  brakeAcceleration: number;
  maxSpeed: number;
  boostMaxSpeed: number;
  linearDrag: number;
  quadraticDrag: number;
  lateralGrip: number;
  driftLateralGrip: number;
  driftSlip: number;
  driftMinimumSpeed: number;
  driftChargeRate: number;
  driftMinimumBoostCharge: number;
  driftBoostMinTime: number;
  driftBoostMaxTime: number;
  boostDrain: number;
  boostRegeneration: number;
  boostMinimumEnergy: number;
  boostHeatRate: number;
  driftHeatRate: number;
  passiveHeatCooling: number;
  overheatStart: number;
  overheatEnd: number;
  overheatDamageRate: number;
  damageAccelerationPenalty: number;
  damageSteeringPenalty: number;
  steeringRateLowSpeed: number;
  steeringRateHighSpeed: number;
  steeringResponse: number;
  driftSteeringMultiplier: number;
  pitchSpring: number;
  pitchDamping: number;
  rollSpring: number;
  rollDamping: number;
  bankSpring: number;
  bankDamping: number;
  maxPitch: number;
  maxRoll: number;
  maxBank: number;
  engineTorqueScale: number;
  probes: readonly TerrainProbeDefinition[];
}

/**
 * Arcade tune: deliberately energetic and underdamped enough to communicate
 * mass, while bounded so a bad collision can never destabilize the sim.
 */
export const DEFAULT_PODRACER_CONFIG: Readonly<PodracerConfig> = Object.freeze({
  fixedDelta: PODRACER_FIXED_DELTA,
  mass: 780,
  gravity: 24,
  hoverHeight: 2.45,
  repulsorRange: 5.8,
  hardDeckClearance: 0.58,
  repulsorSpring: 34,
  repulsorDamping: 9.5,
  maxProbeLift: 112,
  groundSupportThreshold: 0.42,
  airborneClearance: 1.15,
  landingMinSpeed: 3.2,
  // Ordinary dune compressions still kick the camera/pilot/spray systems but
  // only genuinely hard vertical slams accumulate hull damage. The previous
  // tune maxed the entire field during lap one from routine terrain cadence.
  landingDamageSpeed: 14,
  landingDamageScale: 0.0028,
  landingBounce: 0.08,
  engineAcceleration: 42,
  boostAcceleration: 72,
  brakeAcceleration: 64,
  maxSpeed: 158,
  boostMaxSpeed: 212,
  linearDrag: 0.026,
  quadraticDrag: 0.0015,
  lateralGrip: 8.2,
  driftLateralGrip: 1.55,
  driftSlip: 0.17,
  driftMinimumSpeed: 24,
  driftChargeRate: 0.52,
  driftMinimumBoostCharge: 0.16,
  driftBoostMinTime: 0.34,
  driftBoostMaxTime: 1.35,
  boostDrain: 0.25,
  boostRegeneration: 0.055,
  boostMinimumEnergy: 0.08,
  boostHeatRate: 0.31,
  driftHeatRate: 0.055,
  passiveHeatCooling: 0.105,
  overheatStart: 1,
  overheatEnd: 0.56,
  overheatDamageRate: 0.035,
  damageAccelerationPenalty: 0.44,
  damageSteeringPenalty: 0.25,
  steeringRateLowSpeed: 1.5,
  steeringRateHighSpeed: 0.55,
  steeringResponse: 7.5,
  driftSteeringMultiplier: 1.58,
  pitchSpring: 25,
  pitchDamping: 8.5,
  rollSpring: 31,
  rollDamping: 9.5,
  bankSpring: 34,
  bankDamping: 10.5,
  maxPitch: 0.48,
  maxRoll: 0.52,
  maxBank: 0.5,
  engineTorqueScale: 0.085,
  probes: Object.freeze([
    Object.freeze({ id: 'cockpit-front', localX: 0, localZ: 1.9 }),
    Object.freeze({ id: 'cockpit-rear', localX: 0, localZ: -1.8 }),
    Object.freeze({ id: 'engine-left-front', localX: -4.1, localZ: 5.3 }),
    Object.freeze({ id: 'engine-left-rear', localX: -4.1, localZ: 2.2 }),
    Object.freeze({ id: 'engine-right-front', localX: 4.1, localZ: 5.3 }),
    Object.freeze({ id: 'engine-right-rear', localX: 4.1, localZ: 2.2 }),
  ]),
});
