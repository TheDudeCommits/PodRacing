import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { TERRAIN_AUTHORED_NORMAL_EPSILON, TERRAIN_VERTEX_GLSL } from '../../src/render/terrain/terrainShaderChunks';
import { createTerrainMaterial } from '../../src/render/terrain/TerrainMaterial';
import { authoredTerrainLightingRound27 } from './authoredTerrainLightingRound27';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!;
const offset = (x: number, z: number) => field.sampleOffset(x, z);

// Numeric reference for the shader's two-scale gradient. These CPU tests do
// not replace GPU capture, normal interpolation or moving-camera inspection.
function lightingNormal(x: number, z: number, broadEpsilon: number,
  authoredAt: (x: number, z: number) => number, local = true,
  baseAt: (x: number, z: number) => number = sampleTerrainHeight): Vector3 {
  const authored = authoredAt(x, z);
  const h = baseAt(x, z) + authored;
  const ox = authoredAt(x + broadEpsilon, z), oz = authoredAt(x, z + broadEpsilon);
  const hx = baseAt(x + broadEpsilon, z) + ox;
  const hz = baseAt(x, z + broadEpsilon) + oz;
  if (!local) return new Vector3(h - hx, broadEpsilon, h - hz).normalize();
  const e = TERRAIN_AUTHORED_NORMAL_EPSILON;
  const localX = (authoredAt(x + e, z) - authored) / e;
  const localZ = (authoredAt(x, z + e) - authored) / e;
  return new Vector3(h - hx + ((ox - authored) / broadEpsilon - localX) * broadEpsilon,
    broadEpsilon, h - hz + ((oz - authored) / broadEpsilon - localZ) * broadEpsilon).normalize();
}
const physicalNormal = (x: number, z: number, authoredAt = offset, baseAt = sampleTerrainHeight) => {
  const height = (x: number, z: number) => baseAt(x, z) + authoredAt(x, z);
  return new Vector3(height(x - .85, z) - height(x + .85, z), 1.7,
    height(x, z - .85) - height(x, z + .85)).normalize();
};

describe('authored cliff lighting without widening the physical face', () => {
  it('preserves untouched dune lighting at every existing broad probe radius', () => {
    for (const e of [9.5, 15, 26, 48]) for (let i = 0; i < 120; i++) {
      const x = -30_000 + i * 591.37, z = -700 + i * 19.73;
      expect(lightingNormal(x, z, e, () => 0).toArray()).toEqual(lightingNormal(x, z, e, () => 0, false).toArray());
    }
  });

  it('resolves recorded cliff faces whose wide probe incorrectly crossed the next shelf', () => {
    // Keep the exact former failure independent of intentional round28 cuts.
    // Both base heights and signed-field probes came from the saved round27
    // field. No old angular threshold is relaxed or made shape-dependent.
    for (const probe of authoredTerrainLightingRound27.probes) {
      const { x, z, broadEpsilon: e } = probe;
      const at = (x: number, z: number) => {
        const point = probe.points.find(p => Math.abs(p.x - x) < 1e-7 && Math.abs(p.z - z) < 1e-7);
        if (!point) throw new Error(`Missing historical normal probe ${x},${z}`);
        return point;
      };
      const frozenOffset = (x: number, z: number) => at(x, z).authoredOffset;
      const frozenBase = (x: number, z: number) => at(x, z).baseHeight;
      const reference = physicalNormal(x, z, frozenOffset, frozenBase);
      const previous = lightingNormal(x, z, e, frozenOffset, false, frozenBase).angleTo(reference);
      const next = lightingNormal(x, z, e, frozenOffset, true, frozenBase).angleTo(reference);
      expect(previous).toBeGreaterThan(1.1);
      expect(next).toBeLessThan(.3);
      expect(next).toBeLessThan(previous * .22);
    }
  });

  it('keeps local normals continuous across the physical field texel boundaries', () => {
    const grid = field.grids[0];
    let checked = 0;
    for (let row = 20; row < grid.size - 20; row += 7) {
      for (let column = 20; column < grid.size - 20; column += 7) {
        const x = grid.minX + column * grid.cellSize, z = grid.minZ + row * grid.cellSize;
        if (Math.abs(offset(x, z)) < 8) continue;
        for (const [dx, dz] of [[.001, 0], [0, .001]]) {
          const before = lightingNormal(x - dx!, z - dz!, 26, offset);
          const after = lightingNormal(x + dx!, z + dz!, 26, offset);
          expect(before.distanceTo(after)).toBeLessThan(.01);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1500);
  });

  it('uses the shared displaced terrain shader without changing the height function', () => {
    const materials = createTerrainMaterial();
    expect(materials.material.vertexShader).toBe(TERRAIN_VERTEX_GLSL);
    expect(materials.normalMaterial.vertexShader).toBe(TERRAIN_VERTEX_GLSL);
    expect(materials.depthMaterial.vertexShader).toBe(TERRAIN_VERTEX_GLSL);
    expect(TERRAIN_VERTEX_GLSL).toContain('const float authoredEpsilon = 6.0;');
    expect(TERRAIN_VERTEX_GLSL).toContain('+ (broadAuthoredGradient - authoredGradient) * normalEpsilon');
    expect(TERRAIN_VERTEX_GLSL).toContain('renderPosition.y += terrainHeight;');
    materials.dispose();
  });
});
