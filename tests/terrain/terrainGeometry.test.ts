import { describe, expect, it } from 'vitest';
import { BufferAttribute } from 'three';
import {
  createTerrainRingGeometry,
  getTerrainRingMetadata,
} from '../../src/render/terrain/createTerrainRingGeometry';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';

function boundaryCoordinates(
  positions: BufferAttribute,
  axis: 'x' | 'z',
  fixedAxis: 'x' | 'z',
  fixedValue: number,
): number[] {
  const result = new Set<number>();
  for (let index = 0; index < positions.count; index += 1) {
    const fixed = fixedAxis === 'x' ? positions.getX(index) : positions.getZ(index);
    if (Math.abs(fixed - fixedValue) > 1e-6) continue;
    result.add(axis === 'x' ? positions.getX(index) : positions.getZ(index));
  }
  return [...result].sort((a, b) => a - b);
}

describe('terrain clipmap geometry', () => {
  it('stitches every fine boundary vertex into the next coarse ring', () => {
    const fine = createTerrainRingGeometry({
      outerHalfExtent: 96,
      innerHalfExtent: 0,
      cellSize: 3,
    });
    const coarse = createTerrainRingGeometry({
      outerHalfExtent: 192,
      innerHalfExtent: 96,
      cellSize: 6,
    });
    const finePositions = fine.getAttribute('position');
    const coarsePositions = coarse.getAttribute('position');
    if (!(finePositions instanceof BufferAttribute) || !(coarsePositions instanceof BufferAttribute)) {
      throw new TypeError('Expected non-interleaved position attributes');
    }
    const fineEdge = boundaryCoordinates(finePositions, 'x', 'z', 96)
      .filter((value) => value >= -96 && value <= 96);
    const coarseEdge = boundaryCoordinates(coarsePositions, 'x', 'z', 96)
      .filter((value) => value >= -96 && value <= 96);
    expect(coarseEdge).toEqual(fineEdge);
    expect(coarseEdge).toHaveLength(65);
    fine.dispose();
    coarse.dispose();
  });

  it('keeps internal transitions coplanar and skirts only the far horizon', () => {
    const internal = createTerrainRingGeometry({
      outerHalfExtent: 192,
      innerHalfExtent: 96,
      cellSize: 6,
    });
    const horizon = createTerrainRingGeometry({
      outerHalfExtent: 192,
      innerHalfExtent: 96,
      cellSize: 6,
      skirtDepth: 12,
      outerSkirt: true,
    });
    const internalPosition = internal.getAttribute('position');
    const horizonPosition = horizon.getAttribute('position');
    let internalMinimumY = Infinity;
    let horizonMinimumY = Infinity;
    for (let index = 0; index < internalPosition.count; index += 1) {
      internalMinimumY = Math.min(internalMinimumY, internalPosition.getY(index));
    }
    for (let index = 0; index < horizonPosition.count; index += 1) {
      horizonMinimumY = Math.min(horizonMinimumY, horizonPosition.getY(index));
    }
    expect(internalMinimumY).toBe(0);
    expect(horizonMinimumY).toBe(-12);
    expect(getTerrainRingMetadata(internal).skirtTriangleCount).toBe(0);
    expect(getTerrainRingMetadata(horizon).skirtTriangleCount).toBeGreaterThan(0);
    internal.dispose();
    horizon.dispose();
  });

  it('builds six bounded, frustum-cullable levels within its draw-call budget', () => {
    const terrain = new TerrainSystem();
    expect(terrain.meshes).toHaveLength(6);
    expect(terrain.maximumDrawCalls).toBe(6);
    expect(terrain.outerRadius).toBe(3072);
    for (const mesh of terrain.meshes) {
      expect(mesh.frustumCulled).toBe(true);
      expect(mesh.geometry.boundingSphere).not.toBeNull();
    }
    terrain.update({
      cameraWorldX: 100_000.25,
      cameraWorldZ: -200_000.5,
      renderOriginX: 99_840,
      renderOriginZ: -199_680,
      time: 2.5,
    });
    expect(terrain.meshes[0]?.position.x).toBeCloseTo(160.25, 12);
    expect(terrain.meshes[0]?.position.z).toBeCloseTo(-320.5, 12);
    terrain.dispose();
  });
});
