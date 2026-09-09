import { describe, expect, it } from 'vitest';
import { FloatType, NearestFilter, ShaderMaterial, Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import {
  COURSE_GULF_MAX_DEPTH, COURSE_GULF_MAX_RISE, COURSE_GULF_SEED, SALT_RUN_PROFILE, FORK_APPROACH_PROFILE, createCourseGulfField,
  sampleCourseGulfGrid,
} from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight, sampleTerrain, createTerrainSample } from '../../src/render/terrain/terrainMath';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';
import { createInkstormRoad } from '../../src/render/inkstorm/InkstormRoad';
import { createInkstormShadows } from '../../src/render/inkstorm/InkstormShadows';
import { RaceCourseView } from '../../src/render/objects/RaceCourseView';

const base = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(base, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;

describe('shared flagship off-road gulf', () => {
  it('is deterministic, bounds signed launch heights and retains both full-depth floors', () => {
    const second = createCourseGulfField(course)!;
    for (let i = 0; i < 2; i += 1) {
      const grid = field.grids[i]!, copy = second.grids[i]!;
      expect(copy.values).toEqual(grid.values);
      let minimum = 0, maximum = 0, negative = 0, nonFinite = 0;
      for (const value of grid.values) {
        nonFinite += Number(!Number.isFinite(value));
        maximum = Math.max(maximum, value);
        minimum = Math.min(minimum, value);
        negative += Number(value < -100);
      }
      // Inspect every texel, then assert the aggregate invariants. Hundreds of
      // thousands of matcher allocations otherwise dominate the full suite.
      expect(nonFinite).toBe(0);
      expect(maximum).toBeLessThanOrEqual(COURSE_GULF_MAX_RISE);
      expect(minimum).toBe(-grid.depth);
      expect(minimum).toBeGreaterThanOrEqual(-COURSE_GULF_MAX_DEPTH);
      expect(negative).toBeGreaterThan(1_000);
      if (grid.name === 'launch') expect(maximum).toBeGreaterThan(200);
      else {
        expect(maximum).toBe(0);
        expect(field.sampleOffset(grid.centerX, grid.centerZ)).toBeLessThan(-100);
      }
    }
  });

  it('preserves main lanes outside the authored salt/descent/fork profiles, their ten metre margin and physics/MRT probes', () => {
    let maximumOffset = 0;
    // Fractions deliberately differ from the 2048-point protection polyline.
    for (let i = 0; i < 8192; i += 1) {
      const p = course.samplePlanAtProgress((i + .371) / 8192);
      if (p.distance > SALT_RUN_PROFILE.startDistance - 24 && p.distance < SALT_RUN_PROFILE.endDistance + 24) continue;
      if (p.distance > field.launchProfile.startDistance - 24 && p.distance < field.launchProfile.endDistance + 24) continue;
      const forkEntry = course.branches.find(branch => branch.elevated)!.entryProgress * course.totalLength;
      if (p.distance > forkEntry + FORK_APPROACH_PROFILE.start - 24 && p.distance < forkEntry + FORK_APPROACH_PROFILE.end + 24) continue;
      for (const lateral of [-p.width - 10, -p.width, 0, p.width, p.width + 10]) {
        const x = p.x + p.rightX * lateral, z = p.z + p.rightZ * lateral;
        for (const [dx, dz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
          maximumOffset = Math.max(maximumOffset, Math.abs(field.sampleOffset(x + dx!, z + dz!)));
        }
      }
    }
    expect(maximumOffset).toBe(0);
  });

  it('preserves the full width and normal clearance of every branch, including deck joins', () => {
    let maximumOffset = 0;
    for (const branch of course.branches) {
      for (let i = 0; i < branch.points.length - 1; i += 1) {
        const a = branch.points[i]!, b = branch.points[i + 1]!;
        const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
        for (const t of [0, .123, .5, .877, 1]) {
          const width = a.width + (b.width - a.width) * t;
          // The fork's old extra off-road shoulder now joins the main lane.
          // Actual branch floors and both CPU/MRT normal footprints remain exact.
          for (const lateral of [-width - 1.15, -width, 0, width, width + 1.15]) {
            const x = a.x + dx * t + dz / length * lateral;
            const z = a.z + dz * t - dx / length * lateral;
            maximumOffset = Math.max(maximumOffset, Math.abs(field.sampleOffset(x, z)));
          }
        }
      }
    }
    expect(maximumOffset).toBe(0);
    expect(field.sampleOffset(18352.95, -682.02)).toBe(0); // cleared central divider island
  });

  it('matches the GPU four-texel bilinear calculation at arbitrary interior and boundary coordinates', () => {
    const grid = field.grids[0];
    for (let i = 0; i < 1500; i += 1) {
      const gx = ((i * 73) % 255) + .37, gz = ((i * 47) % 255) + .81;
      const index = Math.floor(gz) * grid.size + Math.floor(gx);
      const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
      const expected = mix(mix(grid.values[index]!, grid.values[index + 1]!, .37),
        mix(grid.values[index + grid.size]!, grid.values[index + grid.size + 1]!, .37), .81);
      expect(sampleCourseGulfGrid(grid, grid.minX + gx * grid.cellSize, grid.minZ + gz * grid.cellSize)).toBeCloseTo(expected, 8);
    }
    expect(field.sampleOffset(0, 0)).toBe(0);
    expect(sampleCourseGulfGrid(grid, grid.minX - .01, grid.minZ)).toBe(0);
    expect(sampleCourseGulfGrid(grid, grid.minX + (grid.size - 1) * grid.cellSize, grid.minZ)).toBe(0);
  });

  it('uses the same physical field in standalone races and never leaks into another course', () => {
    const race = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
    const peer = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
    expect(race.course.signature).toBe(course.signature);
    expect(race.course.checkpoints.map(({y: _y, ...p}) => p)).toEqual(course.checkpoints.map(({y: _y, ...p}) => p));
    for (const checkpoint of race.course.checkpoints) expect(checkpoint.y).toBe(race.course.heightAt(checkpoint.x, checkpoint.z));
    expect(race.course.branches).toEqual(course.branches);
    const { centerX: x, centerZ: z } = field.grids[0];
    const expected = base.heightAt(x, z) + field.sampleOffset(x, z);
    expect(race.terrain.heightAt(x, z)).toBe(expected);
    expect(race.course.heightAt(x, z)).toBe(expected);
    expect(peer.terrain.heightAt(x, z)).toBe(expected);
    expect(field.sampleOffset(x, z)).not.toBe(0);
    const expedition = new RaceSimulation({ terrain: base, seed: 1234, competitionProfile: 'time-trial' });
    expect(expedition.courseGulfField).toBeNull();
    expect(expedition.terrain.heightAt(x, z)).toBe(base.heightAt(x, z));
    expect(expedition.course.heightAt(x, z)).toBe(base.heightAt(x, z));
    expect(createCourseGulfField(expedition.course)).toBeNull();
    const supplied = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, course, competitionProfile: 'time-trial' });
    expect(supplied.course).toBe(course);
    expect(supplied.courseGulfField).toBeNull();
    expect(supplied.terrain.heightAt(x, z)).toBe(base.heightAt(x, z));
    expect(supplied.course.heightAt(x, z)).toBe(base.heightAt(x, z));
  });
});

describe('gulf render lifecycle', () => {
  it('shares sampler uniforms through beauty/depth/normal/roads/shadows/guides and disposes on course changes', () => {
    const terrain = new TerrainSystem({ levels: 2 });
    const uniforms = terrain.gulfTextures.uniforms;
    const road = createInkstormRoad(course.getRenderData(128).points, true, false, uniforms);
    const shadows = createInkstormShadows([], uniforms);
    const guides = new RaceCourseView();
    guides.setTerrainSampler((x, z) => terrain.sampleHeight(x, z), uniforms);
    guides.setCourse(course.getRenderData(128));
    terrain.setCourseGulfField(field);
    for (const material of [terrain.materials.material, terrain.materials.depthMaterial, terrain.materials.normalMaterial,
      road.material, shadows.material, ...guides.children.filter(child => child.name === 'conforming-racing-line').map(child => (child as typeof road).material)]) {
      expect(material).toBeInstanceOf(ShaderMaterial);
      expect((material as ShaderMaterial).uniforms.uCourseGulf0).toBe(uniforms.uCourseGulf0);
    }
    const texture = uniforms.uCourseGulf0.value!;
    expect(texture.type).toBe(FloatType);
    expect(texture.minFilter).toBe(NearestFilter);
    expect(texture.image.data).toBe(field.grids[0].values);
    let disposed = 0;
    texture.addEventListener('dispose', () => { disposed += 1; });
    const p = field.grids[0];
    expect(terrain.sampleHeight(p.centerX, p.centerZ)).toBe(sampleTerrainHeight(p.centerX, p.centerZ) + field.sampleOffset(p.centerX, p.centerZ));
    terrain.setCourseGulfField(null);
    expect(disposed).toBe(1);
    expect(uniforms.uCourseGulf0.value).toBeNull();
    expect(uniforms.uCourseGulfBounds0.value.w).toBe(0);
    expect(terrain.sampleHeight(p.centerX, p.centerZ)).toBe(sampleTerrainHeight(p.centerX, p.centerZ));
    terrain.setCourseGulfField(field);
    const replacement = uniforms.uCourseGulf0.value!;
    let replacementDisposed = 0;
    replacement.addEventListener('dispose', () => { replacementDisposed += 1; });
    terrain.dispose(); expect(replacementDisposed).toBe(1);
    guides.dispose(); road.geometry.dispose(); (road.material as ShaderMaterial).dispose();
    shadows.dispose(); shadows.geometry.dispose(); (shadows.material as ShaderMaterial).dispose();
  });

  it('updates displaced normals and bounds contain every possible floor, summit and skirt', () => {
    const terrain = new TerrainSystem(); terrain.setCourseGulfField(field);
    const p = field.grids[0];
    const x = p.centerX + 390, z = p.centerZ + 35;
    const sample = terrain.sample(x, z, createTerrainSample());
    const reference = sampleTerrain(x, z, createTerrainSample(), field);
    expect(sample).toEqual(reference);
    const normal = terrain.sampleNormal(x, z, { x: 0, y: 0, z: 0 });
    expect(normal.x).toBe(reference.normalX); expect(normal.z).toBe(reference.normalZ);
    for (const mesh of terrain.meshes) {
      const bounds = mesh.geometry.boundingBox!, sphere = mesh.geometry.boundingSphere!;
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        const bottom = new Vector3(positions.getX(i), positions.getY(i) - 72 - COURSE_GULF_MAX_DEPTH, positions.getZ(i));
        const top = new Vector3(positions.getX(i), positions.getY(i) + 72 + COURSE_GULF_MAX_RISE, positions.getZ(i));
        expect(bounds.containsPoint(bottom)).toBe(true);
        expect(bounds.containsPoint(top)).toBe(true);
        expect(sphere.distanceToPoint(bottom)).toBeLessThanOrEqual(1e-9);
        expect(sphere.distanceToPoint(top)).toBeLessThanOrEqual(1e-9);
      }
    }
    terrain.setCourseGulfField(null);
    for (const mesh of terrain.meshes) {
      expect(mesh.geometry.boundingBox!.min.y).toBe(mesh.geometry.userData.terrainBaseMinY);
      expect(mesh.geometry.boundingBox!.max.y).toBe(mesh.geometry.userData.terrainBaseMaxY);
    }
    terrain.dispose();
  }, 20_000);
});
