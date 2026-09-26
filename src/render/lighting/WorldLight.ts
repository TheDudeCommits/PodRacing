import { Color, Vector3 } from 'three';

import type { RacingBiomeId } from '../../game/race/racingBiomes';

/**
 * One sun for everything: sky, surface shading, the static shadow atlas and
 * the post chain's rays and in-scattering all read this shared vector, so the
 * visible sun and the light on the world always agree.
 *
 * Direction points from the world toward the sun.
 */
export const WORLD_SUN = { value: new Vector3(0.51, 0.375, 0.774).normalize() };
/** Direction of the sun disc painted into the visible sky. Post effects that
 * must line up with the disc (god rays, in-scattering) read this, while
 * surface lighting uses WORLD_SUN, lifted for readable form and bounded shadows. */
export const SKY_SUN = { value: new Vector3(0.548207989867, 0.080446966053, 0.832463984506).normalize() };
/** Warm key light color used by stylized materials that tint their lit side. */
export const WORLD_SUN_COLOR = { value: new Color('#ffd7a3') };

let revision = 0;
/** Increments whenever the sun moves; baked shadow atlases compare against it. */
export function worldLightRevision(): number { return revision; }

function sunFrom(azimuthX: number, azimuthZ: number, elevationDegrees: number): Vector3 {
  const e = elevationDegrees * Math.PI / 180;
  const h = Math.hypot(azimuthX, azimuthZ) || 1;
  return new Vector3(azimuthX / h * Math.cos(e), Math.sin(e), azimuthZ / h * Math.cos(e)).normalize();
}

/** Azimuth follows the sun painted into each world's sky; elevation is lifted
 * enough to keep readable form shading and bounded shadow lengths. */
export const BIOME_SUN: Readonly<Record<RacingBiomeId, { direction: Vector3; color: string }>> = Object.freeze({
  desert: { direction: sunFrom(.548, .832, 21), color: '#ffd29a' },
  frozen: { direction: sunFrom(.548, .832, 16), color: '#ffe0c4' },
  volcanic: { direction: sunFrom(.548, .832, 24), color: '#ff9a5c' },
  jungle: { direction: sunFrom(.548, .832, 34), color: '#fff0c8' },
});

export function setWorldSunForBiome(biome: RacingBiomeId): boolean {
  const preset = BIOME_SUN[biome];
  const changed = WORLD_SUN.value.distanceToSquared(preset.direction) > 1e-8;
  WORLD_SUN.value.copy(preset.direction);
  WORLD_SUN_COLOR.value.set(preset.color);
  if (changed) revision++;
  return changed;
}

/** The legacy stepped haze in cel, terrain and corridor shaders. The cinematic
 * post chain now provides smooth, sun-aware aerial perspective, so the painted
 * bands are kept only as a faint graphic accent. */
export const LEGACY_HAZE = { value: 0.3 };

/** GLSL chunk: declare once per shader that reads the shared sun. */
export const WORLD_SUN_GLSL = /* glsl */ `uniform vec3 uWorldSun;`;
