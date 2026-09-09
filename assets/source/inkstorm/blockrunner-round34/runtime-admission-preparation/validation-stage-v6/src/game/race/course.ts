import { getInkstormObstacleContact } from './inkstormLayout';
import type { HeightSampler, PodracerRespawnPoseState } from '../simulation/types';
import type {
  AuthoredCoursePoint,
  CornerPreview,
  CourseBranchDefinition,
  CourseGenerationReport,
  CourseCheckpoint,
  CourseMinimapData,
  CourseMinimapPoint,
  CourseObstacleContact,
  CourseProjection,
  CourseRenderData,
  CourseSample,
  CourseSectionTag,
  DesertRegionId,
} from './types';
import {
  generateCourseBranches,
  nearestBranchProjection,
  validateCourseBranches,
} from './branches';
import {
  DESERT_REGIONS,
  desertRegionAnchor,
  desertRegionForSeed,
} from './regions';

const TAU = Math.PI * 2;
const DEFAULT_ARC_SAMPLES_PER_SEGMENT = 64;
const DEFAULT_PROJECTION_SAMPLES = 1024;
const PROCEDURAL_CANDIDATE_ATTEMPTS = 16;
const LAUNCH_PLACEMENT_PRIMARY_RINGS = 4;
const LAUNCH_PLACEMENT_RECOVERY_RINGS = 9;
/** Matches the minimum clear inner edge authored by RaceCourseView's cliffs. */
const CANYON_INNER_EDGE_MARGIN = 7.8;
/** Matches the visible overlapping cliff module overhang at a tagged boundary. */
const CANYON_ENDCAP_EXTENSION = 44;

/**
 * Hand-authored macro layout. The labels are gameplay contracts used by AI,
 * signs, capture presets and tests rather than decorative metadata.
 */
export const PODRACE_CONTROL_POINTS: readonly AuthoredCoursePoint[] = Object.freeze([
  { x: -350, z: -330, width: 30, tag: 'start-straight', checkpoint: true },
  { x: -320, z: 40, width: 32, tag: 'fast-straight' },
  { x: -300, z: 460, width: 34, tag: 'fast-straight', checkpoint: true },
  { x: -260, z: 790, width: 31, tag: 'launch-crest' },
  { x: -90, z: 1060, width: 30, tag: 'launch-crest', checkpoint: true },
  { x: 240, z: 1215, width: 36, tag: 'wide-sweeper' },
  { x: 590, z: 1180, width: 38, tag: 'wide-sweeper', checkpoint: true },
  { x: 890, z: 950, width: 35, tag: 'wide-sweeper' },
  { x: 995, z: 630, width: 27, tag: 'wide-sweeper' },
  { x: 960, z: 330, width: 17, tag: 'narrow-canyon', checkpoint: true },
  { x: 870, z: 70, width: 15, tag: 'narrow-canyon' },
  { x: 710, z: -170, width: 16, tag: 'narrow-canyon', checkpoint: true },
  { x: 855, z: -385, width: 23, tag: 'chicane' },
  { x: 630, z: -555, width: 20, tag: 'chicane' },
  { x: 790, z: -760, width: 22, tag: 'chicane', checkpoint: true },
  { x: 680, z: -1040, width: 31, tag: 'recovery-straight' },
  { x: 420, z: -1235, width: 33, tag: 'fast-straight', checkpoint: true },
  { x: 60, z: -1310, width: 30, tag: 'fast-straight' },
  { x: -300, z: -1285, width: 23, tag: 'hairpin', checkpoint: true },
  { x: -575, z: -1165, width: 19, tag: 'hairpin' },
  { x: -675, z: -985, width: 18, tag: 'hairpin' },
  { x: -590, z: -825, width: 19, tag: 'hairpin' },
  { x: -375, z: -745, width: 22, tag: 'hairpin', checkpoint: true },
  { x: -145, z: -770, width: 27, tag: 'recovery-straight' },
  { x: -170, z: -560, width: 29, tag: 'recovery-straight' },
  { x: -285, z: -430, width: 30, tag: 'start-straight' },
]);

interface ArcEntry {
  parameter: number;
  distance: number;
  x: number;
  z: number;
}

interface CurveEvaluation {
  x: number;
  z: number;
  dx: number;
  dz: number;
  ddx: number;
  ddz: number;
  width: number;
  tag: CourseSectionTag;
}

export interface PodraceCourseOptions {
  controlPoints?: readonly AuthoredCoursePoint[];
  /** Seed receipt for procedural courses; null identifies the authored baseline. */
  seed?: number | null;
  region?: DesertRegionId;
  branches?: readonly CourseBranchDefinition[];
  arcSamplesPerSegment?: number;
  projectionSamples?: number;
}

export type ProceduralPodraceCourseOptions = Omit<
  PodraceCourseOptions,
  'controlPoints' | 'seed'
>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mixCourseSeed(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) || 0x6d2b79f5;
}

function nextCourseRandom(state: { value: number }): number {
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = (value >>> 0) || 0x6d2b79f5;
  return state.value / 0x1_0000_0000;
}

function courseRandomRange(state: { value: number }, minimum: number, maximum: number): number {
  return minimum + (maximum - minimum) * nextCourseRandom(state);
}

function hashCourseInteger(hash: number, value: number): number {
  let next = hash ^ (value | 0);
  next = Math.imul(next, 0x01000193);
  next ^= next >>> 16;
  return next >>> 0;
}

/** Geometry-derived identity used by diagnostics and online course receipts. */
export function courseGeometrySignature(points: readonly AuthoredCoursePoint[]): string {
  let hash = 0x811c9dc5;
  for (const point of points) {
    hash = hashCourseInteger(hash, Math.round(point.x * 10));
    hash = hashCourseInteger(hash, Math.round(point.z * 10));
    hash = hashCourseInteger(hash, Math.round(point.width * 100));
    for (let index = 0; index < point.tag.length; index += 1) {
      hash = hashCourseInteger(hash, point.tag.charCodeAt(index));
    }
    hash = hashCourseInteger(hash, point.checkpoint ? 1 : 0);
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Builds a fresh but production-safe macro circuit from a proven feature
 * grammar. The seed chooses a straight grid approach, rotates the set-piece
 * cadence, applies broad multi-frequency warps and reshapes hairpin, chicane,
 * sweeper and launch beats independently before the dense rejection audit.
 */
function generatePodraceCandidate(
  seed: number,
  template: readonly AuthoredCoursePoint[] = PODRACE_CONTROL_POINTS,
  attempt = 0,
): readonly AuthoredCoursePoint[] {
  validateControlPoints(template);
  const normalizedSeed = seed >>> 0;
  const random = {
    value: mixCourseSeed(
      normalizedSeed ^ 0xa511e9b3 ^ Math.imul(attempt + 1, 0x9e3779b9),
    ),
  };
  // A grammar rotation changes where the named set pieces land relative to
  // the start/checkpoint rhythm. Candidates are all proven straight/recovery
  // approaches, so the grid never opens directly into the hairpin.
  const grammarStarts = template
    .map((point, index) => ({ point, index }))
    .filter(({ point, index }) => {
      const isStraight = (tag: CourseSectionTag): boolean => (
        tag === 'start-straight'
        || tag === 'fast-straight'
        || tag === 'recovery-straight'
      );
      return isStraight(point.tag)
        && isStraight(template[wrapIndex(index - 1, template.length)]!.tag)
        && isStraight(template[wrapIndex(index + 1, template.length)]!.tag);
    })
    .map(({ index }) => index);
  const grammarStart = grammarStarts[
    Math.floor(nextCourseRandom(random) * grammarStarts.length) % Math.max(1, grammarStarts.length)
  ] ?? 0;
  const grammarTemplate = Array.from({ length: template.length }, (_, index) => {
    const source = template[(index + grammarStart) % template.length] ?? template[index]!;
    const checkpoint = index === 0 || [2, 4, 7, 10, 13, 16, 19, 22, 24].includes(index);
    const tag = index === 0 || index === template.length - 1
      ? 'start-straight'
      : source.tag;
    return { ...source, tag, ...(checkpoint ? { checkpoint: true } : { checkpoint: undefined }) };
  });
  const center = grammarTemplate.reduce(
    (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
    { x: 0, z: 0 },
  );
  center.x /= grammarTemplate.length;
  center.z /= grammarTemplate.length;

  const rotation = courseRandomRange(random, -Math.PI, Math.PI);
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const mirror = nextCourseRandom(random) < 0.5 ? -1 : 1;
  const scaleX = courseRandomRange(random, 0.84, 1.18);
  const scaleZ = courseRandomRange(random, 0.86, 1.17);
  const shear = courseRandomRange(random, -0.13, 0.13);
  const offsetX = courseRandomRange(random, -640, 640);
  const offsetZ = courseRandomRange(random, -640, 640);
  const phase2 = courseRandomRange(random, 0, TAU);
  const phase3 = courseRandomRange(random, 0, TAU);
  const phase5 = courseRandomRange(random, 0, TAU);
  const radialAmplitude2 = courseRandomRange(random, 62, 138);
  const radialAmplitude3 = courseRandomRange(random, 34, 82);
  const tangentAmplitude = courseRandomRange(random, 22, 64);
  const chicaneKick = courseRandomRange(random, 24, 58) * (nextCourseRandom(random) < 0.5 ? -1 : 1);
  const hairpinBulge = courseRandomRange(random, -58, 88);
  const sweeperBulge = courseRandomRange(random, -42, 74);
  const launchShift = courseRandomRange(random, -48, 66);
  const widthScale = courseRandomRange(random, 0.91, 1.09);

  let chicaneIndex = 0;
  const generated = grammarTemplate.map((point, index): AuthoredCoursePoint => {
    const localX = point.x - center.x;
    const localZ = point.z - center.z;
    const radius = Math.max(1, Math.hypot(localX, localZ));
    const radialX = localX / radius;
    const radialZ = localZ / radius;
    const tangentX = -radialZ;
    const tangentZ = radialX;
    const theta = index / grammarTemplate.length * TAU;
    let radialWarp = Math.sin(theta * 2 + phase2) * radialAmplitude2
      + Math.sin(theta * 3 + phase3) * radialAmplitude3;
    let tangentWarp = Math.sin(theta * 3 + phase5) * tangentAmplitude;

    if (point.tag === 'chicane') {
      tangentWarp += chicaneKick * (chicaneIndex % 2 === 0 ? 1 : -1);
      chicaneIndex += 1;
    } else if (point.tag === 'hairpin') {
      radialWarp += hairpinBulge;
      tangentWarp += Math.sin(theta * 5 + phase2) * 24;
    } else if (point.tag === 'wide-sweeper') {
      radialWarp += sweeperBulge;
    } else if (point.tag === 'launch-crest') {
      tangentWarp += launchShift;
    }

    const warpedX = localX + radialX * radialWarp + tangentX * tangentWarp;
    const warpedZ = localZ + radialZ * radialWarp + tangentZ * tangentWarp;
    const mirroredX = warpedX * mirror;
    const affineX = mirroredX * scaleX + warpedZ * shear;
    const affineZ = warpedZ * scaleZ;
    const x = affineX * cosRotation - affineZ * sinRotation + offsetX;
    const z = affineX * sinRotation + affineZ * cosRotation + offsetZ;
    const widthVariation = 1 + Math.sin(theta * 2 + phase5) * 0.045;
    const width = clamp(point.width * widthScale * widthVariation, 14, 43);
    return Object.freeze({
      x,
      z,
      width,
      tag: point.tag,
      ...(point.checkpoint ? { checkpoint: true } : {}),
    });
  });
  return Object.freeze(generated);
}

/**
 * Last-resort plan built from the hand-audited macro circuit using only a
 * similarity transform. Rotation, reflection and uniform scale cannot add a
 * crossing; the final dense audit remains the executable proof of the other
 * production bounds. Keeping this independent of a caller-supplied template
 * means even a malformed-but-finite custom fixture cannot leak into a race.
 */
function generateCertifiedFallback(seed: number): readonly AuthoredCoursePoint[] {
  const random = { value: mixCourseSeed(seed ^ 0xc3a5_c85c) };
  const center = PODRACE_CONTROL_POINTS.reduce(
    (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
    { x: 0, z: 0 },
  );
  center.x /= PODRACE_CONTROL_POINTS.length;
  center.z /= PODRACE_CONTROL_POINTS.length;

  const rotation = courseRandomRange(random, -Math.PI, Math.PI);
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const reflection = nextCourseRandom(random) < 0.5 ? -1 : 1;
  const offsetX = courseRandomRange(random, -640, 640);
  const offsetZ = courseRandomRange(random, -640, 640);

  // If a future authored edit reduces clearance, the bounded scale recovery
  // improves both clearance and curvature. Every result is still audited and
  // the upper length bound prevents a successful-but-oversized fallback.
  for (const scale of [1, 1.025, 1.05, 1.075] as const) {
    const transformed = Object.freeze(PODRACE_CONTROL_POINTS.map((point) => {
      const localX = (point.x - center.x) * reflection * scale;
      const localZ = (point.z - center.z) * scale;
      return Object.freeze({
        ...point,
        x: localX * cosRotation - localZ * sinRotation + offsetX,
        z: localX * sinRotation + localZ * cosRotation + offsetZ,
      });
    }));
    if (validateGeneratedControlPoints(transformed)) return transformed;
  }

  // This is a developer invariant, not a best-effort runtime fallback. A bad
  // edit to the certified source plan must fail loudly during tests/builds.
  throw new Error('Built-in certified podrace fallback failed its dense geometry audit.');
}

/**
 * Deterministic feature-grammar generation with bounded rejection. Geometry
 * is accepted only after a dense curve audit; no runtime race can receive an
 * unbounded/self-crossing random walk.
 */
export function generatePodraceControlPoints(
  seed: number,
  template: readonly AuthoredCoursePoint[] = PODRACE_CONTROL_POINTS,
): readonly AuthoredCoursePoint[] {
  for (let attempt = 0; attempt < PROCEDURAL_CANDIDATE_ATTEMPTS; attempt += 1) {
    const candidate = generatePodraceCandidate(seed, template, attempt);
    if (validateGeneratedControlPoints(candidate)) return candidate;
  }
  return generateCertifiedFallback(seed >>> 0);
}

function launchCrestScore(
  points: readonly AuthoredCoursePoint[],
  terrain: HeightSampler,
  offsetX: number,
  offsetZ: number,
): number {
  const firstLaunch = points.findIndex((point) => point.tag === 'launch-crest');
  if (firstLaunch < 1) return Number.NEGATIVE_INFINITY;
  let lastLaunch = firstLaunch;
  while (points[lastLaunch + 1]?.tag === 'launch-crest') lastLaunch += 1;
  const before = points[firstLaunch - 1];
  const crest = points[lastLaunch];
  const after = points[(lastLaunch + 1) % points.length];
  if (!before || !crest || !after) return Number.NEGATIVE_INFINITY;
  const beforeHeight = terrain.heightAt(before.x + offsetX, before.z + offsetZ);
  const crestHeight = terrain.heightAt(crest.x + offsetX, crest.z + offsetZ);
  const afterHeight = terrain.heightAt(after.x + offsetX, after.z + offsetZ);
  const climbDistance = Math.max(1, Math.hypot(crest.x - before.x, crest.z - before.z));
  const dropDistance = Math.max(1, Math.hypot(after.x - crest.x, after.z - crest.z));
  const climbGrade = (crestHeight - beforeHeight) / climbDistance;
  const dropGrade = (crestHeight - afterHeight) / dropDistance;
  // A usable jump needs both approach climb and terrain falling away. The
  // minimum term prevents one dramatic side masking a flat or uphill exit.
  return Math.min(climbGrade, dropGrade) * 4 + climbGrade + dropGrade;
}

function placeCourseLaunchOnCrest(
  points: readonly AuthoredCoursePoint[],
  terrain: HeightSampler,
  seed: number,
  minimumLaunchScore: number,
  baseOffsetX = 0,
  baseOffsetZ = 0,
): readonly AuthoredCoursePoint[] {
  let bestOffsetX = baseOffsetX;
  let bestOffsetZ = baseOffsetZ;
  let bestScore = launchCrestScore(points, terrain, baseOffsetX, baseOffsetZ);
  const phase = mixCourseSeed(seed ^ 0x6c8e9cf5) / 0x1_0000_0000 * TAU;
  const considerOffset = (offsetX: number, offsetZ: number): void => {
    const score = launchCrestScore(points, terrain, offsetX, offsetZ);
    if (score <= bestScore) return;
    bestScore = score;
    bestOffsetX = offsetX;
    bestOffsetZ = offsetZ;
  };

  // Thirty-two deterministic placement probes remain the normal fast path.
  // Recovery rings run only when that pass cannot meet the biome's launch
  // grade; their radius stays inside the 9.6 km region plateau.
  for (let ring = 1; ring <= LAUNCH_PLACEMENT_PRIMARY_RINGS; ring += 1) {
    const radius = ring * 260;
    for (let spoke = 0; spoke < 8; spoke += 1) {
      const angle = phase + spoke / 8 * TAU + ring * 0.19;
      considerOffset(
        baseOffsetX + Math.cos(angle) * radius,
        baseOffsetZ + Math.sin(angle) * radius,
      );
    }
  }
  if (bestScore < minimumLaunchScore) {
    for (
      let ring = LAUNCH_PLACEMENT_PRIMARY_RINGS + 1;
      ring <= LAUNCH_PLACEMENT_RECOVERY_RINGS;
      ring += 1
    ) {
      const radius = ring * 240;
      for (let spoke = 0; spoke < 12; spoke += 1) {
        const angle = phase + spoke / 12 * TAU + ring * 0.137;
        considerOffset(
          baseOffsetX + Math.cos(angle) * radius,
          baseOffsetZ + Math.sin(angle) * radius,
        );
      }
    }
  }
  if (bestOffsetX === 0 && bestOffsetZ === 0) return points;
  const placed = Object.freeze(points.map((point) => Object.freeze({
    ...point,
    x: point.x + bestOffsetX,
    z: point.z + bestOffsetZ,
  })));
  const audit = generatedPlanAudits.get(points);
  if (audit) generatedPlanAudits.set(placed, audit);
  return placed;
}

export function wrapCourseProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  const wrapped = progress % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function signedProgressDelta(from: number, to: number): number {
  let delta = wrapCourseProgress(to) - wrapCourseProgress(from);
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

function wrapIndex(index: number, length: number): number {
  const wrapped = index % length;
  return wrapped < 0 ? wrapped + length : wrapped;
}

function validateControlPoints(points: readonly AuthoredCoursePoint[]): void {
  if (points.length < 8) throw new RangeError('A closed podrace course needs at least 8 control points.');
  if (points.filter((point) => point.checkpoint).length < 3) {
    throw new RangeError('A podrace course needs at least 3 ordered checkpoints.');
  }
  for (const point of points) {
    if (![point.x, point.z, point.width].every(Number.isFinite) || point.width <= 0) {
      throw new RangeError('Course control points must have finite coordinates and positive widths.');
    }
  }
}

function catmullScalar(p0: number, p1: number, p2: number, p3: number, t: number): [number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  const value = 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
  const derivative = 0.5 * (
    -p0 + p2 +
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t +
    3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2
  );
  const secondDerivative = 0.5 * (
    2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) +
    6 * (-p0 + 3 * p1 - 3 * p2 + p3) * t
  );
  return [value, derivative, secondDerivative];
}

interface PlanAuditPoint {
  x: number;
  z: number;
  width: number;
  curvature: number;
}

interface PlanAudit {
  samples: PlanAuditPoint[];
  length: number;
  maximumCurvature: number;
  startGridCurvature: number;
  minimumClearance: number;
  intersections: number;
}

const generatedPlanAudits = new WeakMap<readonly AuthoredCoursePoint[], PlanAudit>();

function planOrientation(
  a: Pick<PlanAuditPoint, 'x' | 'z'>,
  b: Pick<PlanAuditPoint, 'x' | 'z'>,
  c: Pick<PlanAuditPoint, 'x' | 'z'>,
): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function planSegmentsCross(
  a: PlanAuditPoint,
  b: PlanAuditPoint,
  c: PlanAuditPoint,
  d: PlanAuditPoint,
): boolean {
  const abC = planOrientation(a, b, c);
  const abD = planOrientation(a, b, d);
  const cdA = planOrientation(c, d, a);
  const cdB = planOrientation(c, d, b);
  const epsilon = 1e-5;
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}

function auditGeneratedPlan(
  points: readonly AuthoredCoursePoint[],
  divisions = 10,
): PlanAudit {
  const samples: PlanAuditPoint[] = [];
  let length = 0;
  let previous: PlanAuditPoint | null = null;
  let maximumCurvature = 0;
  for (let segment = 0; segment < points.length; segment += 1) {
    const p0 = points[wrapIndex(segment - 1, points.length)]!;
    const p1 = points[segment]!;
    const p2 = points[wrapIndex(segment + 1, points.length)]!;
    const p3 = points[wrapIndex(segment + 2, points.length)]!;
    for (let division = 0; division < divisions; division += 1) {
      const t = division / divisions;
      const x = catmullScalar(p0.x, p1.x, p2.x, p3.x, t);
      const z = catmullScalar(p0.z, p1.z, p2.z, p3.z, t);
      const tangentLength = Math.max(1e-6, Math.hypot(x[1], z[1]));
      const curvature = Math.abs(
        (z[1] * x[2] - x[1] * z[2]) / Math.max(1e-6, tangentLength ** 3),
      );
      const smooth = t * t * (3 - 2 * t);
      const sample = {
        x: x[0], z: z[0],
        width: p1.width + (p2.width - p1.width) * smooth,
        curvature,
      };
      if (previous) length += Math.hypot(sample.x - previous.x, sample.z - previous.z);
      samples.push(sample);
      previous = sample;
      maximumCurvature = Math.max(maximumCurvature, curvature);
    }
  }
  if (samples.length > 1) {
    const first = samples[0]!;
    const last = samples.at(-1)!;
    length += Math.hypot(first.x - last.x, first.z - last.z);
  }

  let minimumClearance = Number.POSITIVE_INFINITY;
  let intersections = 0;
  const exclusion = Math.max(5, Math.ceil(samples.length * 0.035));
  for (let first = 0; first < samples.length; first += 1) {
    const firstNext = (first + 1) % samples.length;
    for (let second = first + exclusion; second < samples.length; second += 1) {
      const cyclicGap = Math.min(second - first, samples.length - (second - first));
      if (cyclicGap < exclusion) continue;
      const a = samples[first]!;
      const b = samples[firstNext]!;
      const c = samples[second]!;
      const d = samples[(second + 1) % samples.length]!;
      if (planSegmentsCross(a, b, c, d)) intersections += 1;
      minimumClearance = Math.min(
        minimumClearance,
        Math.hypot(a.x - c.x, a.z - c.z) - a.width - c.width,
      );
    }
  }
  return {
    samples,
    length,
    maximumCurvature,
    startGridCurvature: samples[0]?.curvature ?? Number.POSITIVE_INFINITY,
    minimumClearance,
    intersections,
  };
}

function validateGeneratedControlPoints(points: readonly AuthoredCoursePoint[]): boolean {
  // Placement uses immutable translations and carries the accepted audit in
  // `generatedPlanAudits`; reuse it so the construction postcondition is free
  // on the normal path instead of repeating the O(sample²) clearance pass.
  const audit = generatedPlanAudits.get(points) ?? auditGeneratedPlan(points, 16);
  const required = new Set<CourseSectionTag>([
    'start-straight', 'fast-straight', 'launch-crest', 'wide-sweeper',
    'narrow-canyon', 'chicane', 'hairpin', 'recovery-straight',
  ]);
  for (const point of points) required.delete(point.tag);
  if (required.size > 0 || points.filter((point) => point.checkpoint).length !== 10) return false;
  if (audit.length < 5_800 || audit.length > 10_300) return false;
  if (
    audit.maximumCurvature > 0.085
    || audit.startGridCurvature > 0.028
    || audit.minimumClearance < 42
    || audit.intersections > 0
  ) return false;
  if (points.some((point) => point.width < 14 || point.width > 43)) return false;
  generatedPlanAudits.set(points, audit);
  return true;
}

export class PodraceCourse {
  readonly controlPoints: readonly AuthoredCoursePoint[];
  readonly seed: number | null;
  readonly signature: string;
  readonly region: DesertRegionId;
  readonly totalLength: number;
  readonly checkpoints: readonly CourseCheckpoint[];
  readonly generationReport: CourseGenerationReport;

  private readonly terrain: HeightSampler;
  private readonly arcTable: readonly ArcEntry[];
  private readonly controlDistances: readonly number[];
  private readonly projectionPoints: readonly { x: number; z: number; progress: number }[];
  private branchDefinitions: readonly CourseBranchDefinition[] = Object.freeze([]);

  get branches(): readonly CourseBranchDefinition[] {
    return this.branchDefinitions;
  }

  constructor(terrain: HeightSampler, options: PodraceCourseOptions = {}) {
    this.terrain = terrain;
    this.controlPoints = options.controlPoints ?? PODRACE_CONTROL_POINTS;
    this.seed = options.seed === null || options.seed === undefined ? null : options.seed >>> 0;
    this.signature = courseGeometrySignature(this.controlPoints);
    this.region = options.region ?? (this.seed === null
      ? 'sunscar-dunes'
      : desertRegionForSeed(this.seed).id);
    validateControlPoints(this.controlPoints);
    const subdivisions = clamp(
      Math.floor(options.arcSamplesPerSegment ?? DEFAULT_ARC_SAMPLES_PER_SEGMENT),
      16,
      256,
    );
    const built = this.buildArcTable(subdivisions);
    this.arcTable = built.entries;
    this.controlDistances = built.controlDistances;
    this.totalLength = built.totalLength;

    const projectionCount = clamp(
      Math.floor(options.projectionSamples ?? DEFAULT_PROJECTION_SAMPLES),
      512,
      8192,
    );
    this.projectionPoints = Array.from({ length: projectionCount }, (_, index) => {
      const progress = index / projectionCount;
      const sample = this.evaluateAtDistance(progress * this.totalLength);
      return { x: sample.x, z: sample.z, progress };
    });

    this.checkpoints = this.controlPoints
      .map((point, controlPointIndex) => ({ point, controlPointIndex }))
      .filter(({ point }) => point.checkpoint === true)
      .map(({ controlPointIndex }, index) => {
        const distance = this.controlDistances[controlPointIndex] ?? 0;
        return {
          ...this.sampleAtProgress(distance / this.totalLength),
          index,
          controlPointIndex,
        };
      });

    this.branchDefinitions = options.branches ?? (this.seed === null
      ? Object.freeze([])
      : generateCourseBranches(this, this.seed, this.region));
    this.generationReport = validatePodraceCourse(this);
  }

  heightAt(x: number, z: number): number {
    return this.terrain.heightAt(x, z);
  }

  /** Refreshes cached elevations after an instance-owned authored terrain layer.
   * Horizontal plans, checkpoint progress and elevated-deck clearance are retained.
   * The generation report remains the original base-plan/seed-search receipt.
   */
  refreshTerrainHeights(previousTerrain: HeightSampler): void {
    for (const checkpoint of this.checkpoints) checkpoint.y = this.heightAt(checkpoint.x, checkpoint.z);
    this.branchDefinitions = Object.freeze(this.branchDefinitions.map(branch => {
      let changed = false;
      const points = branch.points.map(point => {
        const offset = this.heightAt(point.x, point.z) - previousTerrain.heightAt(point.x, point.z);
        if (Math.abs(offset) < 1e-10) return point;
        changed = true;
        return Object.freeze({ ...point, y: point.y + offset });
      });
      return changed ? Object.freeze({ ...branch, points: Object.freeze(points) }) : branch;
    }));
  }

  sampleAtProgress(progress: number): CourseSample {
    return this.sampleAtDistance(wrapCourseProgress(progress) * this.totalLength);
  }

  /** Geometry-only sampling for generation/AI audits that do not need terrain. */
  samplePlanAtProgress(progress: number): CourseSample {
    return this.samplePlanAtDistance(wrapCourseProgress(progress) * this.totalLength);
  }

  sampleAtDistance(distance: number): CourseSample {
    const sample = this.samplePlanAtDistance(distance);
    return { ...sample, y: this.terrain.heightAt(sample.x, sample.z) };
  }

  private samplePlanAtDistance(distance: number): CourseSample {
    const wrappedDistance = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    const evaluation = this.evaluateAtDistance(wrappedDistance);
    const tangentLength = Math.max(1e-6, Math.hypot(evaluation.dx, evaluation.dz));
    const tangentX = evaluation.dx / tangentLength;
    const tangentZ = evaluation.dz / tangentLength;
    const curvatureNumerator = evaluation.dz * evaluation.ddx - evaluation.dx * evaluation.ddz;
    const curvature = curvatureNumerator / Math.max(1e-6, tangentLength ** 3);
    return {
      x: evaluation.x,
      y: 0,
      z: evaluation.z,
      progress: wrappedDistance / this.totalLength,
      distance: wrappedDistance,
      tangentX,
      tangentZ,
      rightX: tangentZ,
      rightZ: -tangentX,
      width: evaluation.width,
      tag: evaluation.tag,
      curvature,
    };
  }

  projectPoint(x: number, z: number, hintProgress?: number): CourseProjection {
    const canonical = this.projectCanonicalPoint(x, z, hintProgress);
    if (this.branchDefinitions.length === 0) return canonical;
    const branchHit = nearestBranchProjection(this.branchDefinitions, x, z, hintProgress);
    // A small hysteresis keeps the exact shared entry/exit centre on the main
    // route and prevents one floating-point bit from flickering route identity.
    if (!branchHit || branchHit.distanceSquared + 2.25 >= canonical.distanceToCenter ** 2) {
      return canonical;
    }
    const { branch, point, next, amount } = branchHit;
    const centerX = point.x + (next.x - point.x) * amount;
    const centerZ = point.z + (next.z - point.z) * amount;
    const tangentLength = Math.max(1e-6, Math.hypot(next.x - point.x, next.z - point.z));
    const tangentX = (next.x - point.x) / tangentLength;
    const tangentZ = (next.z - point.z) / tangentLength;
    const rightX = tangentZ;
    const rightZ = -tangentX;
    const canonicalProgress = point.canonicalProgress
      + (next.canonicalProgress - point.canonicalProgress) * amount;
    const routeProgress = point.routeProgress
      + (next.routeProgress - point.routeProgress) * amount;
    const canonicalSample = this.sampleAtProgress(canonicalProgress);
    const width = point.width + (next.width - point.width) * amount;
    const offsetX = x - centerX;
    const offsetZ = z - centerZ;
    return {
      ...canonicalSample,
      x: centerX,
      y: branch.elevated ? point.y + (next.y - point.y) * amount : this.terrain.heightAt(centerX, centerZ),
      z: centerZ,
      tangentX,
      tangentZ,
      rightX,
      rightZ,
      width,
      distanceToCenter: Math.sqrt(branchHit.distanceSquared),
      lateralOffset: offsetX * rightX + offsetZ * rightZ,
      branchId: branch.id,
      branchKind: branch.kind,
      branchRouteProgress: routeProgress,
    };
  }

  private projectCanonicalPoint(x: number, z: number, hintProgress?: number): CourseProjection {
    const count = this.projectionPoints.length;
    let bestIndex = 0;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    const scan = (start: number, end: number): void => {
      for (let offset = start; offset <= end; offset += 1) {
        const index = wrapIndex(offset, count);
        const point = this.projectionPoints[index];
        if (!point) continue;
        const dx = x - point.x;
        const dz = z - point.z;
        const distanceSquared = dx * dx + dz * dz;
        if (distanceSquared < bestDistanceSquared) {
          bestDistanceSquared = distanceSquared;
          bestIndex = index;
        }
      }
    };

    if (hintProgress === undefined || !Number.isFinite(hintProgress)) {
      scan(0, count - 1);
    } else {
      const centre = Math.round(wrapCourseProgress(hintProgress) * count);
      const localRadius = Math.max(32, Math.ceil(count * 0.025));
      scan(centre - localRadius, centre + localRadius);
      const local = this.projectionPoints[bestIndex];
      const safeWidth = local ? this.sampleAtProgress(local.progress).width : 30;
      if (bestDistanceSquared > (safeWidth * 5) ** 2) {
        bestDistanceSquared = Number.POSITIVE_INFINITY;
        scan(0, count - 1);
      }
    }

    const previous = this.projectionPoints[wrapIndex(bestIndex - 1, count)];
    const current = this.projectionPoints[bestIndex];
    const next = this.projectionPoints[wrapIndex(bestIndex + 1, count)];
    if (!previous || !current || !next) {
      const fallback = this.sampleAtProgress(0);
      return { ...fallback, distanceToCenter: Math.hypot(x - fallback.x, z - fallback.z), lateralOffset: 0 };
    }

    let refinedProgress = current.progress;
    let refinedDistanceSquared = bestDistanceSquared;
    for (const [a, b] of [[previous, current], [current, next]] as const) {
      const segmentX = b.x - a.x;
      const segmentZ = b.z - a.z;
      const lengthSquared = Math.max(1e-9, segmentX * segmentX + segmentZ * segmentZ);
      const along = clamp(((x - a.x) * segmentX + (z - a.z) * segmentZ) / lengthSquared, 0, 1);
      const projectedX = a.x + segmentX * along;
      const projectedZ = a.z + segmentZ * along;
      const dx = x - projectedX;
      const dz = z - projectedZ;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared <= refinedDistanceSquared) {
        let progressDelta = b.progress - a.progress;
        if (progressDelta < -0.5) progressDelta += 1;
        if (progressDelta > 0.5) progressDelta -= 1;
        refinedProgress = wrapCourseProgress(a.progress + progressDelta * along);
        refinedDistanceSquared = distanceSquared;
      }
    }

    const sample = this.sampleAtProgress(refinedProgress);
    const offsetX = x - sample.x;
    const offsetZ = z - sample.z;
    return {
      ...sample,
      distanceToCenter: Math.sqrt(refinedDistanceSquared),
      lateralOffset: offsetX * sample.rightX + offsetZ * sample.rightZ,
    };
  }

  /**
   * Returns penetration against solid, authored course scenery. This stays in
   * the renderer-free simulation layer: the canyon proxy is derived from the
   * same section tag, width and inner-edge margin used to place the visible
   * cliff modules, so replay/capture results never depend on scene traversal.
   */
  getObstacleContact(
    x: number,
    z: number,
    racerRadius: number,
    hintProgress?: number,
    height?: number,
  ): CourseObstacleContact | null {
    const scenery=getInkstormObstacleContact(this,x,z,racerRadius,height,(px,pz)=>this.terrain.heightAt(px,pz));
    if(scenery)return scenery;
    const projection = this.projectPoint(x, z, hintProgress);
    // Alternate paths deliberately route around the canonical canyon proxy.
    // Their own narrow width/off-course recovery remains the gameplay bound.
    if (projection.branchId) return null;
    let wallSample: CourseSample = projection;
    let lateralOffset = projection.lateralOffset;
    if (projection.tag !== 'narrow-canyon') {
      let bestDistanceSquared = Number.POSITIVE_INFINITY;
      let boundarySample: CourseSample | null = null;
      let boundaryLateralOffset = 0;
      // The rendered end modules deliberately overlap the adjacent section.
      // Search the same short distance so analytic collision cannot expose a
      // pass-through slit where the Catmull-Rom tag flips at the module seam.
      for (let offset = 8; offset <= CANYON_ENDCAP_EXTENSION; offset += 8) {
        for (const direction of [-1, 1] as const) {
          const candidate = this.sampleAtDistance(projection.distance + offset * direction);
          if (candidate.tag !== 'narrow-canyon') continue;
          const dx = x - candidate.x;
          const dz = z - candidate.z;
          const longitudinalOffset = dx * candidate.tangentX + dz * candidate.tangentZ;
          if (Math.abs(longitudinalOffset) > CANYON_ENDCAP_EXTENSION) continue;
          const distanceSquared = dx * dx + dz * dz;
          if (distanceSquared >= bestDistanceSquared) continue;
          bestDistanceSquared = distanceSquared;
          boundarySample = candidate;
          boundaryLateralOffset = dx * candidate.rightX + dz * candidate.rightZ;
        }
      }
      if (!boundarySample) return null;
      wallSample = boundarySample;
      lateralOffset = boundaryLateralOffset;
    }

    const radius = clamp(Number.isFinite(racerRadius) ? racerRadius : 0, 0, 20);
    const centerLimit = Math.max(
      wallSample.width * 0.72,
      wallSample.width + CANYON_INNER_EDGE_MARGIN - radius,
    );
    const distanceIntoWall = Math.abs(lateralOffset) - centerLimit;
    if (distanceIntoWall <= 0) return null;

    const side = lateralOffset >= 0 ? 1 : -1;
    return {
      id: `canyon-wall-${side > 0 ? 'right' : 'left'}`,
      kind: 'canyon-wall',
      progress: wallSample.progress,
      penetration: distanceIntoWall,
      normalX: -wallSample.rightX * side,
      normalZ: -wallSample.rightZ * side,
    };
  }

  getCornerPreview(progress: number, minimumDistance = 45, maximumDistance = 300): CornerPreview {
    const origin = this.sampleAtProgress(progress);
    let bestAngle = 0;
    let bestDistance = maximumDistance;
    let bestTag = origin.tag;
    const start = Math.max(12, minimumDistance);
    const end = Math.max(start, maximumDistance);
    for (let distance = start; distance <= end; distance += 18) {
      const ahead = this.sampleAtDistance(origin.distance + distance);
      const dot = clamp(origin.tangentX * ahead.tangentX + origin.tangentZ * ahead.tangentZ, -1, 1);
      // The camera looks along +course tangent: its screen-right axis is
      // (-tangentZ, tangentX), opposite the course's lateral-offset convention.
      const crossRight = origin.tangentX * ahead.tangentZ - origin.tangentZ * ahead.tangentX;
      const angle = Math.atan2(crossRight, dot);
      const weighted = Math.abs(angle) * (1.15 - 0.35 * (distance / end));
      const bestWeighted = Math.abs(bestAngle) * (1.15 - 0.35 * (bestDistance / end));
      if (weighted > bestWeighted) {
        bestAngle = angle;
        bestDistance = distance;
        bestTag = ahead.tag;
      }
    }
    const severity = clamp((Math.abs(bestAngle) - 0.08) / 1.35, 0, 1);
    return {
      direction: severity < 0.035 ? 'straight' : bestAngle > 0 ? 'right' : 'left',
      severity,
      distance: bestDistance,
      signedAngle: bestAngle,
      tag: bestTag,
    };
  }

  getResetPose(progress: number, forwardOffset = 7): PodracerRespawnPoseState {
    const sample = this.sampleAtDistance(wrapCourseProgress(progress) * this.totalLength + forwardOffset);
    return {
      x: sample.x,
      z: sample.z,
      y: null,
      yaw: Math.atan2(sample.tangentX, sample.tangentZ),
    };
  }

  getRenderData(sampleCount = 1024): CourseRenderData {
    const count = clamp(Math.floor(sampleCount), 128, 4096);
    const points = Array.from({ length: count }, (_, index) => {
      const sample = this.sampleAtProgress(index / count);
      return {
        x: sample.x,
        y: sample.y,
        z: sample.z,
        width: sample.width,
        progress: sample.progress,
        tag: sample.tag,
      };
    });
    const checkpointIndices = this.checkpoints.map((checkpoint) =>
      Math.round(checkpoint.progress * count) % count,
    );
    return {
      points,
      checkpointIndices,
      branches: this.branchDefinitions,
      region: this.region,
    };
  }

  getMinimapSamples(sampleCount = 256): readonly CourseMinimapPoint[] {
    const count = clamp(Math.floor(sampleCount), 64, 1024);
    return Array.from({ length: count }, (_, index) => {
      const sample = this.sampleAtProgress(index / count);
      return {
        x: sample.x,
        z: sample.z,
        width: sample.width,
        progress: sample.progress,
        tag: sample.tag,
      };
    });
  }

  getMinimapData(sampleCount = 256): CourseMinimapData {
    return {
      canonical: this.getMinimapSamples(sampleCount),
      branches: this.branchDefinitions,
    };
  }

  private evaluateParameter(parameter: number): CurveEvaluation {
    const count = this.controlPoints.length;
    const wrapped = ((parameter % count) + count) % count;
    const segment = Math.floor(wrapped) % count;
    const t = wrapped - Math.floor(wrapped);
    const p0 = this.controlPoints[wrapIndex(segment - 1, count)];
    const p1 = this.controlPoints[segment];
    const p2 = this.controlPoints[wrapIndex(segment + 1, count)];
    const p3 = this.controlPoints[wrapIndex(segment + 2, count)];
    if (!p0 || !p1 || !p2 || !p3) throw new Error('Invalid closed course control point lookup.');
    const x = catmullScalar(p0.x, p1.x, p2.x, p3.x, t);
    const z = catmullScalar(p0.z, p1.z, p2.z, p3.z, t);
    const width = p1.width + (p2.width - p1.width) * (t * t * (3 - 2 * t));
    return {
      x: x[0],
      z: z[0],
      dx: x[1],
      dz: z[1],
      ddx: x[2],
      ddz: z[2],
      width,
      tag: p1.tag,
    };
  }

  private evaluateAtDistance(distance: number): CurveEvaluation {
    let low = 0;
    let high = this.arcTable.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      const entry = this.arcTable[middle];
      if (entry && entry.distance <= distance) low = middle;
      else high = middle;
    }
    const before = this.arcTable[low];
    const after = this.arcTable[Math.min(high, this.arcTable.length - 1)];
    if (!before || !after) return this.evaluateParameter(0);
    const span = Math.max(1e-9, after.distance - before.distance);
    const amount = clamp((distance - before.distance) / span, 0, 1);
    return this.evaluateParameter(before.parameter + (after.parameter - before.parameter) * amount);
  }

  private buildArcTable(subdivisions: number): {
    entries: ArcEntry[];
    controlDistances: number[];
    totalLength: number;
  } {
    const entries: ArcEntry[] = [];
    const controlDistances = new Array<number>(this.controlPoints.length).fill(0);
    let distance = 0;
    let previous = this.evaluateParameter(0);
    entries.push({ parameter: 0, distance: 0, x: previous.x, z: previous.z });
    for (let segment = 0; segment < this.controlPoints.length; segment += 1) {
      controlDistances[segment] = distance;
      for (let division = 1; division <= subdivisions; division += 1) {
        const parameter = segment + division / subdivisions;
        const current = this.evaluateParameter(parameter);
        distance += Math.hypot(current.x - previous.x, current.z - previous.z);
        entries.push({ parameter, distance, x: current.x, z: current.z });
        previous = current;
      }
    }
    if (distance <= 1) throw new RangeError('Course arc length is too small.');
    return { entries, controlDistances, totalLength: distance };
  }
}

/**
 * Dense deterministic audit used by seed-sweep tests and generation receipts.
 * The report never mutates a course; invalid data is surfaced explicitly so a
 * caller can reject a custom authored fixture without relying on rendering.
 */
export function validatePodraceCourse(course: PodraceCourse): CourseGenerationReport {
  const audit = generatedPlanAudits.get(course.controlPoints)
    ?? auditGeneratedPlan(course.controlPoints, 16);
  const reasons: string[] = [];
  const profile = DESERT_REGIONS[course.region];
  const launchScore = launchCrestScore(course.controlPoints, {
    heightAt: (x, z) => course.heightAt(x, z),
  }, 0, 0);
  let maximumTerrainSlope = 0;
  let maximumStartCurvature = 0;
  for (let index = 0; index < 32; index += 1) {
    const sample = course.sampleAtProgress(index / 32);
    const ahead = course.sampleAtDistance(sample.distance + 12);
    maximumTerrainSlope = Math.max(
      maximumTerrainSlope,
      Math.abs(ahead.y - sample.y) / 12,
    );
    const distanceFromGrid = Math.min(sample.progress, 1 - sample.progress) * course.totalLength;
    if (distanceFromGrid < 90) {
      maximumStartCurvature = Math.max(maximumStartCurvature, Math.abs(sample.curvature));
    }
  }

  if (audit.length < 5_800 || audit.length > 10_300) reasons.push('length');
  if (audit.intersections > 0) reasons.push('self-intersection');
  if (audit.minimumClearance < 42) reasons.push('self-clearance');
  if (audit.maximumCurvature > 0.085) reasons.push('curvature');
  if (maximumStartCurvature > 0.028) reasons.push(`start-grid-curvature:${maximumStartCurvature.toFixed(3)}`);
  if (maximumTerrainSlope > profile.maximumCourseSlope) reasons.push(`terrain-slope:${maximumTerrainSlope.toFixed(3)}/${profile.maximumCourseSlope.toFixed(3)}`);
  if (course.seed !== null && launchScore < profile.minimumLaunchScore) reasons.push('launch-crest');
  if (course.seed !== null) {
    const branchReport = validateCourseBranches(course, course.branches);
    reasons.push(...branchReport.reasons.map((reason) => `branches:${reason}`));
  }

  return Object.freeze({
    valid: reasons.length === 0,
    reasons: Object.freeze(reasons),
    metrics: Object.freeze({
      length: audit.length,
      maximumCurvature: audit.maximumCurvature,
      minimumSelfClearance: audit.minimumClearance,
      launchScore,
      branchCount: course.branches.length,
    }),
  });
}

export function createPodraceCourse(
  terrain: HeightSampler,
  options: PodraceCourseOptions = {},
): PodraceCourse {
  return new PodraceCourse(terrain, options);
}

export function createProceduralPodraceCourse(
  terrain: HeightSampler,
  seed: number,
  options: ProceduralPodraceCourseOptions = {},
): PodraceCourse {
  const normalizedSeed = seed >>> 0;
  // The flagship circuit keeps its authored macro turns; daily/expedition retain seeded generation.
  const generated = normalizedSeed === 0x494e4b53
    ? PODRACE_CONTROL_POINTS
    : generatePodraceControlPoints(normalizedSeed);
  const region = desertRegionForSeed(normalizedSeed);
  const centre = generated.reduce(
    (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
    { x: 0, z: 0 },
  );
  centre.x /= generated.length;
  centre.z /= generated.length;
  const anchor = desertRegionAnchor(region.id, normalizedSeed);
  const placed = placeCourseLaunchOnCrest(
    generated,
    terrain,
    normalizedSeed,
    region.minimumLaunchScore,
    anchor.x - centre.x,
    anchor.z - centre.z,
  );
  // Translation cannot alter plan geometry, but asserting the exact object
  // passed to the constructor prevents any future placement/refactor from
  // silently bypassing the generation contract.
  if (!validateGeneratedControlPoints(placed)) {
    throw new Error(`Procedural course ${normalizedSeed} failed its construction geometry invariant.`);
  }
  return new PodraceCourse(terrain, {
    ...options,
    seed: normalizedSeed,
    region: region.id,
    controlPoints: placed,
  });
}

/** Useful for deterministic course fly-through cameras and authored flares. */
export function courseYaw(sample: Pick<CourseSample, 'tangentX' | 'tangentZ'>): number {
  const yaw = Math.atan2(sample.tangentX, sample.tangentZ) % TAU;
  return yaw < -Math.PI ? yaw + TAU : yaw;
}
