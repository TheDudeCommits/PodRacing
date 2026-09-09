import { mixSeed, nextRandom } from '../ai/random';
import type { PodraceCourse } from './course';
import { wrapCourseProgress } from './course';
import type {
  CourseSectionTag,
  RaceCourseBranch,
  RaceDirectorEnvironmentState,
  RaceDirectorEventKind,
  RaceDirectorScheduledEvent,
  RaceDirectorState,
  RaceEntryState,
  RaceEvent,
} from './types';

const EVENT_PLAN: readonly {
  kind: RaceDirectorEventKind;
  tag: CourseSectionTag;
  fraction: number;
  duration: readonly [number, number];
}[] = Object.freeze([
  { kind: 'sandstorm', tag: 'wide-sweeper', fraction: 0.42, duration: [10, 14] },
  { kind: 'heatwave', tag: 'fast-straight', fraction: 0.58, duration: [9, 13] },
  { kind: 'lane-collapse', tag: 'chicane', fraction: 0.48, duration: [8, 11] },
  { kind: 'gate-blackout', tag: 'narrow-canyon', fraction: 0.62, duration: [7, 10] },
  { kind: 'shortcut-window', tag: 'hairpin', fraction: 0.38, duration: [12, 16] },
]);

const BASE_ENVIRONMENT: Readonly<RaceDirectorEnvironmentState> = Object.freeze({
  visibility: 1,
  windStrength: 0,
  coolingScale: 1,
  tractionScale: 1,
  blockedLaneSide: 0,
  gateBlackout: false,
  shortcutBranchId: null,
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function progressInSection(
  course: PodraceCourse,
  tag: CourseSectionTag,
  fraction: number,
): number {
  const matching = course.getMinimapSamples(768).filter((sample) => sample.tag === tag);
  if (matching.length === 0) return 0;
  const index = Math.min(
    matching.length - 1,
    Math.max(0, Math.round((matching.length - 1) * clamp(fraction, 0, 1))),
  );
  return matching[index]?.progress ?? matching[0]?.progress ?? 0;
}

function semanticBranch(
  branches: readonly RaceCourseBranch[],
  tag: CourseSectionTag,
): RaceCourseBranch | undefined {
  return branches.find((branch) => branch.sectionTag === tag) ?? branches[0];
}

/** Creates the complete race event schedule up front for replay/network stability. */
export function createRaceDirectorState(
  course: PodraceCourse,
  seed: number,
  totalLaps: number,
  branches: readonly RaceCourseBranch[] = [],
): RaceDirectorState {
  const random = { rngState: mixSeed(seed ^ 0xd1ec70a5) };
  const laps = Math.max(1, Math.floor(totalLaps));
  const events: RaceDirectorScheduledEvent[] = EVENT_PLAN.map((plan, index) => {
    const branch = plan.kind === 'shortcut-window' ? semanticBranch(branches, plan.tag) : undefined;
    const sectionTag = branch?.sectionTag ?? plan.tag;
    const jitter = (nextRandom(random) - 0.5) * 0.18;
    const triggerProgress = branch?.startProgress
      ?? progressInSection(course, sectionTag, plan.fraction + jitter);
    const warningArc = clamp(430 / Math.max(1, course.totalLength), 0.035, 0.095);
    return {
      id: `director-${index}-${plan.kind}`,
      kind: plan.kind,
      sectionTag,
      lap: 1 + (index % laps),
      triggerProgress,
      warningProgress: wrapCourseProgress(triggerProgress - warningArc),
      duration: plan.duration[0] + nextRandom(random) * (plan.duration[1] - plan.duration[0]),
      phase: 'pending',
      activatedAt: null,
      completedAt: null,
      side: branch?.entrySide ?? (nextRandom(random) < 0.5 ? -1 : 1),
      branchId: branch?.id ?? (plan.kind === 'shortcut-window' ? `dynamic-${plan.tag}` : null),
    } satisfies RaceDirectorScheduledEvent;
  });

  return {
    version: 1,
    seed: seed >>> 0,
    events,
    environment: { ...BASE_ENVIRONMENT },
    activeEventIds: [],
  };
}

function raceCoordinate(entry: Readonly<RaceEntryState>): number {
  // Grid rows project near 1.0 on the closed spline but carry a deliberately
  // negative unwrapped value. Using that truth prevents every lap-one event
  // from firing while the craft are still behind the start line.
  return entry.progress.unwrappedProgress;
}

function eventTarget(event: Readonly<RaceDirectorScheduledEvent>): number {
  return Math.max(0, event.lap - 1) + event.triggerProgress;
}

function eventWarningTarget(event: Readonly<RaceDirectorScheduledEvent>): number {
  const warningArc = wrapCourseProgress(event.triggerProgress - event.warningProgress);
  return eventTarget(event) - warningArc;
}

function rebuildEnvironment(state: RaceDirectorState): void {
  const environment: RaceDirectorEnvironmentState = { ...BASE_ENVIRONMENT };
  state.activeEventIds = [];
  for (const event of state.events) {
    if (event.phase !== 'active') continue;
    state.activeEventIds.push(event.id);
    switch (event.kind) {
      case 'sandstorm':
        environment.visibility = Math.min(environment.visibility, 0.42);
        environment.windStrength = Math.max(environment.windStrength, 0.92);
        environment.tractionScale = Math.min(environment.tractionScale, 0.84);
        break;
      case 'heatwave':
        environment.coolingScale = Math.min(environment.coolingScale, 0.3);
        break;
      case 'lane-collapse':
        environment.blockedLaneSide = event.side;
        environment.tractionScale = Math.min(environment.tractionScale, 0.9);
        break;
      case 'gate-blackout':
        environment.gateBlackout = true;
        environment.visibility = Math.min(environment.visibility, 0.68);
        break;
      case 'shortcut-window':
        environment.shortcutBranchId = event.branchId;
        break;
    }
  }
  state.environment = environment;
}

/** Advances warning/active/complete phases against semantic lap progress. */
export function stepRaceDirector(
  state: RaceDirectorState,
  focus: Readonly<RaceEntryState>,
  raceTime: number,
): RaceEvent[] {
  const events: RaceEvent[] = [];
  const coordinate = raceCoordinate(focus);
  for (const scheduled of state.events) {
    if (scheduled.phase === 'complete') continue;
    if (scheduled.phase === 'pending' && coordinate + 1e-8 >= eventWarningTarget(scheduled)) {
      scheduled.phase = 'warning';
      events.push({
        type: 'director-warning',
        eventId: scheduled.id,
        kind: scheduled.kind,
        sectionTag: scheduled.sectionTag,
        lap: scheduled.lap,
      });
    }
    if (scheduled.phase === 'warning' && coordinate + 1e-8 >= eventTarget(scheduled)) {
      scheduled.phase = 'active';
      scheduled.activatedAt = raceTime;
      events.push({
        type: 'director-start',
        eventId: scheduled.id,
        kind: scheduled.kind,
        sectionTag: scheduled.sectionTag,
        lap: scheduled.lap,
      });
    }
    if (
      scheduled.phase === 'active'
      && scheduled.activatedAt !== null
      && raceTime - scheduled.activatedAt >= scheduled.duration
    ) {
      scheduled.phase = 'complete';
      scheduled.completedAt = raceTime;
      events.push({
        type: 'director-end',
        eventId: scheduled.id,
        kind: scheduled.kind,
        sectionTag: scheduled.sectionTag,
        lap: scheduled.lap,
      });
    }
  }
  rebuildEnvironment(state);
  return events;
}

export function resetRaceDirector(state: RaceDirectorState): void {
  for (const event of state.events) {
    event.phase = 'pending';
    event.activatedAt = null;
    event.completedAt = null;
  }
  state.environment = { ...BASE_ENVIRONMENT };
  state.activeEventIds = [];
}
