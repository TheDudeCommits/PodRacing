import { describe, expect, it } from 'vitest';
import {
  createProceduralPodraceCourse,
  validatePodraceCourse,
} from '../../src/game/race/course';
import { validateCourseBranches } from '../../src/game/race/branches';
import { DESERT_REGION_ORDER } from '../../src/game/race/regions';
import {
  sampleTerrainHeight,
  sampleTerrainRegion,
} from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const fastTerrain = {
  heightAt: (x: number, z: number): number => (
    Math.sin(x * 0.008 + z * 0.003) * 4 + Math.cos(z * 0.006) * 2
  ),
};

describe('procedural region and branch grammar', () => {
  it('builds deterministic checkpoint-safe route decisions', () => {
    for (let seed = 0; seed < 24; seed += 1) {
      const first = createProceduralPodraceCourse(fastTerrain, seed);
      const second = createProceduralPodraceCourse(fastTerrain, seed);
      expect(second.region).toBe(first.region);
      expect(second.branches).toEqual(first.branches);
      expect(validateCourseBranches(first, first.branches).valid).toBe(true);
      expect(first.branches.length).toBeGreaterThanOrEqual(2);
      expect(first.branches.length).toBeLessThanOrEqual(3);

      for (const branch of first.branches) {
        expect(branch.entryProgress).toBeLessThan(branch.exitProgress);
        expect(first.checkpoints.some((checkpoint) => (
          checkpoint.progress > branch.entryProgress
          && checkpoint.progress < branch.exitProgress
        ))).toBe(false);
        const entry = first.sampleAtProgress(branch.entryProgress);
        const exit = first.sampleAtProgress(branch.exitProgress);
        expect(Math.hypot(branch.points[0]!.x - entry.x, branch.points[0]!.z - entry.z)).toBeLessThan(0.51);
        expect(Math.hypot(branch.points.at(-1)!.x - exit.x, branch.points.at(-1)!.z - exit.z)).toBeLessThan(0.51);
        for (let index = 1; index < branch.points.length; index += 1) {
          expect(branch.points[index]!.canonicalProgress).toBeGreaterThan(
            branch.points[index - 1]!.canonicalProgress,
          );
        }
        for (const point of branch.points) {
          expect(point.y).toBeCloseTo(fastTerrain.heightAt(point.x, point.z), 10);
        }
        const middle = branch.points[Math.floor(branch.points.length / 2)]!;
        const projection = first.projectPoint(middle.x, middle.z, middle.canonicalProgress);
        expect(projection.branchId).toBe(branch.id);
        expect(projection.progress).toBeCloseTo(middle.canonicalProgress, 3);
      }
      expect(first.getMinimapData().branches).toEqual(first.branches);
    }
  });

  it('covers all six deterministic regions and materially varied feature orders', () => {
    const regions = new Set<string>();
    const signatures = new Set<string>();
    const featureOrders = new Set<string>();
    for (let seed = 1; seed <= 96; seed += 1) {
      const course = createProceduralPodraceCourse(fastTerrain, seed * 0x9e37);
      expect(validateCourseBranches(course, course.branches).valid).toBe(true);
      regions.add(course.region);
      expect(course.controlPoints.every((point) => (
        sampleTerrainRegion(point.x) === course.region
      ))).toBe(true);
      expect(course.branches.every((branch) => branch.points.every((point) => (
        sampleTerrainRegion(point.x) === course.region
      )))).toBe(true);
      signatures.add(course.signature);
      featureOrders.add(course.controlPoints.map((point) => point.tag).join('|'));
    }
    expect(regions).toEqual(new Set(DESERT_REGION_ORDER));
    expect(signatures.size).toBe(96);
    expect(featureOrders.size).toBeGreaterThan(4);
  }, 15_000);

  it('publishes a dense validation receipt for production terrain seeds', () => {
    const invalid: Array<{ seed: number; reasons: readonly string[] }> = [];
    for (let seed = 0; seed < 48; seed += 1) {
      const course = createProceduralPodraceCourse(terrain, seed * 7_919 + 17);
      const report = validatePodraceCourse(course);
      if (!report.valid) invalid.push({ seed, reasons: report.reasons });
      expect(
        report.metrics.branchCount,
        `seed ${seed}: ${report.reasons.join(',')}`,
      ).toBeGreaterThanOrEqual(2);
      expect(report.metrics.length).toBeGreaterThan(5_800);
      expect(report.metrics.minimumSelfClearance).toBeGreaterThanOrEqual(42);
    }
    expect(invalid).toEqual([]);
  });
});
