import { describe, expect, it } from 'vitest';
import { CatmullRomCurve3, Quaternion, Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { createCourseGulfField } from '../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import {
  createInkstormFoundry, createInkstormFoundryPipeJoint, getInkstormFoundryPlan, type FoundryPipe,
} from '../../src/render/inkstorm/InkstormFoundry';
import { createInkstormPipeJoint } from '../../src/render/inkstorm/InkstormPipeJoint';

const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
const gulf = createCourseGulfField(course)!;
const ground = (x: number, z: number) => sampleTerrainHeight(x, z, gulf);
const plan = getInkstormFoundryPlan(course, ground);
const up = new Vector3(0, 1, 0);
const curveFor = (pipe: FoundryPipe): CatmullRomCurve3 => new CatmullRomCurve3(
  pipe.points.map(p => new Vector3(...p)).filter((p, i, points) => !i || p.distanceToSquared(points[i - 1]!) > .01),
  false, 'catmullrom', .08,
);

describe('foundry unions follow their actual pressure-pipe centerlines', () => {
  it.each([
    ['foundry-overhead-1', true, 4.4],
    ['foundry-side-1-header-2', false, 4.4],
    ['foundry-overhead-2', true, 3.5],
  ] as const)('seats %s atEnd=%s on the curved pipe despite its short vertical lead', (id, atEnd, oldMinimumGap) => {
    const pipe = plan.pipes.find(p => p.id === id)!;
    const curve = curveFor(pipe), end = atEnd ? curve.points.length - 1 : 0;
    const offset = (atEnd ? pipe.endJointOffset : pipe.startJointOffset)!;
    const previousDirection = atEnd
      ? curve.points[end]!.clone().sub(curve.points[end - 1]!)
      : curve.points[1]!.clone().sub(curve.points[0]!);
    expect(previousDirection.length()).toBeLessThan(offset);
    const previousCenter = curve.points[end]!.clone().addScaledVector(previousDirection.normalize(), atEnd ? -offset : offset);
    let previousGap = Infinity;
    for (let i = 0; i <= 2000; i++) previousGap = Math.min(previousGap, curve.getPoint(i / 2000).distanceTo(previousCenter));
    expect(previousGap).toBeGreaterThan(oldMinimumGap);

    const joint = createInkstormFoundryPipeJoint(pipe, curve, atEnd);
    try {
      joint.computeBoundingBox();
      const center = joint.boundingBox!.getCenter(new Vector3());
      const arcFraction = offset / curve.getLength(), u = atEnd ? 1 - arcFraction : arcFraction;
      expect(center.distanceTo(curve.getPointAt(u))).toBeLessThan(.002);
      // Inspect the emitted lower annular face, whose outward normal is -axis.
      // A finite difference of the centerline independently checks its alignment.
      const axis = new Vector3().fromBufferAttribute(joint.getAttribute('normal'), 0).negate().normalize();
      const tangent = curve.getPointAt(u + .00001).sub(curve.getPointAt(u - .00001)).normalize();
      expect(axis.dot(tangent)).toBeGreaterThan(.99999);
    } finally { joint.dispose(); }
  });

  it('retains the original unshifted, nonuniformly scaled socket flange geometry', () => {
    const pipe = plan.pipes.find(p => p.id.endsWith('-socket-link-0'))!;
    const curve = curveFor(pipe), direction = curve.points[1]!.clone().sub(curve.points[0]!).normalize();
    const expected = createInkstormPipeJoint(pipe.radius);
    expected.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction));
    expected.scale(pipe.socketScale![0], pipe.socketScale![1], pipe.socketScale![0]);
    expected.translate(...pipe.points[0]!);
    const actual = createInkstormFoundryPipeJoint(pipe, curve, false);
    try {
      for (const name of ['position', 'normal', 'color']) {
        const a = actual.getAttribute(name).array, b = expected.getAttribute(name).array;
        expect(a.length).toBe(b.length);
        let differences = 0;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differences++;
        expect(differences, `${name} changed at the original socket`).toBe(0);
      }
    } finally { actual.dispose(); expected.dispose(); }
  });

  it('clamps an oversized inward offset to the midpoint of a short pipe', () => {
    const pipe: FoundryPipe = { id: 'short-pipe', radius: 1, color: '#fff', points: [[0, 0, 0], [0, 10, 0]],
      startJointOffset: 50, endJointOffset: 50 };
    for (const atEnd of [false, true]) {
      const joint = createInkstormFoundryPipeJoint(pipe, curveFor(pipe), atEnd);
      try {
        joint.computeBoundingBox();
        expect(joint.boundingBox!.getCenter(new Vector3()).distanceTo(new Vector3(0, 5, 0))).toBeLessThan(.00001);
      } finally { joint.dispose(); }
    }
  });

  it('keeps every assembled flagship position, normal, and paint coordinate finite', () => {
    const mesh = createInkstormFoundry(course, ground)!;
    try {
      const count = mesh.geometry.getAttribute('position').count;
      expect(count).toBeGreaterThan(0);
      for (const name of ['position', 'normal', 'color']) {
        const attribute = mesh.geometry.getAttribute(name);
        expect(attribute.count).toBe(count);
        let nonFinite = 0;
        for (const value of attribute.array) if (!Number.isFinite(value)) nonFinite++;
        expect(nonFinite, `Nonfinite ${name} in the assembled network`).toBe(0);
      }
    } finally { mesh.geometry.dispose(); if (!Array.isArray(mesh.material)) mesh.material.dispose(); }
  });
});
