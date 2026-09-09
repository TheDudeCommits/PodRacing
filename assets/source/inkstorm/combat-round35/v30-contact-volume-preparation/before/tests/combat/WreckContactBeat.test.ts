import { Box3, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY } from '../../src/render/galactic/GalacticEffectsView';

function subject(): CameraSubject {
  const box = new Box3(new Vector3(-7, 0, -8), new Vector3(7, 6, 23));
  const bounds = Array.from({ length: 8 }, (_, i) => new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  return { position: new Vector3(), forward: new Vector3(0, 0, 1), velocity: new Vector3(), speed: 0,
    combatFocus: box.getCenter(new Vector3()), combatBounds: bounds, combatForward: new Vector3(0, 0, 1),
    combatImpactPosition: new Vector3(5, 2, 16), combatTerrain: { heightAt: () => -5 } };
}
describe('authored wreck contact beat', () => {
  it('keeps an authored tear-side choice when its moving witness crosses the centroid, then releases it on a new cut', () => {
    const rig = new CinematicCamera(), s = subject();
    try {
      rig.setMode('side'); rig.setCombatFraming(true); rig.snap(s);
      const eye = rig.camera.position.clone(), look = rig.camera.quaternion.clone();
      s.combatImpactPosition!.set(-6, 2, -5); s.combatForward!.set(1, 0, 0);
      for (let i = 0; i < 30; i++) rig.update(1 / 60, i / 60, s);
      expect(rig.camera.position.distanceTo(eye)).toBeLessThan(1e-6);
      expect(rig.camera.quaternion.angleTo(look)).toBeLessThan(1e-6);
      rig.setCombatFraming(false); rig.setMode('chase'); s.wreckChase = true; s.wreckRecovery = true;
      for (let i = 0; i < 30; i++) rig.update(1 / 60, 1 + i / 60, s);
      expect(rig.camera.position.distanceTo(eye)).toBeLessThan(1e-6);
      rig.setMode('side'); rig.setCombatFraming(true); rig.snap(s);
      expect(rig.camera.position.distanceTo(eye)).toBeGreaterThan(10);
    } finally { rig.dispose(); }
  });

  it('keeps ordinary, replay and unauthored fallback framing independent of the retained authored choice', () => {
    const rig = new CinematicCamera(), reference = new CinematicCamera(), s = subject();
    try {
      rig.setMode('side'); rig.setCombatFraming(true); rig.snap(s); rig.setCombatFraming(false);
      const ordinary = { position: s.position, forward: s.forward, velocity: s.velocity, speed: 100 };
      for (const mode of ['chase', 'cockpit', 'side', 'hero'] as const) for (const highlight of [false, true]) {
        rig.setMode(mode); reference.setMode(mode); rig.setHighlightFraming(highlight); reference.setHighlightFraming(highlight);
        rig.snap(ordinary); reference.snap(ordinary);
        expect(rig.camera.position.toArray()).toEqual(reference.camera.position.toArray());
        expect(rig.camera.quaternion.toArray()).toEqual(reference.camera.quaternion.toArray());
        expect(rig.camera.fov).toBe(reference.camera.fov);
      }
      s.combatImpactPosition = undefined; rig.setHighlightFraming(false); rig.setMode('side'); rig.setCombatFraming(true); rig.snap(s);
      const first = rig.camera.position.clone(); s.combatForward!.set(1, 0, 0); rig.snap(s);
      expect(rig.camera.position.distanceTo(first)).toBeGreaterThan(10);
    } finally { rig.dispose(); reference.dispose(); }
  });

  it('uses exactly two grounded contact plates with low scrape and raised fan, and readable contact spark widths', () => {
    const view = new GalacticEffectsView(), camera = new PerspectiveCamera(60, 1.6, .1, 200);
    camera.position.set(18, 12, 30); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    const p = new Vector3(0, 3, 0), m = new Matrix4(), scale = new Vector3(), center = new Vector3(), q = new Quaternion();
    try {
      const children = view.children.slice(); view.emitWreckGroundContact(4, p, new Vector3(1, 0, 0)); view.update(4.15, camera);
      expect(view.children).toEqual(children); expect(view.children).toHaveLength(8);
      expect(view.explosionPlates.count).toBe(2); expect(view.crashDebris.count).toBe(10);
      const heights: number[] = [];
      for (let i = 0; i < 2; i++) {
        view.explosionPlates.getMatrixAt(i, m); m.decompose(center, q, scale); heights.push(scale.y);
        for (const x of [-1, 1]) for (const y of [-1, 1]) {
          expect(new Vector3(x, y, 0).applyMatrix4(m).y).toBeGreaterThan(p.y + .03);
        }
        expect(center.x).toBeLessThanOrEqual(p.x); // dust departs behind the measured contact direction
      }
      expect(heights[0]! / heights[1]!).toBeLessThan(.55);
      for (let i = 0; i < 10; i++) {
        view.crashDebris.getMatrixAt(i, m); m.decompose(center, q, scale);
        expect(scale.x).toBeGreaterThanOrEqual(.34 * .26 - 1e-7);
        expect(scale.y * .38).toBeGreaterThanOrEqual(.34 * .32 * .38 - 1e-7);
      }
      for (let i = 0; i < 12; i++) view.emitWreckGroundContact(4.15, p, new Vector3(1, 0, 0));
      view.update(4.3, camera); expect(view.explosionPlates.count).toBeLessThanOrEqual(GALACTIC_EFFECT_CAPACITY.explosionPlates);
      expect(view.crashDebris.count).toBeLessThanOrEqual(GALACTIC_EFFECT_CAPACITY.crashDebris);
      view.clearEffects(); view.update(8, camera); expect(view.explosionPlates.count).toBe(0); expect(view.crashDebris.count).toBe(0);
    } finally { view.dispose(); }
  });
});
