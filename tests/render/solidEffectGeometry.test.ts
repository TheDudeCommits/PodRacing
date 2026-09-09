import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { GalacticEffectsView, GALACTIC_EFFECT_DRAW_CALL_BUDGET } from '../../src/render/galactic/GalacticEffectsView';
import { createSolidHardwareGeometry } from '../../src/render/galactic/SolidEffectGeometry';

describe('solid salvage and falling rubble', () => {
  it('has a real open receiver below the lip and a closed thick back', () => {
    const geometry = createSolidHardwareGeometry(), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    const ray = new Raycaster();
    const hitY = (x: number, y: number, z: number, direction: number): number => {
      ray.set(new Vector3(x, y, z), new Vector3(0, direction, 0));
      const hit = ray.intersectObject(mesh, false)[0];
      expect(hit, 'Hardware surface must be present on this ray').toBeDefined();
      return hit!.point.y;
    };
    try {
      const floor = hitY(.20, 2, -.30, -1), lip = hitY(.68, 2, 0, -1);
      const back = hitY(.20, -2, -.30, 1);
      expect(lip - floor).toBeGreaterThan(.30);
      expect(floor - back).toBeGreaterThan(.55);
      const signal = geometry.getAttribute('aHardwareSignal');
      const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal');
      let signalVertices = 0, nonfinite = 0, normalError = 0;
      for (let i = 0; i < p.count; i++) {
        if (signal.getX(i) === 1) signalVertices++;
        for (const a of [p, n]) if (![a.getX(i), a.getY(i), a.getZ(i)].every(Number.isFinite)) nonfinite++;
        normalError = Math.max(normalError, Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1));
      }
      expect(signalVertices).toBeGreaterThan(0);
      expect(signalVertices / p.count).toBeLessThan(.3);
      expect(nonfinite).toBe(0); expect(normalError).toBeLessThan(.00001);
    } finally { geometry.dispose(); material.dispose(); }
  });

  it('preserves the grounded mine envelope while salvage keeps its thick casing', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4();
    try {
      view.scrapMines.geometry.computeBoundingBox();
      for (const scale of [.4, 1, 2.2]) for (const time of [0, .3, 1.4]) {
        view.setScrapMines([{ position: { x: 0, y: 0, z: 0 }, scale, armed: true }]);
        view.update(time); view.scrapMines.getMatrixAt(0, matrix);
        const box = view.scrapMines.geometry.boundingBox!.clone().applyMatrix4(matrix);
        expect(box.min.y).toBeGreaterThan(-.24 * scale);
        expect(box.max.y).toBeLessThan(.24 * scale);
      }
      view.setScrapMines([{ position: { x: 0, y: 0, z: 0 }, variant: 'pickup', scale: 1 }]);
      view.update(0); view.scrapMines.getMatrixAt(0, matrix);
      const localDepth = view.scrapMines.geometry.boundingBox!.getSize(new Vector3()).y;
      expect(localDepth).toBeGreaterThan(.9);
      expect(view.children).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    } finally { view.dispose(); }
  });

  it('seats actual rubble vertices at the hazard ground and inside its warning footprint', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4(), vertex = new Vector3();
    try {
      const geometry = view.hazardBodies.geometry, p = geometry.getAttribute('position');
      expect((geometry.index?.count ?? p.count) / 3).toBeLessThanOrEqual(100);
      for (const radius of [8, 14, 24]) {
        view.setHazards([{ kind: 'rockfall', position: { x: 30, y: 4, z: -20 }, radius, phase: 0 }]);
        view.update(.3); view.hazardBodies.getMatrixAt(0, matrix);
        const bounds = new Box3(); let farthest = 0;
        for (let i = 0; i < p.count; i++) {
          vertex.fromBufferAttribute(p, i).applyMatrix4(matrix); bounds.expandByPoint(vertex);
          farthest = Math.max(farthest, Math.hypot(vertex.x - 30, vertex.z + 20));
        }
        expect(bounds.min.y).toBeCloseTo(4, 1);
        expect(bounds.getSize(vertex).y).toBeGreaterThan(radius * .4);
        expect(farthest).toBeLessThan(radius);
        expect(view.hazardBodies.geometry).toBe(geometry);
      }
    } finally { view.dispose(); }
  });
});
