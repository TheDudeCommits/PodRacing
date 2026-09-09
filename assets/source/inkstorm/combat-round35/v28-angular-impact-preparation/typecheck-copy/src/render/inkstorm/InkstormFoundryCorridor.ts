import type { PodraceCourse } from '../../game/race/course';
import type { InkstormPlacement } from '../../game/race/inkstormLayout';
import { groundInkstormButtress } from './InkstormRockGrounding';

type Point = readonly [number, number, number];
type Family = 'canyon-buttress' | 'cliff-strata' | 'mesa-crown';
export interface FoundryCorridorSource {
  readonly min: Point;
  readonly max: Point;
  readonly highTriangles: number;
  readonly lowTriangles: number;
  readonly lowFamily: string;
}

/** Bounds include every baked scene vertex; tests reopen both shipped LODs. */
export const FOUNDRY_CORRIDOR_SOURCES: Readonly<Record<Family, FoundryCorridorSource>> = {
  'canyon-buttress': { min: [-40, 0, -50], max: [40, 120, 50],
    highTriangles: 28_000, lowTriangles: 4_200, lowFamily: 'canyon-buttress-lod' },
  'cliff-strata': { min: [-36.51308059692383, -2, -28.8538875579834],
    max: [37.07428741455078, 111.13047790527344, 23.516141891479492],
    highTriangles: 664, lowTriangles: 664, lowFamily: 'cliff-strata' },
  'mesa-crown': { min: [-71.69628143310547, -2, -60.30181121826172],
    max: [71.615478515625, 77.82073211669922, 47.50540542602539],
    highTriangles: 664, lowTriangles: 664, lowFamily: 'mesa-crown' },
};

export const FOUNDRY_CORRIDOR_CLEARANCE = Object.freeze({
  mainSamples: 4096,
  // Current procedural solid envelope reaches 10.47204 m. The older 9.6 m
  // arch-study allowance is insufficient for these current visual bodies.
  vehicleHalfWidth: 10.5,
  safety: 7,
  maximumGroundStretch: 1.75,
});
export interface FoundryCorridorLandform extends InkstormPlacement {
  family: Family;
  depthLayer: 'near' | 'middle' | 'far';
  /** Coordinates in the focal Foundry course frame, not a camera frame. */
  forward: number;
  right: number;
  /** Final render transform. Do not ground a second time during integration. */
  baseY: number;
  scaleY: number;
  source: FoundryCorridorSource;
  worldBounds: { min: Point; max: Point };
  /** Remaining separation AFTER full lane, widest craft and interval allowance. */
  minimumSafety: number;
  closestRoute: string;
}
export interface FoundryCorridorPlan {
  landforms: FoundryCorridorLandform[];
  rejected: { id: string; reason: 'lane-clearance' | 'ground-stretch'; measured: number }[];
  mainSegments: number;
  branchSegments: number;
  highTriangles: number;
  lowTriangles: number;
}

// Deliberate, unequal volumes around three real turns. The foundry is a folded
// route, so there is no straight wall, central endcap, or route-facing scatter.
// Detailed shoulders cost 168k triangles; four low-cost distant silhouettes
// add 2,656. All families already have shared World batches/materials.
const FORMS = [
  { id: 'approach-outer-toe', family: 'canyon-buttress', right: -170, forward: -40, size: .92, yaw: -.45, depthLayer: 'near' },
  { id: 'first-bend-counterwall', family: 'canyon-buttress', right: 160, forward: 160, size: 1.18, yaw: .35, depthLayer: 'near' },
  { id: 'middle-upper-shoulder', family: 'canyon-buttress', right: -130, forward: 370, size: 1.26, yaw: -.78, depthLayer: 'middle' },
  { id: 'middle-lower-shoulder', family: 'canyon-buttress', right: -330, forward: 50, size: 1.1, yaw: .53, depthLayer: 'middle' },
  { id: 'exit-outer-shoulder', family: 'canyon-buttress', right: -535, forward: 300, size: 1.37, yaw: -1.02, depthLayer: 'middle' },
  { id: 'exit-inner-shoulder', family: 'canyon-buttress', right: -270, forward: 500, size: 1.18, yaw: .17, depthLayer: 'middle' },
  { id: 'exit-west-wall', family: 'cliff-strata', right: -650, forward: 700, size: 1.8, yaw: -.6, depthLayer: 'far' },
  { id: 'exit-back-mesa', family: 'mesa-crown', right: -690, forward: 180, size: 1.8, yaw: .24, depthLayer: 'far' },
  { id: 'approach-back-mesa', family: 'mesa-crown', right: -410, forward: -210, size: 1.45, yaw: -1.05, depthLayer: 'far' },
  { id: 'first-bend-back-wall', family: 'cliff-strata', right: 210, forward: 390, size: 1.7, yaw: .75, depthLayer: 'far' },
] as const;

interface LanePoint { x: number; z: number; width: number }
interface Segment { a: LanePoint; b: LanePoint; route: string; allowance: number }
function pointSegmentDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

/** Exact segment-to-rotated-box distance in X/Z, including segment interiors. */
function segmentBoxDistance(p: InkstormPlacement, source: FoundryCorridorSource, { a, b }: Segment): number {
  const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
  const ax = (a.x - p.x) * cos - (a.z - p.z) * sin;
  const az = (a.x - p.x) * sin + (a.z - p.z) * cos;
  const bx = (b.x - p.x) * cos - (b.z - p.z) * sin;
  const bz = (b.x - p.x) * sin + (b.z - p.z) * cos;
  const minX = source.min[0] * p.sx, maxX = source.max[0] * p.sx;
  const minZ = source.min[2] * p.sz, maxZ = source.max[2] * p.sz;
  let enter = 0, leave = 1;
  for (const [origin, direction, minimum, maximum] of [[ax, bx - ax, minX, maxX], [az, bz - az, minZ, maxZ]]) {
    if (Math.abs(direction!) < 1e-12) {
      if (origin! < minimum! || origin! > maximum!) { enter = 2; break; }
    } else {
      const t0 = (minimum! - origin!) / direction!, t1 = (maximum! - origin!) / direction!;
      enter = Math.max(enter, Math.min(t0, t1)); leave = Math.min(leave, Math.max(t0, t1));
    }
  }
  if (enter <= leave) return 0;
  const pointBox = (x: number, z: number): number => Math.hypot(
    Math.max(0, minX - x, x - maxX), Math.max(0, minZ - z, z - maxZ));
  return Math.min(pointBox(ax, az), pointBox(bx, bz),
    ...[minX, maxX].flatMap(x => [minZ, maxZ].map(z => pointSegmentDistance(x, z, ax, az, bx, bz))));
}

/**
 * Flagship-only render proposal. No course/layout/cache/collider writes. Root
 * integrates the final baseY/scaleY into existing World instance/LOD batches.
 * Safety is planimetric even for elevated branches, so no rock gains permission
 * to occupy a route by pretending that it is above or below the racers.
 */
export function getInkstormFoundryCorridorPlan(course: PodraceCourse, heightAt: (x: number, z: number) => number): FoundryCorridorPlan {
  const plan: FoundryCorridorPlan = { landforms: [], rejected: [], mainSegments: 0, branchSegments: 0, highTriangles: 0, lowTriangles: 0 };
  if (course.seed !== 0x494e4b53) return plan;
  const count = FOUNDRY_CORRIDOR_CLEARANCE.mainSamples;
  const points = Array.from({ length: count }, (_, i) => course.samplePlanAtProgress(i / count));
  const segments: Segment[] = points.map((a, i) => ({ a, b: points[(i + 1) % count]!, route: 'canonical',
    // Debit a full actual arc interval, plus width change, in addition to the
    // exact chord sweep. This covers curve bow between samples conservatively.
    allowance: course.totalLength / count + Math.abs(a.width - points[(i + 1) % count]!.width) }));
  plan.mainSegments = segments.length;
  for (const branch of course.branches) for (let i = 1; i < branch.points.length; i++) {
    segments.push({ a: branch.points[i - 1]!, b: branch.points[i]!, route: branch.id, allowance: 0 });
    plan.branchSegments++;
  }
  const anchor = course.samplePlanAtProgress(.53515625);
  const yaw = Math.atan2(anchor.tangentX, anchor.tangentZ);
  for (const form of FORMS) {
    const source = FOUNDRY_CORRIDOR_SOURCES[form.family];
    const p: InkstormPlacement = { id: `foundry-corridor-${form.id}`, family: form.family, progress: anchor.progress,
      x: anchor.x + anchor.rightX * form.right + anchor.tangentX * form.forward,
      z: anchor.z + anchor.rightZ * form.right + anchor.tangentZ * form.forward,
      yaw: yaw + form.yaw, sx: form.size, sy: form.size, sz: form.size };
    let minimumSafety = Infinity, closestRoute = '';
    for (const segment of segments) {
      const safety = segmentBoxDistance(p, source, segment) - Math.max(segment.a.width, segment.b.width)
        - FOUNDRY_CORRIDOR_CLEARANCE.vehicleHalfWidth - segment.allowance;
      if (safety < minimumSafety) { minimumSafety = safety; closestRoute = segment.route; }
    }
    if (minimumSafety < FOUNDRY_CORRIDOR_CLEARANCE.safety) {
      plan.rejected.push({ id: p.id, reason: 'lane-clearance', measured: minimumSafety }); continue;
    }
    const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
    const corners = [source.min[0] * p.sx, source.max[0] * p.sx].flatMap(x =>
      [source.min[2] * p.sz, source.max[2] * p.sz].map(z => [p.x + x * cos + z * sin, p.z - x * sin + z * cos] as const));
    let grounded: { baseY: number; scaleY: number };
    if (form.family === 'canyon-buttress') grounded = groundInkstormButtress(p, heightAt);
    else {
      let low = heightAt(p.x, p.z);
      for (let row = 0; row <= 8; row++) for (let column = 0; column <= 8; column++) {
        const x = (source.min[0] + (source.max[0] - source.min[0]) * column / 8) * p.sx;
        const z = (source.min[2] + (source.max[2] - source.min[2]) * row / 8) * p.sz;
        low = Math.min(low, heightAt(p.x + x * cos + z * sin, p.z - x * sin + z * cos));
      }
      const foot = low - 1.5 - 18 * p.sy;
      const crown = heightAt(p.x, p.z) - 1.5 + source.max[1] * p.sy;
      const scaleY = (crown - foot) / (source.max[1] - source.min[1]);
      grounded = { scaleY, baseY: foot - source.min[1] * scaleY };
    }
    if (!Number.isFinite(grounded.scaleY) || grounded.scaleY / p.sy > FOUNDRY_CORRIDOR_CLEARANCE.maximumGroundStretch) {
      plan.rejected.push({ id: p.id, reason: 'ground-stretch', measured: grounded.scaleY / p.sy }); continue;
    }
    plan.landforms.push({ ...p, family: form.family, ...grounded, forward: form.forward, right: form.right,
      depthLayer: form.depthLayer, source, minimumSafety, closestRoute,
      worldBounds: { min: [Math.min(...corners.map(v => v[0])), grounded.baseY + source.min[1] * grounded.scaleY, Math.min(...corners.map(v => v[1]))],
        max: [Math.max(...corners.map(v => v[0])), grounded.baseY + source.max[1] * grounded.scaleY, Math.max(...corners.map(v => v[1]))] } });
    plan.highTriangles += source.highTriangles; plan.lowTriangles += source.lowTriangles;
  }
  return plan;
}
