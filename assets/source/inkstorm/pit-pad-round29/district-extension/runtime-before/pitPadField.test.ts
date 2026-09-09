import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { createPitPadField, padLocalToWorld, PIT_PAD_MAX_TEXELS, type PitPlacement } from '../../src/game/race/PitPadField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const base = { heightAt: sampleTerrainHeight };
const cases = [0x494e4b53, 42, 1234].map(seed => {
  const course = createProceduralPodraceCourse(base, seed), gulf = createCourseGulfField(course);
  const before = (x: number, z: number) => sampleTerrainHeight(x, z) + (gulf?.sampleOffset(x, z) ?? 0);
  const placements = getInkstormLayout(course);
  const route = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const oldGrids = gulf?.grids.map(g => g.values.slice());
  const field = createPitPadField(placements, route, course.branches, before);
  return { seed, course, gulf, before, placements, route, oldGrids, field };
});

describe('shared off-road workshop grading', () => {
  it('clears the full rotated source slabs while freezing their original center anchors', () => {
    for (const { field, placements, before } of cases) {
      for (const pad of field.pads) {
        const placement = placements.find(p => p.id === pad.id)!;
        expect(pad.anchorHeight).toBe(before(placement.x, placement.z));
        expect(field.anchorHeight(pad.id)).toBe(pad.anchorHeight);
        expect(pad.targetHeight).toBe(pad.anchorHeight + .9);
        // Actual GLB slab: local X[-71,79], Z[-32.5,28].
        for (const [lx, lz] of [[-71, -32.5], [-71, 28], [79, -32.5], [79, 28]]) {
          const c = Math.cos(placement.yaw), s = Math.sin(placement.yaw);
          const expected = [placement.x + lx! * placement.sx * c + lz! * placement.sz * s,
            placement.z - lx! * placement.sx * s + lz! * placement.sz * c];
          const corner = padLocalToWorld(pad, (lx! - 4) * placement.sx, (lz! + 2.25) * placement.sz);
          expect(corner[0]).toBeCloseTo(expected[0]!, 10); expect(corner[1]).toBeCloseTo(expected[1]!, 10);
        }
        if (!pad.accepted) continue;
        let maximum = -Infinity;
        for (let ix = 0; ix <= 150; ix++) for (let iz = 0; iz <= 61; iz++) {
          const [x, z] = padLocalToWorld(pad, -pad.halfX + ix / 150 * pad.halfX * 2, -pad.halfZ + iz / 61 * pad.halfZ * 2);
          maximum = Math.max(maximum, before(x, z) + field.sampleOffset(x, z));
        }
        expect(maximum).toBeLessThan(pad.anchorHeight + 1.45 - .3);
      }
    }
  });

  it('preserves every main shoulder and branch normal footprint, plus both existing gulf arrays', () => {
    for (const { course, field, gulf, oldGrids } of cases) {
      let maximum = 0;
      for (let i = 0; i < 8192; i++) {
        const p = course.samplePlanAtProgress((i + .371) / 8192);
        for (const lateral of [-p.width - 10, -p.width, 0, p.width, p.width + 10]) {
          const x = p.x + p.rightX * lateral, z = p.z + p.rightZ * lateral;
          for (const [dx, dz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]])
            maximum = Math.max(maximum, Math.abs(field.sampleOffset(x + dx!, z + dz!)));
        }
      }
      for (const branch of course.branches) for (let i = 0; i < branch.points.length - 1; i++) {
        const a = branch.points[i]!, b = branch.points[i + 1]!, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
        for (const t of [0, .123, .5, .877, 1]) {
          const width = a.width + (b.width - a.width) * t;
          for (const lateral of [-width - 10, -width, 0, width, width + 10]) {
            const x = a.x + dx * t + dz / length * lateral, z = a.z + dz * t - dx / length * lateral;
            for (const [nx, nz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]])
              maximum = Math.max(maximum, Math.abs(field.sampleOffset(x + nx!, z + nz!)));
          }
        }
      }
      expect(maximum).toBe(0);
      if (gulf) for (let i = 0; i < gulf.grids.length; i++) expect(gulf.grids[i]!.values).toEqual(oldGrids![i]);
    }
  });

  it('records the expedition pad that conflicts with the protected shoulder without moving it', () => {
    const seed42 = cases[1]!, declined = seed42.field.pads[2]!;
    expect(declined.minRoadClearance).toBeLessThan(8);
    expect(declined.accepted).toBe(false);
    expect(declined.declineReason).toBe('protected-road-overlap');
    expect(seed42.field.sampleOffset(declined.x, declined.z)).toBe(0);
    expect(seed42.field.pads.filter(p => p.accepted)).toHaveLength(2);
    expect(cases[2]!.field.pads.filter(p => p.accepted)).toHaveLength(3);
    expect(cases[1]!.gulf).toBeNull(); expect(cases[2]!.gulf).toBeNull();
  });

  it('uses the same deterministic four-texel interpolation as the shared GLSL sampler', () => {
    for (const { field, placements, route, course, before } of cases) {
      const duplicate = createPitPadField(placements, route, course.branches, before), g = field.grid!;
      expect(duplicate.grid!.values).toEqual(g.values);
      expect(g.values.length).toBeLessThanOrEqual(PIT_PAD_MAX_TEXELS);
      let maximumError = 0;
      for (let i = 0; i < 2000; i++) {
        const gx = ((i * 73) % (g.columns - 2)) + .37, gz = ((i * 47) % (g.rows - 2)) + .81;
        const at = Math.floor(gz) * g.columns + Math.floor(gx), mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
        const expected = mix(mix(g.values[at]!, g.values[at + 1]!, .37), mix(g.values[at + g.columns]!, g.values[at + g.columns + 1]!, .37), .81);
        maximumError = Math.max(maximumError, Math.abs(field.sampleOffset(g.minX + gx, g.minZ + gz) - expected));
      }
      expect(maximumError).toBeLessThan(1e-8);
      expect(field.sampleOffset(g.minX - .01, g.minZ)).toBe(0);
      expect(field.sampleOffset(g.minX + g.columns - 1, g.minZ)).toBe(0);
      expect(field.sampleOffset(g.minX, g.minZ + g.rows - 1)).toBe(0);
    }
  });

  it('refuses a route wholly inside a slab and bounds atlas allocation before baking', () => {
    const pit = (x: number, z: number): PitPlacement => ({ id: `${x}:${z}`, family: 'pit-complex', x, z, yaw: 0, sx: 1, sz: 1 });
    const internalRoute = [{ x: -2, z: -2, width: 1 }, { x: 2, z: -2, width: 1 }, { x: 2, z: 2, width: 1 }, { x: -2, z: 2, width: 1 }];
    const internal = createPitPadField([pit(0, 0)], internalRoute, [], () => 0);
    expect(internal.pads[0]!.minRoadClearance).toBeGreaterThan(20);
    expect(internal.pads[0]!.declineReason).toBe('protected-road-overlap'); expect(internal.grid).toBeNull();
    const huge = createPitPadField([pit(0, 0), pit(10000, 10000)], [{ x: -500, z: -500, width: 1 }, { x: -500, z: -400, width: 1 }], [], () => 0);
    expect(huge.grid).toBeNull(); expect(huge.pads.every(p => p.declineReason === 'atlas-budget')).toBe(true);
  });

  it('keeps baked sampling independent of later terrain or anchor changes', () => {
    let calls = 0, shift = 0;
    const terrain = (x: number, z: number) => { calls++; return x * .05 + z * .1 + shift; };
    const placement: PitPlacement = { id: 'snapshot', family: 'pit-complex', x: 0, z: 0, yaw: .3, sx: 1.1, sz: .9 };
    const field = createPitPadField([placement], [{ x: -150, z: 140, width: 5 }, { x: 150, z: 140, width: 5 }], [], terrain);
    const bakedCalls = calls, first = field.sampleOffset(0, 0); shift = 100;
    for (let i = 0; i < 100; i++) field.sampleOffset(i / 100, 0);
    expect(calls).toBe(bakedCalls); expect(field.anchorHeight('snapshot')).toBe(0); expect(field.sampleOffset(0, 0)).toBe(first);
  });

  it('installs the same physical sampler only after course generation and respects supplied courses', () => {
    const race = new RaceSimulation({ terrain: base, seed: 0x494e4b53, fieldSize: 4 });
    expect(race.course.signature).toBe(cases[0]!.course.signature);
    expect(race.pitPadField).not.toBeNull();
    for (const pad of race.pitPadField!.pads) {
      expect(pad.anchorHeight).toBe(cases[0]!.before(pad.x, pad.z));
      const expected = cases[0]!.before(pad.x, pad.z) + race.pitPadField!.sampleOffset(pad.x, pad.z);
      expect(race.terrain.heightAt(pad.x, pad.z)).toBe(expected); expect(race.course.heightAt(pad.x, pad.z)).toBe(expected);
    }
    const customBase = { heightAt: (x: number, z: number) => sampleTerrainHeight(x, z) + 17 };
    const suppliedCourse = createProceduralPodraceCourse(customBase, 42);
    const supplied = new RaceSimulation({ terrain: customBase, course: suppliedCourse, fieldSize: 4 });
    expect(supplied.pitPadField).toBeNull(); expect(supplied.courseGulfField).toBeNull();
    const p = getInkstormLayout(suppliedCourse).find(p => p.family === 'pit-complex')!;
    expect(supplied.course.heightAt(p.x, p.z)).toBe(customBase.heightAt(p.x, p.z));
    expect(supplied.terrain.heightAt(p.x, p.z)).toBe(customBase.heightAt(p.x, p.z));
  });
});
