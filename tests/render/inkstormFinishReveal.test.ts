import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { COURSE_GULF_SEED } from '../../src/game/race/CourseGulfField';
import { createInkstormVista, getInkstormVistaPlan } from '../../src/render/inkstorm/InkstormVista';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const race = new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: COURSE_GULF_SEED, competitionProfile: 'time-trial' });
const plan = getInkstormVistaPlan(race.course, race.terrain.heightAt);

describe('finish retaining construction and continuation signals', () => {
  it('joins the visible outer bend continuously and embeds every retaining toe into the real cliff', () => {
    const meshes = createInkstormVista(race.course, race.terrain.heightAt);
    try {
      const mesh = meshes.find(item => item.userData.inkstormFinishSpans)!;
      const spans = mesh.userData.inkstormFinishSpans as { from: string; to: string; length: number }[];
      expect(spans.length).toBeGreaterThan(50);
      const visible = plan.barriers.filter(p => p.progress >= .81 && p.progress <= .86);
      expect(visible.length).toBeGreaterThan(15);
      for (let i = 1; i < visible.length; i++) expect(spans.some(span => span.from === visible[i - 1]!.id && span.to === visible[i]!.id)).toBe(true);
      for (const span of spans) {
        const a = plan.barriers.find(p => p.id === span.from)!, b = plan.barriers.find(p => p.id === span.to)!;
        for (const t of [0, .25, .5, .75, 1]) for (const side of [-1, 1]) {
          const x = a.x + (b.x - a.x) * t + (a.outwardX + (b.outwardX - a.outwardX) * t) * side * 3.5;
          const z = a.z + (b.z - a.z) * t + (a.outwardZ + (b.outwardZ - a.outwardZ) * t) * side * 3.5;
          const toe = a.bottom + (b.bottom - a.bottom) * t;
          expect(toe, span.from).toBeLessThan(race.terrain.heightAt(x, z) - 1);
        }
      }
      expect(mesh.geometry.getAttribute('position').count / 3).toBeLessThan(20_000);
      expect(mesh.geometry.groups).toHaveLength(0);
    } finally {
      for (const mesh of meshes) { mesh.geometry.dispose(); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose(); }
    }
  });

  it('keeps whole continuation structures outside all real lanes and stages a visible signal after the tight bend', () => {
    expect(plan.finishMarkers).toHaveLength(2);
    const render = race.course.getRenderData(4096);
    const points = [...render.points, ...race.course.branches.flatMap(branch => branch.points)];
    const focus = race.course.sampleAtProgress(.83203125);
    const camera = new PerspectiveCamera(65, 16 / 10, .1, 3000);
    camera.position.set(focus.x - focus.tangentX * 40, focus.y + 14, focus.z - focus.tangentZ * 40);
    camera.lookAt(focus.x + focus.tangentX * 55, focus.y + 5, focus.z + focus.tangentZ * 55); camera.updateMatrixWorld(true);
    let visible = 0;
    for (const marker of plan.finishMarkers) {
      expect(points.every(point => Math.hypot(marker.x - point.x, marker.z - point.z) > point.width + marker.radius + 8)).toBe(true);
      const target = race.course.sampleAtProgress(marker.progress);
      expect(target.distance - focus.distance).toBeGreaterThan(150);
      expect(target.distance - focus.distance).toBeLessThan(420);
      const projection = new Vector3(marker.x, marker.y + marker.height - 15, marker.z).project(camera);
      if (Math.abs(projection.x) < 1 && Math.abs(projection.y) < 1 && projection.z > -1 && projection.z < 1) visible++;
    }
    expect(visible).toBeGreaterThan(0);
  });
});
