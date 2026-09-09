import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  UnsignedByteType,
} from 'three';

import type { CelDiffuseBands } from './celPalette';

export interface CelRampConfig {
  readonly bands: CelDiffuseBands;
  readonly thresholds: readonly number[];
  readonly resolution?: number;
}

export interface GraphicMatcapConfig {
  readonly resolution?: number;
  readonly bands?: readonly [number, number, number, number];
}

const DEFAULT_RAMP_RESOLUTION = 256;
const DEFAULT_MATCAP_RESOLUTION = 64;
const scratchColor = new Color();

export function validateCelRampConfig(config: CelRampConfig): void {
  const resolution = config.resolution ?? DEFAULT_RAMP_RESOLUTION;
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 4096) {
    throw new RangeError('Cel ramp resolution must be an integer between 8 and 4096.');
  }

  if (config.bands.length !== 3 && config.bands.length !== 4) {
    throw new RangeError('Cel ramps require exactly three or four color bands.');
  }

  if (config.thresholds.length !== config.bands.length - 1) {
    throw new RangeError('A cel ramp requires exactly one fewer threshold than color bands.');
  }

  let previous = 0;
  config.thresholds.forEach((threshold, index) => {
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1) {
      throw new RangeError('Cel ramp thresholds must be finite values strictly between 0 and 1.');
    }
    if (index > 0 && threshold <= previous) {
      throw new RangeError('Cel ramp thresholds must be strictly increasing.');
    }
    previous = threshold;
  });
}

function toByte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function bandIndexAt(value: number, thresholds: readonly number[]): number {
  let band = 0;
  while (band < thresholds.length && value >= (thresholds[band] ?? 1)) band += 1;
  return band;
}

export function writeCelRampData(
  target: Uint8Array,
  config: CelRampConfig,
): Uint8Array {
  validateCelRampConfig(config);
  const resolution = config.resolution ?? DEFAULT_RAMP_RESOLUTION;
  if (target.length !== resolution * 4) {
    throw new RangeError(`Cel ramp data must contain ${resolution * 4} bytes.`);
  }

  for (let x = 0; x < resolution; x += 1) {
    const sample = (x + 0.5) / resolution;
    const color = config.bands[bandIndexAt(sample, config.thresholds)];
    if (color === undefined) throw new Error('Cel ramp band lookup failed.');
    scratchColor.set(color);

    const offset = x * 4;
    target[offset] = toByte(scratchColor.r);
    target[offset + 1] = toByte(scratchColor.g);
    target[offset + 2] = toByte(scratchColor.b);
    target[offset + 3] = 255;
  }

  return target;
}

export function createCelRampTexture(config: CelRampConfig): DataTexture {
  validateCelRampConfig(config);
  const resolution = config.resolution ?? DEFAULT_RAMP_RESOLUTION;
  const data = writeCelRampData(new Uint8Array(resolution * 4), {
    ...config,
    resolution,
  });
  const texture = new DataTexture(data, resolution, 1, RGBAFormat, UnsignedByteType);
  texture.name = `cel-ramp-${config.bands.length}-band`;
  texture.colorSpace = NoColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a tiny hard-banded pseudo-reflection lookup. It is sampled like a
 * matcap in view-normal space and deliberately contains no physically based data.
 */
export function createGraphicMatcapTexture(config: GraphicMatcapConfig = {}): DataTexture {
  const resolution = config.resolution ?? DEFAULT_MATCAP_RESOLUTION;
  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 512) {
    throw new RangeError('Graphic matcap resolution must be an integer between 8 and 512.');
  }
  const bands = config.bands ?? [0, 0.16, 0.48, 0.9];
  const data = new Uint8Array(resolution * resolution * 4);

  for (let y = 0; y < resolution; y += 1) {
    for (let x = 0; x < resolution; x += 1) {
      const nx = ((x + 0.5) / resolution) * 2 - 1;
      const ny = ((y + 0.5) / resolution) * 2 - 1;
      const radiusSquared = nx * nx + ny * ny;
      const nz = Math.sqrt(Math.max(0, 1 - radiusSquared));
      const diagonalFlash = Math.abs(ny - nx * 0.32 - 0.18) < 0.075 ? 0.34 : 0;
      const lobe = radiusSquared > 1 ? 0 : ny * 0.38 + nz * 0.58 + diagonalFlash;
      const band = lobe > 0.86 ? bands[3] : lobe > 0.58 ? bands[2] : lobe > 0.25 ? bands[1] : bands[0];
      const value = toByte(band);
      const offset = (y * resolution + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, resolution, resolution, RGBAFormat, UnsignedByteType);
  texture.name = 'graphic-banded-matcap';
  texture.colorSpace = NoColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
