import { describe, expect, it } from 'vitest';
import { Vector3, PerspectiveCamera } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import {
  COURSE_GULF_MAX_RISE, COURSE_GULF_SEED, createCourseGulfField, extendLaunchBasin, getLaunchBasinAnchor,
  sampleCourseGulfGrid, type CourseGulfGrid,
} from '../../src/game/race/CourseGulfField';
import { getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const base = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(base, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;
const contribution: CourseGulfGrid = { ...field.grids[0], values: new Float32Array(field.grids[0].values.length) };
extendLaunchBasin(contribution, course);

describe('signed launch landscape preserves the existing racing surface', () => {
  it('leaves the whole existing main/branch lane plus ten metres and CPU/MRT normal probes exactly unchanged', () => {
    let maximumContribution = 0;
    const check = (x: number, z: number): void => {
      for (const [dx, dz] of [[0, 0], [.85, 0], [-.85, 0], [0, .85], [0, -.85], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
        maximumContribution = Math.max(maximumContribution, Math.abs(sampleCourseGulfGrid(contribution, x + dx!, z + dz!)));
      }
    };
    for (let i = 0; i < 8192; i++) {
      const p = course.samplePlanAtProgress((i + .371) / 8192);
      for (const lateral of [-p.width - 10, -p.width, -p.width * .5, 0, p.width * .5, p.width, p.width + 10]) {
        check(p.x + p.rightX * lateral, p.z + p.rightZ * lateral);
      }
    }
    for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (const fraction of [0, .123, .5, .877, 1]) {
        const width = a.width + (b.width - a.width) * fraction;
        for (const lateral of [-width - 10, -width, 0, width, width + 10]) {
          check(a.x + dx * fraction + dz / length * lateral, a.z + dz * fraction - dx / length * lateral);
        }
      }
    }
    expect(maximumContribution).toBe(0);
    // The complete bilinear/probe footprint receives no authoring contribution.
    // This includes the already-authored launch grade and its physical normals.
  });

  it('opens the real central sightline through the former far dune bank using the existing bounded textures', () => {
    const anchor = getLaunchBasinAnchor(course)!;
    const world = (forward: number, right: number) => ({
      x: anchor.x + anchor.tangentX * forward - anchor.rightX * right,
      z: anchor.z + anchor.tangentZ * forward - anchor.rightZ * right,
    });
    for (let forward = 650; forward <= 1250; forward += 25) for (const right of [-100, 0, 100]) {
      const p = world(forward, right);
      expect(base.heightAt(p.x, p.z) + field.sampleOffset(p.x, p.z)).toBeLessThan(-125);
    }
    // The distant bank no longer fills the vertical reveal: a ray from the real
    // launch eye to low ground a kilometre away remains clear of physical terrain.
    const origin = course.sampleAtProgress(anchor.progress);
    const eyeY = origin.y + field.sampleOffset(origin.x, origin.z) + 12;
    const destination = world(1150, 60);
    const floor = base.heightAt(destination.x, destination.z) + field.sampleOffset(destination.x, destination.z);
    for (let i = 15; i < 100; i++) {
      const t = i / 100, x = origin.x + (destination.x - origin.x) * t, z = origin.z + (destination.z - origin.z) * t;
      const rayY = eyeY + (floor + 20 - eyeY) * t;
      expect(rayY - base.heightAt(x, z) - field.sampleOffset(x, z)).toBeGreaterThan(0);
    }
    expect(field.grids.map(grid => grid.size)).toEqual([417, 257]);
    expect(field.grids.reduce((bytes, grid) => bytes + grid.values.byteLength, 0)).toBe(959_752);
    for (const grid of field.grids) {
      let minimum = 0, maximum = -Infinity;
      for (const value of grid.values) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
      expect(minimum).toBeGreaterThanOrEqual(-170);
      expect(maximum).toBeLessThanOrEqual(COURSE_GULF_MAX_RISE);
      if (grid.name === 'launch') expect(maximum).toBeGreaterThan(200);
      else expect(maximum).toBe(0);
      for (let i = 0; i < grid.size; i++) {
        expect(grid.values[i]).toBe(0); expect(grid.values[(grid.size - 1) * grid.size + i]).toBe(0);
        expect(grid.values[i * grid.size]).toBe(0); expect(grid.values[i * grid.size + grid.size - 1]).toBe(0);
      }
    }
  });

  it('stages sparse accents on the connected physical ridges and projects the citadel to the right of the launch view', () => {
    const race = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
    const plan = getInkstormVistaPlan(race.course, race.terrain.heightAt), c = plan.citadel!;
    // Physical terrain owns continuity. Preserve the original sparse ridge
    // accent budget; the separate shoulder-depth family has its own five-scan
    // limit. Its real GLB triangle/footprint budget is independently checked in
    // inkstormLaunchDepth.test.ts, not absorbed into a larger accent allowance.
    const accents = plan.landforms.filter(form => form.ridgeId !== undefined);
    const depthForms = plan.landforms.filter(form => form.depthLayer !== undefined);
    expect(accents.length).toBeGreaterThanOrEqual(6);
    expect(accents.length).toBeLessThanOrEqual(10);
    expect(new Set(accents.map(form => form.ridgeId)).size).toBe(3);
    expect(depthForms.length).toBeGreaterThan(0);
    expect(depthForms.length).toBeLessThanOrEqual(5);
    expect(new Set(depthForms.map(form => form.depthLayer))).toEqual(new Set(['near', 'middle', 'far']));
    expect(accents.every(form => form.depthLayer === undefined && form.id.startsWith('launch-ridge-'))).toBe(true);
    expect(depthForms.every(form => form.ridgeId === undefined && form.id.startsWith('launch-depth-'))).toBe(true);
    const compositionForms = plan.landforms.filter(form => form.compositionLayer);
    expect(compositionForms).toHaveLength(3);
    expect(compositionForms.every(form => form.ridgeId === undefined && form.depthLayer === undefined
      && form.id.startsWith('launch-composition-'))).toBe(true);
    expect(accents.every(form => form.compositionLayer === undefined)).toBe(true);
    expect(depthForms.every(form => form.compositionLayer === undefined)).toBe(true);
    // No unclassified or doubly classified form can evade any group's cap.
    // The new group's separate actual high/LOD budget is checked in
    // inkstormLaunchDepth; both older group limits above stay unchanged.
    expect(accents.length + depthForms.length + compositionForms.length).toBe(plan.landforms.length);
    expect(plan.terraces).toHaveLength(3);
    const screenRight = -(c.x - c.launch.x) * c.launch.rightX - (c.z - c.launch.z) * c.launch.rightZ;
    expect(screenRight).toBeGreaterThanOrEqual(330); expect(screenRight).toBeLessThanOrEqual(420);
    const camera = new PerspectiveCamera(65, 16 / 9, .1, 3000);
    camera.position.set(c.launch.x, c.launch.y + 12, c.launch.z);
    camera.lookAt(c.launch.x + c.launch.tangentX * 120, c.launch.y + 12, c.launch.z + c.launch.tangentZ * 120);
    camera.updateMatrixWorld(true);
    const projected = new Vector3(c.x, c.y, c.z).project(camera);
    expect(projected.x).toBeGreaterThan(.3); expect(projected.x).toBeLessThan(.65);
    expect(getLaunchBasinAnchor(createProceduralPodraceCourse(base, 1234))).toBeNull();
  });
});
