import { createProceduralPodraceCourse, type ProceduralPodraceCourseOptions } from '../../src/game/race/course';
import type { HeightSampler } from '../../src/game/simulation/types';
/** Archived course-10 geometry receipts deliberately exercise the old branch opt-in.
 * New race/no-shortcut guarantees are tested against the default factory separately. */
export function legacyBranchedCourse(terrain: HeightSampler, seed: number, options: ProceduralPodraceCourseOptions = {}) {
  return createProceduralPodraceCourse(terrain, seed, { ...options, enableBranches: true });
}
