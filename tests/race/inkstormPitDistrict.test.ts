import { describe, expect, it } from 'vitest';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout, getInkstormObstacleContact } from '../../src/game/race/inkstormLayout';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
const terrain = { heightAt: sampleTerrainHeight };

describe('inhabited grid district placement', () => {
  it('fits four frontages between flagship hangars without overlapping their full bounds', () => {
    const course = createProceduralPodraceCourse(terrain, 0x494e4b53);
    const buildings = getInkstormLayout(course).filter(p => p.family === 'pit-complex' || p.family === 'pit-district');
    const district = buildings.filter(p => p.family === 'pit-district');
    expect(district).toHaveLength(4);
    const radius = (building: typeof buildings[number], axis: readonly number[]) => {
      const [w, d] = building.family === 'pit-district' ? [60, 18] : [75, 31];
      return Math.abs(axis[0]! * Math.cos(building.yaw) - axis[1]! * Math.sin(building.yaw)) * w! * building.sx
        + Math.abs(axis[0]! * Math.sin(building.yaw) + axis[1]! * Math.cos(building.yaw)) * d! * building.sz;
    };
    for (const a of district) for (const b of buildings.filter(p => p.id !== a.id)) {
      const axes = [a.yaw, b.yaw].flatMap(yaw => [[Math.cos(yaw), -Math.sin(yaw)], [Math.sin(yaw), Math.cos(yaw)]]);
      const separation = Math.max(...axes.map(axis => Math.abs((b.x - a.x) * axis[0]! + (b.z - a.z) * axis[1]!) - radius(a, axis) - radius(b, axis)));
      expect(separation).toBeGreaterThanOrEqual(2);
    }
  });

  it('preserves all main and branch racing corridors against the complete building envelope', () => {
    for (const seed of [0x494e4b53, 42, 1234]) {
      const course = createProceduralPodraceCourse(terrain, seed);
      const render = course.getRenderData(4096);
      const points = [...render.points, ...(render.branches ?? []).flatMap(b => b.points)];
      const buildings = getInkstormLayout(course).filter(p => p.family === 'pit-district');
      expect(buildings.length).toBeGreaterThanOrEqual(2);
      for (const building of buildings) for (const point of points) {
        const dx = point.x - building.x, dz = point.z - building.z;
        const x = Math.abs(dx * Math.cos(building.yaw) - dz * Math.sin(building.yaw));
        const z = Math.abs(dx * Math.sin(building.yaw) + dz * Math.cos(building.yaw));
        expect(Math.hypot(Math.max(0, x - 60 * building.sx), Math.max(0, z - 18 * building.sz)) - point.width).toBeGreaterThan(5);
      }
    }
  });

  it('adds a physical scenery envelope with open airspace above the district', () => {
    const course = createProceduralPodraceCourse(terrain, 0x494e4b53);
    const building = getInkstormLayout(course).find(p => p.family === 'pit-district')!;
    const ground = terrain.heightAt(building.x, building.z);
    expect(getInkstormObstacleContact(course, building.x, building.z, 3, ground + 10, terrain.heightAt)?.id).toBe(building.id);
    expect(getInkstormObstacleContact(course, building.x, building.z, 3, ground + 45, terrain.heightAt)).toBeNull();
  });
});
