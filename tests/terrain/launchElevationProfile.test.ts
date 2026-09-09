import { describe, expect, it } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { COURSE_GULF_SEED, launchProfileOffset } from '../../src/game/race/CourseGulfField';
import { createTerrainSample, sampleTerrainHeight, TerrainSampler } from '../../src/render/terrain/terrainMath';
import { TerrainSystem } from '../../src/render/terrain/TerrainSystem';

const base = { heightAt: sampleTerrainHeight };
const race = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
const field = race.courseGulfField!, profile = field.launchProfile;

describe('flagship playable launch basin', () => {
  it('provides a sustained actual descent, a broad floor and a graded return to the original course', () => {
    // Course9 deliberately replaces the94m shallow basin with a138m escarpment.
    // The prior edition and its record/ghost identity remain archived.
    const crest = race.course.sampleAtDistance(profile.crestDistance);
    const floor = race.course.sampleAtDistance(profile.floorDistance);
    expect(crest.y - floor.y).toBeGreaterThan(137);
    expect(crest.y - floor.y).toBeLessThan(139);
    let maximumGrade = 0, minimumFloor = Infinity, maximumFloor = -Infinity;
    for (let distance = profile.crestDistance; distance < profile.endDistance; distance += 2) {
      const point = race.course.sampleAtDistance(distance), ahead = race.course.sampleAtDistance(distance + 8);
      maximumGrade = Math.max(maximumGrade, Math.abs(ahead.y - point.y) / 8);
      if (distance >= profile.floorDistance && distance <= profile.basinEndDistance) {
        minimumFloor = Math.min(minimumFloor, point.y); maximumFloor = Math.max(maximumFloor, point.y);
      }
      expect(point.y).toBe(race.terrain.heightAt(point.x, point.z));
    }
    expect(maximumGrade).toBeLessThan(.49);
    expect(maximumFloor - minimumFloor).toBeLessThan(1.1);
    // At the usual launch review point, real terrain is already falling away.
    const reveal = race.course.sampleAtProgress(.18);
    expect(reveal.y - race.course.sampleAtDistance(reveal.distance + 200).y).toBeGreaterThan(28);
    // A geometric sight line from a plausible chase eye to the basin road is
    // clear of actual ground. This validates the reveal without moving a camera.
    const destination = race.course.sampleAtDistance(profile.floorDistance + 80);
    for (let step = 1; step < 100; step += 1) {
      const t = step / 100;
      const x = reveal.x + (destination.x - reveal.x) * t;
      const z = reveal.z + (destination.z - reveal.z) * t;
      const rayY = reveal.y + 10 + (destination.y + 3 - reveal.y - 10) * t;
      expect(rayY - race.terrain.heightAt(x, z)).toBeGreaterThan(3);
    }
    // The basin is hundreds of metres wide, rather than a narrow visual ditch.
    const middle = race.course.sampleAtDistance((profile.floorDistance + profile.basinEndDistance) / 2);
    for (const side of [-1, 1]) {
      const x = middle.x + middle.rightX * 120 * side, z = middle.z + middle.rightZ * 120 * side;
      expect(race.terrain.heightAt(x, z)).toBeLessThan(-100);
    }
    for (const distance of [profile.startDistance - 30, profile.endDistance + 30]) {
      const point = race.course.sampleAtDistance(distance);
      expect(point.y).toBe(base.heightAt(point.x, point.z));
    }
  });

  it('joins the original terrain without a height or slope step at profile boundaries', () => {
    for (const distance of [profile.startDistance, profile.endDistance]) {
      const baseHeight = race.course.sampleAtDistance(distance).y;
      expect(launchProfileOffset(profile, distance, baseHeight)).toBe(0);
      for (const delta of [-.01, .01]) expect(Math.abs(launchProfileOffset(profile, distance + delta, baseHeight))).toBeLessThan(1e-6);
      const before = race.course.sampleAtDistance(distance - 24), after = race.course.sampleAtDistance(distance + 24);
      const difference = (p: typeof before) => p.y - base.heightAt(p.x, p.z);
      expect(Math.abs(difference(before) - difference(after))).toBeLessThan(.6);
    }
  });

  it('refreshes cached checkpoints and retains every branch and bridge join', () => {
    const points = race.course.getRenderData(1024).points;
    for (const point of points) expect(point.y).toBe(race.course.heightAt(point.x, point.z));
    for (const checkpoint of race.course.checkpoints) expect(checkpoint.y).toBe(race.course.sampleAtProgress(checkpoint.progress).y);
    for (const branch of race.course.branches) {
      for (const point of branch.points) expect(field.sampleOffset(point.x, point.z)).toBe(0);
      for (const point of [branch.points[0]!, branch.points.at(-1)!]) {
        expect(point.y).toBeCloseTo(race.terrain.heightAt(point.x, point.z), 8);
        expect(point.y).toBeCloseTo(race.course.heightAt(point.x, point.z), 8);
      }
    }
  });

  it('gives physical heights and independently differentiated normals to render and effect samplers', () => {
    const terrain = new TerrainSystem({ levels: 1 }); terrain.setCourseGulfField(field);
    const sampler: TerrainSampler = terrain;
    for (const fraction of [.1, .3, .6, .9]) {
      const point = race.course.sampleAtDistance(profile.crestDistance + (profile.floorDistance - profile.crestDistance) * fraction);
      const sample = sampler.sample(point.x, point.z, createTerrainSample());
      expect(sample.height).toBe(race.terrain.heightAt(point.x, point.z));
      const dx = (race.terrain.heightAt(point.x + .85, point.z) - race.terrain.heightAt(point.x - .85, point.z)) / 1.7;
      const dz = (race.terrain.heightAt(point.x, point.z + .85) - race.terrain.heightAt(point.x, point.z - .85)) / 1.7;
      const length = Math.hypot(dx, 1, dz);
      expect(sample.normalX).toBeCloseTo(-dx / length, 12);
      expect(sample.normalY).toBeCloseTo(1 / length, 12);
      expect(sample.normalZ).toBeCloseTo(-dz / length, 12);
    }
    terrain.dispose();
  });
});
