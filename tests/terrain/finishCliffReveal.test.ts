import { finishGulfRound17 as baseline } from './finishGulfRound17';
import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField, sampleCourseGulfGrid } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;


describe('physical finish cliff reveal', () => {
  it('keeps the two-grid allocation unchanged as the off-road launch landscape evolves', () => {
    expect(field.grids.map(grid => grid.size)).toEqual([417, 257]);
    expect(field.grids.reduce((sum, grid) => sum + grid.values.byteLength, 0)).toBe(959752);
  });

  it('exposes the real interpolated cliff near the round17 finish view without moving its protected shoulder', () => {
    for (const section of baseline.samples) for (const sample of section.offsets) {
      const offset = sampleCourseGulfGrid(field.grids[1], sample.x, sample.z);
      expect(offset).toBeLessThanOrEqual(sample.finishOffset + 1e-6);
      if (sample.margin === 15) expect(offset).toBe(sample.finishOffset);
    }
    const finish = baseline.samples.find(sample => Math.abs(sample.progress - .83203125) < 1e-6)!;
    for (const [margin, minimumDepth, improvement] of [[35, 75, 60], [45, 140, 100]]) {
      const sample = finish.offsets.find(point => point.margin === margin)!;
      const offset = sampleCourseGulfGrid(field.grids[1], sample.x, sample.z);
      expect(offset).toBeLessThan(-minimumDepth!);
      expect(sample.finishOffset - offset).toBeGreaterThan(improvement!);
    }
  });
});
