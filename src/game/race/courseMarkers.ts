import { groundPylonConflictsWithBridge } from './bridgeSurface';

/** Route lights sit beyond a full-width craft and a recoverable sand shoulder. */
export const COURSE_MARKER_RADIUS = 0.62;
export const COURSE_MARKER_HEIGHT = 4.9;
export const COURSE_MARKER_SHOULDER = 12;
const WIDEST_CRAFT_RADIUS = 7.8;

interface MarkerRoutePoint {
  x: number;
  y: number;
  z: number;
  width: number;
  tag?: string;
}

interface MarkerBranch {
  elevated?: boolean;
  points: readonly MarkerRoutePoint[];
}

export interface CourseMarker {
  id: string;
  x: number;
  z: number;
  minY: number;
  maxY: number;
}

/** Shared placements prevent visible lights and invisible collision posts diverging. */
export function createCourseMarkers(
  points: readonly MarkerRoutePoint[],
  branches: readonly MarkerBranch[],
  heightAt: (x: number, z: number) => number,
): CourseMarker[] {
  const markers: CourseMarker[] = [];
  const stride = Math.max(6, Math.floor(points.length / 88));
  const paths = [points, ...branches.filter(branch => !branch.elevated).map(branch => branch.points)];
  const minimumClearance = WIDEST_CRAFT_RADIUS + COURSE_MARKER_RADIUS + 2;
  for (let index = 0; index < points.length; index += stride) {
    const point = points[index], next = points[(index + 1) % points.length];
    // Solid canyon walls already define this corridor. Lights on its shoulder
    // were buried inside those walls and suggested a line the craft cannot use.
    if (!point || !next || point.tag === 'narrow-canyon') continue;
    const length = Math.hypot(next.x - point.x, next.z - point.z);
    if (length < 1e-6) continue;
    const rightX = (next.z - point.z) / length, rightZ = -(next.x - point.x) / length;
    for (const side of [-1, 1]) {
      const x = point.x + rightX * (point.width + COURSE_MARKER_SHOULDER) * side;
      const z = point.z + rightZ * (point.width + COURSE_MARKER_SHOULDER) * side;
      let clear = true;
      // Test every drivable segment, including the opposite side of a tight
      // bend and fork entries. An offset from one sample alone is not safe.
      for (let pathIndex = 0; pathIndex < paths.length && clear; pathIndex += 1) {
        const path = paths[pathIndex]!;
        const segments = pathIndex === 0 ? path.length : path.length - 1;
        for (let segment = 0; segment < segments; segment += 1) {
          const a = path[segment]!, b = path[(segment + 1) % path.length]!;
          const dx = b.x - a.x, dz = b.z - a.z;
          const fraction = Math.max(0, Math.min(1,
            ((x - a.x) * dx + (z - a.z) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
          const distance = Math.hypot(x - a.x - dx * fraction, z - a.z - dz * fraction);
          if (distance < Math.max(a.width, b.width) + minimumClearance) {
            clear = false;
            break;
          }
        }
      }
      if (!clear) continue;
      const ground = heightAt(x, z);
      if (groundPylonConflictsWithBridge(branches, x, z, ground)) continue;
      markers.push({ id: `pylon-${index}-${side > 0 ? 'r' : 'l'}`, x, z,
        minY: ground - 0.2, maxY: ground + COURSE_MARKER_HEIGHT });
    }
  }
  return markers;
}
