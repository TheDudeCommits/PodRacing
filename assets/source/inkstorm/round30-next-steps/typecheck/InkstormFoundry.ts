import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry,
  Float32BufferAttribute, Matrix4, Mesh, Quaternion, TubeGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '/Users/amir/Projects/PodRacing/src/game/race/course';
import { getInkstormLayout, type InkstormPlacement } from '/Users/amir/Projects/PodRacing/src/game/race/inkstormLayout';
import { InkstormSurfaceMaterial } from '/Users/amir/Projects/PodRacing/src/render/inkstorm/InkstormSurfaceMaterial';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '/Users/amir/Projects/PodRacing/src/render/post/CelPrepassMaterial';

type HeightAt = (x: number, z: number) => number;
type Point = readonly [number, number, number];
export interface FoundryPipe { id: string; points: readonly Point[]; radius: number; color: string }
export interface FoundryBox { id: string; center: Point; size: Point; yaw: number; color: string }
export interface FoundryConnectionPlan {
  pipes: FoundryPipe[]; boxes: FoundryBox[];
  sockets: { id: string; position: Point; radius: number }[];
  bankIds: string[];
}
const UP = new Vector3(0, 1, 0);
const PAINT = { blue: '#466879', rust: '#b26642', bone: '#d9c3a1', iron: '#363747' };
const point = (v: Vector3): Point => [v.x, v.y, v.z];

/** Explicit sockets in the preserved original pipe-bank source, converted Z-up to glTF Y-up. */
const SOCKETS = [
  { point: [-42, 7, 9] as Point, radius: 3 },
  { point: [-38, 19, 13] as Point, radius: 1.8 },
  { point: [8, 30, 10] as Point, radius: 2.25 },
];

export function replacesInkstormFoundryGantry(course: PodraceCourse, p: InkstormPlacement): boolean {
  return course.seed === 0x494e4b53 && p.family === 'foundry-gantry'
    && course.sampleAtProgress(p.progress).tag === 'chicane';
}

function modulePoint(p: InkstormPlacement, local: Point, heightAt: HeightAt): Vector3 {
  return new Vector3(...local).multiply(new Vector3(p.sx, p.sy, p.sz))
    .applyAxisAngle(UP, p.yaw).add(new Vector3(p.x, heightAt(p.x, p.z) - 1.5, p.z));
}

/** Static, flagship-only geometry. All low risers stay on the existing plant footprint. */
export function getInkstormFoundryPlan(course: PodraceCourse, heightAt: HeightAt): FoundryConnectionPlan {
  const plan: FoundryConnectionPlan = { pipes: [], boxes: [], sockets: [], bankIds: [] };
  if (course.seed !== 0x494e4b53) return plan;
  const banks = getInkstormLayout(course).filter(p => p.family === 'pipe-bank');
  // Retain a visible industrial support at both exact existing collision
  // columns. Only the start-light artwork is replaced; collision truth stays.
  for (const p of getInkstormLayout(course).filter(p => replacesInkstormFoundryGantry(course, p))) {
    for (const side of [-1, 1]) {
      const base = modulePoint(p, [46 * side, 0, 0], heightAt);
      const bottom = Math.min(base.y, heightAt(base.x, base.z)) - 5;
      const top = Math.max(base.y, heightAt(base.x, base.z)) + 50 * p.sy;
      plan.boxes.push({ id: `${p.id}-retained-support-${side}`, center: [base.x, (bottom + top) / 2, base.z],
        size: [12 * p.sx, top - bottom, 14 * p.sz], yaw: p.yaw, color: PAINT.blue });
      plan.boxes.push({ id: `${p.id}-support-collar-${side}`, center: [base.x, top - 3, base.z],
        size: [15 * p.sx, 3, 17 * p.sz], yaw: p.yaw, color: PAINT.rust });
    }
  }
  const sides = [-1, 1].map(side => banks.filter(p => {
    const road = course.sampleAtProgress(p.progress);
    return Math.sign((p.x - road.x) * road.rightX + (p.z - road.z) * road.rightZ) === side;
  }).sort((a, b) => a.progress - b.progress).slice(0, 4));
  const rows = Math.min(sides[0]!.length, sides[1]!.length);
  const headings: Vector3[][] = [[], []];
  for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
    const side = sideIndex === 0 ? -1 : 1;
    for (const [index, p] of sides[sideIndex]!.entries()) {
      plan.bankIds.push(p.id);
      const road = course.sampleAtProgress(p.progress);
      const top = Math.max(heightAt(p.x, p.z) + 51 * p.sy + 9, road.y + 70);
      const header = modulePoint(p, [0, 0, -6], heightAt);
      header.y = top;
      headings[sideIndex]!.push(header);
      for (const [socketIndex, socket] of SOCKETS.entries()) {
        const start = modulePoint(p, socket.point, heightAt);
        plan.sockets.push({ id: `${p.id}-socket-${socketIndex}`, position: point(start), radius: socket.radius });
        const outward = new Vector3(road.rightX * side, 0, road.rightZ * side);
        // Rise over the existing slab before moving toward the elevated header.
        const collar = start.clone().addScaledVector(outward, 3.5);
        const high = collar.clone(); high.y = top - socketIndex * 5;
        const end = header.clone(); end.y = high.y;
        plan.pipes.push({ id: `${p.id}-socket-link-${socketIndex}`, radius: socket.radius,
          color: socketIndex === 1 ? PAINT.bone : PAINT.rust,
          points: [point(start), point(collar), point(high), point(end)] });
      }
      // One unequal high service spine per side joins otherwise isolated tanks.
      if (index) {
        const a = headings[sideIndex]![index - 1]!.clone(), b = header.clone();
        const y = Math.max(a.y, b.y) + (sideIndex ? 7 : 0);
        const ah = a.clone(); ah.y = y; const bh = b.clone(); bh.y = y;
        plan.pipes.push({ id: `foundry-side-${sideIndex}-header-${index}`, radius: sideIndex ? 3.4 : 4.2,
          color: sideIndex ? PAINT.blue : PAINT.rust, points: [point(a), point(ah), point(bh), point(b)] });
      }
    }
  }
  // Two pressure mains and a narrower final cable/service crossing, staggered
  // by actual plant rows. They have no start lamps or rectangular race-sign face.
  const selected = [...new Set([0, Math.floor((rows - 1) * .5), rows - 1])].filter(i => i >= 0);
  for (const [index, row] of selected.entries()) {
    const a = headings[0]![row]!.clone(), b = headings[1]![row]!.clone();
    const y = Math.max(a.y, b.y) + [12, 25, 6][index]!;
    const ah = a.clone(); ah.y = y; const bh = b.clone(); bh.y = y;
    plan.pipes.push({ id: `foundry-overhead-${index}`, radius: [4.8, 3.8, 2.2][index]!,
      color: index === 1 ? PAINT.bone : PAINT.blue,
      points: [point(a), point(ah), point(bh), point(b)] });
    if (index === 1) {
      const center = ah.clone().add(bh).multiplyScalar(.5), delta = bh.clone().sub(ah);
      const yaw = Math.atan2(-delta.z, delta.x), length = delta.length();
      plan.boxes.push({ id: 'foundry-maintenance-deck', center: [center.x, y + 5.5, center.z],
        size: [length, 1.2, 6], yaw, color: PAINT.iron });
      for (const side of [-1, 1]) {
        const normal = new Vector3(-delta.z, 0, delta.x).normalize().multiplyScalar(side * 2.7);
        plan.boxes.push({ id: `foundry-deck-rail-${side}`, center: [center.x + normal.x, y + 9, center.z + normal.z],
          size: [length, .65, .65], yaw, color: PAINT.bone });
        for (let d = 6; d < length - 3; d += 18) {
          const p = ah.clone().lerp(bh, d / length).add(normal);
          plan.boxes.push({ id: `foundry-deck-post-${side}-${d}`, center: [p.x, y + 7.1, p.z],
            size: [.65, 3.2, .65], yaw, color: PAINT.iron });
        }
      }
    }
  }
  return plan;
}

/** One additional opaque material/mesh, no textures, images, lights or frame updates. */
export function createInkstormFoundry(course: PodraceCourse, heightAt: HeightAt): Mesh | null {
  const plan = getInkstormFoundryPlan(course, heightAt);
  if (!plan.pipes.length) return null;
  const parts: BufferGeometry[] = [];
  const add = (source: BufferGeometry, color: string): void => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute('uv'); geometry.clearGroups();
    const tint = new Color(color), colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3)); parts.push(geometry);
  };
  for (const pipe of plan.pipes) {
    const points = pipe.points.map(p => new Vector3(...p)).filter((p, i, all) => !i || p.distanceToSquared(all[i - 1]!) > .01);
    const curve = new CatmullRomCurve3(points, false, 'catmullrom', .08);
    add(new TubeGeometry(curve, Math.max(12, points.length * 7), pipe.radius, 8, false), pipe.color);
    for (const end of [0, points.length - 1]) {
      const direction = end ? points[end]!.clone().sub(points[end - 1]!) : points[1]!.clone().sub(points[0]!);
      const collar = new CylinderGeometry(pipe.radius + .65, pipe.radius + .65, 1.1, 10);
      collar.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
      collar.translate(...pipe.points[end === 0 ? 0 : pipe.points.length - 1]!);
      add(collar, PAINT.iron);
    }
  }
  for (const box of plan.boxes) {
    const geometry = new BoxGeometry(...box.size);
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...box.center), new Quaternion().setFromAxisAngle(UP, box.yaw), new Vector3(1, 1, 1)));
    add(geometry, box.color);
  }
  const geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Could not merge the foundry service network.');
  geometry.computeBoundingSphere(); geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, new InkstormSurfaceMaterial(false));
  mesh.name = 'Inkstorm connected foundry pressure mains and service bridge';
  mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
  mesh.userData.inkstormFoundryPlan = plan;
  return mesh;
}
