import { BoxGeometry, BufferAttribute, BufferGeometry, Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CourseRenderBranch } from '../../game/race/types';
import type { PodraceCourse } from '../../game/race/course';
import { createInkstormForkFoundation } from './InkstormForkFoundation';
import { InkstormSurfaceMaterial } from './InkstormSurfaceMaterial';
import { inkstormRoadCrossSection } from './InkstormRoad';

type Point = readonly [number, number, number];

/** Joined slab and low trim share the road's rows; branch points remain physics authority. */
export function createInkstormBridge(branch: CourseRenderBranch, heightAt: (x: number, z: number) => number, course?: PodraceCourse): InstancedMesh {
  const vertices: number[] = [], colors: number[] = [], pieces: BufferGeometry[] = [];
  const steel = new Color('#303349'), trim = new Color('#d39865');
  const rows = branch.points.map((point, index) => ({ point,
    ...inkstormRoadCrossSection(branch.points, index, false) }));
  const at = (index: number, lateral: number, height = 0): Point => {
    const row = rows[index]!;
    return [row.point.x + row.rightX * lateral, row.point.y + height,
      row.point.z + row.rightZ * lateral];
  };
  const quad = (a: Point, b: Point, c: Point, d: Point, color: Color): void => {
    for (const p of [a, b, c, a, c, d]) { vertices.push(...p); colors.push(color.r, color.g, color.b); }
  };
  // A continuous four-sided strip has no per-segment end faces or length
  // overlap. Its caps terminate on the same finite planes as the open road.
  const strip = (left: (i: number) => number, right: (i: number) => number,
    bottom: number, top: number, color: Color, across = 1): void => {
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < across; j++) {
        const a0 = left(i) + (right(i) - left(i)) * j / across;
        const a1 = left(i) + (right(i) - left(i)) * (j + 1) / across;
        const b0 = left(i + 1) + (right(i + 1) - left(i + 1)) * j / across;
        const b1 = left(i + 1) + (right(i + 1) - left(i + 1)) * (j + 1) / across;
        // Match the road's a,b,a+1 / a+1,b,b+1 diagonal exactly.
        quad(at(i, a1, top), at(i, a0, top), at(i + 1, b0, top), at(i + 1, b1, top), color);
      }
      quad(at(i, right(i), bottom), at(i + 1, right(i + 1), bottom),
        at(i + 1, left(i + 1), bottom), at(i, left(i), bottom), color);
      quad(at(i, left(i), bottom), at(i + 1, left(i + 1), bottom),
        at(i + 1, left(i + 1), top), at(i, left(i), top), color);
      quad(at(i, right(i), top), at(i + 1, right(i + 1), top),
        at(i + 1, right(i + 1), bottom), at(i, right(i), bottom), color);
    }
    if (rows.length < 2) return;
    const last = rows.length - 1;
    quad(at(0, left(0), bottom), at(0, left(0), top), at(0, right(0), top), at(0, right(0), bottom), color);
    quad(at(last, right(last), bottom), at(last, right(last), top),
      at(last, left(last), top), at(last, left(last), bottom), color);
  };
  const width = (i: number) => rows[i]!.point.width;
  // Sixteen subdivisions reproduce the road's exact top triangulation while
  // placing its opaque support 11 cm below the painted road shader surface.
  strip(i => -width(i), width, -1.5, 0, steel, 16);
  for (const side of [-1, 1]) strip(i => width(i) * side - .35,
    i => width(i) * side + .35, 0, .32, trim);
  const shell = new BufferGeometry();
  shell.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  shell.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  shell.computeVertexNormals(); pieces.push(shell);

  // Preserve the existing founded pier positions, dimensions and spacing.
  const matrix = new Matrix4(), rotation = new Quaternion(), up = new Vector3(0, 1, 0);
  for (let i = 1; i < branch.points.length - 1; i += 3) {
    const a = branch.points[i]!, b = branch.points[i + 1]!;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, z = (a.z + b.z) / 2;
    const base = heightAt(x, z) - 2, height = y - .9 - base;
    if (height <= 3) continue;
    matrix.compose(new Vector3(x, base + height / 2, z),
      rotation.setFromAxisAngle(up, Math.atan2(b.x - a.x, b.z - a.z)), new Vector3(6, height, 7));
    const box = new BoxGeometry(1, 1, 1);
    const pier = box.toNonIndexed().applyMatrix4(matrix); box.dispose();
    const paint = new Float32Array(pier.getAttribute('position').count * 3);
    for (let j = 0; j < paint.length; j += 3) steel.toArray(paint, j);
    pier.setAttribute('color', new BufferAttribute(paint, 3));
    pier.deleteAttribute('uv'); pieces.push(pier);
  }
  const geometry = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error('Unable to join the Inkstorm bridge.');
  const foundation = course ? createInkstormForkFoundation(branch, heightAt, course) : null;
  const joined = foundation ? mergeGeometries([geometry, foundation], true) : geometry;
  if (!joined) throw new Error('Unable to join the Inkstorm fork foundation.');
  if (foundation) { geometry.dispose(); foundation.dispose(); }
  // Original bridge geometry and paint occupy group 0 without alteration.
  // One added stone group uses the existing rock shader and shared paint.
  const material = foundation
    ? [new InkstormSurfaceMaterial(false), new InkstormSurfaceMaterial(true)]
    : new InkstormSurfaceMaterial(false);
  const mesh = new InstancedMesh(joined, material, 1);
  mesh.name = `Inkstorm raised fork / ${branch.label}`;
  mesh.setMatrixAt(0, new Matrix4()); mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere(); return mesh;
}
