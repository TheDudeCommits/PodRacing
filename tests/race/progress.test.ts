import { describe, expect, it } from 'vitest';
import { createPodracerState } from '../../src/game/simulation/podracer';
import type { HeightSampler } from '../../src/game/simulation/types';
import {
  createPodraceCourse,
  createRacerProgressState,
  updateRacerProgress,
  type RaceEntryState,
  type RaceEvent,
} from '../../src/game/race';

const flat: HeightSampler = { heightAt: () => 0 };

function makeEntry(): { course: ReturnType<typeof createPodraceCourse>; entry: RaceEntryState } {
  const course = createPodraceCourse(flat);
  const start = course.sampleAtProgress(0.999);
  const vehicle = createPodracerState({
    id: 'test-racer',
    terrain: flat,
    position: { x: start.x, z: start.z },
    yaw: Math.atan2(start.tangentX, start.tangentZ),
  });
  return {
    course,
    entry: {
      id: 'test-racer',
      name: 'Test Racer',
      isPlayer: true,
      status: 'racing',
      vehicle,
      progress: createRacerProgressState(course, start.progress),
      ai: null,
    },
  };
}

function crossExpectedCheckpoint(
  entry: RaceEntryState,
  course: ReturnType<typeof createPodraceCourse>,
  raceTime: number,
): RaceEvent[] {
  const checkpoint = course.checkpoints[entry.progress.nextCheckpointIndex];
  if (!checkpoint) throw new Error('Expected checkpoint missing.');
  const epsilon = 0.00035;
  entry.progress.courseProgress = (checkpoint.progress - epsilon + 1) % 1;
  entry.progress.previousProgress = entry.progress.courseProgress;
  const after = course.sampleAtProgress(checkpoint.progress + epsilon);
  entry.vehicle.position.x = after.x;
  entry.vehicle.position.z = after.z;
  entry.vehicle.orientation.yaw = Math.atan2(after.tangentX, after.tangentZ);
  entry.vehicle.velocity.x = after.tangentX * 80;
  entry.vehicle.velocity.z = after.tangentZ * 80;
  entry.vehicle.telemetry.speed = 80;
  return updateRacerProgress(entry, course, {
    delta: 1 / 120,
    raceTime,
    totalLaps: 3,
    maximumProgressDelta: 0.002,
  });
}

describe('checkpoint and lap progression', () => {
  it('requires ordered checkpoints and rejects implausible shortcut teleports', () => {
    const { course, entry } = makeEntry();
    const expected = entry.progress.nextCheckpointIndex;
    const skipped = course.checkpoints[(expected + 1) % course.checkpoints.length];
    expect(skipped).toBeDefined();
    if (!skipped) return;
    const atSkipped = course.sampleAtProgress(skipped.progress + 0.0002);
    entry.vehicle.position.x = atSkipped.x;
    entry.vehicle.position.z = atSkipped.z;
    updateRacerProgress(entry, course, { delta: 1 / 120, raceTime: 2, totalLaps: 3 });
    expect(entry.progress.nextCheckpointIndex).toBe(expected);
    expect(entry.progress.splits).toHaveLength(0);

    const events = crossExpectedCheckpoint(entry, course, 5);
    expect(events.some((event) => event.type === 'checkpoint')).toBe(true);
    expect(entry.progress.nextCheckpointIndex).toBe((expected + 1) % course.checkpoints.length);
    expect(entry.progress.resetPose.x).toBeCloseTo(entry.vehicle.respawn.x, 10);
    expect(entry.progress.resetPose.z).toBeCloseTo(entry.vehicle.respawn.z, 10);
    expect(entry.progress.resetPose.y).toBe(entry.vehicle.respawn.y);
    expect(entry.progress.resetPose.yaw).toBeCloseTo(entry.vehicle.respawn.yaw, 10);
  });

  it('does not award a checkpoint when the racer passes outside its gate', () => {
    const { course, entry } = makeEntry();
    const expectedIndex = entry.progress.nextCheckpointIndex;
    const checkpoint = course.checkpoints[expectedIndex]!;
    const epsilon = 0.00035;
    entry.progress.courseProgress = (checkpoint.progress - epsilon + 1) % 1;
    entry.progress.previousProgress = entry.progress.courseProgress;
    const after = course.sampleAtProgress(checkpoint.progress + epsilon);
    const outside = checkpoint.width + 18;
    entry.vehicle.position.x = after.x + after.rightX * outside;
    entry.vehicle.position.z = after.z + after.rightZ * outside;
    entry.vehicle.velocity.x = after.tangentX * 80;
    entry.vehicle.velocity.z = after.tangentZ * 80;
    entry.vehicle.telemetry.speed = 80;

    const events = updateRacerProgress(entry, course, {
      delta: 1 / 120,
      raceTime: 5,
      totalLaps: 3,
      maximumProgressDelta: 0.002,
    });
    expect(events.some((event) => event.type === 'checkpoint')).toBe(false);
    expect(entry.progress.nextCheckpointIndex).toBe(expectedIndex);
    expect(entry.progress.splits).toHaveLength(0);
  });

  it('records checkpoint splits, exactly three laps, finish time and ordered lap events', () => {
    const { course, entry } = makeEntry();
    const events: RaceEvent[] = [];
    let raceTime = 0;
    const crossings = course.checkpoints.length * 3;
    for (let index = 0; index < crossings; index += 1) {
      raceTime += 7.25 + index * 0.01;
      events.push(...crossExpectedCheckpoint(entry, course, raceTime));
    }
    expect(entry.progress.completedLaps).toBe(3);
    expect(entry.progress.currentLap).toBe(3);
    expect(entry.progress.lapTimes).toHaveLength(3);
    expect(entry.progress.splits).toHaveLength(crossings);
    expect(entry.progress.finishTime).toBeCloseTo(raceTime, 8);
    expect(entry.status).toBe('finished');
    expect(events.filter((event) => event.type === 'lap-complete')).toHaveLength(3);
  });

  it('detects sustained reverse travel, clears the warning, and measures off-course distance', () => {
    const { course, entry } = makeEntry();
    const onCourse = course.sampleAtProgress(0.18);
    entry.progress.courseProgress = onCourse.progress;
    entry.vehicle.position.x = onCourse.x;
    entry.vehicle.position.z = onCourse.z;
    entry.vehicle.velocity.x = -onCourse.tangentX * 70;
    entry.vehicle.velocity.z = -onCourse.tangentZ * 70;
    entry.vehicle.telemetry.speed = 70;
    let events: RaceEvent[] = [];
    for (let step = 0; step < 90; step += 1) {
      events = events.concat(updateRacerProgress(entry, course, {
        delta: 1 / 120,
        raceTime: step / 120,
        totalLaps: 3,
      }));
    }
    expect(entry.progress.wrongWay).toBe(true);
    expect(events).toContainEqual({ type: 'wrong-way', racerId: entry.id, active: true });

    entry.vehicle.velocity.x = onCourse.tangentX * 70;
    entry.vehicle.velocity.z = onCourse.tangentZ * 70;
    for (let step = 0; step < 90; step += 1) {
      events = events.concat(updateRacerProgress(entry, course, {
        delta: 1 / 120,
        raceTime: 1 + step / 120,
        totalLaps: 3,
      }));
    }
    expect(entry.progress.wrongWay).toBe(false);
    expect(events).toContainEqual({ type: 'wrong-way', racerId: entry.id, active: false });

    entry.vehicle.position.x = onCourse.x + onCourse.rightX * (onCourse.width + 14);
    entry.vehicle.position.z = onCourse.z + onCourse.rightZ * (onCourse.width + 14);
    updateRacerProgress(entry, course, { delta: 1 / 120, raceTime: 2, totalLaps: 3 });
    expect(entry.progress.offCourseDistance).toBeGreaterThan(11);
  });
});
