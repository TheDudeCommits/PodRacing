import { describe, expect, it } from 'vitest';
import { Frustum, Matrix4, OrthographicCamera } from 'three';
import {
  COURSE_GULF_MAX_RISE, CourseGulfField, combineCourseGulfOffsets,
  type CourseGulfGrid, type LaunchElevationProfile,
} from '../../src/game/race/CourseGulfField';
import {
  LAUNCH_INDUSTRIAL_BENCHES, LAUNCH_INDUSTRIAL_CENTER,
  LAUNCH_LANDSCAPE_BOUNDS, launchRidgeSurface,
} from '../../src/game/race/LaunchBasinPlan';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';

const profile: LaunchElevationProfile = {
  startDistance: 0, crestDistance: 1, floorDistance: 2, basinEndDistance: 3,
  endDistance: 4, crestHeight: 0, floorHeight: -1, endHeight: 0, fullWidth: 1, fadeWidth: 2,
};
const grid = (name: CourseGulfGrid['name'], values: number[], minX = 0): CourseGulfGrid => ({
  name, minX, minZ: 0, cellSize: 1, size: 2, values: new Float32Array(values),
  centerX: minX + .5, centerZ: .5, depth: 170,
});

describe('bounded signed terrain lifecycle', () => {
  it('retains positive mountains, legacy cut overlap and continuous opposed-sign overlap', () => {
    for (const [a, b, expected] of [[90, 0, 90], [0, 90, 90], [-90, 0, -90],
      [-90, -30, -90], [90, 30, 90], [90, -30, 60], [-90, 30, -60], [0, 0, 0]]) {
      expect(combineCourseGulfOffsets(a!, b!)).toBe(expected);
    }
    // A vanishing depression cannot erase an entire positive mountain.
    expect(combineCourseGulfOffsets(90, -1e-7)).toBeCloseTo(90, 6);
    expect(combineCourseGulfOffsets(90, 1e-7)).toBe(90);
    const raised = grid('launch', [40, 80, 120, 160]);
    const empty = grid('finish', [0, 0, 0, 0], 100);
    expect(new CourseGulfField([raised, empty], profile).sampleOffset(.5, .5)).toBe(100);
    const overlap = grid('finish', [-10, -10, -10, -10]);
    expect(new CourseGulfField([raised, overlap], profile).sampleOffset(.5, .5)).toBe(90);
    expect(new CourseGulfField([raised, overlap], profile).sampleOffset(3, 3)).toBe(0);
  });

  it('keeps raised peaks inside the frustum bounds and restores both bounds on course exit', () => {
    const terrain = new TerrainSystem({ levels: 1 });
    const mesh = terrain.meshes[0]!;
    const before = mesh.geometry.boundingBox!.clone();
    const sphereBefore = mesh.geometry.boundingSphere!.clone();
    const field = new CourseGulfField([
      grid('launch', [250, 250, 250, 250]), grid('finish', [0, 0, 0, 0], 100),
    ], profile);
    const camera = new OrthographicCamera(-20, 20, 10, -10, 1, 600);
    camera.position.set(0, 260, 300); camera.lookAt(0, 260, 0); camera.updateMatrixWorld(true);
    const frustum = new Frustum().setFromProjectionMatrix(new Matrix4()
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    mesh.updateMatrixWorld(true);
    expect(frustum.intersectsObject(mesh)).toBe(false);
    terrain.setCourseGulfField(field);
    expect(mesh.geometry.boundingBox!.max.y).toBe(before.max.y + COURSE_GULF_MAX_RISE);
    expect(frustum.intersectsObject(mesh)).toBe(true);
    terrain.setCourseGulfField(null);
    expect(mesh.geometry.boundingBox).toEqual(before);
    expect(mesh.geometry.boundingSphere).toEqual(sphereBefore);
    terrain.dispose();
  });

  it('contains full refinery terrace disks and closes the landscape domain without a raised cutoff', () => {
    for (const bench of LAUNCH_INDUSTRIAL_BENCHES) {
      const diskRadius = Math.hypot(bench.halfForward, bench.halfRight) + 8;
      expect(Math.hypot(bench.forward - LAUNCH_INDUSTRIAL_CENTER.forward,
        bench.right - LAUNCH_INDUSTRIAL_CENTER.right) + diskRadius).toBeLessThanOrEqual(LAUNCH_INDUSTRIAL_CENTER.radius);
      const target = launchRidgeSurface(bench.forward, bench.right);
      expect(target.height).toBe(bench.height); expect(target.weight).toBe(1);
    }
    const bounds = LAUNCH_LANDSCAPE_BOUNDS;
    for (let i = 0; i <= 100; i++) {
      const f = bounds.minForward + (bounds.maxForward - bounds.minForward) * i / 100;
      const r = bounds.minRight + (bounds.maxRight - bounds.minRight) * i / 100;
      expect(launchRidgeSurface(f, bounds.minRight).weight).toBe(0);
      expect(launchRidgeSurface(f, bounds.maxRight).weight).toBe(0);
      expect(launchRidgeSurface(bounds.minForward, r).weight).toBe(0);
      expect(launchRidgeSurface(bounds.maxForward, r).weight).toBe(0);
    }
  });
  it('keeps disjoint padded bench cores flat and blends every nearby transition without height jumps', () => {
    for (const [index, bench] of LAUNCH_INDUSTRIAL_BENCHES.entries()) {
      for (const other of LAUNCH_INDUSTRIAL_BENCHES.slice(index + 1)) {
        const forwardGap = Math.abs(bench.forward - other.forward) - bench.halfForward - other.halfForward - 24;
        const rightGap = Math.abs(bench.right - other.right) - bench.halfRight - other.halfRight - 24;
        expect(Math.max(forwardGap, rightGap)).toBeGreaterThan(0);
      }
      for (let row = -12; row <= 12; row++) for (let col = -12; col <= 12; col++) {
        const f = bench.forward + row / 12 * (bench.halfForward + 12);
        const r = bench.right + col / 12 * (bench.halfRight + 12);
        const surface = launchRidgeSurface(f, r);
        expect(surface.height).toBeCloseTo(bench.height, 9);
        expect(surface.weight).toBe(1);
      }
    }
    // A one-millimetre perturbation cannot cross a 35m dominant-weight seam.
    // Check the entire composition, including ridge segment ties and yard aprons.
    const bounds = LAUNCH_LANDSCAPE_BOUNDS;
    const effectiveHeight = (f: number, r: number): number => {
      const p = launchRidgeSurface(f, r);
      return -170 + (p.height + 170) * p.weight;
    };
    let maximumStep = 0;
    for (let f = bounds.minForward; f <= bounds.maxForward; f += 9.73) {
      for (let r = bounds.minRight; r <= bounds.maxRight; r += 9.37) {
        const y = effectiveHeight(f, r);
        maximumStep = Math.max(maximumStep, Math.abs(effectiveHeight(f + .001, r) - y),
          Math.abs(effectiveHeight(f, r + .001) - y));
      }
    }
    expect(maximumStep).toBeLessThan(.02);
  });

});
