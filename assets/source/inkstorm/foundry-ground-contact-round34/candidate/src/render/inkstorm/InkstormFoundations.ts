import { BoxGeometry, Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { InkstormPlacement } from '../../game/race/inkstormLayout';
import { InkstormSurfaceMaterial } from './InkstormSurfaceMaterial';

/** Buried foundations join rigid authored machinery to the analytic terrain. */
export function createInkstormFoundations(placements: readonly InkstormPlacement[], heightAt: (x: number, z: number) => number,
  pitAnchorHeight?: (id: string) => number | undefined, replacedPipeBankIds?: ReadonlySet<string>): InstancedMesh {
  const geometry = new BoxGeometry(1, 1, 1);
  const mesh = new InstancedMesh(geometry, new InkstormSurfaceMaterial(false, null, null, false, true), placements.length * 2);
  mesh.name = 'Inkstorm grounded machinery foundations';
  mesh.count = 0;
  const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3(), up = new Vector3(0, 1, 0), rotation = new Quaternion();
  for (const p of placements) {
    // Only IDs actually merged into the live Foundry mesh may omit a box.
    if (p.family === 'pipe-bank' && replacedPipeBankIds?.has(p.id)) continue;
    const sizes: Partial<Record<InkstormPlacement['family'], [number, number]>> = { 'pit-district': [120,36], 'pit-complex': [150, 61], 'pipe-bank': [94, 44], 'finish-tower': [30, 23] };
    const dimensions = sizes[p.family];
    const supports: number[][] = p.family === 'foundry-gantry' ? [[-46, 0, 12, 14], [46, 0, 12, 14]]
      // The hangar slab is offset within its source GLB, unlike the other pads.
      : p.family === 'pit-complex' ? [[4, -2.25, 150, 60.5]]
      : dimensions ? [[0, 0, dimensions[0]!, dimensions[1]!]] : [];
    const anchor = (p.family === 'pit-complex' || p.family === 'pit-district') ? pitAnchorHeight?.(p.id) : undefined;
    const top = (anchor ?? heightAt(p.x, p.z)) + 1.5;
    for (const [localX = 0, localZ = 0, width = 1, depth = 1] of supports) {
      const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
      const x = p.x + localX * p.sx * cos + localZ * p.sz * sin;
      const z = p.z - localX * p.sx * sin + localZ * p.sz * cos;
      let bottom = top - 5;
      for (const dx of [-.5, 0, .5]) for (const dz of [-.5, 0, .5]) {
        bottom = Math.min(bottom, heightAt(x + dx * width * p.sx * cos + dz * depth * p.sz * sin,
          z - dx * width * p.sx * sin + dz * depth * p.sz * cos) - 4);
      }
      position.set(x, (top + bottom) / 2, z); scale.set(width * p.sx, top - bottom, depth * p.sz);
      rotation.setFromAxisAngle(up, p.yaw); matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(mesh.count, matrix); mesh.setColorAt(mesh.count++, new Color('#957357'));
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
