import { describe, expect, it } from 'vitest';
import {
  PODRACE_CONTROL_POINTS,
  createPodraceCourse,
  createProceduralPodraceCourse,
  generatePodraceControlPoints,
  validatePodraceCourse,
  type CourseSectionTag,
} from '../../src/game/race';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const productionTerrain = { heightAt: sampleTerrainHeight };
const flatTerrain = { heightAt: () => 0 };
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

function pathologicalTemplate() {
  // Finite and correctly checkpointed, but only centimetres across and with
  // its section grammar erased. No randomized attempt can satisfy either the
  // 5.8 km floor or required set pieces, forcing certified recovery.
  return Object.freeze(PODRACE_CONTROL_POINTS.map((point, index) => Object.freeze({
    ...point,
    x: (index % 4) * 0.002,
    z: Math.floor(index / 4) * 0.002,
    tag: 'start-straight' as const,
  })));
}

describe('procedural course recovery guarantee', () => {
  it('replaces an exhausted invalid candidate population with a validated deterministic plan', () => {
    const fixture = pathologicalTemplate();
    const first = generatePodraceControlPoints(0xffff_ffff, fixture);
    const repeat = generatePodraceControlPoints(0xffff_ffff, fixture);
    const differentSeed = generatePodraceControlPoints(0xffff_fffe, fixture);
    const course = createPodraceCourse(flatTerrain, {
      controlPoints: first,
      arcSamplesPerSegment: 16,
      projectionSamples: 512,
    });
    const report = validatePodraceCourse(course);
    const xs = first.map((point) => point.x);
    const zs = first.map((point) => point.z);

    expect(repeat).toEqual(first);
    expect(differentSeed).not.toEqual(first);
    expect(first).not.toEqual(fixture);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1_200);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1_200);
    expect(first.filter((point) => point.checkpoint).length).toBe(10);
    expect(new Set(first.map((point) => point.tag))).toEqual(REQUIRED_SECTIONS);
    expect(report.valid, report.reasons.join(',')).toBe(true);
    expect(report.metrics.length).toBeGreaterThanOrEqual(5_800);
    expect(report.metrics.length).toBeLessThanOrEqual(10_300);
    expect(report.metrics.maximumCurvature).toBeLessThanOrEqual(0.085);
    expect(report.metrics.minimumSelfClearance).toBeGreaterThanOrEqual(42);
  });

  it('keeps adversarial uint32 boundaries fully valid on production terrain', () => {
    const seeds = [
      0,
      1,
      2,
      0x7fff_ffff,
      0x8000_0000,
      0xffff_fffe,
      0xffff_ffff,
      0xaaaa_aaaa,
      0x5555_5555,
      0xdead_beef,
      0x504f_4452,
      0x9e37_79b9,
    ];

    for (const seed of seeds) {
      const course = createProceduralPodraceCourse(productionTerrain, seed, {
        arcSamplesPerSegment: 16,
        projectionSamples: 512,
      });
      const report = course.generationReport;
      expect(report.valid, `${seed >>> 0}: ${report.reasons.join(',')}`).toBe(true);
      expect(report.metrics.launchScore).toBeGreaterThan(0);
      expect(new Set(course.controlPoints.map((point) => point.tag))).toEqual(REQUIRED_SECTIONS);
    }
  });

  it('passes a deterministic 512-seed production sweep without an invalid construction', () => {
    const signatures = new Set<string>();
    for (let index = 0; index < 512; index += 1) {
      const seed = (
        Math.imul(index + 1, 0x9e37_79b9)
        ^ Math.imul(index + 17, 0x85eb_ca6b)
        ^ 0xc001_d00d
      ) >>> 0;
      const course = createProceduralPodraceCourse(productionTerrain, seed, {
        arcSamplesPerSegment: 16,
        projectionSamples: 512,
      });
      const report = course.generationReport;
      expect(report.valid, `${seed}: ${report.reasons.join(',')}`).toBe(true);
      expect(signatures.has(course.signature), `duplicate ${course.signature}`).toBe(false);
      signatures.add(course.signature);
    }
    expect(signatures.size).toBe(512);
  }, 20_000);
});
