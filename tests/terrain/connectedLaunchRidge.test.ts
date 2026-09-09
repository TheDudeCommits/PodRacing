import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { COURSE_GULF_MAX_RISE, createCourseGulfField, getLaunchBasinAnchor, sampleCourseGulfGrid } from '../../src/game/race/CourseGulfField';
import { LAUNCH_RIDGES } from '../../src/game/race/LaunchBasinPlan';
import { getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { launchRidgeRound31 } from './launchRidgeRound31';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!, anchor = getLaunchBasinAnchor(course)!;
const world = (forward: number, right: number) => ({
  x: anchor.x + anchor.tangentX * forward - anchor.rightX * right,
  z: anchor.z + anchor.tangentZ * forward - anchor.rightZ * right,
});
const ground = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);

describe('connected physical launch ridges', () => {
  it('pins all 532296 accepted course9 launch-grid lane/shoulder/normal samples bit for bit', async () => {
    const samples: number[] = [];
    const probe = (x: number, z: number): void => {
      for (const [dx, dz] of [[0, 0], [.85, 0], [-.85, 0], [0, .85], [0, -.85], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
        samples.push(sampleCourseGulfGrid(field.grids[0], x + dx!, z + dz!));
      }
    };
    for (let i = 0; i < 8192; i++) {
      const p = course.samplePlanAtProgress((i + .371) / 8192);
      for (const lateral of [-p.width - 10, -p.width, -p.width * .5, 0, p.width * .5, p.width, p.width + 10]) {
        probe(p.x + p.rightX * lateral, p.z + p.rightZ * lateral);
      }
    }
    for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
      const a = branch.points[i - 1]!, b = branch.points[i]!;
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (const t of [0, .123, .5, .877, 1]) {
        const width = a.width + (b.width - a.width) * t;
        for (const lateral of [-width - 10, -width, 0, width, width + 10]) {
          probe(a.x + dx * t + dz / length * lateral, a.z + dz * t - dx / length * lateral);
        }
      }
    }
    expect(samples).toHaveLength(launchRidgeRound31.samples);
    const bytes = new Uint8Array(new Float64Array(samples).buffer);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    expect(Array.from(digest, value => value.toString(16).padStart(2, '0')).join('')).toBe(launchRidgeRound31.sha256);
  });

  it('forms connected mountain interiors with distinct near, middle and far summit heights', () => {
    for (const ridge of LAUNCH_RIDGES.slice(1)) {
      for (let index = 1; index < ridge.stations.length; index++) {
        const a = ridge.stations[index - 1]!, b = ridge.stations[index]!;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, f = a.forward + (b.forward - a.forward) * t, r = a.right + (b.right - a.right) * t;
          const p = world(f, r), actual = ground(p.x, p.z);
          expect(actual, `${ridge.id} at ${f.toFixed(0)}m`).toBeGreaterThan(40);
          expect(actual).toBeLessThanOrEqual(sampleTerrainHeight(p.x, p.z) + COURSE_GULF_MAX_RISE);
        }
      }
    }
    // Actual interpolated elevations, independent of the authored station table.
    // The east site is beyond the deliberately lower refinery benches.
    for (const [forward, right, minimum] of [[90, -300, 150], [1190, -480, 220], [1170, 405, 180]]) {
      const p = world(forward!, right!);
      expect(ground(p.x, p.z)).toBeGreaterThan(minimum!);
    }
    // Both walls rise substantially above the existing visible central trough.
    for (const f of [900, 1000, 1100, 1200, 1300]) {
      const floor = world(f, 0), west = world(f, -480), east = world(f, 420);
      expect(ground(west.x, west.z) - ground(floor.x, floor.z)).toBeGreaterThan(200);
      expect(ground(east.x, east.z) - ground(floor.x, floor.z)).toBeGreaterThan(180);
    }
  });

  it('keeps refinery foundations short and fully seated across actual interpolated bench footprints', () => {
    const plan = getInkstormVistaPlan(course, ground);
    expect(plan.terraces).toHaveLength(3);
    const tops = plan.terraces.map(terrace => terrace.y);
    expect(tops[1]! - tops[0]!).toBeGreaterThan(8);
    expect(tops[2]! - tops[1]!).toBeGreaterThan(8);
    for (const terrace of plan.terraces) {
      expect(terrace.y - terrace.bottom).toBeLessThan(30);
      for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
        const x = col * terrace.width / 16, z = row * terrace.depth / 16;
        const worldX = terrace.x + Math.cos(terrace.yaw) * x + Math.sin(terrace.yaw) * z;
        const worldZ = terrace.z - Math.sin(terrace.yaw) * x + Math.cos(terrace.yaw) * z;
        const actual = ground(worldX, worldZ);
        expect(actual).toBeGreaterThan(terrace.bottom + 3);
        expect(actual).toBeLessThan(terrace.y - 4);
      }
    }
  });
});
