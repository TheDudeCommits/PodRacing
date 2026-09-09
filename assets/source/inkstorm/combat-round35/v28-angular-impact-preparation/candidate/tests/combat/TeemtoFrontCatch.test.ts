import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { fixture, race, step, variants } from '../fixtures/teemtoActualCamera';
import { CinematicCamera } from '../../src/camera/CinematicCamera';
import { sampleTeemtoStrikeMotion, sampleTeemtoFrontCatch, TEEMTO_FRONT_CATCH_END, TEEMTO_FRONT_CATCH_PITCH, TEEMTO_FRONT_RESERVED_ROLL } from '../../src/render/combat/TeemtoStrikeMotion';
import { WRECK_PRESENTATION_DURATION } from '../../src/render/combat/WreckVisualPose';
const measurements: unknown[] = [], unit = new Vector3(1, 1, 1), zAxis = new Vector3(0, 0, 1);
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V28_FRONT_METRICS_PATH;
  if (path) { const module: string = 'node:fs'; const { writeFileSync } = await import(/* @vite-ignore */ module); writeFileSync(path, JSON.stringify(measurements, null, 2) + '\n'); }
});
type Point = [number, number];
function hull(input: Point[]): Point[] {
  const sorted = input.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [], upper: Point[] = [];
  for (const p of sorted) { while (lower.length > 1 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of sorted.reverse()) { while (upper.length > 1 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
describe('front edge catch and changing source silhouette', () => {
  it('reserves exactly 55 degrees of roll and 20 degrees of pitch after contact, with a bounded smooth stop', () => {
    expect(TEEMTO_FRONT_RESERVED_ROLL * 180 / Math.PI).toBeCloseTo(55, 12);
    expect(TEEMTO_FRONT_CATCH_PITCH * 180 / Math.PI).toBeCloseTo(-20, 12);
    expect(TEEMTO_FRONT_CATCH_END).toBe(.65);
    expect(sampleTeemtoFrontCatch(.13)).toBe(1); expect(sampleTeemtoFrontCatch(.65)).toBe(0);
    for (const t of [.65, .77, .9, 1.8, 2.15, NaN, Infinity]) expect(sampleTeemtoFrontCatch(t)).toBe(0);
    let previous = 1;
    for (let tick = 0; tick <= 100; tick++) {
      const value = sampleTeemtoFrontCatch(.13 + tick * .52 / 100);
      expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(previous); previous = value;
    }
    // A substantial portion of the turn remains in the requested visible interval.
    expect((sampleTeemtoFrontCatch(.3) - sampleTeemtoFrontCatch(.6)) * 55).toBeGreaterThan(38);
    expect((sampleTeemtoFrontCatch(.65 - 1e-6) - sampleTeemtoFrontCatch(.65)) / 1e-6).toBeLessThan(.00002);
  });
  it.each(variants)('%s changes the actual front longitudinal silhouette, then reaches the exact broad roof orientation', name => {
    const art = fixture(name), sim = race(); for (let frame = 1; frame <= 910; frame++) step(sim, frame);
    const state = sim.state.entries[0]!.vehicle, before = JSON.stringify(sim.state);
    const mesh = art.all.find(m => m.name === 'teemto-damage-right-front-v16')!;
    mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox!, localCenter = box.getCenter(new Vector3());
    const sourceCenter = localCenter.clone().applyMatrix4(mesh.matrixWorld);
    const source = mesh.geometry.getAttribute('position'), body = new Matrix4(), world = new Matrix4();
    const sample = (age: number) => {
      const remaining = WRECK_PRESENTATION_DURATION - age, pose = art.cache.update(state, remaining, sim.terrain);
      art.breakup.update(pose, remaining, sim.terrain); art.root.updateMatrixWorld(true);
      body.compose(pose.position, new Quaternion().setFromEuler(pose.rotation), unit); world.copy(body).multiply(mesh.matrixWorld);
      const path = new Vector3(); sampleTeemtoStrikeMotion(1, age, path, new Vector3());
      const base = pose.baseMotion!, movingCenter = sourceCenter.clone().add(path).applyEuler(base.rotation).add(base.position);
      const heading = base.rotation.y + .6, dx = Math.sin(heading), dz = Math.cos(heading), reach = (box.max.z - box.min.z) * .4;
      const a = sim.terrain.heightAt(movingCenter.x + dx * reach, movingCenter.z + dz * reach);
      const b = sim.terrain.heightAt(movingCenter.x - dx * reach, movingCenter.z - dz * reach);
      const grade = Math.max(-.35, Math.min(.35, Math.atan2(a - b, 2 * reach)));
      return { pose, grade, world: world.clone(), q: new Quaternion().setFromRotationMatrix(world), center: localCenter.clone().applyMatrix4(world) };
    };
    try {
      const rest = sample(.9), rig = new CinematicCamera(); rig.camera.aspect = 1440 / 900; rig.setMode('side'); rig.setCombatFraming(true);
      rig.snap({ position: new Vector3(state.position.x, state.position.y, state.position.z), forward: new Vector3(Math.sin(state.orientation.yaw), 0, Math.cos(state.orientation.yaw)),
        velocity: new Vector3(), speed: 0, combatFocus: rest.pose.center, combatForward: rest.pose.forward, combatRadius: rest.pose.radius,
        combatBounds: rest.pose.bounds, combatTerrain: sim.terrain, combatImpactFraming: rest.pose.impactFraming, combatImpactPosition: rest.pose.rupture?.position });
      rig.camera.updateMatrixWorld(true);
      const fixedCenter = rest.center, projection = (point: Vector3): Point => { point.project(rig.camera); return [point.x * 720, -point.y * 450]; };
      const rows: unknown[] = [];
      let contactAxis: Vector3 | undefined;
      for (const age of [.13, .3, .4, .5, .6, .65, .77, .9]) {
        const snap = sample(age), axis = zAxis.clone().applyQuaternion(snap.q); if (!contactAxis) { contactAxis = axis.clone(); }
        if (age <= .65) expect(Math.asin(axis.y)).toBeCloseTo(snap.grade - TEEMTO_FRONT_CATCH_PITCH * sampleTeemtoFrontCatch(age), 8);
        const projected: Point[] = [], offset = fixedCenter.clone().sub(snap.center);
        let minimum = Infinity, nearGroundVertices = 0;
        const p = new Vector3();
        for (let i = 0; i < source.count; i++) {
          p.fromBufferAttribute(source, i).applyMatrix4(snap.world);
          const gap = p.y - sim.terrain.heightAt(p.x, p.z); minimum = Math.min(minimum, gap); if (gap <= .45) nearGroundVertices++;
          expect(gap).toBeGreaterThanOrEqual(-1e-6);
          projected.push(projection(p.add(offset)));
        }
        expect(nearGroundVertices).toBeGreaterThan(0);
        const endpoints = [box.min.z, box.max.z].map(z => projection(new Vector3(localCenter.x, localCenter.y, z).applyMatrix4(snap.world).add(offset)));
        const screenAngle = Math.atan2(endpoints[1]![1] - endpoints[0]![1], endpoints[1]![0] - endpoints[0]![0]) * 180 / Math.PI;
        rows.push({ age, terrainGradeDegrees: snap.grade * 180 / Math.PI, sourceVertices: source.count, minimum, nearGroundVertices, axis: axis.toArray(), axisAngleFromContactDegrees: axis.angleTo(contactAxis) * 180 / Math.PI,
          rotation: snap.q.toArray(), center: snap.center.toArray(), screenAxisAngleDegrees: screenAngle, endpoints, hull: hull(projected) });
        if (age >= .77) expect(snap.q.angleTo(rest.q)).toBeLessThan(1e-7);
        if (age === .65) expect(axis.angleTo(contactAxis) * 180 / Math.PI).toBeGreaterThan(18);
        if (age === .9) {
          // The extra support pass fits the actual resting patch, while the
          // authored roof bank remains exact. Terminal full-source band is
          // separately required by the unchanged GroundFootprint fixture.
          expect(new Euler().setFromQuaternion(snap.q, 'YXZ').z).toBeCloseTo(Math.PI * 11 / 12, 8);
          expect(Math.abs(Math.asin(axis.y) - snap.grade)).toBeLessThanOrEqual(.12 + 1e-7);
        }
      }
      // Same source and fixed view, hypothetical roll-only contact orientation:
      // remove the catch pitch while retaining the actual 110-degree contact roll.
      const contact = sample(.13), euler = new Euler().setFromQuaternion(contact.q, 'YXZ'); euler.x -= TEEMTO_FRONT_CATCH_PITCH;
      const rollOnlyQ = new Quaternion().setFromEuler(euler), rollOnlyWorld = new Matrix4().compose(new Vector3(), rollOnlyQ, unit);
      rollOnlyWorld.setPosition(localCenter.clone().applyQuaternion(rollOnlyQ).negate().add(fixedCenter));
      const projected: Point[] = [], p = new Vector3();
      for (let i = 0; i < source.count; i++) projected.push(projection(p.fromBufferAttribute(source, i).applyMatrix4(rollOnlyWorld)));
      const endpoints = [box.min.z, box.max.z].map(z => projection(new Vector3(localCenter.x, localCenter.y, z).applyMatrix4(rollOnlyWorld)));
      expect(Math.asin(zAxis.clone().applyQuaternion(rollOnlyQ).y)).toBeCloseTo(contact.grade, 8);
      const catchAngle = zAxis.clone().applyQuaternion(contact.q).angleTo(zAxis.clone().applyQuaternion(rollOnlyQ));
      expect(catchAngle * 180 / Math.PI).toBeCloseTo(20, 8);
      measurements.push({ name, sourceBoxSize: box.getSize(new Vector3()).toArray(), camera: { position: rig.camera.position.toArray(), quaternion: rig.camera.quaternion.toArray(), fov: rig.camera.fov, aspect: rig.camera.aspect },
        scope: 'Complete actual front POSITION convex hulls in a fixed runtime side-camera projection; source centers aligned to isolate orientation. Analytic source diagram, not gameplay or native pixels. Hypothetical roll-only pose is a silhouette comparison, not a grounded simulation.',
        rows, rollOnlyContact: { endpoints, hull: hull(projected), screenAxisAngleDegrees: Math.atan2(endpoints[1]![1] - endpoints[0]![1], endpoints[1]![0] - endpoints[0]![0]) * 180 / Math.PI } });
      expect(JSON.stringify(sim.state)).toBe(before);
    } finally { art.breakup.reset(); }
  });
});
