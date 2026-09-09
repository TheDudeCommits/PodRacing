import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView as Before } from '../before-runtime/src/render/galactic/GalacticEffectsView';
import { GalacticEffectsView as Candidate, type CrashEffectEvent } from '../test-runtime/src/render/galactic/GalacticEffectsView';

function visible(view: Before | Candidate) {
  return view.children.map(child => {
    const mesh = child as InstancedMesh;
    return { count: mesh.count,
      matrices: Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)),
      colors: Array.from(mesh.instanceColor?.array.slice(0, mesh.count * 3) ?? []),
      effect: Array.from(mesh.geometry.getAttribute('aEffectSurface')?.array.slice(0, mesh.count * 3) ?? []),
      metal: Array.from(mesh.geometry.getAttribute('aFragmentMetal')?.array.slice(0, mesh.count) ?? []),
      spans: Array.from(mesh.geometry.getAttribute('aRuptureAtlasSpan')?.array.slice(0, mesh.count * 2) ?? []),
    };
  });
}

describe('private V27 versus V28 generic parity', () => {
  it('preserves authored smoke, hot roots, UV rectangles, opacity and ages while only enlarging the hot basis', () => {
    const before = new Before(), candidate = new Candidate(), oldMatrix = new Matrix4(), newMatrix = new Matrix4();
    const event = { type: 'crash' as const, time: 4, position: { x: 3, y: -2, z: 7 }, groundY: 1,
      severity: 2, style: 'redline' as const, surfaceNormal: { x: .8, y: 0, z: .6 }, wreckOwner: 0, wreckSequence: 1 };
    try {
      before.emitCrash(event); candidate.emitCrash(event);
      for (const time of [4, 4.04, 4.08, 4.3, 4.9, 5.8, 6.4]) {
        before.update(time); candidate.update(time);
        const oldMesh = before.explosionPlates, newMesh = candidate.explosionPlates;
        const oldKinds = oldMesh.geometry.getAttribute('aEffectSurface'), newKinds = newMesh.geometry.getAttribute('aEffectSurface');
        const oldSpans = oldMesh.geometry.getAttribute('aRuptureAtlasSpan'), newSpans = newMesh.geometry.getAttribute('aRuptureAtlasSpan');
        expect(newMesh.count).toBe(oldMesh.count);
        for (let index = 0; index < newMesh.count; index++) {
          oldMesh.getMatrixAt(index, oldMatrix); newMesh.getMatrixAt(index, newMatrix);
          expect([newKinds.getX(index), newKinds.getY(index), newKinds.getZ(index)])
            .toEqual([oldKinds.getX(index), oldKinds.getY(index), oldKinds.getZ(index)]);
          expect(newSpans.getX(index)).toBeCloseTo(oldSpans.getX(index), 4);
          expect(newSpans.getY(index)).toBeCloseTo(oldSpans.getY(index), 4);
          if (oldKinds.getX(index) >= 8) { expect(newMatrix.elements).toEqual(oldMatrix.elements); continue; }
          expect(new Vector3().setFromMatrixPosition(newMatrix)).toEqual(new Vector3().setFromMatrixPosition(oldMatrix));
          for (const axis of [0, 1, 2]) {
            const oldAxis = new Vector3().setFromMatrixColumn(oldMatrix, axis), newAxis = new Vector3().setFromMatrixColumn(newMatrix, axis);
            expect(newAxis.length()).toBeGreaterThan(oldAxis.length());
            expect(newAxis.normalize().distanceTo(oldAxis.normalize())).toBeLessThan(1e-7);
          }
        }
      }
    } finally { before.dispose(); candidate.dispose(); }
  });

  it('preserves all visible instance bytes for every non-authored style and malformed source fallback', () => {
    const styles: CrashEffectEvent['style'][] = ['crash', 'redline', 'energy', 'reward', 'sand', 'rock', 'mine', 'recovery'];
    for (const style of styles) for (const surfaceNormal of [undefined, { x: 0, y: 0, z: 0 }, { x: NaN, y: 1, z: 0 }]) {
      const before = new Before(), candidate = new Candidate();
      try {
        const event = { type: 'crash' as const, time: 4, position: { x: 3, y: -2, z: 7 }, groundY: 1,
          velocity: { x: 80, y: -3, z: 12 }, severity: 2, style, surfaceNormal };
        before.emitCrash(event); candidate.emitCrash(event);
        for (const time of [4, 4.04, 4.08, 4.3, 4.9, 5.8, 6.4]) {
          before.update(time); candidate.update(time);
          expect(visible(candidate)).toEqual(visible(before));
        }
        before.clearEffects(); candidate.clearEffects();
        expect(visible(candidate)).toEqual(visible(before));
      } finally { before.dispose(); candidate.dispose(); }
    }
  });
});
