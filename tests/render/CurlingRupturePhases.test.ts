import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView } from '../../src/render/galactic/GalacticEffectsView';

const event = Object.freeze({ type: 'crash' as const, time: 4, position: Object.freeze({ x: 0, y: 8, z: 0 }),
  groundY: 0, severity: 2, style: 'redline' as const,
  surfaceNormal: Object.freeze({ x: 1, y: 0, z: 0 }), wreckOwner: 0, wreckSequence: 7 });
function rows(view: GalacticEffectsView) {
  const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface'), matrix = new Matrix4();
  return Array.from({ length: view.explosionPlates.count }, (_, i) => {
    view.explosionPlates.getMatrixAt(i, matrix);
    return { kind: surface.getX(i), opacity: surface.getY(i), age: surface.getZ(i),
      position: new Vector3().setFromMatrixPosition(matrix), matrix: matrix.toArray() };
  });
}

describe('separate authored pressure and retained gas phases', () => {
  it('ends pressure before the held aftermath without replacing it with a missing-fire interval', () => {
    const view = new GalacticEffectsView(), frozen = JSON.stringify(event);
    try {
      view.emitCrash(event);
      for (const [age, kinds] of [[0, [6]], [.04, [6]], [.07, [8, 6, 7]], [.08, [8, 9, 6, 7]],
        [.09, [8, 9, 7]], [.3, [8, 9, 7]], [1.1, [8, 9, 7]], [2.226, []]] as const) {
        view.update(4 + age); const visible = rows(view);
        expect(visible.map(p => p.kind), `event age ${age}`).toEqual(kinds);
        for (const row of visible) {
          expect(row.matrix.every(Number.isFinite)).toBe(true);
          expect(row.age).toBeGreaterThanOrEqual(0);
          expect(row.opacity).toBeGreaterThanOrEqual(0); expect(row.opacity).toBeLessThanOrEqual(1);
        }
      }
      expect(JSON.stringify(event)).toBe(frozen);
    } finally { view.dispose(); }
  });

  it('feeds monotonic event age to the two different smoke forms and does not reignite expired pressure during root sync', () => {
    const view = new GalacticEffectsView();
    try {
      view.emitCrash(event); view.update(4.1);
      const first = rows(view);
      expect(first.map(p => p.kind)).toEqual([8, 9, 7]);
      expect(first.map(p => p.age)).toEqual(expect.arrayContaining([
        expect.closeTo(.05, 5), expect.closeTo(.025, 5), expect.closeTo(.035, 5)]));
      const cut = { position: new Vector3(20, 3, -4), direction: new Vector3(0, 0, 1) };
      view.syncWreckRupture(0, 7, cut); view.update(5.1);
      const after = rows(view), hot = after.find(p => p.kind === 7)!;
      expect(after.map(p => p.kind)).toEqual([8, 9, 7]);
      expect(hot.age).toBeCloseTo(1.035, 5);
      expect(hot.position.distanceTo(cut.position.clone().addScaledVector(cut.direction, .6))).toBeLessThan(1e-5);
      const snapshot = rows(view); view.syncWreckRupture(0, 7, cut); view.update(5.1);
      expect(rows(view)).toEqual(snapshot);
      view.syncWreckRupture(0, -1); view.update(5.1); expect(rows(view)).toEqual([]);
    } finally { view.dispose(); }
  });
});
