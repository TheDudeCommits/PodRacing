import type { PodracerRespawnPoseState, PodracerState, Vec3State } from '../simulation/types';
import type {
  GalacticRacerState,
  GalacticWorldState,
  WorkshopLoadout,
  WorkshopStat,
} from '../galactic/types';

export type CourseSectionTag =
  | 'start-straight'
  | 'fast-straight'
  | 'launch-crest'
  | 'wide-sweeper'
  | 'narrow-canyon'
  | 'chicane'
  | 'hairpin'
  | 'recovery-straight';

/** Large-scale deterministic desert identity selected by the course seed. */
export type DesertRegionId =
  | 'sunscar-dunes'
  | 'glass-flats'
  | 'red-canyon'
  | 'storm-basin'
  | 'machine-graveyard'
  | 'geothermal-badlands';

export type CourseBranchKind =
  | 'safe'
  | 'shortcut'
  | 'jump'
  | 'salvage'
  | 'technical';

/**
 * A sampled point on an alternate path. `canonicalProgress` is monotonic from
 * entry to exit, so timing/checkpoint truth remains on the closed main spline.
 */
export interface CourseBranchPoint {
  x: number;
  y: number;
  z: number;
  width: number;
  canonicalProgress: number;
  routeProgress: number;
}

export interface CourseBranchDefinition {
  id: string;
  kind: CourseBranchKind;
  label: string;
  /** Point y values describe a supported deck above the analytic desert. */
  elevated?: boolean;
  entryProgress: number;
  exitProgress: number;
  /** Relative danger and payoff, both normalized to [0, 1]. */
  risk: number;
  reward: number;
  points: readonly CourseBranchPoint[];
}

/** Renderer-ready branch geometry kept separate from the closed main loop. */
export interface CourseRenderBranch extends CourseBranchDefinition {
  points: readonly CourseBranchPoint[];
}

export interface CourseMinimapData {
  canonical: readonly CourseMinimapPoint[];
  branches: readonly CourseBranchDefinition[];
}

export interface CourseGenerationMetrics {
  length: number;
  maximumCurvature: number;
  minimumSelfClearance: number;
  launchScore: number;
  branchCount: number;
}

export interface CourseGenerationReport {
  valid: boolean;
  reasons: readonly string[];
  metrics: CourseGenerationMetrics;
}

export interface AuthoredCoursePoint {
  x: number;
  z: number;
  /** Half-width of the safe racing corridor, in metres. */
  width: number;
  /** Describes the segment beginning at this control point. */
  tag: CourseSectionTag;
  /** Checkpoints are ordered in authored course direction. */
  checkpoint?: boolean;
}

export interface CourseSample extends Vec3State {
  /** Arc-length-normalized course position in [0, 1). */
  progress: number;
  distance: number;
  tangentX: number;
  tangentZ: number;
  rightX: number;
  rightZ: number;
  width: number;
  tag: CourseSectionTag;
  /** Signed yaw curvature. Positive bends toward racer-right. */
  curvature: number;
}

export interface CourseProjection extends CourseSample {
  distanceToCenter: number;
  /** Positive is racer-right relative to the course direction. */
  lateralOffset: number;
  /** Present only while the closest valid route is an alternate branch. */
  branchId?: string;
  branchKind?: CourseBranchKind;
  branchRouteProgress?: number;
}

/**
 * Deterministic simulation proxy for an authored solid course obstacle.
 * The contact normal points from the obstacle back into driveable space.
 */
export interface CourseObstacleContact {
  id: string;
  kind: 'canyon-wall' | 'scenery';
  progress: number;
  penetration: number;
  normalX: number;
  normalZ: number;
}

export interface CourseCheckpoint extends CourseSample {
  index: number;
  controlPointIndex: number;
}

export interface CourseRenderPoint {
  x: number;
  y: number;
  z: number;
  width: number;
  progress: number;
  tag: CourseSectionTag;
}

export interface CourseRenderData {
  points: readonly CourseRenderPoint[];
  /** Indices into `points`, ready for the renderer's instanced gates. */
  checkpointIndices: readonly number[];
  /** Optional for backwards-compatible authored/test fixtures. */
  branches?: readonly CourseRenderBranch[];
  region?: DesertRegionId;
}

export interface CourseMinimapPoint {
  x: number;
  z: number;
  width: number;
  progress: number;
  tag: CourseSectionTag;
  branchId?: string;
}

export type CornerDirection = 'left' | 'straight' | 'right';

export interface CornerPreview {
  direction: CornerDirection;
  /** Normalized from a mild bend (0) to a hairpin (1). */
  severity: number;
  distance: number;
  signedAngle: number;
  tag: CourseSectionTag;
}

export type RacePhase = 'countdown' | 'racing' | 'finished';
export type RacerStatus = 'grid' | 'racing' | 'finished';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type RaceMode =
  | 'circuit'
  | 'eliminator'
  | 'checkpoint-sprint'
  | 'combat-race'
  | 'survival-gauntlet'
  | 'drift-trial'
  | 'team-race';

export type RaceTeamId = 'sun' | 'shadow';

/**
 * Canonical optional route contract. Course-generation and rendering can own
 * richer branch geometry; race rules only need stable semantic endpoints.
 */
export interface RaceCourseBranch {
  id: string;
  startProgress: number;
  endProgress: number;
  /** Signed course-width fraction used when detecting entry into the branch. */
  entrySide: -1 | 1;
  /** Higher values permit a larger shortcut payoff. */
  risk: number;
  reward: number;
  sectionTag?: CourseSectionTag;
}

export interface RaceSettingsState {
  mode: RaceMode;
  /** Absent in legacy/online snapshots, which retain the original chaotic rules. */
  competitionProfile?: 'chaos' | 'clean-race' | 'time-trial' | 'training';
  aiDifficulty: AIDifficulty;
  fieldSize: number;
  /** Multiplayer remains deliberately capped even when AI fills an eight-craft grid. */
  maximumHumanRacers: 4;
  branches: RaceCourseBranch[];
}

export type LaunchOutcome = 'pending' | 'perfect' | 'good' | 'bog' | 'overheat';

export interface RacerLaunchState {
  outcome: LaunchOutcome;
  targetThrottle: number;
  displayedRev: number;
  engineHeat: number;
  accuracyTotal: number;
  accuracySamples: number;
  committedThrottle: number;
  penaltyRemaining: number;
  bonusRemaining: number;
}

export interface RacerDraftingState {
  leaderId: string | null;
  wakeStrength: number;
  turbulence: number;
  charge: number;
  slingshotRemaining: number;
  cooldownRemaining: number;
}

export type RacerFinishReason =
  | 'running'
  | 'finish-line'
  | 'eliminated'
  | 'destroyed'
  | 'objective-complete'
  | 'classified';

export interface RacerCompetitionState {
  teamId: RaceTeamId;
  score: number;
  checkpointScore: number;
  driftScore: number;
  combatScore: number;
  survivalLives: number;
  eliminated: boolean;
  eliminatedAt: number | null;
  finishReason: RacerFinishReason;
  checkpointsPassed: number;
  shortcutUses: number;
  usedShortcutEventIds: string[];
}

/** Sanitized pre-race build projected into deterministic gameplay values. */
export interface RacerWorkshopState {
  version: 1;
  loadout: WorkshopLoadout;
  modifiers: Readonly<Record<WorkshopStat, number>>;
  synergyIds: string[];
  mineCapacity: number;
}

export type RaceDirectorEventKind =
  | 'sandstorm'
  | 'heatwave'
  | 'lane-collapse'
  | 'gate-blackout'
  | 'shortcut-window';

export type RaceDirectorEventPhase = 'pending' | 'warning' | 'active' | 'complete';

export interface RaceDirectorScheduledEvent {
  id: string;
  kind: RaceDirectorEventKind;
  sectionTag: CourseSectionTag;
  lap: number;
  triggerProgress: number;
  warningProgress: number;
  duration: number;
  phase: RaceDirectorEventPhase;
  activatedAt: number | null;
  completedAt: number | null;
  side: -1 | 1;
  branchId: string | null;
}

export interface RaceDirectorEnvironmentState {
  visibility: number;
  windStrength: number;
  coolingScale: number;
  tractionScale: number;
  blockedLaneSide: -1 | 0 | 1;
  gateBlackout: boolean;
  shortcutBranchId: string | null;
}

export interface RaceDirectorState {
  version: 1;
  seed: number;
  events: RaceDirectorScheduledEvent[];
  environment: RaceDirectorEnvironmentState;
  activeEventIds: string[];
}

export interface RaceModeState {
  mode: RaceMode;
  objectiveTarget: number;
  nextEliminationAt: number;
  eliminationInterval: number;
  eliminatedRacerIds: string[];
  teamScores: Record<RaceTeamId, number>;
  winningTeam: RaceTeamId | null;
  winnerId: string | null;
}

export interface CheckpointSplit {
  lap: number;
  checkpointIndex: number;
  raceTime: number;
  segmentTime: number;
}

export interface RacerProgressState {
  courseProgress: number;
  /** Continuous progress, allowed below zero on the starting grid. */
  unwrappedProgress: number;
  previousProgress: number;
  completedLaps: number;
  currentLap: number;
  nextCheckpointIndex: number;
  lastCheckpointIndex: number;
  lapStartTime: number;
  lastSplitTime: number;
  lapTimes: number[];
  splits: CheckpointSplit[];
  finishTime: number | null;
  placement: number | null;
  wrongWay: boolean;
  wrongWayTimer: number;
  offCourseDistance: number;
  lateralOffset: number;
  cornerPreview: CornerPreview;
  resetPose: PodracerRespawnPoseState;
}

/** AI state is structurally declared in the AI package to avoid a race -> AI cycle. */
export interface SerializableAIState {
  version: 1;
  personality: string;
  seed: number;
  rngState: number;
  difficulty?: AIDifficulty;
}

export interface RaceEntryState<TAI extends SerializableAIState = SerializableAIState> {
  id: string;
  name: string;
  isPlayer: boolean;
  status: RacerStatus;
  vehicle: PodracerState;
  progress: RacerProgressState;
  ai: TAI | null;
  /** Present on live RaceSimulation entries; optional for lightweight progress fixtures. */
  galactic?: GalacticRacerState;
  /** Present on live RaceSimulation entries; optional for lightweight progress fixtures. */
  launch?: RacerLaunchState;
  /** Present on live RaceSimulation entries; optional for lightweight progress fixtures. */
  drafting?: RacerDraftingState;
  /** Present on live RaceSimulation entries; optional for lightweight progress fixtures. */
  competition?: RacerCompetitionState;
  /** Omitted to preserve the legacy/default tune when no workshop build was supplied. */
  workshop?: RacerWorkshopState;
}

export interface RaceResultEntry {
  id: string;
  name: string;
  placement: number;
  finishTime: number | null;
  lapTimes: readonly number[];
  splits: readonly CheckpointSplit[];
  score?: number;
  teamId?: RaceTeamId;
  finishReason?: RacerFinishReason;
}

export interface RaceSimulationState<TAI extends SerializableAIState = SerializableAIState> {
  version: 1;
  seed: number;
  step: number;
  phase: RacePhase;
  countdownRemaining: number;
  countdownCue: 3 | 2 | 1 | 0;
  raceTime: number;
  totalLaps: number;
  settings: RaceSettingsState;
  director: RaceDirectorState;
  modeState: RaceModeState;
  entries: RaceEntryState<TAI>[];
  results: RaceResultEntry[];
  galacticWorld: GalacticWorldState;
}

export type RaceEvent =
  | { type: 'countdown'; cue: 3 | 2 | 1 | 'go' }
  | { type: 'start-horn' }
  | {
      type: 'overtake';
      racerId: string;
      passedId: string;
      fromPosition: number;
      toPosition: number;
    }
  | { type: 'checkpoint'; racerId: string; checkpointIndex: number; lap: number; split: number }
  | { type: 'lap-complete'; racerId: string; lap: number; lapTime: number }
  | { type: 'wrong-way'; racerId: string; active: boolean }
  | { type: 'finish'; racerId: string; placement: number; totalTime: number }
  | { type: 'launch-result'; racerId: string; outcome: Exclude<LaunchOutcome, 'pending'> }
  | { type: 'draft-enter'; racerId: string; leaderId: string }
  | { type: 'draft-exit'; racerId: string; leaderId: string; charge: number }
  | { type: 'slingshot'; racerId: string; leaderId: string; strength: number }
  | {
      type: 'director-warning' | 'director-start' | 'director-end';
      eventId: string;
      kind: RaceDirectorEventKind;
      sectionTag: CourseSectionTag;
      lap: number;
    }
  | { type: 'shortcut-used'; racerId: string; branchId: string; reward: number }
  | { type: 'racer-eliminated'; racerId: string; reason: 'last-place' | 'destroyed' }
  | { type: 'score'; racerId: string; source: 'checkpoint' | 'drift' | 'combat' | 'survival'; amount: number; total: number }
  | { type: 'mode-complete'; mode: RaceMode; winnerId: string | null; winningTeam: RaceTeamId | null }
  | { type: 'results'; results: RaceResultEntry[] };
