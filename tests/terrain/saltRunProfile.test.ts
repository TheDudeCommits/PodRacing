import { describe, expect, it } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_SEED, SALT_RUN_PROFILE, bakeSaltRunProfile, sampleCourseGulfGrid } from '../../src/game/race/CourseGulfField';
import { getInkstormSaltFrames, getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
const base = { heightAt: sampleTerrainHeight };
const course = createProceduralPodraceCourse(base, COURSE_GULF_SEED);
const race = new RaceSimulation({ terrain: base, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
const field = race.courseGulfField!;

describe('shared salt-run lane correction', () => {
  it('opens the actual filtered road continuation from the existing chase eye without changing camera settings', () => {
    const reveal = race.course.sampleAtProgress(.0859375);
    const baseReveal = course.sampleAtProgress(reveal.progress);
    // Recorded current chase geometry; ground-following eye changes with the
    // physical lane. Targets are two metres above the road, not above the bank.
    const eye = { x: 18651.722835986162, y: -10.972894894238646 + reveal.y - baseReveal.y, z: 620.9732411526137 };
    for (const ahead of [150, 250, 350, 500, 650]) {
      const target = race.course.sampleAtDistance(reveal.distance + ahead);
      let minimum = Infinity;
      for (let i = 1; i < 200; i++) {
        const t = i / 200, x = eye.x + (target.x - eye.x) * t, z = eye.z + (target.z - eye.z) * t;
        const ray = eye.y + (target.y + 2 - eye.y) * t;
        minimum = Math.min(minimum, ray - race.terrain.heightAt(x, z));
      }
      expect(minimum, `${ahead}m actual filtered sightline`).toBeGreaterThan(ahead === 650 ? .9 : 1.4);
    }
    const hump = race.course.sampleAtDistance(740);
    expect(hump.y).toBeLessThan(-24);
  });

  it('extends the settled physical salt floor into the outer basin while preserving the published lane', () => {
    // The old 95m profile left rolling banks outside the racing corridor.
    // Outer salt settles around the existing lane; legacy lane hashes below
    // and in connectedLaunchRidge remain unchanged.
    for (const distance of [795, 830, 865]) {
      const point = race.course.sampleAtDistance(distance);
      const heights = [-180, -165, -150, 150, 165, 180].map(lateral =>
        race.terrain.heightAt(point.x + point.rightX * lateral, point.z + point.rightZ * lateral));
      // The six-metre correction field interpolates against analytic terrain.
      // Allow half-metre residuals around the target, bounded below one metre
      // across the basin; preserve the separately pinned race corridor.
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
      for (const height of heights) expect(Math.abs(height + 25)).toBeLessThan(.5);
      for (const [a, b] of [[0, 1], [1, 2], [3, 4], [4, 5]]) {
        expect(Math.abs(heights[a!]! - heights[b!]!) / 15).toBeLessThan(.05);
      }
    }
  });

  it('keeps eight metre grades bounded and smoothly rejoins its unchanged surrounding terrain', () => {
    let maximumGrade = 0, maximumCut = 0;
    for (let d = SALT_RUN_PROFILE.startDistance; d <= 1280; d += 2) {
      const p = race.course.sampleAtDistance(d), next = race.course.sampleAtDistance(d + 8);
      maximumGrade = Math.max(maximumGrade, Math.abs(p.y - next.y) / 8);
      maximumCut = Math.max(maximumCut, base.heightAt(p.x, p.z) - p.y);
      expect(p.y).toBe(race.terrain.heightAt(p.x, p.z));
    }
    expect(maximumGrade).toBeLessThanOrEqual(.30);
    expect(maximumCut).toBeLessThan(19);
    for (const d of [SALT_RUN_PROFILE.startDistance, SALT_RUN_PROFILE.endDistance]) {
      const p = race.course.sampleAtDistance(d - .01), next = race.course.sampleAtDistance(d + .01);
      expect(Math.abs(next.y - p.y)).toBeLessThan(.01);
    }
  });

  it('makes exactly zero new contribution to every branch and to launch after1280, including complete lanes and normal probes', () => {
    const contribution = { ...field.grids[0], values: new Float32Array(field.grids[0].values.length) };
    bakeSaltRunProfile(contribution, course);
    let maximum = 0;
    const probe = (x: number, z: number): void => {
      for (const [dx, dz] of [[0, 0], [.85, 0], [-.85, 0], [0, .85], [0, -.85], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
        maximum = Math.max(maximum, Math.abs(sampleCourseGulfGrid(contribution, x + dx!, z + dz!)));
      }
    };
    for (let i = 0; i < 8192; i++) {
      const p = course.samplePlanAtProgress((i + .371) / 8192);
      if (p.distance > 550 && p.distance < 1280) continue;
      for (const lateral of [-p.width - 10, -p.width, 0, p.width, p.width + 10]) probe(p.x + p.rightX * lateral, p.z + p.rightZ * lateral);
    }
    for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (const t of [0, .123, .5, .877, 1]) for (const side of [-1, 0, 1]) {
        const lateral = side * (Math.max(a.width, b.width) + 10);
        probe(a.x + dx * t + dz / length * lateral, a.z + dz * t - dx / length * lateral);
      }
    }
    expect(maximum).toBe(0);
    expect(field.grids.map(g => g.size)).toEqual([417, 257]);
    expect(field.grids.reduce((bytes, g) => bytes + g.values.byteLength, 0)).toBe(959752);
  });

  it('replaces the crowded salt cluster with five unequal forms whose full bounds clear main and branch lanes', () => {
    const frames = getInkstormSaltFrames(race.course);
    expect(frames).toHaveLength(5);
    expect(frames.filter(p => p.family === 'wind-blade')).toHaveLength(2);
    expect(new Set(frames.map(p => p.progress)).size).toBe(5);
    const points = race.course.getRenderData(4096).points;
    for (const frame of frames) {
      expect(getInkstormLayout(race.course).some(p => p.id === frame.id)).toBe(true);
      const radius = frame.family === 'wind-blade' ? Math.hypot(18 * frame.sx, 8 * frame.sz) : Math.hypot(40 * frame.sx, 50 * frame.sz);
      let clearance = Infinity;
      for (const point of [...points, ...race.course.branches.flatMap(b => b.points)]) {
        clearance = Math.min(clearance, Math.hypot(frame.x - point.x, frame.z - point.z) - point.width - radius);
      }
      expect(clearance).toBeGreaterThan(8);
    }
    expect(getInkstormSaltFrames(createProceduralPodraceCourse(base, 1234))).toEqual([]);
  });
});
