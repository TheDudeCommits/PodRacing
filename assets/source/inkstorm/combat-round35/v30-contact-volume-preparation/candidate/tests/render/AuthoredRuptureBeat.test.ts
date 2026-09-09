import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY } from '../../src/render/galactic/GalacticEffectsView';

const birth = Object.freeze({ type: 'crash' as const, time: 3,
  position: Object.freeze({ x: 100, y: 8, z: -10 }),
  velocity: Object.freeze({ x: 180, y: 0, z: -80 }),
  surfaceNormal: Object.freeze({ x: 0, y: 1, z: 0 }),
  groundY: 0, severity: 2, style: 'redline' as const, wreckOwner: 0, wreckSequence: 8 });

function metal(view: GalacticEffectsView) {
  const matrix = new Matrix4(), point = new Vector3(), a = view.crashDebris.geometry.getAttribute('aFragmentMetal');
  return Array.from({ length: view.crashDebris.count }, (_, index) => {
    view.crashDebris.getMatrixAt(index, matrix); point.setFromMatrixPosition(matrix);
    return { index, isMetal: a.getX(index) === 1, point: point.clone(), matrix: matrix.clone() };
  }).filter(row => row.isMetal);
}

describe('directional authored rupture beat', () => {
  it('opens a broad outward casing fan before the birth flash expires, including an upward cut normal', () => {
    const view = new GalacticEffectsView();
    try {
      view.emitCrash({ ...birth, velocity: { x: 0, y: 0, z: 0 }, groundY: -100 });
      view.update(3.08);
      const rows = metal(view), angles = rows.map(row => {
        const p = row.point.clone().sub(birth.position);
        expect(p.y).toBeGreaterThan(0);
        return Math.atan2(Math.hypot(p.x, p.z), p.y);
      });
      expect(rows).toHaveLength(13); // three free sparks plus two retained embers occupy the other five slots
      expect(Math.max(...angles)).toBeGreaterThan(.85);
      expect(Math.min(...angles)).toBeGreaterThan(.35);
      const xs = rows.map(row => row.point.x - birth.position.x), zs = rows.map(row => row.point.z - birth.position.z);
      expect(Math.min(...xs)).toBeLessThan(-2); expect(Math.max(...xs)).toBeGreaterThan(2);
      expect(Math.min(...zs)).toBeLessThan(-2); expect(Math.max(...zs)).toBeGreaterThan(2);
      const surfaces = view.explosionPlates.geometry.getAttribute('aEffectSurface');
      expect(Array.from({ length: view.explosionPlates.count }, (_, i) => surfaces.getX(i))).toContain(6);
      const scales = rows.map(row => new Vector3().setFromMatrixScale(row.matrix).x);
      expect(scales.filter(scale => scale > 1.2)).toHaveLength(3);
      expect(scales.filter(scale => scale < .8)).toHaveLength(10);
      expect(view.crashDebris.count).toBe(18); expect(view.explosionPlates.count).toBe(4);
    } finally { view.dispose(); }
  });

  it('keeps every rotated casing vertex above the existing sampled floor and limits free drift with drag', () => {
    const view = new GalacticEffectsView();
    try {
      const event = { ...birth, position: { x: 100, y: .12, z: -10 }, surfaceNormal: { x: .8, y: -.6, z: 0 } };
      const snapshot = JSON.stringify(event), vertices = view.crashDebris.geometry.getAttribute('position');
      const point = new Vector3(); let verticesChecked = 0, minimumGap = Infinity;
      view.emitCrash(event);
      for (let tick = 0; tick <= 38; tick++) {
        view.update(3 + tick * .05);
        for (const row of metal(view)) {
          expect(Math.hypot(row.point.x - event.position.x, row.point.z - event.position.z)).toBeLessThan(42);
          for (let index = 0; index < vertices.count; index++) {
            point.fromBufferAttribute(vertices, index).applyMatrix4(row.matrix);
            const gap = point.y - event.groundY;
            if (!(gap >= .03999)) expect(gap, `sample${tick} fragment${row.index} vertex${index}`).toBeGreaterThanOrEqual(.03999);
            minimumGap = Math.min(minimumGap, gap); verticesChecked++;
          }
        }
      }
      expect(verticesChecked).toBeGreaterThan(8_000);
      expect(minimumGap).toBeLessThan(.3); // support must not merely hold all small casing high in the air
      expect(JSON.stringify(event)).toBe(snapshot);
      view.update(5.3); expect(view.explosionPlates.count).toBe(0); expect(view.crashDebris.count).toBe(0);
    } finally { view.dispose(); }
  });

  it('keeps the same resource arrays through simultaneous authored rupture/contact saturation and reset', () => {
    const view = new GalacticEffectsView();
    try {
      const resources = view.children.map(child => { const mesh = child as InstancedMesh;
        return [mesh, mesh.geometry, mesh.material, mesh.instanceMatrix, mesh.instanceColor]; });
      for (let i = 0; i < 20; i++) {
        view.emitCrash({ ...birth, wreckOwner: i % 8, wreckSequence: i });
        view.emitWreckGroundContact(3, { x: i, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
      }
      view.update(3.08);
      expect(view.children).toHaveLength(9);
      expect(view.crashDebris.count).toBe(GALACTIC_EFFECT_CAPACITY.crashDebris);
      expect(view.explosionPlates.count).toBe(GALACTIC_EFFECT_CAPACITY.explosionPlates);
      expect(view.children.map(child => { const mesh = child as InstancedMesh;
        return [mesh, mesh.geometry, mesh.material, mesh.instanceMatrix, mesh.instanceColor]; })).toEqual(resources);
      view.clearEffects(); view.update(3.08);
      expect(view.crashDebris.count).toBe(0); expect(view.explosionPlates.count).toBe(0);
    } finally { view.dispose(); }
  });
});
