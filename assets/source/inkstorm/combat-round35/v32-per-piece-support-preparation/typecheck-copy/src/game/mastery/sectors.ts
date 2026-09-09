import type { PodraceCourse } from '../race/course';
import type { CheckpointSplit, CourseSectionTag } from '../race/types';
import type { MasterySector, MasteryRetryTarget } from './types';

const names: Record<CourseSectionTag, string> = {
  'start-straight': 'Grid straight', 'fast-straight': 'Open straight',
  'launch-crest': 'Launch descent', 'wide-sweeper': 'Sweeper',
  'narrow-canyon': 'Canyon', 'chicane': 'Foundry turns',
  'hairpin': 'Hairpin', 'recovery-straight': 'Recovery straight',
};
const labelCache = new WeakMap<PodraceCourse, readonly string[]>();

/** Labels describe the dominant authored section inside each real gate span. */
export function masterySectorLabels(course: PodraceCourse): readonly string[] {
  const cached = labelCache.get(course); if (cached) return cached;
  const labels = course.checkpoints.map((end, index, gates) => {
    const start = gates[(index + gates.length - 1) % gates.length]!.progress;
    const length = (end.progress - start + 1) % 1 || 1;
    const counts = new Map<CourseSectionTag, number>();
    for (let sample = 0; sample < 25; sample++) {
      const tag = course.samplePlanAtProgress((start + length * (sample + .5) / 25) % 1).tag;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const tag = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? end.tag;
    return names[tag];
  });
  labelCache.set(course, labels); return labels;
}

export function masterySectors(splits: readonly CheckpointSplit[], prior: readonly number[] | undefined,
  labels: readonly string[] = []): MasterySector[] {
  let elapsed = 0, previousElapsed = 0, comparable = true;
  return splits.map((split, index) => {
    elapsed += split.segmentTime;
    const previous = prior?.[index];
    comparable = comparable && previous !== undefined && Number.isFinite(previous);
    previousElapsed += previous ?? 0;
    return { index: index + 1, lap: split.lap, label: labels[split.checkpointIndex] ?? `Sector ${index + 1}`,
      time: split.segmentTime, delta: previous === undefined ? null : split.segmentTime - previous,
      paceDelta: comparable ? elapsed - previousElapsed : null };
  });
}

/** A measured loss, never inferred braking/steering advice. */
export function masteryRetryTarget(sectors: readonly MasterySector[]): MasteryRetryTarget | null {
  const sector = sectors.reduce<MasterySector | null>((best, item) =>
    item.delta !== null && item.delta > .005 && (!best || item.delta > best.delta!) ? item : best, null);
  return sector ? { sectorIndex: sector.index, lap: sector.lap ?? 1,
    label: sector.label ?? `Sector ${sector.index}`, loss: sector.delta!,
    currentTime: sector.time, targetTime: sector.time - sector.delta! } : null;
}
