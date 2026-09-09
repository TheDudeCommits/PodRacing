import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import type { InkstormPlacement } from '../../src/game/race/inkstormLayout';
import { createInkstormFoundations } from '../../src/render/inkstorm/InkstormFoundations';

describe('pit slab foundation seating', () => {
  it.each(['pit-complex', 'pit-district'] as const)('keeps the %s foundation top at its saved anchor after grading', family => {
    const p: InkstormPlacement = { id: 'saved-pit', family, x: 80, z: -25,
      progress: .012, yaw: .63, sx: 1.3, sy: 1, sz: .8 };
    const foundation = createInkstormFoundations([p], () => 20.9, id => id === p.id ? 20 : undefined);
    try {
      const matrix = new Matrix4(); foundation.getMatrixAt(0, matrix);
      const top = new Vector3(0, .5, 0).applyMatrix4(matrix);
      expect(top.y).toBeCloseTo(21.5, 6);
      if (family === 'pit-district') {
        expect(top.x).toBeCloseTo(p.x, 6); expect(top.z).toBeCloseTo(p.z, 6);
        const scale = new Vector3(); matrix.decompose(new Vector3(), new Quaternion(), scale);
        expect(scale.x).toBeCloseTo(120 * p.sx, 5); expect(scale.z).toBeCloseTo(36 * p.sz, 5);
      }
    } finally {
      foundation.geometry.dispose();
      for (const material of Array.isArray(foundation.material) ? foundation.material : [foundation.material]) material.dispose();
      foundation.dispose();
    }
  });
  it.each([0, Math.PI / 2, .63])('supports the actual offset slab on sloping ground at yaw %s', yaw => {
    const p: InkstormPlacement = { id: 'test-pit', family: 'pit-complex', x: 80, z: -25,
      progress: .012, yaw, sx: 1.3, sy: 1, sz: .8 };
    const terrain = (x: number, z: number) => 3 + .18 * x - .27 * z;
    const foundation = createInkstormFoundations([p], terrain);
    try {
      expect(foundation.count).toBe(1);
      const actual = new Matrix4(); foundation.getMatrixAt(0, actual);
      const inverse = actual.clone().invert();
      const top = terrain(p.x, p.z) + 1.5;
      const transform = new Matrix4().compose(new Vector3(p.x, top - .05, p.z),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), new Vector3(p.sx, 1, p.sz));
      // These are the exported slab corners, not the former symmetric collider.
      for (const x of [-71, 79]) for (const z of [-32.5, 28]) {
        const slab = new Vector3(x, 0, z).applyMatrix4(transform);
        const inSupport = slab.clone().applyMatrix4(inverse);
        expect(Math.abs(inSupport.x)).toBeCloseTo(.5, 5);
        expect(Math.abs(inSupport.z)).toBeCloseTo(.5, 5);
        expect(slab.y).toBeCloseTo(top - .05, 8);
        const supportTop = new Vector3(inSupport.x, .5, inSupport.z).applyMatrix4(actual);
        const supportBottom = new Vector3(inSupport.x, -.5, inSupport.z).applyMatrix4(actual);
        expect(supportTop.y - slab.y).toBeCloseTo(.05, 5);
        expect(supportBottom.y).toBeLessThan(terrain(slab.x, slab.z) - 3.99);
      }
    } finally {
      foundation.geometry.dispose();
      for (const material of Array.isArray(foundation.material) ? foundation.material : [foundation.material]) material.dispose();
      foundation.dispose();
    }
  });
});
