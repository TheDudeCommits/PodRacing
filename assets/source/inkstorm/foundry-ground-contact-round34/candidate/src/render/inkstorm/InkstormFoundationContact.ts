import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import type { PodraceCourse } from '../../game/race/course';
import { getInkstormLayout, type InkstormPlacement } from '../../game/race/inkstormLayout';

type Point = readonly [number, number, number];
interface LanePoint { x: number; z: number; width: number }
interface Segment { a: LanePoint; b: LanePoint; allowance: number }
interface OutlinePoint { x: number; z: number; groove: number }
export interface FoundationContactBank {
  id: string; triangles: number; top: number; bottom: number;
  minimumRoadSafety: number; maximumProbeSpacing: number; minimumBurial: number;
  maximumBurial: number; footprint: readonly [number, number];
}
export interface FoundationContactPlan {
  /** Fresh geometry transferred to createInkstormFoundry, which always disposes it. */
  geometry: BufferGeometry | null;
  replacedIds: ReadonlySet<string>;
  banks: FoundationContactBank[];
  rejected: { id: string; reason: string; minimumRoadSafety?: number }[];
}
const CONCRETE = new Color('#957357');
const RECESS = new Color('#57483f');
const MAX_TRIANGLES = 512;
const VEHICLE_HALF_WIDTH = 10.5;
const SAFETY = 7;
const PROBE_SPACING = 2;

function segmentDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}
/** Distance to the whole old foundation footprint, not only candidate vertices. */
function boxSegmentDistance(p: InkstormPlacement, { a, b }: Segment): number {
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
  const ax = (a.x - p.x) * cos - (a.z - p.z) * sin;
  const az = (a.x - p.x) * sin + (a.z - p.z) * cos;
  const bx = (b.x - p.x) * cos - (b.z - p.z) * sin;
  const bz = (b.x - p.x) * sin + (b.z - p.z) * cos;
  const hx = 47 * p.sx, hz = 22 * p.sz;
  let enter = 0, leave = 1;
  for (const [origin, direction, half] of [[ax, bx - ax, hx], [az, bz - az, hz]]) {
    if (Math.abs(direction!) < 1e-12) {
      if (Math.abs(origin!) > half!) { enter = 2; break; }
    } else {
      const t0 = (-half! - origin!) / direction!, t1 = (half! - origin!) / direction!;
      enter = Math.max(enter, Math.min(t0, t1)); leave = Math.min(leave, Math.max(t0, t1));
    }
  }
  if (enter <= leave) return 0;
  const pointBox = (x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x) - hx), Math.max(0, Math.abs(z) - hz));
  return Math.min(pointBox(ax, az), pointBox(bx, bz),
    ...[-hx, hx].flatMap(x => [-hz, hz].map(z => segmentDistance(x, z, ax, az, bx, bz))));
}

/** Closed square loft with three genuine recessed frontage joints. */
function outline(): OutlinePoint[] {
  const result: OutlinePoint[] = [];
  for (const x of [-47, -94 / 3, -47 / 3, 0, 47 / 3, 94 / 3, 47]) result.push({ x, z: -22, groove: 0 });
  for (const z of [-11, 0, 11, 22]) result.push({ x: 47, z, groove: 0 });
  for (const x of [35.25, 24.05, 23.8, 23.2, 22.95, 11.75, .55, .3, -.3, -.55, -11.75, -22.95, -23.2, -23.8, -24.05, -35.25, -47]) {
    const groove = [23.8, 23.2, .3, -.3, -23.2, -23.8].includes(x) ? 1 : 0;
    result.push({ x, z: 22, groove });
  }
  for (const z of [11, 0, -11]) result.push({ x: -47, z, groove: 0 });
  return result;
}

/** Build a single bank in its old rotated footprint; no layout or height writes. */
export function buildFoundationContactBank(p: InkstormPlacement, heightAt: (x: number, z: number) => number,
  minimumRoadSafety: number): { positions: number[]; normals: number[]; colors: number[]; terrainToe: Point[]; receipt: FoundationContactBank } {
  if (p.family !== 'pipe-bank' || ![p.x, p.z, p.yaw, p.sx, p.sy, p.sz, minimumRoadSafety].every(Number.isFinite)
    || p.sx <= 0 || p.sz <= 0 || minimumRoadSafety < SAFETY) throw new Error('Unsafe foundation placement.');
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw), hx = 47 * p.sx, hz = 22 * p.sz;
  const world = (x: number, y: number, z: number): Point => [p.x + x * cos + z * sin, y, p.z - x * sin + z * cos];
  const ground = (x: number, z: number): number => {
    const q = world(x, 0, z), y = heightAt(q[0], q[2]);
    if (!Number.isFinite(y)) throw new Error('Nonfinite foundation terrain.');
    return y;
  };
  const top = ground(0, 0) + 1.5;
  let bottom = top - 5;
  for (const x of [-hx, 0, hx]) for (const z of [-hz, 0, hz]) bottom = Math.min(bottom, ground(x, z) - 4);
  const boundary = outline(), n = boundary.length;
  // Six millimetres inward guards the old footprint after Float32 packing
  // at the flagship world coordinates; anchors keep their original heights.
  const ringPoint = (q: OutlinePoint, inset: number): readonly [number, number] => [
    q.x * p.sx - (Math.abs(q.x) === 47 ? Math.sign(q.x) * (inset + .006) : 0),
    q.z * p.sz - (Math.abs(q.z) === 22 ? Math.sign(q.z) * (inset + .006) : 0),
  ];
  const foot = boundary.map(q => ringPoint(q, .65 + q.groove * .2));
  const footY = foot.map(([x, z]) => Math.min(top - 1.2, ground(x, z) - .18));
  // Probe every edge at <=2m without adding a vertex at every sample. Lower
  // both ends by the worst sampled violation, so interpolation stays buried.
  const lower = footY.map(() => 0);
  let maximumProbeSpacing = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = foot[i]!, b = foot[j]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PROBE_SPACING));
    maximumProbeSpacing = Math.max(maximumProbeSpacing, Math.hypot(b[0] - a[0], b[1] - a[1]) / steps);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, target = ground(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) - .15;
      const violation = footY[i]! + (footY[j]! - footY[i]!) * t - target;
      lower[i] = Math.max(lower[i]!, violation); lower[j] = Math.max(lower[j]!, violation);
    }
  }
  for (let i = 0; i < n; i++) {
    footY[i] = footY[i]! - lower[i]!;
    if (footY[i]! <= bottom + .1) throw new Error('Terrain toe exceeds retained bottom; use original box.');
  }
  let minimumBurial = Infinity, maximumBurial = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = foot[i]!, b = foot[j]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / PROBE_SPACING));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const burial = ground(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) - (footY[i]! + (footY[j]! - footY[i]!) * t);
      minimumBurial = Math.min(minimumBurial, burial); maximumBurial = Math.max(maximumBurial, burial);
    }
  }
  if (minimumBurial < .149) throw new Error('Unseated foundation edge.');
  const vertices: Point[] = [];
  for (let layer = 0; layer < 5; layer++) for (let i = 0; i < n; i++) {
    const q = boundary[i]!;
    const inset = layer === 2 ? .35 + q.groove * .3 : layer === 3 ? .65 + q.groove * .2 : 0;
    const [x, z] = ringPoint(q, inset);
    const y = layer === 0 ? top : layer === 1 ? top - .45 : layer === 2 ? top - .75 : layer === 3 ? footY[i]! : bottom;
    if (Math.abs(x) > hx || Math.abs(z) > hz || y > top || y < bottom) throw new Error('Foundation left old envelope.');
    vertices.push(world(x, y, z));
  }
  const topCenter = vertices.push(world(0, top, 0)) - 1, bottomCenter = vertices.push(world(0, bottom, 0)) - 1;
  // Verify the actual uploaded positions, not only the double-precision plan.
  for (let i = 0; i < vertices.length; i++) {
    const q = vertices[i]!, packed: Point = [Math.fround(q[0]), Math.fround(q[1]), Math.fround(q[2])];
    const dx = packed[0] - p.x, dz = packed[2] - p.z;
    if (Math.abs(dx * cos - dz * sin) > hx || Math.abs(dx * sin + dz * cos) > hz) {
      throw new Error('Packed foundation left the retained footprint.');
    }
    vertices[i] = packed;
  }
  const faces: { indices: readonly [number, number, number]; recess: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push({ indices: [topCenter, j, i], recess: false }, { indices: [bottomCenter, 4 * n + i, 4 * n + j], recess: false });
    for (let layer = 0; layer < 4; layer++) {
      const a = layer * n + i, b = layer * n + j, c = (layer + 1) * n + j, d = (layer + 1) * n + i;
      const recess = layer === 1 || (layer === 2 && boundary[i]!.groove === 1 && boundary[j]!.groove === 1);
      faces.push({ indices: [a, b, c], recess }, { indices: [a, c, d], recess });
    }
  }
  if (faces.length > MAX_TRIANGLES) throw new Error('Foundation triangle cap exceeded.');
  const positions: number[] = [], normals: number[] = [], colors: number[] = [];
  for (const face of faces) {
    const [a, b, c] = face.indices.map(i => vertices[i]!) as [Point, Point, Point];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const length = Math.hypot(...normal);
    if (!Number.isFinite(length) || length < 1e-7) throw new Error('Degenerate foundation triangle.');
    const tint = face.recess ? RECESS : CONCRETE;
    for (const q of [a, b, c]) { positions.push(...q); normals.push(...normal.map(x => x / length)); colors.push(tint.r, tint.g, tint.b); }
  }
  return { positions, normals, colors, terrainToe: vertices.slice(3 * n, 4 * n), receipt: { id: p.id, triangles: faces.length, top, bottom, minimumRoadSafety,
    maximumProbeSpacing, minimumBurial, maximumBurial, footprint: [hx * 2, hz * 2] } };
}

/** Flagship-only one-time geometry. A rejected bank retains its complete old box. */
export function createInkstormFoundationContactPlan(course: PodraceCourse, heightAt: (x: number, z: number) => number): FoundationContactPlan {
  const result: FoundationContactPlan = { geometry: null, replacedIds: new Set(), banks: [], rejected: [] };
  if (course.seed !== 0x494e4b53) return result;
  const ids = new Set<string>(), positions: number[] = [], normals: number[] = [], colors: number[] = [];
  try {
    const points = course.getRenderData(4096).points;
    const segments: Segment[] = points.map((a, i) => {
      const b = points[(i + 1) % points.length]!;
      return { a, b, allowance: Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.width - b.width) };
    });
    for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
      segments.push({ a: branch.points[i - 1]!, b: branch.points[i]!, allowance: 0 });
    }
    for (const p of getInkstormLayout(course)) {
      if (p.family !== 'pipe-bank') continue;
      let minimumSafety = Infinity;
      try {
        for (const segment of segments) minimumSafety = Math.min(minimumSafety,
          boxSegmentDistance(p, segment) - Math.max(segment.a.width, segment.b.width) - VEHICLE_HALF_WIDTH - segment.allowance);
        const bank = buildFoundationContactBank(p, heightAt, minimumSafety);
        positions.push(...bank.positions); normals.push(...bank.normals); colors.push(...bank.colors);
        ids.add(p.id); result.banks.push(bank.receipt);
      } catch (error) { result.rejected.push({ id: p.id, reason: String(error), minimumRoadSafety: Number.isFinite(minimumSafety) ? minimumSafety : undefined }); }
    }
    if (ids.size) {
      const geometry = new BufferGeometry();
      try {
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
        geometry.computeBoundingBox(); geometry.computeBoundingSphere(); result.geometry = geometry; result.replacedIds = ids;
      } catch (error) { geometry.dispose(); throw error; }
    }
  } catch (error) { result.rejected.push({ id: 'contact-plan', reason: String(error) }); }
  return result;
}
