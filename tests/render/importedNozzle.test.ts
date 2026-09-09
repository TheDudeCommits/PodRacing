import { Group, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createImportedNozzleGeometry, ImportedExhaustNozzles } from '../../src/render/vehicles/ImportedExhaustNozzles';

describe('recessed imported exhaust mouths', () => {
  it('occludes the broad outer hot disk with real front-facing metal while leaving the central core open', () => {
    const geometry = createImportedNozzleGeometry(), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld();
    const ray = new Raycaster();
    const hit = (radius: number) => {
      ray.set(new Vector3(radius, 0, -2), new Vector3(0, 0, 1));
      return ray.intersectObject(mesh);
    };
    try {
      expect(hit(.25)).toHaveLength(0);
      expect(hit(.8)[0]?.point.z).toBeCloseTo(-.27, 4);
      const throat = hit(.55)[0];
      expect(throat).toBeDefined();
      expect(throat!.point.z).toBeGreaterThan(-.20);
      expect(throat!.point.z).toBeLessThan(0);
      expect(hit(1)).toHaveLength(0);
      expect(geometry.index!.count / 3).toBeLessThanOrEqual(400);
    } finally { geometry.dispose(); material.dispose(); }
  });

  it('uses authored positions/rotations with one stable geometry and releases owned buffers exactly once', () => {
    const nozzles = new ImportedExhaustNozzles(), left = new Group(), right = new Group();
    left.position.set(-4, 1, 5); right.position.set(4, 2, 6); right.rotation.y = .12;
    const geometry = nozzles.geometry;
    const geometryDispose = vi.spyOn(geometry, 'dispose'), materialDispose = vi.spyOn(nozzles.material, 'dispose');
    nozzles.setAnchors(left, right);
    expect(nozzles.count).toBe(2);
    expect(nozzles.visible).toBe(true);
    for (const [index, anchor] of [left, right].entries()) {
      const matrix = new Matrix4(); nozzles.getMatrixAt(index, matrix);
      const expected = new Matrix4().compose(anchor.position, anchor.quaternion, new Vector3(1,1,1));
      matrix.elements.forEach((value, i) => expect(value).toBeCloseTo(expected.elements[i]!, 6));
    }
    nozzles.setAnchors(); expect(nozzles.visible).toBe(false);
    nozzles.setAnchors(right, left);
    expect(nozzles.geometry).toBe(geometry);
    nozzles.dispose(); nozzles.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });
});
