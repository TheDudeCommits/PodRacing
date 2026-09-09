import { NEUTRAL_PLAYER_INPUT, type PlayerInputState } from '../input/actions';
import { DEFAULT_PODRACER_CONFIG, type PodracerConfig } from '../simulation/config';
import { signedProgressDelta, wrapCourseProgress } from '../race/course';
import { mixSeed, nextRandom, randomRange } from './random';
import type {
  AIControllerContext,
  AIControllerResult,
  AIControllerState,
  AIEvent,
  AIDifficultyTune,
  AIMistakeKind,
  AIPersonality,
  AIPersonalityTune,
} from './types';
import type {
  AIDifficulty,
  CourseBranchDefinition,
  CourseSample,
  RaceMode,
} from '../race/types';

const TAU = Math.PI * 2;

export const AI_PERSONALITY_TUNES: Readonly<Record<AIPersonality, Readonly<AIPersonalityTune>>> = Object.freeze({
  aggressive: Object.freeze({
    personality: 'aggressive', pace: 1.045, lookaheadBase: 62, lookaheadSpeed: 0.48,
    steeringGain: 1.82, steeringResponse: 7.8, laneFraction: 0.5,
    laneDecisionMin: 2.2, laneDecisionMax: 5.2, driftThreshold: 0.19,
    boostChance: 0.82, boostHeatLimit: 0.86, avoidanceStrength: 0.68,
    rubberBandStrength: 0.065, mistakeIntervalMin: 9, mistakeIntervalMax: 17, noise: 0.018,
  }),
  clean: Object.freeze({
    personality: 'clean', pace: 0.985, lookaheadBase: 78, lookaheadSpeed: 0.55,
    steeringGain: 1.58, steeringResponse: 6.4, laneFraction: 0.32,
    laneDecisionMin: 5.5, laneDecisionMax: 9.5, driftThreshold: 0.29,
    boostChance: 0.48, boostHeatLimit: 0.7, avoidanceStrength: 1.2,
    rubberBandStrength: 0.05, mistakeIntervalMin: 22, mistakeIntervalMax: 38, noise: 0.004,
  }),
  erratic: Object.freeze({
    personality: 'erratic', pace: 1, lookaheadBase: 54, lookaheadSpeed: 0.42,
    steeringGain: 2.05, steeringResponse: 5.3, laneFraction: 0.6,
    laneDecisionMin: 1.2, laneDecisionMax: 3.8, driftThreshold: 0.16,
    boostChance: 0.64, boostHeatLimit: 0.92, avoidanceStrength: 0.92,
    rubberBandStrength: 0.075, mistakeIntervalMin: 5.5, mistakeIntervalMax: 11, noise: 0.07,
  }),
});

export const AI_DIFFICULTY_TUNES: Readonly<Record<AIDifficulty, Readonly<AIDifficultyTune>>> = Object.freeze({
  easy: Object.freeze({
    difficulty: 'easy', paceScale: 0.86, steeringScale: 0.82, reactionScale: 0.78,
    avoidanceScale: 0.82, mistakeIntervalScale: 0.62, mistakeStrengthScale: 1.16,
    boostScale: 0.58, noiseScale: 1.65,
  }),
  medium: Object.freeze({
    difficulty: 'medium', paceScale: 1, steeringScale: 1, reactionScale: 1,
    avoidanceScale: 1, mistakeIntervalScale: 1, mistakeStrengthScale: 1,
    boostScale: 1, noiseScale: 1,
  }),
  hard: Object.freeze({
    difficulty: 'hard', paceScale: 1.075, steeringScale: 1.14, reactionScale: 1.18,
    avoidanceScale: 1.12, mistakeIntervalScale: 1.72, mistakeStrengthScale: 0.62,
    boostScale: 1.18, noiseScale: 0.48,
  }),
});

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function wrapAngle(angle: number): number {
  const wrapped = (angle + Math.PI) % TAU;
  return (wrapped < 0 ? wrapped + TAU : wrapped) - Math.PI;
}

function steeringAuthority(speed: number, config: Readonly<PodracerConfig>): number {
  const fraction = clamp((speed / config.maxSpeed - 0.08) / 0.92, 0, 1);
  const smooth = fraction * fraction * (3 - 2 * fraction);
  return config.steeringRateLowSpeed
    + (config.steeringRateHighSpeed - config.steeringRateLowSpeed) * smooth;
}

/** Solve the speed at which this class can turn along the actual next curve. */
function cornerSpeed(curvature: number, config: Readonly<PodracerConfig>, confidence: number): number {
  let low = 10;
  let high = config.boostMaxSpeed;
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const middle = (low + high) * 0.5;
    if (middle * Math.abs(curvature) <= steeringAuthority(middle, config) * confidence) low = middle;
    else high = middle;
  }
  return low;
}

function mistakeWeights(personality: AIPersonality): readonly [Exclude<AIMistakeKind, 'none'>, number][] {
  switch (personality) {
    case 'aggressive':
      return [['bad-line', 0.28], ['marker-clip', 0.31], ['mistimed-boost', 0.31], ['awkward-landing', 0.1]];
    case 'clean':
      return [['bad-line', 0.25], ['marker-clip', 0.12], ['mistimed-boost', 0.15], ['awkward-landing', 0.48]];
    case 'erratic':
      return [['bad-line', 0.34], ['marker-clip', 0.27], ['mistimed-boost', 0.24], ['awkward-landing', 0.15]];
  }
}

function pickMistake(state: AIControllerState): Exclude<AIMistakeKind, 'none'> {
  const draw = nextRandom(state);
  let total = 0;
  for (const [kind, weight] of mistakeWeights(state.personality)) {
    total += weight;
    if (draw <= total) return kind;
  }
  return 'bad-line';
}

export function createAIControllerState(
  personality: AIPersonality,
  seed: number,
  difficulty: AIDifficulty = 'medium',
): AIControllerState {
  const state: AIControllerState = {
    version: 1,
    personality,
    difficulty,
    seed: seed >>> 0,
    rngState: mixSeed(seed),
    decisionStep: 0,
    laneOffset: 0,
    targetLaneOffset: 0,
    laneDecisionTimer: 0,
    mistakeCooldown: 0,
    mistake: { kind: 'none', remaining: 0, strength: 0, side: 1 },
    steerMemory: 0,
    throttleMemory: 0,
    boostDecisionTimer: 0,
    boostPulseRemaining: 0,
    activeBranchId: null,
    lastBranchDecisionKey: '',
    lastInput: { ...NEUTRAL_PLAYER_INPUT },
    telemetry: {
      targetProgress: 0,
      targetSpeed: 0,
      lookaheadDistance: 0,
      desiredLaneOffset: 0,
      avoidance: 0,
      collisionThreat: 0,
      cornerSeverity: 0,
      rubberBand: 0,
      mistake: 'none',
      objectiveBias: 1,
      routeBranchId: null,
    },
  };
  const tune = AI_PERSONALITY_TUNES[personality];
  const difficultyTune = AI_DIFFICULTY_TUNES[difficulty];
  state.targetLaneOffset = randomRange(state, -7.5, 7.5) * (tune.laneFraction / 0.78);
  state.laneDecisionTimer = randomRange(state, 0.6, tune.laneDecisionMin);
  state.mistakeCooldown = randomRange(
    state,
    tune.mistakeIntervalMin * 0.65 * difficultyTune.mistakeIntervalScale,
    tune.mistakeIntervalMax * difficultyTune.mistakeIntervalScale,
  );
  state.boostDecisionTimer = randomRange(state, 0.4, 1.4);
  return state;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function branchChoiceProbability(
  state: Readonly<AIControllerState>,
  context: Readonly<AIControllerContext>,
  branch: Readonly<CourseBranchDefinition>,
): number {
  const personality = state.personality === 'aggressive'
    ? 0.72
    : state.personality === 'erratic'
      ? 0.58
      : 0.36;
  const safePreference = branch.kind === 'safe'
    ? (state.personality === 'clean' ? 0.38 : -0.08)
    : 0;
  const shortcutPreference = branch.kind === 'shortcut' || branch.kind === 'jump'
    ? (state.personality === 'aggressive' ? 0.2 : 0.04)
    : 0;
  const modePreference = context.raceMode === 'survival-gauntlet'
    ? (0.28 - branch.risk * 0.58)
    : context.raceMode === 'checkpoint-sprint' || context.raceMode === 'eliminator'
      ? branch.reward * 0.22
      : 0;
  const difficultyJudgment = state.difficulty === 'hard'
    ? (branch.reward - branch.risk * 0.62) * 0.24
    : state.difficulty === 'easy'
      ? 0.05
      : (branch.reward - branch.risk) * 0.08;
  return clamp(
    personality + safePreference + shortcutPreference + modePreference + difficultyJudgment,
    0.08,
    0.96,
  );
}

function activeBranchFor(
  state: AIControllerState,
  context: AIControllerContext,
): CourseBranchDefinition | null {
  const branches = context.course.branches;
  let active = state.activeBranchId
    ? branches.find((branch) => branch.id === state.activeBranchId) ?? null
    : null;
  if (active) {
    const progress = context.self.courseProgress;
    const insideDecisionWindow = progress >= active.entryProgress - 0.035
      && progress < active.exitProgress;
    if (!insideDecisionWindow) {
      state.activeBranchId = null;
      active = null;
    }
  }
  if (active) return active;

  let upcoming: CourseBranchDefinition | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const branch of branches) {
    const forwardDistance = wrapCourseProgress(
      branch.entryProgress - context.self.courseProgress,
    ) * context.course.totalLength;
    if (forwardDistance > 260 || forwardDistance >= nearestDistance) continue;
    upcoming = branch;
    nearestDistance = forwardDistance;
  }
  if (!upcoming) return null;

  const decisionKey = `${context.self.completedLaps}:${upcoming.id}`;
  if (state.lastBranchDecisionKey === decisionKey) return null;
  state.lastBranchDecisionKey = decisionKey;
  const draw = mixSeed(
    state.seed
    ^ hashString(upcoming.id)
    ^ Math.imul(context.self.completedLaps + 1, 0x9e3779b9),
  ) / 0x1_0000_0000;
  if (draw > branchChoiceProbability(state, context, upcoming)) return null;
  // A side route can become obstructed by an authored world pack. Never
  // commit the AI to a route whose swept craft body hits that scenery.
  for (const point of upcoming.points) {
    if (context.course.getObstacleContact(point.x, point.z, 8, point.canonicalProgress, point.y + 2.45)) return null;
  }
  state.activeBranchId = upcoming.id;
  return upcoming;
}

function branchTargetSample(
  branch: Readonly<CourseBranchDefinition>,
  context: Readonly<AIControllerContext>,
  lookaheadDistance: number,
): CourseSample | null {
  if (branch.points.length < 2) return null;
  const entryDistance = wrapCourseProgress(branch.entryProgress - context.self.courseProgress) * context.course.totalLength;
  if (context.self.courseProgress < branch.entryProgress && entryDistance > lookaheadDistance) return null;
  let nearestSquared = Number.POSITIVE_INFINITY;
  let nearestDistance = 0;
  let totalDistance = 0;
  for (let index = 0; index < branch.points.length - 1; index += 1) {
    const point = branch.points[index]!;
    const next = branch.points[index + 1]!;
    const dx = next.x - point.x, dz = next.z - point.z;
    const length = Math.hypot(dx, dz);
    const fraction = clamp(((context.self.x - point.x) * dx + (context.self.z - point.z) * dz) / Math.max(1e-6, length * length), 0, 1);
    const squared = (context.self.x - point.x - dx * fraction) ** 2 + (context.self.z - point.z - dz * fraction) ** 2;
    if (squared < nearestSquared) { nearestSquared = squared; nearestDistance = totalDistance + length * fraction; }
    totalDistance += length;
  }
  const targetDistance = nearestDistance + lookaheadDistance;
  // Continue through the merge. The old controller clamped to the penultimate
  // branch point, circled it, then recovered to the same route indefinitely.
  if (targetDistance >= totalDistance) return context.course.sampleAtDistance(
    branch.exitProgress * context.course.totalLength + targetDistance - totalDistance,
  );
  let travelled = 0;
  for (let index = 0; index < branch.points.length - 1; index += 1) {
    const point = branch.points[index]!;
    const next = branch.points[index + 1]!;
    const length = Math.max(1e-6, Math.hypot(next.x - point.x, next.z - point.z));
    if (travelled + length >= targetDistance) {
      const fraction = (targetDistance - travelled) / length;
      const progress = point.canonicalProgress + (next.canonicalProgress - point.canonicalProgress) * fraction;
      const tangentX = (next.x - point.x) / length, tangentZ = (next.z - point.z) / length;
      return { ...context.course.sampleAtProgress(progress),
        x: point.x + (next.x - point.x) * fraction, y: point.y + (next.y - point.y) * fraction,
        z: point.z + (next.z - point.z) * fraction, progress,
        tangentX, tangentZ, rightX: tangentZ, rightZ: -tangentX,
        width: point.width + (next.width - point.width) * fraction };
    }
    travelled += length;
  }
  return null;
}

function updateMistakes(
  state: AIControllerState,
  racerId: string,
  delta: number,
  tune: Readonly<AIPersonalityTune>,
  difficulty: Readonly<AIDifficultyTune>,
  events: AIEvent[],
): void {
  if (state.mistake.kind !== 'none') {
    state.mistake.remaining -= delta;
    if (state.mistake.remaining <= 0) {
      const ended = state.mistake.kind;
      state.mistake = { kind: 'none', remaining: 0, strength: 0, side: state.mistake.side };
      state.mistakeCooldown = randomRange(
        state,
        tune.mistakeIntervalMin * difficulty.mistakeIntervalScale,
        tune.mistakeIntervalMax * difficulty.mistakeIntervalScale,
      );
      events.push({ type: 'mistake-end', racerId, mistake: ended });
    }
    return;
  }

  state.mistakeCooldown -= delta;
  if (state.mistakeCooldown > 0) return;
  const kind = pickMistake(state);
  const durationByKind: Record<Exclude<AIMistakeKind, 'none'>, readonly [number, number]> = {
    'bad-line': [1.35, 2.7],
    'marker-clip': [1.1, 2.05],
    'mistimed-boost': [0.55, 1.15],
    'awkward-landing': [1.25, 2.4],
  };
  const range = durationByKind[kind];
  const duration = randomRange(state, range[0], range[1]);
  state.mistake = {
    kind,
    remaining: duration,
    strength: clamp(
      randomRange(state, 0.65, 1) * difficulty.mistakeStrengthScale,
      0.35,
      1.25,
    ),
    side: nextRandom(state) < 0.5 ? -1 : 1,
  };
  events.push({ type: 'mistake-start', racerId, mistake: kind, duration });
}

function computeAvoidance(
  context: AIControllerContext,
  tune: Readonly<AIPersonalityTune>,
  difficulty: Readonly<AIDifficultyTune>,
): {
  steer: number;
  threat: number;
} {
  const forwardX = Math.sin(context.self.yaw);
  const forwardZ = Math.cos(context.self.yaw);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  let steer = 0;
  let threat = 0;

  for (const other of context.opponents) {
    if (other.finished) continue;
    const dx = other.x - context.self.x;
    const dz = other.z - context.self.z;
    const forwardDistance = dx * forwardX + dz * forwardZ;
    const lateralDistance = dx * rightX + dz * rightZ;
    if (forwardDistance < -7 || forwardDistance > 72 || Math.abs(lateralDistance) > 18) continue;
    const forwardWeight = 1 - clamp((forwardDistance + 7) / 79, 0, 1);
    const lateralWeight = 1 - clamp(Math.abs(lateralDistance) / 18, 0, 1);
    const closingSpeed = Math.max(
      0,
      context.self.speed - Math.hypot(other.velocityX, other.velocityZ),
    );
    const currentThreat = clamp(forwardWeight * lateralWeight + closingSpeed / 180, 0, 1);
    const side = Math.abs(lateralDistance) < 0.05
      ? ((context.self.id < other.id) ? -1 : 1)
      : (lateralDistance > 0 ? -1 : 1);
    steer += side * currentThreat * tune.avoidanceStrength * difficulty.avoidanceScale;
    threat = Math.max(threat, currentThreat);
  }
  return { steer: clamp(steer, -1, 1), threat };
}

function objectiveBias(
  mode: RaceMode | undefined,
  position: number | undefined,
  activeRacerCount: number | undefined,
): number {
  switch (mode) {
    case 'eliminator': {
      const lastPlacePressure = Math.max(0, (position ?? 1) - Math.max(1, (activeRacerCount ?? 8) - 2));
      return 1 + lastPlacePressure * 0.055;
    }
    case 'checkpoint-sprint': return 1.035;
    case 'combat-race': return 1.015;
    case 'survival-gauntlet': return 0.92;
    case 'drift-trial': return 0.9;
    case 'team-race': return 1.01;
    default: return 1;
  }
}

export function stepAIController(
  state: AIControllerState,
  context: AIControllerContext,
): AIControllerResult {
  const delta = clamp(Number.isFinite(context.delta) ? context.delta : 0, 0, 0.1);
  const tune = AI_PERSONALITY_TUNES[state.personality];
  const difficulty = AI_DIFFICULTY_TUNES[state.difficulty ?? 'medium'];
  const objective = objectiveBias(context.raceMode, context.position, context.activeRacerCount);
  const events: AIEvent[] = [];
  if (state.previousCourseProgress !== undefined
    && signedProgressDelta(state.previousCourseProgress, context.self.courseProgress) < -0.004) {
    // A recovery is allowed to abandon its failed branch, while the decision
    // key prevents immediately selecting the same obstruction on this lap.
    state.activeBranchId = null;
    state.laneOffset = 0;
    state.steerMemory = 0;
  }
  state.previousCourseProgress = context.self.courseProgress;
  state.decisionStep += 1;
  updateMistakes(state, context.self.id, delta, tune, difficulty, events);

  const here = context.course.sampleAtProgress(context.self.courseProgress);
  const corner = context.course.getCornerPreview(context.self.courseProgress, 38, 285);
  const vehicleConfig = context.vehicleConfig ?? DEFAULT_PODRACER_CONFIG;
  const speed = context.self.speed;
  // Long sight distance belongs to braking, not steering: aiming 170 m ahead
  // cuts across the inside of a canyon even if both endpoints are on track.
  const lookaheadDistance = clamp(
    (19 + speed * 0.34) * (0.92 + tune.lookaheadBase / 800),
    23,
    77,
  );
  const checkpointForwardDistance = context.requiredCheckpoint
    ? wrapCourseProgress(context.requiredCheckpoint.progress - context.self.courseProgress)
      * context.course.totalLength
    : Number.POSITIVE_INFINITY;
  const checkpointApproach = checkpointForwardDistance <= Math.max(
    150,
    lookaheadDistance * 1.45,
  );
  let targetProgress = wrapCourseProgress(
    context.self.courseProgress + lookaheadDistance / context.course.totalLength,
  );
  let target = context.course.sampleAtProgress(targetProgress);
  const routeBranch = activeBranchFor(state, context);
  const branchTarget = routeBranch
    ? branchTargetSample(routeBranch, context, lookaheadDistance)
    : null;
  if (branchTarget) {
    target = branchTarget;
    targetProgress = branchTarget.progress;
  }

  state.laneDecisionTimer -= delta;
  if (state.laneDecisionTimer <= 0) {
    state.targetLaneOffset = randomRange(state, -target.width, target.width) * tune.laneFraction;
    state.laneDecisionTimer = randomRange(state, tune.laneDecisionMin, tune.laneDecisionMax);
  }

  let desiredLane = state.targetLaneOffset;
  if (routeBranch) {
    // Alternate routes are deliberately narrower than the canonical line.
    // Commit to their centre; personality variation resumes after rejoining.
    desiredLane = 0;
  } else if (checkpointApproach) {
    // Ordered timing gates are a rule constraint, not a suggestion. Aim the
    // craft centre through the opening; personality resumes after the split.
    desiredLane = 0;
  } else if (state.mistake.kind === 'bad-line') {
    desiredLane += state.mistake.side * target.width * 0.52 * state.mistake.strength;
  } else if (state.mistake.kind === 'marker-clip') {
    // The engine pod, not the craft centre, should brush the marker. Keeping
    // the centre just inside the authored width produces a readable mistake
    // without converting every episode into a wall-following deadlock.
    desiredLane = state.mistake.side * target.width * (0.82 + state.mistake.strength * 0.15);
  }
  const corridorMargin = Math.max(0, Math.min(target.width * 0.62, target.width - 10));
  desiredLane = clamp(desiredLane, -corridorMargin, corridorMargin);
  state.laneOffset += (desiredLane - state.laneOffset) * Math.min(
    1,
    delta * (checkpointApproach ? 5.8 : 1.45),
  );

  const avoidance = computeAvoidance(context, tune, difficulty);
  // Move the aim point within the legal corridor. A full steering impulse to
  // dodge a nearby racer previously sent the whole field into roadside rocks.
  const pursuitLane = clamp(state.laneOffset + avoidance.steer * Math.min(12, corridorMargin), -corridorMargin, corridorMargin);
  const targetX = target.x + target.rightX * pursuitLane;
  const targetZ = target.z + target.rightZ * pursuitLane;
  const desiredYaw = Math.atan2(targetX - context.self.x, targetZ - context.self.z);
  const headingError = wrapAngle(desiredYaw - context.self.yaw);
  const lateralVelocity = context.self.velocityX * Math.cos(context.self.yaw)
    - context.self.velocityZ * Math.sin(context.self.yaw);
  const desiredYawRate = 2 * Math.max(20, speed) * Math.sin(headingError)
    / Math.max(10, Math.hypot(targetX - context.self.x, targetZ - context.self.z))
    + headingError * 0.38 - lateralVelocity * 0.011;
  const deterministicWobble = Math.sin(
    context.raceTime * (1.8 + (state.seed & 7) * 0.13) + (state.seed % 1024),
  ) * tune.noise * difficulty.noiseScale;
  let requestedSteer = desiredYawRate / Math.max(0.1, steeringAuthority(speed, vehicleConfig))
    + deterministicWobble;
  if (state.mistake.kind === 'awkward-landing' && (!context.self.grounded || here.tag === 'launch-crest')) {
    requestedSteer += state.mistake.side * (0.06 + 0.08 * state.mistake.strength);
  }
  requestedSteer = clamp(requestedSteer, -1, 1);
  state.steerMemory += (requestedSteer - state.steerMemory) * Math.min(
    1,
    (tune.steeringResponse + 4) * difficulty.reactionScale * delta,
  );

  const selfScore = context.self.completedLaps + context.self.unwrappedProgress;
  const scoreGap = context.playerRaceScore - selfScore;
  const rubberSignal = clamp(scoreGap * 2.2, -1, 1);
  // Catch-up remains deliberately mild. A leader also sheds a little more
  // pace than a trailer gains, which closes the field without giving a
  // visibly artificial launch boost to a struggling craft.
  const rubberBand = (context.allowCatchup === false ? 0 : rubberSignal) * tune.rubberBandStrength
    * (rubberSignal < 0 ? 1.45 : 1);
  let targetSpeed = vehicleConfig.maxSpeed * tune.pace * difficulty.paceScale
    * (1 + rubberBand) * objective;
  const confidence = clamp(0.83 * tune.pace * difficulty.paceScale, 0.67, 0.95);
  for (const distance of [0, 18, 38, 70, 110, 170, 245, 325]) {
    const ahead = context.course.sampleAtDistance(here.distance + distance);
    const curveLimit = cornerSpeed(ahead.curvature, vehicleConfig, confidence);
    targetSpeed = Math.min(targetSpeed, Math.sqrt(curveLimit * curveLimit
      + 2 * vehicleConfig.brakeAcceleration * 0.65 * distance));
  }
  if (target.tag === 'narrow-canyon') targetSpeed *= state.personality === 'clean' ? 0.9 : 0.95;
  if (state.mistake.kind === 'bad-line') targetSpeed *= 0.89;
  if (state.mistake.kind === 'awkward-landing') targetSpeed *= context.self.grounded ? 0.94 : 1.08;
  if (Math.abs(headingError) > 0.8) targetSpeed = Math.min(targetSpeed, 30);
  const lateralOffset = branchTarget
    ? context.course.projectPoint(context.self.x, context.self.z, context.self.courseProgress).lateralOffset
    : (context.self.x - here.x) * here.rightX + (context.self.z - here.z) * here.rightZ;
  if (Math.abs(lateralOffset) > here.width * 0.8) targetSpeed = Math.min(targetSpeed, 55);
  targetSpeed = clamp(targetSpeed, 20, vehicleConfig.boostMaxSpeed * 0.96);

  const speedError = targetSpeed - speed;
  const desiredThrottle =
    clamp(0.5 + speedError / 15, 0, 1) * (1 - avoidance.threat * 0.45);
  state.throttleMemory += (desiredThrottle - state.throttleMemory) * Math.min(1, delta * 4.8);
  const brake = Math.max(
    clamp((-speedError - 2) / 17, 0, 1),
    clamp((avoidance.threat - 0.25) / 0.75, 0, 1) * 0.65,
  );

  state.boostDecisionTimer -= delta;
  state.boostPulseRemaining = Math.max(0, state.boostPulseRemaining - delta);
  const safeForBoost =
    corner.severity < (state.personality === 'aggressive' ? 0.23 : 0.15) &&
    context.self.boostEnergy > 0.18 &&
    context.self.heat < tune.boostHeatLimit &&
    Math.abs(headingError) < 0.14 &&
    Math.abs(lateralOffset) < here.width * 0.5 &&
    targetSpeed > speed + 9 &&
    speed > 54 &&
    avoidance.threat < 0.45;
  if (state.boostDecisionTimer <= 0) {
    const urge = tune.boostChance * difficulty.boostScale + Math.max(0, rubberBand) * 2.4;
    if (safeForBoost && nextRandom(state) < urge) {
      state.boostPulseRemaining = randomRange(state, 0.34, state.personality === 'aggressive' ? 1.2 : 0.82);
    }
    state.boostDecisionTimer = randomRange(state, 1.1, 2.7);
  }
  const forcedBadBoost = state.mistake.kind === 'mistimed-boost' && context.self.boostEnergy > 0.08
    && Math.abs(headingError) < 0.22 && Math.abs(lateralOffset) < here.width * 0.65;
  const boost = forcedBadBoost || (state.boostPulseRemaining > 0 && safeForBoost);
  const turnDemand = Math.max(Math.abs(state.steerMemory), corner.severity);
  const driftThreshold = context.raceMode === 'drift-trial'
    ? tune.driftThreshold * 0.58
    : tune.driftThreshold;
  const drift =
    context.raceMode === 'drift-trial' &&
    context.self.grounded &&
    speed > 54 &&
    turnDemand > driftThreshold &&
    Math.abs(state.steerMemory) > 0.16 &&
    state.mistake.kind !== 'awkward-landing';

  const input: PlayerInputState = {
    throttle: state.throttleMemory,
    brake,
    steer: clamp(state.steerMemory, -1, 1),
    drift,
    boost,
    fire: false,
    mine: false,
    shield: false,
    cycleVehicle: false,
    reset: false,
    pause: false,
  };
  state.lastInput = input;
  state.telemetry = {
    targetProgress,
    targetSpeed,
    lookaheadDistance,
    desiredLaneOffset: state.laneOffset,
    avoidance: avoidance.steer,
    collisionThreat: avoidance.threat,
    cornerSeverity: corner.severity,
    rubberBand,
    mistake: state.mistake.kind,
    objectiveBias: objective,
    routeBranchId: routeBranch?.id ?? null,
  };
  return { state, input, events };
}

export function progressAhead(from: number, to: number): number {
  return signedProgressDelta(from, to);
}
