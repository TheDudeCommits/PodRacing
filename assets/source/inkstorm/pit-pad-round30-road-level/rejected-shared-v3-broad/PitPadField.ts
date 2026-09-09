/** Staged round30 road-front anchor candidate. No runtime integration or acceptance. */
export interface PitPlacement { readonly id: string; readonly family: string; readonly x: number; readonly z: number; readonly yaw: number; readonly sx: number; readonly sz: number }
export interface RoutePoint { readonly x: number; readonly z: number; readonly width: number }
export interface PitPad {
  readonly id: string; readonly family: string; readonly slabBottomOffset: number; readonly x: number; readonly z: number; readonly yaw: number;
  readonly anchorHeight: number; readonly targetHeight: number;
  readonly centerX: number; readonly centerZ: number; readonly halfX: number; readonly halfZ: number;
  readonly minRoadClearance: number; readonly accepted: boolean;
  readonly originalAnchorHeight: number; readonly floorHeight: number; readonly floorOffset: number;
  readonly requestedFloorHeight: number; readonly protectedFloorLift: number;
  readonly sharedCourt?: { id: string; floorHeight: number; priorFloorHeight: number; endpointGradeBound: number;
    contacts: readonly { padId: string; localX: number; out: number; height: number }[] };
  readonly frontage: readonly { localX: number; out: number; x: number; z: number; height: number; roadClearance: number }[];
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
const SIDE_APRON = 32, BACK_APRON = 48, FRONT_APRON = 16;
const FRONTAGE_CONTACT_CLEARANCE = 13.5;

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

/** Floor anchors come from protected road-facing ground, never a graded center. */
export function createPitPadField(placements: readonly PitPlacement[], route: readonly RoutePoint[],
  branches: readonly { points: readonly RoutePoint[] }[], ungradedHeightAt: (x: number, z: number) => number): PitPadField {
  const segments = segmentsFor(route, branches);
  const nearby = protectionBuckets(segments);
  let pads: PitPad[] = placements.filter(p => p.family === 'pit-complex' || p.family === 'pit-district').map(p => {
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), originalAnchorHeight = ungradedHeightAt(p.x, p.z);
    const district = p.family === 'pit-district', floorOffset = district ? 1.5 : 2.45;
    const pad: PitPad = { id: p.id, family: p.family, slabBottomOffset: district ? 1.55 : 1.45, x: p.x, z: p.z, yaw: p.yaw,
      anchorHeight: originalAnchorHeight, originalAnchorHeight, floorHeight: originalAnchorHeight + floorOffset, requestedFloorHeight: originalAnchorHeight + floorOffset,
      protectedFloorLift: 0, floorOffset, frontage: [],
      // Leave 0.55 m beneath the fixed slab bottom for the existing 1.5/6 m
      // rendered triangle interpolation as well as the 1 m physical field.
      targetHeight: originalAnchorHeight + .9,
      centerX: district ? p.x : p.x + 4 * p.sx * c - 2.25 * p.sz * s,
      centerZ: district ? p.z : p.z - 4 * p.sx * s - 2.25 * p.sz * c,
      halfX: (district ? 60 : 75) * p.sx, halfZ: (district ? 18 : 30.25) * p.sz, minRoadClearance: Infinity, accepted: true };
    // Dense source perimeter; the half-metre reserve covers its sampling interval.
    let minimum = Infinity, protectedAnchorMinimum = -Infinity;
    const constrainCore = (x: number, z: number) => {
      const clearance = roadClearance(nearby(x, z), x, z);
      minimum = Math.min(minimum, clearance);
      const w = smooth((clearance - radius) / PROTECTION_FADE);
      if (w < .995) protectedAnchorMinimum = Math.max(protectedAnchorMinimum,
        ungradedHeightAt(x, z) - ((pad.slabBottomOffset - .3) - .9 * w) / (1 - w));
    };
    for (let i = 0; i <= Math.ceil(pad.halfX * 2); i++) for (const side of [-1, 1]) {
      const [x, z] = padLocalToWorld(pad, -pad.halfX + Math.min(i, pad.halfX * 2), side * pad.halfZ);
      constrainCore(x, z);
    }
    for (let i = 0; i <= Math.ceil(pad.halfZ * 2); i++) for (const side of [-1, 1]) {
      const [x, z] = padLocalToWorld(pad, side * pad.halfX, -pad.halfZ + Math.min(i, pad.halfZ * 2));
      constrainCore(x, z);
    }
    // A route entirely inside the source rectangle could evade perimeter-only
    // clearance checks. Refuse it independently before allocating any field.
    const roadInside = [...route, ...branches.flatMap(b => b.points)].some(point => padDistance(pad, point.x, point.z) === 0);
    const accepted = !roadInside && minimum > PIT_PAD_LANE_MARGIN + 1.15 + .5;
    if (!accepted) return { ...pad, minRoadClearance: minimum, accepted, declineReason: 'protected-road-overlap' as const };
    const frontage: PitPad['frontage'][number][] = [];
    const entranceX = district ? -2 * p.sx : -9 * p.sx;
    for (const across of [-4, -2, 0, 2, 4]) {
      const localX = entranceX + across;
      let previousOut = 0;
      for (let out = .5; out <= 48; out += .5) {
        const [x, z] = padLocalToWorld(pad, localX, pad.halfZ + out);
        if (roadClearance(nearby(x, z), x, z) <= FRONTAGE_CONTACT_CLEARANCE) {
          let lo = previousOut, hi = out;
          for (let iteration = 0; iteration < 16; iteration++) {
            const middle = (lo + hi) * .5, [mx, mz] = padLocalToWorld(pad, localX, pad.halfZ + middle);
            if (roadClearance(nearby(mx, mz), mx, mz) > FRONTAGE_CONTACT_CLEARANCE) lo = middle; else hi = middle;
          }
          const contactOut = (lo + hi) * .5, [cx, cz] = padLocalToWorld(pad, localX, pad.halfZ + contactOut);
          frontage.push({ localX, out: contactOut, x: cx, z: cz, height: ungradedHeightAt(cx, cz), roadClearance: roadClearance(nearby(cx, cz), cx, cz) });
          break;
        }
        previousOut = out;
      }
    }
    if (frontage.length !== 5) return { ...pad, minRoadClearance: minimum, accepted: false, declineReason: 'protected-road-overlap' as const };
    const heights = frontage.map(f => f.height).sort((a, b) => a - b), requestedFloorHeight = heights[2]! + .15;
    const anchorHeight = Math.max(requestedFloorHeight - floorOffset, protectedAnchorMinimum), floorHeight = anchorHeight + floorOffset;
    return { ...pad, minRoadClearance: minimum, accepted, frontage, requestedFloorHeight, protectedFloorLift: floorHeight - requestedFloorHeight,
      floorHeight, anchorHeight, targetHeight: anchorHeight + .9 };
  });
  // Bounded V3 art trial: only the measured overlapping flagship pair. The
  // original layout identities, horizontal transforms and nonflagship fields
  // are unchanged. This explicit group is not a general procedural policy.
  const groupIds = ['inkstorm-pit-complex-216', 'inkstorm-pit-district-218'];
  const group = pads.filter(p => p.accepted && groupIds.includes(p.id));
  if (group.length === 2) {
    const contacts: { padId: string; localX: number; out: number; height: number }[] = group.flatMap(pad =>
      pad.frontage.map(f => ({ padId: pad.id, localX: f.localX, out: f.out, height: f.height })));
    for (const pad of group) {
      const bayXs = pad.family === 'pit-complex' ? [-51, 35] : [-39, 38].map(x => x * pad.halfX / 60);
      for (const localX of bayXs) {
        let previousOut = 0;
        for (let out = .5; out <= 48; out += .5) {
          const [x, z] = padLocalToWorld(pad, localX, pad.halfZ + out);
          if (roadClearance(nearby(x, z), x, z) <= FRONTAGE_CONTACT_CLEARANCE) {
            let lo = previousOut, hi = out;
            for (let i = 0; i < 16; i++) {
              const m = (lo + hi) * .5, [mx, mz] = padLocalToWorld(pad, localX, pad.halfZ + m);
              if (roadClearance(nearby(mx, mz), mx, mz) > FRONTAGE_CONTACT_CLEARANCE) lo = m; else hi = m;
            }
            const distance = (lo + hi) * .5, [cx, cz] = padLocalToWorld(pad, localX, pad.halfZ + distance);
            contacts.push({ padId: pad.id, localX, out: distance, height: ungradedHeightAt(cx, cz) });
            break;
          }
          previousOut = out;
        }
      }
    }
    // Minimize the largest |floor-ground| / available frontage run. A common
    // walking plane uses different rigid anchors because pit and district
    // top offsets are 2.45 m and 1.5 m respectively.
    const protectedMinimum = Math.max(...group.filter(p => p.protectedFloorLift > 1e-8).map(p => p.floorHeight), -Infinity);
    let loGrade = 0, hiGrade = 8;
    for (let i = 0; i < 48; i++) {
      const grade = (loGrade + hiGrade) * .5;
      const lower = Math.max(protectedMinimum, ...contacts.map(f => f.height - grade * f.out));
      const upper = Math.min(...contacts.map(f => f.height + grade * f.out));
      if (lower <= upper) hiGrade = grade; else loGrade = grade;
    }
    const lower = Math.max(protectedMinimum, ...contacts.map(f => f.height - hiGrade * f.out));
    const upper = Math.min(...contacts.map(f => f.height + hiGrade * f.out)), floorHeight = (lower + upper) * .5;
    pads = pads.map(pad => {
      if (!groupIds.includes(pad.id)) return pad;
      const anchorHeight = floorHeight - pad.floorOffset;
      return { ...pad, floorHeight, anchorHeight, targetHeight: anchorHeight + .9,
        sharedCourt: { id: 'flagship-pit216-district218', floorHeight, priorFloorHeight: pad.floorHeight, endpointGradeBound: hiGrade, contacts } };
    });
  }
  const active = pads.filter(p => p.accepted);
  if (!active.length) return new PitPadField(pads, null);
  const corners = active.flatMap(p => [-1, 1].flatMap(sx => [
    padLocalToWorld(p, sx * (p.halfX + PIT_PAD_COLLAR + SIDE_APRON + 2), -p.halfZ - PIT_PAD_COLLAR - BACK_APRON - 2),
    padLocalToWorld(p, sx * (p.halfX + PIT_PAD_COLLAR + SIDE_APRON + 2), p.halfZ + PIT_PAD_COLLAR + FRONT_APRON + 2)]));
  const minX = Math.floor(Math.min(...corners.map(p => p[0]))), minZ = Math.floor(Math.min(...corners.map(p => p[1])));
  const columns = Math.ceil(Math.max(...corners.map(p => p[0]))) - minX + 1;
  const rows = Math.ceil(Math.max(...corners.map(p => p[1]))) - minZ + 1;
  if (columns > PIT_PAD_MAX_DIMENSION || rows > PIT_PAD_MAX_DIMENSION || columns * rows > PIT_PAD_MAX_TEXELS)
    return new PitPadField(pads.map(p => p.accepted ? { ...p, anchorHeight: p.originalAnchorHeight, floorHeight: p.originalAnchorHeight + p.floorOffset,
      targetHeight: p.originalAnchorHeight + .9, accepted: false, declineReason: 'atlas-budget' } : p), null);
  const grid: PitPadGrid = { minX, minZ, columns, rows, cellSize: PIT_PAD_CELL_SIZE, values: new Float32Array(columns * rows) };
  const frames = active.map(pad => ({ pad, c: Math.cos(pad.yaw), s: Math.sin(pad.yaw) }));
  for (let row = 1; row < rows - 1; row++) for (let column = 1; column < columns - 1; column++) {
    const x = minX + column, z = minZ + row;
    let weight = 0, targetSum = 0, targetWeight = 0, selectedDistance = Infinity;
    for (const { pad, c, s } of frames) {
      const dx = x - pad.centerX, dz = z - pad.centerZ;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const distance = Math.hypot(Math.max(0, Math.abs(lx) - pad.halfX), Math.max(0, Math.abs(lz) - pad.halfZ));
      const nx = Math.max(0, Math.abs(lx) - pad.halfX - PIT_PAD_COLLAR) / SIDE_APRON;
      const nz = Math.max(0, Math.abs(lz) - pad.halfZ - PIT_PAD_COLLAR) / (lz < 0 ? BACK_APRON : FRONT_APRON);
      const w = 1 - smooth(Math.hypot(nx, nz));
      if (w > 0) { weight = Math.max(weight, w); selectedDistance = Math.min(selectedDistance, distance); targetSum += w ** 4 * pad.targetHeight; targetWeight += w ** 4; }
    }
    if (weight === 0) continue;
    const roadRoom = Math.max(0, roadClearance(nearby(x, z), x, z) - radius);
    // Use the available frontage to spread the shared court's remaining cut.
    // The zero-field road band is unchanged; indexed clearance remains a
    // measured gate rather than an assumed result of the shared floor.
    const roadWeight = smooth(roadRoom / Math.max(PROTECTION_FADE, Math.min(PIT_PAD_APRON, roadRoom + selectedDistance)));
    if (roadWeight === 0) continue;
    const base = ungradedHeightAt(x, z);
    let offset = (targetSum / targetWeight - base) * weight;
    // New simultaneous ceilings replace the old pit-only freeze. A neighbor
    // cannot push terrain above a newly lowered slab, regardless of family.
    // Any remaining low strip or protected-edge intrusion is reported by the
    // study; this is not a guarantee of indexed terrain-mesh clearance.
    for (const pad of active) {
      const distance = padDistance(pad, x, z); if (distance >= 24) continue;
      const ceiling = pad.targetHeight - base;
      if (offset > ceiling) offset += (ceiling - offset) * (1 - smooth((distance - 8) / 16));
    }
    grid.values[row * columns + column] = offset * roadWeight;
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
