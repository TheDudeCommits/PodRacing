import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4 } from 'three';
import { createRaceSimulation } from '../../src/game/race';
import { createCourseMarkers, COURSE_MARKER_RADIUS } from '../../src/game/race/courseMarkers';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { createCourseGulfUniforms } from '../../src/render/terrain/CourseGulfTextures';
import { RaceCourseView } from '../../src/render/objects/RaceCourseView';

const terrain = {heightAt: sampleTerrainHeight};

describe('route lights with a recoverable shoulder', () => {
  it.each([0x494e4b53, 0x464f554e, 0x474c4153, 0, 0xffffffff])(
    'keeps every light clear of every racing lane for seed %i', seed => {
      const race = createRaceSimulation({terrain, seed, competitionProfile: 'time-trial'});
      const data = race.course.getRenderData(1024);
      const markers = race.routeMarkers;
      expect(markers.length).toBeGreaterThan(90);
      for (const marker of markers) {
        const route = race.course.projectPoint(marker.x, marker.z);
        expect(route.distanceToCenter - route.width, marker.id).toBeGreaterThan(7.8 + COURSE_MARKER_RADIUS + 1.5);
        expect(marker.maxY - race.course.heightAt(marker.x, marker.z)).toBeCloseTo(4.9, 9);
        expect(route.tag, marker.id).not.toBe('narrow-canyon');
        expect(race.course.getObstacleContact(marker.x, marker.z,
          7.8 + COURSE_MARKER_RADIUS, undefined, marker.minY + 2.65), marker.id).toBeNull();
      }
      // Both reconstructions, including alternate path rejection, are deterministic.
      expect(createCourseMarkers(data.points, data.branches ?? [], (x, z) => race.course.heightAt(x, z))
        .filter(marker => !race.course.getObstacleContact(marker.x, marker.z,
          7.8 + COURSE_MARKER_RADIUS, undefined, marker.minY + 2.65))).toEqual(markers);
    },
  );

  it('uses the identical light positions and finite heights for rendering and contact', () => {
    const race = createRaceSimulation({terrain, seed: 0x494e4b53, competitionProfile: 'time-trial'});
    const data = race.course.getRenderData(1024);
    const colliders = (race as unknown as {markerColliders: {x:number;z:number;minY:number;maxY:number}[]}).markerColliders;
    const view = new RaceCourseView();
    try {
      view.setTerrainSampler((x, z) => race.course.heightAt(x, z), createCourseGulfUniforms());
      view.setCourse(data, race.routeMarkers);
      const lights = view.children.find(child => child.name === 'coherent-far-pylon-marker-lod') as InstancedMesh;
      expect(lights.count).toBe(colliders.length);
      const transform = new Matrix4();
      for (let index = 0; index < lights.count; index += 1) {
        lights.getMatrixAt(index, transform);
        expect(transform.elements[12]).toBe(Math.fround(colliders[index]!.x));
        expect(transform.elements[14]).toBe(Math.fround(colliders[index]!.z));
        expect(transform.elements[13]).toBe(Math.fround(colliders[index]!.minY + .2 + .16));
      }
    } finally { view.dispose(); }
  });
});
