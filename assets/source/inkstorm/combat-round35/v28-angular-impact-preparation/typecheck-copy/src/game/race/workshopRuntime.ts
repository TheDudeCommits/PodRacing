import {
  deriveWorkshopSummary,
  type WorkshopLoadout,
  type WorkshopStat,
} from '../galactic';
import type { PodracerConfig } from '../simulation/config';
import type { RacerWorkshopState } from './types';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function createRacerWorkshopState(loadout: WorkshopLoadout): RacerWorkshopState {
  const summary = deriveWorkshopSummary(loadout, loadout.vehicleClass);
  const modifiers = { ...summary.totals };
  return {
    version: 1,
    loadout: JSON.parse(JSON.stringify(summary.loadout)) as WorkshopLoadout,
    modifiers,
    synergyIds: summary.synergies.map((synergy) => synergy.id),
    mineCapacity: workshopMineCapacityFromModifier(modifiers.mineCapacity),
  };
}

export function workshopStatMultiplier(
  workshop: Readonly<RacerWorkshopState> | undefined,
  stat: WorkshopStat,
  influence = 1,
  minimum = 0.62,
  maximum = 1.55,
): number {
  const modifier = workshop?.modifiers[stat] ?? 0;
  return clamp(1 + modifier * influence, minimum, maximum);
}

export function workshopMineCapacityFromModifier(modifier: number): number {
  return Math.round(clamp(3 * (1 + modifier), 1, 6));
}

export function workshopIncomingDamageScale(
  workshop: Readonly<RacerWorkshopState> | undefined,
): number {
  // Armour is deliberately strong enough to feel in combat without erasing
  // the class definition, shield reduction, or run-local resilience upgrades.
  return clamp(1 - (workshop?.modifiers.armour ?? 0) * 0.58, 0.68, 1.28);
}

export function workshopWeaponDamageScale(
  workshop: Readonly<RacerWorkshopState> | undefined,
): number {
  return workshopStatMultiplier(workshop, 'weaponPower', 1, 0.68, 1.5);
}

export function workshopShieldDurationScale(
  workshop: Readonly<RacerWorkshopState> | undefined,
): number {
  return workshopStatMultiplier(workshop, 'shield', 1, 0.72, 1.45);
}

/** Applies the workshop's decimal tradeoffs to the real fixed-step tune. */
export function deriveWorkshopVehicleConfig(
  base: Readonly<PodracerConfig>,
  workshop: Readonly<RacerWorkshopState> | undefined,
): Readonly<PodracerConfig> {
  if (!workshop) return base;
  const result = { ...base } as PodracerConfig;
  const topSpeed = workshopStatMultiplier(workshop, 'topSpeed');
  const acceleration = workshopStatMultiplier(workshop, 'acceleration');
  const boost = workshopStatMultiplier(workshop, 'boost');
  const cooling = workshopStatMultiplier(workshop, 'cooling');
  const armour = workshopStatMultiplier(workshop, 'armour');
  const handling = workshopStatMultiplier(workshop, 'handling');
  const drift = workshopStatMultiplier(workshop, 'drift');

  result.maxSpeed *= topSpeed;
  result.boostMaxSpeed *= topSpeed * (0.7 + boost * 0.3);
  result.engineAcceleration *= acceleration;
  result.boostAcceleration *= boost * (0.72 + acceleration * 0.28);
  result.boostDrain /= boost;
  result.boostRegeneration *= workshopStatMultiplier(workshop, 'boost', 0.55);

  result.passiveHeatCooling *= cooling;
  result.boostHeatRate /= cooling;
  result.driftHeatRate /= cooling;
  result.overheatDamageRate /= workshopStatMultiplier(workshop, 'cooling', 0.45);

  result.landingDamageScale /= armour;
  result.damageAccelerationPenalty /= workshopStatMultiplier(workshop, 'armour', 0.5);
  result.damageSteeringPenalty /= workshopStatMultiplier(workshop, 'armour', 0.45);

  result.steeringRateLowSpeed *= handling;
  result.steeringRateHighSpeed *= handling;
  result.steeringResponse *= workshopStatMultiplier(workshop, 'handling', 0.75);
  result.lateralGrip *= workshopStatMultiplier(workshop, 'handling', 0.72);

  result.driftChargeRate *= drift;
  result.driftSteeringMultiplier *= workshopStatMultiplier(workshop, 'drift', 0.9);
  result.driftLateralGrip *= workshopStatMultiplier(workshop, 'drift', 0.42);
  result.driftBoostMaxTime *= workshopStatMultiplier(workshop, 'drift', 0.65);

  result.fixedDelta = base.fixedDelta;
  result.probes = base.probes;
  return Object.freeze(result);
}
