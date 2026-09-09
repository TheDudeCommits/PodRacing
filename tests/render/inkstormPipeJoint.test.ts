import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createInkstormPipeJoint } from '../../src/render/inkstorm/InkstormPipeJoint';

describe('visible pressure-pipe unions', () => {
  it.each([1.8, 2, 2.25, 2.6, 3, 3.2])('keeps the full bore open and both metal faces outward for radius %s', radius => {
    const geometry = createInkstormPipeJoint(radius), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material), ray = new Raycaster();
    try {
      mesh.updateMatrixWorld(true);
      for (const sign of [-1, 1]) {
        for (const offset of [0, radius * .5, radius * .9]) {
          ray.set(new Vector3(offset, sign * 5, 0), new Vector3(0, -sign, 0));
          expect(ray.intersectObject(mesh), 'No cap triangles should obstruct the pipe bore').toHaveLength(0);
        }
        ray.set(new Vector3(radius + .26, sign * 5, 0), new Vector3(0, -sign, 0));
        const hit = ray.intersectObject(mesh)[0];
        expect(hit, 'The annular metal face must render from outside').toBeDefined();
        expect(hit!.face!.normal.y * sign).toBeGreaterThan(.99);
      }
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
      for (let i = 0; i < p.count; i++) {
        expect(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))).toBe(true);
        expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
      }
      expect(geometry.getAttribute('color').count).toBe(p.count);
      expect(p.count / 3).toBeLessThanOrEqual(600);
    } finally { geometry.dispose(); material.dispose(); }
  });
});
