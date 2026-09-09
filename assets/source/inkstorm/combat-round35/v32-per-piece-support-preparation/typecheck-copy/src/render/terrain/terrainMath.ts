/**
 * Deterministic analytic desert field used by gameplay, dust and course views.
 *
 * The matching GLSL implementation lives in `terrainShaderChunks.ts`. Keep the
 * constants and octave transforms in lockstep when tuning the desert. The CPU
 * path deliberately uses scalar math and caller-owned output objects so the
 * 120 Hz repulsorlift sampler does not allocate.
 */

import {
  desertRegionByIndex,
  terrainRegionBlendAt,
  type TerrainRegionBlend,
} from '../../game/race/regions';
import type { DesertRegionId } from '../../game/race/types';

export const TERRAIN_SEED = 0x504f4452;
export const TERRAIN_NORMAL_EPSILON = 0.85;

export interface TerrainSample {
  height: number;
  slopeX: number;
  slopeZ: number;
  slope: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  /** Packed-sand / mineral density in [0, 1]. */
  density: number;
  /** Sharp dune-crest likelihood in [0, 1]. */
  crest: number;
  /** Directional ripple contribution in [-1, 1]. */
  ripple: number;
  /** Dominant deterministic macro-region at this world coordinate. */
  region?: DesertRegionId;
  /** Blend toward the adjacent region near a seamless boundary. */
  regionBlend?: number;
}

export interface TerrainSurfaceSample {
  height: number;
  density: number;
  crest: number;
  ripple: number;
  region?: DesertRegionId;
  regionBlend?: number;
}

export interface TerrainNormalTarget {
  x: number;
  y: number;
  z: number;
}

export interface TerrainHeightOffset {
  sampleOffset(x: number, z: number): number;
}

/** Instance-owned samplers prevent a previous course from altering a new seed. */
export interface TerrainSampler {
  sampleHeight(x: number, z: number): number;
  sample(x: number, z: number, out: TerrainSample): TerrainSample;
  sampleSurface(x: number, z: number, out: TerrainSurfaceSample): TerrainSurfaceSample;
}

export const BASE_TERRAIN_SAMPLER: TerrainSampler = {
  sampleHeight: sampleTerrainHeight,
  sample: sampleTerrain,
  sampleSurface: sampleTerrainSurface,
};

interface TerrainFields {
  density: number;
  crest: number;
  ripple: number;
  regionIndex: number;
  regionBlend: number;
}

const UINT_RANGE = 4_294_967_295;
const HASH_X = 0x9e3779b1;
const HASH_Z = 0x85ebca77;
const HASH_SALT = 0xc2b2ae3d;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function selectRegionValue(
  index: number,
  sunscar: number,
  glass: number,
  canyon: number,
  storm: number,
  graveyard: number,
  geothermal: number,
): number {
  switch (index) {
    case 1: return glass;
    case 2: return canyon;
    case 3: return storm;
    case 4: return graveyard;
    case 5: return geothermal;
    default: return sunscar;
  }
}

function smoother(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function hashLattice(x: number, z: number, salt: number): number {
  let value = (
    Math.imul(x | 0, HASH_X)
    + Math.imul(z | 0, HASH_Z)
    + Math.imul((salt + TERRAIN_SEED) | 0, HASH_SALT)
  ) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / UINT_RANGE;
}

/** Quintic value noise. It is continuous across all integer cell boundaries. */
function valueNoise2D(x: number, z: number, salt: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = smoother(fx);
  const uz = smoother(fz);

  const a = hashLattice(ix, iz, salt);
  const b = hashLattice(ix + 1, iz, salt);
  const c = hashLattice(ix, iz + 1, salt);
  const d = hashLattice(ix + 1, iz + 1, salt);
  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return (ab + (cd - ab) * uz) * 2 - 1;
}

/** Rotated fBm avoids obvious axis-aligned octave repetition. */
function fbm2D(x: number, z: number, octaves: number, salt: number): number {
  let px = x;
  let pz = z;
  let amplitude = 0.545;
  let total = 0;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(px, pz, salt + octave * 17) * amplitude;
    normalization += amplitude;
    const rotatedX = px * 1.672 - pz * 1.126 + 11.7;
    pz = px * 1.126 + pz * 1.672 - 7.3;
    px = rotatedX;
    amplitude *= 0.49;
  }

  return total / normalization;
}

function terrainCycle(phase: number): number {
  const normalized = phase / (Math.PI * 2) + 0.25;
  return normalized - Math.floor(normalized);
}

/** Broad windward ramp followed by a shorter, steeper lee face. */
function duneProfile(cycle: number, crestPosition: number): number {
  if (cycle < crestPosition) {
    return Math.pow(smoother(clamp01(cycle / crestPosition)), 0.82);
  }
  return 1 - smoother(clamp01((cycle - crestPosition) / (1 - crestPosition)));
}

/** Continuous cusp placed directly on the dune shoulder. */
function crestPulse(cycle: number, crestPosition: number, width: number): number {
  const distance = Math.abs(cycle - crestPosition);
  const wrappedDistance = Math.min(distance, 1 - distance);
  return Math.pow(clamp01(1 - wrappedDistance / width), 1.35);
}

/**
 * Seven coupled dune fields:
 *  1. domain-warped megadunes,
 *  2. oblique cross dunes,
 *  3. medium transverse ridges that remain readable from a chase camera,
 *  4. eroded low-frequency shelf variation,
 *  5. knife-edge crest lift,
 *  6. directional wind ripples,
 *  7. fine mineral ripples.
 *
 * Dune cycles provide wind direction, but their phase is warped by aperiodic
 * noise and shaped into asymmetric windward/lee profiles. The remaining sine
 * terms are sub-metre surface ripples, not the primary terrain silhouette.
 */
function terrainCore(x: number, z: number, fields?: TerrainFields): number {
  const continental = fbm2D(x * 0.00152 + 13.8, z * 0.00152 - 9.4, 5, 11);
  const warpA = fbm2D(x * 0.00315 - 31.2, z * 0.00315 + 18.6, 4, 83);
  const warpB = fbm2D(x * 0.0041 + 7.1, z * 0.0041 + 42.5, 3, 149);
  const warpedX = x + warpA * 54 + warpB * 17;
  const warpedZ = z + warpA * 23 - warpB * 39;

  const megaPhase = warpedX * 0.00665 + warpedZ * 0.00248
    + fbm2D(x * 0.00191, z * 0.00191, 4, 211) * 2.7;
  const megaCycle = terrainCycle(megaPhase);
  const megaBody = duneProfile(megaCycle, 0.76);
  const megaCrest = crestPulse(megaCycle, 0.76, 0.065);

  const crossPhase = warpedX * -0.0032 + warpedZ * 0.0108
    + fbm2D(x * 0.0048 + 90, z * 0.0048 - 70, 3, 307) * 1.65;
  const crossCycle = terrainCycle(crossPhase);
  const crossBody = duneProfile(crossCycle, 0.68);
  const crossCrest = crestPulse(crossCycle, 0.68, 0.072);

  const erosion = fbm2D(x * 0.0072 - 3.4, z * 0.0072 + 1.8, 5, 401);
  const shelf = Math.sign(erosion) * Math.pow(Math.abs(erosion), 1.32);

  // The kilometre-scale fields make a strong horizon, but alone their slopes
  // are too gentle to read behind a 200 m/s racer. These warped transverse
  // ridges supply a dune every ~220 m, with a narrow lifted lip and a broad
  // windward face. They are still aperiodic because erosion bends the phase.
  const ridgePhase = warpedX * 0.024 + warpedZ * 0.011 + erosion * 1.45;
  const ridgeCycle = terrainCycle(ridgePhase);
  const ridgeBody = duneProfile(ridgeCycle, 0.78);
  const ridgeCrest = crestPulse(ridgeCycle, 0.78, 0.07);

  const ripplePhase = warpedX * 0.095 + warpedZ * 0.037
    + valueNoise2D(x * 0.018, z * 0.018, 503) * 2.1;
  const rippleEnvelope = 0.44 + 0.56 * clamp01(continental * 0.5 + 0.5);
  const directionalRipple = Math.sin(ripplePhase) * rippleEnvelope;

  const finePhase = warpedX * 0.238 - warpedZ * 0.071
    + valueNoise2D(x * 0.052, z * 0.052, 617) * 1.4;
  const fineRipple = Math.sin(finePhase);

  // Sunscar remains the reference field. The five companion regions reuse its
  // aperiodic domain warp, then reorganize those frequencies into genuinely
  // different silhouettes (flats, canyon shelves, basin swells, machine ribs
  // and volcanic vents). This keeps the GPU/CPU contract affordable: common
  // noise is evaluated once and only inexpensive shaping varies by region.
  const sunscarHeight = continental * 6.5
    + megaBody * 33.5
    + crossBody * 6.5
    + ridgeBody * 9.5
    + shelf * 1.2
    + megaCrest * (6.3 + clamp01(erosion * 0.5 + 0.5) * 2.3)
    + crossCrest * 1.6
    + ridgeCrest * (2.8 + clamp01(erosion * 0.5 + 0.5) * 1.1)
    + directionalRipple * 0.36
    + fineRipple * 0.08
    - 19.0;

  const glassHeight = continental * 2.4
    + megaBody * 6.2
    + crossBody * 1.8
    + ridgeBody * 1.4
    + shelf * 0.45
    + megaCrest * 1.15
    + directionalRipple * 0.16
    + fineRipple * 0.05
    - 4.8;
  const canyonShelf = erosion * (1.45 - Math.abs(erosion) * 0.45);
  const canyonHeight = continental * 7.5
    + megaBody * 13.0
    + crossBody * 5.5
    + ridgeBody * 3.8
    + canyonShelf * 18.0
    + megaCrest * 3.4
    + ridgeCrest * 1.9
    - 18.0;
  const basinFloor = Math.pow(clamp01(1 - Math.abs(erosion)), 2);
  const stormHeight = continental * 9.2
    + megaBody * 13.5
    + crossBody * 4.1
    + ridgeBody * 3.6
    + shelf * 1.8
    - basinFloor * 9.5
    + directionalRipple * 0.24
    - 13.5;
  const machineRibX = crestPulse(terrainCycle(x * 0.018 + erosion * 0.34), 0.5, 0.052);
  const machineRibZ = crestPulse(terrainCycle(z * 0.014 - erosion * 0.28), 0.5, 0.047);
  const machineRibs = Math.max(machineRibX, machineRibZ);
  const graveyardHeight = continental * 3.0
    + megaBody * 6.8
    + crossBody * 2.0
    + shelf * 0.7
    + machineRibs * 4.8
    + directionalRipple * 0.12
    - 7.2;
  const ventNoise = clamp01(
    valueNoise2D(x * 0.0067 + 43, z * 0.0067 - 17, 829) * 0.5 + 0.5,
  );
  const ventLift = ventNoise * ventNoise * ventNoise * 12.0;
  const geothermalHeight = continental * 8.2
    + megaBody * 19.5
    + crossBody * 8.4
    + ridgeBody * 10.8
    + shelf * 3.0
    + megaCrest * 5.4
    + ridgeCrest * 3.2
    + ventLift
    + directionalRipple * 0.31
    - 22.0;

  const baseDensity = clamp01(
    0.5
    + valueNoise2D(x * 0.011 + 5.3, z * 0.011 - 8.1, 719) * 0.31
    + continental * 0.19,
  );
  const baseCrest = clamp01(
    megaCrest * 0.86
    + crossCrest * 0.46
    + ridgeCrest * 0.62
    + clamp01(erosion) * 0.08,
  );
  const baseRipple = directionalRipple * 0.82 + fineRipple * 0.18;
  const regionBlend = terrainRegionBlendAt(x, scratchRegionBlend);
  const fromHeight = selectRegionValue(
    regionBlend.fromIndex,
    sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight,
  );
  const toHeight = selectRegionValue(
    regionBlend.toIndex,
    sunscarHeight, glassHeight, canyonHeight, stormHeight, graveyardHeight, geothermalHeight,
  );
  const height = fromHeight + (toHeight - fromHeight) * regionBlend.amount;

  if (fields) {
    const fromDensity = selectRegionValue(
      regionBlend.fromIndex,
      baseDensity,
      clamp01(baseDensity * 0.72 + 0.28),
      clamp01(baseDensity * 0.88 + Math.abs(erosion) * 0.18),
      clamp01(baseDensity * 0.64 + 0.08),
      clamp01(baseDensity * 0.74 + machineRibs * 0.24),
      clamp01(baseDensity * 0.84 + ventNoise * 0.2),
    );
    const toDensity = selectRegionValue(
      regionBlend.toIndex,
      baseDensity,
      clamp01(baseDensity * 0.72 + 0.28),
      clamp01(baseDensity * 0.88 + Math.abs(erosion) * 0.18),
      clamp01(baseDensity * 0.64 + 0.08),
      clamp01(baseDensity * 0.74 + machineRibs * 0.24),
      clamp01(baseDensity * 0.84 + ventNoise * 0.2),
    );
    const fromCrest = selectRegionValue(
      regionBlend.fromIndex,
      baseCrest,
      clamp01(baseCrest * 0.24),
      clamp01(baseCrest * 0.48 + Math.abs(erosion) * 0.42),
      clamp01(baseCrest * 0.42),
      clamp01(baseCrest * 0.2 + machineRibs * 0.84),
      clamp01(baseCrest * 0.72 + ventNoise * 0.35),
    );
    const toCrest = selectRegionValue(
      regionBlend.toIndex,
      baseCrest,
      clamp01(baseCrest * 0.24),
      clamp01(baseCrest * 0.48 + Math.abs(erosion) * 0.42),
      clamp01(baseCrest * 0.42),
      clamp01(baseCrest * 0.2 + machineRibs * 0.84),
      clamp01(baseCrest * 0.72 + ventNoise * 0.35),
    );
    const fromRipple = selectRegionValue(
      regionBlend.fromIndex,
      baseRipple,
      baseRipple * 1.35,
      baseRipple * 0.58,
      baseRipple * 0.76,
      baseRipple * 0.42 + machineRibs * 0.3,
      baseRipple * 0.86,
    );
    const toRipple = selectRegionValue(
      regionBlend.toIndex,
      baseRipple,
      baseRipple * 1.35,
      baseRipple * 0.58,
      baseRipple * 0.76,
      baseRipple * 0.42 + machineRibs * 0.3,
      baseRipple * 0.86,
    );
    fields.density = fromDensity + (toDensity - fromDensity) * regionBlend.amount;
    fields.crest = fromCrest + (toCrest - fromCrest) * regionBlend.amount;
    fields.ripple = fromRipple + (toRipple - fromRipple) * regionBlend.amount;
    fields.regionIndex = regionBlend.amount < 0.5
      ? regionBlend.fromIndex
      : regionBlend.toIndex;
    fields.regionBlend = regionBlend.amount;
  }

  return height;
}

const scratchRegionBlend: TerrainRegionBlend = { fromIndex: 0, toIndex: 0, amount: 0 };
const scratchFields: TerrainFields = {
  density: 0,
  crest: 0,
  ripple: 0,
  regionIndex: 0,
  regionBlend: 0,
};

export function createTerrainSample(): TerrainSample {
  return {
    height: 0,
    slopeX: 0,
    slopeZ: 0,
    slope: 0,
    normalX: 0,
    normalY: 1,
    normalZ: 0,
    density: 0,
    crest: 0,
    ripple: 0,
    region: 'sunscar-dunes',
    regionBlend: 0,
  };
}

export function createTerrainSurfaceSample(): TerrainSurfaceSample {
  return {
    height: 0,
    density: 0,
    crest: 0,
    ripple: 0,
    region: 'sunscar-dunes',
    regionBlend: 0,
  };
}

export function sampleTerrainHeight(x: number, z: number, offset?: TerrainHeightOffset | null): number {
  return terrainCore(x, z) + (offset?.sampleOffset(x, z) ?? 0);
}

/** One-field-evaluation material sample for render-side placement systems. */
export function sampleTerrainSurface(
  x: number,
  z: number,
  out: TerrainSurfaceSample,
  offset?: TerrainHeightOffset | null,
): TerrainSurfaceSample {
  out.height = terrainCore(x, z, scratchFields) + (offset?.sampleOffset(x, z) ?? 0);
  out.density = scratchFields.density;
  out.crest = scratchFields.crest;
  out.ripple = scratchFields.ripple;
  out.region = desertRegionByIndex(scratchFields.regionIndex).id;
  out.regionBlend = scratchFields.regionBlend;
  return out;
}

/**
 * Samples height, central-difference slope and normalized surface normal.
 * Pass a persistent `out` object from fixed-step code to remain allocation-free.
 */
export function sampleTerrain(
  x: number,
  z: number,
  out: TerrainSample = createTerrainSample(),
  offset?: TerrainHeightOffset | null,
): TerrainSample {
  const height = terrainCore(x, z, scratchFields) + (offset?.sampleOffset(x, z) ?? 0);
  const epsilon = TERRAIN_NORMAL_EPSILON;
  const slopeX = (
    sampleTerrainHeight(x + epsilon, z, offset) - sampleTerrainHeight(x - epsilon, z, offset)
  ) / (epsilon * 2);
  const slopeZ = (
    sampleTerrainHeight(x, z + epsilon, offset) - sampleTerrainHeight(x, z - epsilon, offset)
  ) / (epsilon * 2);
  const inverseLength = 1 / Math.sqrt(slopeX * slopeX + slopeZ * slopeZ + 1);

  out.height = height;
  out.slopeX = slopeX;
  out.slopeZ = slopeZ;
  out.slope = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
  out.normalX = -slopeX * inverseLength;
  out.normalY = inverseLength;
  out.normalZ = -slopeZ * inverseLength;
  out.density = scratchFields.density;
  out.crest = scratchFields.crest;
  out.ripple = scratchFields.ripple;
  out.region = desertRegionByIndex(scratchFields.regionIndex).id;
  out.regionBlend = scratchFields.regionBlend;
  return out;
}

/** Dominant macro-region lookup for atmosphere, landmarks and diagnostics. */
export function sampleTerrainRegion(worldX: number): DesertRegionId {
  const blend = terrainRegionBlendAt(worldX, scratchRegionBlend);
  return desertRegionByIndex(blend.amount < 0.5 ? blend.fromIndex : blend.toIndex).id;
}

export function sampleTerrainNormal(
  x: number,
  z: number,
  out: TerrainNormalTarget,
  offset?: TerrainHeightOffset | null,
): TerrainNormalTarget {
  const epsilon = TERRAIN_NORMAL_EPSILON;
  const slopeX = (
    sampleTerrainHeight(x + epsilon, z, offset) - sampleTerrainHeight(x - epsilon, z, offset)
  ) / (epsilon * 2);
  const slopeZ = (
    sampleTerrainHeight(x, z + epsilon, offset) - sampleTerrainHeight(x, z - epsilon, offset)
  ) / (epsilon * 2);
  const inverseLength = 1 / Math.sqrt(slopeX * slopeX + slopeZ * slopeZ + 1);
  out.x = -slopeX * inverseLength;
  out.y = inverseLength;
  out.z = -slopeZ * inverseLength;
  return out;
}

/** Dust may only lift from a sharp, wind-exposed, sufficiently steep crest. */
export function crestDustStrength(sample: TerrainSample, windStrength: number): number {
  const crest = clamp01((sample.crest - 0.48) / 0.4);
  const slope = clamp01((sample.slope - 0.16) / 0.42);
  const wind = clamp01((windStrength - 0.28) / 0.72);
  return crest * slope * wind;
}
