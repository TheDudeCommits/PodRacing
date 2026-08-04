import { describe, expect, it } from 'vitest';
import {
  PODRACE_CONTROL_POINTS,
  createPodraceCourse,
  signedProgressDelta,
  type CourseSectionTag,
} from '../../src/game/race';
import type { HeightSampler } from '../../src/game/simulation/types';

const terrain: HeightSampler = {
  heightAt(x, z) {
    return Math.sin(x * 0.013) * 4 + Math.cos(z * 0.009) * 2;
  },
};

describe('procedural closed podrace course', () => {
  it('is closed, arc-length sampled and carries every authored set-piece tag', () => {
    const course = createPodraceCourse(terrain);
    const start = course.sampleAtProgress(0);
    const closure = course.sampleAtProgress(1);
    expect(closure.x).toBeCloseTo(start.x, 8);
    expect(closure.z).toBeCloseTo(start.z, 8);
    expect(closure.tangentX).toBeCloseTo(start.tangentX, 7);
    expect(closure.tangentZ).toBeCloseTo(start.tangentZ, 7);
    expect(course.totalLength).toBeGreaterThan(5_000);

    const required = new Set<CourseSectionTag>([
      'fast-straight',
      'hairpin',
      'wide-sweeper',
      'chicane',
      'narrow-canyon',
      'launch-crest',
    ]);
    for (const point of PODRACE_CONTROL_POINTS) required.delete(point.tag);
    expect([...required]).toEqual([]);

    const distances: number[] = [];
    let previous = course.sampleAtProgress(0);
    for (let index = 1; index <= 160; index += 1) {
      const sample = course.sampleAtProgress(index / 160);
      distances.push(Math.hypot(sample.x - previous.x, sample.z - previous.z));
      previous = sample;
    }
    const mean = distances.reduce((sum, value) => sum + value, 0) / distances.length;
    expect(Math.max(...distances) / mean).toBeLessThan(1.12);
    expect(Math.min(...distances) / mean).toBeGreaterThan(0.88);
  });

  it('injects terrain height into dense render data and emits renderer-ready gate indices', () => {
    const course = createPodraceCourse(terrain);
    const render = course.getRenderData(768);
    const minimap = course.getMinimapSamples(192);
    expect(render.points).toHaveLength(768);
    expect(minimap).toHaveLength(192);
    expect(render.checkpointIndices).toHaveLength(course.checkpoints.length);
    expect(new Set(render.checkpointIndices).size).toBe(render.checkpointIndices.length);

    for (const index of [0, 117, 431, 767]) {
      const point = render.points[index];
      expect(point).toBeDefined();
      if (!point) continue;
      expect(point.y).toBeCloseTo(terrain.heightAt(point.x, point.z), 8);
      expect(point.width).toBeGreaterThan(10);
    }
  });

  it('projects lateral offsets with stable signs and previews the authored hairpin', () => {
    const course = createPodraceCourse(terrain);
    const hairpinPointIndex = PODRACE_CONTROL_POINTS.findIndex((point) => point.tag === 'hairpin');
    const hairpin = course.checkpoints.find((checkpoint) =>
      checkpoint.controlPointIndex === hairpinPointIndex,
    ) ?? course.sampleAtProgress(0.72);
    const point = course.sampleAtProgress(hairpin.progress);
    const right = course.projectPoint(
      point.x + point.rightX * 9,
      point.z + point.rightZ * 9,
      point.progress,
    );
    const left = course.projectPoint(
      point.x - point.rightX * 7,
      point.z - point.rightZ * 7,
      point.progress,
    );
    expect(right.lateralOffset).toBeGreaterThan(7.5);
    expect(left.lateralOffset).toBeLessThan(-5.5);

    let strongest = course.getCornerPreview(0);
    for (let index = 0; index < 300; index += 1) {
      const preview = course.getCornerPreview(index / 300, 25, 210);
      if (preview.severity > strongest.severity) strongest = preview;
    }
    expect(strongest.severity).toBeGreaterThan(0.45);
    expect(strongest.direction).not.toBe('straight');
  });

  it('exposes solid analytic contacts at the authored canyon walls', () => {
    const course = createPodraceCourse(terrain);
    const canyon = Array.from({ length: 512 }, (_, index) => course.sampleAtProgress(index / 512))
      .find((sample) => sample.tag === 'narrow-canyon');
    expect(canyon).toBeDefined();
    if (!canyon) return;

    const inside = course.getObstacleContact(
      canyon.x + canyon.rightX * (canyon.width - 2),
      canyon.z + canyon.rightZ * (canyon.width - 2),
      7.2,
      canyon.progress,
    );
    expect(inside).toBeNull();

    const outside = course.getObstacleContact(
      canyon.x + canyon.rightX * (canyon.width + 10),
      canyon.z + canyon.rightZ * (canyon.width + 10),
      7.2,
      canyon.progress,
    );
    expect(outside?.id).toBe('canyon-wall-right');
    expect(outside?.penetration).toBeGreaterThan(8);
    expect((outside?.normalX ?? 0) * canyon.rightX + (outside?.normalZ ?? 0) * canyon.rightZ)
      .toBeCloseTo(-1, 5);

    const ordinaryStraight = course.sampleAtProgress(0.08);
    expect(course.getObstacleContact(
      ordinaryStraight.x + ordinaryStraight.rightX * 300,
      ordinaryStraight.z + ordinaryStraight.rightZ * 300,
      7.2,
      ordinaryStraight.progress,
    )).toBeNull();
  });

  it('wraps signed progress across the start line in either direction', () => {
    expect(signedProgressDelta(0.998, 0.002)).toBeCloseTo(0.004, 10);
    expect(signedProgressDelta(0.002, 0.998)).toBeCloseTo(-0.004, 10);
  });
});
