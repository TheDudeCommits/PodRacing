import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField, getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { PerformanceGovernor, PERFORMANCE_QUALITY_LEVEL_COUNT } from '../../src/diagnostics/performance/PerformanceGovernor';
import { getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;
const anchor = getLaunchBasinAnchor(course)!;
const vista = getInkstormVistaPlan(course, (x, z) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z));

describe('authored terrain coverage under adaptive quality', () => {
  it('restores full ground immediately on course entry and the latest adaptive request on exit', () => {
    const terrain = new TerrainSystem();
    try {
      terrain.setLevelCount(4);
      expect(terrain.levelCount).toBe(4);
      expect(terrain.coverageRadius).toBe(768);
      terrain.setCourseGulfField(field);
      expect(terrain.levelCount).toBe(6);
      expect(terrain.requestedLevelCount).toBe(4);
      expect(terrain.coverageRadius).toBe(3072);
      terrain.setLevelCount(5);
      expect(terrain.levelCount).toBe(6);
      terrain.setCourseGulfField(null);
      expect(terrain.levelCount).toBe(5);
      expect(terrain.requestedLevelCount).toBe(5);
      expect(terrain.coverageRadius).toBe(1536);
      expect(terrain.meshes.map(mesh => mesh.visible)).toEqual([true, true, true, true, true, false]);
      terrain.setCourseGulfField(field);
      expect(terrain.meshes.every(mesh => mesh.visible)).toBe(true);
    } finally { terrain.dispose(); }
  });

  it('keeps actual refinery footprint triangles present at every quality, including after camera rebasing', () => {
    const terrain = new TerrainSystem();
    const governor = new PerformanceGovernor({ minTerrainLevels: 4, maxTerrainLevels: 6, cadenceAware: true });
    // Raycast the actual undisplaced XZ topology. The shared height shader
    // changes Y only; a missing hit here is missing ground at every elevation.
    const ray = new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0));
    const footprints = vista.terraces.flatMap(terrace => [-.5, 0, .5].flatMap(row => [-.5, 0, .5].map(col => {
      const x = col * terrace.width, z = row * terrace.depth;
      return {
        x: terrace.x + Math.cos(terrace.yaw) * x + Math.sin(terrace.yaw) * z,
        z: terrace.z - Math.sin(terrace.yaw) * x + Math.cos(terrace.yaw) * z,
      };
    })));
    const hasGround = (x: number, z: number, originX: number, originZ: number): boolean => {
      ray.ray.origin.set(x - originX, 1, z - originZ);
      return ray.intersectObjects(terrain.meshes.filter(mesh => mesh.visible), false).length > 0;
    };
    try {
      expect(vista.terraces).toHaveLength(3);
      terrain.setLevelCount(governor.setQualityLevel(7).terrainLevelCount);
      terrain.update({ cameraWorldX: anchor.x, cameraWorldZ: anchor.z, renderOriginX: 0, renderOriginZ: 0, time: 0 });
      terrain.group.updateMatrixWorld(true);
      // The pre-fix four-ring topology really omitted some of this authored
      // refinery, rather than this test only checking a visibility flag.
      expect(footprints.some(point => !hasGround(point.x, point.z, 0, 0))).toBe(true);
      terrain.setCourseGulfField(field);
      const geometries = terrain.meshes.map(mesh => mesh.geometry);
      for (let quality = 0; quality < PERFORMANCE_QUALITY_LEVEL_COUNT; quality++) {
        const decision = governor.setQualityLevel(quality);
        terrain.setLevelCount(decision.terrainLevelCount);
        for (const forward of [0, 420, 950]) {
          const x = anchor.x + anchor.tangentX * forward;
          const z = anchor.z + anchor.tangentZ * forward;
          const originX = Math.floor(x / 256) * 256, originZ = Math.floor(z / 256) * 256;
          terrain.update({ cameraWorldX: x, cameraWorldZ: z, renderOriginX: originX, renderOriginZ: originZ, time: quality });
          terrain.group.updateMatrixWorld(true);
          for (const point of footprints) expect(hasGround(point.x, point.z, originX, originZ),
            `quality ${quality}, launch distance ${forward}, ground at ${point.x},${point.z}`).toBe(true);
        }
        expect(terrain.levelCount).toBe(6);
        expect(terrain.requestedLevelCount).toBe(decision.terrainLevelCount);
        expect(terrain.coverageRadius).toBe(3072);
        expect(terrain.meshes.every((mesh, index) => mesh.geometry === geometries[index])).toBe(true);
      }
      // Authored coverage retains both refined far meshes at every adaptive
      // quality. Their geometry is cached, never rebuilt on a quality change.
      expect(terrain.meshes.slice(4).reduce((sum, mesh) => sum + mesh.geometry.index!.count / 3, 0)).toBe(296448);
      expect(terrain.maximumDrawCalls).toBe(6);
    } finally { terrain.dispose(); }
  }, 20_000);

  it('respects configured ring capacity and rejects non-finite adaptive requests without losing coverage', () => {
    const terrain = new TerrainSystem({ levels: 2 });
    try {
      terrain.setCourseGulfField(field);
      terrain.setLevelCount(1);
      terrain.setLevelCount(Number.NaN);
      expect(terrain.levelCount).toBe(2);
      expect(terrain.requestedLevelCount).toBe(1);
      expect(terrain.coverageRadius).toBe(192);
      terrain.setCourseGulfField(null);
      expect(terrain.levelCount).toBe(1);
      terrain.setLevelCount(Infinity);
      expect(terrain.levelCount).toBe(1);
    } finally { terrain.dispose(); }
  });
});
