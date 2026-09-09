import { InstancedMesh, Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { CourseRenderBranch } from '../../src/game/race/types';
import { sampleBridgeSurface } from '../../src/game/race/bridgeSurface';
import { createInkstormBridge } from '../../src/render/inkstorm/InkstormBridge';
import { createInkstormRoad } from '../../src/render/inkstorm/InkstormRoad';

function branch(rows: readonly (readonly [number, number, number, number])[]): CourseRenderBranch {
  return { id: 'joined-deck', kind: 'shortcut', label: 'Joined deck', elevated: true,
    entryProgress: .1, exitProgress: .3, risk: .5, reward: .5,
    points: rows.map(([x, y, z, width], i) => ({ x, y, z, width,
      canonicalProgress: .1 + i / (rows.length - 1) * .2, routeProgress: i / (rows.length - 1) })) };
}
function dispose(mesh: Mesh): void {
  if (mesh instanceof InstancedMesh) mesh.dispose();
  mesh.geometry.dispose();
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
}
const down = new Vector3(0, -1, 0);
function top(mesh: Mesh, x: number, z: number): number | undefined {
  return new Raycaster(new Vector3(x, 200, z), down, 0, 400).intersectObject(mesh)[0]?.point.y;
}

describe('joined raised fork structure', () => {
  it('keeps the entire graded straight deck at the independent physical surface height', () => {
    const data = branch([[0, 2, 0, 5], [0, 9, 30, 8], [0, 4, 70, 6]]);
    const mesh = createInkstormBridge(data, () => -10);
    try {
      for (const z of [.001, 8, 19, 29.999, 30, 30.001, 44, 61, 69.999]) {
        for (const x of [-4, -1, 0, 1, 4]) {
          const physical = sampleBridgeSurface([data], x, z)!;
          expect(physical).not.toBeNull();
          expect(top(mesh, x, z)).toBeCloseTo(physical.height, 5);
        }
      }
      expect(top(mesh, 0, -.01)).toBeUndefined();
      expect(top(mesh, 0, 70.01)).toBeUndefined();
      expect(mesh.count).toBe(1);
      expect(mesh.material).toMatchObject({ depthWrite: true, depthTest: true, transparent: false });
    } finally { dispose(mesh); }
  });

  it('matches every road triangle through width changes and turns, with no pitched slab poking through', () => {
    const data = branch([[0, 2, 0, 5], [0, 9, 30, 8], [20, 12, 60, 6], [35, 5, 95, 9]]);
    const frozen = JSON.stringify(data);
    const bridge = createInkstormBridge(data, () => -10);
    const road = createInkstormRoad(data.points.map(p => ({ ...p, progress: p.canonicalProgress, tag: 'hairpin' as const })), false, true);
    try {
      const positions = road.geometry.getAttribute('position'), indices = road.geometry.index!;
      const a = new Vector3(), b = new Vector3(), c = new Vector3();
      for (let i = 0; i < indices.count; i += 3) {
        a.fromBufferAttribute(positions, indices.getX(i));
        b.fromBufferAttribute(positions, indices.getX(i + 1));
        c.fromBufferAttribute(positions, indices.getX(i + 2));
        // Interior barycentric point of every actual painted-road triangle.
        const x = a.x * .28 + b.x * .33 + c.x * .39;
        const z = a.z * .28 + b.z * .33 + c.z * .39;
        const roadY = top(road, x, z)!;
        const deckY = top(bridge, x, z)!;
        expect(roadY).toBeDefined(); expect(deckY).toBeDefined();
        // Outermost triangle probes can hit the intentionally low 32 cm trim.
        const row = Math.floor(i / (16 * 6)), column = Math.floor(i / 6) % 16;
        if (column > 0 && column < 15) expect(roadY - deckY, `row ${row}, column ${column}`).toBeCloseTo(.07, 4);
        // Curved rail strips have their own narrow quad diagonal: allow four
        // centimetres of local grade variation within the 32 cm trim envelope.
        else expect(deckY - roadY).toBeLessThan(.29);
      }
      expect(JSON.stringify(data)).toBe(frozen);
    } finally { dispose(road); dispose(bridge); }
  });

  it('terminates both edge trims on the finite open road planes and keeps the existing founded pier', () => {
    const data = branch([[0, 20, 0, 8], [0, 20, 20, 8], [0, 20, 40, 8], [0, 20, 60, 8]]);
    const mesh = createInkstormBridge(data, () => 0);
    try {
      for (const x of [-8, 8]) {
        expect(top(mesh, x, -.01)).toBeUndefined();
        expect(top(mesh, x, 60.01)).toBeUndefined();
        for (const z of [.001, 19.999, 20, 20.001, 39.999, 40.001, 59.999]) {
          expect(top(mesh, x, z)).toBeCloseTo(20.32, 5);
        }
      }
      const pier = new Raycaster(new Vector3(-20, 10, 30), new Vector3(1, 0, 0), 0, 40).intersectObject(mesh)[0];
      expect(pier?.point.x).toBeCloseTo(-3, 6);
      const belowFooting = new Raycaster(new Vector3(-20, -2.01, 30), new Vector3(1, 0, 0), 0, 40).intersectObject(mesh);
      expect(belowFooting).toHaveLength(0);
      expect(new Raycaster(new Vector3(-20, 10, 10), new Vector3(1, 0, 0), 0, 40).intersectObject(mesh)).toHaveLength(0);
    } finally { dispose(mesh); }
  });

});
