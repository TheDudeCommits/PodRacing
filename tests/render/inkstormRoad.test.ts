import { describe, expect, it } from 'vitest';
import type { CourseRenderPoint } from '../../src/game/race/types';
import { createInkstormRoad } from '../../src/render/inkstorm/InkstormRoad';

const points: CourseRenderPoint[] = [
  { x: 0, y: 2, z: 0, width: 5, progress: 0, tag: 'recovery-straight' },
  { x: 0, y: 4, z: 20, width: 5, progress: .25, tag: 'recovery-straight' },
  { x: 30, y: 4, z: 20, width: 5, progress: .5, tag: 'recovery-straight' },
  { x: 30, y: 2, z: 40, width: 5, progress: .75, tag: 'recovery-straight' },
];

describe('painted road branch joins', () => {
  it('keeps both open endpoint rows square to their local approach, never to the opposite end', () => {
    const mesh = createInkstormRoad(points, false, true);
    try {
      const vertices = mesh.geometry.getAttribute('position');
      const rowLength = vertices.count / points.length;
      for (const [row, centerX, centerZ] of [[0, 0, 0], [3, 30, 40]]) {
        for (let j = 0; j < rowLength; j++) {
          const index = row! * rowLength + j;
          // Both endpoint segments run north. Their full-width road joins must
          // therefore be east-west lines at the exact endpoint Z.
          expect(vertices.getZ(index)).toBe(centerZ);
          expect(vertices.getX(index)).toBeGreaterThanOrEqual(centerX! - 5);
          expect(vertices.getX(index)).toBeLessThanOrEqual(centerX! + 5);
        }
        expect(vertices.getX(row! * rowLength)).toBe(centerX! - 5);
        expect(vertices.getX((row! + 1) * rowLength - 1)).toBe(centerX! + 5);
      }
      expect(mesh.geometry.index!.count).toBe(3 * (rowLength - 1) * 6);
    } finally {
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
    }
  });

  it('retains coincident first and last rows on a genuinely closed circuit', () => {
    const mesh = createInkstormRoad(points, true, true);
    try {
      const vertices = mesh.geometry.getAttribute('position');
      const rowLength = vertices.count / (points.length + 1);
      for (let j = 0; j < rowLength; j++) {
        const end = points.length * rowLength + j;
        expect([vertices.getX(j), vertices.getY(j), vertices.getZ(j)])
          .toEqual([vertices.getX(end), vertices.getY(end), vertices.getZ(end)]);
      }
    } finally {
      mesh.geometry.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
    }
  });
});
