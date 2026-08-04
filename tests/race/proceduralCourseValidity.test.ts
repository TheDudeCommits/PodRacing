import { describe, expect, it } from 'vitest';
import {
  createProceduralPodraceCourse,
  type CourseSample,
  type CourseSectionTag,
} from '../../src/game/race';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const REQUIRED_SECTIONS = new Set<CourseSectionTag>([
  'start-straight',
  'fast-straight',
  'launch-crest',
  'wide-sweeper',
  'narrow-canyon',
  'chicane',
  'hairpin',
  'recovery-straight',
]);

function orientation(a: CourseSample, b: CourseSample, c: CourseSample): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsCross(
  a: CourseSample,
  b: CourseSample,
  c: CourseSample,
  d: CourseSample,
): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  const epsilon = 1e-5;
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}

function selfIntersectionCount(samples: readonly CourseSample[]): number {
  let intersections = 0;
  for (let left = 0; left < samples.length; left += 1) {
    const leftNext = (left + 1) % samples.length;
    for (let right = left + 1; right < samples.length; right += 1) {
      const rightNext = (right + 1) % samples.length;
      if (leftNext === right || rightNext === left) continue;
      if (left === 0 && rightNext === 0) continue;
      if (segmentsCross(
        samples[left]!,
        samples[leftNext]!,
        samples[right]!,
        samples[rightNext]!,
      )) intersections += 1;
    }
  }
  return intersections;
}

describe('procedural course population validity', () => {
  it('keeps a broad deterministic seed population closed, navigable and unique', () => {
    const signatures = new Set<string>();
    const seedCount = 96;

    for (let index = 0; index < seedCount; index += 1) {
      const seed = (Math.imul(index + 1, 0x9e37_79b9) ^ 0x504f_4452) >>> 0;
      const course = createProceduralPodraceCourse(terrain, seed);
      const repeat = createProceduralPodraceCourse(terrain, seed);
      const samples = Array.from({ length: 192 }, (_, sampleIndex) => (
        course.sampleAtProgress(sampleIndex / 192)
      ));
      const start = course.sampleAtProgress(0);
      const closure = course.sampleAtProgress(1);

      expect(repeat.signature).toBe(course.signature);
      expect(repeat.controlPoints).toEqual(course.controlPoints);
      expect(signatures.has(course.signature)).toBe(false);
      signatures.add(course.signature);
      expect(course.totalLength).toBeGreaterThan(4_500);
      expect(course.totalLength).toBeLessThan(10_000);
      expect(course.checkpoints.length).toBeGreaterThanOrEqual(3);
      expect(closure.x).toBeCloseTo(start.x, 7);
      expect(closure.z).toBeCloseTo(start.z, 7);
      expect(closure.tangentX).toBeCloseTo(start.tangentX, 7);
      expect(closure.tangentZ).toBeCloseTo(start.tangentZ, 7);

      const sections = new Set(course.controlPoints.map((point) => point.tag));
      for (const section of REQUIRED_SECTIONS) expect(sections.has(section)).toBe(true);

      let chordLength = 0;
      let maximumCurvature = 0;
      for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
        const sample = samples[sampleIndex]!;
        const next = samples[(sampleIndex + 1) % samples.length]!;
        expect([sample.x, sample.y, sample.z, sample.width, sample.curvature].every(Number.isFinite))
          .toBe(true);
        expect(Math.hypot(sample.tangentX, sample.tangentZ)).toBeCloseTo(1, 8);
        expect(sample.width).toBeGreaterThanOrEqual(14);
        expect(sample.width).toBeLessThanOrEqual(43);
        chordLength += Math.hypot(next.x - sample.x, next.z - sample.z);
        maximumCurvature = Math.max(maximumCurvature, Math.abs(sample.curvature));
      }
      expect(chordLength / course.totalLength).toBeGreaterThan(0.97);
      expect(chordLength / course.totalLength).toBeLessThanOrEqual(1.001);
      expect(maximumCurvature).toBeLessThan(0.12);
      expect(selfIntersectionCount(samples)).toBe(0);

      for (let probe = 0; probe < 16; probe += 1) {
        const sample = course.sampleAtProgress(probe / 16);
        const projected = course.projectPoint(sample.x, sample.z, sample.progress);
        expect(projected.distanceToCenter).toBeLessThan(0.4);
        expect(projected.lateralOffset).toBeCloseTo(0, 2);
      }
    }

    expect(signatures.size).toBe(seedCount);
  }, 15_000);
});
