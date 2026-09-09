import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY } from '../../src/render/galactic/GalacticEffectsView';

const birth = { type: 'crash' as const, time: 4, position: { x: 0, y: 10, z: 0 },
  surfaceNormal: { x: 1, y: 0, z: 0 }, groundY: 0, severity: 2, style: 'redline' as const,
  wreckOwner: 0, wreckSequence: 3 };
const rupture = { position: new Vector3(80, 14, 30), direction: new Vector3(0, 0, 1) };
function centers(mesh: InstancedMesh) {
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => { mesh.getMatrixAt(i, matrix); return new Vector3().setFromMatrixPosition(matrix); });
}
function plates(view: GalacticEffectsView) {
  return { count: view.explosionPlates.count, matrices: Array.from(view.explosionPlates.instanceMatrix.array),
    surfaces: Array.from(view.explosionPlates.geometry.getAttribute('aEffectSurface').array) };
}

describe('fixed authored aftermath slots', () => {
  it('keeps smaller hot face, smoke and two embers on the moving cut after the birth flash has expired', () => {
    const view = new GalacticEffectsView();
    try {
      view.emitCrash(birth); view.syncWreckRupture(0, 3, rupture); view.update(5.1);
      expect(view.explosionPlates.count).toBe(3);
      for (const center of centers(view.explosionPlates)) expect(center.distanceTo(rupture.position)).toBeLessThan(12);
      const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
      const hot = Array.from({ length: view.explosionPlates.count }, (_, i) => i).filter(i => surface.getX(i) === 2);
      expect(hot).toHaveLength(1); expect(surface.getY(hot[0]!)).toBeGreaterThan(.8);
      const embers = centers(view.crashDebris).filter(point => point.distanceTo(rupture.position) < 4);
      expect(embers).toHaveLength(2); expect(embers[0]!.distanceTo(embers[1]!)).toBeGreaterThan(.2);
      const frozen = plates(view); view.syncWreckRupture(0, 3, rupture); view.update(5.1); expect(plates(view)).toEqual(frozen);
    } finally { view.dispose(); }
  });

  it('keeps retained embers at a lower current cut rather than its stale birth floor', () => {
    const view = new GalacticEffectsView();
    try {
      view.emitCrash({ ...birth, groundY: 100, position: { x: 0, y: 110, z: 0 } });
      view.syncWreckRupture(0, 3, rupture); view.update(5.1);
      const local = centers(view.crashDebris).filter(point => Math.abs(point.x - rupture.position.x) < 4);
      expect(local).toHaveLength(2);
      for (const point of local) expect(point.distanceTo(rupture.position)).toBeLessThan(4);
    } finally { view.dispose(); }
  });

  it('retires owned heat and embers on recovery without deleting another effect', () => {
    const view = new GalacticEffectsView(), control = new GalacticEffectsView();
    try {
      view.emitCrash(birth); view.syncWreckRupture(0, 3, rupture); view.update(5.1);
      const energy = { ...birth, time: 5.1, style: 'energy' as const, position: { x: -30, y: 4, z: 20 } };
      view.emitCrash(energy); control.emitCrash(energy);
      view.syncWreckRupture(0, -1); view.update(5.2); control.update(5.2);
      expect(view.explosionPlates.count).toBe(control.explosionPlates.count);
      expect(centers(view.explosionPlates)).toEqual(centers(control.explosionPlates));
      expect(centers(view.crashDebris).filter(point => point.distanceTo(rupture.position) < 4)).toHaveLength(0);
    } finally { view.dispose(); control.dispose(); }
  });

  it('does not attach reused pool slots to an obsolete owner or a different wreck identity', () => {
    const view = new GalacticEffectsView();
    try {
      const identities = view.children.map(mesh => [mesh, (mesh as InstancedMesh).geometry, (mesh as InstancedMesh).material]);
      for (let owner = 0; owner < 5; owner++) view.emitCrash({ ...birth, wreckOwner: owner, position: { x: owner * 30, y: 10, z: 0 } });
      view.update(4.1); const before = plates(view);
      view.syncWreckRupture(0, 3, rupture); view.update(4.1); expect(plates(view)).toEqual(before);
      expect(view.explosionPlates.count).toBeLessThanOrEqual(GALACTIC_EFFECT_CAPACITY.explosionPlates);
      view.syncWreckRupture(4, 999, rupture); view.update(4.1);
      expect(view.explosionPlates.count).toBeLessThan(before.count);
      expect(view.children.map(mesh => [mesh, (mesh as InstancedMesh).geometry, (mesh as InstancedMesh).material])).toEqual(identities);
      view.clearEffects(); view.update(6); expect(view.explosionPlates.count).toBe(0); expect(view.crashDebris.count).toBe(0);
      expect(view.children).toHaveLength(8);
    } finally { view.dispose(); }
  });
});
