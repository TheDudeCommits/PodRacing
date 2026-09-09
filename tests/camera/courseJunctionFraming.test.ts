import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { updateCourseJunctionFraming } from '../../src/camera/CourseJunctionFraming';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

const terrain = { heightAt: sampleTerrainHeight };
const race = new RaceSimulation({ terrain, seed: 0x494e4b53, competitionProfile: 'time-trial' });
const course = race.course, branch = course.branches.find(candidate => candidate.elevated)!;
const entry = branch.entryProgress * course.totalLength;
function branchSample(distance: number) {
  const progress = (entry + distance) / course.totalLength;
  let index = 0;
  while (index < branch.points.length - 2 && branch.points[index + 1]!.canonicalProgress < progress) index++;
  const a = branch.points[index]!, b = branch.points[index + 1]!;
  const t = Math.max(0, Math.min(1, (progress - a.canonicalProgress) / (b.canonicalProgress - a.canonicalProgress)));
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return { x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t,
    rightX: dz / length, rightZ: -dx / length, width: a.width + (b.width - a.width) * t };
}

describe('actual flagship junction framing', () => {
  it('keeps both approaching route envelopes inside the live chase lens', () => {
    const rig = new CinematicCamera();
    // Once a driver has passed the choice, the wider departing branch may
    // leave the near side of the lens. Test the decision approach through entry.
    for (const approach of [-120, -60, 0]) for (const lateral of [-6, 0, 6]) for (const speed of [90, 160, 210]) {
      const main = course.sampleAtDistance(entry + approach);
      const x = main.x + main.rightX * lateral, z = main.z + main.rightZ * lateral;
      const forward = new Vector3(main.tangentX, 0, main.tangentZ);
      const subject: CameraSubject = { position: new Vector3(x, race.terrain.heightAt(x, z) + 2.7, z),
        forward, velocity: forward.clone().multiplyScalar(speed), speed };
      const target = new Vector3();
      subject.junctionWeight = updateCourseJunctionFraming(course, main.progress, subject.position, forward, target);
      subject.junctionLookAhead = target;
      const ahead = course.sampleAtDistance(entry + approach + 55 + Math.min(70, speed * .3));
      subject.routeLookAhead = new Vector3(ahead.x, ahead.y + 3, ahead.z);
      rig.snap(subject);
      rig.camera.updateMatrixWorld(true);
      for (const distance of [90, 150, 220]) {
        const routes = [course.sampleAtDistance(entry + distance), branchSample(distance)];
        for (const point of routes) for (const side of [-1, 1]) {
          const projected = new Vector3(point.x + point.rightX * point.width * side,
            point.y + 1, point.z + point.rightZ * point.width * side).project(rig.camera);
          // Projection is framing evidence only: it cannot establish that a
          // crest, another racer or the actual scanned mesh does not occlude it.
          expect(Math.abs(projected.x), `${approach}/${lateral}/${speed}/${distance}`).toBeLessThan(.94);
          expect(projected.y).toBeGreaterThan(-.75);
          expect(projected.y).toBeLessThan(.65);
          expect(projected.z).toBeLessThan(1);
        }
      }
      const direction = rig.camera.getWorldDirection(new Vector3());
      const yaw = Math.atan2(direction.x * main.rightX + direction.z * main.rightZ,
        direction.x * forward.x + direction.z * forward.z);
      expect(Math.abs(yaw)).toBeLessThan(.29);
    }
    rig.dispose();
  });

  it('fades out on either chosen path and does not mutate the route or subject', () => {
    const routeBefore = JSON.stringify([course.branches, course.checkpoints]);
    const output = new Vector3();
    for (const approach of [20, 60, 100, 149, 150, 190]) {
      const main = course.sampleAtDistance(entry + approach);
      for (const point of [main, branchSample(approach)]) {
        const position = new Vector3(point.x, point.y + 2.7, point.z);
        const forward = new Vector3(point.rightZ * -1, 0, point.rightX);
        const before = position.toArray();
        const weight = updateCourseJunctionFraming(course, main.progress, position, forward, output);
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(1);
        if (approach >= 150) expect(weight).toBe(0);
        if (approach === 149) expect(weight).toBeLessThan(.001);
        expect(position.toArray()).toEqual(before);
      }
    }
    expect(JSON.stringify([course.branches, course.checkpoints])).toBe(routeBefore);
  });

  it('adds no junction orbit to other seeded courses or the home straight', () => {
    const output = new Vector3(7, 8, 9), position = new Vector3(), forward = new Vector3(0, 0, 1);
    expect(updateCourseJunctionFraming(course, .02, position, forward, output)).toBe(0);
    const other = createProceduralPodraceCourse(terrain, 1234);
    expect(updateCourseJunctionFraming(other, branch.entryProgress, position, forward, output)).toBe(0);
    expect(output.toArray()).toEqual([7, 8, 9]);
  });
});
