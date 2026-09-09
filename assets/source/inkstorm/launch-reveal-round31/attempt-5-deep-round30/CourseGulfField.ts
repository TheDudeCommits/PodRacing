import type { PodraceCourse } from './course';
import type { CourseSample } from './types';
import { LAUNCH_LANDSCAPE_BOUNDS, launchRidgeSurface } from './LaunchBasinPlan';

/** Authored flagship terrain: off-road gulfs plus a driveable launch descent. */
export const COURSE_GULF_SEED = 0x494e4b53;
export const COURSE_GULF_CELL_SIZE = 6;
export const COURSE_GULF_SIZE = 257;
export const COURSE_GULF_MAX_DEPTH = 170;
export const COURSE_GULF_MAX_RISE = 250;
export const COURSE_GULF_LANE_MARGIN = 10;
// A bilinear footprint can reach a full cell diagonal from a protected sample.
// Physics (.85m) and MRT (1.15m) normal probes plus dense spline error fit inside
// the extra four metres. Beauty lighting intentionally averages over 9.5–48m.
export const COURSE_GULF_FILTER_MARGIN = Math.SQRT2 * COURSE_GULF_CELL_SIZE + 4;
const SHOULDER_FADE = 64;
export const FINISH_GULF_SHOULDER_FADE = 22;
const BUCKET_SIZE = 128;

export interface CourseGulfGrid {
  readonly name: 'launch' | 'finish';
  readonly minX: number;
  readonly minZ: number;
  readonly cellSize: number;
  readonly size: number;
  readonly values: Float32Array;
  readonly centerX: number;
  readonly centerZ: number;
  readonly depth: number;
}

export interface LaunchElevationProfile {
  readonly startDistance: number;
  readonly crestDistance: number;
  readonly floorDistance: number;
  readonly basinEndDistance: number;
  readonly endDistance: number;
  readonly crestHeight: number;
  readonly floorHeight: number;
  readonly endHeight: number;
  readonly fullWidth: number;
  readonly fadeWidth: number;
}

/** The same four R32F texels and bilinear interpolation are used by GLSL. */
export function sampleCourseGulfGrid(grid: CourseGulfGrid, x: number, z: number): number {
  const gx = (x - grid.minX) / grid.cellSize;
  const gz = (z - grid.minZ) / grid.cellSize;
  if (!(gx >= 0 && gz >= 0 && gx < grid.size - 1 && gz < grid.size - 1)) return 0;
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const fx = gx - ix, fz = gz - iz, i = iz * grid.size + ix;
  const a = grid.values[i]!, b = grid.values[i + 1]!;
  const c = grid.values[i + grid.size]!, d = grid.values[i + grid.size + 1]!;
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

/**
 * Preserve the previous minimum of negative cuts; allow a positive landform
 * when the other field is zero. Opposed signed fields combine continuously,
 * avoiding a discontinuous step at the boundary of an overlapping depression.
 * Keep this expression identical to combineCourseGulfOffsets in the GLSL chunk.
 */
export function combineCourseGulfOffsets(a: number, b: number): number {
  return Math.min(a, b, 0) + Math.max(a, b, 0);
}

export class CourseGulfField {
  constructor(readonly grids: readonly [CourseGulfGrid, CourseGulfGrid], readonly launchProfile: LaunchElevationProfile) {}

  /** Allocation-free signed displacement, bounded even if fields overlap. */
  sampleOffset(x: number, z: number): number {
    return combineCourseGulfOffsets(sampleCourseGulfGrid(this.grids[0], x, z), sampleCourseGulfGrid(this.grids[1], x, z));
  }
}

interface Segment { ax: number; az: number; dx: number; dz: number; lengthSq: number; radius: number }
interface Point { x: number; z: number; width: number }
interface ProfileSegment extends Segment { distance: number; span: number }

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** Target is an actual surface elevation; the transition never raises terrain. */
export function launchProfileOffset(profile: LaunchElevationProfile, distance: number, baseHeight: number): number {
  if (distance <= profile.startDistance || distance >= profile.endDistance) return 0;
  if (distance < profile.crestDistance) {
    return Math.min(0, profile.crestHeight - baseHeight)
      * smoother((distance - profile.startDistance) / (profile.crestDistance - profile.startDistance));
  }
  if (distance < profile.floorDistance) {
    // Round the first 30m into an early, concave descent. The former
    // zero-grade 600m smoothstep hid the bowl behind its convex shoulder.
    const span = profile.floorDistance - profile.crestDistance;
    const u = distance - profile.crestDistance, round = Math.min(30, span * .2);
    const descent = u < round ? u * u / (round * span)
      : (round + 2 * (u - round) - (u - round) ** 2 / (span - round)) / span;
    return Math.min(0, profile.crestHeight + (profile.floorHeight - profile.crestHeight) * descent - baseHeight);
  }
  if (distance < profile.basinEndDistance) return Math.min(0, profile.floorHeight - baseHeight);
  const climb = smoothstep((distance - profile.basinEndDistance) / (profile.endDistance - profile.basinEndDistance));
  const target = profile.floorHeight + (profile.endHeight - profile.floorHeight) * climb;
  // Blend back to the original dune surface only near the end of the climb;
  // mixing every original hump into a 700m climb would create sharp grades.
  const exitBlend = smoothstep((distance - (profile.endDistance - 160)) / 160);
  return Math.min(0, target - baseHeight) * (1 - exitBlend);
}

function makeProfileBuckets(points: readonly CourseSample[], reach: number): Map<string, ProfileSegment[]> {
  const buckets = new Map<string, ProfileSegment[]>();
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!, b = points[i + 1]!;
    const segment: ProfileSegment = { ax: a.x, az: a.z, dx: b.x - a.x, dz: b.z - a.z,
      lengthSq: (b.x - a.x) ** 2 + (b.z - a.z) ** 2, radius: 0, distance: a.distance, span: b.distance - a.distance };
    const minX = Math.floor((Math.min(a.x, b.x) - reach) / BUCKET_SIZE);
    const maxX = Math.floor((Math.max(a.x, b.x) + reach) / BUCKET_SIZE);
    const minZ = Math.floor((Math.min(a.z, b.z) - reach) / BUCKET_SIZE);
    const maxZ = Math.floor((Math.max(a.z, b.z) + reach) / BUCKET_SIZE);
    for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
      const key = `${x}:${z}`, entries = buckets.get(key);
      if (entries) entries.push(segment); else buckets.set(key, [segment]);
    }
  }
  return buckets;
}

function bakeLaunchProfile(grid: CourseGulfGrid, course: PodraceCourse, points: readonly CourseSample[], profile: LaunchElevationProfile): void {
  const buckets = makeProfileBuckets(points, profile.fadeWidth);
  for (let row = 1; row < grid.size - 1; row += 1) {
    const z = grid.minZ + row * grid.cellSize;
    for (let column = 1; column < grid.size - 1; column += 1) {
      const x = grid.minX + column * grid.cellSize;
      const candidates = buckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
      if (!candidates) continue;
      let nearestSq = profile.fadeWidth ** 2, distance = -1;
      for (const segment of candidates) {
        const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
        const distanceSq = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
        if (distanceSq < nearestSq) { nearestSq = distanceSq; distance = segment.distance + segment.span * t; }
      }
      if (distance <= profile.startDistance || distance >= profile.endDistance) continue;
      const blend = 1 - smoother((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth));
      const offset = launchProfileOffset(profile, distance, course.heightAt(x, z)) * blend;
      const index = row * grid.size + column;
      grid.values[index] = Math.min(grid.values[index]!, offset);
    }
  }
}

function smoother(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function makeProtection(points: readonly Point[], branches: readonly { points: readonly Point[] }[], laneMargin = COURSE_GULF_LANE_MARGIN, filterMargin = COURSE_GULF_FILTER_MARGIN): Map<string, Segment[]> {
  const buckets = new Map<string, Segment[]>();
  const addRoute = (route: readonly Point[], closed: boolean): void => {
    for (let i = 0; i < route.length - (closed ? 0 : 1); i += 1) {
      const a = route[i]!, b = route[(i + 1) % route.length]!;
      const radius = Math.max(a.width, b.width) + laneMargin + filterMargin;
      const segment = { ax: a.x, az: a.z, dx: b.x - a.x, dz: b.z - a.z,
        lengthSq: (b.x - a.x) ** 2 + (b.z - a.z) ** 2, radius };
      const reach = radius + SHOULDER_FADE;
      const minX = Math.floor((Math.min(a.x, b.x) - reach) / BUCKET_SIZE);
      const maxX = Math.floor((Math.max(a.x, b.x) + reach) / BUCKET_SIZE);
      const minZ = Math.floor((Math.min(a.z, b.z) - reach) / BUCKET_SIZE);
      const maxZ = Math.floor((Math.max(a.z, b.z) + reach) / BUCKET_SIZE);
      for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) {
        const key = `${x}:${z}`;
        const entries = buckets.get(key);
        if (entries) entries.push(segment); else buckets.set(key, [segment]);
      }
    }
  };
  addRoute(points, true);
  for (const branch of branches) addRoute(branch.points, false);
  return buckets;
}

function clearanceAt(segments: readonly Segment[] | undefined, x: number, z: number): number {
  let clearance = SHOULDER_FADE;
  if (!segments) return clearance;
  for (const segment of segments) {
    const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
    const distance = Math.hypot(x - segment.ax - segment.dx * t, z - segment.az - segment.dz * t) - segment.radius;
    if (distance <= 0) return 0;
    clearance = Math.min(clearance, distance);
  }
  return clearance;
}

function bakeGrid(name: CourseGulfGrid['name'], anchor: CourseSample, side: number,
  points: readonly Point[], protection: Map<string, Segment[]>, depth: number, routeCenter?: Point): CourseGulfGrid {
  const launch = name === 'launch';
  const centerX = anchor.x + anchor.rightX * side * 330 + anchor.tangentX * (launch ? 230 : 50);
  const centerZ = anchor.z + anchor.rightZ * side * 330 + anchor.tangentZ * (launch ? 230 : 50);
  // The launch texture also contains the 1.5km playable descent/basin/return.
  // One larger bounded bake keeps the shader at two samplers and eight fetches.
  const size = launch ? 417 : COURSE_GULF_SIZE, cellSize = COURSE_GULF_CELL_SIZE;
  const half = (size - 1) * cellSize * .5;
  const minX = Math.floor(((routeCenter?.x ?? centerX) - half) / cellSize) * cellSize;
  const minZ = Math.floor(((routeCenter?.z ?? centerZ) - half) / cellSize) * cellSize;
  const values = new Float32Array(size * size);
  const forwardRadius = launch ? 720 : 650, lateralRadius = launch ? 640 : 580;
  for (let row = 1; row < size - 1; row += 1) {
    const z = minZ + row * cellSize;
    // Preserve the entire inside of the closed main loop, including the island
    // between the canonical route and shortcut. A scanline makes this O(rows*n).
    const intersections: number[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]!, b = points[(i + 1) % points.length]!;
      if ((a.z > z) !== (b.z > z)) intersections.push(a.x + (z - a.z) * (b.x - a.x) / (b.z - a.z));
    }
    intersections.sort((a, b) => a - b);
    let crossing = 0;
    for (let column = 1; column < size - 1; column += 1) {
      const x = minX + column * cellSize;
      while (crossing < intersections.length && intersections[crossing]! < x) crossing += 1;
      if (crossing % 2 === 1) continue;
      const dx = x - centerX, dz = z - centerZ;
      const forward = (dx * anchor.tangentX + dz * anchor.tangentZ) / forwardRadius;
      const lateral = (dx * anchor.rightX + dz * anchor.rightZ) / lateralRadius;
      const radius = Math.hypot(forward, lateral);
      if (radius >= 1) continue;
      const clearance = clearanceAt(protection.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`), x, z);
      if (clearance <= 0) continue;
      // A broad floor and steep shoulders give an actual valley silhouette.
      // The finish needs an exposed outer cliff beyond the unchanged protected
      // lane/filter margin. Launch/salt keep their original 64m landscape fade.
      const shoulderFade = launch ? SHOULDER_FADE : FINISH_GULF_SHOULDER_FADE;
      values[row * size + column] = -depth * smoother((1 - radius) / .55) * smoother(clearance / shoulderFade);
    }
  }
  return { name, minX, minZ, cellSize, size, values, centerX, centerZ, depth };
}

/** Landscape coordinates use the actual launch tangent; positive right is camera-screen right. */
export function getLaunchBasinAnchor(course: PodraceCourse): CourseSample | null {
  if (course.seed !== COURSE_GULF_SEED) return null;
  const launches = course.getRenderData(256).points.filter(point => point.tag === 'launch-crest');
  return launches.length ? course.sampleAtProgress(launches[Math.floor((launches.length - 1) * .4)]!.progress) : null;
}

/**
 * Compose real connected mountains into the physical launch basin. Signed
 * off-road rise is bounded to 250m above the original surface.
 * Protected lane texels keep their exact previous values, including all launch
 * grade, branch and CPU/MRT normal samples. Two grids still own every height.
 */
export function extendLaunchBasin(grid: CourseGulfGrid, course: PodraceCourse, profile?: LaunchElevationProfile): void {
  const anchor = getLaunchBasinAnchor(course);
  if (!anchor) return;
  const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const protection = makeProtection(points, course.branches);
  // Keep the previously driveable 240m-wide floor through the actual curved
  // basin, in addition to the narrow racing-lane and straight sightline masks.
  const floorRadius = 120 + COURSE_GULF_FILTER_MARGIN;
  const floorBuckets = profile ? makeProfileBuckets(points, floorRadius + SHOULDER_FADE) : null;
  for (let row = 1; row < grid.size - 1; row++) {
    const z = grid.minZ + row * grid.cellSize;
    for (let column = 1; column < grid.size - 1; column++) {
      const x = grid.minX + column * grid.cellSize, dx = x - anchor.x, dz = z - anchor.z;
      const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
      const right = -dx * anchor.rightX - dz * anchor.rightZ;
      if (forward < LAUNCH_LANDSCAPE_BOUNDS.minForward || forward > LAUNCH_LANDSCAPE_BOUNDS.maxForward
        || right < LAUNCH_LANDSCAPE_BOUNDS.minRight || right > LAUNCH_LANDSCAPE_BOUNDS.maxRight) continue;
      const clearance = clearanceAt(protection.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`), x, z);
      if (clearance <= 0) continue;
      const along = smoother((forward - 300) / 220) * (1 - smoother((forward - 1280) / 280));
      const across = 1 - smoother((Math.abs(right - 40) - 460) / 220);
      const border = smoother(Math.min(row, column, grid.size - 1 - row, grid.size - 1 - column) / 12);
      const mask = smoother(clearance / SHOULDER_FADE) * border;
      const index = row * grid.size + column;
      const basin = Math.min(grid.values[index]!, -160 * along * across * mask);
      const ridge = launchRidgeSurface(forward, right);
      // max is intentional: min-only composition erased the surviving shelves
      // wherever the earlier gulf or playable profile had already cut deeper.
      const target = Math.max(-COURSE_GULF_MAX_DEPTH,
        Math.min(COURSE_GULF_MAX_RISE, ridge.height - course.heightAt(x, z)));
      // Preserve the already visible central trough as well as every physical
      // racing lane. Large side masses frame this opening, not block it.
      const revealAlong = smoother((forward - 340) / 80) * (1 - smoother((forward - 1380) / 120));
      const reveal = 1 - (1 - smoother((Math.abs(right) - 120) / 64)) * revealAlong;
      let floorMask = 0;
      if (profile && floorBuckets) {
        const segments = floorBuckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
        let nearest = Infinity, distance = -1;
        for (const segment of segments ?? []) {
          const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
          const radius = Math.hypot(x - segment.ax - segment.dx * t, z - segment.az - segment.dz * t);
          if (radius < nearest) { nearest = radius; distance = segment.distance + segment.span * t; }
        }
        const alongFloor = smoother((distance - profile.floorDistance + 64) / 64)
          * (1 - smoother((distance - profile.basinEndDistance) / 64));
        floorMask = alongFloor * (1 - smoother((nearest - floorRadius) / SHOULDER_FADE));
      }
      grid.values[index] = ridge.weight > 0
        ? basin + (Math.max(basin, target) - basin) * ridge.weight * mask * reveal * (1 - floorMask)
        : basin;
    }
  }
}

/**
 * One physical reveal: a narrow racing escarpment over an open bowl throat.
 * Removes the old 440m-wide sand shoulder outside every legal lane/branch and
 * its normal footprint. The earlier concave road profile is a separate part of
 * this same course-edition candidate; no visual mesh overrides physical height.
 */
export function bakeLaunchRevealThroat(grid: CourseGulfGrid, course: PodraceCourse, profile: LaunchElevationProfile): void {
  const anchor = getLaunchBasinAnchor(course);
  if (!anchor) return;
  const points = Array.from({length:2048}, (_, i) => course.samplePlanAtProgress(i / 2048));
  const protection = makeProtection(points, course.branches, 0, Math.SQRT2 * COURSE_GULF_CELL_SIZE + 1.5);
  for (let row = 1; row < grid.size - 1; row++) for (let column = 1; column < grid.size - 1; column++) {
    const x = grid.minX + column * grid.cellSize, z = grid.minZ + row * grid.cellSize;
    const dx = x - anchor.x, dz = z - anchor.z;
    const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
    const right = -dx * anchor.rightX - dz * anchor.rightZ;
    if (forward <= -100 || forward >= 1380 || Math.abs(right) >= 360) continue;
    const clearance = clearanceAt(protection.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`), x, z);
    if (clearance <= 0) continue;
    const across = 1 - smoother((Math.abs(right) - 170) / 190);
    const exit = 1 - smoother((forward - 1160) / 220);
    const blend = smoother(clearance / 12) * across * exit;
    const target = profile.crestHeight + (profile.floorHeight - 48 - profile.crestHeight)
      * smoother((forward + 100) / 420);
    const index = row * grid.size + column, existing = grid.values[index]!;
    const cut = Math.min(0, target - course.heightAt(x, z) - existing) * blend;
    grid.values[index] = Math.max(-COURSE_GULF_MAX_DEPTH, existing + cut);
  }
}

export const SALT_RUN_PROFILE = Object.freeze({
  startDistance: 570, entryEndDistance: 650, floorDistance: 780,
  riseDistance: 900, riseEndDistance: 1100, exitStartDistance: 1210, endDistance: 1260,
  fullWidth: 95, fadeWidth: 210,
});

/** A shallow salt valley that rejoins before the unchanged launch rim. */
export function saltRunCeiling(distance: number): number {
  return -21 - 4 * smoother((distance - 650) / 130) + 11 * smoother((distance - 900) / 200);
}

/**
 * Corrects the actual lane/shoulder hump, not a rendering-only road mesh.
 * The final 20 m guard before 1280 m contains the interpolation and CPU/MRT normal
 * footprints, leaving the previously certified launch rim/descent untouched.
 */
export function bakeSaltRunProfile(grid: CourseGulfGrid, course: PodraceCourse): void {
  if (course.seed !== COURSE_GULF_SEED) return;
  const profile = SALT_RUN_PROFILE;
  const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const buckets = makeProfileBuckets(points, profile.fadeWidth);
  for (let row = 1; row < grid.size - 1; row++) {
    const z = grid.minZ + row * grid.cellSize;
    for (let column = 1; column < grid.size - 1; column++) {
      const x = grid.minX + column * grid.cellSize;
      const segments = buckets.get(`${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`);
      if (!segments) continue;
      let nearestSq = profile.fadeWidth ** 2, distance = -1;
      for (const segment of segments) {
        const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
        const square = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
        if (square < nearestSq) { nearestSq = square; distance = segment.distance + segment.span * t; }
      }
      if (distance <= profile.startDistance || distance >= profile.endDistance) continue;
      const envelope = smoother((distance - profile.startDistance) / (profile.entryEndDistance - profile.startDistance))
        * (1 - smoother((distance - profile.exitStartDistance) / (profile.endDistance - profile.exitStartDistance)))
        * (1 - smoother((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth)));
      const index = row * grid.size + column;
      const existing = grid.values[index]!;
      const offset = Math.min(0, saltRunCeiling(distance) - course.heightAt(x, z) - existing) * envelope;
      grid.values[index] = Math.max(-COURSE_GULF_MAX_DEPTH, existing + offset);
    }
  }
}

export const FORK_APPROACH_PROFILE = Object.freeze({
  start: 12, entryEnd: 72, floorStart: 70, floorEnd: 250,
  exitStart: 340, end: 440, fullWidth: 50, fadeWidth: 110,
});

/**
 * Lower the canonical fork's convex sand crest, including its visible shoulder.
 * Raised branches keep their entire floor and CPU/MRT normal footprints: the
 * branch mask includes a full bilinear cell diagonal plus 1.5 metres, covering
 * the 1.15m MRT and .85m CPU normal probes. Only the
 * formerly protected off-road ten-metre shoulder may now join the lower road.
 * This writes into the existing shared finish texture; no camera/render override.
 */
export function bakeForkApproachProfile(grid: CourseGulfGrid, course: PodraceCourse): void {
  if (course.seed !== COURSE_GULF_SEED) return;
  const branch = course.branches.find(candidate => candidate.elevated);
  if (!branch) return;
  const profile = FORK_APPROACH_PROFILE;
  const entryDistance = branch.entryProgress * course.totalLength;
  const entryHeight = course.heightAt(branch.points[0]!.x, branch.points[0]!.z);
  const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const buckets = makeProfileBuckets(points, profile.fadeWidth);
  const branchProtection = makeProtection([], course.branches, 0, Math.SQRT2 * COURSE_GULF_CELL_SIZE + 1.5);
  for (let row = 1; row < grid.size - 1; row++) {
    const z = grid.minZ + row * grid.cellSize;
    for (let column = 1; column < grid.size - 1; column++) {
      const x = grid.minX + column * grid.cellSize;
      const key = `${Math.floor(x / BUCKET_SIZE)}:${Math.floor(z / BUCKET_SIZE)}`;
      const segments = buckets.get(key);
      if (!segments) continue;
      let nearestSq = profile.fadeWidth ** 2, distance = -1;
      for (const segment of segments) {
        const t = Math.max(0, Math.min(1, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / Math.max(1e-8, segment.lengthSq)));
        const square = (x - segment.ax - segment.dx * t) ** 2 + (z - segment.az - segment.dz * t) ** 2;
        if (square < nearestSq) { nearestSq = square; distance = segment.distance + segment.span * t - entryDistance; }
      }
      if (distance <= profile.start || distance >= profile.end) continue;
      const clearance = clearanceAt(branchProtection.get(key), x, z);
      if (clearance <= 0) continue;
      const envelope = smoother((distance - profile.start) / (profile.entryEnd - profile.start))
        * (1 - smoother((distance - profile.exitStart) / (profile.end - profile.exitStart)))
        * (1 - smoother((Math.sqrt(nearestSq) - profile.fullWidth) / (profile.fadeWidth - profile.fullWidth)))
        * smoother(clearance / 6);
      const ceiling = entryHeight + 2 - 2 * smoother((distance - profile.floorStart) / (profile.floorEnd - profile.floorStart));
      const index = row * grid.size + column, existing = grid.values[index]!;
      const offset = Math.min(0, ceiling - course.heightAt(x, z) - existing) * envelope;
      grid.values[index] = Math.max(-COURSE_GULF_MAX_DEPTH, existing + offset);
    }
  }
}

/** Call only after generating the unchanged base plan; never feeds seed search. */
export function createCourseGulfField(course: PodraceCourse, options: { forkApproach?: boolean } = {}): CourseGulfField | null {
  if (course.seed !== COURSE_GULF_SEED) return null;
  const points = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const launches = points.filter(point => point.tag === 'launch-crest');
  const hairpins = points.filter(point => point.tag === 'hairpin');
  const launch = launches[Math.floor(launches.length * .4)];
  const finish = hairpins[Math.floor(hairpins.length * .35)];
  if (!launch || !finish) return null;
  let centroidX = 0, centroidZ = 0;
  for (const point of points) { centroidX += point.x; centroidZ += point.z; }
  centroidX /= points.length; centroidZ /= points.length;
  const launchSide = -Math.sign((centroidX - launch.x) * launch.rightX + (centroidZ - launch.z) * launch.rightZ) || 1;
  const finishSide = -Math.sign(finish.curvature) || 1;
  const protection = makeProtection(points, course.branches);
  const crestDistance = launch.distance - 90;
  const profile: LaunchElevationProfile = {
    startDistance: launch.distance - 360,
    crestDistance,
    floorDistance: crestDistance + 600,
    basinEndDistance: launch.distance + 760,
    endDistance: launch.distance + 1460,
    // Deepen the physical bowl by 44m with a concave, 138m escarpment.
    // Horizontal route/checkpoints and the original return endpoint stay fixed.
    crestHeight: course.sampleAtDistance(launch.distance - 90).y - 12,
    floorHeight: course.sampleAtDistance(launch.distance - 90).y - 150,
    endHeight: course.sampleAtDistance(launch.distance + 1460).y,
    fullWidth: 220,
    fadeWidth: 420,
  };
  const routeCenter = course.samplePlanAtProgress((crestDistance + 600) / course.totalLength);
  const launchGrid = bakeGrid('launch', launch, launchSide, points, protection, COURSE_GULF_MAX_DEPTH, routeCenter);
  bakeLaunchProfile(launchGrid, course, points, profile);
  extendLaunchBasin(launchGrid, course, profile);
  bakeLaunchRevealThroat(launchGrid, course, profile);
  bakeSaltRunProfile(launchGrid, course);
  const finishGrid = bakeGrid('finish', finish, finishSide, points, protection, 150);
  // The explicit opt-out supports independent before/after regression receipts;
  // every normal RaceSimulation/GameApp construction installs the profile.
  if (options.forkApproach !== false) bakeForkApproachProfile(finishGrid, course);
  return new CourseGulfField([
    launchGrid,
    finishGrid,
  ], profile);
}
