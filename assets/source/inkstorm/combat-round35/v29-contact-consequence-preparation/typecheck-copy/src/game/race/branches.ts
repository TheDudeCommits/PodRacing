import type {
  CourseBranchDefinition,
  CourseBranchKind,
  CourseBranchPoint,
  CourseCheckpoint,
  CourseProjection,
  CourseSample,
  DesertRegionId,
} from './types';
import { DESERT_REGIONS } from './regions';
import { INKSTORM_BRIDGE_RISE, INKSTORM_BRIDGE_SEED } from './bridgeSurface';

interface BranchCourseSampler {
  readonly totalLength: number;
  readonly checkpoints: readonly Pick<CourseCheckpoint, 'progress'>[];
  sampleAtProgress(progress: number): CourseSample;
  samplePlanAtProgress(progress: number): CourseSample;
  projectPoint(x: number, z: number, hintProgress?: number): CourseProjection;
  heightAt(x: number, z: number): number;
}

interface GapCandidate {
  start: number;
  end: number;
  span: number;
  length: number;
  chord: number;
  curveExcess: number;
  tags: ReadonlySet<string>;
}

const BRANCH_SAMPLE_COUNT = 25;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function mixSeed(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) || 0x6d2b79f5;
}

function nextRandom(state: { value: number }): number {
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = (value >>> 0) || 0x6d2b79f5;
  return state.value / 0x1_0000_0000;
}

function gapCandidates(course: BranchCourseSampler): GapCandidate[] {
  const candidates: GapCandidate[] = [];
  for (let index = 0; index + 1 < course.checkpoints.length; index += 1) {
    const from = course.checkpoints[index]?.progress;
    const to = course.checkpoints[index + 1]?.progress;
    if (from === undefined || to === undefined || to <= from) continue;
    const span = to - from;
    const checkpointGapLength = span * course.totalLength;
    if (checkpointGapLength < 430 || checkpointGapLength > 1_260) continue;
    const entry = from + span * 0.16;
    const exit = to - span * 0.16;
    const start = course.samplePlanAtProgress(entry);
    const end = course.samplePlanAtProgress(exit);
    const chord = Math.hypot(end.x - start.x, end.z - start.z);
    const tags = new Set<string>();
    for (let probe = 0; probe <= 12; probe += 1) {
      tags.add(course.samplePlanAtProgress(from + span * probe / 12).tag);
    }
    const routeLength = (exit - entry) * course.totalLength;
    candidates.push({
      start: entry,
      end: exit,
      span: exit - entry,
      length: routeLength,
      chord,
      curveExcess: routeLength / Math.max(1, chord),
      tags,
    });
  }
  return candidates;
}

function gapScore(kind: CourseBranchKind, gap: GapCandidate): number {
  switch (kind) {
    case 'jump':
      return (gap.tags.has('launch-crest') ? 12 : 0)
        + (gap.tags.has('fast-straight') ? 2 : 0)
        + gap.chord / Math.max(1, gap.length);
    case 'shortcut':
      return gap.curveExcess * 7
        + (gap.tags.has('wide-sweeper') ? 4 : 0)
        + (gap.tags.has('hairpin') ? 5 : 0)
        + (gap.tags.has('chicane') ? 2 : 0);
    case 'salvage':
      return (gap.tags.has('fast-straight') ? 6 : 0)
        + (gap.tags.has('recovery-straight') ? 5 : 0)
        + gap.length / 500;
    case 'technical':
      return (gap.tags.has('chicane') ? 8 : 0)
        - (gap.tags.has('narrow-canyon') ? 12 : 0)
        + (gap.tags.has('wide-sweeper') ? 3 : 0);
    case 'safe':
      return (gap.tags.has('hairpin') ? 6 : 0)
        + (gap.tags.has('wide-sweeper') ? 5 : 0)
        - (gap.tags.has('narrow-canyon') ? 12 : 0)
        + gap.length / 700;
  }
}

function branchTune(kind: CourseBranchKind): Readonly<{
  label: string;
  width: number;
  offset: number;
  risk: number;
  reward: number;
}> {
  switch (kind) {
    case 'shortcut': return { label: 'Razor Cut', width: 11.5, offset: 42, risk: 0.82, reward: 0.9 };
    case 'jump': return { label: 'Skybreak Ramp', width: 13.5, offset: 48, risk: 0.76, reward: 0.84 };
    case 'salvage': return { label: 'Salvage Run', width: 17, offset: 72, risk: 0.48, reward: 0.72 };
    case 'technical': return { label: 'Needle Thread', width: 10.5, offset: 38, risk: 0.9, reward: 0.78 };
    case 'safe': return { label: 'Shelter Line', width: 22, offset: 86, risk: 0.18, reward: 0.2 };
  }
}

function hermite(
  p0: number,
  p1: number,
  m0: number,
  m1: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0
    + (t3 - 2 * t2 + t) * m0
    + (-2 * t3 + 3 * t2) * p1
    + (t3 - t2) * m1;
}

function makeBranch(
  course: BranchCourseSampler,
  gap: GapCandidate,
  kind: CourseBranchKind,
  seed: number,
  ordinal: number,
  sideOverride?: -1 | 1,
): CourseBranchDefinition {
  const tune = branchTune(kind);
  const random = { value: mixSeed(seed ^ Math.imul(ordinal + 1, 0x85ebca6b)) };
  const randomSide = nextRandom(random) < 0.5 ? -1 : 1;
  const side = sideOverride ?? randomSide;
  const amplitude = tune.offset * (0.86 + nextRandom(random) * 0.3);
  const start = course.samplePlanAtProgress(gap.start);
  const end = course.samplePlanAtProgress(gap.end);
  const chord = Math.max(1, Math.hypot(end.x - start.x, end.z - start.z));
  const handle = Math.min(gap.length * 0.38, chord * 0.68);
  const shortcutBow = kind === 'shortcut' ? amplitude * 0.28 : 0;
  const points: CourseBranchPoint[] = [];

  for (let index = 0; index < BRANCH_SAMPLE_COUNT; index += 1) {
    const t = index / (BRANCH_SAMPLE_COUNT - 1);
    const canonicalProgress = gap.start + gap.span * t;
    const canonical = course.samplePlanAtProgress(canonicalProgress);
    const envelope = Math.sin(Math.PI * t);
    let x: number;
    let z: number;
    if (kind === 'shortcut') {
      x = hermite(
        start.x,
        end.x,
        start.tangentX * handle,
        end.tangentX * handle,
        t,
      );
      z = hermite(
        start.z,
        end.z,
        start.tangentZ * handle,
        end.tangentZ * handle,
        t,
      );
      const chordRightX = (end.z - start.z) / chord;
      const chordRightZ = -(end.x - start.x) / chord;
      x += chordRightX * side * shortcutBow * envelope;
      z += chordRightZ * side * shortcutBow * envelope;
    } else {
      const secondary = kind === 'technical'
        ? Math.sin(t * Math.PI * 2) * amplitude * 0.06
        : kind === 'salvage'
          ? Math.sin(t * Math.PI * 2) * amplitude * 0.16
          : 0;
      const offset = side * amplitude * envelope + secondary * envelope;
      x = canonical.x + canonical.rightX * offset;
      z = canonical.z + canonical.rightZ * offset;
    }
    points.push(Object.freeze({
      x,
      y: course.heightAt(x, z),
      z,
      width: tune.width * (1 - Math.sin(Math.PI * t) * (kind === 'technical' ? 0.12 : 0)),
      canonicalProgress,
      routeProgress: t,
    }));
  }

  const id = `branch-${ordinal + 1}-${kind}`;
  return Object.freeze({
    id,
    kind,
    label: tune.label,
    entryProgress: gap.start,
    exitProgress: gap.end,
    risk: tune.risk,
    reward: tune.reward,
    points: Object.freeze(points),
  });
}

function polylineLength(points: readonly CourseBranchPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (previous && point) length += Math.hypot(point.x - previous.x, point.z - previous.z);
  }
  return length;
}

/** Separate the actual choices before the bridge rises across the ground-road view. */
function openFlagshipForkApproach(course: BranchCourseSampler, branch: CourseBranchDefinition): CourseBranchDefinition {
  const points = branch.points.map(point => {
    const t = point.routeProgress;
    if (t <= 0 || t >= .5) return point;
    const main = course.samplePlanAtProgress(point.canonicalProgress);
    const side = Math.sign((point.x - main.x) * main.rightX + (point.z - main.z) * main.rightZ) || 1;
    const offset = Math.sin(t / .5 * Math.PI) ** 2 * 24 * side;
    const x = point.x + main.rightX * offset, z = point.z + main.rightZ * offset;
    return Object.freeze({ ...point, x, z, y: course.heightAt(x, z) });
  });
  return Object.freeze({ ...branch, points: Object.freeze(points) });
}

function elevateFlagshipShortcut(branch: CourseBranchDefinition): CourseBranchDefinition {
  let smooth = branch.points.map((point) => point.y);
  // A supported deck should not reproduce every small dune underneath it.
  // Pin both joins while smoothing the existing terrain grade before lifting.
  for (let pass = 0; pass < 3; pass += 1) {
    smooth = smooth.map((height, index, heights) => index === 0 || index === heights.length - 1
      ? height : heights[index - 1]! * 0.25 + height * 0.5 + heights[index + 1]! * 0.25);
  }
  // Use one global rise rather than clipping individual high samples, which
  // would introduce a dip/kink at the top of the viaduct.
  let rise = INKSTORM_BRIDGE_RISE;
  for (let index = 1; index < branch.points.length - 1; index += 1) {
    const point = branch.points[index]!;
    const envelope = Math.sin(Math.PI * point.routeProgress) ** 2;
    rise = Math.min(rise, (INKSTORM_BRIDGE_RISE - smooth[index]! + point.y) / envelope);
  }
  const points = branch.points.map((point, index) => {
    const lift = rise * Math.sin(Math.PI * point.routeProgress) ** 2;
    const y = index === 0 || index === branch.points.length - 1 ? point.y
      : Math.max(point.y, smooth[index]! + lift);
    return Object.freeze({ ...point, y });
  });
  return Object.freeze({ ...branch, elevated: true, points: Object.freeze(points) });
}

function branchSegmentsCross(
  a: CourseBranchPoint,
  b: CourseBranchPoint,
  c: CourseBranchPoint,
  d: CourseBranchPoint,
): boolean {
  const abC = branchOrientation(a, b, c);
  const abD = branchOrientation(a, b, d);
  const cdA = branchOrientation(c, d, a);
  const cdB = branchOrientation(c, d, b);
  const epsilon = 1e-5;
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}

function branchOrientation(
  first: CourseBranchPoint,
  second: CourseBranchPoint,
  third: CourseBranchPoint,
): number {
  return (second.x - first.x) * (third.z - first.z)
    - (second.z - first.z) * (third.x - first.x);
}

function branchSelfIntersects(points: readonly CourseBranchPoint[]): boolean {
  for (let first = 0; first + 1 < points.length; first += 1) {
    const a = points[first];
    const b = points[first + 1];
    if (!a || !b) continue;
    for (let second = first + 2; second + 1 < points.length; second += 1) {
      const c = points[second];
      const d = points[second + 1];
      if (c && d && branchSegmentsCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function maximumBranchTurnRate(points: readonly CourseBranchPoint[]): number {
  let maximum = 0;
  for (let index = 1; index + 1 < points.length; index += 1) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    const next = points[index + 1]!;
    const incomingX = point.x - previous.x;
    const incomingZ = point.z - previous.z;
    const outgoingX = next.x - point.x;
    const outgoingZ = next.z - point.z;
    const incomingLength = Math.max(1e-6, Math.hypot(incomingX, incomingZ));
    const outgoingLength = Math.max(1e-6, Math.hypot(outgoingX, outgoingZ));
    const turn = Math.abs(Math.atan2(
      incomingX * outgoingZ - incomingZ * outgoingX,
      incomingX * outgoingX + incomingZ * outgoingZ,
    ));
    maximum = Math.max(
      maximum,
      turn / Math.max(1, (incomingLength + outgoingLength) * 0.5),
    );
  }
  return maximum;
}

function branchCandidateIsUsable(
  course: BranchCourseSampler,
  branch: CourseBranchDefinition,
): boolean {
  if (branchSelfIntersects(branch.points)) return false;
  if (maximumBranchTurnRate(branch.points) > 0.12) return false;
  const canonicalLength = (branch.exitProgress - branch.entryProgress) * course.totalLength;
  const routeLength = polylineLength(branch.points);
  if (branch.kind === 'shortcut' && routeLength >= canonicalLength * 0.98) return false;
  if (branch.kind === 'safe' && routeLength < canonicalLength * 0.99) return false;
  for (let probe = 0; probe <= 8; probe += 1) {
    const progress = branch.entryProgress
      + (branch.exitProgress - branch.entryProgress) * probe / 8;
    if (course.samplePlanAtProgress(progress).tag === 'narrow-canyon') return false;
  }
  return branch.points.every((point) => point.width >= 8 && point.width <= 26);
}

export interface CourseBranchValidationReport {
  valid: boolean;
  reasons: readonly string[];
}

export function validateCourseBranches(
  course: BranchCourseSampler,
  branches: readonly CourseBranchDefinition[],
): CourseBranchValidationReport {
  const reasons: string[] = [];
  if (branches.length < 2 || branches.length > 3) reasons.push('branch-count');
  const usedIntervals: Array<readonly [number, number]> = [];
  for (const branch of branches) {
    if (branch.points.length < 16) reasons.push(`${branch.id}:sample-count`);
    if (!(branch.entryProgress < branch.exitProgress)) reasons.push(`${branch.id}:progress-order`);
    for (let index = 1; index < branch.points.length; index += 1) {
      const previous = branch.points[index - 1];
      const point = branch.points[index];
      if (!previous || !point) continue;
      if (!(point.canonicalProgress > previous.canonicalProgress)) {
        reasons.push(`${branch.id}:non-monotonic`);
        break;
      }
    }
    const first = branch.points[0];
    const last = branch.points.at(-1);
    const entry = course.samplePlanAtProgress(branch.entryProgress);
    const exit = course.samplePlanAtProgress(branch.exitProgress);
    if (!first || Math.hypot(first.x - entry.x, first.z - entry.z) > 0.5) {
      reasons.push(`${branch.id}:entry-disconnected`);
    }
    if (!last || Math.hypot(last.x - exit.x, last.z - exit.z) > 0.5) {
      reasons.push(`${branch.id}:exit-disconnected`);
    }
    const canonicalLength = (branch.exitProgress - branch.entryProgress) * course.totalLength;
    const routeLength = polylineLength(branch.points);
    if (branch.kind === 'shortcut' && routeLength >= canonicalLength * 0.98) {
      reasons.push(`${branch.id}:not-a-shortcut`);
    }
    if (branch.kind === 'safe' && routeLength < canonicalLength * 0.99) {
      reasons.push(`${branch.id}:unsafe-length`);
    }
    if (branchSelfIntersects(branch.points)) reasons.push(`${branch.id}:self-intersection`);
    for (let probe = 0; probe <= 8; probe += 1) {
      const progress = branch.entryProgress
        + (branch.exitProgress - branch.entryProgress) * probe / 8;
      if (course.samplePlanAtProgress(progress).tag !== 'narrow-canyon') continue;
      reasons.push(`${branch.id}:canyon-occlusion`);
      break;
    }
    if (branch.risk < 0 || branch.risk > 1 || branch.reward < 0 || branch.reward > 1) {
      reasons.push(`${branch.id}:risk-reward-range`);
    }
    let maximumDivergence = 0;
    let maximumTurnRate = 0;
    for (let index = 0; index < branch.points.length; index += 1) {
      const point = branch.points[index];
      if (!point) continue;
      const canonical = course.samplePlanAtProgress(point.canonicalProgress);
      maximumDivergence = Math.max(
        maximumDivergence,
        Math.hypot(point.x - canonical.x, point.z - canonical.z),
      );
      if (point.width < 8 || point.width > 26) reasons.push(`${branch.id}:width`);
    }
    maximumTurnRate = maximumBranchTurnRate(branch.points);
    if (maximumDivergence < 8) reasons.push(`${branch.id}:not-geometric`);
    if (maximumTurnRate > 0.12) reasons.push(`${branch.id}:curvature`);
    if (branch.points.some((point) => ![
      point.x, point.y, point.z, point.width, point.canonicalProgress,
    ].every(Number.isFinite))) reasons.push(`${branch.id}:non-finite`);
    for (const [start, end] of usedIntervals) {
      if (Math.max(start, branch.entryProgress) < Math.min(end, branch.exitProgress)) {
        reasons.push(`${branch.id}:overlap`);
      }
    }
    usedIntervals.push([branch.entryProgress, branch.exitProgress]);
  }
  return Object.freeze({ valid: reasons.length === 0, reasons: Object.freeze(reasons) });
}

/** Creates three deterministic, checkpoint-safe risk/reward decisions. */
export function generateCourseBranches(
  course: BranchCourseSampler,
  seed: number,
  region: DesertRegionId,
): readonly CourseBranchDefinition[] {
  const gaps = gapCandidates(course);
  const preferred = DESERT_REGIONS[region].preferredBranches;
  const branchPriority: Readonly<Record<CourseBranchKind, number>> = {
    shortcut: 0,
    jump: 1,
    technical: 2,
    safe: 3,
    salvage: 4,
  };
  // Reserve the high-excess hairpin gap for a real shortcut before a safe
  // bypass can consume it. IDs remain deterministic; semantic order is not a
  // checkpoint contract.
  const kinds = [...preferred.slice(0, 3)].sort((left, right) => (
    branchPriority[left] - branchPriority[right]
  ));
  const used = new Set<GapCandidate>();
  const branches: CourseBranchDefinition[] = [];
  for (let ordinal = 0; ordinal < kinds.length; ordinal += 1) {
    const kind = kinds[ordinal] ?? 'technical';
    const ranked = gaps
      // Authored canyon walls are solid on both sides. Alternate routes use
      // the many open-desert gaps, so no generated line can visually tunnel
      // through a continuous cliff module.
      .filter((gap) => !used.has(gap) && !gap.tags.has('narrow-canyon'))
      .sort((left, right) => gapScore(kind, right) - gapScore(kind, left));
    let selectedGap: GapCandidate | null = null;
    let selectedBranch: CourseBranchDefinition | null = null;
    for (const gap of ranked) {
      let branch = makeBranch(course, gap, kind, seed, ordinal);
      if (kind === 'safe') {
        const left = makeBranch(course, gap, kind, seed, ordinal, -1);
        const right = makeBranch(course, gap, kind, seed, ordinal, 1);
        branch = polylineLength(left.points) >= polylineLength(right.points) ? left : right;
      }
      if (!branchCandidateIsUsable(course, branch)) continue;
      selectedGap = gap;
      selectedBranch = branch;
      break;
    }
    if (!selectedGap || !selectedBranch) continue;
    used.add(selectedGap);
    branches.push(seed === INKSTORM_BRIDGE_SEED && branches.length === 0 && selectedBranch.kind === 'shortcut'
      ? elevateFlagshipShortcut(openFlagshipForkApproach(course, selectedBranch)) : selectedBranch);
  }
  const report = validateCourseBranches(course, branches);
  if (report.valid) return Object.freeze(branches);

  // Exotic authored fixtures may not expose three canyon-free checkpoint
  // gaps. Keep the deterministic best-effort graph and surface every defect
  // through `generationReport` instead of crashing course construction.
  return Object.freeze(branches);
}

export function nearestBranchProjection(
  branches: readonly CourseBranchDefinition[],
  x: number,
  z: number,
  hintProgress?: number,
): Readonly<{
  branch: CourseBranchDefinition;
  point: CourseBranchPoint;
  next: CourseBranchPoint;
  distanceSquared: number;
  amount: number;
}> | null {
  let best: {
    branch: CourseBranchDefinition;
    point: CourseBranchPoint;
    next: CourseBranchPoint;
    distanceSquared: number;
    amount: number;
  } | null = null;
  for (const branch of branches) {
    if (hintProgress !== undefined && Number.isFinite(hintProgress)) {
      const margin = 0.035;
      if (hintProgress < branch.entryProgress - margin || hintProgress > branch.exitProgress + margin) continue;
    }
    for (let index = 0; index + 1 < branch.points.length; index += 1) {
      const point = branch.points[index];
      const next = branch.points[index + 1];
      if (!point || !next) continue;
      const dx = next.x - point.x;
      const dz = next.z - point.z;
      const lengthSquared = Math.max(1e-9, dx * dx + dz * dz);
      const amount = clamp(((x - point.x) * dx + (z - point.z) * dz) / lengthSquared, 0, 1);
      const projectedX = point.x + dx * amount;
      const projectedZ = point.z + dz * amount;
      const distanceSquared = (x - projectedX) ** 2 + (z - projectedZ) ** 2;
      if (!best || distanceSquared < best.distanceSquared) {
        best = { branch, point, next, distanceSquared, amount };
      }
    }
  }
  return best;
}
