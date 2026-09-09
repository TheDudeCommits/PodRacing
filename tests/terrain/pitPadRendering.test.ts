import { describe, expect, it } from 'vitest';
import { FloatType, NearestFilter, ShaderMaterial } from 'three';
import { PitPadField } from '../../src/game/race/PitPadField';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { createTerrainSample, createTerrainSurfaceSample, sampleTerrain, sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { createInkstormRoad } from '../../src/render/inkstorm/InkstormRoad';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField } from '../../src/game/race/CourseGulfField';

const pit = () => new PitPadField([], { minX: 10, minZ: -20, cellSize: 1, columns: 3, rows: 2,
  values: new Float32Array([-5, 3, 8, -2, 7, 12]) });

describe('shared workshop height rendering', () => {
  it('shares a rectangular R32F field through terrain passes and road and replaces it independently of gulfs', () => {
    const terrain = new TerrainSystem({ levels: 1 });
    const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
    const gulf = createCourseGulfField(course)!;
    const uniforms = terrain.gulfTextures.uniforms;
    const road = createInkstormRoad(course.getRenderData(64).points, true, false, uniforms);
    try {
      terrain.setPitPadField(pit());
      const texture = uniforms.uPitPad.value!;
      expect([texture.image.width, texture.image.height]).toEqual([3, 2]);
      expect(texture.type).toBe(FloatType); expect(texture.minFilter).toBe(NearestFilter);
      expect(uniforms.uPitPadBounds.value.toArray()).toEqual([10, -20, 3, 2]);
      for (const material of [terrain.materials.material, terrain.materials.depthMaterial,
        terrain.materials.normalMaterial, road.material as ShaderMaterial]) {
        expect(material.uniforms.uPitPad).toBe(uniforms.uPitPad);
        expect(material.uniforms.uPitPadBounds).toBe(uniforms.uPitPadBounds);
      }
      let released = 0; texture.addEventListener('dispose', () => released++);
      terrain.setCourseGulfField(gulf);
      const gulfTexture = uniforms.uCourseGulf0.value;
      expect(uniforms.uPitPad.value).toBe(texture);
      terrain.setPitPadField(pit());
      expect(released).toBe(1); expect(uniforms.uCourseGulf0.value).toBe(gulfTexture);
      const replacement = uniforms.uPitPad.value!;
      terrain.setCourseGulfField(null);
      expect(uniforms.uPitPad.value).toBe(replacement);
      let replacementReleased = 0; replacement.addEventListener('dispose', () => replacementReleased++);
      terrain.dispose(); terrain.dispose();
      expect(replacementReleased).toBe(1);
      expect(uniforms.uPitPad.value).toBeNull();
      expect(uniforms.uPitPadBounds.value.toArray()).toEqual([0, 0, 0, 0]);
    } finally { terrain.dispose(); road.geometry.dispose(); (road.material as ShaderMaterial).dispose(); }
  });

  it('uses the installed field in all physical height and normal samplers and resets conservative bounds', () => {
    const terrain = new TerrainSystem({ levels: 1 }), field = pit();
    const bounds = terrain.meshes[0]!.geometry.boundingBox!;
    const before = bounds.clone();
    try {
      terrain.setPitPadField(field);
      expect(bounds.min.y).toBe(before.min.y - 5); expect(bounds.max.y).toBe(before.max.y + 12);
      const x = 10.4, z = -19.3;
      const expected = sampleTerrain(x, z, createTerrainSample(), field);
      expect(terrain.sample(x, z, createTerrainSample())).toEqual(expected);
      expect(terrain.sampleHeight(x, z)).toBe(expected.height);
      expect(terrain.sampleSurface(x, z, createTerrainSurfaceSample()).height).toBe(expected.height);
      expect(terrain.sampleNormal(x, z, { x: 0, y: 0, z: 0 })).toEqual({
        x: expected.normalX, y: expected.normalY, z: expected.normalZ,
      });
      terrain.setPitPadField(null);
      expect(bounds).toEqual(before);
      expect(terrain.sampleHeight(x, z)).toBe(sampleTerrainHeight(x, z));
    } finally { terrain.dispose(); }
  });
});
