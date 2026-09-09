import type { HeightSampler } from '../simulation/types';
import type { CourseBranchDefinition, CourseBranchPoint } from './types';

export const INKSTORM_BRIDGE_SEED = 0x494e4b53;
export const INKSTORM_BRIDGE_RISE = 24;

export interface BridgeSurfaceSample {
  height: number;
  branchId: string;
  routeProgress: number;
  canonicalProgress: number;
  lateralOffset: number;
  width: number;
  tangentX: number;
  tangentZ: number;
  grade: number;
}

interface BridgeSegment {
  branchId: string;
  point: CourseBranchPoint;
  next: CourseBranchPoint;
  dx: number;
  dz: number;
  length: number;
  lengthSquared: number;
  first: boolean;
  last: boolean;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Branch arrays are immutable course data. The cache avoids building lookup
// geometry inside the six suspension probes of every racer on every tick.
const compiled = new WeakMap<readonly CourseBranchDefinition[], readonly BridgeSegment[]>();

function segmentsFor(branches: readonly CourseBranchDefinition[]): readonly BridgeSegment[] {
  const cached = compiled.get(branches);
  if (cached) return cached;
  const segments: BridgeSegment[] = [];
  for (const branch of branches) {
    if (!branch.elevated) continue;
    for (let index = 0; index < branch.points.length - 1; index += 1) {
      const point = branch.points[index]!;
      const next = branch.points[index + 1]!;
      const dx = next.x - point.x, dz = next.z - point.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1e-9) continue;
      const width = Math.max(point.width, next.width);
      segments.push({ branchId: branch.id, point, next, dx, dz,
        length: Math.sqrt(lengthSquared), lengthSquared,
        first: index === 0, last: index === branch.points.length - 2,
        minX: Math.min(point.x, next.x) - width, maxX: Math.max(point.x, next.x) + width,
        minZ: Math.min(point.z, next.z) - width, maxZ: Math.max(point.z, next.z) + width });
    }
  }
  compiled.set(branches, segments);
  return segments;
}

/** Exact piecewise planar deck height. Null means there is no deck at x/z. */
export function sampleBridgeSurface(
  branches: readonly CourseBranchDefinition[],
  x: number,
  z: number,
): BridgeSurfaceSample | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  let nearest: BridgeSegment | null = null;
  let nearestFraction = 0;
  let nearestSquared = Number.POSITIVE_INFINITY;
  for (const segment of segmentsFor(branches)) {
    if (x < segment.minX || x > segment.maxX || z < segment.minZ || z > segment.maxZ) continue;
    const raw = ((x - segment.point.x) * segment.dx + (z - segment.point.z) * segment.dz) / segment.lengthSquared;
    // Flat end planes meet the terrain; no rounded cap extends a raised
    // height behind the entry or beyond the exit.
    if ((segment.first && raw < 0) || (segment.last && raw > 1)) continue;
    const fraction = Math.max(0, Math.min(1, raw));
    const offsetX = x - segment.point.x - segment.dx * fraction;
    const offsetZ = z - segment.point.z - segment.dz * fraction;
    const squared = offsetX * offsetX + offsetZ * offsetZ;
    const width = segment.point.width + (segment.next.width - segment.point.width) * fraction;
    if (squared > width * width || squared >= nearestSquared) continue;
    nearest = segment;
    nearestFraction = fraction;
    nearestSquared = squared;
  }
  if (!nearest) return null;
  const { point, next, length, dx, dz } = nearest;
  const fraction = nearestFraction;
  return {
    height: point.y + (next.y - point.y) * fraction,
    branchId: nearest.branchId,
    routeProgress: point.routeProgress + (next.routeProgress - point.routeProgress) * fraction,
    canonicalProgress: point.canonicalProgress + (next.canonicalProgress - point.canonicalProgress) * fraction,
    lateralOffset: ((x - point.x) * dz - (z - point.z) * dx) / length,
    width: point.width + (next.width - point.width) * fraction,
    tangentX: dx / length,
    tangentZ: dz / length,
    grade: (next.y - point.y) / length,
  };
}

/** Ground collision/hover support; analytic terrain remains untouched elsewhere. */
export function createBridgeHeightSampler(
  base: HeightSampler,
  branches: readonly CourseBranchDefinition[],
): HeightSampler {
  if (!branches.some((branch) => branch.elevated)) return base;
  segmentsFor(branches);
  return {
    heightAt(x, z) {
      const ground = base.heightAt(x, z);
      const deck = sampleBridgeSurface(branches, x, z);
      // Buried ramp margins remain ordinary ground. This does not carve or
      // deform the analytic desert beneath the structure.
      return deck ? Math.max(ground, deck.height) : ground;
    },
  };
}

/** Shared render/collision exclusion for a ground marker occupying a low ramp.
 * The widest stock craft has radius 7.8 m; the pylon adds 1.15 m. A 2.8 m
 * craft vertical half-extent and 9.9 m marker top match RaceSimulation.
 * High decks leave the ground marker underneath them intact.
 */
export function groundPylonConflictsWithBridge(
  branches: readonly { elevated?: boolean; points: readonly Pick<CourseBranchPoint, 'x' | 'y' | 'z' | 'width'>[] }[],
  x: number,
  z: number,
  baseGroundHeight: number,
): boolean {
  const footprintMargin = 7.8 + 1.15;
  for (const branch of branches) {
    if (!branch.elevated) continue;
    for (let index = 0; index < branch.points.length - 1; index += 1) {
      const point = branch.points[index]!, next = branch.points[index + 1]!;
      const dx = next.x - point.x, dz = next.z - point.z;
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1e-9) continue;
      const fraction = Math.max(0, Math.min(1,
        ((x - point.x) * dx + (z - point.z) * dz) / lengthSquared));
      const offsetX = x - point.x - dx * fraction;
      const offsetZ = z - point.z - dz * fraction;
      const width = point.width + (next.width - point.width) * fraction;
      if (offsetX * offsetX + offsetZ * offsetZ > (width + footprintMargin) ** 2) continue;
      const deckHeight = point.y + (next.y - point.y) * fraction;
      if (deckHeight - 2.8 <= baseGroundHeight + 9.9) return true;
    }
  }
  return false;
}
