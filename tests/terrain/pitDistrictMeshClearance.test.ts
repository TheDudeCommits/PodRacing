import { expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { createPitPadField, type PitPad } from '../../src/game/race/PitPadField';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

// Clip the rendered triangles, not just heightfield samples: a neighboring
// higher district previously pushed a coarse triangle 4.51 m through this pit.
type Vertex = [number, number, number];
function clippedTriangle(triangle: Vertex[], pad: PitPad): Vertex[] {
  const c = Math.cos(pad.yaw), s = Math.sin(pad.yaw);
  let poly = triangle.map(([x, y, z]) => [(x - pad.centerX) * c - (z - pad.centerZ) * s, y,
    (x - pad.centerX) * s + (z - pad.centerZ) * c] as Vertex);
  for (const [axis, side, bound] of [[0, -1, pad.halfX], [0, 1, pad.halfX], [2, -1, pad.halfZ], [2, 1, pad.halfZ]]) {
    const next: Vertex[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!, b = poly[(i + 1) % poly.length]!, da = a[axis!]! * side! - bound!, db = b[axis!]! * side! - bound!;
      if (da <= 0) next.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db); next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    poly = next; if (!poly.length) break;
  }
  return poly;
}
function meshCeiling(terrain: TerrainSystem, camera: number[], pad: PitPad, heightAt: (x: number, z: number) => number) {
  let maxHeight = -Infinity, triangles = 0, maxLod = 0;
  const extent = Math.hypot(pad.halfX, pad.halfZ) + 25;
  for (const mesh of terrain.meshes) {
    const g = mesh.geometry, pos = g.getAttribute('position'), index = g.index!;
    const vertices = new Map<number, Vertex>();
    const vertex = (i: number): Vertex => {
      const old = vertices.get(i); if (old) return old;
      const x = pos.getX(i) + camera[0]!, z = pos.getZ(i) + camera[2]!;
      const v: Vertex = [x, heightAt(x, z) + pos.getY(i), z]; vertices.set(i, v); return v;
    };
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (ids.every(id => Math.abs(pos.getX(id) + camera[0]! - pad.centerX) > extent || Math.abs(pos.getZ(id) + camera[2]! - pad.centerZ) > extent)) continue;
      const clipped = clippedTriangle(ids.map(vertex), pad); if (!clipped.length) continue;
      triangles++; maxLod = Math.max(maxLod, Number(mesh.userData.terrainLod));
      for (const v of clipped) maxHeight = Math.max(maxHeight, v[1]);
    }
  }
  return { triangles, maxLod, maxHeight, maxAboveSlabBottom: maxHeight - pad.anchorHeight - pad.slabBottomOffset };
}

it('keeps the lower pit clear when the adjoining district is graded, across nearby terrain mesh phases', () => {
  const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
  const gulf = createCourseGulfField(course)!;
  const before = (x: number, z: number) => sampleTerrainHeight(x, z) + gulf.sampleOffset(x, z);
  const route = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const field = createPitPadField(getInkstormLayout(course), route, course.branches, before);
  const pad = field.pads.filter(p => p.family === 'pit-complex')[1]!;
  const terrain = new TerrainSystem(); terrain.setCourseGulfField(gulf); terrain.setPitPadField(field);
  try {
    for (const [dx, dz] of [[0, 0], [.75, 0], [0, .75], [3, 3], [-3, -3]]) {
      const camera = [18598.35644624424 + dx!, -2.613820686938819, 202.8424641509066 + dz!];
      const sample = meshCeiling(terrain, camera, pad, (x, z) => before(x, z) + field.sampleOffset(x, z));
      expect(sample.triangles).toBeGreaterThan(0);
      expect(sample.maxAboveSlabBottom).toBeLessThan(-.1);
    }
  } finally { terrain.dispose(); }
});
