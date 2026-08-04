import { describe, expect, it } from 'vitest';
import {
  createProceduralPodraceCourse,
  createRaceSimulation,
  generatePodraceControlPoints,
  type CourseSectionTag,
} from '../../src/game/race';
import type { HeightSampler } from '../../src/game/simulation/types';

const terrain: HeightSampler = {
  heightAt(x, z) {
    return Math.sin(x * 0.011 + z * 0.003) * 3.2 + Math.cos(z * 0.007) * 1.6;
  },
};

function sampledPlan(course: ReturnType<typeof createProceduralPodraceCourse>): readonly number[] {
  return Array.from({ length: 32 }, (_, index) => {
    const sample = course.sampleAtProgress(index / 32);
    return [sample.x, sample.z, sample.width];
  }).flat();
}

const REQUIRED_TAGS = new Set<CourseSectionTag>([
  'start-straight',
  'fast-straight',
  'launch-crest',
  'wide-sweeper',
  'narrow-canyon',
  'chicane',
  'hairpin',
  'recovery-straight',
]);

interface PlanPoint {
  x: number;
  z: number;
}

function orientation(a: PlanPoint, b: PlanPoint, c: PlanPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsCross(a: PlanPoint, b: PlanPoint, c: PlanPoint, d: PlanPoint): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0));
}

function hasSampledSelfIntersection(points: readonly PlanPoint[]): boolean {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    const a = points[first];
    const b = points[firstNext];
    if (!a || !b) continue;
    for (let second = first + 2; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      // Adjacent segments share an endpoint; the closing segment is also
      // adjacent to segment zero in this closed polyline.
      if (secondNext === first || firstNext === second) continue;
      const c = points[second];
      const d = points[secondNext];
      if (c && d && segmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

describe('procedural course seed lifecycle', () => {
  it('reconstructs byte-stable course identity and geometry from one seed', () => {
    const seed = 0x9b71_28e4;
    const firstPoints = generatePodraceControlPoints(seed);
    const secondPoints = generatePodraceControlPoints(seed);
    const first = createProceduralPodraceCourse(terrain, seed);
    const second = createProceduralPodraceCourse(terrain, seed);

    expect(secondPoints).toEqual(firstPoints);
    expect(second.seed).toBe(seed >>> 0);
    expect(second.signature).toBe(first.signature);
    expect(second.controlPoints).toEqual(first.controlPoints);
    expect(sampledPlan(second)).toEqual(sampledPlan(first));
  });

  it('gives consecutive race seeds materially different plans while preserving contracts', () => {
    const first = createProceduralPodraceCourse(terrain, 0x0f31_a2b4);
    const second = createProceduralPodraceCourse(terrain, 0x0f31_a2b5);

    expect(second.seed).not.toBe(first.seed);
    expect(second.signature).not.toBe(first.signature);
    expect(sampledPlan(second)).not.toEqual(sampledPlan(first));
    expect(second.checkpoints).toHaveLength(first.checkpoints.length);
    expect(new Set(second.controlPoints.map((point) => point.tag))).toEqual(
      new Set(first.controlPoints.map((point) => point.tag)),
    );
    expect(second.controlPoints.map((point) => point.tag)).not.toEqual(
      first.controlPoints.map((point) => point.tag),
    );
    expect(second.controlPoints.map((point) => point.checkpoint === true)).toEqual(
      first.controlPoints.map((point) => point.checkpoint === true),
    );
  });

  it('keeps reset deterministic but builds a new course for a new race seed', () => {
    const firstSeed = 0x1357_2468;
    const secondSeed = 0x2468_1357;
    const race = createRaceSimulation({ terrain, seed: firstSeed });
    const originalSignature = race.course.signature;
    const originalPlan = sampledPlan(race.course);

    race.step({ throttle: 1 });
    race.reset();

    expect(race.state.seed).toBe(firstSeed);
    expect(race.course.signature).toBe(originalSignature);
    expect(sampledPlan(race.course)).toEqual(originalPlan);

    const rematch = createRaceSimulation({ terrain, seed: secondSeed });
    expect(rematch.state.seed).toBe(secondSeed);
    expect(rematch.course.signature).not.toBe(originalSignature);
    expect(sampledPlan(rematch.course)).not.toEqual(originalPlan);
  });

  it('keeps a bounded 128-seed production sweep finite, closed and non-intersecting', () => {
    const signatures = new Set<string>();
    for (let seed = 0; seed < 128; seed += 1) {
      const course = createProceduralPodraceCourse(terrain, seed, {
        arcSamplesPerSegment: 16,
        projectionSamples: 512,
      });
      const samples = Array.from({ length: 96 }, (_, index) => (
        course.sampleAtProgress(index / 96)
      ));
      const closure = course.sampleAtProgress(1);
      const start = course.sampleAtProgress(0);
      const xs = samples.map((sample) => sample.x);
      const zs = samples.map((sample) => sample.z);
      const spanX = Math.max(...xs) - Math.min(...xs);
      const spanZ = Math.max(...zs) - Math.min(...zs);

      expect(course.seed).toBe(seed);
      expect(signatures.has(course.signature)).toBe(false);
      signatures.add(course.signature);
      expect(course.totalLength).toBeGreaterThan(5_500);
      expect(course.totalLength).toBeLessThan(11_000);
      expect(spanX).toBeGreaterThan(1_000);
      expect(spanZ).toBeGreaterThan(1_000);
      expect(spanX).toBeLessThan(4_000);
      expect(spanZ).toBeLessThan(4_000);
      expect(closure.x).toBeCloseTo(start.x, 8);
      expect(closure.z).toBeCloseTo(start.z, 8);
      expect(closure.tangentX).toBeCloseTo(start.tangentX, 7);
      expect(closure.tangentZ).toBeCloseTo(start.tangentZ, 7);
      expect(course.checkpoints).toHaveLength(10);
      expect(new Set(course.controlPoints.map((point) => point.tag))).toEqual(REQUIRED_TAGS);
      expect(course.controlPoints[0]?.checkpoint).toBe(true);
      expect(course.controlPoints.every((point) => (
        Number.isFinite(point.x)
        && Number.isFinite(point.z)
        && Number.isFinite(point.width)
        && point.width >= 14
        && point.width <= 43
      ))).toBe(true);
      expect(samples.every((sample) => (
        Number.isFinite(sample.x)
        && Number.isFinite(sample.y)
        && Number.isFinite(sample.z)
        && Number.isFinite(sample.curvature)
      ))).toBe(true);
      expect(hasSampledSelfIntersection(samples)).toBe(false);
    }
    expect(signatures.size).toBe(128);
  }, 15_000);

  it('places every named trap inside its intended section on varied courses', () => {
    const intendedTags: Readonly<Record<string, CourseSectionTag>> = {
      'geyser-launch': 'launch-crest',
      'vent-canyon': 'narrow-canyon',
      'fall-chicane': 'chicane',
      'dust-hairpin': 'hairpin',
    };
    for (const seed of [0, 1, 17, 117, 0x504f_4452, 0xffff_ffff]) {
      const course = createProceduralPodraceCourse(terrain, seed, {
        arcSamplesPerSegment: 16,
        projectionSamples: 512,
      });
      const race = createRaceSimulation({ terrain, course, seed });
      for (const hazard of race.state.galacticWorld.hazards) {
        const intended = intendedTags[hazard.id];
        if (!intended) continue;
        expect(course.sampleAtProgress(hazard.progress).tag).toBe(intended);
      }
    }
  });
});
