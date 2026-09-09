import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField, getLaunchBasinAnchor } from '../../src/game/race/CourseGulfField';
import { getInkstormForkDividers, getInkstormLayout, getInkstormObstacleContact, getInkstormSaltFrames } from '../../src/game/race/inkstormLayout';
import { getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { LAUNCH_INDUSTRIAL_BENCHES } from '../../src/game/race/LaunchBasinPlan';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const field = createCourseGulfField(course)!, anchor = getLaunchBasinAnchor(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);

describe('authored launch geology ownership', () => {
  it('removes global broad/spire scenery from the basin in world space and retains the actual fork collider placements', () => {
    const layout = getInkstormLayout(course);
    for (const p of layout.filter(p => !p.id.startsWith('inkstorm-salt-frame-')
      && (p.family === 'canyon-buttress' || p.family === 'fractured-spire'))) {
      const dx = p.x - anchor.x, dz = p.z - anchor.z;
      const f = dx * anchor.tangentX + dz * anchor.tangentZ;
      const r = -dx * anchor.rightX - dz * anchor.rightZ;
      expect(f > -220 && f < 1800 && r > -1050 && r < 850, p.id).toBe(false);
    }
    const saltFrames = getInkstormSaltFrames(course);
    expect(saltFrames).toHaveLength(5);
    for (const frame of saltFrames) expect(layout.find(p => p.id === frame.id)).toEqual(frame);
    const dividers = getInkstormForkDividers(course);
    expect(dividers.length).toBeGreaterThan(0);
    for (const divider of dividers) expect(layout.find(p => p.id === divider.id)).toBe(divider);
    expect(layout.some(p => p.family === 'roadside-shard' && p.progress > .15 && p.progress < .3)).toBe(true);
  });

  it('keeps the entire real launch/descent racing corridor free of introduced obstacle contacts', () => {
    for (let distance = 1050; distance <= 2550; distance += 9) {
      const p = course.sampleAtDistance(distance);
      for (const side of [-1, 0, 1]) {
        const x = p.x + p.rightX * side * (p.width - 4), z = p.z + p.rightZ * side * (p.width - 4);
        expect(getInkstormObstacleContact(course, x, z, 3, undefined, ground), `${distance}m, side ${side}`).toBeNull();
      }
    }
  });

  it('keeps sparse scan accents out of the valley panorama and refinery yards with low local relief', () => {
    const plan = getInkstormVistaPlan(course, ground);
    const accents = plan.landforms.filter(form => form.ridgeId);
    // The physical signed mountains now supply continuous escarpments. The
    // former 20–24 overlapping scan requirement rebuilt an obstructing wall.
    expect(accents.length).toBeGreaterThanOrEqual(6);
    expect(accents.length).toBeLessThanOrEqual(10);
    expect(new Set(accents.map(p => p.ridgeId)).size).toBe(3);
    for (const ridgeId of new Set(accents.map(p => p.ridgeId))) {
      const forms = accents.filter(p => p.ridgeId === ridgeId).sort((a, b) => a.forward - b.forward);
      for (const form of forms) {
        const crown = ground(form.x, form.z) - 1.5 + 120 * form.sy;
        expect(crown - ground(form.x, form.z), form.id).toBeGreaterThan(0);
        expect(crown - ground(form.x, form.z), form.id).toBeLessThanOrEqual(26);
        // Inspect the actual rotated source rectangle, independently of its
        // enclosing disk. All corners remain outside the 24-degree launch
        // panorama and the already founded industrial bench rectangles.
        for (const px of [-40 * form.sx, 40 * form.sx]) for (const pz of [-50 * form.sz, 50 * form.sz]) {
          const x = form.x + Math.cos(form.yaw) * px + Math.sin(form.yaw) * pz;
          const z = form.z - Math.sin(form.yaw) * px + Math.cos(form.yaw) * pz;
          const forward = (x - anchor.x) * anchor.tangentX + (z - anchor.z) * anchor.tangentZ;
          const right = -(x - anchor.x) * anchor.rightX - (z - anchor.z) * anchor.rightZ;
          if (ridgeId !== 'near-west-rim') expect(Math.abs(right) - Math.tan(Math.PI / 15) * forward, form.id).toBeGreaterThan(0);
          for (const bench of LAUNCH_INDUSTRIAL_BENCHES) {
            expect(Math.abs(forward - bench.forward) > bench.halfForward + 8
              || Math.abs(right - bench.right) > bench.halfRight + 8, `${form.id} / ${bench.id}`).toBe(true);
          }
        }
        // Retain the independent footprint sampling/protrusion guard used for
        // the signed terrain revision, including accents beside refinery cuts.
        let highestGround = -Infinity;
        for (let row = -8; row <= 8; row++) for (let col = -8; col <= 8; col++) {
          const x = col / 8 * 40 * form.sx, z = row / 8 * 50 * form.sz;
          highestGround = Math.max(highestGround, ground(
            form.x + Math.cos(form.yaw) * x + Math.sin(form.yaw) * z,
            form.z - Math.sin(form.yaw) * x + Math.cos(form.yaw) * z,
          ));
        }
        expect(crown - highestGround, form.id).toBeLessThan(40);
      }
    }
  });
});
