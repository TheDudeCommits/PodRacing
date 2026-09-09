import type { PodracerConfig } from '../simulation/config';
import type {
  GalacticUpgradePart,
  GalacticUpgradeState,
  GalacticVehicleClass,
  GalacticVehicleDefinition,
} from './types';

export const GALACTIC_VEHICLE_ORDER = [
  'podracer',
  'landspeeder',
  'speeder-bike',
  'skim-speeder',
] as const satisfies readonly GalacticVehicleClass[];

export const GALACTIC_VEHICLES: Readonly<Record<GalacticVehicleClass, GalacticVehicleDefinition>> = Object.freeze({
  podracer: Object.freeze({
    id: 'podracer', label: 'Twin-Engine Podracer', role: 'Velocity Striker',
    description: 'Fast, forceful and responsive—the all-round racing machine for attacking the lead.',
    stats: Object.freeze({ speed: 4, acceleration: 4, drift: 3, defence: 2, weapons: 4 }),
    advantages: Object.freeze(['High-speed steering', 'Hard-hitting lance']),
    tradeoff: 'Vulnerable to impacts', collisionRadius: 7.2,
    incomingDamageScale: 1.16, shieldDuration: 1.15, shieldCooldown: 6.4,
    weaponCooldown: 0.7, weaponDamage: 0.12, redlineHeatRate: 0.34,
    redlineCoolingRate: 0.2, redlineAcceleration: 16,
    configScale: Object.freeze({
      mass: 0.94, engineAcceleration: 1.06, maxSpeed: 1.06,
      boostMaxSpeed: 1.08, steeringRateLowSpeed: 1.1,
      steeringRateHighSpeed: 1.12, landingDamageScale: 1.12,
    }),
    probeScaleX: 1, probeScaleZ: 1,
  }),
  landspeeder: Object.freeze({
    id: 'landspeeder', label: 'Armoured Landspeeder', role: 'Armoured Bruiser',
    description: 'A heavy combat platform that absorbs punishment and wins through controlled aggression.',
    stats: Object.freeze({ speed: 2, acceleration: 2, drift: 2, defence: 5, weapons: 5 }),
    advantages: Object.freeze(['Maximum armour', 'Highest weapon damage']),
    tradeoff: 'Slow and reluctant to turn', collisionRadius: 7.8,
    incomingDamageScale: 0.68, shieldDuration: 1.7, shieldCooldown: 5.5,
    weaponCooldown: 0.9, weaponDamage: 0.15, redlineHeatRate: 0.25,
    redlineCoolingRate: 0.24, redlineAcceleration: 11,
    configScale: Object.freeze({
      mass: 1.28, engineAcceleration: 0.94, maxSpeed: 0.9,
      boostMaxSpeed: 0.92, lateralGrip: 0.82, driftLateralGrip: 0.7,
      driftSlip: 1.22, steeringRateLowSpeed: 0.9, steeringRateHighSpeed: 0.86,
      landingDamageScale: 0.68, damageAccelerationPenalty: 0.72,
    }),
    probeScaleX: 1.12, probeScaleZ: 0.9,
  }),
  'speeder-bike': Object.freeze({
    id: 'speeder-bike', label: 'Needle Speeder Bike', role: 'Glass-Cannon Scout',
    description: 'The fastest launch and smallest target, built for fearless overtakes and rapid fire.',
    stats: Object.freeze({ speed: 5, acceleration: 5, drift: 4, defence: 1, weapons: 3 }),
    advantages: Object.freeze(['Fastest acceleration', 'Rapid weapon cycle']),
    tradeoff: 'Extremely fragile', collisionRadius: 4.6,
    incomingDamageScale: 1.35, shieldDuration: 0.95, shieldCooldown: 6.8,
    weaponCooldown: 0.56, weaponDamage: 0.09, redlineHeatRate: 0.42,
    redlineCoolingRate: 0.18, redlineAcceleration: 20,
    configScale: Object.freeze({
      mass: 0.62, engineAcceleration: 1.12, maxSpeed: 1.14,
      boostMaxSpeed: 1.12, steeringRateLowSpeed: 1.35,
      steeringRateHighSpeed: 1.18, steeringResponse: 1.28,
      maxBank: 1.18, landingDamageScale: 1.38,
    }),
    probeScaleX: 0.55, probeScaleZ: 1.05,
  }),
  'skim-speeder': Object.freeze({
    id: 'skim-speeder', label: 'Vector Skim Speeder', role: 'Drift Specialist',
    description: 'A planted cornering craft that turns technical sections into boost-chaining opportunities.',
    stats: Object.freeze({ speed: 3, acceleration: 3, drift: 5, defence: 3, weapons: 3 }),
    advantages: Object.freeze(['Best drift control', 'Strong lateral grip']),
    tradeoff: 'Average straight-line pace', collisionRadius: 6.3,
    incomingDamageScale: 0.94, shieldDuration: 1.35, shieldCooldown: 5.9,
    weaponCooldown: 0.76, weaponDamage: 0.11, redlineHeatRate: 0.3,
    redlineCoolingRate: 0.22, redlineAcceleration: 14,
    configScale: Object.freeze({
      mass: 0.86, engineAcceleration: 1.01, maxSpeed: 0.99,
      boostMaxSpeed: 1.02, lateralGrip: 1.16, driftLateralGrip: 1.18,
      driftSlip: 0.82, steeringResponse: 1.18, maxRoll: 1.18, maxBank: 1.3,
    }),
    probeScaleX: 0.82, probeScaleZ: 1.18,
  }),
});

function clampLevel(level: number): number {
  return Math.max(0, Math.min(3, Math.floor(Number.isFinite(level) ? level : 0)));
}

export function nextGalacticVehicleClass(current: GalacticVehicleClass): GalacticVehicleClass {
  const index = GALACTIC_VEHICLE_ORDER.indexOf(current);
  return GALACTIC_VEHICLE_ORDER[(index + 1) % GALACTIC_VEHICLE_ORDER.length] ?? 'podracer';
}

export function upgradeLevelForPart(
  upgrades: Readonly<GalacticUpgradeState>,
  part: GalacticUpgradePart,
): number {
  switch (part) {
    case 'afterburner-coils': return upgrades.afterburner;
    case 'vector-vanes': return upgrades.cornering;
    case 'reinforced-frame': return upgrades.resilience;
    default: return upgrades.parts.includes(part) ? 1 : 0;
  }
}

/** Builds one immutable per-entry tune. Fixed cadence is never scaled. */
export function deriveGalacticVehicleConfig(
  vehicleClass: GalacticVehicleClass,
  base: Readonly<PodracerConfig>,
  upgrades: Readonly<GalacticUpgradeState>,
): Readonly<PodracerConfig> {
  const definition = GALACTIC_VEHICLES[vehicleClass];
  const result = { ...base } as PodracerConfig;
  for (const [key, scale] of Object.entries(definition.configScale)) {
    const typedKey = key as keyof PodracerConfig;
    if (typedKey === 'fixedDelta' || typedKey === 'probes' || typeof scale !== 'number') continue;
    const value = base[typedKey];
    if (typeof value === 'number') {
      (result as unknown as Record<string, number>)[typedKey] = value * scale;
    }
  }

  const afterburner = clampLevel(upgrades.afterburner);
  const cornering = clampLevel(upgrades.cornering);
  const resilience = clampLevel(upgrades.resilience);
  result.boostAcceleration *= 1 + afterburner * 0.07;
  result.boostMaxSpeed *= 1 + afterburner * 0.025;
  result.steeringRateLowSpeed *= 1 + cornering * 0.06;
  result.steeringRateHighSpeed *= 1 + cornering * 0.06;
  result.damageAccelerationPenalty *= 1 - resilience * 0.08;
  result.damageSteeringPenalty *= 1 - resilience * 0.06;
  result.landingDamageScale *= 1 - resilience * 0.1;
  result.fixedDelta = base.fixedDelta;
  result.probes = Object.freeze(base.probes.map((probe) => Object.freeze({
    ...probe,
    localX: probe.localX * definition.probeScaleX,
    localZ: probe.localZ * definition.probeScaleZ,
  })));
  return Object.freeze(result);
}
