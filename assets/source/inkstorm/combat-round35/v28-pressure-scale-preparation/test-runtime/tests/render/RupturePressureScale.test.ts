import { Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView } from '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v28-pressure-scale-preparation/test-runtime/src/render/galactic/GalacticEffectsView.ts';

const birth = Object.freeze({ type: 'crash' as const, time: 4,
  position: Object.freeze({ x: 0, y: 8, z: 0 }), groundY: -100,
  surfaceNormal: Object.freeze({ x: 0, y: 0, z: 1 }), severity: 2,
  style: 'redline' as const, wreckOwner: 0, wreckSequence: 1 });

function hot(view: GalacticEffectsView) {
  const matrix = new Matrix4(), kinds = view.explosionPlates.geometry.getAttribute('aEffectSurface');
  const spans = view.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan');
  return Array.from({ length: view.explosionPlates.count }, (_, index) => {
    view.explosionPlates.getMatrixAt(index, matrix);
    const size = new Vector3().setFromMatrixScale(matrix);
    return { kind: kinds.getX(index), age: kinds.getZ(index), size,
      position: new Vector3().setFromMatrixPosition(matrix),
      metresPerPixel: size.x / spans.getX(index),
    };
  }).filter(row => row.kind === 6 || row.kind === 7);
}

describe('authored pressure size and distinct casing leaders', () => {
  it('makes pressure stronger than sustained fire, then contracts without stretching phase clocks', () => {
    const view = new GalacticEffectsView();
    try {
      view.emitCrash(birth); view.update(4);
      const pressure = hot(view)[0]!;
      expect(pressure.kind).toBe(6);
      expect(pressure.metresPerPixel).toBeCloseTo(1.8 / 120, 7);
      view.update(4.065);
      const fire = hot(view).find(row => row.kind === 7)!;
      expect(fire.metresPerPixel).toBeCloseTo(1.6 / 120, 7);
      expect(pressure.size.x).toBeGreaterThan(fire.size.x * 1.35);
      view.update(4.084); expect(hot(view).some(row => row.kind === 6)).toBe(true);
      view.update(4.086); expect(hot(view).some(row => row.kind === 6)).toBe(false);
      view.update(4.665);
      const lingering = hot(view)[0]!;
      expect(lingering.kind).toBe(7);
      expect(lingering.metresPerPixel).toBeCloseTo(1.15 / 120, 7);
      expect(fire.metresPerPixel / lingering.metresPerPixel).toBeGreaterThan(1.38);
      expect(lingering.age).toBeCloseTo(.6, 7);
      view.update(6.114); expect(hot(view).map(row => row.kind)).toEqual([7]);
      view.update(6.116); expect(hot(view)).toEqual([]);
      view.update(6.226); expect(view.explosionPlates.count).toBe(0);
      expect(view.crashDebris.count).toBe(0); expect(view.children).toHaveLength(8);
    } finally { view.dispose(); }
  });

  it('keeps a low authored root attached instead of borrowing the generic ground lift', () => {
    const view = new GalacticEffectsView();
    const event = { ...birth, position: { x: 2, y: -4, z: 5 }, groundY: 3 };
    const saved = JSON.stringify(event);
    try {
      view.emitCrash(event); view.update(4);
      expect(hot(view)[0]!.position.toArray()).toEqual([2, -4, 5]);
      view.syncWreckRupture(0, 1, { position: { x: 7, y: -6, z: 11 }, direction: { x: 0, y: 0, z: 2 } });
      view.update(4.08);
      const rows = hot(view);
      expect(rows).toHaveLength(2);
      expect(rows.find(row => row.kind === 6)!.position.toArray()).toEqual([7, -6, 11]);
      expect(rows.find(row => row.kind === 7)!.position.distanceTo(new Vector3(7, -6, 11.6))).toBeLessThan(1e-5);
      const material = view.explosionPlates.material as MeshBasicMaterial;
      expect(material.depthTest).toBe(true); expect(material.depthWrite).toBe(false);
      expect(JSON.stringify(event)).toBe(saved);
      // This allows real occlusion; it does not assert that buried artwork is visible.
    } finally { view.dispose(); }
  });

  it('separates the three large leaders into different outward lanes without adding fragments', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4();
    try {
      view.emitCrash(birth); view.update(4);
      const metal = view.crashDebris.geometry.getAttribute('aFragmentMetal');
      const leaders: Vector3[] = [];
      for (let index = 0; index < view.crashDebris.count; index++) {
        view.crashDebris.getMatrixAt(index, matrix);
        if (metal.getX(index) !== 1 || new Vector3().setFromMatrixScale(matrix).x <= 1.45) continue;
        const p = new Vector3().setFromMatrixPosition(matrix).sub(birth.position);
        expect(p.z).toBeGreaterThan(0); // still the real source-normal half-space
        leaders.push(p.setZ(0).normalize());
      }
      expect(leaders).toHaveLength(3);
      for (let a = 0; a < leaders.length; a++) for (let b = a + 1; b < leaders.length; b++) {
        expect(leaders[a]!.dot(leaders[b]!)).toBeLessThan(Math.cos(70 * Math.PI / 180));
      }
      expect(view.crashDebris.count).toBe(18);
    } finally { view.dispose(); }
  });
});
