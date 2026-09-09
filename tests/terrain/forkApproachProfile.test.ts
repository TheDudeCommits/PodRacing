import { describe, expect, it } from 'vitest';
import originalForkJson from '../../docs/inkstorm-overhaul/fixtures/fork-course7.json?raw';
import type { CourseBranchDefinition } from '../../src/game/race/types';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField, COURSE_GULF_SEED, FORK_APPROACH_PROFILE } from '../../src/game/race/CourseGulfField';
import { createBridgeHeightSampler } from '../../src/game/race/bridgeSurface';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const base = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(base, COURSE_GULF_SEED);
const before = createCourseGulfField(course, { forkApproach: false })!, after = createCourseGulfField(course)!;
const oldGround = { heightAt: (x: number, z: number) => sampleTerrainHeight(x, z, before) };
const newGround = { heightAt: (x: number, z: number) => sampleTerrainHeight(x, z, after) };
const oldSupport = createBridgeHeightSampler(oldGround, course.branches), newSupport = createBridgeHeightSampler(newGround, course.branches);
const entry = course.branches.find(branch => branch.elevated)!.entryProgress * course.totalLength;
const probes = [[0, 0], [.85, 0], [-.85, 0], [0, .85], [0, -.85], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]] as const;

describe('physical fork approach', () => {
  it('moves only the early flagship branch plan while preserving legal endpoints, widths and checkpoint progress', () => {
    const original = JSON.parse(originalForkJson) as {
      branches: CourseBranchDefinition[]; checkpoints: typeof course.checkpoints;
    };
    const current = course.branches.find(b => b.elevated)!, previous = original.branches.find(b => b.elevated)!;
    expect(current.entryProgress).toBe(previous.entryProgress);
    expect(current.exitProgress).toBe(previous.exitProgress);
    expect(current.points[0]).toEqual(previous.points[0]);
    expect(current.points.at(-1)).toEqual(previous.points.at(-1));
    expect(course.checkpoints).toEqual(original.checkpoints);
    expect(course.branches.filter(b => !b.elevated)).toEqual(original.branches.filter(b => !b.elevated));
    let maximumShift = 0;
    for (let i = 0; i < current.points.length; i++) {
      const a = current.points[i]!, b = previous.points[i]!;
      const shift = Math.hypot(a.x - b.x, a.z - b.z);
      maximumShift = Math.max(maximumShift, shift);
      expect(a.canonicalProgress).toBe(b.canonicalProgress);
      expect(a.routeProgress).toBe(b.routeProgress);
      expect(a.width).toBe(b.width);
      if (a.routeProgress >= .5) expect(shift).toBe(0);
    }
    expect(maximumShift).toBeCloseTo(24, 8);
    expect(course.generationReport.valid).toBe(true);
  });

  it('preserves every branch floor, normal probe and legal join independently of the new main-road cut', () => {
    let maximumGroundDelta = 0, maximumSupportDelta = 0, samples = 0;
    for (const branch of course.branches) for (let index = 1; index < branch.points.length; index++) {
      const a = branch.points[index - 1]!, b = branch.points[index]!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (let step = 0; step <= 24; step++) for (const side of [-1, -.75, -.25, 0, .25, .75, 1]) {
        const t = step / 24, width = a.width + (b.width - a.width) * t;
        const x = a.x + dx * t + dz / length * width * side, z = a.z + dz * t - dx / length * width * side;
        for (const [px, pz] of probes) {
          maximumGroundDelta = Math.max(maximumGroundDelta, Math.abs(newGround.heightAt(x + px, z + pz) - oldGround.heightAt(x + px, z + pz)));
          maximumSupportDelta = Math.max(maximumSupportDelta, Math.abs(newSupport.heightAt(x + px, z + pz) - oldSupport.heightAt(x + px, z + pz)));
          samples++;
        }
      }
    }
    expect(samples).toBeGreaterThan(100_000);
    expect(maximumGroundDelta).toBe(0);
    expect(maximumSupportDelta).toBe(0);
    const race = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
    expect(race.course.branches).toEqual(course.branches);
    expect(race.course.checkpoints.map(({ y: _y, ...p }) => p)).toEqual(course.checkpoints.map(({ y: _y, ...p }) => p));
    for (const checkpoint of race.course.checkpoints) expect(checkpoint.y).toBe(oldGround.heightAt(checkpoint.x, checkpoint.z));
  });

  it('does not change the launch grid, texture budget, other courses or lanes outside this fork interval', () => {
    expect(after.grids[0].values).toEqual(before.grids[0].values);
    expect(after.grids.map(grid => grid.size)).toEqual([417, 257]);
    expect(after.grids.reduce((bytes, grid) => bytes + grid.values.byteLength, 0)).toBe(959752);
    let maximumDelta = 0;
    for (let i = 0; i < 8192; i++) {
      const p = course.samplePlanAtProgress((i + .371) / 8192), along = p.distance - entry;
      if (along > FORK_APPROACH_PROFILE.start - 24 && along < FORK_APPROACH_PROFILE.end + 24) continue;
      for (const side of [-1, 0, 1]) for (const [dx, dz] of probes) {
        const x = p.x + p.rightX * (p.width + 10) * side + dx, z = p.z + p.rightZ * (p.width + 10) * side + dz;
        maximumDelta = Math.max(maximumDelta, Math.abs(after.sampleOffset(x, z) - before.sampleOffset(x, z)));
      }
    }
    expect(maximumDelta).toBe(0);
    expect(createCourseGulfField(createProceduralPodraceCourse(base, 1234))).toBeNull();
  });

  it('lowers the crest across a usable road width without increasing its maximum eight-metre forward grade', () => {
    let oldMaximum = 0, newMaximum = 0, maximumCut = 0;
    for (let distance = 0; distance <= 460; distance += 2) for (const side of [-.6, 0, .6]) {
      const a = course.sampleAtDistance(entry + distance), b = course.sampleAtDistance(entry + distance + 8);
      const x = a.x + a.rightX * a.width * side, z = a.z + a.rightZ * a.width * side;
      const nx = b.x + b.rightX * b.width * side, nz = b.z + b.rightZ * b.width * side;
      oldMaximum = Math.max(oldMaximum, Math.abs(oldSupport.heightAt(nx, nz) - oldSupport.heightAt(x, z)) / 8);
      newMaximum = Math.max(newMaximum, Math.abs(newSupport.heightAt(nx, nz) - newSupport.heightAt(x, z)) / 8);
      maximumCut = Math.max(maximumCut, oldGround.heightAt(x, z) - newGround.heightAt(x, z));
    }
    expect(newMaximum).toBeLessThanOrEqual(oldMaximum + .005);
    expect(maximumCut).toBeGreaterThan(5);
    expect(maximumCut).toBeLessThan(12);
    let loweredLaneSamples = 0;
    for (const distance of [90, 110, 130]) {
      const p = course.sampleAtDistance(entry + distance);
      for (const side of [-.6, 0, .6]) {
        const x = p.x + p.rightX * p.width * side, z = p.z + p.rightZ * p.width * side;
        const cut = oldGround.heightAt(x, z) - newGround.heightAt(x, z);
        expect(cut).toBeGreaterThanOrEqual(0);
        if (cut > 1) loweredLaneSamples++;
      }
    }
    expect(loweredLaneSamples).toBeGreaterThanOrEqual(6);
  });
});
