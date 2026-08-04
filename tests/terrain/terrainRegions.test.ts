import { describe, expect, it } from 'vitest';
import {
  DESERT_REGION_ORDER,
  TERRAIN_REGION_CELL_SIZE,
  desertRegionByIndex,
} from '../../src/game/race/regions';
import {
  createTerrainSample,
  sampleTerrain,
  sampleTerrainHeight,
  sampleTerrainRegion,
} from '../../src/render/terrain/terrainMath';
import { TERRAIN_GLSL } from '../../src/render/terrain/terrainShaderChunks';

describe('deterministic desert regions', () => {
  it('exposes every region with distinct shaping fields', () => {
    const sample = createTerrainSample();
    const receipts = DESERT_REGION_ORDER.map((region, index) => {
      const x = index * TERRAIN_REGION_CELL_SIZE;
      sampleTerrain(x, 317.25, sample);
      expect(sampleTerrainRegion(x)).toBe(region);
      return [
        sample.height.toFixed(4),
        sample.density.toFixed(4),
        sample.crest.toFixed(4),
      ].join(':');
    });
    expect(new Set(receipts).size).toBe(DESERT_REGION_ORDER.length);
  });

  it('blends continuously across every positive and negative cell boundary', () => {
    for (let cell = -6; cell <= 6; cell += 1) {
      const boundary = (cell + 0.5) * TERRAIN_REGION_CELL_SIZE;
      const before = sampleTerrainHeight(boundary - 0.001, cell * 31.7);
      const after = sampleTerrainHeight(boundary + 0.001, cell * 31.7);
      expect(Math.abs(after - before)).toBeLessThan(0.02);
    }
  });

  it('keeps region constants and six-way selection in the GPU terrain twin', () => {
    expect(TERRAIN_GLSL).toContain('regionCellSize = 9600.0');
    expect(TERRAIN_GLSL).toContain('transition = 720.0');
    for (let index = 0; index < 6; index += 1) {
      expect(desertRegionByIndex(index).terrainIndex).toBe(index);
    }
    expect(TERRAIN_GLSL).toContain('geothermalHeight');
    expect(TERRAIN_GLSL).toContain('graveyardHeight');
  });
});
