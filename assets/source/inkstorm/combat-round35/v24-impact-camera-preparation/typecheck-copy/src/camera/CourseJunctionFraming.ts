import type { PodraceCourse } from '../game/race/course';

interface Point3 { x: number; y: number; z: number; }
interface Junction { entryDistance: number; points: readonly Point3[]; }
const junctionCache = new WeakMap<PodraceCourse, readonly Junction[]>();
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const smooth = (value: number, low: number, high: number) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};

function getJunctions(course: PodraceCourse): readonly Junction[] {
  const cached = junctionCache.get(course);
  if (cached) return cached;
  const junctions = course.branches.filter(branch => branch.elevated).map(branch => {
    const entryDistance = branch.entryProgress * course.totalLength;
    const points: Point3[] = [];
    // Include both lane edges at several useful decision distances. A single
    // distant island midpoint over-rotated the chase view toward the bridge.
    for (const ahead of [65, 115, 180, 250]) {
      const progress = Math.min(branch.exitProgress, branch.entryProgress + ahead / course.totalLength);
      const main = course.sampleAtProgress(progress);
      let index = 0;
      while (index < branch.points.length - 2 && branch.points[index + 1]!.canonicalProgress < progress) index++;
      const a = branch.points[index]!, b = branch.points[index + 1]!;
      const t = clamp((progress - a.canonicalProgress) / (b.canonicalProgress - a.canonicalProgress), 0, 1);
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const width = a.width + (b.width - a.width) * t;
      for (const side of [-1, 1]) {
        points.push({ x: main.x + main.rightX * main.width * side, y: main.y,
          z: main.z + main.rightZ * main.width * side });
        points.push({ x: a.x + dx * t + dz / length * width * side,
          y: a.y + (b.y - a.y) * t, z: a.z + dz * t - dx / length * width * side });
      }
    }
    return { entryDistance, points };
  });
  junctionCache.set(course, junctions);
  return junctions;
}

/**
 * Live framing only. Writes into the caller's reusable vector and returns its
 * influence; never changes a racer, route, terrain height or camera capture mode.
 * The angular envelope includes actual edges of both paths, not a scenery prop.
 */
export function updateCourseJunctionFraming(
  course: PodraceCourse, progress: number, position: Readonly<Point3>,
  forward: Readonly<Pick<Point3, 'x' | 'z'>>, output: Point3,
): number {
  for (const junction of getJunctions(course)) {
    let approach = progress * course.totalLength - junction.entryDistance;
    if (approach > course.totalLength * .5) approach -= course.totalLength;
    if (approach < -course.totalLength * .5) approach += course.totalLength;
    if (approach <= -180 || approach >= 150) continue;
    let minimum = Infinity, maximum = -Infinity, height = 0, count = 0;
    for (const point of junction.points) {
      const dx = point.x - position.x, dz = point.z - position.z;
      const along = dx * forward.x + dz * forward.z;
      // Samples behind a chosen path must not pull the camera back across it.
      if (along < 18) continue;
      const angle = Math.atan2(dx * forward.z - dz * forward.x, along);
      minimum = Math.min(minimum, angle); maximum = Math.max(maximum, angle);
      height += point.y; count++;
    }
    if (!count) continue;
    const angle = (minimum + maximum) * .5, cos = Math.cos(angle), sin = Math.sin(angle);
    output.x = position.x + (forward.x * cos + forward.z * sin) * 160;
    output.y = height / count;
    output.z = position.z + (forward.z * cos - forward.x * sin) * 160;
    return smooth(approach, -180, -40) * (1 - smooth(approach, 20, 150));
  }
  return 0;
}
