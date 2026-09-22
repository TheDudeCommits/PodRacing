import { wrapCourseProgress, type PodraceCourse } from '../../src/game/race/course';
import type { RaceEntryState } from '../../src/game/race/types';

/** Initial fixture placement only: pose and checkpoint history must describe
 * the same track section before a physics/combat test starts driving normally. */
export function stageRaceProgress(entry: RaceEntryState, course: PodraceCourse, at: number): void {
  const progress = wrapCourseProgress(at);
  const next = course.checkpoints.find(gate => gate.progress > progress)?.index ?? 0;
  entry.progress.courseProgress = progress;
  entry.progress.previousProgress = progress;
  entry.progress.unwrappedProgress = entry.progress.completedLaps + progress;
  entry.progress.nextCheckpointIndex = next;
  entry.progress.lastCheckpointIndex = (next - 1 + course.checkpoints.length) % course.checkpoints.length;
}
