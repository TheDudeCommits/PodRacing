import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, Color, LatheGeometry,
  Float32BufferAttribute, Matrix4, Mesh, Quaternion, TubeGeometry, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import { getInkstormLayout, type InkstormPlacement } from '../../game/race/inkstormLayout';
import { InkstormSurfaceMaterial } from './InkstormSurfaceMaterial';
import { createInkstormPipeJoint } from './InkstormPipeJoint';
import type { FoundationContactPlan } from './InkstormFoundationContact';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../post/CelPrepassMaterial';

type HeightAt = (x: number, z: number) => number;
type Point = readonly [number, number, number];
export interface FoundryPipe { id: string; points: readonly Point[]; radius: number; color: string; socketScale?: readonly [number, number]; startJointOffset?: number; endJointOffset?: number }
export interface FoundryBox { id: string; center: Point; size: Point; yaw: number; color: string }
export interface FoundryCollector { id: string; base: Point; radius: number; height: number }
export interface FoundryConnectionPlan {
  pipes: FoundryPipe[]; boxes: FoundryBox[];
  collectors: FoundryCollector[];
  sockets: { id: string; position: Point; radius: number; outward: Point; scale: readonly [number, number] }[];
  bankIds: string[];
}
const UP = new Vector3(0, 1, 0);
const COLLECTOR_RADIUS = 3.8;
const PAINT = { blue: '#466879', rust: '#b26642', bone: '#d9c3a1', iron: '#363747' };
const point = (v: Vector3): Point => [v.x, v.y, v.z];

/** Explicit sockets in the preserved original pipe-bank source, converted Z-up to glTF Y-up. */
const SOCKETS = [
  { point: [-42, 7, 9] as Point, radius: 3 },
  { point: [-38, 19, 13] as Point, radius: 1.8 },
  { point: [8, 30, 10] as Point, radius: 2.25 },
];

function modulePoint(p: InkstormPlacement, local: Point, heightAt: HeightAt): Vector3 {
  return new Vector3(...local).multiply(new Vector3(p.sx, p.sy, p.sz))
    .applyAxisAngle(UP, p.yaw).add(new Vector3(p.x, heightAt(p.x, p.z) - 1.5, p.z));
}

/** Flagship-only facade connections; original gantry and all collision truth are retained. */
export function getInkstormFoundryPlan(course: PodraceCourse, heightAt: HeightAt): FoundryConnectionPlan {
  const plan: FoundryConnectionPlan = { pipes: [], boxes: [], collectors: [], sockets: [], bankIds: [] };
  if (course.seed !== 0x494e4b53) return plan;
  const banks = getInkstormLayout(course).filter(p => p.family === 'pipe-bank');
  const sides = [-1, 1].map(side => banks.filter(p => {
    const road = course.sampleAtProgress(p.progress);
    return Math.sign((p.x - road.x) * road.rightX + (p.z - road.z) * road.rightZ) === side;
  }).sort((a, b) => a.progress - b.progress));
  const rows = Math.min(sides[0]!.length, sides[1]!.length);
  const headings: Vector3[][] = [[], []];
  for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
    for (const [index, p] of sides[sideIndex]!.entries()) {
      plan.bankIds.push(p.id);
      const road = course.sampleAtProgress(p.progress);
      const top = road.y + (sideIndex ? 39 : 34);
      const header = modulePoint(p, [0, 0, 17], heightAt); header.y = top;
      headings[sideIndex]!.push(header);
      // Three feeds meet a real upright collector. Its base sits on the same
      // module foundation; the former empty junction left three open ends.
      const collectorBase = modulePoint(p, [0, 1.2, 17], heightAt);
      const collectorRadius = COLLECTOR_RADIUS;
      plan.collectors.push({ id: `${p.id}-collector`, base: point(collectorBase), radius: collectorRadius,
        height: Math.max(10, top + 5 - collectorBase.y) });
      const outward = new Vector3(-1, 0, 0).applyAxisAngle(UP, p.yaw);
      for (const [socketIndex, socket] of SOCKETS.entries()) {
        const mouth = modulePoint(p, socket.point, heightAt);
        plan.sockets.push({ id: `${p.id}-socket-${socketIndex}`, position: point(mouth), radius: socket.radius,
          outward: point(outward), scale: [p.sz, p.sy] });
        // Begin within the actual cap and leave along its measured -local-X
        // normal, rather than bending sideways across the visible black face.
        const start = mouth.clone().addScaledVector(outward, -.75);
        const axial = mouth.clone().addScaledVector(outward, 8 + socketIndex * 2);
        const elbow = axial.clone().addScaledVector(outward, 4);
        elbow.y = top - socketIndex * 3;
        const high = header.clone(); high.y = elbow.y;
        plan.pipes.push({ id: `${p.id}-socket-link-${socketIndex}`, radius: socket.radius,
          socketScale: [p.sz, p.sy], endJointOffset: collectorRadius + 1.1,
          color: socketIndex === 1 ? PAINT.bone : PAINT.rust,
          points: [point(start), point(mouth.clone().addScaledVector(outward, 3)), point(axial), point(elbow), point(high)] });
      }
      if (index) {
        const a = headings[sideIndex]![index - 1]!.clone(), b = header.clone();
        const y = Math.max(a.y, b.y), ah = a.clone(), bh = b.clone(); ah.y = y; bh.y = y;
        plan.pipes.push({ id: `foundry-side-${sideIndex}-header-${index}`, radius: sideIndex ? 2.6 : 3.2,
          startJointOffset: COLLECTOR_RADIUS + 1.1, endJointOffset: COLLECTOR_RADIUS + 1.1,
          color: sideIndex ? PAINT.blue : PAINT.rust, points: [point(a), point(ah), point(bh), point(b)] });
      }
    }
  }
  // The service gantry frames the foreground. The connected pressure
  // mains sit across successive actual module pairs at lower, visible heights.
  // Preserve every V2 crossing; append the later continuous-chicane rows.
  const originalRows = Math.min(4, rows);
  const selected = [...new Set([0, Math.floor((originalRows - 1) * .5), originalRows - 1])].filter(i => i >= 0);
  for (let row = 6; row < rows; row += 3) selected.push(row);
  if (rows > 4 && !selected.includes(rows - 1)) selected.push(rows - 1);
  for (const [index, row] of selected.entries()) {
    const rhythm = index % 3;
    const a = headings[0]![row]!.clone(), b = headings[1]![row]!.clone();
    const progress = (sides[0]![row]!.progress + sides[1]![row]!.progress) / 2;
    let y = course.sampleAtProgress(progress).y + [34, 42, 38][rhythm]!;
    // Lift only if the actual crossed racing envelope needs 30m clearance.
    for (let t = 0; t <= 1; t += .025) {
      const p = a.clone().lerp(b, t), route = course.projectPoint(p.x, p.z);
      if (route.distanceToCenter < route.width + 8) y = Math.max(y, heightAt(p.x, p.z) + 34);
    }
    if (index >= 3) {
      // Later switchbacks can have a second legal road above the nearest
      // terrain projection. Bound the new spans against all adjacent lanes;
      // the three V2 crossings and their normals remain byte-exact.
      const corridors = course.getRenderData(4096);
      const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
      for (const p of [...corridors.points, ...(corridors.branches ?? []).flatMap(branch => branch.points)]) {
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (length2 || 1)));
        if (Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < p.width + 8) y = Math.max(y, p.y + 37);
      }
    }
    const ah = a.clone(); ah.y = y; const bh = b.clone(); bh.y = y;
    plan.pipes.push({ id: `foundry-overhead-${index}`, radius: [3.2, 2.6, 2][rhythm]!,
      startJointOffset: COLLECTOR_RADIUS + 1.1, endJointOffset: COLLECTOR_RADIUS + 1.1,
      color: rhythm === 1 ? PAINT.bone : PAINT.blue,
      points: [point(a), point(ah), point(bh), point(b)] });
    if (index === 1) {
      const center = ah.clone().add(bh).multiplyScalar(.5), delta = bh.clone().sub(ah);
      const yaw = Math.atan2(-delta.z, delta.x), length = delta.length();
      plan.boxes.push({ id: 'foundry-maintenance-deck', center: [center.x, y + 3.4, center.z],
        size: [length, .8, 4], yaw, color: PAINT.iron });
      for (const side of [-1, 1]) {
        const normal = new Vector3(-delta.z, 0, delta.x).normalize().multiplyScalar(side * 1.8);
        plan.boxes.push({ id: `foundry-deck-rail-${side}`, center: [center.x + normal.x, y + 6.4, center.z + normal.z],
          size: [length, .5, .5], yaw, color: PAINT.bone });
        for (let d = 6; d < length - 3; d += 18) {
          const p = ah.clone().lerp(bh, d / length).add(normal);
          plan.boxes.push({ id: `foundry-deck-post-${side}-${d}`, center: [p.x, y + 4.9, p.z],
            size: [.5, 2.4, .5], yaw, color: PAINT.iron });
        }
      }
    }
  }
  return plan;
}

/** Build the union on the same centerline and arc parameterization as its tube. */
export function createInkstormFoundryPipeJoint(pipe: FoundryPipe, curve: CatmullRomCurve3, atEnd: boolean): BufferGeometry {
  const points = curve.points, end = atEnd ? points.length - 1 : 0;
  const direction = atEnd ? points[end]!.clone().sub(points[end - 1]!) : points[1]!.clone().sub(points[0]!);
  const jointCenter = points[end]!.clone();
  const offset = atEnd ? pipe.endJointOffset : pipe.startJointOffset;
  if (offset) {
    // A short vertical lead can be shorter than the requested inset. Follow
    // the bend instead of continuing its endpoint ray into empty space.
    const length = curve.getLength();
    const inset = length > 0 ? Math.max(0, Math.min(offset, length * .5)) / length : 0;
    const u = atEnd ? 1 - inset : inset;
    jointCenter.copy(curve.getPointAt(u));
    direction.copy(curve.getTangentAt(u));
  }
  const collar = createInkstormPipeJoint(pipe.radius);
  collar.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction.normalize()));
  // Preserve the original unshifted socket flange's rotation/scale order.
  if (!atEnd && pipe.socketScale) collar.scale(pipe.socketScale[0], pipe.socketScale[1], pipe.socketScale[0]);
  collar.translate(jointCenter.x, jointCenter.y, jointCenter.z);
  return collar;
}

/** One additional opaque material/mesh, no textures, images, lights or frame updates. */
export function createInkstormFoundry(course: PodraceCourse, heightAt: HeightAt, contact?: FoundationContactPlan): Mesh | null {
  try { return createInkstormFoundryMesh(course, heightAt, contact); }
  finally { contact?.geometry?.dispose(); }
}

function createInkstormFoundryMesh(course: PodraceCourse, heightAt: HeightAt, contact?: FoundationContactPlan): Mesh | null {
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
    const segments = Math.max(16, points.length * 6);
    const tube = new TubeGeometry(curve, segments, pipe.radius, 10, false);
    if (pipe.socketScale) {
      const positions = tube.getAttribute('position'), [horizontal, vertical] = pipe.socketScale;
      const length = curve.getLength();
      for (let ring = 0; ring <= segments; ring++) {
        const t = ring / segments, center = curve.getPointAt(t);
        const taper = Math.max(0, 1 - t * length / 17);
        for (let spoke = 0; spoke <= 10; spoke++) {
          const i = ring * 11 + spoke;
          positions.setXYZ(i, center.x + (positions.getX(i) - center.x) * (1.1 + (horizontal - 1.1) * taper),
            center.y + (positions.getY(i) - center.y) * (1.1 + (vertical - 1.1) * taper),
            center.z + (positions.getZ(i) - center.z) * (1.1 + (horizontal - 1.1) * taper));
        }
      }
      tube.computeVertexNormals();
    }
    add(tube, pipe.color);
    for (const atEnd of [false, true]) parts.push(createInkstormFoundryPipeJoint(pipe, curve, atEnd));
  }
  for (const collector of plan.collectors) {
    const { radius: r, height: h } = collector;
    const profile = [[0,0],[r*.45,.25],[r*.85,.85],[r,1.4],[r,h-1.4],[r*.85,h-.85],[r*.45,h-.25],[0,h]];
    const body = new LatheGeometry(profile.map(([x,y]) => new Vector2(x!,y!)),16);
    body.translate(...collector.base); add(body, PAINT.rust);
    for (const y of [2.5, h-2.5]) {
      const joint = createInkstormPipeJoint(r);
      joint.translate(collector.base[0], collector.base[1] + y, collector.base[2]); parts.push(joint);
    }
    // Broad saddle/skirt beneath the collector, kept within the bank footprint.
    const foot = new BoxGeometry(r*2.2, .7, r*2.2);
    foot.translate(collector.base[0], collector.base[1]+.35, collector.base[2]); add(foot, PAINT.blue);
  }
  for (const box of plan.boxes) {
    const geometry = new BoxGeometry(...box.size);
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...box.center), new Quaternion().setFromAxisAngle(UP, box.yaw), new Vector3(1, 1, 1)));
    add(geometry, box.color);
  }
  let geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Could not merge the foundry service network.');
  let replacedPipeBankIds: ReadonlySet<string> = new Set<string>();
  let contactFailure: string | null = null;
  if (contact?.geometry) {
    // Failure retains the old service mesh and an empty omission set. The
    // caller therefore keeps every complete original foundation box.
    try {
      const merged = mergeGeometries([geometry, contact.geometry], false);
      if (merged) { geometry.dispose(); geometry = merged; replacedPipeBankIds = new Set(contact.replacedIds); }
      else contactFailure = 'Contact merge rejected; original boxes retained.';
    } catch (error) { contactFailure = String(error); }
  }
  geometry.computeBoundingSphere(); geometry.computeBoundingBox();
  const mesh = new Mesh(geometry, new InkstormSurfaceMaterial(false));
  mesh.name = 'Inkstorm connected foundry pressure mains and service bridge';
  mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
  mesh.userData.inkstormFoundryPlan = plan;
  mesh.userData.inkstormFoundationReplacementIds = replacedPipeBankIds;
  mesh.userData.inkstormFoundationContact = { banks: contact?.banks ?? [], rejected: contact?.rejected ?? [],
    installedIds: [...replacedPipeBankIds], mergeFailure: contactFailure };
  return mesh;
}
