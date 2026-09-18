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
  /** Seconds of reduced steering and grip after the engines overheat; a real cost beyond damage. */
  overheatHandlingTime: number;
  /** Fraction of steering rate lost at the start of the overheat handling window. */
  overheatHandlingPenalty: number;
  /** Extra boost regeneration at full wake strength (1 = double), so drafting charges the meter. */
  draftBoostRegenBonus: number;
  /** Boost energy refunded by a clean landing after a real jump of ~1.2 s or more. */
  landingBoostRefund: number;
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
  /** Brake input scales engine thrust down so a held throttle cannot fight the brake. */
  brakeThrottleCut: number;
  /** Extra steering authority while braking on the ground (trail braking). */
  brakeSteeringBonus: number;
  /** Fraction of brake force that also scrubs lateral slide, straightening the craft. */
  brakeLateralScrub: number;
  /** Share of the drift slip angle that follows the live steering magnitude. */
  driftSteerSlipShare: number;
  /** Seconds over which grip returns after a drift release instead of snapping. */
  driftExitBlendTime: number;
  /** Seconds over which the slide builds when a drift starts; the entry ramp. */
  driftEntryBlendTime: number;
  /** Steering magnitude that keeps an existing drift alive; below it the slide eases out. */
  driftHoldSteer: number;
  /** Fraction of scrubbed lateral speed converted to forward speed during regrip. */
  momentumRetention: number;
  /** Lateral grip while airborne; velocity carries through flight and landings. */
  airLateralGrip: number;
  /** Steering authority while airborne. */
  airSteeringScale: number;
  /** Seconds of grip blend after a real landing. */
  landingGripBlendTime: number;
  /** Repulsor pull-down (as a fraction of gravity) within range above hover height. */
  repulsorAttraction: number;
  /** Heading assist from the lateral component of support on a banked surface. */
  bankAssist: number;
  /** Low-speed slide down a bank as a fraction of the lateral support component. */
  bankSlide: number;
  /** Hull damage one landing can inflict; a designed drop never wrecks a clean lap alone. */
  landingDamageCap: number;
  /** Attitude correction (rad/s per radian of hull penetration) when a probe breaks the hard deck. */
  hullKick: number;
  probes: readonly TerrainProbeDefinition[];
}

/** The original six-point repulsor bed, retained for the drive-5 compatibility tune. */
export const LEGACY_PODRACER_PROBES: readonly TerrainProbeDefinition[] = Object.freeze([
  Object.freeze({ id: 'cockpit-front', localX: 0, localZ: 1.9 }),
  Object.freeze({ id: 'cockpit-rear', localX: 0, localZ: -1.8 }),
  Object.freeze({ id: 'engine-left-front', localX: -4.1, localZ: 5.3 }),
  Object.freeze({ id: 'engine-left-rear', localX: -4.1, localZ: 2.2 }),
  Object.freeze({ id: 'engine-right-front', localX: 4.1, localZ: 5.3 }),
  Object.freeze({ id: 'engine-right-rear', localX: 4.1, localZ: 2.2 }),
]);

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
  landingBounce: 0.055,
  engineAcceleration: 42,
  boostAcceleration: 72,
  // A 150 m/s approach can scrub to technical-corner speed inside a readable
  // 100–120 m braking zone, without raising the simulation's top-speed ceiling.
  brakeAcceleration: 78,
  maxSpeed: 158,
  boostMaxSpeed: 212,
  linearDrag: 0.026,
  quadraticDrag: 0.0015,
  lateralGrip: 9.1,
  driftLateralGrip: 1.7,
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
  overheatHandlingTime: 2,
  overheatHandlingPenalty: 0.35,
  draftBoostRegenBonus: 1.2,
  landingBoostRefund: 0.16,
  damageAccelerationPenalty: 0.44,
  damageSteeringPenalty: 0.25,
  steeringRateLowSpeed: 1.5,
  steeringRateHighSpeed: 0.55,
  steeringResponse: 8.4,
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
  // Drive 6 handling: braking is a single predictable deceleration that wins
  // over a held throttle and tightens the line; drift exit and landings blend
  // grip back over a short window so tangential momentum is kept rather than
  // snapped away; the repulsor can pull the craft down toward hover height so
  // ordinary crests no longer become unexplained launches; a banked surface
  // turns the craft toward the low side like a real repulsor bed would.
  brakeThrottleCut: 0.75,
  brakeSteeringBonus: 0.22,
  brakeLateralScrub: 0.55,
  driftSteerSlipShare: 0.45,
  driftExitBlendTime: 0.36,
  driftEntryBlendTime: 0.26,
  driftHoldSteer: 0.06,
  momentumRetention: 0.55,
  airLateralGrip: 3.4,
  airSteeringScale: 0.62,
  landingGripBlendTime: 0.3,
  repulsorAttraction: 0.55,
  bankAssist: 2.2,
  bankSlide: 0.35,
  // The authored 138 m launch escarpment lands at terminal speed every lap.
  // The old 0.22 cap made a clean three-lap race wreck itself on landing
  // damage alone; a hard slam still costs a seventh of the hull.
  landingDamageCap: 0.14,
  hullKick: 2.4,
  // The authored engines reach 19–23 m ahead of the origin and 6.5 m out from
  // the centreline. Nose probes near the tips let the bed see the terrain
  // under them, so a nose-down pitch lifts the craft and pitches it back
  // instead of burying the engines in a slope.
  probes: Object.freeze([
    ...LEGACY_PODRACER_PROBES,
    Object.freeze({ id: 'engine-left-nose', localX: -5, localZ: 21.5 }),
    Object.freeze({ id: 'engine-right-nose', localX: 5, localZ: 21.5 }),
  ]),
});

/**
 * The drive-5 feel, expressed in the current parameter set. Archived native
 * replays (for example the V9 wreck receipts) reproduce their recorded
 * checkpoints under this tune; new races never use it.
 */
export const DRIVE5_COMPATIBILITY_CONFIG: Readonly<PodracerConfig> = Object.freeze({
  ...DEFAULT_PODRACER_CONFIG,
  overheatHandlingTime: 0,
  overheatHandlingPenalty: 0,
  draftBoostRegenBonus: 0,
  landingBoostRefund: 0,
  brakeThrottleCut: 0,
  brakeSteeringBonus: 0,
  brakeLateralScrub: 0,
  driftSteerSlipShare: 0,
  driftExitBlendTime: 0,
  driftEntryBlendTime: 0,
  driftHoldSteer: 0.12,
  momentumRetention: 0,
  airLateralGrip: DEFAULT_PODRACER_CONFIG.lateralGrip,
  airSteeringScale: 1,
  landingGripBlendTime: 0,
  repulsorAttraction: 0,
  bankAssist: 0,
  bankSlide: 0,
  landingDamageCap: 0.22,
  hullKick: 0,
  probes: LEGACY_PODRACER_PROBES,
});
