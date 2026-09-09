import type { Vector3 } from 'three';

export const TEEMTO_REAR_STRIKE_TIME = .075;
export const TEEMTO_REAR_SLIDE_TIME = .22;
const DURATION = [.18, .13, TEEMTO_REAR_STRIKE_TIME] as const;
const FLIGHT = [2.4, 2.8, 3.0] as const;
const SLIDE = [.8, 1.0, 2.0] as const;
const DX = [-.9701425001, .7071067812, .3939192986] as const;
const DZ = [.242535625, .7071067812, -.91914503] as const;

export function teemtoStrikeTime(index: number): number { return DURATION[index] ?? TEEMTO_REAR_STRIKE_TIME; }

/** Explicit impulse, supported contact and one-way braking path. The position
 * is continuous at impact; its speed drops as the ground absorbs the impulse.
 * No integration/history, random displacement or direction reversal. */
export function sampleTeemtoStrikeMotion(index: number, age: number, point: Vector3, velocity: Vector3): void {
  const duration = teemtoStrikeTime(index), flight = FLIGHT[index] ?? 3, slide = SLIDE[index] ?? 2;
  const time = Math.max(0, Number.isFinite(age) ? age : 0);
  const u = time >= duration + TEEMTO_REAR_SLIDE_TIME ? 1
    : Math.max(0, (time - duration) / TEEMTO_REAR_SLIDE_TIME);
  const distance = time < duration ? flight * time / duration : flight + slide * (2 * u - u * u);
  const speed = time < duration ? flight / duration : slide * 2 * (1 - u) / TEEMTO_REAR_SLIDE_TIME;
  const dx = DX[index] ?? DX[2], dz = DZ[index] ?? DZ[2];
  point.set(dx * distance, 0, dz * distance);
  velocity.set(dx * speed, 0, dz * speed);
}
