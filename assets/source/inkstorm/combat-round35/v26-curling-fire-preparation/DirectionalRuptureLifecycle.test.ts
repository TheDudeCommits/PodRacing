import { InstancedMesh, Matrix4, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_DRAW_CALL_BUDGET, type CrashEffectEvent, type GalacticPoint } from '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v26-curling-fire-preparation/test-runtime/GalacticEffectsView.ts';

const event: CrashEffectEvent = Object.freeze({ type: 'crash', time: 4, position: Object.freeze({ x: 0, y: 10, z: 0 }),
  groundY: 0, velocity: Object.freeze({ x: 0, y: 0, z: 0 }), severity: 2, style: 'redline',
  surfaceNormal: Object.freeze({ x: 1, y: 0, z: 0 }), wreckOwner: 0, wreckSequence: 3 });

function plates(view: GalacticEffectsView) {
  const matrix = new Matrix4(), surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
  return Array.from({ length: view.explosionPlates.count }, (_, i) => {
    view.explosionPlates.getMatrixAt(i, matrix);
    return { kind: surface.getX(i), opacity: surface.getY(i), position: new Vector3().setFromMatrixPosition(matrix),
      x: new Vector3().setFromMatrixColumn(matrix, 0).normalize(),
      normal: new Vector3().setFromMatrixColumn(matrix, 2).normalize(), matrix: matrix.toArray() };
  });
}

function visibleState(view: GalacticEffectsView) {
  return view.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh).map(mesh => ({
    count: mesh.count, matrices: Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)),
    colors: Array.from(mesh.instanceColor?.array.slice(0, mesh.count * 3) ?? []),
    surfaces: Array.from(mesh.geometry.getAttribute('aEffectSurface')?.array.slice(0, mesh.count * 3) ?? []),
    fragments: Array.from(mesh.geometry.getAttribute('aFragmentMetal')?.array.slice(0, mesh.count) ?? []),
  }));
}

describe('directional authored rupture lifecycle', () => {
  it('orients both hot surfaces in the camera plane while keeping exact birth and moving-cut roots', () => {
    const camera = new PerspectiveCamera(60, 1.6, .35, 1000);
    camera.position.set(0, 15, 35); camera.lookAt(0, 10, 0); camera.rotateZ(.41); camera.updateMatrixWorld(true);
    const cameraNormal = new Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    for (const direction of [new Vector3(1, 0, 0), new Vector3(.4, .3, -.8660254037844386), cameraNormal.clone()]) {
      const view = new GalacticEffectsView(), unit = direction.clone().normalize();
      try {
        const birth = { ...event, surfaceNormal: direction.clone().multiplyScalar(9) };
        const before = JSON.stringify(birth);
        view.emitCrash(birth); view.update(4, camera);
        const born = plates(view);
        expect(born.map(p => p.kind)).toEqual([6]);
        expect(born[0]!.position.distanceTo(event.position)).toBeLessThan(1e-5);
        const moved = { position: new Vector3(2, 11, -3), direction };
        view.syncWreckRupture(0, 3, moved); view.update(4.08, camera);
        const records = plates(view), hot = records.filter(p => p.kind === 6 || p.kind === 7);
        expect(hot).toHaveLength(2);
        expect(records.map(p => p.kind)).toEqual([8, 9, 6, 7]);
        const projected = unit.clone().addScaledVector(cameraNormal, -unit.dot(cameraNormal));
        for (const plate of hot) {
          expect(plate.matrix.every(Number.isFinite)).toBe(true);
          expect(Math.abs(plate.normal.dot(cameraNormal))).toBeGreaterThan(.99999);
          if (projected.lengthSq() > 1e-8) expect(plate.x.dot(projected.clone().normalize())).toBeGreaterThan(.99999);
          const expected = moved.position.clone().addScaledVector(unit, plate.kind === 6 ? 0 : .6);
          expect(plate.position.distanceTo(expected)).toBeLessThan(1e-5);
        }
        const frozen = visibleState(view);
        view.syncWreckRupture(0, 3, moved); view.update(4.08, camera);
        expect(visibleState(view)).toEqual(frozen);
        expect(JSON.stringify(birth)).toBe(before);
        const material = view.explosionPlates.material as MeshBasicMaterial;
        expect(material.transparent).toBe(true); expect(material.depthTest).toBe(true); expect(material.depthWrite).toBe(false);
      } finally { view.dispose(); }
    }
  });

  it('keeps ownership and retained expiry through sync, ring wrap and unrelated effects', () => {
    const view = new GalacticEffectsView();
    const resources = view.children.map(child => { const mesh = child as InstancedMesh;
      return [mesh, mesh.geometry, mesh.material, mesh.instanceMatrix, mesh.instanceColor]; });
    try {
      expect(resources).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
      for (let owner = 0; owner < 5; owner++) view.emitCrash({ ...event, wreckOwner: owner, position: { x: owner * 40, y: 10, z: 0 } });
      view.update(4.1); const wrapped = visibleState(view);
      view.syncWreckRupture(0, 3, { position: { x: 900, y: 900, z: 900 }, direction: { x: 0, y: 1, z: 0 } });
      view.update(4.1); expect(visibleState(view)).toEqual(wrapped);
      view.emitCrash({ ...event, time: 4.1, style: 'energy', position: { x: -200, y: 8, z: 0 } });
      view.emitWreckGroundContact(4.1, { x: -250, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
      view.update(4.2);
      const unrelated = plates(view).filter(p => p.kind < 6).map(p => ({ kind: p.kind, opacity: p.opacity, matrix: p.matrix }));
      expect(unrelated.length).toBeGreaterThan(0);
      expect(plates(view).some(p => p.kind >= 6 && p.position.x > 155)).toBe(true);
      view.syncWreckRupture(4, 999, { position: { x: 900, y: 900, z: 900 }, direction: { x: 1, y: 0, z: 0 } });
      view.update(4.2);
      expect(plates(view).filter(p => p.kind < 6).map(p => ({ kind: p.kind, opacity: p.opacity, matrix: p.matrix }))).toEqual(unrelated);
      expect(plates(view).some(p => p.kind >= 6 && p.position.x > 155)).toBe(false);
      for (const time of [5, 6, 6.226]) {
        view.syncWreckRupture(3, 3, { position: { x: 120, y: 3, z: 2 }, direction: { x: 0, y: 0, z: 1 } });
        view.update(time);
      }
      expect(plates(view).filter(p => p.kind >= 6)).toHaveLength(0);
      view.clearEffects(); view.update(7);
      expect(view.explosionPlates.count).toBe(0); expect(view.crashDebris.count).toBe(0);
      expect(view.children.map(child => { const mesh = child as InstancedMesh;
        return [mesh, mesh.geometry, mesh.material, mesh.instanceMatrix, mesh.instanceColor]; })).toEqual(resources);
    } finally { view.dispose(); }
  });

  it('normalizes direction and preserves the complete generic fallback for malformed normals', () => {
    for (const invalid of [{ x: 0, y: 0, z: 0 }, { x: NaN, y: 0, z: 1 }, { x: 1, y: Infinity, z: 0 }] satisfies GalacticPoint[]) {
      const fallback = new GalacticEffectsView(), candidate = new GalacticEffectsView();
      try {
        fallback.emitCrash({ ...event, surfaceNormal: undefined }); candidate.emitCrash({ ...event, surfaceNormal: invalid });
        for (const time of [4, 4.08, 4.3, 5.1, 6.3]) {
          fallback.update(time); candidate.update(time); expect(visibleState(candidate)).toEqual(visibleState(fallback));
        }
      } finally { fallback.dispose(); candidate.dispose(); }
    }
    const a = new GalacticEffectsView(), b = new GalacticEffectsView();
    try {
      a.emitCrash({ ...event, surfaceNormal: { x: .8, y: .6, z: 0 } });
      b.emitCrash({ ...event, surfaceNormal: { x: 8, y: 6, z: 0 } });
      for (const time of [4, 4.1, 5.1]) { a.update(time); b.update(time); expect(visibleState(a)).toEqual(visibleState(b)); }
    } finally { a.dispose(); b.dispose(); }
  });
});
