import { describe, expect, it } from 'vitest';
import { masteryRetryTarget, masterySectorLabels, masterySectors } from '../../src/game/mastery/sectors';
import type { CheckpointSplit } from '../../src/game/race/types';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const splits: CheckpointSplit[] = [
  { lap: 1, checkpointIndex: 1, segmentTime: 9, raceTime: 9 },
  { lap: 1, checkpointIndex: 0, segmentTime: 13, raceTime: 22 },
  { lap: 2, checkpointIndex: 1, segmentTime: 8, raceTime: 30 },
  { lap: 2, checkpointIndex: 0, segmentTime: 12, raceTime: 42 },
];

describe('measured retry pursuit', () => {
  it('compares cumulative accepted time while retaining each sector loss across laps', () => {
    const sectors = masterySectors(splits, [10, 10, 10, 10], ['Finish', 'Canyon']);
    expect(sectors.map(s => s.paceDelta)).toEqual([-1, 2, 0, 2]);
    expect(sectors.map(s => s.delta)).toEqual([-1, 3, -2, 2]);
    expect(sectors.map(s => s.label)).toEqual(['Canyon', 'Finish', 'Canyon', 'Finish']);
    expect(sectors.map(s => s.lap)).toEqual([1, 1, 2, 2]);
    expect(masteryRetryTarget(sectors)).toEqual({ sectorIndex: 2, lap: 1, label: 'Finish', loss: 3, currentTime: 13, targetTime: 10 });
  });
  it('does not invent a pursuit without a PB, on ties, or from sub-display rounding noise', () => {
    expect(masteryRetryTarget(masterySectors(splits, undefined))).toBeNull();
    expect(masteryRetryTarget(masterySectors(splits, splits.map(s => s.segmentTime)))).toBeNull();
    expect(masteryRetryTarget(masterySectors(splits, splits.map(s => s.segmentTime - .001)))).toBeNull();
    expect(masterySectors(splits, [10]).map(s => s.paceDelta)).toEqual([-1, null, null, null]);
  });
  it('keeps the lap and global split index of a second-lap loss', () => {
    const sectors = masterySectors(splits, [9, 13, 8, 8], ['Finish', 'Canyon']);
    expect(masteryRetryTarget(sectors)).toEqual({ sectorIndex: 4, lap: 2, label: 'Finish', loss: 4, currentTime: 12, targetTime: 8 });
  });
  it('derives one stable label per actual gate and caches by course instance', () => {
    const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
    const labels = masterySectorLabels(course);
    expect(labels).toHaveLength(course.checkpoints.length);
    expect(labels.every(label => label.length > 3)).toBe(true);
    expect(new Set(labels).size).toBeGreaterThan(3);
    expect(masterySectorLabels(course)).toBe(labels);
  });
});
