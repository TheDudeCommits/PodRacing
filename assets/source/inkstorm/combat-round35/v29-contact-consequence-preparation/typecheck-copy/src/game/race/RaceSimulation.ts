import { collectCombatPickup, isCombatPickup } from '../galactic/combatPickups';
import { createCourseGulfField, type CourseGulfField } from './CourseGulfField';
import { createPitPadField, type PitPadField } from './PitPadField';
import { getInkstormLayout } from './inkstormLayout';
import { normalizePlayerInput, type PlayerInputState } from '../input/actions';
import {
  GALACTIC_VEHICLES,
  applyGalacticImpact,
  augmentGalacticAIInput,
  beginGalacticWreck,
  collectGalacticUpgrade,
  completeGalacticRecovery,
  createGalacticRacerState,
  createGalacticWorldState,
  deployScrapMine,
  deriveGalacticVehicleConfig,
  nextGalacticVehicleClass,
  noteGalacticRacerAggression,
  snapshotGalacticRacer,
  spawnHeatLance,
  stepGalacticRacerAction,
  stepGalacticWorld,
  validateWorkshopLoadout,
  type GalacticEvent,
  type GalacticImpact,
  type GalacticRacerSnapshot,
  type GalacticRacerState,
  type GalacticVehicleClass,
  type GalacticWorldState,
  type WorkshopLoadout,
} from '../galactic';
import {
  createAIControllerState,
  stepAIController,
  type AIControllerState,
  type AIEvent,
  type AIPersonality,
  type AIRacerSnapshot,
} from '../ai';
import { DEFAULT_PODRACER_CONFIG, type PodracerConfig } from '../simulation/config';
import {
  createPodracerState,
  setPodracerRespawnPose,
  stepPodracer,
} from '../simulation/podracer';
import type {
  CollisionImpulse,
  HeightSampler,
  PodracerEvent,
  PodracerState,
} from '../simulation/types';
import { createProceduralPodraceCourse, PodraceCourse, wrapCourseProgress } from './course';
import { createRaceDirectorState, stepRaceDirector } from './director';
import {
  applyDraftingInputModifier,
  applyLaunchInputModifier,
  applyLaunchOutcome,
  createRaceModeState,
  createRacerCompetitionState,
  createRacerDraftingState,
  createRacerLaunchState,
  resolveLaunchOutcome,
  stepDraftingField,
  stepLaunchCharge,
  sumTeamScores,
} from './dynamics';
import {
  createRacerWorkshopState,
  deriveWorkshopVehicleConfig,
  workshopIncomingDamageScale,
  workshopShieldDurationScale,
  workshopStatMultiplier,
  workshopWeaponDamageScale,
} from './workshopRuntime';
import { createRacerProgressState, racerRaceScore, updateRacerProgress } from './progress';
import { createBridgeHeightSampler, groundPylonConflictsWithBridge } from './bridgeSurface';
import type { CompetitionProfile } from '../mastery/types';
import type {
  AIDifficulty,
  RaceCourseBranch,
  RaceEntryState,
  RaceEvent,
  RaceMode,
  RaceResultEntry,
  RaceSimulationState,
} from './types';

const DEFAULT_RACE_SEED = 0x504f4452;

const AI_GRID: readonly { id: string; name: string; personality: AIPersonality }[] = Object.freeze([
  { id: 'ai-vexa', name: 'Vexa Ruun', personality: 'aggressive' },
  { id: 'ai-talik', name: 'Talik Venn', personality: 'clean' },
  { id: 'ai-kodo', name: 'Kodo Fizz', personality: 'erratic' },
  { id: 'ai-sola', name: 'Sola Dinn', personality: 'clean' },
  { id: 'ai-rax', name: 'Rax Kordo', personality: 'aggressive' },
  { id: 'ai-miri', name: 'Miri Voss', personality: 'erratic' },
  { id: 'ai-olan', name: 'Olan Tarr', personality: 'clean' },
]);

const RACE_MODES: readonly RaceMode[] = Object.freeze([
  'circuit',
  'eliminator',
  'checkpoint-sprint',
  'combat-race',
  'survival-gauntlet',
  'drift-trial',
  'team-race',
]);

const AI_DIFFICULTIES: readonly AIDifficulty[] = Object.freeze(['easy', 'medium', 'hard']);

export interface RaceSimulationOptions {
  terrain: HeightSampler;
  course?: PodraceCourse;
  seed?: number;
  totalLaps?: number;
  mode?: RaceMode;
  aiDifficulty?: AIDifficulty;
  /** Clean events disable weapons, pickups and random hazards; trials are solo. */
  competitionProfile?: CompetitionProfile;
  /** Player plus AI, clamped to the shipped 4-8 racer layouts. Default: 8. */
  fieldSize?: number;
  /** Optional semantic route contract supplied by a richer course generator. */
  courseBranches?: readonly RaceCourseBranch[];
  /** Optional sanitized pre-race builds keyed by stable racer id. */
  workshopLoadouts?: Readonly<Record<string, unknown>>;
  countdownSeconds?: number;
  /** Time to let visible rivals finish before the remaining field is classified. */
  resultsGraceSeconds?: number;
  /** Forward-progress timeout before an AI is returned to its last checkpoint. */
  aiStallRecoverySeconds?: number;
  /** Sustained time well outside the racing corridor before automatic recovery. */
  offCourseRecoverySeconds?: number;
  /** Distance beyond the course edge that starts the sustained recovery timer. */
  offCourseRecoveryDistance?: number;
  /** Distance beyond the course edge that causes immediate recovery. */
  extremeOffCourseRecoveryDistance?: number;
  playerVehicle?: PodracerState;
  playerId?: string;
  playerName?: string;
  config?: Readonly<PodracerConfig>;
}

export interface RaceStepResult {
  state: RaceSimulationState<AIControllerState>;
  events: RaceEvent[];
  aiEvents: AIEvent[];
  vehicleEvents: Readonly<Record<string, readonly PodracerEvent[]>>;
  inputs: Readonly<Record<string, PlayerInputState>>;
  galacticEvents: readonly GalacticEvent[];
}

/** Human-controlled slots supplied by an authoritative host for this tick. */
export type ExternalRacerInputs = Readonly<
  Record<string, Partial<PlayerInputState> | undefined>
>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveCourseBranches(
  course: PodraceCourse,
  explicit: readonly RaceCourseBranch[] | undefined,
): RaceCourseBranch[] {
  const provider = course as unknown as {
    branches?: unknown;
    getBranches?: () => unknown;
  };
  const candidate = explicit ?? (
    Array.isArray(provider.branches)
      ? provider.branches
      : typeof provider.getBranches === 'function'
        ? provider.getBranches()
        : []
  );
  if (!Array.isArray(candidate)) return [];
  const branches: RaceCourseBranch[] = [];
  for (const value of candidate) {
    if (!value || typeof value !== 'object') continue;
    const branch = value as Partial<RaceCourseBranch> & {
      entryProgress?: number;
      exitProgress?: number;
      points?: readonly { x?: number; z?: number; canonicalProgress?: number }[];
    };
    const startProgress = branch.startProgress ?? branch.entryProgress;
    const endProgress = branch.endProgress ?? branch.exitProgress;
    if (
      typeof branch.id !== 'string'
      || typeof startProgress !== 'number'
      || !Number.isFinite(startProgress)
      || typeof endProgress !== 'number'
      || !Number.isFinite(endProgress)
    ) continue;
    let entrySide: -1 | 1 = branch.entrySide === -1 ? -1 : 1;
    if (branch.entrySide !== -1 && branch.entrySide !== 1 && branch.points?.length) {
      const middle = branch.points[Math.floor(branch.points.length * 0.5)];
      if (
        middle
        && typeof middle.x === 'number'
        && typeof middle.z === 'number'
        && typeof middle.canonicalProgress === 'number'
      ) {
        const canonical = course.sampleAtProgress(middle.canonicalProgress);
        const lateral = (middle.x - canonical.x) * canonical.rightX
          + (middle.z - canonical.z) * canonical.rightZ;
        entrySide = lateral < 0 ? -1 : 1;
      }
    }
    const sectionTag = branch.sectionTag
      ?? course.sampleAtProgress(startProgress).tag;
    branches.push({
      id: branch.id,
      startProgress: wrapCourseProgress(startProgress),
      endProgress: wrapCourseProgress(endProgress),
      entrySide,
      risk: clamp(Number.isFinite(branch.risk) ? branch.risk ?? 0.5 : 0.5, 0, 1),
      reward: clamp(Number.isFinite(branch.reward) ? branch.reward ?? 0.5 : 0.5, 0, 1),
      sectionTag,
    });
  }
  return branches;
}

function snapshotRacer(entry: RaceEntryState<AIControllerState>): AIRacerSnapshot {
  return {
    id: entry.id,
    x: entry.vehicle.position.x,
    y: entry.vehicle.position.y,
    z: entry.vehicle.position.z,
    velocityX: entry.vehicle.velocity.x,
    velocityY: entry.vehicle.velocity.y,
    velocityZ: entry.vehicle.velocity.z,
    yaw: entry.vehicle.orientation.yaw,
    speed: entry.vehicle.telemetry.speed,
    boostEnergy: entry.vehicle.boost.energy,
    heat: entry.vehicle.heat,
    grounded: entry.vehicle.grounded,
    courseProgress: entry.progress.courseProgress,
    unwrappedProgress: entry.progress.unwrappedProgress,
    completedLaps: entry.progress.completedLaps,
    finished: entry.status === 'finished',
    teamId: entry.competition?.teamId,
  };
}

function makeResult(entry: RaceEntryState<AIControllerState>): RaceResultEntry {
  return {
    id: entry.id,
    name: entry.name,
    placement: entry.progress.placement ?? 999,
    finishTime: entry.progress.finishTime,
    lapTimes: [...entry.progress.lapTimes],
    splits: entry.progress.splits.map((split) => ({ ...split })),
    score: entry.competition?.score ?? 0,
    teamId: entry.competition?.teamId,
    finishReason: entry.competition?.finishReason,
  };
}

export class RaceSimulation {
  readonly terrain: HeightSampler;
  readonly course: PodraceCourse;
  readonly courseGulfField: CourseGulfField | null;
  readonly pitPadField: PitPadField | null;
  readonly config: Readonly<PodracerConfig>;
  state: RaceSimulationState<AIControllerState>;
  private readonly markerColliders: readonly { x: number; z: number; id: string; minY: number; maxY: number }[];
  private readonly markerContactSteps = new Map<string, number>();
  private readonly markerImpactStepsByRacer = new Map<string, number>();
  private activeMarkerContacts = new Set<string>();
  private readonly obstacleContactSteps = new Map<string, number>();
  private activeObstacleContacts = new Set<string>();
  private readonly racerContactSteps = new Map<string, number>();
  private activeRacerContacts = new Set<string>();
  private readonly offCourseRecoveryTimers = new Map<string, number>();
  private readonly aiLastRaceScores = new Map<string, number>();
  private readonly aiStallSeconds = new Map<string, number>();
  private readonly entryIndexById = new Map<string, number>();
  private readonly entriesById = new Map<string, RaceEntryState<AIControllerState>>();
  private readonly maximumCheckpointGapProgress: number;
  private playerVehicleSelectionLockedValue = false;
  private configuredTotalLapsValue: 1 | 2 | 3;
  private configuredAIDifficultyValue: AIDifficulty;
  private configuredRaceModeValue: RaceMode;
  private readonly vehicleSelections = new Map<string, GalacticVehicleClass>();
  /** `null` is an explicit lobby clear and prevents an option loadout returning on reset. */
  private readonly workshopSelections = new Map<string, WorkshopLoadout | null>();
  private readonly runtimeConfigs = new Map<string, {
    vehicleClass: GalacticVehicleClass;
    afterburner: number;
    cornering: number;
    resilience: number;
    parts: readonly string[];
    workshopKey: string;
    config: Readonly<PodracerConfig>;
  }>();

  private readonly options: Readonly<{
    seed: number;
    totalLaps: number;
    fieldSize: number;
    competitionProfile: CompetitionProfile;
    courseBranches: readonly RaceCourseBranch[];
    workshopLoadouts: Readonly<Record<string, unknown>>;
    countdownSeconds: number;
    resultsGraceSeconds: number;
    aiStallRecoverySeconds: number;
    offCourseRecoverySeconds: number;
    offCourseRecoveryDistance: number;
    extremeOffCourseRecoveryDistance: number;
    playerId: string;
    playerName: string;
    suppliedPlayerVehicle: PodracerState | undefined;
  }>;

  constructor(options: RaceSimulationOptions) {
    const raceSeed = (options.seed ?? DEFAULT_RACE_SEED) >>> 0;
    // Seed search and cached lane/deck heights use the original landscape.
    // Only after generation does this instance-owned sampler acquire its gulf.
    // Direct simulations, host and guest therefore use the same physical field.
    let courseGulfField: CourseGulfField | null = null;
    let pitPadField: PitPadField | null = null;
    const courseTerrain: HeightSampler = {
      heightAt: (x, z) => options.terrain.heightAt(x, z)
        + (courseGulfField?.sampleOffset(x, z) ?? 0) + (pitPadField?.sampleOffset(x, z) ?? 0),
    };
    this.course = options.course ?? createProceduralPodraceCourse(courseTerrain, raceSeed);
    // Explicitly supplied courses retain their caller-owned height contract;
    // do not add a field only to physics while their own sampler stays unchanged.
    this.courseGulfField = courseGulfField = options.course ? null : createCourseGulfField(this.course);
    if (courseGulfField) this.course.refreshTerrainHeights(options.terrain);
    // Freeze the rigid workshops against the pre-pad landscape. The callback
    // deliberately excludes pitPadField, including after the field is installed.
    // Existing routes, checkpoints and bridge decks need no height refresh:
    // their complete shoulder/normal footprints receive exactly zero pad offset.
    this.pitPadField = pitPadField = options.course ? null : createPitPadField(
      getInkstormLayout(this.course),
      Array.from({ length: 2048 }, (_, i) => this.course.samplePlanAtProgress(i / 2048)),
      this.course.branches,
      (x, z) => options.terrain.heightAt(x, z) + (courseGulfField?.sampleOffset(x, z) ?? 0),
    );
    this.terrain = createBridgeHeightSampler(courseTerrain, this.course.branches);
    this.config = options.config ?? DEFAULT_PODRACER_CONFIG;
    this.markerColliders = this.createMarkerColliders();
    this.maximumCheckpointGapProgress = this.computeMaximumCheckpointGapProgress();
    this.options = Object.freeze({
      seed: raceSeed,
      totalLaps: clamp(Math.floor(options.totalLaps ?? 3), 1, 3),
      fieldSize: options.competitionProfile === 'time-trial' || options.competitionProfile === 'training'
        ? 1 : clamp(Math.floor(options.fieldSize ?? 8), 4, 8),
      competitionProfile: options.competitionProfile ?? 'chaos',
      courseBranches: resolveCourseBranches(this.course, options.courseBranches),
      workshopLoadouts: { ...(options.workshopLoadouts ?? {}) },
      countdownSeconds: clamp(options.countdownSeconds ?? 3, 0, 10),
      resultsGraceSeconds: clamp(options.resultsGraceSeconds ?? 8, 2, 20),
      aiStallRecoverySeconds: clamp(options.aiStallRecoverySeconds ?? 7, 2, 20),
      offCourseRecoverySeconds: clamp(options.offCourseRecoverySeconds ?? 2.1, 0.5, 8),
      offCourseRecoveryDistance: clamp(options.offCourseRecoveryDistance ?? 64, 30, 180),
      extremeOffCourseRecoveryDistance: clamp(
        options.extremeOffCourseRecoveryDistance ?? 150,
        80,
        400,
      ),
      playerId: options.playerId ?? 'player',
      playerName: options.playerName ?? 'You',
      suppliedPlayerVehicle: options.playerVehicle,
    });
    this.configuredTotalLapsValue = this.options.totalLaps as 1 | 2 | 3;
    this.configuredAIDifficultyValue = AI_DIFFICULTIES.includes(options.aiDifficulty ?? 'medium')
      ? options.aiDifficulty ?? 'medium'
      : 'medium';
    this.configuredRaceModeValue = RACE_MODES.includes(options.mode ?? 'circuit')
      ? options.mode ?? 'circuit'
      : 'circuit';
    this.state = this.createInitialState();
    this.indexEntries();
  }

  step(
    rawPlayerInput: Partial<PlayerInputState> = {},
    externalInputsByRacerId: ExternalRacerInputs = {},
  ): RaceStepResult {
    const events: RaceEvent[] = [];
    const aiEvents: AIEvent[] = [];
    const galacticEvents: GalacticEvent[] = [];
    const vehicleEvents: Record<string, readonly PodracerEvent[]> = {};
    const inputs: Record<string, PlayerInputState> = {};
    const delta = this.config.fixedDelta;
    const playerInput = normalizePlayerInput(rawPlayerInput);
    const phaseAtStart = this.state.phase;
    this.state.step += 1;
    const entries = this.state.entries;
    const externallyControlledRacerIds = new Set<string>();
    for (const entry of entries) {
      if (!entry.isPlayer && externalInputsByRacerId[entry.id] !== undefined) {
        externallyControlledRacerIds.add(entry.id);
      }
    }

    // Vehicle choice is a grid-only action and is edge-triggered in the same
    // serializable control memory as weapons. Rebuilding the vehicle in place
    // preserves renderer references while applying the class's real physics.
    const playerEntry = this.state.entries.find((entry) => entry.isPlayer);
    if (
      phaseAtStart === 'countdown'
      && !this.playerVehicleSelectionLockedValue
      && playerEntry
      && playerInput.cycleVehicle
      && !this.galacticFor(playerEntry).controls.cycleVehicleHeld
    ) {
      this.cyclePlayerVehicle(playerEntry, galacticEvents);
    }

    if (this.state.phase === 'countdown') {
      const releasesGridThisTick = this.state.countdownRemaining <= delta;
      this.stepCountdownLaunch(
        playerInput,
        externalInputsByRacerId,
        externallyControlledRacerIds,
        delta,
      );
      this.advanceCountdown(delta, events);
      if (releasesGridThisTick) this.releaseStartingGrid(events);
    } else if (this.state.phase === 'racing') {
      this.state.raceTime += delta;
    }

    if (this.state.phase === 'racing' && playerEntry && this.competitionProfile === 'chaos') {
      events.push(...stepRaceDirector(
        this.state.director,
        playerEntry,
        this.state.raceTime,
      ));
      events.push(...stepDraftingField(entries, delta));
    }
    if (this.state.phase === 'racing' && this.competitionProfile === 'clean-race') {
      events.push(...stepDraftingField(entries, delta));
    }
    const vehicleConfigs = entries.map((entry) => this.vehicleConfigFor(entry));
    const collisionImpulses = this.state.phase === 'racing'
      ? this.buildCollisionImpulses(vehicleConfigs, externallyControlledRacerIds)
      : entries.map(() => [] as CollisionImpulse[]);
    const snapshots = entries.map(snapshotRacer);
    const galacticSnapshots = this.galacticSnapshots();
    const playerScore = playerEntry ? racerRaceScore(playerEntry) : 0;
    const aiOpponentsByIndex: Array<readonly AIRacerSnapshot[] | undefined> = new Array(
      entries.length,
    );
    const galacticOpponentsByIndex: GalacticRacerSnapshot[][] = new Array(entries.length);
    for (let racerIndex = 0; racerIndex < entries.length; racerIndex += 1) {
      const galacticOpponents: GalacticRacerSnapshot[] = [];
      const aiOpponents = entries[racerIndex]?.ai ? [] as AIRacerSnapshot[] : undefined;
      for (let opponentIndex = 0; opponentIndex < entries.length; opponentIndex += 1) {
        if (opponentIndex === racerIndex) continue;
        const galacticOpponent = galacticSnapshots[opponentIndex];
        const racer = entries[racerIndex];
        const opponent = entries[opponentIndex];
        const teammates = this.state.settings.mode === 'team-race'
          && racer?.competition?.teamId === opponent?.competition?.teamId;
        if (galacticOpponent && !teammates) galacticOpponents.push(galacticOpponent);
        const aiOpponent = snapshots[opponentIndex];
        if (aiOpponents && aiOpponent) aiOpponents.push(aiOpponent);
      }
      galacticOpponentsByIndex[racerIndex] = galacticOpponents;
      aiOpponentsByIndex[racerIndex] = aiOpponents;
    }

    // Existing ordnance moves before this tick's trigger actions. This makes
    // the causality explicit: a projectile spawned below begins moving on the
    // next fixed tick, which is stable in saves, replays and headless tests.
    const worldResult = this.state.phase === 'racing'
      ? stepGalacticWorld(this.state.galacticWorld, galacticSnapshots, delta)
      : { impacts: [], pickupClaims: [], events: [] };
    galacticEvents.push(...worldResult.events);

    const latestImpact: Array<GalacticImpact | undefined> = new Array(entries.length);
    for (const impact of worldResult.impacts) {
      const targetIndex = this.entryIndexById.get(impact.targetId);
      if (targetIndex === undefined) continue;
      const target = entries[targetIndex];
      if (!target) continue;
      const tunedImpact = target.workshop
        ? {
            ...impact,
            damage: impact.damage * workshopIncomingDamageScale(target.workshop),
          }
        : impact;
      const result = applyGalacticImpact(
        target.id,
        this.galacticFor(target),
        target.vehicle,
        vehicleConfigs[targetIndex] ?? this.vehicleConfigFor(target),
        tunedImpact,
      );
      latestImpact[targetIndex] = tunedImpact;
      galacticEvents.push(...result.events);
      if (impact.sourceId) noteGalacticRacerAggression(this.galacticFor(target), impact.sourceId);
      if (impact.weapon && impact.sourceId) {
        const attacker = this.entriesById.get(impact.sourceId);
        if (attacker) this.galacticFor(attacker).weapon.hits += 1;
      }
      galacticEvents.push(...beginGalacticWreck(
        target.id,
        this.galacticFor(target),
        target.vehicle,
        this.state.galacticWorld,
        impact.cause,
        impact.sourceId,
        target.isPlayer,
      ));
    }
    for (const claim of worldResult.pickupClaims) {
      const collector = this.entriesById.get(claim.racerId);
      if (!collector) continue;
      if (isCombatPickup(claim.part)) {
        const collectorState = this.galacticFor(collector);
        const enemies = entries.filter((entry) => entry.id !== collector.id
          && entry.status !== 'finished'
          && !(this.state.settings.mode === 'team-race'
            && entry.competition?.teamId === collector.competition?.teamId))
          .map((entry) => ({ id: entry.id, vehicle: entry.vehicle, galactic: this.galacticFor(entry) }));
        galacticEvents.push(...collectCombatPickup(claim.pickupId, claim.part,
          { id: collector.id, vehicle: collector.vehicle, galactic: collectorState },
          enemies, this.state.galacticWorld));
        continue;
      }
      const event = collectGalacticUpgrade(
        collector.id,
        this.galacticFor(collector),
        claim.pickupId,
        claim.part,
      );
      if (event) {
        if (collector.workshop) {
          // The run-local mine-printer may add rack space, but it must never
          // erase a larger permanent workshop rack when collected at six.
          this.galacticFor(collector).mine.charges = Math.max(
            this.galacticFor(collector).mine.charges,
            collector.workshop.mineCapacity,
          );
        }
        this.runtimeConfigs.delete(collector.id);
        const collectorIndex = this.entryIndexById.get(collector.id);
        if (collectorIndex !== undefined) {
          vehicleConfigs[collectorIndex] = this.vehicleConfigFor(collector);
        }
        galacticEvents.push(event);
      }
    }

    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];
      if (!entry) continue;
      let input: PlayerInputState;
      if (this.state.phase === 'countdown') {
        input = normalizePlayerInput({
          throttle: entry.launch?.committedThrottle ?? 0,
          brake: 0.25,
          cycleVehicle: entry.isPlayer && playerInput.cycleVehicle,
        });
      } else if (entry.status === 'finished' || this.state.phase === 'finished') {
        input = normalizePlayerInput({ throttle: 0.12, brake: 0.25 });
      } else if (entry.isPlayer) {
        input = playerInput;
      } else if (externallyControlledRacerIds.has(entry.id)) {
        input = normalizePlayerInput(externalInputsByRacerId[entry.id]);
      } else if (entry.ai) {
        const self = snapshots[entryIndex];
        if (!self) throw new Error(`Missing AI perception snapshot for ${entry.id}.`);
        const aiResult = stepAIController(entry.ai, {
          course: this.course,
          self,
          opponents: aiOpponentsByIndex[entryIndex] ?? [],
          playerRaceScore: playerScore,
          requiredCheckpoint: this.requiredCheckpointFor(entry),
          delta,
          raceTime: this.state.raceTime,
          raceMode: this.state.settings.mode,
          allowCatchup: this.competitionProfile === 'chaos',
          vehicleConfig: this.vehicleConfigFor(entry),
          position: entry.progress.placement ?? entryIndex + 1,
          activeRacerCount: entries.filter(
            (racer) => !racer.competition?.eliminated && racer.status !== 'finished',
          ).length,
        });
        input = aiResult.input;
        aiEvents.push(...aiResult.events);
        const stalled = (this.aiStallSeconds.get(entry.id) ?? 0)
          >= this.options.aiStallRecoverySeconds;
        const missedCheckpoint = this.aiMissedRequiredCheckpoint(entry);
        if (
          entry.progress.offCourseDistance > 68
          || entry.progress.wrongWayTimer > 4.2
          || stalled
          || missedCheckpoint
        ) {
          if (missedCheckpoint) this.armRequiredCheckpointRecovery(entry);
          input = { ...input, reset: true };
          if (stalled) {
            // One edge-triggered reset is enough. Clearing the watchdog here
            // lets the following neutral-reset tick re-arm the vehicle latch.
            this.aiStallSeconds.set(entry.id, 0);
            this.aiLastRaceScores.set(entry.id, racerRaceScore(entry));
          }
        }

        const galacticSelf = galacticSnapshots[entryIndex];
        if (!galacticSelf) throw new Error(`Missing combat perception snapshot for ${entry.id}.`);
        input = augmentGalacticAIInput(
          input,
          galacticSelf,
          galacticOpponentsByIndex[entryIndex] ?? [],
          this.state.step,
        );
        input = this.applyModeAIObjective(entry, input);
      } else {
        input = normalizePlayerInput();
      }

      if (this.state.phase === 'racing' && entry.status !== 'finished') {
        if (entry.launch) input = applyLaunchInputModifier(input, entry.launch, delta);
        if (entry.drafting) {
          input = applyDraftingInputModifier(input, entry.drafting, entry.vehicle.seed, this.state.step);
        }
        input = this.applyDirectorEffects(entry, input, delta, events);
      }

      if (
        this.state.phase === 'racing'
        && entry.status !== 'finished'
        // Preserve the collision tick so impacts, damage, takedown attribution
        // and audiovisual feedback are not swallowed by a simultaneous reset.
        && (collisionImpulses[entryIndex]?.length ?? 0) === 0
        && this.shouldAutomaticallyRecoverOffCourse(entry, delta)
      ) {
        // Automatic recovery is a guaranteed edge, even if the player was
        // already holding the manual reset control on the previous tick.
        entry.vehicle.controls.resetHeld = false;
        setPodracerRespawnPose(entry.vehicle, entry.progress.resetPose);
        input = { ...input, reset: true };
      }

      const self = galacticSnapshots[entryIndex];
      if (!self) throw new Error(`Missing combat snapshot for ${entry.id}.`);
      if (this.competitionProfile !== 'chaos') {
        input = { ...input, fire: false, mine: false, shield: false };
      }
      const galactic = this.galacticFor(entry);
      const redlineHeatBefore = galactic.redline.heat;
      const redlinePeakBefore = galactic.redline.peakHeat;
      const action = stepGalacticRacerAction(galactic, {
        step: this.state.step,
        delta,
        racing: this.state.phase === 'racing' && entry.status !== 'finished',
        input,
        normalizedInput: true,
        self,
        opponents: galacticOpponentsByIndex[entryIndex] ?? [],
      });
      input = action.input;
      galacticEvents.push(...action.events);

      if (entry.workshop) {
        const coolingScale = workshopStatMultiplier(entry.workshop, 'cooling');
        if (galactic.redline.heat >= redlineHeatBefore) {
          galactic.redline.heat = redlineHeatBefore
            + (galactic.redline.heat - redlineHeatBefore) / coolingScale;
        } else {
          galactic.redline.heat = redlineHeatBefore
            - (redlineHeatBefore - galactic.redline.heat) * coolingScale;
        }
        galactic.redline.heat = clamp(galactic.redline.heat, 0, 1);
        galactic.redline.peakHeat = Math.max(redlinePeakBefore, galactic.redline.heat);
      }

      if (action.activateShield && entry.workshop) {
        const durationBefore = galactic.shield.remaining;
        galactic.shield.remaining *= workshopShieldDurationScale(entry.workshop);
        galactic.shield.cooldown += galactic.shield.remaining - durationBefore;
        // Keep the already-emitted activation event authoritative for HUD/audio consumers.
        for (const event of action.events) {
          if (event.type === 'pulse-shell' && event.active) {
            event.cooldown = galactic.shield.cooldown;
          }
        }
      }

      if (action.fireHeatLance) {
        const projectile = spawnHeatLance(this.state.galacticWorld, self);
        projectile.damage *= workshopWeaponDamageScale(entry.workshop);
        galacticEvents.push({
          type: 'heat-lance-fired',
          racerId: entry.id,
          projectileId: projectile.id,
        });
      }
      if (action.deployMine) {
        const mine = deployScrapMine(this.state.galacticWorld, self);
        mine.damage *= workshopWeaponDamageScale(entry.workshop);
        galacticEvents.push({
          type: 'scrap-mine-deployed',
          racerId: entry.id,
          mineId: mine.id,
        });
      }
      if (action.redlineAcceleration > 0) {
        const redlineAcceleration = action.redlineAcceleration
          * workshopStatMultiplier(entry.workshop, 'boost', 0.65)
          * workshopStatMultiplier(entry.workshop, 'acceleration', 0.35);
        entry.vehicle.velocity.x += Math.sin(entry.vehicle.orientation.yaw)
          * redlineAcceleration * delta;
        entry.vehicle.velocity.z += Math.cos(entry.vehicle.orientation.yaw)
          * redlineAcceleration * delta;
      }
      if (action.redlineExploded) {
        galacticEvents.push(...beginGalacticWreck(
          entry.id,
          this.galacticFor(entry),
          entry.vehicle,
          this.state.galacticWorld,
          'redline-explosion',
          null,
          entry.isPlayer,
          true,
        ));
      }
      if (action.recoverNow) {
        // Recovery is a guaranteed edge even if an AI reset watchdog happened
        // to be held on the preceding tick.
        entry.vehicle.controls.resetHeld = false;
        input = { ...input, reset: true };
      }

      inputs[entry.id] = input;
      const config = vehicleConfigs[entryIndex] ?? this.vehicleConfigFor(entry);
      const vehicleResult = stepPodracer(entry.vehicle, input, {
        terrain: this.terrain,
        collisions: collisionImpulses[entryIndex],
      }, config);
      vehicleEvents[entry.id] = vehicleResult.events;

      if (action.recoverNow) completeGalacticRecovery(this.galacticFor(entry), entry.vehicle);
      for (const vehicleEvent of vehicleResult.events) {
        // Contact events also identify pylons, cliffs and authored scenery.
        // Keep that physical provenance, but only a roster member can earn an
        // assist or replace the most recent racer that pushed this victim.
        if (vehicleEvent.type === 'collision' && vehicleEvent.sourceId
          && vehicleEvent.sourceId !== entry.id && this.entriesById.has(vehicleEvent.sourceId)) {
          noteGalacticRacerAggression(this.galacticFor(entry), vehicleEvent.sourceId);
        }
        if (
          vehicleEvent.type === 'landing'
          && this.galacticFor(entry).upgrades.parts.includes('landing-recuperator')
        ) {
          entry.vehicle.boost.energy = clamp(
            entry.vehicle.boost.energy + vehicleEvent.intensity * 0.12,
            0,
            1,
          );
        }
      }
      const collisionSource = vehicleResult.events.find(
        (event): event is Extract<PodracerEvent, { type: 'collision' }> => event.type === 'collision'
          && event.sourceId != null && event.sourceId !== entry.id
          && this.entriesById.has(event.sourceId),
      )?.sourceId ?? null;
      const impact = latestImpact[entryIndex];
      galacticEvents.push(...beginGalacticWreck(
        entry.id,
        this.galacticFor(entry),
        entry.vehicle,
        this.state.galacticWorld,
        impact?.cause ?? 'impact',
        collisionSource ?? impact?.sourceId ?? null,
        entry.isPlayer,
      ));
    }

    this.creditTakedowns(galacticEvents);

    if (this.state.phase === 'racing') {
      const previousPlacements = new Map<string, number>();
      for (const entry of this.state.entries) {
        if (entry.progress.placement !== null) {
          previousPlacements.set(entry.id, entry.progress.placement);
        }
      }
      const newlyFinished: RaceEntryState<AIControllerState>[] = [];
      for (const entry of this.state.entries) {
        if (entry.status === 'finished') continue;
        entry.status = 'racing';
        const progressEvents = updateRacerProgress(entry, this.course, {
          delta,
          raceTime: this.state.raceTime,
          totalLaps: this.state.totalLaps,
        });
        events.push(...progressEvents);
        this.scoreProgressEvents(entry, progressEvents, events);
        if (externallyControlledRacerIds.has(entry.id)) {
          // A connected human is not an AI stall. Clearing the watchdog makes
          // a later disconnect fall back to a fresh controller instead of
          // immediately respawning because the human paused on track.
          this.aiLastRaceScores.delete(entry.id);
          this.aiStallSeconds.delete(entry.id);
        } else {
          this.trackAiForwardProgress(entry, delta);
        }
        if (entry.progress.finishTime !== null) {
          if (entry.competition) entry.competition.finishReason = 'finish-line';
          newlyFinished.push(entry);
        }
      }
      this.stepModeRules(events, galacticEvents, delta);
      this.updateStandings();
      this.appendOvertakeEvents(previousPlacements, events);
      for (const entry of newlyFinished) {
        events.push({
          type: 'finish',
          racerId: entry.id,
          placement: entry.progress.placement ?? this.state.entries.length,
          totalTime: entry.progress.finishTime ?? this.state.raceTime,
        });
      }
      const player = this.state.entries.find((entry) => entry.isPlayer);
      const allFinished = this.state.entries.every((entry) => entry.status === 'finished');
      const playerFinishTime = player?.progress.finishTime;
      const classificationDue = playerFinishTime !== null && playerFinishTime !== undefined
        && this.state.raceTime - playerFinishTime >= this.options.resultsGraceSeconds;
      const playerEliminated = player?.competition?.eliminated === true;
      const modeComplete = this.isModeComplete();
      if (allFinished || classificationDue || playerEliminated || modeComplete) {
        if (!allFinished) this.classifyRemainingRacers(events);
        this.finishRace(events);
      }
    }

    return { state: this.state, events, aiEvents, vehicleEvents, inputs, galacticEvents };
  }

  reset(): RaceSimulationState<AIControllerState> {
    this.clearTransientRuntimeState();
    this.playerVehicleSelectionLockedValue = false;
    this.state = this.createInitialState();
    this.indexEntries();
    return this.state;
  }

  /** Current lobby/grid lap count. It remains stable across reset/rematch. */
  get totalLaps(): 1 | 2 | 3 {
    return this.configuredTotalLapsValue;
  }

  /** Changes lap count only before the starting grid is released. */
  setTotalLaps(totalLaps: number): boolean {
    if (this.state.phase !== 'countdown' || ![1, 2, 3].includes(totalLaps)) return false;
    this.configuredTotalLapsValue = totalLaps as 1 | 2 | 3;
    this.state.totalLaps = this.configuredTotalLapsValue;
    this.state.director = createRaceDirectorState(
      this.course,
      this.options.seed,
      this.configuredTotalLapsValue,
      this.state.settings.branches,
    );
    if (this.competitionProfile !== 'chaos') this.state.director.events = [];
    this.state.modeState = createRaceModeState(
      this.configuredRaceModeValue,
      this.state.entries.length,
      this.course.checkpoints.length * this.configuredTotalLapsValue,
    );
    return true;
  }

  get aiDifficulty(): AIDifficulty {
    return this.configuredAIDifficultyValue;
  }

  /** Changes all AI controller tunes while the pre-race menu is still open. */
  setAIDifficulty(difficulty: AIDifficulty): boolean {
    if (
      this.state.phase !== 'countdown'
      || this.playerVehicleSelectionLockedValue
      || !AI_DIFFICULTIES.includes(difficulty)
    ) return false;
    this.configuredAIDifficultyValue = difficulty;
    this.state.settings.aiDifficulty = difficulty;
    for (const entry of this.state.entries) {
      if (!entry.ai) continue;
      entry.ai = createAIControllerState(entry.ai.personality, entry.ai.seed, difficulty);
    }
    return true;
  }

  get raceMode(): RaceMode {
    return this.configuredRaceModeValue;
  }

  /** Selects a mode without rebuilding vehicle/grid references. */
  setRaceMode(mode: RaceMode): boolean {
    if (
      this.state.phase !== 'countdown'
      || this.playerVehicleSelectionLockedValue
      || !RACE_MODES.includes(mode)
    ) return false;
    this.configuredRaceModeValue = mode;
    this.state.settings.mode = mode;
    this.state.modeState = createRaceModeState(
      mode,
      this.state.entries.length,
      this.course.checkpoints.length * this.state.totalLaps,
    );
    for (let index = 0; index < this.state.entries.length; index += 1) {
      const entry = this.state.entries[index];
      if (!entry) continue;
      entry.competition = createRacerCompetitionState(index);
    }
    return true;
  }

  get fieldSize(): number {
    return this.state.settings.fieldSize;
  }

  get competitionProfile(): CompetitionProfile {
    return this.state.settings.competitionProfile ?? 'chaos';
  }

  /** True after the player confirms the grid; vehicle choice is immutable for that race. */
  get playerVehicleSelectionLocked(): boolean {
    return this.playerVehicleSelectionLockedValue;
  }

  /** Commits the current grid choice before the countdown begins. */
  lockPlayerVehicleSelection(): void {
    this.playerVehicleSelectionLockedValue = true;
  }

  /**
   * Selects an exact vehicle while the registry is open. This direct API lets
   * DOM cards and number keys share the same deterministic rebuild path as V.
   */
  selectPlayerVehicle(vehicleClass: GalacticVehicleClass): GalacticEvent | null {
    const player = this.state.entries.find((entry) => entry.isPlayer);
    return player ? this.selectRacerVehicle(player.id, vehicleClass) : null;
  }

  /** Selects any stable lobby slot's class before the race starts. */
  selectRacerVehicle(
    racerId: string,
    vehicleClass: GalacticVehicleClass,
  ): GalacticEvent | null {
    if (this.playerVehicleSelectionLockedValue || this.state.phase !== 'countdown') return null;
    const racer = this.entriesById.get(racerId);
    if (!racer || this.galacticFor(racer).vehicleClass === vehicleClass) return null;
    const events: GalacticEvent[] = [];
    this.setRacerVehicleClass(racer, vehicleClass, events);
    return events[0] ?? null;
  }

  /** Applies a strict, versioned build to the local player's current chassis. */
  setPlayerWorkshopLoadout(loadout: unknown): boolean {
    const player = this.state.entries.find((entry) => entry.isPlayer);
    return player ? this.setRacerWorkshopLoadout(player.id, loadout) : false;
  }

  /**
   * Applies a build to one stable lobby slot. Invalid, repaired or mismatched
   * loadouts are rejected rather than silently changing competitive physics.
   */
  setRacerWorkshopLoadout(racerId: string, loadout: unknown): boolean {
    if (this.playerVehicleSelectionLockedValue || this.state.phase !== 'countdown') return false;
    if (this.competitionProfile !== 'chaos') return false;
    const entry = this.entriesById.get(racerId);
    if (!entry) return false;
    const vehicleClass = this.galacticFor(entry).vehicleClass;
    const validation = validateWorkshopLoadout(loadout, vehicleClass);
    if (!validation.valid || validation.loadout.vehicleClass !== vehicleClass) return false;
    const workshop = createRacerWorkshopState(validation.loadout);
    entry.workshop = workshop;
    this.workshopSelections.set(racerId, workshop.loadout);
    this.galacticFor(entry).mine.charges = workshop.mineCapacity;
    this.runtimeConfigs.delete(racerId);
    this.refreshEntryVehicleTune(entry);
    return true;
  }

  /** Restores the exact pre-workshop tune while the lobby remains open. */
  clearRacerWorkshopLoadout(racerId: string): boolean {
    if (this.playerVehicleSelectionLockedValue || this.state.phase !== 'countdown') return false;
    const entry = this.entriesById.get(racerId);
    if (!entry || !entry.workshop) return false;
    delete entry.workshop;
    this.workshopSelections.set(racerId, null);
    this.galacticFor(entry).mine.charges = 3;
    this.runtimeConfigs.delete(racerId);
    this.refreshEntryVehicleTune(entry);
    return true;
  }

  /** Deep JSON snapshot for saves, deterministic captures and debug tooling. */
  snapshot(): RaceSimulationState<AIControllerState> {
    return JSON.parse(JSON.stringify(this.state)) as RaceSimulationState<AIControllerState>;
  }

  /**
   * Replaces guest simulation truth with a host snapshot. The renderer's
   * supplied player vehicle is refreshed in place and attached to the guest's
   * assigned slot, so scene consumers never lose their object reference.
   */
  restoreAuthoritativeSnapshot(
    snapshot: Readonly<RaceSimulationState<AIControllerState>>,
    localRacerId: string,
  ): RaceSimulationState<AIControllerState> {
    if (snapshot.version !== 1 || !Array.isArray(snapshot.entries)) {
      throw new TypeError('Unsupported authoritative race snapshot.');
    }
    if (![1, 2, 3].includes(snapshot.totalLaps)) {
      throw new TypeError('Authoritative snapshot has an invalid lap count.');
    }
    const ids = new Set<string>();
    for (const entry of snapshot.entries) {
      if (!entry || typeof entry.id !== 'string' || ids.has(entry.id)) {
        throw new TypeError('Authoritative snapshot has invalid racer slots.');
      }
      ids.add(entry.id);
    }
    if (!ids.has(localRacerId)) {
      throw new TypeError(`Authoritative snapshot omits local racer ${localRacerId}.`);
    }

    const restored = JSON.parse(JSON.stringify(snapshot)) as RaceSimulationState<AIControllerState>;
    restored.settings ??= {
      mode: 'circuit',
      aiDifficulty: 'medium',
      fieldSize: restored.entries.length,
      maximumHumanRacers: 4,
      branches: [],
    };
    restored.director ??= createRaceDirectorState(
      this.course,
      restored.seed,
      restored.totalLaps,
      restored.settings.branches,
    );
    restored.modeState ??= createRaceModeState(
      restored.settings.mode,
      restored.entries.length,
      this.course.checkpoints.length * restored.totalLaps,
    );
    const localEntry = restored.entries.find((entry) => entry.id === localRacerId);
    if (!localEntry) throw new TypeError('Authoritative snapshot local racer is unavailable.');
    const preservedVehicle = this.options.suppliedPlayerVehicle
      ?? this.state.entries.find((entry) => entry.isPlayer)?.vehicle;
    if (preservedVehicle) {
      Object.assign(preservedVehicle, localEntry.vehicle);
      localEntry.vehicle = preservedVehicle;
    }
    for (let index = 0; index < restored.entries.length; index += 1) {
      const entry = restored.entries[index];
      if (!entry) continue;
      entry.isPlayer = entry.id === localRacerId;
      entry.launch ??= createRacerLaunchState();
      entry.drafting ??= createRacerDraftingState();
      entry.competition ??= createRacerCompetitionState(index);
      const vehicleClass = entry.galactic?.vehicleClass;
      if (vehicleClass) {
        this.vehicleSelections.set(entry.id, vehicleClass);
        const validation = entry.workshop
          ? validateWorkshopLoadout(entry.workshop.loadout, vehicleClass)
          : null;
        if (
          validation?.valid
          && validation.loadout.vehicleClass === vehicleClass
        ) {
          entry.workshop = createRacerWorkshopState(validation.loadout);
          this.workshopSelections.set(entry.id, entry.workshop.loadout);
        } else {
          delete entry.workshop;
          this.workshopSelections.set(entry.id, null);
        }
      }
    }

    this.clearTransientRuntimeState();
    this.configuredTotalLapsValue = restored.totalLaps as 1 | 2 | 3;
    this.configuredAIDifficultyValue = restored.settings.aiDifficulty;
    this.configuredRaceModeValue = restored.settings.mode;
    this.playerVehicleSelectionLockedValue = restored.phase !== 'countdown';
    this.state = restored;
    this.indexEntries();
    return this.state;
  }

  private stepCountdownLaunch(
    playerInput: PlayerInputState,
    externalInputsByRacerId: ExternalRacerInputs,
    externallyControlledRacerIds: ReadonlySet<string>,
    delta: number,
  ): void {
    for (const entry of this.state.entries) {
      const launch = entry.launch;
      if (!launch) continue;
      let throttle: number;
      if (entry.isPlayer) {
        throttle = playerInput.throttle;
      } else if (externallyControlledRacerIds.has(entry.id)) {
        throttle = normalizePlayerInput(externalInputsByRacerId[entry.id]).throttle;
      } else {
        const difficultyError = this.state.settings.aiDifficulty === 'easy'
          ? 0.17
          : this.state.settings.aiDifficulty === 'hard'
            ? 0.018
            : 0.065;
        throttle = launch.targetThrottle + Math.sin(
          this.state.step * 0.075 + (entry.vehicle.seed & 255),
        ) * difficultyError;
        // A few easy rivals deterministically bog or over-rev, making launch
        // performance readable without rolling hidden runtime randomness.
        if (this.state.settings.aiDifficulty === 'easy' && (entry.vehicle.seed & 7) === 0) {
          throttle = this.state.countdownRemaining < 0.5 ? 0.18 : throttle;
        }
      }
      stepLaunchCharge(
        launch,
        throttle,
        this.state.countdownRemaining,
        delta,
        entry.vehicle.seed,
      );
    }
  }

  private releaseStartingGrid(events: RaceEvent[]): void {
    for (const entry of this.state.entries) {
      const launch = entry.launch;
      if (!launch || launch.outcome !== 'pending') continue;
      const outcome = resolveLaunchOutcome(launch);
      applyLaunchOutcome(entry.vehicle, launch);
      events.push({ type: 'launch-result', racerId: entry.id, outcome });
    }
  }

  private applyModeAIObjective(
    entry: RaceEntryState<AIControllerState>,
    input: PlayerInputState,
  ): PlayerInputState {
    const mode = this.state.settings.mode;
    const cadence = (this.state.step + (entry.ai?.seed ?? 0)) >>> 0;
    switch (mode) {
      case 'combat-race':
        return normalizePlayerInput({
          ...input,
          fire: input.fire || cadence % 79 === 0,
          mine: input.mine || cadence % 367 === 0,
          shield: input.shield || (entry.vehicle.damage > 0.46 && cadence % 211 === 0),
        });
      case 'survival-gauntlet':
        return normalizePlayerInput({
          ...input,
          throttle: input.throttle * 0.93,
          shield: input.shield || (entry.vehicle.damage > 0.28 && cadence % 149 === 0),
        });
      case 'drift-trial':
        return normalizePlayerInput({
          ...input,
          drift: input.drift || (
            entry.vehicle.telemetry.speed > 48 && Math.abs(input.steer) > 0.12
          ),
          fire: false,
          mine: false,
        });
      case 'eliminator': {
        const lastPlace = (entry.progress.placement ?? 1) >= this.state.entries.length - 1;
        return normalizePlayerInput({ ...input, boost: input.boost || lastPlace });
      }
      case 'checkpoint-sprint':
        return normalizePlayerInput({
          ...input,
          boost: input.boost || entry.progress.cornerPreview.severity < 0.08,
        });
      default:
        return input;
    }
  }

  private applyDirectorEffects(
    entry: RaceEntryState<AIControllerState>,
    input: PlayerInputState,
    delta: number,
    events: RaceEvent[],
  ): PlayerInputState {
    const environment = this.state.director.environment;
    let modified = input;
    if (environment.windStrength > 0) {
      const gust = Math.sin(this.state.step * 0.137 + (entry.vehicle.seed & 127))
        * environment.windStrength;
      entry.vehicle.velocity.x += gust * 1.8 * delta;
      modified = normalizePlayerInput({ ...modified, steer: modified.steer + gust * 0.09 });
    }
    if (environment.coolingScale < 1) {
      entry.vehicle.heat = clamp(
        entry.vehicle.heat + (1 - environment.coolingScale) * delta * 0.18,
        0,
        1.25,
      );
    }

    const sample = this.course.sampleAtProgress(entry.progress.courseProgress);
    if (environment.tractionScale < 1) {
      const lateralSpeed = entry.vehicle.velocity.x * sample.rightX
        + entry.vehicle.velocity.z * sample.rightZ;
      const retainedSlip = lateralSpeed * (1 - environment.tractionScale) * delta * 3.2;
      entry.vehicle.velocity.x += sample.rightX * retainedSlip;
      entry.vehicle.velocity.z += sample.rightZ * retainedSlip;
    }
    for (const scheduled of this.state.director.events) {
      if (scheduled.phase !== 'active' || sample.tag !== scheduled.sectionTag) continue;
      if (scheduled.kind === 'lane-collapse') {
        const blocked = Math.sign(entry.progress.lateralOffset || scheduled.side) === scheduled.side
          && Math.abs(entry.progress.lateralOffset) > sample.width * 0.18;
        if (blocked) {
          entry.vehicle.velocity.x -= sample.rightX * scheduled.side * 18 * delta;
          entry.vehicle.velocity.z -= sample.rightZ * scheduled.side * 18 * delta;
          entry.vehicle.damage = clamp(entry.vehicle.damage + delta * 0.008, 0, 1);
          modified = normalizePlayerInput({ ...modified, throttle: modified.throttle * 0.72 });
        }
      } else if (scheduled.kind === 'gate-blackout') {
        const disorientation = Math.sin(this.state.step * 0.19 + entry.vehicle.seed) * 0.045;
        modified = normalizePlayerInput({ ...modified, steer: modified.steer + disorientation });
      } else if (scheduled.kind === 'shortcut-window' && scheduled.branchId) {
        const competition = entry.competition;
        const routeProjection = this.course.projectPoint(
          entry.vehicle.position.x,
          entry.vehicle.position.z,
          entry.progress.courseProgress,
        );
        const enteredBranch = routeProjection.branchId === scheduled.branchId || (
          Math.sign(entry.progress.lateralOffset || scheduled.side) === scheduled.side
          && Math.abs(entry.progress.lateralOffset) >= sample.width * 0.42
        );
        if (
          competition
          && enteredBranch
          && !competition.usedShortcutEventIds.includes(scheduled.id)
        ) {
          const branch = this.state.settings.branches.find(
            (candidate) => candidate.id === scheduled.branchId,
          );
          const reward = clamp(branch?.reward ?? 0.72, 0.2, 1);
          competition.usedShortcutEventIds.push(scheduled.id);
          competition.shortcutUses += 1;
          competition.score += Math.round(reward * 180);
          entry.vehicle.boost.energy = clamp(entry.vehicle.boost.energy + reward * 0.32, 0, 1);
          const impulse = 6 + reward * 13;
          entry.vehicle.velocity.x += sample.tangentX * impulse;
          entry.vehicle.velocity.z += sample.tangentZ * impulse;
          events.push({ type: 'shortcut-used', racerId: entry.id, branchId: scheduled.branchId, reward });
        }
      }
    }
    return modified;
  }

  private scoreProgressEvents(
    entry: RaceEntryState<AIControllerState>,
    progressEvents: readonly RaceEvent[],
    events: RaceEvent[],
  ): void {
    const competition = entry.competition;
    if (!competition) return;
    for (const event of progressEvents) {
      if (event.type !== 'checkpoint') continue;
      const amount = this.state.settings.mode === 'checkpoint-sprint' ? 180 : 80;
      competition.checkpointsPassed += 1;
      competition.checkpointScore += amount;
      competition.score += amount;
      events.push({
        type: 'score',
        racerId: entry.id,
        source: 'checkpoint',
        amount,
        total: competition.score,
      });
    }
  }

  private stepModeRules(
    events: RaceEvent[],
    galacticEvents: readonly GalacticEvent[],
    delta: number,
  ): void {
    const mode = this.state.settings.mode;
    if (mode === 'drift-trial') {
      for (const entry of this.state.entries) {
        const competition = entry.competition;
        if (!competition || entry.status === 'finished' || !entry.vehicle.drift.active) continue;
        const driftRate = entry.vehicle.telemetry.speed
          * (0.55 + Math.abs(entry.vehicle.drift.slipAngle) * 3.4)
          * 2.3;
        const amount = Math.max(0, driftRate * delta);
        competition.driftScore += amount;
        competition.score += amount;
      }
    }

    for (const event of galacticEvents) {
      if (event.type === 'weapon-hit' && mode === 'combat-race') {
        const attacker = this.entriesById.get(event.attackerId);
        if (!attacker?.competition) continue;
        const amount = event.shielded ? 35 : 120;
        attacker.competition.combatScore += amount;
        attacker.competition.score += amount;
        events.push({ type: 'score', racerId: attacker.id, source: 'combat', amount, total: attacker.competition.score });
      } else if (event.type === 'takedown') {
        const attacker = this.entriesById.get(event.attackerId);
        if (attacker?.competition) {
          const amount = mode === 'combat-race' ? 750 : 260;
          attacker.competition.combatScore += amount;
          attacker.competition.score += amount;
          events.push({ type: 'score', racerId: attacker.id, source: 'combat', amount, total: attacker.competition.score });
        }
      } else if (event.type === 'wreck' && mode === 'survival-gauntlet') {
        const victim = this.entriesById.get(event.racerId);
        const competition = victim?.competition;
        if (!victim || !competition || competition.eliminated) continue;
        competition.survivalLives = Math.max(0, competition.survivalLives - 1);
        if (competition.survivalLives === 0) {
          this.eliminateRacer(victim, 'destroyed', events);
        }
      }
    }

    if (mode === 'eliminator' && this.state.raceTime >= this.state.modeState.nextEliminationAt) {
      const active = this.state.entries
        .filter((entry) => !entry.competition?.eliminated && entry.status !== 'finished')
        .sort((a, b) => racerRaceScore(a) - racerRaceScore(b) || b.id.localeCompare(a.id));
      const last = active[0];
      if (last && active.length > 1) this.eliminateRacer(last, 'last-place', events);
      this.state.modeState.nextEliminationAt += this.state.modeState.eliminationInterval;
    }

    if (mode === 'team-race') {
      this.state.modeState.teamScores = sumTeamScores(this.state.entries);
    }
  }

  private eliminateRacer(
    entry: RaceEntryState<AIControllerState>,
    reason: 'last-place' | 'destroyed',
    events: RaceEvent[],
  ): void {
    const competition = entry.competition;
    if (!competition || competition.eliminated) return;
    competition.eliminated = true;
    competition.eliminatedAt = this.state.raceTime;
    competition.finishReason = reason === 'destroyed' ? 'destroyed' : 'eliminated';
    entry.status = 'finished';
    entry.progress.finishTime = this.state.raceTime;
    this.state.modeState.eliminatedRacerIds.push(entry.id);
    events.push({ type: 'racer-eliminated', racerId: entry.id, reason });
  }

  private isModeComplete(): boolean {
    const mode = this.state.settings.mode;
    if (mode !== 'eliminator' && mode !== 'survival-gauntlet') return false;
    const contenders = this.state.entries.filter(
      (entry) => !entry.competition?.eliminated,
    );
    const finishLineWinner = contenders.find((entry) => entry.progress.finishTime !== null);
    if (finishLineWinner) {
      this.state.modeState.winnerId = finishLineWinner.id;
      return true;
    }
    const active = contenders.filter((entry) => entry.status !== 'finished');
    if (active.length > 1) return false;
    const winner = active[0] ?? contenders[0];
    if (winner) this.state.modeState.winnerId = winner.id;
    return contenders.length > 0 && active.length <= 1;
  }

  private galacticFor(entry: RaceEntryState<AIControllerState>): GalacticRacerState {
    if (!entry.galactic) entry.galactic = createGalacticRacerState();
    return entry.galactic;
  }

  private clearTransientRuntimeState(): void {
    this.markerContactSteps.clear();
    this.markerImpactStepsByRacer.clear();
    this.activeMarkerContacts.clear();
    this.obstacleContactSteps.clear();
    this.activeObstacleContacts.clear();
    this.racerContactSteps.clear();
    this.activeRacerContacts.clear();
    this.offCourseRecoveryTimers.clear();
    this.aiLastRaceScores.clear();
    this.aiStallSeconds.clear();
    this.runtimeConfigs.clear();
  }

  private vehicleConfigFor(
    entry: RaceEntryState<AIControllerState>,
  ): Readonly<PodracerConfig> {
    const galactic = this.galacticFor(entry);
    const upgrades = galactic.upgrades;
    const workshopKey = entry.workshop
      ? JSON.stringify(entry.workshop.loadout.slots)
      : '';
    const cached = this.runtimeConfigs.get(entry.id);
    let partsMatch = cached?.parts.length === upgrades.parts.length;
    if (cached && partsMatch) {
      for (let index = 0; index < cached.parts.length; index += 1) {
        if (cached.parts[index] !== upgrades.parts[index]) {
          partsMatch = false;
          break;
        }
      }
    }
    if (
      cached
      && partsMatch
      && cached.vehicleClass === galactic.vehicleClass
      && cached.afterburner === upgrades.afterburner
      && cached.cornering === upgrades.cornering
      && cached.resilience === upgrades.resilience
      && cached.workshopKey === workshopKey
    ) return cached.config;
    const galacticConfig = deriveGalacticVehicleConfig(
      galactic.vehicleClass,
      this.config,
      upgrades,
    );
    const config = deriveWorkshopVehicleConfig(galacticConfig, entry.workshop);
    this.runtimeConfigs.set(entry.id, {
      vehicleClass: galactic.vehicleClass,
      afterburner: upgrades.afterburner,
      cornering: upgrades.cornering,
      resilience: upgrades.resilience,
      parts: [...upgrades.parts],
      workshopKey,
      config,
    });
    return config;
  }

  private indexEntries(): void {
    this.entryIndexById.clear();
    this.entriesById.clear();
    for (let index = 0; index < this.state.entries.length; index += 1) {
      const entry = this.state.entries[index];
      if (!entry) continue;
      this.entryIndexById.set(entry.id, index);
      this.entriesById.set(entry.id, entry);
    }
  }

  private galacticSnapshots(): GalacticRacerSnapshot[] {
    return this.state.entries.map((entry) => snapshotGalacticRacer(
      entry.id,
      entry.vehicle,
      this.galacticFor(entry),
      entry.progress.courseProgress,
      entry.progress.lateralOffset,
      entry.status === 'finished',
    ));
  }

  private cyclePlayerVehicle(
    entry: RaceEntryState<AIControllerState>,
    events: GalacticEvent[],
  ): void {
    const galactic = this.galacticFor(entry);
    const nextClass = nextGalacticVehicleClass(galactic.vehicleClass);
    this.setRacerVehicleClass(entry, nextClass, events);
  }

  private setRacerVehicleClass(
    entry: RaceEntryState<AIControllerState>,
    nextClass: GalacticVehicleClass,
    events: GalacticEvent[],
  ): void {
    const galactic = this.galacticFor(entry);
    if (galactic.vehicleClass === nextClass) return;
    galactic.vehicleClass = nextClass;
    this.vehicleSelections.set(entry.id, nextClass);
    // Builds are chassis-specific and may not migrate silently between cards.
    delete entry.workshop;
    this.workshopSelections.set(entry.id, null);
    galactic.mine.charges = 3;
    this.runtimeConfigs.delete(entry.id);
    this.refreshEntryVehicleTune(entry);
    events.push({ type: 'vehicle-class-changed', racerId: entry.id, vehicleClass: nextClass });
  }

  private refreshEntryVehicleTune(entry: RaceEntryState<AIControllerState>): void {
    const config = this.vehicleConfigFor(entry);
    const fresh = createPodracerState({
      id: entry.vehicle.id,
      seed: entry.vehicle.seed,
      position: { ...entry.vehicle.position },
      yaw: entry.vehicle.orientation.yaw,
      terrain: this.terrain,
      respawn: { ...entry.vehicle.respawn },
      initialBoostEnergy: entry.vehicle.boost.energy,
    }, config);
    Object.assign(entry.vehicle, fresh);
  }

  private creditTakedowns(events: readonly GalacticEvent[]): void {
    for (const event of events) {
      if (event.type !== 'takedown') continue;
      const attacker = this.entriesById.get(event.attackerId);
      if (attacker) this.galacticFor(attacker).takedowns += 1;
    }
  }

  private createMarkerColliders(): readonly { x: number; z: number; id: string; minY: number; maxY: number }[] {
    const renderData = this.course.getRenderData(1024);
    const stride = Math.max(5, Math.floor(renderData.points.length / 90));
    const colliders: { x: number; z: number; id: string; minY: number; maxY: number }[] = [];
    for (let index = 0; index < renderData.points.length; index += stride) {
      const point = renderData.points[index];
      const next = renderData.points[(index + 1) % renderData.points.length];
      if (!point || !next) continue;
      const length = Math.max(1e-6, Math.hypot(next.x - point.x, next.z - point.z));
      const rightX = (next.z - point.z) / length;
      const rightZ = -(next.x - point.x) / length;
      for (const side of [-1, 1] as const) {
        const x = point.x + rightX * point.width * side;
        const z = point.z + rightZ * point.width * side;
        const ground = this.course.heightAt(x, z);
        if (groundPylonConflictsWithBridge(this.course.branches, x, z, ground)) continue;
        colliders.push({
          x, z,
          id: `pylon-${index}-${side > 0 ? 'r' : 'l'}`,
          // Matches the 9.6 m cone and top light. Ground pylons do not gain
          // bridge height just because a supported deck passes above them.
          minY: ground - 0.2,
          maxY: ground + 9.9,
        });
      }
    }
    return colliders;
  }

  /**
   * Four racers permit a tiny deterministic broad phase. Equal-and-opposite
   * impulses make contact physical, while immediate penetration correction
   * prevents a pair from accumulating damage for many 120 Hz ticks.
   */
  private buildCollisionImpulses(
    configs: readonly Readonly<PodracerConfig>[],
    externallyControlledRacerIds: ReadonlySet<string> = new Set(),
  ): CollisionImpulse[][] {
    const collisions = this.state.entries.map(() => [] as CollisionImpulse[]);

    const append = (index: number, collision: CollisionImpulse): void => {
      const workshop = this.state.entries[index]?.workshop;
      collisions[index]?.push(workshop
        ? {
            ...collision,
            damage: collision.damage * workshopIncomingDamageScale(workshop),
          }
        : collision);
    };
    const nextRacerContacts = new Set<string>();
    for (let aIndex = 0; aIndex < this.state.entries.length; aIndex += 1) {
      const a = this.state.entries[aIndex];
      if (!a || a.status === 'finished') continue;
      for (let bIndex = aIndex + 1; bIndex < this.state.entries.length; bIndex += 1) {
        const b = this.state.entries[bIndex];
        if (!b || b.status === 'finished') continue;
        const aConfig = configs[aIndex] ?? this.vehicleConfigFor(a);
        const bConfig = configs[bIndex] ?? this.vehicleConfigFor(b);
        const pairDistance = GALACTIC_VEHICLES[this.galacticFor(a).vehicleClass].collisionRadius
          + GALACTIC_VEHICLES[this.galacticFor(b).vehicleClass].collisionRadius;
        const dx = b.vehicle.position.x - a.vehicle.position.x;
        const dz = b.vehicle.position.z - a.vehicle.position.z;
        const vertical = Math.abs(b.vehicle.position.y - a.vehicle.position.y);
        const distance = Math.hypot(dx, dz);
        if (distance >= pairDistance || vertical > 5.5) continue;
        const normalX = distance > 1e-5 ? dx / distance : aIndex % 2 === 0 ? 1 : -1;
        const normalZ = distance > 1e-5 ? dz / distance : 0;
        const penetration = pairDistance - distance;
        const contactKey = `${a.id}:${b.id}`;
        nextRacerContacts.add(contactKey);
        const relativeAlong = (
          b.vehicle.velocity.x - a.vehicle.velocity.x
        ) * normalX + (
          b.vehicle.velocity.z - a.vehicle.velocity.z
        ) * normalZ;
        const closingSpeed = Math.max(0, -relativeAlong);
        const contactMass = (aConfig.mass + bConfig.mass) * 0.5;
        const impulseMagnitude = contactMass * Math.min(
          12,
          closingSpeed * 0.52 + penetration * 2.4,
        );
        // Each craft receives half the full separation plus a tiny skin.
        // The old 72% total correction kept pairs interpenetrating and emitted
        // a new damage/audio/shake event every fixed tick of the same scrape.
        const correction = penetration * 0.52 + 0.025;
        a.vehicle.position.x -= normalX * correction;
        a.vehicle.position.z -= normalZ * correction;
        b.vehicle.position.x += normalX * correction;
        b.vehicle.position.z += normalZ * correction;
        const lastContactStep = this.racerContactSteps.get(contactKey)
          ?? Number.NEGATIVE_INFINITY;
        const cooldownSteps = Math.max(1, Math.ceil(0.22 / this.config.fixedDelta));
        if (
          this.activeRacerContacts.has(contactKey)
          || this.state.step - lastContactStep < cooldownSteps
        ) continue;
        this.racerContactSteps.set(contactKey, this.state.step);
        const damage = Math.min(0.01, 0.001 + closingSpeed * 0.00035);
        append(aIndex, {
          impulse: { x: -normalX * impulseMagnitude, y: 0.55 * aConfig.mass, z: -normalZ * impulseMagnitude },
          localPoint: this.localCollisionPoint(a.vehicle, normalX, normalZ),
          sourceId: b.id,
          damage,
        });
        append(bIndex, {
          impulse: { x: normalX * impulseMagnitude, y: 0.55 * bConfig.mass, z: normalZ * impulseMagnitude },
          localPoint: this.localCollisionPoint(b.vehicle, -normalX, -normalZ),
          sourceId: a.id,
          damage,
        });
      }
    }
    this.activeRacerContacts = nextRacerContacts;

    const nextObstacleContacts = new Set<string>();
    for (let entryIndex = 0; entryIndex < this.state.entries.length; entryIndex += 1) {
      const entry = this.state.entries[entryIndex];
      if (!entry || entry.status === 'finished') continue;
      const config = configs[entryIndex] ?? this.vehicleConfigFor(entry);
      const vehicleDefinition = GALACTIC_VEHICLES[this.galacticFor(entry).vehicleClass];
      // Let the position projection own the section decision. A coarse tag
      // reject opens a pass-through seam when a collision occurs at a newly
      // generated canyon boundary and progress advances one sample past it.
      // The hinted local search is bounded and cheap for the eight-racer grid.
      const contact = this.course.getObstacleContact(
        entry.vehicle.position.x,
        entry.vehicle.position.z,
        vehicleDefinition.collisionRadius,
        entry.progress.courseProgress,
        entry.vehicle.position.y,
      );
      if (!contact) continue;

      const contactKey = `${entry.id}:${contact.id}`;
      nextObstacleContacts.add(contactKey);
      // Resolve all penetration before applying the impulse. At 120 Hz a craft
      // can move only a small distance before the following query, while the
      // skin keeps numerical jitter from toggling sides of the cliff face.
      entry.vehicle.position.x += contact.normalX * (contact.penetration + 0.08);
      entry.vehicle.position.z += contact.normalZ * (contact.penetration + 0.08);

      const outwardSpeed = Math.max(0, -(
        entry.vehicle.velocity.x * contact.normalX
        + entry.vehicle.velocity.z * contact.normalZ
      ));
      const lastContactStep = this.obstacleContactSteps.get(contactKey)
        ?? Number.NEGATIVE_INFINITY;
      const cooldownSteps = Math.max(1, Math.ceil(0.38 / this.config.fixedDelta));
      if (
        this.activeObstacleContacts.has(contactKey)
        || this.state.step - lastContactStep < cooldownSteps
      ) continue;

      this.obstacleContactSteps.set(contactKey, this.state.step);
      const impulseMagnitude = config.mass * Math.min(
        34,
        3.5 + outwardSpeed * 0.88 + contact.penetration * 4.5,
      );
      append(entryIndex, {
        impulse: {
          x: contact.normalX * impulseMagnitude,
          y: config.mass * Math.min(2.2, 0.35 + outwardSpeed * 0.018),
          z: contact.normalZ * impulseMagnitude,
        },
        localPoint: this.localCollisionPoint(
          entry.vehicle,
          -contact.normalX,
          -contact.normalZ,
        ),
        sourceId: contact.id,
        damage: Math.min(0.035, 0.0025 + outwardSpeed * 0.00032),
      });
    }
    this.activeObstacleContacts = nextObstacleContacts;

    const nextMarkerContacts = new Set<string>();
    for (let entryIndex = 0; entryIndex < this.state.entries.length; entryIndex += 1) {
      const entry = this.state.entries[entryIndex];
      if (!entry) continue;
      if (entry.status === 'finished') continue;
      // AI receives pylon physics only during the explicitly authored
      // marker-clip mistake. Normal lane variation is not systemic attrition.
      if (
        entry.ai
        && !externallyControlledRacerIds.has(entry.id)
        && entry.ai.mistake.kind !== 'marker-clip'
      ) continue;
      const config = configs[entryIndex] ?? this.vehicleConfigFor(entry);
      const markerDistance = GALACTIC_VEHICLES[
        this.galacticFor(entry).vehicleClass
      ].collisionRadius + 1.15;
      let closest: { x: number; z: number; id: string } | null = null;
      let closestDistance = markerDistance;
      for (const marker of this.markerColliders) {
        // A conservative 2.8 m vertical craft half-extent preserves visible
        // engine/pilot contacts while permitting flight above the marker.
        if (entry.vehicle.position.y - 2.8 > marker.maxY || entry.vehicle.position.y + 2.8 < marker.minY) continue;
        const distance = Math.hypot(
          entry.vehicle.position.x - marker.x,
          entry.vehicle.position.z - marker.z,
        );
        if (distance < closestDistance) {
          closest = marker;
          closestDistance = distance;
        }
      }
      if (!closest) continue;
      const fallbackX = Math.sin(entry.vehicle.orientation.yaw + Math.PI * 0.5);
      const fallbackZ = Math.cos(entry.vehicle.orientation.yaw + Math.PI * 0.5);
      const normalX = closestDistance > 1e-5
        ? (entry.vehicle.position.x - closest.x) / closestDistance
        : fallbackX;
      const normalZ = closestDistance > 1e-5
        ? (entry.vehicle.position.z - closest.z) / closestDistance
        : fallbackZ;
      const penetration = markerDistance - closestDistance;
      const closingSpeed = Math.max(0, -(
        entry.vehicle.velocity.x * normalX + entry.vehicle.velocity.z * normalZ
      ));
      const impulseMagnitude = config.mass * Math.min(
        9,
        closingSpeed * 0.62 + penetration * 3.2,
      );
      // Resolve the entire overlap plus a tiny skin. Leaving 28% penetration
      // here used to manufacture a new impact, damage pulse, audio hit and
      // camera shake on every 120 Hz tick while a craft touched one pylon.
      entry.vehicle.position.x += normalX * (penetration + 0.06);
      entry.vehicle.position.z += normalZ * (penetration + 0.06);
      const contactKey = `${entry.id}:${closest.id}`;
      nextMarkerContacts.add(contactKey);
      const lastContactStep = this.markerContactSteps.get(contactKey)
        ?? Number.NEGATIVE_INFINITY;
      const cooldownSteps = Math.max(1, Math.ceil(0.28 / this.config.fixedDelta));
      const lastRacerImpactStep = this.markerImpactStepsByRacer.get(entry.id)
        ?? Number.NEGATIVE_INFINITY;
      const racerCooldownSteps = Math.max(1, Math.ceil(0.8 / this.config.fixedDelta));
      if (
        this.activeMarkerContacts.has(contactKey)
        || this.state.step - lastContactStep < cooldownSteps
        || this.state.step - lastRacerImpactStep < racerCooldownSteps
      ) continue;
      this.markerContactSteps.set(contactKey, this.state.step);
      this.markerImpactStepsByRacer.set(entry.id, this.state.step);
      append(entryIndex, {
        impulse: {
          x: normalX * impulseMagnitude,
          y: 0.62 * config.mass,
          z: normalZ * impulseMagnitude,
        },
        localPoint: this.localCollisionPoint(entry.vehicle, -normalX, -normalZ),
        sourceId: closest.id,
        damage: Math.min(0.004, 0.0005 + closingSpeed * 0.0001),
      });
    }
    this.activeMarkerContacts = nextMarkerContacts;
    return collisions;
  }

  /**
   * Recovers every racer, not only AI, after a sustained major deviation.
   * An extreme teleport/shortcut is recovered immediately. The destination is
   * the progress system's latest validated reset pose, which only advances at
   * ordered checkpoint crossings and therefore cannot reward a shortcut.
   */
  private shouldAutomaticallyRecoverOffCourse(
    entry: RaceEntryState<AIControllerState>,
    delta: number,
  ): boolean {
    // Progress projection runs once for every racer at the end of every fixed
    // tick. Reusing that validated distance here makes recovery one tick
    // conservative (8.3 ms) while avoiding a second projection scan for all
    // eight racers on every tick.
    let courseSample = this.course.sampleAtProgress(entry.progress.courseProgress);
    const sampleDeltaX = entry.vehicle.position.x - courseSample.x;
    const sampleDeltaZ = entry.vehicle.position.z - courseSample.z;
    // A debug teleport, spawn correction or very large shortcut can make the
    // previous tick's progress hint unrelated to the current position. Pay for
    // one exact projection only in that exceptional case; the following
    // progress update restores the constant-time path.
    if (
      Math.hypot(sampleDeltaX, sampleDeltaZ)
      > courseSample.width + this.options.extremeOffCourseRecoveryDistance
    ) {
      courseSample = this.course.projectPoint(
        entry.vehicle.position.x,
        entry.vehicle.position.z,
        entry.progress.courseProgress,
      );
    }
    let approximateLateral = (
      entry.vehicle.position.x - courseSample.x
    ) * courseSample.rightX + (
      entry.vehicle.position.z - courseSample.z
    ) * courseSample.rightZ;
    // A valid fork can be far from the main spline. Resolve its physical
    // corridor before accumulating recovery time; checkpoint order still
    // controls credited progress and the eventual reset destination.
    if (Math.abs(approximateLateral) > courseSample.width && this.options.courseBranches.length > 0) {
      courseSample = this.course.projectPoint(entry.vehicle.position.x, entry.vehicle.position.z, entry.progress.courseProgress);
      approximateLateral = (entry.vehicle.position.x - courseSample.x) * courseSample.rightX
        + (entry.vehicle.position.z - courseSample.z) * courseSample.rightZ;
    }
    const outsideEdge = Math.max(
      entry.progress.offCourseDistance,
      Math.max(0, Math.abs(approximateLateral) - courseSample.width),
    );
    const courseWidth = courseSample.width;
    const sustainedThreshold = Math.max(
      this.options.offCourseRecoveryDistance,
      courseWidth * 2.1,
    );
    const extremeThreshold = Math.max(
      this.options.extremeOffCourseRecoveryDistance,
      courseWidth * 5,
    );
    const previous = this.offCourseRecoveryTimers.get(entry.id) ?? 0;
    const elapsed = outsideEdge >= sustainedThreshold
      ? previous + delta
      : Math.max(0, previous - delta * 3.5);
    this.offCourseRecoveryTimers.set(entry.id, elapsed);
    if (outsideEdge < extremeThreshold && elapsed < this.options.offCourseRecoverySeconds) {
      return false;
    }

    this.offCourseRecoveryTimers.set(entry.id, 0);
    return true;
  }

  private computeMaximumCheckpointGapProgress(): number {
    const checkpoints = this.course.checkpoints;
    if (checkpoints.length < 2) return 1;
    let maximum = 0;
    for (let index = 0; index < checkpoints.length; index += 1) {
      const current = checkpoints[index];
      const next = checkpoints[(index + 1) % checkpoints.length];
      if (!current || !next) continue;
      maximum = Math.max(maximum, wrapCourseProgress(next.progress - current.progress));
    }
    return maximum;
  }

  private requiredCheckpointFor(
    entry: RaceEntryState<AIControllerState>,
  ): Readonly<{ progress: number; width: number }> | undefined {
    return this.course.checkpoints[entry.progress.nextCheckpointIndex];
  }

  /** True once the required gate is farther ahead than any authored gate gap. */
  private aiMissedRequiredCheckpoint(entry: RaceEntryState<AIControllerState>): boolean {
    if (!entry.ai || entry.status === 'finished') return false;
    const expected = this.course.checkpoints[entry.progress.nextCheckpointIndex];
    if (!expected) return false;
    const forward = wrapCourseProgress(expected.progress - entry.progress.courseProgress);
    return forward > Math.min(0.92, this.maximumCheckpointGapProgress + 0.055);
  }

  /**
   * Land immediately before the missed gate while preserving ordered truth.
   * The teleport awards nothing; the AI must drive through on a later tick.
   */
  private armRequiredCheckpointRecovery(entry: RaceEntryState<AIControllerState>): void {
    const expected = this.course.checkpoints[entry.progress.nextCheckpointIndex];
    if (!expected) return;
    const approachProgress = wrapCourseProgress(
      expected.progress - 18 / this.course.totalLength,
    );
    const pose = this.course.getResetPose(approachProgress, 0);
    entry.progress.resetPose = pose;
    setPodracerRespawnPose(entry.vehicle, pose);
  }

  /**
   * A recovery watchdog keeps a mistake from becoming a permanent deadlock.
   * It observes race score rather than raw speed, so wheelspin, wall contact
   * and driving backward do not look like useful forward progress.
   */
  private trackAiForwardProgress(
    entry: RaceEntryState<AIControllerState>,
    delta: number,
  ): void {
    if (!entry.ai || entry.status === 'finished') {
      this.aiLastRaceScores.delete(entry.id);
      this.aiStallSeconds.delete(entry.id);
      return;
    }
    const score = racerRaceScore(entry);
    const previous = this.aiLastRaceScores.get(entry.id);
    this.aiLastRaceScores.set(entry.id, score);
    if (previous === undefined || score - previous > 0.00001) {
      this.aiStallSeconds.set(
        entry.id,
        // A tiny collision shove is not a recovery. Sustained useful motion
        // drains this timer continuously, while occasional centimetres of
        // pack displacement cannot indefinitely postpone the watchdog.
        Math.max(0, (this.aiStallSeconds.get(entry.id) ?? 0) - delta * 0.5),
      );
      return;
    }
    this.aiStallSeconds.set(entry.id, (this.aiStallSeconds.get(entry.id) ?? 0) + delta);
  }

  /** Classify unfinished entrants by distance; never invent completed laps or times. */
  private classifyRemainingRacers(_events: RaceEvent[]): void {
    this.updateStandings();
    for (const entry of this.state.entries) {
      if (entry.status === 'finished') continue;
      entry.status = 'finished';
      if (entry.competition?.finishReason === 'running') entry.competition.finishReason = 'classified';
      // finishTime remains null. Existing ordered checkpoints and lap timings
      // are the only accepted evidence of a completed lap or competitive record.
    }
  }

  private finishRace(events: RaceEvent[]): void {
    this.updateStandings();
    this.state.phase = 'finished';
    this.state.modeState.teamScores = sumTeamScores(this.state.entries);
    const winner = [...this.state.entries]
      .sort((a, b) => (a.progress.placement ?? 999) - (b.progress.placement ?? 999))[0];
    this.state.modeState.winnerId ??= winner?.id ?? null;
    if (this.state.settings.mode === 'team-race') {
      const scores = this.state.modeState.teamScores;
      this.state.modeState.winningTeam = scores.sun >= scores.shadow ? 'sun' : 'shadow';
    }
    this.state.results = this.state.entries
      .map(makeResult)
      .sort((a, b) => a.placement - b.placement);
    events.push({
      type: 'mode-complete',
      mode: this.state.settings.mode,
      winnerId: this.state.modeState.winnerId,
      winningTeam: this.state.modeState.winningTeam,
    });
    events.push({ type: 'results', results: this.state.results.map((result) => ({
      ...result,
      lapTimes: [...result.lapTimes],
      splits: result.splits.map((split) => ({ ...split })),
    })) });
  }

  private localCollisionPoint(
    vehicle: PodracerState,
    worldX: number,
    worldZ: number,
  ): { x: number; y: number; z: number } {
    const sinYaw = Math.sin(vehicle.orientation.yaw);
    const cosYaw = Math.cos(vehicle.orientation.yaw);
    return {
      x: (worldX * cosYaw - worldZ * sinYaw) * 7,
      y: 0,
      z: (worldX * sinYaw + worldZ * cosYaw) * 7,
    };
  }

  private advanceCountdown(delta: number, events: RaceEvent[]): void {
    this.state.countdownRemaining = Math.max(0, this.state.countdownRemaining - delta);
    const cue = clamp(Math.ceil(this.state.countdownRemaining), 0, 3) as 0 | 1 | 2 | 3;
    if (cue > 0 && cue !== this.state.countdownCue) {
      this.state.countdownCue = cue;
      events.push({ type: 'countdown', cue: cue as 1 | 2 | 3 });
    }
    if (this.state.countdownRemaining <= 0) {
      this.state.phase = 'racing';
      this.state.countdownCue = 0;
      for (const entry of this.state.entries) entry.status = 'racing';
      events.push({ type: 'countdown', cue: 'go' }, { type: 'start-horn' });
    }
  }

  private updateStandings(): void {
    const mode = this.state.settings.mode;
    const ordered = [...this.state.entries].sort((a, b) => {
      const aCompetition = a.competition;
      const bCompetition = b.competition;
      if (mode === 'eliminator') {
        if (aCompetition?.eliminated !== bCompetition?.eliminated) {
          return aCompetition?.eliminated ? 1 : -1;
        }
        if (aCompetition?.eliminated && bCompetition?.eliminated) {
          const eliminationOrder = (bCompetition.eliminatedAt ?? 0) - (aCompetition.eliminatedAt ?? 0);
          if (eliminationOrder) return eliminationOrder;
        }
      }
      if (mode === 'survival-gauntlet') {
        const lives = (bCompetition?.survivalLives ?? 0) - (aCompetition?.survivalLives ?? 0);
        if (lives) return lives;
      }
      if (mode === 'drift-trial') {
        const drift = (bCompetition?.driftScore ?? 0) - (aCompetition?.driftScore ?? 0);
        if (Math.abs(drift) > 1e-6) return drift;
      }
      if (mode === 'combat-race') {
        const combat = (bCompetition?.combatScore ?? 0) - (aCompetition?.combatScore ?? 0);
        if (combat) return combat;
      }
      if (mode === 'checkpoint-sprint') {
        const checkpoints = (bCompetition?.checkpointsPassed ?? 0)
          - (aCompetition?.checkpointsPassed ?? 0);
        if (checkpoints) return checkpoints;
      }
      if (mode === 'team-race') {
        const teamScores = this.state.modeState.teamScores;
        const team = teamScores[bCompetition?.teamId ?? 'sun']
          - teamScores[aCompetition?.teamId ?? 'sun'];
        if (team) return team;
        const personal = (bCompetition?.score ?? 0) - (aCompetition?.score ?? 0);
        if (personal) return personal;
      }
      if (a.status === 'finished' && b.status === 'finished') {
        const time = (a.progress.finishTime ?? Number.POSITIVE_INFINITY) -
          (b.progress.finishTime ?? Number.POSITIVE_INFINITY);
        return (Number.isNaN(time) ? 0 : time) || racerRaceScore(b) - racerRaceScore(a) || a.id.localeCompare(b.id);
      }
      if (a.status === 'finished') return -1;
      if (b.status === 'finished') return 1;
      const score = racerRaceScore(b) - racerRaceScore(a);
      return score || a.id.localeCompare(b.id);
    });
    ordered.forEach((entry, index) => {
      entry.progress.placement = index + 1;
    });
  }

  private appendOvertakeEvents(
    previousPlacements: ReadonlyMap<string, number>,
    events: RaceEvent[],
  ): void {
    if (previousPlacements.size !== this.state.entries.length) return;
    for (const racer of this.state.entries) {
      const fromPosition = previousPlacements.get(racer.id);
      const toPosition = racer.progress.placement;
      if (fromPosition === undefined || toPosition === null || toPosition >= fromPosition) continue;
      for (const passed of this.state.entries) {
        if (passed.id === racer.id || passed.progress.placement === null) continue;
        const passedFrom = previousPlacements.get(passed.id);
        if (
          passedFrom !== undefined
          && fromPosition > passedFrom
          && toPosition < passed.progress.placement
        ) {
          events.push({
            type: 'overtake',
            racerId: racer.id,
            passedId: passed.id,
            fromPosition,
            toPosition,
          });
        }
      }
    }
  }

  /** Keeps named traps inside their intended procedural set-piece section. */
  private createCourseAlignedGalacticWorld(): GalacticWorldState {
    const world = createGalacticWorldState(this.options.seed);
    const samples = this.course.getMinimapSamples(768);
    const progressInSection = (
      tag: (typeof samples)[number]['tag'],
      fraction: number,
    ): number => {
      const matching = samples.filter((sample) => sample.tag === tag);
      if (matching.length === 0) return 0;
      const index = Math.min(
        matching.length - 1,
        Math.max(0, Math.floor((matching.length - 1) * fraction)),
      );
      return matching[index]?.progress ?? matching[0]?.progress ?? 0;
    };
    const placements = new Map<string, number>([
      ['geyser-launch', progressInSection('launch-crest', 0.56)],
      ['vent-canyon', progressInSection('narrow-canyon', 0.48)],
      ['fall-chicane', progressInSection('chicane', 0.54)],
      ['dust-hairpin', progressInSection('hairpin', 0.46)],
    ]);
    for (const hazard of world.hazards) {
      const progress = placements.get(hazard.id);
      if (progress !== undefined) hazard.progress = progress;
    }
    return world;
  }

  private createInitialState(): RaceSimulationState<AIControllerState> {
    const entries: RaceEntryState<AIControllerState>[] = [];
    const vehicleClasses: readonly GalacticVehicleClass[] = [
      'podracer',
      'landspeeder',
      'speeder-bike',
      'skim-speeder',
    ];
    const racers = [
      { id: this.options.playerId, name: this.options.playerName, personality: null },
      ...AI_GRID,
    ].slice(0, this.options.fieldSize);
    for (let index = 0; index < racers.length; index += 1) {
      const racer = racers[index];
      if (!racer) continue;
      const row = Math.floor(index / 2);
      const side = index % 2 === 0 ? -1 : 1;
      const gridSample = this.course.sampleAtDistance(-10 - row * 25);
      // The pods are nearly eighteen metres wide across their engine pair.
      // A full four-row field also needs longitudinal engine clearance: the
      // earlier 13 m pitch looked compact from above but visually interlocked
      // neighbouring engine pods. Twenty-five metres gives every silhouette a
      // clean launch box while still presenting as one tightly packed grid.
      const lane = this.options.fieldSize === 1 ? 0 : side * (12 + row * 0.45);
      const x = gridSample.x + gridSample.rightX * lane;
      const z = gridSample.z + gridSample.rightZ * lane;
      const yaw = Math.atan2(gridSample.tangentX, gridSample.tangentZ);
      const selectedClass = this.vehicleSelections.get(racer.id)
        ?? vehicleClasses[index % vehicleClasses.length]
        ?? 'podracer';
      this.vehicleSelections.set(racer.id, selectedClass);
      const galactic = createGalacticRacerState(selectedClass);
      let selectedWorkshop = this.workshopSelections.get(racer.id);
      if (!this.workshopSelections.has(racer.id)) {
        const suppliedLoadout = this.options.workshopLoadouts[racer.id];
        if (suppliedLoadout !== undefined) {
          const validation = validateWorkshopLoadout(suppliedLoadout, selectedClass);
          selectedWorkshop = validation.valid
            && validation.loadout.vehicleClass === selectedClass
            ? validation.loadout
            : null;
          this.workshopSelections.set(racer.id, selectedWorkshop);
        }
      }
      const workshop = selectedWorkshop && this.options.competitionProfile === 'chaos'
        ? createRacerWorkshopState(selectedWorkshop)
        : undefined;
      if (workshop) galactic.mine.charges = workshop.mineCapacity;
      const galacticConfig = deriveGalacticVehicleConfig(
        galactic.vehicleClass,
        this.config,
        galactic.upgrades,
      );
      const vehicleConfig = deriveWorkshopVehicleConfig(galacticConfig, workshop);
      const freshVehicle = createPodracerState({
        id: racer.id,
        seed: (this.options.seed + index * 0x9e3779b9) >>> 0,
        position: { x, z },
        yaw,
        terrain: this.terrain,
        respawn: this.course.getResetPose(0, 7),
      }, vehicleConfig);
      let vehicle = freshVehicle;
      if (index === 0 && this.options.suppliedPlayerVehicle) {
        // The renderer owns this top-level object reference, so a new race must
        // refresh it in place. Replacing every field (including nested state)
        // prevents heat, damage, boost, control latches or stale probe data from
        // leaking into a replay while keeping render consumers connected.
        Object.assign(this.options.suppliedPlayerVehicle, freshVehicle);
        vehicle = this.options.suppliedPlayerVehicle;
      }
      const projection = this.course.projectPoint(vehicle.position.x, vehicle.position.z);
      const progress = createRacerProgressState(this.course, projection.progress);
      const ai = racer.personality
        ? createAIControllerState(
            racer.personality,
            (this.options.seed ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0,
            this.configuredAIDifficultyValue,
          )
        : null;
      entries.push({
        id: racer.id,
        name: racer.name,
        isPlayer: index === 0,
        status: 'grid',
        vehicle,
        progress,
        ai,
        galactic,
        launch: createRacerLaunchState(),
        drafting: createRacerDraftingState(),
        competition: createRacerCompetitionState(index),
        ...(workshop ? { workshop } : {}),
      });
    }

    const branches = this.options.courseBranches.map((branch) => ({ ...branch }));

    const state: RaceSimulationState<AIControllerState> = {
      version: 1,
      seed: this.options.seed,
      step: 0,
      phase: this.options.countdownSeconds > 0 ? 'countdown' : 'racing',
      countdownRemaining: this.options.countdownSeconds,
      countdownCue: 0,
      raceTime: 0,
      totalLaps: this.configuredTotalLapsValue,
      settings: {
        mode: this.configuredRaceModeValue,
        competitionProfile: this.options.competitionProfile,
        aiDifficulty: this.configuredAIDifficultyValue,
        fieldSize: entries.length,
        maximumHumanRacers: 4,
        branches,
      },
      director: createRaceDirectorState(
        this.course,
        this.options.seed,
        this.configuredTotalLapsValue,
        branches,
      ),
      modeState: createRaceModeState(
        this.configuredRaceModeValue,
        entries.length,
        this.course.checkpoints.length * this.configuredTotalLapsValue,
      ),
      entries,
      results: [],
      galacticWorld: this.createCourseAlignedGalacticWorld(),
    };
    if (this.options.competitionProfile !== 'chaos') {
      state.director.events = [];
      state.galacticWorld.hazards = [];
      state.galacticWorld.pickups = [];
    }
    if (state.phase === 'racing') {
      for (const entry of entries) entry.status = 'racing';
    }
    return state;
  }
}

export function createRaceSimulation(options: RaceSimulationOptions): RaceSimulation {
  return new RaceSimulation(options);
}
