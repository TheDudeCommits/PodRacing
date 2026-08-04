import { describe, expect, it } from 'vitest';
import {
  createTerrainSample,
  crestDustStrength,
  sampleTerrain,
  sampleTerrainHeight,
  sampleTerrainNormal,
  sampleTerrainSurface,
} from '../../src/render/terrain/terrainMath';

describe('analytic terrain sampling', () => {
  it('is deterministic at fixed review coordinates', () => {
    const points = [
      [0, 0],
      [127.25, -941.75],
      [1_000_000.125, -999_999.75],
      [-4096, -8192],
    ] as const;

    const first = createTerrainSample();
    const second = createTerrainSample();
    for (const [x, z] of points) {
      const result = sampleTerrain(x, z, first);
      sampleTerrain(x, z, second);
      expect(result).toBe(first);
      expect(second).toEqual(first);
      expect(sampleTerrainHeight(x, z)).toBeCloseTo(first.height, 11);
    }
    expect(sampleTerrainHeight(0, 0)).toBeCloseTo(-16.584680091565275, 11);
  });

  it('remains continuous across positive, negative and large world coordinates', () => {
    const points = [
      [0, 0],
      [-1, -1],
      [657.03125, -1829.984375],
      [-65_536.125, 131_072.5],
      [9_999_999.75, -8_888_888.25],
    ] as const;
    const epsilon = 1e-3;
    for (const [x, z] of points) {
      const centre = sampleTerrainHeight(x, z);
      const acrossX = sampleTerrainHeight(x + epsilon, z);
      const acrossZ = sampleTerrainHeight(x, z + epsilon);
      expect(Number.isFinite(centre)).toBe(true);
      expect(Math.abs(acrossX - centre)).toBeLessThan(0.01);
      expect(Math.abs(acrossZ - centre)).toBeLessThan(0.01);
    }
  });

  it('returns normalized normals consistent with central-difference slopes', () => {
    const normal = { x: 0, y: 0, z: 0 };
    const sample = createTerrainSample();
    for (let z = -800; z <= 800; z += 160) {
      for (let x = -800; x <= 800; x += 160) {
        sampleTerrain(x, z, sample);
        sampleTerrainNormal(x, z, normal);
        expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 12);
        expect(normal.x).toBeCloseTo(sample.normalX, 12);
        expect(normal.y).toBeCloseTo(sample.normalY, 12);
        expect(normal.z).toBeCloseTo(sample.normalZ, 12);
        expect(sample.density).toBeGreaterThanOrEqual(0);
        expect(sample.density).toBeLessThanOrEqual(1);
        expect(sample.crest).toBeGreaterThanOrEqual(0);
        expect(sample.crest).toBeLessThanOrEqual(1);
      }
    }
  });

  it('offers a cheap material-field sample consistent with the full sampler', () => {
    const full = createTerrainSample();
    const surface = { height: 0, density: 0, crest: 0, ripple: 0 };
    sampleTerrain(-714.25, 991.75, full);
    sampleTerrainSurface(-714.25, 991.75, surface);
    expect(surface.height).toBeCloseTo(full.height, 12);
    expect(surface.density).toBeCloseTo(full.density, 12);
    expect(surface.crest).toBeCloseTo(full.crest, 12);
    expect(surface.ripple).toBeCloseTo(full.ripple, 12);
  });

  it('only enables crest dust when crest, slope and wind all contribute', () => {
    const sample = createTerrainSample();
    sample.crest = 0.9;
    sample.slope = 0.48;
    expect(crestDustStrength(sample, 0.1)).toBe(0);
    expect(crestDustStrength(sample, 1)).toBeGreaterThan(0.5);
    sample.slope = 0.05;
    expect(crestDustStrength(sample, 1)).toBe(0);
  });

  it('keeps pronounced dune relief without turning the probe field violent', () => {
    const sample = createTerrainSample();
    const slopes: number[] = [];
    let minimumHeight = Number.POSITIVE_INFINITY;
    let maximumHeight = Number.NEGATIVE_INFINITY;
    for (let z = -1_200; z <= 1_200; z += 30) {
      for (let x = -1_200; x <= 1_200; x += 30) {
        sampleTerrain(x, z, sample);
        slopes.push(sample.slope);
        minimumHeight = Math.min(minimumHeight, sample.height);
        maximumHeight = Math.max(maximumHeight, sample.height);
      }
    }
    slopes.sort((left, right) => left - right);
    const p99 = slopes[Math.floor(slopes.length * 0.99)] ?? Number.POSITIVE_INFINITY;
    expect(maximumHeight - minimumHeight).toBeGreaterThan(55);
    expect(p99).toBeLessThan(0.9);
    expect(slopes.at(-1)).toBeLessThan(1.65);
  });
});
