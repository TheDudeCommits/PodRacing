import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { fixture, race, step, variants } from '../fixtures/teemtoActualCamera';

function cameraState(rig: CinematicCamera) {
  return [...rig.camera.position.toArray(), ...rig.camera.quaternion.toArray(), rig.camera.fov];
}
function simpleSubject(): CameraSubject {
  const bounds = [];
  for (const x of [-8, 8]) for (const y of [0, 5]) for (const z of [-10, 18]) bounds.push(new Vector3(x, y, z));
  return { position: new Vector3(), forward: new Vector3(0, 0, 1), velocity: new Vector3(), speed: 200,
    combatFocus: new Box3().setFromPoints(bounds).getCenter(new Vector3()), combatBounds: bounds,
    combatForward: new Vector3(0, 0, 1), combatTerrain: { heightAt: () => -100 },
    combatImpactPosition: new Vector3(5, 2, 8), combatImpactFraming: {
      center: new Box3().setFromPoints(bounds).getCenter(new Vector3()), bounds, ageSeconds: .8,
    } };
}
function sourceExtent(rig: CinematicCamera, art: ReturnType<typeof fixture>, body: Matrix4) {
  const names = new Set(['teemto-engine-left-body', 'teemto-damage-right-front-v16', 'teemto-damage-right-rear-v16']);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
  const matrix = new Matrix4(), point = new Vector3();
  rig.camera.updateMatrixWorld(true); art.root.updateMatrixWorld(true);
  for (const mesh of art.all) {
    if (!names.has(mesh.name)) continue;
    matrix.copy(rig.camera.projectionMatrix).multiply(rig.camera.matrixWorldInverse).multiply(body).multiply(mesh.matrixWorld);
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(matrix); count++;
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
    }
  }
  expect(count).toBeGreaterThan(10000);
  return { width: (maxX - minX) / 2, centerY: (1 - (minY + maxY) / 2) / 2 };
}

it.each(variants)('%s retains the fitted lens and centers the settled actual source without losing full safety or the recovery snap', variant => {
  const art = fixture(variant), sim = race();
  let frame = 910, previousPhase = 'wrecked', recovered = 0, sawIntactRecovery = false;
  for (let n = 1; n <= frame; n++) step(sim, n);
  const rigs = [1.6, 390 / 844, 844 / 390].map(aspect => {
    const rig = new CinematicCamera(); rig.camera.aspect = aspect; return rig;
  });
  const beforeSource = JSON.stringify(sim.state);
  // 60 Hz camera + 120 Hz simulation/extrapolation, .18 pacing for the 820 ms
  // cut, then protected chase through actual recovery. This is source geometry
  // evidence, not a claim of video-frame replication or rendered acceptance.
  try {
    for (let sample = 0; sample <= 270; sample++) {
      const wall = sample / 60, age = wall <= .82 ? wall * .18 : .1476 + wall - .82;
      const target = 910 + Math.floor(age * 120);
      while (frame < target) step(sim, ++frame);
      const entry = sim.state.entries[0]!, state = entry.vehicle, phase = entry.galactic!.wreck.phase;
      const extra = age - (frame - 910) / 120;
      const remaining = phase === 'wrecked' ? entry.galactic!.wreck.timer : 2.15 + extra;
      const stateBeforePresentation = JSON.stringify(sim.state);
      const pose = art.cache.update(state, remaining, sim.terrain, extra);
      art.breakup.update(pose, remaining, sim.terrain, extra);
      const cut = wall <= .82, lease = !cut && (phase === 'wrecked' || phase === 'recovering');
      const subject: CameraSubject = {
        position: new Vector3(state.position.x + state.velocity.x * extra,
          state.position.y + state.velocity.y * extra, state.position.z + state.velocity.z * extra),
        forward: new Vector3(Math.sin(state.orientation.yaw), 0, Math.cos(state.orientation.yaw)),
        velocity: new Vector3(state.velocity.x, state.velocity.y, state.velocity.z), speed: state.telemetry.speed,
        combatFocus: pose.center, combatForward: pose.forward, combatRadius: pose.radius, combatBounds: pose.bounds,
        combatImpactPosition: pose.rupture?.position, combatImpactFraming: pose.impactFraming,
        wreckChase: lease, wreckRecovery: phase === 'recovering',
      };
      const recoverySnap = phase === 'running' && previousPhase !== 'running';
      if (recoverySnap) recovered++;
      if (phase === 'recovering') { sawIntactRecovery = true; expect(pose.impactFraming).toBeUndefined(); }
      for (const rig of rigs) {
        let queries = 0;
        subject.combatTerrain = { heightAt(x, z) { queries++; return sim.terrain.heightAt(x, z); } };
        rig.setMode(cut ? 'side' : 'chase'); rig.setCombatFraming(cut);
        if (sample === 0 || recoverySnap) rig.snap(subject); else rig.update(1 / 60, frame / 120 + extra, subject);
        expect(queries).toBeLessThanOrEqual(2);
        if (cut || lease) {
          expect(rig.camera.fov).toBe(60);
          const ground = rig.camera.position.y - sim.terrain.heightAt(rig.camera.position.x, rig.camera.position.z);
          expect(ground).toBeGreaterThanOrEqual(1.2 - 1e-6);
          rig.camera.updateMatrixWorld(true);
          const point = new Vector3();
          for (const bound of pose.bounds) {
            point.copy(bound).applyMatrix4(rig.camera.matrixWorldInverse);
            if (!(point.z < -rig.camera.near - .49)) expect(point.z).toBeLessThan(-rig.camera.near - .49);
          }
          for (const bound of pose.impactFraming?.bounds ?? (subject.wreckRecovery ? pose.bounds : [])) {
            point.copy(bound).project(rig.camera);
            if (subject.wreckRecovery && !(Math.abs(point.x) <= .780001)) expect(Math.abs(point.x)).toBeLessThanOrEqual(.780001);
            if (!(point.y >= -.580001 && point.y <= .700001)) {
              expect(point.y).toBeGreaterThanOrEqual(-.580001); expect(point.y).toBeLessThanOrEqual(.700001);
            }
          }
        }
        if (sample === 49 || sample === 108) {
          const body = new Matrix4().compose(pose.position, new Quaternion().setFromEuler(pose.rotation), new Vector3(1, 1, 1));
          const screen = sourceExtent(rig, art, body);
          if (sample === 49) {
            expect(screen.width).toBeGreaterThan(rig.camera.aspect > 2 ? .75 : .80);
            expect(screen.width).toBeLessThan(.85);
          } else {
            expect(screen.width).toBeGreaterThan(.64); expect(screen.width).toBeLessThan(.68);
            // Actual settled source occupies the intended central band, rather
            // than the high V29 placement. Portrait is allowed to use its fit.
            expect(screen.centerY).toBeGreaterThan(.48); expect(screen.centerY).toBeLessThan(.52);
          }
        }
        if (recoverySnap) {
          const normal = new CinematicCamera(); normal.camera.aspect = rig.camera.aspect;
          normal.setMode('chase'); normal.snap({ ...subject, wreckChase: false, wreckRecovery: false });
          expect(cameraState(rig)).toEqual(cameraState(normal)); normal.dispose();
        }
      }
      expect(JSON.stringify(sim.state)).toBe(stateBeforePresentation);
      previousPhase = phase;
    }
    expect(sawIntactRecovery).toBe(true); expect(recovered).toBe(1);
    expect(JSON.stringify(sim.state)).not.toBe(beforeSource);
  } finally { rigs.forEach(rig => rig.dispose()); art.breakup.reset(); }
});

it('requires a previously established authored lease, keeping the unauthored fallback lens unchanged', () => {
  const subject = simpleSubject(), authored = new CinematicCamera(), fallback = new CinematicCamera();
  try {
    authored.setMode('side'); authored.setCombatFraming(true); authored.snap(subject);
    authored.setCombatFraming(false); authored.setMode('chase');
    const recovery = { ...subject, wreckChase: true, wreckRecovery: true, combatImpactFraming: undefined };
    authored.snap(recovery); expect(authored.camera.fov).toBe(60);
    fallback.setMode('chase'); fallback.snap(recovery);
    expect(fallback.camera.fov).toBeGreaterThan(62);
    // Cancel or complete the lease: no delayed FOV return or residual fit.
    const normal = new CinematicCamera(); normal.snap(subject);
    authored.snap({ ...subject, wreckChase: false });
    expect(cameraState(authored)).toEqual(cameraState(normal)); normal.dispose();
  } finally { authored.dispose(); fallback.dispose(); }
});

it('restores exact manual/reduced/replay behavior after an authored shot and ignores reduced-motion aim bias', () => {
  for (const reducedMotion of [false, true]) for (const mode of ['chase', 'cockpit', 'hero', 'side'] as const) {
    const subject = simpleSubject(), used = new CinematicCamera(), fresh = new CinematicCamera();
    try {
      used.setMode('side'); used.setCombatFraming(true); used.snap(subject);
      used.setCombatFraming(false);
      for (const rig of [used, fresh]) { rig.setComfortSettings({ reducedMotion }); rig.setMode(mode); rig.snap(subject); }
      expect(cameraState(used)).toEqual(cameraState(fresh));
      for (const rig of [used, fresh]) { rig.setHighlightFraming(true); rig.snap(subject); }
      expect(cameraState(used)).toEqual(cameraState(fresh));
      expect(used.camera.fov).toBe(60);
    } finally { used.dispose(); fresh.dispose(); }
  }
  const a = new CinematicCamera(), b = new CinematicCamera(), subject = simpleSubject();
  try {
    for (const rig of [a, b]) { rig.setMode('side'); rig.setCombatFraming(true); rig.setComfortSettings({ reducedMotion: true }); }
    a.snap(subject); b.snap({ ...subject, combatImpactFraming: { ...subject.combatImpactFraming!, ageSeconds: 0 } });
    expect(cameraState(a)).toEqual(cameraState(b));
  } finally { a.dispose(); b.dispose(); }
});
