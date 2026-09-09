/** Instance-owned off-road workshop grading, shared by physics and rendering. */
export interface PitPlacement { readonly id: string; readonly family: string; readonly x: number; readonly z: number; readonly yaw: number; readonly sx: number; readonly sz: number }
export interface RoutePoint { readonly x: number; readonly z: number; readonly width: number }
export interface PitPad {
  readonly id: string; readonly x: number; readonly z: number; readonly yaw: number;
  readonly anchorHeight: number; readonly targetHeight: number;
  readonly centerX: number; readonly centerZ: number; readonly halfX: number; readonly halfZ: number;
  readonly minRoadClearance: number; readonly accepted: boolean;
  readonly declineReason?: 'protected-road-overlap' | 'atlas-budget';
}
interface Segment { ax: number; az: number; dx: number; dz: number; lengthSq: number; width: number }
export interface PitPadGrid { minX: number; minZ: number; cellSize: number; columns: number; rows: number; values: Float32Array }
export const PIT_PAD_CELL_SIZE = 1;
export const PIT_PAD_APRON = 32;
export const PIT_PAD_COLLAR = 3;
export const PIT_PAD_LANE_MARGIN = 10;
export const PIT_PAD_MAX_DIMENSION = 1024;
export const PIT_PAD_MAX_TEXELS = 512 * 1024;
// Preserve the existing signed-field normal/filter allowance, scaled to this grid.
export const PIT_PAD_FILTER_MARGIN = Math.SQRT2 * PIT_PAD_CELL_SIZE + 4;
const PROTECTION_FADE = 2;
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const radius = PIT_PAD_LANE_MARGIN + PIT_PAD_FILTER_MARGIN;

function segmentsFor(route: readonly RoutePoint[], branches: readonly { points: readonly RoutePoint[] }[]): Segment[] {
  const segments: Segment[] = [];
  const add = (points: readonly RoutePoint[], closed: boolean) => {
    for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      segments.push({ ax: a.x, az: a.z, dx, dz, lengthSq: dx * dx + dz * dz, width: Math.max(a.width, b.width) });
    }
  };
  add(route, true); for (const branch of branches) add(branch.points, false);
  return segments;
}
function roadClearance(segments: readonly Segment[], x: number, z: number): number {
  let result = Infinity;
  for (const s of segments) {
    const t = clamp(((x - s.ax) * s.dx + (z - s.az) * s.dz) / Math.max(s.lengthSq, 1e-8));
    result = Math.min(result, Math.hypot(x - s.ax - s.dx * t, z - s.az - s.dz * t) - s.width);
  }
  return result;
}
function protectionBuckets(segments: readonly Segment[]): (x: number, z: number) => readonly Segment[] {
  const buckets = new Map<string, Segment[]>(), size = 64, reach = radius + PIT_PAD_APRON;
  for (const s of segments) {
    const padding = s.width + reach;
    for (let z = Math.floor((Math.min(s.az, s.az + s.dz) - padding) / size); z <= Math.floor((Math.max(s.az, s.az + s.dz) + padding) / size); z++)
      for (let x = Math.floor((Math.min(s.ax, s.ax + s.dx) - padding) / size); x <= Math.floor((Math.max(s.ax, s.ax + s.dx) + padding) / size); x++) {
        const key = `${x}:${z}`, bucket = buckets.get(key);
        if (bucket) bucket.push(s); else buckets.set(key, [s]);
      }
  }
  const empty: readonly Segment[] = [];
  return (x, z) => buckets.get(`${Math.floor(x / size)}:${Math.floor(z / size)}`) ?? empty;
}
export function padLocalToWorld(pad: PitPad, x: number, z: number): [number, number] {
  const c = Math.cos(pad.yaw), s = Math.sin(pad.yaw);
  return [pad.centerX + x * c + z * s, pad.centerZ - x * s + z * c];
}
function padDistance(pad: PitPad, x: number, z: number): number {
  const dx = x - pad.centerX, dz = z - pad.centerZ, c = Math.cos(pad.yaw), s = Math.sin(pad.yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - pad.halfX), Math.max(0, Math.abs(dx * s + dz * c) - pad.halfZ));
}

/** Frozen center heights are also the rigid building/foundation anchors. */
export function createPitPadField(placements: readonly PitPlacement[], route: readonly RoutePoint[],
  branches: readonly { points: readonly RoutePoint[] }[], ungradedHeightAt: (x: number, z: number) => number): PitPadField {
  const segments = segmentsFor(route, branches);
  const nearby = protectionBuckets(segments);
  const pads = placements.filter(p => p.family === 'pit-complex').map(p => {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), anchorHeight = ungradedHeightAt(p.x, p.z);
    const pad: PitPad = { id: p.id, x: p.x, z: p.z, yaw: p.yaw, anchorHeight,
      // Leave 0.55 m beneath the fixed slab bottom for the existing 1.5/6 m
      // rendered triangle interpolation as well as the 1 m physical field.
      targetHeight: anchorHeight + .9,
      centerX: p.x + 4 * p.sx * c - 2.25 * p.sz * s,
      centerZ: p.z - 4 * p.sx * s - 2.25 * p.sz * c,
      halfX: 75 * p.sx, halfZ: 30.25 * p.sz, minRoadClearance: Infinity, accepted: true };
    // Dense source perimeter; the half-metre reserve covers its sampling interval.
    let minimum = Infinity;
    for (let i = 0; i <= Math.ceil(pad.halfX * 2); i++) for (const side of [-1, 1]) {
      const [x, z] = padLocalToWorld(pad, -pad.halfX + Math.min(i, pad.halfX * 2), side * pad.halfZ);
      minimum = Math.min(minimum, roadClearance(nearby(x, z), x, z));
    }
    for (let i = 0; i <= Math.ceil(pad.halfZ * 2); i++) for (const side of [-1, 1]) {
      const [x, z] = padLocalToWorld(pad, side * pad.halfX, -pad.halfZ + Math.min(i, pad.halfZ * 2));
      minimum = Math.min(minimum, roadClearance(nearby(x, z), x, z));
    }
    // A route entirely inside the source rectangle could evade perimeter-only
    // clearance checks. Refuse it independently before allocating any field.
    const roadInside = [...route, ...branches.flatMap(b => b.points)].some(point => padDistance(pad, point.x, point.z) === 0);
    const accepted = !roadInside && minimum > PIT_PAD_LANE_MARGIN + 1.15 + .5;
    return { ...pad, minRoadClearance: minimum, accepted, ...(accepted ? {} : { declineReason: 'protected-road-overlap' as const }) };
  });
  const active = pads.filter(p => p.accepted);
  if (!active.length) return new PitPadField(pads, null);
  const corners = active.flatMap(p => [-1, 1].flatMap(sx => [-1, 1].map(sz =>
    padLocalToWorld(p, sx * (p.halfX + PIT_PAD_COLLAR + PIT_PAD_APRON + 2), sz * (p.halfZ + PIT_PAD_COLLAR + PIT_PAD_APRON + 2)))));
  const minX = Math.floor(Math.min(...corners.map(p => p[0]))), minZ = Math.floor(Math.min(...corners.map(p => p[1])));
  const columns = Math.ceil(Math.max(...corners.map(p => p[0]))) - minX + 1;
  const rows = Math.ceil(Math.max(...corners.map(p => p[1]))) - minZ + 1;
  if (columns > PIT_PAD_MAX_DIMENSION || rows > PIT_PAD_MAX_DIMENSION || columns * rows > PIT_PAD_MAX_TEXELS)
    return new PitPadField(pads.map(p => p.accepted ? { ...p, accepted: false, declineReason: 'atlas-budget' } : p), null);
  const grid: PitPadGrid = { minX, minZ, columns, rows, cellSize: PIT_PAD_CELL_SIZE, values: new Float32Array(columns * rows) };
  const frames = active.map(pad => ({ pad, c: Math.cos(pad.yaw), s: Math.sin(pad.yaw) }));
  for (let row = 1; row < rows - 1; row++) for (let column = 1; column < columns - 1; column++) {
    const x = minX + column, z = minZ + row;
    let selected: PitPad | undefined, selectedDistance = 0, weight = 0;
    for (const { pad, c, s } of frames) {
      const dx = x - pad.centerX, dz = z - pad.centerZ;
      const distance = Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - pad.halfX), Math.max(0, Math.abs(dx * s + dz * c) - pad.halfZ));
      const w = 1 - smooth((distance - PIT_PAD_COLLAR) / PIT_PAD_APRON);
      if (w > weight) { selected = pad; selectedDistance = distance; weight = w; }
    }
    if (!selected || weight === 0) continue;
    const roadRoom = Math.max(0, roadClearance(nearby(x, z), x, z) - radius);
    // Use all remaining off-road distance between slab and protected shoulder.
    // A fixed two-metre fade produced almost vertical banks at the frontage.
    weight *= smooth(roadRoom / Math.max(PROTECTION_FADE, Math.min(PIT_PAD_APRON, roadRoom + selectedDistance)));
    if (weight === 0) continue;
    grid.values[row * columns + column] = (selected.targetHeight - ungradedHeightAt(x, z)) * weight;
  }
  return new PitPadField(pads, grid);
}

export class PitPadField {
  constructor(readonly pads: readonly PitPad[], readonly grid: PitPadGrid | null) {}
  sampleOffset(x: number, z: number): number {
    const g = this.grid; if (!g) return 0;
    const gx = (x - g.minX) / g.cellSize, gz = (z - g.minZ) / g.cellSize;
    if (!(gx >= 0 && gz >= 0 && gx < g.columns - 1 && gz < g.rows - 1)) return 0;
    const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, i = iz * g.columns + ix;
    const a = g.values[i]!, b = g.values[i + 1]!, c = g.values[i + g.columns]!, d = g.values[i + g.columns + 1]!;
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  }
  anchorHeight(id: string): number | undefined { return this.pads.find(p => p.id === id)?.anchorHeight; }
}

/** Add this result after the unchanged signed combination of the two gulf grids. */
export const PIT_PAD_GLSL = /* glsl */ `
uniform sampler2D uPitPad;
uniform vec4 uPitPadBounds; // minX, minZ, columns, rows; cell size is exactly one metre
float pitPadOffset(vec2 worldXZ) {
  if (uPitPadBounds.z < 2.0) return 0.0;
  vec2 grid = worldXZ - uPitPadBounds.xy;
  if (any(lessThan(grid, vec2(0.0))) || any(greaterThanEqual(grid, uPitPadBounds.zw - 1.0))) return 0.0;
  ivec2 cell = ivec2(floor(grid)); vec2 f = fract(grid);
  float a = texelFetch(uPitPad, cell, 0).r;
  float b = texelFetch(uPitPad, cell + ivec2(1, 0), 0).r;
  float c = texelFetch(uPitPad, cell + ivec2(0, 1), 0).r;
  float d = texelFetch(uPitPad, cell + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;
