import type { PlayerInputState } from '../input/actions';
import type { PodIdentityId } from '../podIdentity';
import type { PodracerState } from '../simulation/types';
import type { GalacticEvent, GalacticImpact, GalacticRacerState, GalacticWorldOccluder } from './types';
export type PodAbilityKind = 'flame' | 'shunt' | 'dash' | 'vent' | 'ram';
export interface PodAbilityState { cooldown: number; windup: number; remaining: number; held: boolean; direction: number; pulse: number; kind: PodAbilityKind }
interface Definition { kind: PodAbilityKind; label: string; cooldown: number; windup: number; duration: number; strength: number; hint: string }
export const POD_ABILITIES: Readonly<Record<PodIdentityId, Definition>> = Object.freeze({
  teemto: { kind: 'vent', label: 'Coolant burst', cooldown: 9, windup: .25, duration: .8, strength: .24, hint: 'Cool the core and refill a little boost.' },
  sebulba: { kind: 'flame', label: 'Flame jet', cooldown: 10, windup: .45, duration: 1.15, strength: .24, hint: 'Steer to aim a short cone. Shield or leave the orange cone to counter.' },
  polwo: { kind: 'shunt', label: 'Sidewinder', cooldown: 6.5, windup: .22, duration: .35, strength: 21, hint: 'Steer + ability to dodge sideways. No invulnerability; walls still hurt.' },
  blockrunner: { kind: 'ram', label: 'Bulwark ram', cooldown: 10, windup: .5, duration: 1.1, strength: 20, hint: 'Commit to a reinforced charge. Dodge the nose or raise a shield.' },
  verdigris: { kind: 'vent', label: 'Deep vent', cooldown: 11, windup: .35, duration: 1.1, strength: .4, hint: 'Trade a short cooldown for sustained core cooling.' },
  skybolt: { kind: 'dash', label: 'Ramjet sprint', cooldown: 8, windup: .35, duration: .8, strength: 38, hint: 'A hot forward burst. Brake before a corner; heat still accumulates.' },
  needle: { kind: 'shunt', label: 'Needle step', cooldown: 5.5, windup: .18, duration: .28, strength: 25, hint: 'A quick lateral dodge in your steering direction. Avoid walls.' },
  pog: { kind: 'ram', label: 'Turbine charge', cooldown: 9, windup: .5, duration: .85, strength: 26, hint: 'A short heavy charge. Opponents can shield or move aside.' },
  procedural: { kind: 'vent', label: 'Coolant burst', cooldown: 9, windup: .25, duration: .8, strength: .24, hint: 'Cool the engines.' },
});
export function createPodAbility(kind: PodAbilityKind = 'vent'): PodAbilityState {
  return { kind, cooldown: 0, windup: 0, remaining: 0, held: false, direction: 0, pulse: 0 };
}
/** Shared activation rules keep the fixed-step simulation and readiness HUD in agreement. */
export function podAbilityBlockReason(kind: PodAbilityKind, state: {
  battle: boolean; running: boolean; overheated: boolean; grounded: boolean;
}): 'BATTLE ONLY' | 'RECOVERING' | 'OVERHEATED' | 'AIRBORNE' | null {
  if (kind === 'flame' && !state.battle) return 'BATTLE ONLY';
  if (!state.running) return 'RECOVERING';
  // Cooling is the way out of an overheated core, so it must remain usable.
  if (state.overheated && kind !== 'vent') return 'OVERHEATED';
  // A lateral dodge needs ground contact. Do not spend its cooldown in mid-air.
  if (kind === 'shunt' && !state.grounded) return 'AIRBORNE';
  return null;
}
export interface AbilityRacer { id: string; vehicle: PodracerState; galactic: GalacticRacerState; identity: PodIdentityId; progress: number; finished: boolean; teamId?: string }
/** Called once after all racer inputs have been resolved. Uses one pre-impact field,
 * so racer ordering cannot make flame hits disappear or double during a tick. */
export function stepPodAbilities(racers: readonly AbilityRacer[], inputs: Readonly<Record<string, PlayerInputState>>,
  delta: number, battle: boolean, occluder: GalacticWorldOccluder): { events: GalacticEvent[]; impacts: GalacticImpact[] } {
  const events: GalacticEvent[] = [], impacts: GalacticImpact[] = [];
  for (const racer of racers) {
    const { vehicle: v, galactic: g } = racer, def = POD_ABILITIES[racer.identity];
    const a = g.ability ??= createPodAbility(def.kind); a.kind = def.kind;
    const input = inputs[racer.id], held = input?.ability === true;
    a.cooldown = Math.max(0, a.cooldown - delta); a.pulse = Math.max(0, a.pulse - delta);
    if (racer.finished || g.wreck.phase !== 'running') { a.windup = a.remaining = 0; a.held = held; continue; }
    const blocked = podAbilityBlockReason(def.kind, { battle, running: true, overheated: v.boost.overheated, grounded: v.grounded });
    if (held && !a.held && a.cooldown === 0 && blocked === null) {
      a.cooldown = def.cooldown; a.windup = def.windup; a.remaining = 0;
      a.direction = Math.abs(input?.steer ?? 0) > .15 ? Math.sign(input!.steer) : def.kind === 'shunt' ? 1 : 0;
      events.push({ type: 'pod-ability', racerId: racer.id, kind: def.kind, phase: 'windup' });
    }
    a.held = held;
    if (a.windup > 0) {
      a.windup = Math.max(0, a.windup - delta);
      if (a.windup === 0) { a.remaining = def.duration; events.push({ type: 'pod-ability', racerId: racer.id, kind: def.kind, phase: 'active' }); }
      continue;
    }
    if (a.remaining <= 0) continue;
    a.remaining = Math.max(0, a.remaining - delta);
    const yaw = v.orientation.yaw, sin = Math.sin(yaw), cos = Math.cos(yaw);
    if (def.kind === 'vent') {
      v.heat = Math.max(0, v.heat - def.strength * delta / def.duration);
      g.redline.heat = Math.max(0, g.redline.heat - def.strength * delta / def.duration);
      v.boost.energy = Math.min(1, v.boost.energy + .12 * delta / def.duration);
    } else if (def.kind === 'shunt') {
      if (v.grounded) { v.velocity.x += cos * a.direction * def.strength * delta / def.duration; v.velocity.z -= sin * a.direction * def.strength * delta / def.duration; }
    } else if (def.kind === 'dash' || def.kind === 'ram') {
      const speed = Math.hypot(v.velocity.x, v.velocity.z);
      if (speed < 220) { v.velocity.x += sin * def.strength * delta; v.velocity.z += cos * def.strength * delta; }
      v.heat = Math.min(1.25, v.heat + .14 * delta);
    } else if (def.kind === 'flame' && battle && a.pulse <= 0) {
      // Ten pulses per second, bounded range, vertical separation and world occlusion.
      a.pulse = .1;
      const heading = yaw + a.direction * .8, fx = Math.sin(heading), fz = Math.cos(heading);
      const ox = v.position.x + sin * 12, oz = v.position.z + cos * 12;
      for (const target of racers) {
        if (target.id === racer.id || (racer.teamId && racer.teamId === target.teamId) || target.finished || target.galactic.wreck.phase !== 'running' || target.galactic.wreck.invulnerable > 0) continue;
        const dx = target.vehicle.position.x - ox, dz = target.vehicle.position.z - oz;
        const distance = Math.hypot(dx, dz), along = dx * fx + dz * fz, across = Math.abs(dx * fz - dz * fx);
        if (distance > 36 || along < 0 || across > 4 + along * .38 || Math.abs(target.vehicle.position.y - v.position.y) > 7) continue;
        if (occluder(ox, v.position.y + 2, oz, target.vehicle.position.x, target.vehicle.position.y + 2, target.vehicle.position.z, racer.progress) !== null) continue;
        impacts.push({ targetId: target.id, sourceId: racer.id, cause: 'impact', weapon: 'flame', damage: def.strength * .1,
          heat: .035, impulseX: fx * .25, impulseY: 0, impulseZ: fz * .25, status: null, statusDuration: 0,
          hazardId: null, hazardKind: null, hitX: target.vehicle.position.x, hitY: target.vehicle.position.y + 1, hitZ: target.vehicle.position.z });
      }
    }
  }
  return { events, impacts };
}
