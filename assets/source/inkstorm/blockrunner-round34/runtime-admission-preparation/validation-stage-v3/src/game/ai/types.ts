import type { PlayerInputState } from '../input/actions';
import type { PodraceCourse } from '../race/course';
import type { AIDifficulty, RaceMode, RaceTeamId } from '../race/types';
import type { PodracerConfig } from '../simulation/config';

export type AIPersonality = 'aggressive' | 'clean' | 'erratic';
export type AIMistakeKind =
  | 'none'
  | 'bad-line'
  | 'marker-clip'
  | 'mistimed-boost'
  | 'awkward-landing';

export interface AIMistakeState {
  kind: AIMistakeKind;
  remaining: number;
  strength: number;
  side: -1 | 1;
}

export interface AIDecisionTelemetry {
  targetProgress: number;
  targetSpeed: number;
  lookaheadDistance: number;
  desiredLaneOffset: number;
  avoidance: number;
  collisionThreat: number;
  cornerSeverity: number;
  rubberBand: number;
  mistake: AIMistakeKind;
  objectiveBias: number;
  routeBranchId: string | null;
}

/** Entire controller memory is plain JSON data for deterministic saves/replays. */
export interface AIControllerState {
  version: 1;
  personality: AIPersonality;
  difficulty: AIDifficulty;
  seed: number;
  rngState: number;
  decisionStep: number;
  laneOffset: number;
  targetLaneOffset: number;
  laneDecisionTimer: number;
  mistakeCooldown: number;
  mistake: AIMistakeState;
  steerMemory: number;
  throttleMemory: number;
  boostDecisionTimer: number;
  boostPulseRemaining: number;
  activeBranchId: string | null;
  lastBranchDecisionKey: string;
  previousCourseProgress?: number;
  lastInput: PlayerInputState;
  telemetry: AIDecisionTelemetry;
}

export interface AIRacerSnapshot {
  id: string;
  x: number;
  y: number;
  z: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  yaw: number;
  speed: number;
  boostEnergy: number;
  heat: number;
  grounded: boolean;
  courseProgress: number;
  unwrappedProgress: number;
  completedLaps: number;
  finished: boolean;
  teamId?: RaceTeamId;
}

export interface AIControllerContext {
  course: PodraceCourse;
  /** The actual class/upgrades, so a heavy speeder brakes and turns within its limits. */
  vehicleConfig?: Readonly<PodracerConfig>;
  self: AIRacerSnapshot;
  opponents: readonly AIRacerSnapshot[];
  /** Player's completed-lap + unwrapped-lap score. */
  playerRaceScore: number;
  /** The next ordered timing gate; nearby AI should visibly aim through it. */
  requiredCheckpoint?: Readonly<{ progress: number; width: number }>;
  delta: number;
  raceTime: number;
  raceMode?: RaceMode;
  /** Fixed-condition competition measures pace without position-based assistance. */
  allowCatchup?: boolean;
  /** One-based live standing, used by eliminator and checkpoint-sprint objectives. */
  position?: number;
  activeRacerCount?: number;
}

export type AIEvent =
  | { type: 'mistake-start'; racerId: string; mistake: Exclude<AIMistakeKind, 'none'>; duration: number }
  | { type: 'mistake-end'; racerId: string; mistake: Exclude<AIMistakeKind, 'none'> };

export interface AIControllerResult {
  state: AIControllerState;
  input: PlayerInputState;
  events: AIEvent[];
}

export interface AIPersonalityTune {
  personality: AIPersonality;
  pace: number;
  lookaheadBase: number;
  lookaheadSpeed: number;
  steeringGain: number;
  steeringResponse: number;
  laneFraction: number;
  laneDecisionMin: number;
  laneDecisionMax: number;
  driftThreshold: number;
  boostChance: number;
  boostHeatLimit: number;
  avoidanceStrength: number;
  rubberBandStrength: number;
  mistakeIntervalMin: number;
  mistakeIntervalMax: number;
  noise: number;
}

export interface AIDifficultyTune {
  difficulty: AIDifficulty;
  paceScale: number;
  steeringScale: number;
  reactionScale: number;
  avoidanceScale: number;
  mistakeIntervalScale: number;
  mistakeStrengthScale: number;
  boostScale: number;
  noiseScale: number;
}
