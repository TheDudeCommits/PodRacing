import { Box3, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it } from 'vitest';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { WRECK_PRESENTATION_DURATION, type WreckVisualPose } from '../../src/render/combat/WreckVisualPose';
import { fixture, matrices, race, step, variants } from '../fixtures/teemtoActualCamera';

const aspects = [1440 / 900, 390 / 844];
const checkpoints = new Set([913, 932, 1067]);
const engineNames = ['teemto-engine-left-body', 'teemto-damage-right-front-v16', 'teemto-damage-right-rear-v16'];
const epsilon = 1e-6;
const measurements: unknown[] = [];
afterAll(async () => {
  // Optional private diagnostic output; ordinary test runs write no files.
  const metricPath = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V24_CAMERA_METRICS_PATH;
  if (metricPath) {
    const fileModule: string = 'node:fs';
    const { writeFileSync } = await import(/* @vite-ignore */ fileModule);
    writeFileSync(metricPath, JSON.stringify(measurements, null, 2) + '\n');
  }
});

function subjectFor(sim: ReturnType<typeof race>, pose: WreckVisualPose): CameraSubject {
  const vehicle = sim.state.entries[0]!.vehicle;
  return {
    position: new Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z),
    forward: new Vector3(Math.sin(vehicle.orientation.yaw), 0, Math.cos(vehicle.orientation.yaw)),
    velocity: new Vector3(vehicle.velocity.x, vehicle.velocity.y, vehicle.velocity.z), speed: 0,
    combatFocus: pose.center, combatForward: pose.forward, combatRadius: pose.radius,
    combatBounds: pose.bounds, combatTerrain: sim.terrain, combatImpactPosition: pose.rupture?.position,
    combatImpactFraming: pose.impactFraming,
  };
}

function bodyMatrix(pose: WreckVisualPose): Matrix4 {
  return new Matrix4().compose(pose.position, new Quaternion().setFromEuler(pose.rotation), new Vector3(1, 1, 1));
}

function fittedConstraints(rig: CinematicCamera, pose: WreckVisualPose) {
  const focus = pose.impactFraming!.center;
  const back = new Vector3(0, 0, 1).applyQuaternion(rig.camera.quaternion);
  const right = new Vector3(1, 0, 0).applyQuaternion(rig.camera.quaternion);
  const up = new Vector3(0, 1, 0).applyQuaternion(rig.camera.quaternion);
  const tangent = Math.tan(Math.PI / 6), horizontal = tangent * rig.camera.aspect, offset = new Vector3();
  const margin = pose.impactFraming!.horizontalHalfSpan ?? .74;
  let horizontalMax = -Infinity, horizontalMin = Infinity, verticalMax = -Infinity, verticalMin = Infinity, fullNearDistance = 2;
  for (const p of pose.impactFraming!.bounds) {
    offset.copy(p).sub(focus);
    const x = offset.dot(right), y = offset.dot(up), z = offset.dot(back);
    horizontalMax = Math.max(horizontalMax, x + margin * horizontal * z);
    horizontalMin = Math.min(horizontalMin, x - margin * horizontal * z);
    verticalMax = Math.max(verticalMax, y + .70 * tangent * z);
    verticalMin = Math.min(verticalMin, y - .58 * tangent * z);
  }
  for (const p of pose.bounds) fullNearDistance = Math.max(fullNearDistance, offset.copy(p).sub(focus).dot(back) + rig.camera.near + .5);
  const horizontalDistance = Math.max(2, (horizontalMax - horizontalMin) / (2 * margin * horizontal));
  const verticalDistance = Math.max(2, (verticalMax - verticalMin) / (1.28 * tangent));
  const fittedDistance = Math.max(horizontalDistance, verticalDistance, fullNearDistance);
  const actualAxialDistance = rig.camera.position.clone().sub(focus).dot(back);
  return { horizontalDistance, verticalDistance, fullNearDistance, fittedDistance, actualAxialDistance,
    extraDistanceAboveGeometricFit: actualAxialDistance - fittedDistance };
}

function safeCluster(rig: CinematicCamera, points: readonly Vector3[], label: string, horizontal = .74): void {
  rig.camera.updateMatrixWorld(true);
  for (const world of points) {
    const p = world.clone().project(rig.camera);
    expect(p.toArray().every(Number.isFinite), `${label}: finite`).toBe(true);
    expect(p.x, `${label}: left`).toBeGreaterThanOrEqual(-horizontal - epsilon);
    expect(p.x, `${label}: right`).toBeLessThanOrEqual(horizontal + epsilon);
    expect(p.y, `${label}: bottom`).toBeGreaterThanOrEqual(-.58 - epsilon);
    expect(p.y, `${label}: top`).toBeLessThanOrEqual(.70 + epsilon);
    expect(p.z, `${label}: near`).toBeGreaterThan(-1);
    expect(p.z, `${label}: far`).toBeLessThan(1);
  }
}

function sourceSafety(rig: CinematicCamera, art: ReturnType<typeof fixture>, pose: WreckVisualPose, label: string, baseline?: CinematicCamera): void {
  art.root.updateMatrixWorld(true); rig.camera.updateMatrixWorld(true);
  const body = bodyMatrix(pose), matrix = new Matrix4(), point = new Vector3();
  let count = 0, nearest = Infinity, farthest = -Infinity;
  let principalCount = 0, minX = Infinity, maxX = -Infinity, baselineMinX = Infinity, baselineMaxX = -Infinity;
  const baselineMatrix = new Matrix4(), baselinePoint = new Vector3();
  baseline?.camera.updateMatrixWorld(true);
  const horizontal = Math.tan(rig.camera.fov * Math.PI / 360) * rig.camera.aspect;
  const baselineHorizontal = baseline ? Math.tan(baseline.camera.fov * Math.PI / 360) * baseline.camera.aspect : 1;
  for (const mesh of art.all.filter(mesh => mesh.visible)) {
    matrix.copy(rig.camera.matrixWorldInverse).multiply(body).multiply(mesh.matrixWorld);
    if (baseline) baselineMatrix.copy(baseline.camera.matrixWorldInverse).multiply(body).multiply(mesh.matrixWorld);
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(matrix);
      nearest = Math.min(nearest, -point.z); farthest = Math.max(farthest, -point.z); count++;
      if (baseline && engineNames.includes(mesh.name)) {
        baselinePoint.fromBufferAttribute(position, i).applyMatrix4(baselineMatrix);
        const x = point.x / (-point.z * horizontal), baselineX = baselinePoint.x / (-baselinePoint.z * baselineHorizontal);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        baselineMinX = Math.min(baselineMinX, baselineX); baselineMaxX = Math.max(baselineMaxX, baselineX); principalCount++;
      }
    }
  }
  const expectedCount = art.variant === 'hero' ? (art.breakup.active ? 90_581 : 73_048) : (art.breakup.active ? 45_605 : 42_278);
  expect(count, `${label}: exact visible source POSITION count`).toBe(expectedCount);
  expect(nearest, `${label}: complete visible source in front of lens`).toBeGreaterThan(rig.camera.near);
  expect(farthest, `${label}: complete visible source before far plane`).toBeLessThan(rig.camera.far);
  if (baseline) measurements.push({ label, principalSourcePositions: principalCount,
    completeVisibleSourcePositions: count, principalWidthFraction: (maxX - minX) / 2,
    baselinePrincipalWidthFraction: (baselineMaxX - baselineMinX) / 2,
    desiredWidthFraction: [.65, .75], candidateCamera: rig.camera.position.toArray(), baselineCamera: baseline.camera.position.toArray(),
    candidateDistanceToImpactCenter: rig.camera.position.distanceTo(pose.impactFraming!.center),
    baselineDistanceToImpactCenter: baseline.camera.position.distanceTo(pose.impactFraming!.center),
    candidateConstraintsAtCurrentAngle: fittedConstraints(rig, pose),
    scope: 'Same actual source pose, complete principal-engine POSITION extents from the existing source-safety pass; both cameras share birth and side/chase history. Source projection only, not native pixels.',
  });
}

function assertActualCluster(art: ReturnType<typeof fixture>, pose: WreckVisualPose): void {
  const cluster = pose.impactFraming!;
  expect(cluster).toBeDefined();
  expect(Number.isFinite(cluster.ageSeconds)).toBe(true);
  expect(cluster.center.toArray().every(Number.isFinite)).toBe(true);
  expect(pose.bounds, 'full stationary, engine and optional tether safety bounds retained').toHaveLength(art.damage.some(mesh => mesh.name === 'teemto-damage-severed-tethers-v16') ? 40 : 32);
  art.root.updateMatrixWorld(true);
  const body = bodyMatrix(pose), model = new Matrix4(), corner = new Vector3();
  const left: Vector3[] = [], torn: Vector3[] = [];
  for (const name of engineNames) {
    const mesh = art.all.find(mesh => mesh.name === name)!;
    expect(mesh?.visible, name).toBe(true);
    const local = new Box3(), position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) local.expandByPoint(corner.fromBufferAttribute(position, i));
    model.copy(body).multiply(mesh.matrixWorld);
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? local.max.x : local.min.x, i & 2 ? local.max.y : local.min.y, i & 4 ? local.max.z : local.min.z).applyMatrix4(model);
      // V29 changes only composition: every complete source corner remains
      // mandatory for lens safety even while the left engine is offscreen.
      expect(Math.min(...pose.bounds.map(point => point.distanceTo(corner))), `${name}: full safety corner retained`).toBeLessThan(1e-7);
      (name === engineNames[0] ? left : torn).push(corner.clone());
    }
  }
  const witnesses = [pose.rupture!.position, pose.groundContact?.position ?? pose.rupture!.position];
  const early = [...torn, ...witnesses], earlyCenter = new Box3().setFromPoints(early).getCenter(new Vector3());
  const blend = MathUtils.smoothstep(cluster.ageSeconds!, .13, .65);
  expect(cluster.horizontalHalfSpan).toBeCloseTo(.88 - .14 * blend, 12);
  const expected = [...early, ...left.map(point => earlyCenter.clone().lerp(point, blend))];
  expect(cluster.bounds, '18 actual tear/contact points plus 8 preallocated context points').toHaveLength(26);
  expected.forEach((point, index) => expect(cluster.bounds[index]!.distanceTo(point), `source-derived composition ${index}`).toBeLessThan(1e-7));
  expect(cluster.center.distanceTo(new Box3().setFromPoints(expected).getCenter(new Vector3()))).toBeLessThan(1e-7);
}

function cameraState(rig: CinematicCamera) {
  return [...rig.camera.position.toArray(), ...rig.camera.quaternion.toArray(), rig.camera.fov];
}

describe('actual authored Teemto impact camera', () => {
  it.each(variants)('%s fits the actual impact cluster while retaining complete source near-plane safety through the handoff', name => {
    const art = fixture(name), sim = race(), rest = matrices(art);
    const pilots = art.original.filter(mesh => mesh.name.startsWith('teemto-pilot-'));
    const pilotParents = pilots.map(mesh => mesh.parent), pilotMatrices = pilots.map(mesh => mesh.matrix.clone());
    const rigs = aspects.map(aspect => { const rig = new CinematicCamera(); rig.camera.aspect = aspect; return rig; });
    const baseline = new CinematicCamera(); baseline.camera.aspect = aspects[0]!;
    let impactFrames = 0;
    try {
      for (let frame = 1; frame <= 1067; frame++) {
        step(sim, frame); if (frame < 910) continue;
        const entry = sim.state.entries[0]!, before = checkpoints.has(frame) ? JSON.stringify(sim.state) : null;
        const pose: WreckVisualPose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, sim.terrain);
        art.breakup.update(pose, entry.galactic!.wreck.timer, sim.terrain);
        const subject = subjectFor(sim, pose), cluster = pose.impactFraming!;
        if (frame === 910) { expect(cluster).toBeUndefined(); }
        else { expect(art.breakup.damageVariantActive).toBe(true); expect(cluster).toBeDefined(); impactFrames++; }
        subject.wreckChase = frame > 943;
        const boundsBefore = pose.bounds.map(point => point.toArray());
        const clusterBefore = cluster?.bounds.map(point => point.toArray());
        if (checkpoints.has(frame)) assertActualCluster(art, pose);
        baseline.setMode(subject.wreckChase ? 'chase' : 'side'); baseline.setCombatFraming(!subject.wreckChase);
        const baselineSubject = { ...subject, combatImpactFraming: undefined };
        if (frame === 910) baseline.snap(baselineSubject); else baseline.update(1 / 120, frame / 120, baselineSubject);
        for (const [index, rig] of rigs.entries()) {
          rig.setMode(subject.wreckChase ? 'chase' : 'side'); rig.setCombatFraming(!subject.wreckChase);
          if (frame === 910) rig.snap(subject); else rig.update(1 / 120, frame / 120, subject);
          const label = `${name}/${frame}/${aspects[index]}`;
          safeCluster(rig, cluster?.bounds ?? pose.bounds, label, cluster ? cluster.horizontalHalfSpan! : .78);
          expect(rig.camera.position.y - sim.terrain.heightAt(rig.camera.position.x, rig.camera.position.z), `${label}: eye above terrain`).toBeGreaterThanOrEqual(1.2 - epsilon);
          if (checkpoints.has(frame)) {
            const measuredBaseline = index === 0 && (frame === 932 || frame === 1067) ? baseline : undefined;
            sourceSafety(rig, art, pose, label, measuredBaseline);
            if (measuredBaseline) measurements.push({ label,
              candidateEyeGround: rig.camera.position.y - sim.terrain.heightAt(rig.camera.position.x, rig.camera.position.z),
              baselineEyeGround: baseline.camera.position.y - sim.terrain.heightAt(baseline.camera.position.x, baseline.camera.position.z),
            });
            // Both protected views also receive explicit endpoint coverage.
            const endpoint = new CinematicCamera(); endpoint.camera.aspect = aspects[index]!;
            try { for (const mode of ['side', 'chase'] as const) {
              endpoint.setMode(mode); endpoint.setCombatFraming(mode === 'side');
              endpoint.snap({ ...subject, wreckChase: mode === 'chase' });
              safeCluster(endpoint, cluster.bounds, `${label}/${mode}`, cluster.horizontalHalfSpan!);
              sourceSafety(endpoint, art, pose, `${label}/${mode}`);
            } } finally { endpoint.dispose(); }
          }
        }
        expect(pose.bounds.map(point => point.toArray())).toEqual(boundsBefore);
        expect(cluster?.bounds.map(point => point.toArray())).toEqual(clusterBefore);
        if (before) expect(JSON.stringify(sim.state)).toBe(before);
      }
      expect(impactFrames).toBe(157);
      for (let i = 0; i < pilots.length; i++) {
        expect(pilots[i]!.parent).toBe(pilotParents[i]); expect(pilots[i]!.matrix.equals(pilotMatrices[i]!)).toBe(true);
      }
    } finally { for (const rig of rigs) rig.dispose(); baseline.dispose(); art.breakup.reset(); }
    expect(matrices(art)).toEqual(rest);
  });

  it.each(variants)('%s clears the cluster at birth/reset and ignores stale or invalid framing during fallback and return', name => {
    const art = fixture(name), sim = race();
    const a = new CinematicCamera(), b = new CinematicCamera();
    try {
      for (let frame = 1; frame <= 932; frame++) step(sim, frame);
      const entry = sim.state.entries[0]!, before = JSON.stringify(sim.state);
      const pose: WreckVisualPose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, sim.terrain);
      art.breakup.update(pose, entry.galactic!.wreck.timer, sim.terrain);
      const stale = { center: pose.impactFraming!.center.clone(), bounds: pose.impactFraming!.bounds.map(point => point.clone()) };
      const subject = subjectFor(sim, pose);
      for (const mode of ['side', 'chase'] as const) {
        a.setMode(mode); b.setMode(mode); a.setCombatFraming(mode === 'side'); b.setCombatFraming(mode === 'side');
        for (const malformed of [
          undefined, { center: new Vector3(NaN, 0, 0), bounds: stale.bounds },
          { center: stale.center, bounds: [] }, { center: stale.center, bounds: [new Vector3(0, Infinity, 0), ...stale.bounds.slice(1)] },
        ]) {
          a.snap({ ...subject, wreckChase: mode === 'chase', combatImpactFraming: malformed });
          b.snap({ ...subject, wreckChase: mode === 'chase', combatImpactFraming: undefined });
          expect(cameraState(a)).toEqual(cameraState(b)); safeCluster(a, pose.bounds, `${name}/${mode}/legacy-full-fit`, .78);
        }
      }
      // Both rigs first acquire the same impact-shot history. Recovery retains
      // that chosen azimuth; stale versus absent metadata must not alter it.
      a.setMode('side'); b.setMode('side'); a.setCombatFraming(true); b.setCombatFraming(true);
      a.snap(subject); b.snap(subject);
      for (let tick = 0; tick < 4; tick++) { a.update(1 / 120, tick / 120, subject); b.update(1 / 120, tick / 120, subject); }
      // The renderer supplies an intact pose during protected recovery.
      const recovery = art.cache.update(entry.vehicle, WRECK_PRESENTATION_DURATION, sim.terrain);
      art.breakup.update(recovery, WRECK_PRESENTATION_DURATION, sim.terrain);
      expect(art.breakup.active).toBe(false); expect(recovery.impactFraming).toBeUndefined();
      const recoveredSubject = { ...subjectFor(sim, recovery), wreckChase: true, wreckRecovery: true };
      a.setMode('chase'); b.setMode('chase'); a.setCombatFraming(false); b.setCombatFraming(false);
      a.snap({ ...recoveredSubject, combatImpactFraming: stale }); b.snap(recoveredSubject);
      expect(cameraState(a)).toEqual(cameraState(b)); safeCluster(a, recovery.bounds, `${name}/recovery-full-fit`, .78);
      sourceSafety(a, art, recovery, `${name}/recovery-full-source`);
      const ordinary: CameraSubject = { position: recoveredSubject.position.clone(), forward: recoveredSubject.forward.clone(), velocity: new Vector3(), speed: 0 };
      a.snap({ ...ordinary, combatImpactFraming: stale }); b.snap(ordinary);
      for (let tick = 0; tick < 12; tick++) {
        ordinary.speed += 7; ordinary.velocity.copy(ordinary.forward).multiplyScalar(ordinary.speed);
        ordinary.position.addScaledVector(ordinary.velocity, 1 / 60);
        a.update(1 / 60, tick / 60, { ...ordinary, combatImpactFraming: stale }); b.update(1 / 60, tick / 60, ordinary);
        expect(cameraState(a)).toEqual(cameraState(b));
      }
      expect(JSON.stringify(sim.state)).toBe(before);
      art.breakup.reset(); expect(pose.impactFraming).toBeUndefined();
    } finally { a.dispose(); b.dispose(); art.breakup.reset(); }
  });
});
