import { checkpointHalfWidth } from './checkpointGeometry';
import { setPodracerRespawnPose } from '../simulation/podracer';
import type { CourseProjection, RaceEntryState, RacerProgressState, RaceEvent } from './types';
import { PodraceCourse, signedProgressDelta, wrapCourseProgress } from './course';

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function forwardArcDistance(from: number, to: number): number {
  return wrapCourseProgress(to - from);
}

export function createRacerProgressState(
  course: PodraceCourse,
  initialProgress: number,
): RacerProgressState {
  const wrapped = wrapCourseProgress(initialProgress);
  const resetPose = course.getResetPose(course.checkpoints[0]?.progress ?? 0, 7);
  return {
    courseProgress: wrapped,
    unwrappedProgress: wrapped > 0.75 ? wrapped - 1 : wrapped,
    previousProgress: wrapped,
    completedLaps: 0,
    currentLap: 1,
    nextCheckpointIndex: Math.min(1, Math.max(0, course.checkpoints.length - 1)),
    lastCheckpointIndex: 0,
    lapStartTime: 0,
    lastSplitTime: 0,
    lapTimes: [],
    splits: [],
    finishTime: null,
    placement: null,
    wrongWay: false,
    wrongWayTimer: 0,
    offCourseDistance: 0,
    lateralOffset: 0,
    cornerPreview: course.getCornerPreview(wrapped),
    resetPose,
  };
}

export interface ProgressUpdateOptions {
  delta: number;
  raceTime: number;
  totalLaps: number;
  /** Normally guards against teleports/shortcuts; tests and replay repair may override it. */
  maximumProgressDelta?: number;
  /** Reuse the same current-pose projection when surface effects also need it. */
  projection?: CourseProjection;
  /** Actual pose before this fixed tick, used for a swept gate-plane crossing. */
  previousPosition?: Readonly<{ x: number; z: number }>;
  /** Recovery moves the craft but cannot cross or award any checkpoints. */
  recovered?: boolean;
}

/**
 * Projects one vehicle onto the course and advances checkpoint/lap truth.
 * Placement and finish events are assigned by RaceSimulation after the full
 * racers have moved, avoiding iteration-order bias in standings.
 */
export function updateRacerProgress(
  entry: RaceEntryState,
  course: PodraceCourse,
  options: ProgressUpdateOptions,
): RaceEvent[] {
  if (entry.status === 'finished') return [];
  const events: RaceEvent[] = [];
  const progress = entry.progress;
  const projection = options.projection ?? course.projectPoint(
    entry.vehicle.position.x,
    entry.vehicle.position.z,
    progress.courseProgress,
  );
  const rawDelta = signedProgressDelta(progress.courseProgress, projection.progress);
  const physicallyPlausibleDelta = Math.max(
    0.0015,
    entry.vehicle.telemetry.speed * Math.max(0, options.delta) / course.totalLength * 4 + 0.0005,
  );
  const maximumDelta = options.maximumProgressDelta ?? physicallyPlausibleDelta;
  const acceptedDelta = Math.abs(rawDelta) <= maximumDelta ? rawDelta : 0;
  const previous = progress.courseProgress;

  progress.previousProgress = previous;
  progress.courseProgress = projection.progress;

  progress.lateralOffset = projection.lateralOffset;
  progress.offCourseDistance = Math.max(0, Math.abs(projection.lateralOffset) - projection.width);
  progress.cornerPreview = course.getCornerPreview(projection.progress);

  if (!options.recovered && acceptedDelta > 0 && course.checkpoints.length > 0) {
    // One physical 120 Hz tick cannot reach many gates, but the loop also
    // supports deterministic replay catch-up without relaxing gate ordering.
    let remainingArc = acceptedDelta;
    let cursor = previous;
    for (let guard = 0; guard < course.checkpoints.length && remainingArc > 0; guard += 1) {
      const expected = course.checkpoints[progress.nextCheckpointIndex];
      if (!expected) break;
      const toCheckpoint = forwardArcDistance(cursor, expected.progress);
      let crossingLateral = projection.lateralOffset;
      if (options.previousPosition) {
        // Test the segment actually driven against the exact rendered plane.
        // Nearest-spline progress can cross slightly early/late on a bend.
        const before = options.previousPosition;
        const after = entry.vehicle.position;
        const beforeAlong = (before.x - expected.x) * expected.tangentX
          + (before.z - expected.z) * expected.tangentZ;
        const afterAlong = (after.x - expected.x) * expected.tangentX
          + (after.z - expected.z) * expected.tangentZ;
        if (beforeAlong > 1e-6 || afterAlong < 0 || afterAlong <= beforeAlong) break;
        if (Math.abs(signedProgressDelta(expected.progress, projection.progress)) > maximumDelta * 2) break;
        const fraction = clamp(-beforeAlong / (afterAlong - beforeAlong), 0, 1);
        crossingLateral = (before.x + (after.x - before.x) * fraction - expected.x) * expected.rightX
          + (before.z + (after.z - before.z) * fraction - expected.z) * expected.rightZ;
      } else if (toCheckpoint > remainingArc + 1e-7) break;
      if (Math.abs(crossingLateral) > checkpointHalfWidth(expected.width)) break;

      const split = Math.max(0, options.raceTime - progress.lastSplitTime);
      progress.splits.push({
        lap: progress.completedLaps + 1,
        checkpointIndex: expected.index,
        raceTime: options.raceTime,
        segmentTime: split,
      });
      progress.lastSplitTime = options.raceTime;
      progress.lastCheckpointIndex = expected.index;
      progress.nextCheckpointIndex = (expected.index + 1) % course.checkpoints.length;
      progress.resetPose = course.getResetPose(expected.progress, 8);
      setPodracerRespawnPose(entry.vehicle, progress.resetPose);
      events.push({
        type: 'checkpoint',
        racerId: entry.id,
        checkpointIndex: expected.index,
        lap: progress.completedLaps + 1,
        split,
      });

      if (expected.index === 0) {
        const lap = progress.completedLaps + 1;
        const lapTime = Math.max(0, options.raceTime - progress.lapStartTime);
        progress.completedLaps = lap;
        progress.currentLap = Math.min(options.totalLaps, lap + 1);
        progress.lapTimes.push(lapTime);
        progress.lapStartTime = options.raceTime;
        events.push({ type: 'lap-complete', racerId: entry.id, lap, lapTime });
        if (lap >= options.totalLaps) {
          progress.finishTime = options.raceTime;
          entry.status = 'finished';
        }
      }

      cursor = expected.progress;
      remainingArc -= toCheckpoint;
    }
  }

  // This is a position on the validated lap, not an odometer. Integrating
  // movement but ignoring reset jumps used to keep the old distance, allowing
  // repeated recovery to manufacture an invisible lead over nearby racers.
  const lastGate = course.checkpoints[progress.lastCheckpointIndex];
  const nextGate = course.checkpoints[progress.nextCheckpointIndex];
  if (lastGate && nextGate) {
    const offset = signedProgressDelta(lastGate.progress, projection.progress);
    const segmentLength = forwardArcDistance(lastGate.progress, nextGate.progress);
    const positionScore = progress.completedLaps + lastGate.progress + Math.min(offset, segmentLength);
    // A rejected forward teleport cannot improve rank. A recovery immediately
    // loses the distance it actually moved backward, without awarding a gate.
    progress.unwrappedProgress = Math.abs(rawDelta) <= maximumDelta || options.recovered
      ? positionScore
      : Math.min(progress.unwrappedProgress, positionScore);
  }

  const speed = Math.hypot(entry.vehicle.velocity.x, entry.vehicle.velocity.z);
  const motionAlongCourse =
    entry.vehicle.velocity.x * projection.tangentX +
    entry.vehicle.velocity.z * projection.tangentZ;
  const movingBackward =
    speed > 12 &&
    (motionAlongCourse < -speed * 0.28 || acceptedDelta < -0.00001);
  progress.wrongWayTimer = movingBackward
    ? clamp(progress.wrongWayTimer + options.delta, 0, 5)
    : clamp(progress.wrongWayTimer - options.delta * 2.4, 0, 5);
  const wasWrongWay = progress.wrongWay;
  if (!progress.wrongWay && progress.wrongWayTimer >= 0.62) progress.wrongWay = true;
  if (progress.wrongWay && progress.wrongWayTimer <= 0.14) progress.wrongWay = false;
  if (wasWrongWay !== progress.wrongWay) {
    events.push({ type: 'wrong-way', racerId: entry.id, active: progress.wrongWay });
  }

  return events;
}

export function racerRaceScore(entry: Pick<RaceEntryState, 'progress'>): number {
  return entry.progress.unwrappedProgress;
}
