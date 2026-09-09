import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { createInkstormFoundry, getInkstormFoundryPlan } from '../../src/render/inkstorm/InkstormFoundry';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const gulf = createCourseGulfField(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z, gulf);

describe('connected industrial collector risers', () => {
  it('seats every collector on its actual module foundation and receives all three feeds', () => {
    const plan = getInkstormFoundryPlan(course, ground);
    const banks = getInkstormLayout(course).filter(p => p.family === 'pipe-bank');
    expect(plan.collectors).toHaveLength(banks.length);
    for (const bank of banks) {
      const collector = plan.collectors.find(c => c.id === `${bank.id}-collector`)!;
      const expected = new Vector3(0,1.2*bank.sy,17*bank.sz).applyAxisAngle(new Vector3(0,1,0),bank.yaw);
      expected.add(new Vector3(bank.x,ground(bank.x,bank.z)-1.5,bank.z));
      expect(new Vector3(...collector.base).distanceTo(expected)).toBeLessThan(1e-8);
      for (const pipe of plan.pipes.filter(p => p.id.startsWith(`${bank.id}-socket-link-`))) {
        const end = pipe.points.at(-1)!;
        expect(Math.hypot(end[0]-collector.base[0],end[2]-collector.base[2])).toBeLessThan(1e-8);
        expect(end[1]).toBeGreaterThan(collector.base[1]+1.4);
        expect(end[1]).toBeLessThan(collector.base[1]+collector.height-1.4);
        expect(pipe.endJointOffset).toBeGreaterThan(collector.radius);
      }
      // Skirt and shell stay inside the module's existing 47 x 22 footprint.
      expect(collector.radius*1.1).toBeLessThan(47*bank.sx);
      expect(17*bank.sz+collector.radius*1.1).toBeLessThan(22*bank.sz);
    }
  });

  it('keeps the assembled service network one finite, vertex-painted mesh', () => {
    const mesh = createInkstormFoundry(course,ground)!;
    try {
      const p = mesh.geometry.getAttribute('position');
      expect(mesh.geometry.getAttribute('color').count).toBe(p.count);
      let nonFiniteCoordinates = 0;
      for (const value of p.array) if (!Number.isFinite(value)) nonFiniteCoordinates++;
      expect(nonFiniteCoordinates).toBe(0);
      expect(Array.isArray(mesh.material)).toBe(false);
      expect(mesh.geometry.groups).toHaveLength(0);
    } finally { mesh.geometry.dispose(); if (!Array.isArray(mesh.material)) mesh.material.dispose(); }
  });
});
