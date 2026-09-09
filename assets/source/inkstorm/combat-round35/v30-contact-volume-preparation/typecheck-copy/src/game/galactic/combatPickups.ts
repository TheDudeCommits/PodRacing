import type { PodracerState } from '../simulation/types';
import type { GalacticEvent, GalacticRacerState, GalacticUpgradePart, GalacticWorldState } from './types';

export const EMP_PULSE_RADIUS = 42;
export const EMP_DISRUPTION_SECONDS = 1.35;
export const SALVAGE_REPAIR_AMOUNT = 0.24;
export const SALVAGE_COOLING_AMOUNT = 0.4;
export const COMBAT_PICKUP_RESPAWN_SECONDS = 5;
export type CombatPickupPart = 'emp-cell' | 'repair-salvage';
export interface CombatPickupRacer {
  readonly id: string;
  readonly vehicle: PodracerState;
  readonly galactic: GalacticRacerState;
}
export function isCombatPickup(part: GalacticUpgradePart): part is CombatPickupPart {
  return part === 'emp-cell' || part === 'repair-salvage';
}

/**
 * Called once at the authoritative pickup-claim boundary. These instant pickups
 * never change the permanent workshop, RNG sequence, or any existing upgrade.
 * The caller supplies enemies only, preserving team-race friendly-fire rules.
 */
export function collectCombatPickup(
  pickupId: string,
  part: CombatPickupPart,
  collector: CombatPickupRacer,
  enemies: readonly CombatPickupRacer[],
  world: GalacticWorldState,
): GalacticEvent[] {
  const { galactic, vehicle, id } = collector;
  if (galactic.wreck.phase === 'wrecked' || galactic.upgrades.collectedPickupIds.includes(pickupId)) return [];
  galactic.upgrades.collectedPickupIds.push(pickupId);
  if (part === 'repair-salvage') {
    const repaired = Math.min(Math.max(0, vehicle.damage), SALVAGE_REPAIR_AMOUNT);
    const cooled = Math.min(Math.max(0, vehicle.heat), SALVAGE_COOLING_AMOUNT);
    const coreCooled = Math.min(Math.max(0, galactic.redline.heat), SALVAGE_COOLING_AMOUNT);
    vehicle.damage = Math.max(0, vehicle.damage - repaired);
    vehicle.heat = Math.max(0, vehicle.heat - cooled);
    galactic.redline.heat = Math.max(0, galactic.redline.heat - coreCooled);
    // A vent helps recovery from heat faults without cancelling the whole lockout.
    galactic.redline.lockout = Math.max(0, galactic.redline.lockout - 0.8);
    galactic.status.ionized = 0;
    return [{ type: 'repair-salvage-collected', racerId: id, pickupId, repaired, cooled, coreCooled }];
  }

  const events: GalacticEvent[] = [];
  const targetIds: string[] = [];
  const blockedIds: string[] = [];
  const enemyIds = new Set(enemies.map((enemy) => enemy.id));
  const inRange = (point: { x: number; y: number; z: number }): boolean => {
    const dx = point.x - vehicle.position.x;
    const dy = point.y - vehicle.position.y;
    const dz = point.z - vehicle.position.z;
    return dx * dx + dy * dy + dz * dz <= EMP_PULSE_RADIUS ** 2;
  };
  for (const target of [...enemies].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const state = target.galactic;
    if (target.id === id || state.wreck.phase !== 'running' || state.wreck.invulnerable > 0
      || !inRange(target.vehicle.position)) continue;
    const blocked = state.shield.active;
    if (blocked) {
      blockedIds.push(target.id);
      state.shield.remaining = Math.max(0, state.shield.remaining - 0.45);
      if (state.shield.remaining === 0) {
        state.shield.active = false;
        events.push({ type: 'pulse-shell', racerId: target.id, active: false, cooldown: state.shield.cooldown });
      }
    } else {
      targetIds.push(target.id);
      state.status.ionized = Math.max(state.status.ionized, EMP_DISRUPTION_SECONDS);
      state.weapon.cooldown = Math.max(state.weapon.cooldown, EMP_DISRUPTION_SECONDS);
      state.mine.cooldown = Math.max(state.mine.cooldown, EMP_DISRUPTION_SECONDS);
      state.redline.active = false;
      target.vehicle.boost.active = false;
      state.wreck.recentAggressorId = id;
      state.wreck.recentAggressorTime = 1.5;
    }
    events.push({ type: 'emp-hit', attackerId: id, targetId: target.id, blocked,
      duration: blocked ? 0 : EMP_DISRUPTION_SECONDS });
  }
  let clearedOrdnance = 0;
  for (let index = world.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = world.projectiles[index];
    if (projectile && enemyIds.has(projectile.ownerId) && inRange(projectile.position)) {
      world.projectiles.splice(index, 1);
      clearedOrdnance += 1;
    }
  }
  for (let index = world.mines.length - 1; index >= 0; index -= 1) {
    const mine = world.mines[index];
    if (mine && enemyIds.has(mine.ownerId) && inRange(mine.position)) {
      world.mines.splice(index, 1);
      clearedOrdnance += 1;
    }
  }
  events.push({ type: 'emp-pulse', racerId: id, pickupId, radius: EMP_PULSE_RADIUS,
    targetIds, blockedIds, clearedOrdnance });
  return events;
}
