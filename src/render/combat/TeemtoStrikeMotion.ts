import type { Vector3 } from 'three';

export const TEEMTO_REAR_STRIKE_TIME = .075;
export const TEEMTO_REAR_SLIDE_TIME = .60;
const SLIDE_DURATION = [.70, .64, TEEMTO_REAR_SLIDE_TIME] as const;
// The front catches on a real source edge before completing its roof roll.
// Positive source Z is its nose; negative local X pitch raises that end.
export const TEEMTO_FRONT_CATCH_PITCH = -Math.PI / 9;
export const TEEMTO_FRONT_RESERVED_ROLL = Math.PI * 55 / 180;
export const TEEMTO_FRONT_CATCH_END = .65;

/** Remaining fraction of the front's first-contact tilt. The final support
 * orientation is unchanged; only this portion of the turn happens on ground. */
export function sampleTeemtoFrontCatch(age: number): number {
  if (!Number.isFinite(age)) return 0;
  const t = Math.max(0, Math.min(1, (age - .13) / (TEEMTO_FRONT_CATCH_END - .13)));
  return 1 - t * t * (3 - 2 * t);
}

const CONTACT_ROLL = [-.085, .11, -.075] as const;
const DURATION = [.18, .13, TEEMTO_REAR_STRIKE_TIME] as const;
const FLIGHT = [2.4, 2.8, 3.0] as const;
const SLIDE = [.8, 1.0, 2.0] as const;
const DX = [-.9701425001, .7071067812, .3939192986] as const;
const DZ = [.242535625, .7071067812, -.91914503] as const;

export function teemtoStrikeTime(index: number): number { return DURATION[index] ?? TEEMTO_REAR_STRIKE_TIME; }

export function teemtoSlideTime(index: number): number { return SLIDE_DURATION[index] ?? TEEMTO_REAR_SLIDE_TIME; }

/** One support response: contact impulse, a smaller opposite rebound, then exact
 * rest. Event-age sampling permits pause, repeated frames and random access. */
export function sampleTeemtoContactRoll(index: number, age: number): number {
  if (!Number.isFinite(age)) return 0;
  const u = (age - teemtoStrikeTime(index)) / teemtoSlideTime(index);
  if (u <= 0 || u >= 1) return 0;
  const amplitude = CONTACT_ROLL[index] ?? CONTACT_ROLL[2];
  if (u < .28) return amplitude * Math.sin(Math.PI * .5 * u / .28);
  const t = u < .68 ? (u - .28) / .40 : (u - .68) / .32;
  const smooth = t * t * (3 - 2 * t);
  // Angular return dies faster than the remaining linear slide, so the
  // source center's support arc cannot tug the mass backwards near rest.
  return amplitude * (u < .68 ? 1 - 1.24 * smooth : -.24 * (1 - smooth) ** 2);
}

/** Explicit impulse, supported contact and one-way braking path. The position
 * is continuous at impact; its speed drops as the ground absorbs the impulse.
 * No integration/history, random displacement or direction reversal. */
export function sampleTeemtoStrikeMotion(index: number, age: number, point: Vector3, velocity: Vector3): void {
  const duration = teemtoStrikeTime(index), slideTime = teemtoSlideTime(index), flight = FLIGHT[index] ?? 3, slide = SLIDE[index] ?? 2;
  const time = Math.max(0, Number.isFinite(age) ? age : 0);
  const u = time >= duration + slideTime ? 1
    : Math.max(0, (time - duration) / slideTime);
  const distance = time < duration ? flight * time / duration : flight + slide * (2 * u - u * u);
  const speed = time < duration ? flight / duration : slide * 2 * (1 - u) / slideTime;
  const dx = DX[index] ?? DX[2], dz = DZ[index] ?? DZ[2];
  point.set(dx * distance, 0, dz * distance);
  velocity.set(dx * speed, 0, dz * speed);
}
