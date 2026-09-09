import { CombatPresentationController, type CombatPresentationContext } from '../combat/CombatPresentationController';
import { WreckVisualPoseCache, type WreckVisualPose } from '../combat/WreckVisualPose';
import { WreckGroundContactGate } from '../combat/WreckGroundContact';
import {
  Color,
  Euler,
  Fog,
  Mesh,
  Scene,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { CinematicCamera, type CameraSubject } from '../../camera/CinematicCamera';
import { updateCourseJunctionFraming } from '../../camera/CourseJunctionFraming';
import { RaceCameraDirector } from '../../camera/RaceCameraDirector';
import { PodracerAudio, type RivalAudioTelemetry } from '../../audio';
import { RaceMastery, masterySectorLabels, INKSTORM_HERO_SEED, type CompetitionProfile, type MasteryStartOptions } from '../../game/mastery';
import { loadVehicleAppearance, resolveRacerAppearancePreference, saveVehicleAppearance, vehicleChaseClearance, type VehicleAppearanceId } from '../../game/vehicleAppearance';
import { VehicleArtLibrary } from '../vehicles/VehicleArtLibrary';
import { RacerPresentation } from '../vehicles/RacerPresentation';
import { DEFAULT_PODRACER_CONFIG } from '../../game/simulation/config';
import { InkstormWorld } from '../inkstorm/InkstormWorld';
import { InkstormGhostView } from '../inkstorm/InkstormGhostView';
import type {
  CaptureCamera,
  CapturePreset,
  ExpansionCapturePreset,
  PodRacingReviewApi,
  ReviewCaptureCamera,
  ReviewCapturePreset,
  ReviewSnapshot,
} from '../../diagnostics/reviewTypes';
import {
  PerformanceGovernor,
  type DistantRivalLod,
  type PerformanceDecision,
} from '../../diagnostics/performance';
import {
  CompositePlayerInput,
  GAMEPAD_BINDING_ACTIONS,
  GamepadInput,
  KEYBOARD_BINDING_ACTIONS,
  KeyboardInput,
  NEUTRAL_PLAYER_INPUT,
  isEditableKeyboardTarget,
  normalizePlayerInput,
  shouldIgnoreGameplayKey,
  type PlayerInputState,
  type GamepadBindingAction,
  type GamepadControlBinding,
  type KeyboardBindingAction,
} from '../../game/input';
import {
  loadGameSettings,
  loadWorkshopGarage,
  sanitizeGameSettings,
  saveGameSettings,
  saveWorkshopGarage,
  withWorkshopLoadout,
  type GameSettings,
  type WorkshopGarageSave,
} from '../../game/settings';
import {
  applyPodracerCapturePreset,
  createPodracerState,
  setPodracerRespawnPose,
  type PodracerCapturePreset,
  type PodracerEvent,
  type PodracerState,
} from '../../game/simulation';
import {
  type AIDifficulty,
  type RaceHighlightFrame,
  type RaceHighlightPackage,
  RaceHighlightRecorder,
  type RaceMode,
  type RaceEntryState,
  RaceSimulation,
} from '../../game/race';
import {
  RoomSession,
  type RoomAuthoritativeEventEnvelope,
  type RoomLobbySnapshot,
  type RoomRaceStart,
} from '../../network';
import {
  GALACTIC_VEHICLE_ORDER,
  GALACTIC_VEHICLES,
  WORKSHOP_PARTS,
  type GalacticEvent,
  type GalacticVehicleClass,
  type WorkshopPartId,
} from '../../game/galactic';
import {
  RaceHud,
  createSettingsHudViewModel,
  createWorkshopHudViewModel,
  createVehicleSelectionViewModel,
  deriveRaceHudViewModel,
  type HudLapCount,
  type HudCourseBranchViewModel,
  type HudCoursePoint,
  type HudLobbyViewModel,
  type HudResultHighlightViewModel,
  type HudResultsPresentationViewModel,
  type HudSettingsTab,
  type HudThreatCueViewModel,
  type HudWorkshopSlot,
  type RaceHudAction,
} from '../../ui';
import {
  CEL_PALETTES,
  createCelMaterial,
  createInvertedHullOutline,
  type InvertedHullHandle,
} from '../materials';
import {
  CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY,
  CelPostPipeline,
  CelPrepassMaterial,
} from '../post';
import { SkyAtmosphere } from '../objects/SkyAtmosphere';
import { DesertLandmarks } from '../objects/DesertLandmarks';
import {
  applyDistantRivalLodDecision,
  type PodracerMaterials,
} from '../objects/PodracerView';
import { RaceCourseView } from '../objects/RaceCourseView';
import { SpeedStreaks } from '../objects/SpeedStreaks';
import { GroundContactShadows } from '../objects/GroundContactShadows';
import { GalacticEffectsView } from '../galactic';
import { attachPilotToAnchor, type PilotView } from '../pilots';
import { sampleTerrainHeight } from '../terrain/terrainMath';
import { TerrainSystem } from '../terrain/TerrainSystem';
import { DustSystem } from '../terrain/DustSystem';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { createRenderer } from './createRenderer';
import { InkstormSunShadow } from '../inkstorm/InkstormSunShadow';
import { InkstormRacerShadow } from '../inkstorm/InkstormRacerShadow';
import { Viewport } from './Viewport';

/**
 * A close racing pack only needs one fully articulated rival at a time. The
 * nearest opponent keeps the complete pilot/engine treatment while the other
 * craft retain their authored engine, cockpit and class silhouettes. Distant
 * rivals can still fall through to the horizon silhouette inside the shared
 * LOD resolver.
 */
const PACK_RIVAL_LOD_DECISION = {
  distantRivalLod: 'simplified',
  distantRivalLodDistance: 0,
  // Past this distance, any racer except the closest duel target occupies too
  // few pixels to justify separate engine, cockpit and coupling submissions.
  // A short hysteresis keeps an overtaking pack from flickering between forms.
  horizonSilhouetteDistance: 360,
  horizonSilhouetteHysteresis: 48,
} as const;

/** Full pilot/turbine articulation is only useful inside an actual duel. */
const HERO_RIVAL_LOD_DECISION = {
  distantRivalLod: 'simplified',
  distantRivalLodDistance: 220,
} as const;

const FIXED_DT = 1 / 120;
const BASE_RACE_SEED = INKSTORM_HERO_SEED;
const RACE_PRESENTATION_CAPACITY = 8;

function mixRaceSeed(seed: number): number {
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) || 0x6d2b79f5;
}

function createRacerCelMaterials(racerIndex: number): PodracerMaterials {
  const shellPalettes = [
    CEL_PALETTES.player,
    CEL_PALETTES.rivalTeal,
    CEL_PALETTES.rivalGold,
    CEL_PALETTES.machinery,
  ] as const;
  const secondaryPalettes = [
    CEL_PALETTES.rivalGold,
    CEL_PALETTES.machinery,
    CEL_PALETTES.player,
    CEL_PALETTES.rivalTeal,
  ] as const;
  const shellPalette = shellPalettes[racerIndex % shellPalettes.length] ?? CEL_PALETTES.player;
  const secondaryPalette = secondaryPalettes[racerIndex % secondaryPalettes.length]
    ?? CEL_PALETTES.rivalGold;
  const shellTints = [
    '#ffffff', '#ffffff', '#ffffff', '#b78bd7',
    '#86d4ff', '#f28b5f', '#e8f47a', '#d69cff',
  ] as const;
  const canopyTints = [
    '#8078b8', '#8cc8bb', '#c78368', '#a06ac4',
    '#4f9fc3', '#ba5f56', '#a2aa49', '#8f5aa5',
  ] as const;
  return {
    shell: createCelMaterial({
      name: `Racer ${racerIndex} shell`,
      wear: 0.75,
      palette: shellPalette,
      tint: shellTints[racerIndex % shellTints.length] ?? '#ffffff',
      specularPower: 28,
      specularCutoff: 0.24,
      specularStrength: 0.16,
      rimStrength: 0.16,
      reflectionStrength: 0.05,
    }),
    secondary: createCelMaterial({
      name: `Racer ${racerIndex} secondary armour`,
      wear: 0.6,
      palette: secondaryPalette,
      specularPower: 36,
      specularCutoff: 0.3,
      rimStrength: 0.24,
      reflectionStrength: 0.12,
    }),
    metal: createCelMaterial({
      name: `Racer ${racerIndex} machinery`,
      wear: 0.2,
      palette: CEL_PALETTES.machinery,
      specularPower: 46,
      specularCutoff: 0.22,
      specularStrength: 0.48,
      rimStrength: 0.3,
      reflectionStrength: 0.27,
    }),
    ink: createCelMaterial({
      name: `Racer ${racerIndex} mechanical ink`,
      palette: CEL_PALETTES.machinery,
      tint: '#321a31',
      specularStrength: 0,
      rimStrength: 0.1,
      reflectionStrength: 0.02,
    }),
    canopy: createCelMaterial({
      name: `Racer ${racerIndex} canopy`,
      palette: shellPalette,
      tint: canopyTints[racerIndex % canopyTints.length] ?? '#8078b8',
      specularPower: 54,
      specularCutoff: 0.2,
      specularStrength: 0.55,
      rimStrength: 0.45,
      reflectionStrength: 0.38,
    }),
    accent: createCelMaterial({
      name: `Racer ${racerIndex} hot accent`,
      palette: secondaryPalette,
      emissiveStrength: 0.16,
      rimStrength: 0.3,
    }),
  };
}

export class GameApp {
  private readonly renderer: WebGLRenderer;
  private readonly post: CelPostPipeline;
  private readonly terrainMrt: CelPrepassMaterial;
  private readonly terrainPrepassUnregister: (() => void)[] = [];
  private readonly racerMrt: CelPrepassMaterial;
  private readonly racerPrepassUnregister = new Map<RacerPresentation, (() => void)[]>();
  private readonly outlineHandles: InvertedHullHandle[] = [];
  private readonly courseOutlineHandles: InvertedHullHandle[] = [];
  private readonly scene = new Scene();
  private readonly cameraRig = new CinematicCamera();
  private readonly performanceGovernor = new PerformanceGovernor({
    maxPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    initialQualityLevel: 2,
    maxTerrainLevels: 6,
    minTerrainLevels: 4,
    // Full ordinary races sustain 60 Hz at fixed DPR 2 on the reference M4.
    // Count budgets remain useful diagnostics; actual work and RAF cadence
    // decide quality instead of forcing blur whenever scenery exceeds a count.
    cadenceAware: true,
    triangleBudget: 800_000,
    drawCallBudget: 210,
  });
  private readonly viewport: Viewport;
  private readonly sky = new SkyAtmosphere();
  private readonly landmarks = new DesertLandmarks();
  private readonly vehicleArtLibrary = new VehicleArtLibrary({ maxIdleEntries: 2 });
  private vehicleAppearance: VehicleAppearanceId = loadVehicleAppearance();
  private readonly playerView = new RacerPresentation(this.vehicleArtLibrary, createRacerCelMaterials(0), 0);
  private readonly rivalViews = Array.from(
    { length: RACE_PRESENTATION_CAPACITY - 1 },
    (_, index) => index + 1,
  ).map(
    (racerIndex) => new RacerPresentation(this.vehicleArtLibrary, createRacerCelMaterials(racerIndex), racerIndex),
  );
  private readonly racerViews = [this.playerView, ...this.rivalViews];
  private readonly pilots: PilotView[] = [];
  private readonly pilotDynamics = Array.from({ length: RACE_PRESENTATION_CAPACITY }, () => ({
    lateralAcceleration: 0,
    verticalAcceleration: 0,
    previousLateralSpeed: 0,
    previousVerticalSpeed: 0,
  }));
  private readonly courseView = new RaceCourseView();
  private readonly speedStreaks = new SpeedStreaks();
  private readonly contactShadows = new GroundContactShadows(RACE_PRESENTATION_CAPACITY);
  private readonly galacticEffects = new GalacticEffectsView();
  private readonly galacticShieldPool = Array.from({ length: RACE_PRESENTATION_CAPACITY * 2 }, () => ({
    position: { x: 0, y: 0, z: 0 }, radius: 10, intensity: 1, phase: 0, color: '#72f4ff',
    mode: 'shield' as 'shield' | 'recovery' | 'redline',
  }));
  private readonly activeGalacticShields: Array<{
    position: { x: number; y: number; z: number };
    radius: number;
    intensity: number;
    phase: number;
    color: string;
    mode: 'shield' | 'recovery' | 'redline';
  }> = [];
  private readonly galacticLancePool = Array.from({ length: 32 }, () => ({
    origin: { x: 0, y: 0, z: 0 },
    target: { x: 0, y: 0, z: 0 },
    width: 0.42,
    intensity: 1,
    phase: 0,
    color: '#ff5a1f',
  }));
  private readonly activeGalacticLances: Array<{
    origin: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    width: number;
    intensity: number;
    phase: number;
    color: string;
  }> = [];
  private readonly galacticMinePool = Array.from({ length: 24 }, () => ({
    position: { x: 0, y: 0, z: 0 }, yaw: 0, armed: false, phase: 0, scale: 1,
    variant: 'mine' as 'mine' | 'pickup' | 'emp' | 'repair',
  }));
  private readonly activeGalacticMines: Array<{
    position: { x: number; y: number; z: number };
    yaw: number;
    armed: boolean;
    phase: number;
    scale: number;
    variant: 'mine' | 'pickup' | 'emp' | 'repair';
  }> = [];
  private readonly galacticHazardPool = Array.from({ length: 8 }, () => ({
    kind: 'heat-vent' as 'heat-vent' | 'sand-geyser' | 'rockfall',
    position: { x: 0, y: 0, z: 0 },
    radius: 12,
    height: 6,
    intensity: 1,
    phase: 0,
    warning: 1,
  }));
  private readonly activeGalacticHazards: Array<{
    kind: 'heat-vent' | 'sand-geyser' | 'rockfall';
    position: { x: number; y: number; z: number };
    radius: number;
    height: number;
    intensity: number;
    phase: number;
    warning: number;
  }> = [];
  private readonly terrain = new TerrainSystem({
    levels: 6,
    baseCellSize: 3,
    segmentsPerSide: 64,
  });
  private readonly dust = new DustSystem({
    terrain: this.terrain,
    crestDust: { capacity: 128 },
    groundRings: { capacity: 28 },
    wakes: {
      maxRacers: RACE_PRESENTATION_CAPACITY,
      samplesPerTrail: 64,
      // Fewer, farther-spaced anchors spend the same fixed geometry budget on
      // a long chase-readable history. Coral dust separates from the pale sand
      // before the shader resolves it into hot and deep cel bands.
      minimumSpacing: 1.35,
      color: '#bf4f4c',
    },
    spray: { capacity: 256 },
  });
  private readonly baseTerrainAdapter = { heightAt: sampleTerrainHeight };
  private readonly terrainAdapter = {
    heightAt: (x: number, z: number): number => this.terrain.sampleHeight(x, z),
  };
  private readonly inkstormWorld = new InkstormWorld((x, z) => this.terrainAdapter.heightAt(x, z),
    this.terrain.gulfTextures.uniforms, id => this.race?.pitPadField?.anchorHeight(id));
  private readonly inkstormRacerShadow = new InkstormRacerShadow();
  private racerShadowBindingRevision = -1;
  private readonly inkstormSunShadow = new InkstormSunShadow(window.innerWidth<900?2048:4096);
  private readonly ghostView = new InkstormGhostView();
  private readonly mastery = new RaceMastery();
  private settings: Readonly<GameSettings> = loadGameSettings();
  private workshopGarage: Readonly<WorkshopGarageSave> = loadWorkshopGarage();
  private workshopOpen = false;
  private workshopSlot: HudWorkshopSlot = 'engine';
  private settingsOpen = false;
  private settingsTab: HudSettingsTab = 'controls';
  private settingsCapture: { action: string; device: 'keyboard' | 'gamepad' } | null = null;
  private settingsCaptureArmedAt = 0;
  private settingsCaptureGamepadNeutral = false;
  private selectedAIDifficulty: AIDifficulty = 'medium';
  private selectedRaceMode: RaceMode = 'circuit';
  private readonly keyboardInput = new KeyboardInput(window, this.settings.keyboardBindings);
  private readonly gamepadInput = new GamepadInput({
    bindings: this.settings.gamepadBindings,
    tuning: this.settings.controls,
  });
  private readonly input = new CompositePlayerInput([
    this.keyboardInput,
    this.gamepadInput,
  ]);
  private readonly room = new RoomSession();
  private readonly unsubscribeRoom: () => void;
  private readonly multiplayerCallsign = this.loadMultiplayerCallsign();
  private readonly playerState: PodracerState = createPodracerState({
    id: 'player',
    seed: BASE_RACE_SEED,
    yaw: 0,
    terrain: this.terrainAdapter,
  });
  private race = new RaceSimulation({
    terrain: this.baseTerrainAdapter,
    playerVehicle: this.playerState,
    seed: BASE_RACE_SEED,
    totalLaps: 1,
    competitionProfile: 'time-trial',
    mode: this.selectedRaceMode,
    aiDifficulty: this.selectedAIDifficulty,
    countdownSeconds: 3,
    workshopLoadouts: {
      player: this.workshopGarage.loadouts.podracer,
    },
  });
  private readonly audio = new PodracerAudio();
  private readonly cameraDirector = new RaceCameraDirector(this.cameraRig);
  private readonly combatPresentation = new CombatPresentationController();
  private combatCameraCut = false;
  private combatChaseRecovery = false;
  private combatPriorManualCamera: CaptureCamera | null = null;
  private readonly combatSystemMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  private combatVictimRunInvalidated = false;
  private readonly highlights = new RaceHighlightRecorder({ historySeconds: 300, sampleHz: 12 });
  private highlightPackage: RaceHighlightPackage | null = null;
  private highlightReplay: {
    momentId: string;
    kind: RaceHighlightPackage['moments'][number]['kind'];
    startIndex: number;
    endIndex: number;
    focusRacerId: string;
    focusOtherRacerId?: string;
    startedAt: number;
    durationMs: number;
    impactEmitted: boolean;
  } | null = null;
  private resultsPresentation: HudResultsPresentationViewModel | null = null;
  private minimapCourse = this.createMinimapCourse();
  private minimapCourseBranches = this.createMinimapCourseBranches();
  private currentCourseSeed = this.race.course.seed ?? this.race.state.seed;
  private pendingSoloCourse: { eventId: string; seed: number } | null = null;
  private readonly usedCourseSeeds = new Set<number>([this.currentCourseSeed]);
  private courseOrdinal = 0;
  private readonly deterministicCourseSequence = new URLSearchParams(window.location.search)
    .has('capture');
  private readonly hud: RaceHud;
  private nextHudFrame = 0;
  private hudGoUntil = -1;
  private lastRaceInputs: Readonly<Record<string, PlayerInputState>> = {};
  private readonly subject: CameraSubject = {
    position: new Vector3(0, 7, 0),
    forward: new Vector3(0, 0, -1),
    velocity: new Vector3(),
    speed: 0,
  };
  private readonly routeCameraPreview = new Vector3();
  private readonly junctionCameraPreview = new Vector3();
  private readonly wreckVisualPoses = new Map<RacerPresentation, WreckVisualPoseCache>();
  private readonly wreckGroundContacts = new WreckGroundContactGate();
  private readonly wreckRuptureDirection = new Vector3();
  private readonly wreckRuptureOrigin = new Vector3();
  private captureMode = false;
  private preset: CapturePreset = 'desert';
  private reviewScenario: ReviewCapturePreset = 'desert';
  private reviewInput: PlayerInputState | null = null;
  private reviewCameraForwardOffset = 0;
  private reviewCameraRightOffset = 0;
  private reviewCameraHeightOffset = 0;
  private readonly recentGalacticEvents: Array<Record<string, unknown>> = [];
  private cameraMode: CaptureCamera = 'chase';
  private reviewCameraMode: ReviewCaptureCamera = 'chase';
  private simulationFrame = 0;
  private accumulator = 0;
  private previousTime = 0;
  private raf = 0;
  private disposed = false;
  private paused = false;
  /** The renderer is live on boot, but race simulation remains frozen until confirmed. */
  private awaitingRaceStart = true;
  private worldAssetsSettled = false;
  private pauseHeld = false;
  private readonly handleVisibilityChange = (): void => {
    // Background-tab suspension is an explicit timing discontinuity. Long
    // intervals while visible still count as overload in the governor.
    this.performanceGovernor.resetMeasurements();
    this.cancelCombatCut();
  };
  private restartHeld = false;
  private showControls = false;
  private lastLocalPlacement: number | null = null;
  private selectedLaps: HudLapCount = 1;
  private roomCopiedUntil = 0;
  private networkSnapshotAge = 0;
  private liveQualityLevel = this.performanceGovernor.decision.qualityLevel;
  private readonly rivalLodModes: DistantRivalLod[] = Array.from(
    { length: RACE_PRESENTATION_CAPACITY - 1 },
    () => 'full',
  );

  constructor(private readonly mount: HTMLElement) {
    this.renderer = createRenderer();
    this.renderer.domElement.id = 'viewport';
    this.renderer.domElement.setAttribute('aria-label', 'Podracing viewport');
    mount.append(this.renderer.domElement);
    this.hud = new RaceHud(mount, {
      vehicleArtLibrary: this.vehicleArtLibrary,
      onMuteChange: (muted) => this.audio.setMuted(muted),
      onAction: this.handleHudAction,
    });
    this.hud.setAssetStatus('Preparing the Inkstorm circuit…');
    void Promise.all([this.inkstormWorld.ready, this.sky.ready]).then(() => {
      if (this.disposed) return;
      this.worldAssetsSettled = true;
      this.hud.setAssetStatus(this.inkstormWorld.error ? 'Scenery unavailable. Reload to retry; the base course remains playable.' : null);
    });
    this.applyGameSettings(this.settings, false);
    this.hud.root.addEventListener('click', this.handleHudClick);
    this.unsubscribeRoom = this.room.subscribe(this.handleRoomLobbyChange);
    this.audio.arm(window);
    // Chrome may permit audio immediately (for an already-engaged origin). If
    // it does not, the suspended graph is fully prepared and begins on the
    // first selector key/pointer gesture without skipping the supplied sting.
    void this.audio.startMenuMusic('/audio/podracing-selection-intro.webm');
    // This succeeds immediately on origins Chrome already trusts; otherwise
    // the armed gesture listeners remain in place and resume on the player's
    // first selector key/click, which is the browser-mandated fallback.
    void this.audio.unlock();
    window.addEventListener('keydown', this.handleUtilityKey);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.scene.background = new Color('#281f56');
    this.scene.fog = new Fog('#e47a45', 620, 3800);
    this.scene.add(this.cameraRig.camera);
    this.scene.add(this.sky);
    this.scene.add(this.terrain.group);
    this.scene.add(this.dust.group);
    this.scene.add(this.contactShadows.mesh);
    this.scene.add(this.galacticEffects);
    this.scene.add(this.landmarks);
    this.scene.add(this.inkstormWorld);
    this.scene.add(this.ghostView);
    this.scene.add(this.playerView);
    for (const rivalView of this.rivalViews) this.scene.add(rivalView);
    for (let racerIndex = 0; racerIndex < this.racerViews.length; racerIndex += 1) {
      const racerView = this.racerViews[racerIndex];
      if (!racerView) continue;
      const pilot = attachPilotToAnchor(racerView.pilotAnchor, {
        racerIndex,
        detail: racerIndex === 0 ? 'hero' : 'distant',
        viewportWidth: Math.max(1, window.innerWidth),
        viewportHeight: Math.max(1, window.innerHeight),
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      });
      // Readability beats literal scale in the chase camera: the upper body
      // must remain an animated character silhouette, not a helmet-sized knob.
      pilot.scale.setScalar(racerIndex === 0 ? 1.28 : 1.2);
      pilot.position.y -= 0.52;
      pilot.rotation.x = .22;
      this.pilots.push(pilot);
    }
    this.terrain.setCourseGulfField(this.race.courseGulfField);
    this.terrain.setPitPadField(this.race.pitPadField);
    this.galacticEffects.setTerrainUniforms(this.terrain.gulfTextures.uniforms);
    this.courseView.setTerrainSampler((x, z) => this.terrain.sampleHeight(x, z), this.terrain.gulfTextures.uniforms);
    this.courseView.setCourse(this.race.course.getRenderData(1024));
    this.inkstormWorld.setCourse(this.race.course);
    this.racerShadowBindingRevision = -1;
    void this.inkstormWorld.ready.then(() => {
      if (!this.disposed) this.courseView.setInkstormWorldEnabled(this.inkstormWorld.loaded);
    });
    this.sky.setRegion(this.race.course.region);
    this.scene.add(this.courseView);
    this.scene.add(this.speedStreaks.lines);
    this.landmarks.setHeightSampler((x, z) => this.terrain.sampleHeight(x, z));

    this.post = new CelPostPipeline(this.renderer, this.scene, this.cameraRig.camera, {
      enabled: true,
      prepassScale: 0.78,
      edges: {
        contactStrength: .85,
        edgeThreshold: 0.16,
        edgeSoftness: 0.022,
        normalWeight: 0.38,
        depthWeight: 7.2,
        thickness: 0.88,
        opacity: 0.74,
        hullSilhouetteSuppression: 0.08,
      },
    });
    this.terrainMrt = new CelPrepassMaterial({
      name: 'Terrain displaced cel MRT',
      vertexPreamble: `uniform vec2 uRenderOrigin;\n${TERRAIN_GLSL}`,
      uniforms: { ...this.terrain.gulfTextures.uniforms, uRenderOrigin: this.terrain.materials.uniforms.renderOrigin },
      normalTransform: /* glsl */ `
        vec2 nXZ = (modelMatrix * vec4(position, 1.0)).xz + uRenderOrigin;
        vec3 nFields;
        float nH = terrainFields(nXZ, nFields);
        vec3 nUnused;
        const float nEps = 1.15;
        float nHX = terrainFields(nXZ + vec2(nEps, 0.0), nUnused);
        float nHZ = terrainFields(nXZ + vec2(0.0, nEps), nUnused);
        objectNormal = normalize(vec3(nH - nHX, nEps, nH - nHZ));
      `,
      vertexTransform: /* glsl */ `
        vec2 pXZ = (modelMatrix * vec4(transformed, 1.0)).xz + uRenderOrigin;
        vec3 pFields;
        transformed.y += terrainFields(pXZ, pFields);
      `,
    });
    for (const mesh of this.terrain.meshes) {
      mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
      this.terrainPrepassUnregister.push(
        this.post.registerCustomPrepass(mesh, this.terrainMrt),
      );
    }
    this.installPriorityOutlines();
    this.racerMrt = new CelPrepassMaterial({
      name: 'Batched racer cel MRT',
    });
    const appearanceLocalRacerId = this.localRacerId();
    const appearanceHumanMembers = this.room.lobby.members;
    for (const racerView of this.racerViews) {
      racerView.createCelPrepassProxy();
      racerView.setGeometryChangeListener(() => this.bindRacerPresentation(racerView));
      this.bindRacerPresentation(racerView);
      void racerView.setAppearance(resolveRacerAppearancePreference(
        this.race.state.entries[racerView.racerIndex]?.id,
        appearanceLocalRacerId, this.vehicleAppearance, appearanceHumanMembers,
      ));
    }

    this.viewport = new Viewport(
      mount,
      this.renderer,
      this.cameraRig.camera,
      (width, height, pixelRatio) => {
        this.post.resize(width, height, pixelRatio);
        for (const handle of this.outlineHandles) {
          handle.setViewport(width, height, pixelRatio);
        }
        for (const handle of this.courseOutlineHandles) {
          handle.setViewport(width, height, pixelRatio);
        }
        for (const pilot of this.pilots) pilot.setViewport(width, height, pixelRatio);
      },
    );
    this.applyPerformanceDecision(this.performanceGovernor.decision);

    this.syncCameraSubject();
    this.cameraRig.snap(this.subject);
    this.installReviewApi();
    this.installContextRecovery();
  }

  start(): void {
    this.previousTime = performance.now();
    // Context restoration resumes this loop after an explicit suspension.
    this.performanceGovernor.resetMeasurements();
    const loop = (time: number): void => {
      if (this.disposed) return;
      const workStarted = performance.now();
      const dt = Math.min((time - this.previousTime) / 1000, 0.1);
      this.previousTime = time;
      if (!this.captureMode) this.advanceRealtime(dt);
      this.render(dt);
      this.performanceGovernor.observeRendererInfo(this.renderer.info.render);
      const decision = this.performanceGovernor.sample(
        performance.now() - workStarted,
        time,
      );
      if (decision.changed) this.applyPerformanceDecision(decision);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.viewport.dispose();
    this.keyboardInput.dispose();
    this.unsubscribeRoom();
    this.room.dispose();
    window.removeEventListener('keydown', this.handleUtilityKey);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.hud.root.removeEventListener('click', this.handleHudClick);
    this.hud.dispose();
    this.audio.dispose();
    for (const unregister of this.terrainPrepassUnregister) unregister();
    for (const registrations of this.racerPrepassUnregister.values()) for (const unregister of registrations) unregister();
    this.racerPrepassUnregister.clear();
    for (const view of this.racerViews) view.setGeometryChangeListener(null);
    this.terrainMrt.dispose();
    this.racerMrt.dispose();
    for (const outline of this.outlineHandles) outline.dispose();
    for (const outline of this.courseOutlineHandles) outline.dispose();
    this.post.dispose();
    for (const pilot of this.pilots) pilot.dispose();
    this.sky.dispose();
    this.landmarks.dispose();
    this.inkstormWorld.dispose();
    this.inkstormSunShadow.dispose();
    this.inkstormRacerShadow.dispose();
    this.ghostView.dispose();
    this.playerView.dispose();
    for (const rivalView of this.rivalViews) rivalView.dispose();
    this.vehicleArtLibrary.dispose();
    this.courseView.dispose();
    this.speedStreaks.dispose();
    this.contactShadows.dispose();
    this.galacticEffects.dispose();
    this.terrain.dispose();
    this.dust.dispose();
    this.renderer.dispose();
    this.cameraRig.dispose();
    this.renderer.domElement.remove();
    delete window.__PODRACING__;
  }

  private cancelCombatCut(): void {
    this.combatPresentation.cancel();
    this.combatChaseRecovery = false;
    this.subject.wreckChase = false;
    if (this.combatCameraCut) {
      this.combatCameraCut = false;
      this.cameraRig.setCombatFraming(false);
      this.cameraDirector.setManualMode(this.combatPriorManualCamera);
    }
  }

  private combatContext(): CombatPresentationContext {
    const localRacerId = this.localRacerId();
    return {
      role: this.room.lobby.role,
      localRacerId,
      racing: !this.awaitingRaceStart && this.race.state.phase === 'racing'
        && this.race.state.entries.find((entry) => entry.id === localRacerId)?.status !== 'finished',
      paused: this.paused,
      capture: this.captureMode,
      reducedMotion: this.settings.comfort.reducedMotion || this.combatSystemMotion?.matches === true,
      motionIntensity: this.settings.comfort.motionIntensity,
      allowOffensiveSlowMotion: this.race.competitionProfile === 'chaos',
      allowVictimSlowMotion: this.combatVictimRunInvalidated,
      racerName: (id) => this.race.state.entries.find((entry) => entry.id === id)?.name ?? 'RIVAL',
    };
  }

  private advanceRealtime(dt: number): void {
    this.pollGamepadRemapCapture();
    const input = this.input.snapshot();
    this.consumeRoomControlSignals();
    // Boot into an interactive vehicle registry, not a race already in
    // progress. The RAF/render graph continues to animate the hero orbit while
    // all deterministic race clocks and AI remain untouched at grid state.
    if (this.awaitingRaceStart) {
      this.accumulator = 0;
      if (input.pause && !this.pauseHeld) this.beginRaceCountdown();
      this.pauseHeld = input.pause;
      this.restartHeld = false;
      return;
    }

    // Guests never advance race truth locally. Their semantic controls go to
    // the host while the newest ordered snapshot replaces local simulation
    // state. Camera damping and short velocity extrapolation hide the 20 Hz
    // network cadence without inventing gameplay outcomes client-side.
    if (this.room.lobby.role === 'guest') {
      this.room.sendInput(input);
      const snapshot = this.room.consumeAuthoritativeState();
      if (snapshot) {
        this.applyGuestAuthoritativeState(
          snapshot,
          input,
          this.room.consumeAuthoritativeEvents(),
        );
      }
      this.networkSnapshotAge = Math.min(0.12, this.networkSnapshotAge + dt);
      this.accumulator = 0;
      this.pauseHeld = false;
      this.restartHeld = input.reset;
      return;
    }
    if (input.pause && !this.pauseHeld && this.race.state.phase !== 'finished') {
      this.paused = !this.paused;
      this.accumulator = 0;
      this.hud.setPaused(this.paused);
      this.audio.setPaused(this.paused);
    }
    this.pauseHeld = input.pause;

    if (input.reset && !this.restartHeld && this.race.state.phase === 'finished') {
      if (this.room.lobby.role === 'solo') this.retryMasteryEvent();
      else {
        if (this.room.lobby.role === 'host') this.room.returnToLobby();
        this.restartRace();
      }
      this.restartHeld = true;
      return;
    }
    this.restartHeld = input.reset;
    if (this.paused) return;

    const pacedDelta = this.combatPresentation.scheduleDelta(dt, this.previousTime, this.combatContext());
    this.accumulator = Math.min(this.accumulator + pacedDelta, 0.25);
    while (this.accumulator >= FIXED_DT) {
      this.stepSimulation(input);
      this.accumulator -= FIXED_DT;
    }
  }

  private stepSimulation(liveInput?: PlayerInputState): void {
    this.simulationFrame += 1;
    const time = this.simulationFrame * FIXED_DT;
    const requestedInput = this.captureMode
      ? this.reviewInput ?? this.captureInput(this.preset, time)
      : liveInput ?? this.input.snapshot();
    const result = this.race.step(
      requestedInput,
      this.room.lobby.role === 'host' ? this.room.remoteInputs : undefined,
    );
    if (!this.captureMode && this.room.lobby.role === 'solo') {
      this.mastery.step(result);
      // The mastery observer above already invalidates every local wreck.
      // Presentation mirrors that outcome; it never changes record eligibility.
      if (result.galacticEvents.some((event) => event.type === 'wreck' && event.racerId === this.localRacerId())) {
        this.combatVictimRunInvalidated = true;
      }
    }
    this.combatPresentation.consume(result.galacticEvents.map((event, index) => ({
      id: `${result.state.step}:${index}`, event,
    })), performance.now(), this.combatContext());
    const semanticEvents = [...result.events, ...result.galacticEvents];
    this.highlights.recordFrame(time, result.state.entries);
    this.highlights.consumeEvents(time, semanticEvents, result.state.raceTime);
    if (this.room.lobby.role === 'host') {
      this.room.recordAuthoritativeEvents(result.state.step, semanticEvents);
    }
    this.lastRaceInputs = result.inputs;
    for (const event of result.galacticEvents) {
      this.recentGalacticEvents.push({
        ...event,
        frame: this.simulationFrame,
      });
    }
    if (this.recentGalacticEvents.length > 32) {
      this.recentGalacticEvents.splice(0, this.recentGalacticEvents.length - 32);
    }
    this.consumeGalacticEffects(result.galacticEvents, time);
    for (const event of result.events) {
      if (event.type === 'countdown' && event.cue === 'go') {
        this.hudGoUntil = result.state.raceTime + 0.72;
      }
    }
    if (!this.captureMode) {
      this.audio.handleEvents(result.events, { playerId: this.localRacerId() });
      this.cameraDirector.consumeEvents(result.events);
      this.audio.handleEvents(result.galacticEvents, { playerId: this.localRacerId() });
      this.cameraDirector.consumeEvents(result.galacticEvents, { playerId: this.localRacerId() });
    }
    for (let racerIndex = 0; racerIndex < result.state.entries.length; racerIndex += 1) {
      const entry = result.state.entries[racerIndex];
      if (!entry) continue;
      this.racerViews[racerIndex]?.setVehicleClass(
        entry.galactic?.vehicleClass ?? this.racerViews[racerIndex]?.authoredVehicleClass ?? 'podracer',
      );
      this.consumeVehicleEvents(
        result.vehicleEvents[entry.id] ?? [],
        entry.vehicle,
        entry.isPlayer,
      );
      this.pushRacerWake(racerIndex, entry.vehicle, time);
      const dynamics = this.pilotDynamics[racerIndex];
      if (dynamics) {
        const yaw = entry.vehicle.orientation.yaw;
        const lateralSpeed = entry.vehicle.velocity.x * Math.cos(yaw)
          - entry.vehicle.velocity.z * Math.sin(yaw);
        dynamics.lateralAcceleration = (lateralSpeed - dynamics.previousLateralSpeed) / FIXED_DT;
        dynamics.verticalAcceleration = (
          entry.vehicle.velocity.y - dynamics.previousVerticalSpeed
        ) / FIXED_DT;
        dynamics.previousLateralSpeed = lateralSpeed;
        dynamics.previousVerticalSpeed = entry.vehicle.velocity.y;
      }
      const driftInput = result.inputs[entry.id] ?? NEUTRAL_PLAYER_INPUT;
      const driftSprayActive = entry.vehicle.drift.active || (
        driftInput.drift && entry.vehicle.telemetry.normalizedSpeed > 0.32
      );
      if (driftSprayActive && this.simulationFrame % RACE_PRESENTATION_CAPACITY === racerIndex) {
        const yaw = entry.vehicle.orientation.yaw;
        const forwardX = Math.sin(yaw);
        const forwardZ = Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);
        const driftSide = entry.vehicle.drift.direction || Math.sign(driftInput.steer) || 1;
        // Throw the plume from the loaded, outside engine instead of the
        // chassis centre.  The offset is deliberately exaggerated: at race
        // camera distance this creates the broad anime sand fan that makes a
        // powerslide legible in a single frame.
        const sprayX = entry.vehicle.position.x
          + rightX * driftSide * 10
          - forwardX * 3.5;
        const sprayZ = entry.vehicle.position.z
          + rightZ * driftSide * 10
          - forwardZ * 3.5;
        this.dust.emitSpray(
          sprayX,
          this.race.terrain.heightAt(sprayX, sprayZ) + 0.32,
          sprayZ,
          forwardX * 0.94 - rightX * driftSide * 0.46,
          forwardZ * 0.94 - rightZ * driftSide * 0.46,
          0.82 + Math.max(0.35, entry.vehicle.drift.charge) * 0.92,
          12,
        );
      }
    }
    if (!this.captureMode
      && this.room.lobby.role === 'host'
      && this.simulationFrame % 6 === 0) {
      this.room.broadcastState(this.race.snapshot());
    }
    this.syncCameraSubject();
  }

  private render(dt: number): void {
    this.renderer.info.reset();
    const combatFrame = this.combatPresentation.frame(performance.now(), this.combatContext());
    this.hud.updateCombat(combatFrame);
    const motionDelta = dt * combatFrame.timeScale;
    const renderExtrapolation = this.room.lobby.role === 'guest'
      ? Math.min(0.08, this.networkSnapshotAge)
      : combatFrame.cinematic.active ? this.accumulator : 0;
    const time = this.simulationFrame * FIXED_DT + renderExtrapolation;
    if (renderExtrapolation > 0) this.syncCameraSubject(renderExtrapolation);
    this.updateOvertakeCallout();
    const replay = this.resolveHighlightReplayFrame();
    const replayFrame = replay?.frame ?? null;
    const presentationTime = time + (replay?.elapsedSeconds ?? 0);
    if (replayFrame) this.syncHighlightCameraSubject(replayFrame);
    if (replayFrame && replay) {
      this.emitHighlightReplayImpact(replayFrame, replay.elapsedSeconds, presentationTime);
    }
    const combatCut = combatFrame.cinematic.cameraCut && !replayFrame;
    const cutChanged = combatCut !== this.combatCameraCut;
    if (cutChanged) {
      if (combatCut) {
        this.combatPriorManualCamera = this.cameraDirector.getManualMode();
        this.combatChaseRecovery = true;
      }
      this.combatCameraCut = combatCut;
      this.cameraRig.setCombatFraming(combatCut);
      this.cameraDirector.setManualMode(combatCut ? 'side' : this.combatPriorManualCamera);
      this.syncCameraSubject(renderExtrapolation);
    }
    this.subject.combatFocus = undefined;
    this.subject.combatForward = undefined;
    this.subject.combatImpactPosition = undefined;
    this.subject.combatRadius = undefined;
    this.subject.combatBounds = undefined;
    this.subject.combatTerrain = undefined;
    this.subject.wreckRecovery = false;
    this.subject.wreckChase = false;
    if (combatCut) this.syncCombatCameraSubject(renderExtrapolation);
    const cameraPresentation = this.cameraDirector.update({
      phase: this.race.state.phase,
      playerFinished: this.race.state.entries.find((entry) => entry.isPlayer)?.status === 'finished',
    });
    this.cameraMode = cameraPresentation.mode;
    const playerWreck = this.race.state.entries.find(entry => entry.vehicle === this.playerState)?.galactic?.wreck;
    const stillWrecked = this.combatChaseRecovery && !this.paused && !this.captureMode
      && !this.settings.comfort.reducedMotion && this.combatSystemMotion?.matches !== true
      && this.settings.comfort.motionIntensity > 0 && this.race.state.phase === 'racing'
      && (playerWreck?.phase === 'wrecked' || playerWreck?.phase === 'recovering');
    // The completed victim recovery is an edited return to ordinary chase.
    // Interpolating from the opposite-side fitted wreck eye crosses the long
    // engine envelope after its protection is removed. Cut once to the exact
    // existing chase pose; cancellation/manual/replay paths retain their policy.
    const recoveredChase = this.combatChaseRecovery && playerWreck?.phase === 'running'
      && this.cameraMode === 'chase' && !this.paused && !this.captureMode && !replayFrame
      && !this.settings.comfort.reducedMotion && this.combatSystemMotion?.matches !== true
      && this.settings.comfort.motionIntensity > 0 && this.race.state.phase === 'racing';
    if (!stillWrecked) this.combatChaseRecovery = false;
    const wreckChase = stillWrecked && !combatCut && !replayFrame && this.cameraMode === 'chase';
    if (wreckChase) {
      this.syncCombatCameraSubject(renderExtrapolation);
      this.subject.wreckChase = true;
    }
    if (replayFrame || recoveredChase || (cutChanged && !wreckChase)) {
      // Highlight poses come from a ring buffer and may move several metres
      // between presented samples. A gameplay spring chases that historical
      // subject from the live results orbit, making the event recede into a
      // tiny cluster. Replays are authored cuts: lock the lens to each sampled
      // pose so the selected interaction remains centred and legible.
      this.cameraRig.snap(this.subject);
    } else {
      this.cameraRig.update(Math.max(dt, FIXED_DT), presentationTime, this.subject);
    }
    const worldWindStrength = this.applyRaceDirectorPresentation();
    this.sky.update(presentationTime, this.cameraRig.camera);
    this.terrain.update({
      cameraWorldX: this.cameraRig.camera.position.x,
      cameraWorldZ: this.cameraRig.camera.position.z,
      renderOriginX: 0,
      renderOriginZ: 0,
      time: presentationTime,
    });
    this.syncGalacticEffects(presentationTime);
    this.updateGroundDust();
    this.dust.update({
      time: presentationTime,
      // Deterministic stepping advances particle lifetimes explicitly. RAFs
      // between a review step and screenshot must only present that state.
      deltaSeconds: this.captureMode ? 0 : Math.max(0, motionDelta),
      cameraWorldX: this.cameraRig.camera.position.x,
      cameraWorldY: this.cameraRig.camera.position.y,
      cameraWorldZ: this.cameraRig.camera.position.z,
      lowCameraView: this.cameraMode === 'chase'
        || this.cameraMode === 'side'
        || this.cameraMode === 'cockpit',
      renderOriginX: 0,
      renderOriginZ: 0,
      windX: 0.94,
      windZ: 0.34,
      windStrength: worldWindStrength,
    });
    if (this.captureMode) this.dust.settleDeterministicEffects();
    this.landmarks.update(this.subject.position.x, this.subject.position.z);
    this.landmarks.visible = !this.inkstormWorld.loaded;
    this.updateRivalLods(this.performanceGovernor.decision);
    const appearanceLocalRacerId = this.localRacerId();
    const appearanceHumanMembers = this.room.lobby.members;
    for (let racerIndex = 0; racerIndex < this.racerViews.length; racerIndex += 1) {
      const view = this.racerViews[racerIndex];
      const entry = this.race.state.entries[racerIndex];
      if (view) view.visible = Boolean(entry);
      if (!view || !entry) {
        this.galacticEffects.syncWreckRupture(racerIndex, -1);
        view?.syncVisibility(); continue;
      }
      const input = this.lastRaceInputs[entry.id] ?? NEUTRAL_PLAYER_INPUT;
      const vehicle = entry.vehicle;
      const replayPose = replayFrame?.racers.find((pose) => pose.id === entry.id);
      const displayX = replayPose?.x ?? vehicle.position.x + vehicle.velocity.x * renderExtrapolation;
      const displayY = replayPose?.y ?? vehicle.position.y + vehicle.velocity.y * renderExtrapolation;
      const displayZ = replayPose?.z ?? vehicle.position.z + vehicle.velocity.z * renderExtrapolation;
      const displayYaw = replayPose?.yaw ?? vehicle.orientation.yaw;
      const displaySpeed = replayPose?.speed ?? vehicle.telemetry.speed;
      const galacticState = entry.galactic;
      const wrecked = galacticState?.wreck.phase === 'wrecked';
      const replayElapsed = replay?.elapsedSeconds ?? 0;
      const replayImpact = replay
        && this.highlightReplay?.kind === 'takedown'
        && entry.id === this.highlightReplay.focusRacerId
        ? Math.max(0, Math.min(1, (replayElapsed - 1.96) / 0.24))
          * Math.max(0, Math.min(1, (3.05 - replayElapsed) / 0.32))
        : 0;
      const crashRoll = wrecked && replayFrame
        ? -0.92 + Math.sin(time * 7.4 + racerIndex) * 0.34
        // Keep the replay hit unmistakable without rotating the long engine
        // assembly through the lens. The previous near-90-degree kick made
        // the victim appear to surge into (and crop against) the foreground.
        : replayImpact * (-0.46 + Math.sin(replayElapsed * 15.2) * 0.12);
      const crashPitch = wrecked && replayFrame
        ? 0.34 + Math.sin(time * 5.1 + racerIndex) * 0.16
        : replayImpact * (0.22 + Math.sin(replayElapsed * 11.7) * 0.07);
      view.setVehicleClass(entry.galactic?.vehicleClass ?? view.authoredVehicleClass);
      void view.setAppearance(resolveRacerAppearancePreference(
        entry.id, appearanceLocalRacerId, this.vehicleAppearance, appearanceHumanMembers,
      ));
      const wreckPose = wrecked && !replayFrame ? this.resolveWreckVisualPose(entry, renderExtrapolation) : null;
      this.galacticEffects.syncWreckRupture(racerIndex, galacticState?.wreck.crashCount ?? -1, wreckPose?.rupture);
      if (!this.paused && wreckPose?.groundContact && this.wreckGroundContacts.take(
        entry.id, this.simulationFrame, galacticState!.wreck.crashCount, wreckPose.groundContact,
      )) {
        this.galacticEffects.emitWreckGroundContact(presentationTime,
          wreckPose.groundContact.position, wreckPose.groundContact.direction);
      }
      this.contactShadows.update(
        racerIndex,
        wreckPose?.position.x ?? displayX,
        this.race.terrain.heightAt(wreckPose?.position.x ?? displayX, wreckPose?.position.z ?? displayZ),
        wreckPose?.position.z ?? displayZ,
        wreckPose?.rotation.y ?? displayYaw,
        vehicle.telemetry.groundClearance,
        vehicle.telemetry.normalizedSpeed,
      );
      view.update({
        x: wreckPose?.position.x ?? displayX,
        y: wreckPose?.position.y ?? displayY,
        z: wreckPose?.position.z ?? displayZ,
        yaw: wreckPose?.rotation.y ?? (displayYaw + (wrecked ? presentationTime * 1.25 : 0)),
        pitch: wreckPose?.rotation.x ?? (vehicle.orientation.pitch + crashPitch),
        roll: wreckPose?.rotation.z ?? (vehicle.orientation.roll + vehicle.orientation.bank + crashRoll),
        steer: input.steer,
        throttle: input.throttle,
        speed: displaySpeed,
        boost: vehicle.boost.active ? 1 : 0,
        damage: vehicle.damage,
        redline: galacticState?.redline.heat ?? 0,
        wrecked,
      }, presentationTime + racerIndex * 0.37, wreckPose !== null);
      const pilot = this.pilots[racerIndex];
      const dynamics = this.pilotDynamics[racerIndex];
      if (pilot && dynamics) {
        pilot.updateAnimation({
          time: presentationTime + racerIndex * 0.37,
          deltaTime: Math.max(0, Math.min(motionDelta, 0.1)),
          steering: input.steer,
          throttle: input.throttle,
          brake: input.brake,
          lateralAcceleration: dynamics.lateralAcceleration,
          verticalAcceleration: dynamics.verticalAcceleration,
          drift: input.drift ? input.steer : 0,
          grounded: vehicle.grounded,
          landingIntensity: vehicle.telemetry.landingIntensity,
          engineVibration: Math.min(
            1,
            0.14 + input.throttle * 0.38 + vehicle.telemetry.normalizedSpeed * 0.42
              + (vehicle.boost.active ? 0.2 : 0),
          ),
          racePhase: this.race.state.phase,
          finished: entry.status === 'finished',
        });
      }
    }
    // Follow the same current pose used by the vehicle before uploading FX.
    this.galacticEffects.update(presentationTime, this.cameraRig.camera);
    this.ghostView.setVehicleClass(this.selectedVehicleClass());
    this.ghostView.setPose(!this.captureMode && !this.awaitingRaceStart && this.room.lobby.role === 'solo'
      && this.race.state.phase === 'racing' && !replayFrame
      ? this.mastery.ghostPose(this.race.state.raceTime) : null);
    this.contactShadows.mesh.count = this.race.state.entries.length;
    this.courseView.update(presentationTime);
    this.inkstormWorld.update(this.cameraRig.camera);
    if(this.inkstormWorld.loaded){
      try{this.inkstormSunShadow.update(this.renderer,this.inkstormWorld.shadowRevision,()=>this.inkstormWorld.createShadowCasters(),this.scene);}
      catch(error){console.warn('Inkstorm scenery shadow atlas unavailable; using art shadows.',error);}
      this.inkstormWorld.setSunShadowsEnabled(this.inkstormSunShadow.uniforms.uWorldShadowReady.value>0);
    }
    if (this.racerShadowBindingRevision !== this.inkstormWorld.shadowRevision) {
      this.inkstormRacerShadow.bindReceivers(this.scene);
      this.racerShadowBindingRevision = this.inkstormWorld.shadowRevision;
    }
    const shadowIndex = this.race.state.entries.findIndex(entry => entry.id === this.localRacerId());
    const shadowView = this.racerViews[shadowIndex];
    if (shadowView) {
      const shadowReady = this.inkstormRacerShadow.update(this.renderer, shadowView, this.scene,
        this.race.terrain.heightAt(shadowView.position.x, shadowView.position.z));
      if (shadowReady) this.contactShadows.hide(shadowIndex);
    } else this.inkstormRacerShadow.clear();
    this.speedStreaks.update(
      presentationTime,
      this.subject.speed,
      this.subject.position,
      Math.atan2(this.subject.forward.x, this.subject.forward.z),
    );
    if (this.race.state.phase !== 'racing') this.speedStreaks.lines.visible = false;
    if (this.captureMode || this.simulationFrame >= this.nextHudFrame) {
      this.nextHudFrame = this.simulationFrame + 4;
      const hudModel = deriveRaceHudViewModel(this.race.state, {
        playerId: this.localRacerId(),
        course: this.minimapCourse,
        courseBranches: this.currentMinimapCourseBranches(),
        preRace: createVehicleSelectionViewModel(
          this.selectedVehicleClass(),
          !this.captureMode && this.awaitingRaceStart,
          {
            appearance: {
              selected: this.vehicleAppearance,
              active: this.racerViews[shadowIndex]?.activeAppearanceId ?? 'procedural',
              status: this.racerViews[shadowIndex]?.appearanceStatus ?? 'procedural',
              error: this.racerViews[shadowIndex]?.imported.error?.message ?? null,
            },
            selectedLaps: this.selectedLaps,
            fixedRules: this.fixedEventRules(),
            aiDifficulty: this.selectedAIDifficulty,
            raceMode: this.selectedRaceMode,
            workshop: createWorkshopHudViewModel(
              this.selectedVehicleClass(),
              this.workshopGarage.loadouts[this.selectedVehicleClass()],
              { open: this.workshopOpen, activeSlot: this.workshopSlot },
            ),
            lobby: this.hudLobbyViewModel(),
          },
        ),
        mastery: !this.captureMode && this.room.lobby.role === 'solo'
          ? this.mastery.model(this.awaitingRaceStart ? this.masteryStartOptions() : undefined) : undefined,
        controlsVisible: !this.captureMode && (
          !this.awaitingRaceStart
          && (this.showControls || this.race.state.phase === 'countdown')
        ),
        resultsPresentation: this.race.state.phase === 'finished'
          ? this.getResultsPresentation()
          : undefined,
        settings: createSettingsHudViewModel(this.settings, {
          open: this.settingsOpen,
          activeTab: this.settingsTab,
          capture: this.settingsCapture,
        }),
        threats: this.settings.comfort.directionalThreatCues
          ? this.createThreatCues()
          : undefined,
      });
      if (this.race.state.raceTime < this.hudGoUntil) hudModel.countdownCue = 'go';
      this.hud.update(hudModel);
    }
    if (!this.captureMode && !this.awaitingRaceStart) {
      const playerInput = this.lastRaceInputs[this.localRacerId()] ?? NEUTRAL_PLAYER_INPUT;
      const galactic = this.race.state.entries.find((entry) => entry.isPlayer)?.galactic;
      this.audio.update({
        speedMps: this.playerState.telemetry.speed,
        normalizedSpeed: this.playerState.telemetry.normalizedSpeed,
        throttle: playerInput.throttle,
        boost: this.playerState.boost.energy,
        boostActive: this.playerState.boost.active || galactic?.redline.active === true,
        drift: this.playerState.drift.charge,
        heat: Math.max(this.playerState.heat, galactic?.redline.heat ?? 0),
        damage: this.playerState.damage,
        grounded: this.playerState.grounded,
        engineTorque: this.playerState.telemetry.engineTorque,
        simulationTime: this.playerState.simulationTime,
        vehicleId: galactic?.vehicleClass ?? 'podracer',
        environmentClosure: this.race.course.sampleAtProgress(this.race.state.entries.find((entry) => entry.isPlayer)?.progress.courseProgress ?? 0).tag === 'narrow-canyon' ? 1 : 0.08,
        rivals: this.rivalAudioTelemetry(),
      });
    }
    this.post.render(dt);
  }

  private setCaptureMode(enabled: boolean): void {
    this.cancelCombatCut();
    if (this.captureMode === enabled) return;
    this.captureMode = enabled;
    this.performanceGovernor.setAdaptiveEnabled(!enabled);
    if (enabled) {
      this.liveQualityLevel = this.performanceGovernor.decision.qualityLevel;
      this.applyPerformanceDecision(this.performanceGovernor.setQualityLevel(0));
    } else {
      this.applyPerformanceDecision(
        this.performanceGovernor.setQualityLevel(this.liveQualityLevel),
      );
      this.performanceGovernor.resetMeasurements();
    }
    this.viewport.setCaptureMode(enabled);
    this.cameraRig.setCaptureMode(enabled);
    this.keyboardInput.enabled = !enabled;
    this.gamepadInput.enabled = !enabled;
    if (!enabled) this.cameraDirector.setManualMode(null);
    if (enabled) { this.accumulator = 0; this.mastery.cancelRun(); }
  }

  private applyGameSettings(settings: unknown, persist = true): void {
    this.settings = sanitizeGameSettings(settings, this.settings);
    this.keyboardInput.setBindings(this.settings.keyboardBindings);
    this.gamepadInput.setBindings(this.settings.gamepadBindings);
    this.gamepadInput.setTuning(this.settings.controls);
    this.cameraRig.setComfortSettings({
      shakeIntensity: this.settings.comfort.cameraShake,
      fovKickIntensity: this.settings.comfort.fovEffects,
      reducedMotion: this.settings.comfort.reducedMotion,
    });
    this.audio.setMix(this.settings.audio);
    this.speedStreaks.setIntensity(
      this.settings.comfort.reducedMotion ? 0 : this.settings.comfort.motionIntensity,
    );
    this.mount.dataset.reducedMotion = String(this.settings.comfort.reducedMotion);
    this.mount.dataset.highContrast = String(this.settings.comfort.highContrast);
    if (persist) saveGameSettings(this.settings);
    this.nextHudFrame = 0;
  }

  /** Mirrors host-authoritative director conditions into atmosphere and dust. */
  private applyRaceDirectorPresentation(): number {
    const environment = this.race.state.director?.environment;
    const visibility = Math.min(1, Math.max(0.12, environment?.visibility ?? 1));
    const region = this.terrain.atmosphereAt(this.subject.position.x);
    const fog = this.scene.fog;
    if (fog instanceof Fog) {
      fog.color.set(region.haze);
      fog.near = 160 + visibility * 460;
      fog.far = 820 + visibility * 2_980;
    }
    this.terrain.setHazeRange(
      220 + visibility * 260,
      940 + visibility * 2_660,
    );
    return Math.min(
      1.8,
      Math.max(0.25, region.windStrength * (environment?.windStrength ?? 1)),
    );
  }

  private restartRace(previousVehicleClass = this.selectedVehicleClass()): void {
    this.mastery.cancelRun();
    this.ghostView.setPose(null);
    this.race.reset();
    this.race.setTotalLaps(this.selectedLaps);
    if (this.room.lobby.role === 'solo') {
      this.race.selectPlayerVehicle(previousVehicleClass);
    } else {
      this.applyRoomLobbyChoicesToGrid(this.room.lobby);
    }
    this.awaitingRaceStart = true;
    this.simulationFrame = 0;
    this.accumulator = 0;
    this.nextHudFrame = 0;
    this.hudGoUntil = -1;
    this.lastRaceInputs = {};
    this.lastLocalPlacement = null;
    this.highlights.reset();
    this.combatPresentation.reset();
    this.combatVictimRunInvalidated = false;
    this.combatCameraCut = false;
    this.cameraRig.setCombatFraming(false);
    this.highlightPackage = null;
    this.highlightReplay = null;
    this.cameraRig.setHighlightFraming(false);
    this.hud.root.dataset.highlightReplay = 'false';
    delete this.hud.root.dataset.highlightTitle;
    this.resultsPresentation = null;
    this.dust.clear();
    this.galacticEffects.clearEffects();
    this.wreckGroundContacts.clear();
    this.cameraDirector.reset();
    this.paused = false;
    this.hud.setPaused(false);
    this.audio.setPaused(false);
    this.audio.transitionMenuMusicToSelection();
    for (let index = 0; index < this.pilotDynamics.length; index += 1) {
      this.pilots[index]?.resetAnimationState();
      const dynamics = this.pilotDynamics[index];
      if (!dynamics) continue;
      dynamics.previousLateralSpeed = 0;
      dynamics.previousVerticalSpeed = 0;
      dynamics.lateralAcceleration = 0;
      dynamics.verticalAcceleration = 0;
    }
    this.syncCameraSubject();
    this.cameraRig.snap(this.subject);
  }

  /** Host/solo authority creates one guaranteed-new seed for each released grid. */
  private nextCourseSeed(): number {
    const ordinal = this.courseOrdinal + 1;
    let entropy: number;
    if (this.deterministicCourseSequence) {
      entropy = Math.imul(ordinal, 0x9e3779b9) ^ BASE_RACE_SEED;
    } else {
      const words = new Uint32Array(1);
      globalThis.crypto.getRandomValues(words);
      entropy = (words[0] ?? 0) ^ Date.now() ^ Math.floor(performance.now() * 1000);
    }
    let candidate = mixRaceSeed(
      entropy ^ this.currentCourseSeed ^ Math.imul(ordinal, 0x85ebca6b),
    );
    let attempt = 0;
    while (this.usedCourseSeeds.has(candidate)) {
      attempt += 1;
      if (attempt >= 32) {
        // A bounded linear fallback makes non-repetition a hard guarantee even
        // if future changes accidentally weaken the entropy mixer.
        candidate = (this.currentCourseSeed + 1) >>> 0;
        while (this.usedCourseSeeds.has(candidate)) candidate = (candidate + 1) >>> 0;
        break;
      }
      candidate = mixRaceSeed(candidate ^ 0xa511e9b3 ^ Math.imul(attempt, 0x27d4eb2d));
    }
    return candidate >>> 0;
  }

  /**
   * Replaces simulation truth and every course-dependent render adapter as one
   * transaction. The supplied player vehicle remains the same top-level object
   * so camera, audio, dust and racer meshes never retain a stale reference.
   */
  private rebuildRaceForCourse(
    seed: number,
    workshopLoadouts: Readonly<Record<string, unknown>> = this.currentWorkshopLoadouts(),
    competitionProfile: CompetitionProfile = this.captureMode || this.room.lobby.role !== 'solo'
      ? 'chaos' : this.mastery.selectedEvent.profile,
  ): void {
    const normalizedSeed = seed >>> 0;
    const vehicleClasses = new Map<string, GalacticVehicleClass>();
    const racerNames = new Map<string, string>();
    for (const entry of this.race.state.entries) {
      vehicleClasses.set(entry.id, entry.galactic?.vehicleClass ?? 'podracer');
      racerNames.set(entry.id, entry.name);
    }

    // Clear before generation: the previous flagship field must never feed a
    // fresh Expedition seed search or leave stale GPU/dust state behind.
    this.terrain.setCourseGulfField(null);
    this.terrain.setPitPadField(null);
    this.race = new RaceSimulation({
      terrain: this.baseTerrainAdapter,
      playerVehicle: this.playerState,
      seed: normalizedSeed,
      competitionProfile,
      totalLaps: this.selectedLaps,
      mode: this.selectedRaceMode,
      aiDifficulty: this.selectedAIDifficulty,
      countdownSeconds: 3,
      workshopLoadouts,
    });
    for (const entry of this.race.state.entries) {
      const vehicleClass = vehicleClasses.get(entry.id);
      if (vehicleClass) this.race.selectRacerVehicle(entry.id, vehicleClass);
      entry.name = racerNames.get(entry.id) ?? entry.name;
    }

    for (const handle of this.courseOutlineHandles) handle.dispose();
    this.courseOutlineHandles.length = 0;
    this.terrain.setCourseGulfField(this.race.courseGulfField);
    this.terrain.setPitPadField(this.race.pitPadField);
    // Invalidates the cell cache even when a same-seed retry leaves the camera
    // in place; the fallback world must follow field enable/disable changes.
    this.landmarks.setHeightSampler((x, z) => this.terrain.sampleHeight(x, z));
    this.courseView.setTerrainSampler((x, z) => this.terrain.sampleHeight(x, z), this.terrain.gulfTextures.uniforms);
    this.courseView.setCourse(this.race.course.getRenderData(1024));
    this.inkstormWorld.setCourse(this.race.course);
    this.racerShadowBindingRevision = -1;
    this.sky.setRegion(this.race.course.region);
    this.installCourseOutlines();
    this.minimapCourse = this.createMinimapCourse();
    this.minimapCourseBranches = this.createMinimapCourseBranches();
    this.currentCourseSeed = normalizedSeed;
    this.pendingSoloCourse = null;
    this.usedCourseSeeds.add(normalizedSeed);
    this.courseOrdinal += 1;
    this.simulationFrame = 0;
    this.accumulator = 0;
    this.nextHudFrame = 0;
    this.hudGoUntil = -1;
    this.lastRaceInputs = {};
    this.lastLocalPlacement = null;
    this.highlights.reset();
    this.combatPresentation.reset();
    this.combatVictimRunInvalidated = false;
    this.combatCameraCut = false;
    this.cameraRig.setCombatFraming(false);
    this.highlightPackage = null;
    this.highlightReplay = null;
    this.cameraRig.setHighlightFraming(false);
    this.hud.root.dataset.highlightReplay = 'false';
    delete this.hud.root.dataset.highlightTitle;
    this.resultsPresentation = null;
    this.recentGalacticEvents.length = 0;
    this.dust.clear();
    this.galacticEffects.clearEffects();
    this.wreckGroundContacts.clear();
    this.cameraDirector.reset();
    this.syncRacerVehicleViews();
    this.syncCameraSubject();
    this.cameraRig.snap(this.subject);
  }

  private syncRacerVehicleViews(): void {
    this.contactShadows.mesh.count = this.race.state.entries.length;
    for (let index = 0; index < this.racerViews.length; index += 1) {
      this.racerViews[index]!.visible = index < this.race.state.entries.length;
      const entry = this.race.state.entries[index];
      if (!entry) continue;
      this.racerViews[index]?.setVehicleClass(entry.galactic?.vehicleClass ?? 'podracer');
    }
  }

  private createMinimapCourse(): HudCoursePoint[] {
    const data = this.race.course.getMinimapData(256);
    return [
      ...data.canonical.map((point) => ({
        x: point.x,
        z: point.z,
        progress: point.progress,
      })),
      ...data.branches.flatMap((branch) => branch.points.map((point) => ({
        x: point.x,
        z: point.z,
        progress: point.canonicalProgress,
        branchId: branch.id,
        branchKind: branch.kind,
      }))),
    ];
  }

  private createMinimapCourseBranches(): HudCourseBranchViewModel[] {
    const groups = new Map<string, HudCourseBranchViewModel>();
    for (const point of this.minimapCourse) {
      if (!point.branchId || !point.branchKind) continue;
      const existing = groups.get(point.branchId);
      if (existing) {
        (existing.points as typeof this.minimapCourse).push(point);
      } else {
        groups.set(point.branchId, {
          id: point.branchId,
          kind: point.branchKind,
          points: [point],
        });
      }
    }
    return [...groups.values()];
  }

  private currentMinimapCourseBranches(): readonly HudCourseBranchViewModel[] {
    const shortcut = this.race.state.director.events.find((event) => (
      event.kind === 'shortcut-window'
      && (event.phase === 'warning' || event.phase === 'active')
      && event.branchId !== null
    ));
    if (!shortcut) return this.minimapCourseBranches;
    return this.minimapCourseBranches.map((branch) => branch.id === shortcut.branchId
      ? { ...branch, status: shortcut.phase === 'active' ? 'open' : 'warning' }
      : branch);
  }

  private currentWorkshopLoadouts(): Readonly<Record<string, unknown>> {
    const lobby = this.room.lobby;
    if (lobby.role === 'solo') {
      if (this.fixedEventRules()) return {};
      return {
        [this.localRacerId()]: this.workshopGarage.loadouts[this.selectedVehicleClass()],
      };
    }
    return Object.fromEntries(lobby.members.map((member) => [
      member.racerId,
      member.workshopLoadout,
    ]));
  }

  private readonly handleUtilityKey = (event: KeyboardEvent): void => {
    if (event.repeat) return;
    if (this.settingsCapture) {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        this.finishInputRemapCapture();
      } else if (this.settingsCapture.device === 'keyboard') {
        this.commitKeyboardRemap(event.code);
      }
      return;
    }
    if (this.captureMode) return;
    const typingRoomCode = isEditableKeyboardTarget(event.target)
      && event.target instanceof HTMLInputElement
      && event.target.matches('[data-hud="room-code-input"]');
    if (typingRoomCode) {
      if (!event.metaKey
        && !event.ctrlKey
        && !event.altKey
        && (event.code === 'Enter' || event.code === 'NumpadEnter')) {
        event.preventDefault();
        this.joinRoomFromHud();
      }
      return;
    }
    if (shouldIgnoreGameplayKey(event)) return;
    if (this.awaitingRaceStart) {
      const directIndex = /^Digit[1-4]$/.test(event.code)
        ? Number(event.code.slice(-1)) - 1
        : -1;
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        this.beginRaceCountdown();
        return;
      }
      if (directIndex >= 0) {
        event.preventDefault();
        this.selectVehicle(GALACTIC_VEHICLE_ORDER[directIndex] ?? 'podracer');
        return;
      }
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') {
        event.preventDefault();
        this.moveVehicleSelection(-1);
        return;
      }
      if (event.code === 'KeyD' || event.code === 'ArrowRight' || event.code === 'KeyV') {
        event.preventDefault();
        this.moveVehicleSelection(1);
        return;
      }
    }
    if (event.code === 'KeyM') {
      this.hud.setMuted(!this.hud.isMuted());
    } else if (event.code === 'KeyH') {
      this.showControls = !this.showControls;
      this.nextHudFrame = 0;
    }
  };

  private readonly handleHudClick = (event: Event): void => {
    if (!this.awaitingRaceStart || !(event.target instanceof Element)) return;
    const action = event.target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'select-laps') {
      const laps = Number(event.target.closest<HTMLElement>('[data-laps]')?.dataset.laps);
      if (laps === 1 || laps === 2 || laps === 3) this.selectLapCount(laps);
      return;
    }
    if (action === 'create-room') {
      this.createOnlineRoom();
      return;
    }
    if (action === 'join-room') {
      this.joinRoomFromHud();
      return;
    }
    if (action === 'copy-room') {
      this.copyRoomCode();
      return;
    }
    if (action === 'leave-room') {
      this.leaveOnlineRoom();
      return;
    }
    const card = event.target.closest<HTMLElement>('[data-vehicle-id]');
    const id = card?.dataset.vehicleId;
    if (!id || !GALACTIC_VEHICLE_ORDER.includes(id as GalacticVehicleClass)) return;
    this.selectVehicle(id as GalacticVehicleClass);
  };

  private selectedVehicleClass(): GalacticVehicleClass {
    const lobby = this.room.lobby;
    if (lobby.localRacerId) {
      const localMember = lobby.members.find((member) => member.racerId === lobby.localRacerId);
      if (localMember) return localMember.vehicleClass;
    }
    return this.race.state.entries.find((entry) => entry.isPlayer)?.galactic?.vehicleClass
      ?? 'podracer';
  }

  private localRacerId(): string {
    return this.room.lobby.localRacerId
      ?? this.race.state.entries.find((entry) => entry.isPlayer)?.id
      ?? 'player';
  }

  private fixedEventRules(): boolean {
    return this.room.lobby.role === 'solo' && this.mastery.selectedEvent.profile !== 'chaos';
  }

  private masteryStartOptions(): MasteryStartOptions {
    const event = this.mastery.selectedEvent;
    const player = this.race.state.entries.find((entry) => entry.isPlayer);
    const vehicleClass = this.selectedVehicleClass();
    const pending = this.awaitingRaceStart && this.pendingSoloCourse?.eventId === event.id
      ? this.pendingSoloCourse : null;
    return {
      event: { ...event, mode: this.selectedRaceMode, laps: this.selectedLaps,
        difficulty: this.selectedAIDifficulty },
      courseSeed: pending?.seed ?? this.currentCourseSeed,
      // createRaceDirectorState preserves the supplied course seed as its identity.
      directorSeed: pending?.seed ?? this.race.state.director.seed,
      vehicleClass,
      loadout: event.stock ? null : this.awaitingRaceStart
        ? this.workshopGarage.loadouts[vehicleClass] : player?.workshop?.loadout ?? null,
      tune: DEFAULT_PODRACER_CONFIG,
      playerId: this.localRacerId(),
      recordEligible: !this.captureMode && this.room.lobby.role === 'solo',
      sectorLabels: pending ? [] : masterySectorLabels(this.race.course),
    };
  }

  private reserveSoloCourse(): void {
    const event = this.mastery.selectedEvent;
    const seed = (event.id === 'open-expedition' ? this.nextCourseSeed() : event.seed) >>> 0;
    this.pendingSoloCourse = { eventId: event.id, seed };
    // Reserve before construction so repeated menu selections cannot reuse a
    // deterministic Expedition candidate while the built course is unchanged.
    this.usedCourseSeeds.add(seed);
  }

  private selectMasteryEvent(id: string, forcePrepare = false): void {
    if (this.room.lobby.role !== 'solo' || (!this.awaitingRaceStart && this.race.state.phase !== 'finished')) return;
    if (!forcePrepare && this.awaitingRaceStart && this.mastery.selectedEvent.id === id) return;
    const vehicleClass = this.selectedVehicleClass();
    const event = this.mastery.selectEvent(id);
    this.selectedLaps = event.laps;
    this.selectedRaceMode = event.mode;
    this.selectedAIDifficulty = event.difficulty;
    this.workshopOpen = false;
    if (!this.awaitingRaceStart) this.restartRace(vehicleClass);
    this.reserveSoloCourse();
    this.nextHudFrame = 0;
  }

  /** Retry means the exact same course and selected class, including expeditions. */
  private retryMasteryEvent(): void {
    if (this.room.lobby.role !== 'solo' || (!this.paused && this.race.state.phase !== 'finished')) return;
    const seed = this.currentCourseSeed;
    const vehicleClass = this.selectedVehicleClass();
    this.restartRace(vehicleClass);
    this.rebuildRaceForCourse(seed);
    this.race.selectPlayerVehicle(vehicleClass);
    this.finishStartingGrid();
  }

  private rivalAudioTelemetry(): RivalAudioTelemetry[] {
    const player = this.playerState;
    const yaw = player.orientation.yaw;
    return this.race.state.entries.filter((entry) => !entry.isPlayer && entry.status !== 'finished')
      .map((entry) => {
        const dx = entry.vehicle.position.x - player.position.x;
        const dz = entry.vehicle.position.z - player.position.z;
        const distanceM = Math.max(0.01, Math.hypot(dx, dz));
        const closingSpeedMps = -((entry.vehicle.velocity.x - player.velocity.x) * dx
          + (entry.vehicle.velocity.z - player.velocity.z) * dz) / distanceM;
        return { id: entry.id, distanceM,
          pan: Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / distanceM)),
          closingSpeedMps, speedMps: entry.vehicle.telemetry.speed,
          vehicleId: entry.galactic?.vehicleClass ?? 'podracer' };
      }).sort((a, b) => a.distanceM - b.distanceM).slice(0, 4);
  }

  private moveVehicleSelection(direction: -1 | 1): void {
    const current = GALACTIC_VEHICLE_ORDER.indexOf(this.selectedVehicleClass());
    const next = (current + direction + GALACTIC_VEHICLE_ORDER.length)
      % GALACTIC_VEHICLE_ORDER.length;
    this.selectVehicle(GALACTIC_VEHICLE_ORDER[next] ?? 'podracer');
  }

  private selectVehicle(vehicleClass: GalacticVehicleClass): void {
    if (!this.awaitingRaceStart) return;
    const racerId = this.localRacerId();
    const event = this.race.selectRacerVehicle(racerId, vehicleClass);
    this.room.updateLocalVehicle(vehicleClass, this.workshopGarage.loadouts[vehicleClass]);
    this.nextHudFrame = 0;
    const racerIndex = this.race.state.entries.findIndex((entry) => entry.id === racerId);
    this.racerViews[racerIndex]?.setVehicleClass(vehicleClass);
    if (event) {
      this.audio.handleEvents([event], { playerId: racerId });
      this.cameraDirector.consumeEvents([event], { playerId: racerId });
    }
  }

  private beginRaceCountdown(): void {
    if (!this.awaitingRaceStart || !this.worldAssetsSettled) return;
    const lobby = this.room.lobby;
    if (lobby.role === 'guest' || (lobby.role === 'host' && !lobby.canStart)) return;
    if (lobby.role === 'host') {
      const start = this.room.startRace(this.nextCourseSeed());
      this.applyRaceStart(start);
      this.room.broadcastState(this.race.snapshot());
      return;
    }
    const event = this.mastery.selectedEvent;
    // Browsing only reserves route identity. Build its simulation and render
    // adapters once at launch, so map selection never blocks its animation.
    const seed = this.pendingSoloCourse?.eventId === event.id ? this.pendingSoloCourse.seed
      : event.id === 'open-expedition' ? this.currentCourseSeed : event.seed;
    this.rebuildRaceForCourse(seed);
    this.race.setTotalLaps(this.selectedLaps);
    this.finishStartingGrid();
  }

  private applyRaceStart(start: RoomRaceStart): void {
    this.selectedLaps = start.laps;
    this.selectedRaceMode = start.mode;
    this.selectedAIDifficulty = start.aiDifficulty;
    this.rebuildRaceForCourse(start.seed, start.workshopLoadouts);
    this.race.setTotalLaps(start.laps);
    this.race.setRaceMode(start.mode);
    this.race.setAIDifficulty(start.aiDifficulty);
    for (const [racerId, vehicleClass] of Object.entries(start.vehicleClasses)) {
      this.race.selectRacerVehicle(racerId, vehicleClass);
    }
    this.syncRacerVehicleViews();
    this.finishStartingGrid();
  }

  private finishStartingGrid(): void {
    this.awaitingRaceStart = false;
    this.lastLocalPlacement = null;
    this.race.lockPlayerVehicleSelection();
    if (!this.captureMode && this.room.lobby.role === 'solo') this.mastery.beginRun(this.masteryStartOptions());
    else this.mastery.cancelRun();
    this.accumulator = 0;
    this.nextHudFrame = 0;
    this.audio.transitionMenuMusicToRace();
    void this.audio.unlock();
  }

  private readonly handleRoomLobbyChange = (lobby: RoomLobbySnapshot): void => {
    if (lobby.role === 'solo') {
      if (this.fixedEventRules()) {
        this.selectedLaps = this.mastery.selectedEvent.laps;
        this.selectedRaceMode = this.mastery.selectedEvent.mode;
        this.selectedAIDifficulty = this.mastery.selectedEvent.difficulty;
      }
      this.nextHudFrame = 0;
      return;
    }
    this.mastery.cancelRun();
    this.pendingSoloCourse = null;
    this.selectedLaps = lobby.laps;
    this.selectedRaceMode = lobby.mode;
    this.selectedAIDifficulty = lobby.aiDifficulty;
    if (this.awaitingRaceStart) this.applyRoomLobbyChoicesToGrid(lobby);
    if (!this.awaitingRaceStart && lobby.role === 'guest' && lobby.status === 'error') {
      this.restartRace();
    }
    this.nextHudFrame = 0;
  };

  private applyRoomLobbyChoicesToGrid(lobby: RoomLobbySnapshot): void {
    if (this.race.state.phase !== 'countdown' || this.race.playerVehicleSelectionLocked) return;
    this.race.setTotalLaps(lobby.laps);
    this.race.setRaceMode(lobby.mode);
    this.race.setAIDifficulty(lobby.aiDifficulty);
    for (const member of lobby.members) {
      this.race.selectRacerVehicle(member.racerId, member.vehicleClass);
      const entry = this.race.state.entries.find((candidate) => candidate.id === member.racerId);
      if (entry) entry.name = member.name;
    }
  }

  private selectLapCount(laps: HudLapCount): void {
    if (this.fixedEventRules()) return;
    const lobby = this.room.lobby;
    if (lobby.role === 'guest' || lobby.status === 'connecting') return;
    this.selectedLaps = laps;
    this.race.setTotalLaps(laps);
    if (lobby.role === 'host') this.room.setLaps(laps);
    this.nextHudFrame = 0;
  }

  private selectRaceMode(mode: RaceMode): void {
    if (this.fixedEventRules()) return;
    const lobby = this.room.lobby;
    if (!this.awaitingRaceStart || lobby.role === 'guest' || lobby.status === 'connecting') return;
    this.selectedRaceMode = mode;
    this.race.setRaceMode(mode);
    if (lobby.role === 'host') this.room.setRaceMode(mode);
    this.nextHudFrame = 0;
  }

  private selectAIDifficulty(difficulty: AIDifficulty): void {
    if (this.fixedEventRules()) return;
    const lobby = this.room.lobby;
    if (!this.awaitingRaceStart || lobby.role === 'guest' || lobby.status === 'connecting') return;
    this.selectedAIDifficulty = difficulty;
    this.race.setAIDifficulty(difficulty);
    if (lobby.role === 'host') this.room.setAIDifficulty(difficulty);
    this.nextHudFrame = 0;
  }

  private readonly handleHudAction = (action: RaceHudAction): void => {
    switch (action.type) {
      case 'select-appearance':
        if (this.awaitingRaceStart && this.selectedVehicleClass() === 'podracer') {
          this.vehicleAppearance = action.appearance;
          saveVehicleAppearance(action.appearance);
          const index = this.race.state.entries.findIndex((entry) => entry.id === this.localRacerId());
          void this.racerViews[index]?.setAppearance(action.appearance);
          this.nextHudFrame = 0;
        }
        break;
      case 'retry-appearance':
        if (this.awaitingRaceStart) {
          const index = this.race.state.entries.findIndex((entry) => entry.id === this.localRacerId());
          void this.racerViews[index]?.retryAppearance();
          this.nextHudFrame = 0;
        }
        break;
      case 'start-race':
        this.beginRaceCountdown();
        break;
      case 'retry-race':
        if (this.room.lobby.role === 'solo') this.retryMasteryEvent();
        else { if (this.room.lobby.role === 'host') this.room.returnToLobby(); this.restartRace(); }
        break;
      case 'return-to-garage':
        if (this.room.lobby.role === 'host') this.room.returnToLobby();
        this.restartRace();
        if (this.room.lobby.role === 'solo' && this.mastery.selectedEvent.id === 'open-expedition') {
          this.reserveSoloCourse();
        }
        break;
      case 'select-event':
        this.selectMasteryEvent(action.eventId);
        break;
      case 'next-event': {
        const next = this.mastery.result?.nextEventId;
        if (next) this.selectMasteryEvent(next);
        break;
      }
      case 'save-course':
        if (this.room.lobby.role === 'solo') this.mastery.saveCourse(
          this.pendingSoloCourse?.eventId === this.mastery.selectedEvent.id ? this.pendingSoloCourse.seed : this.currentCourseSeed);
        this.nextHudFrame = 0;
        break;
      case 'toggle-ghost':
        this.mastery.toggleGhost();
        this.nextHudFrame = 0;
        break;
      case 'restart-championship':
        if (this.room.lobby.role === 'solo') this.selectMasteryEvent(this.mastery.restartChampionship().id, true);
        break;
      case 'select-ai-difficulty':
        this.selectAIDifficulty(action.difficulty);
        break;
      case 'select-race-mode':
        this.selectRaceMode(action.mode);
        break;
      case 'view-highlight':
        this.startHighlightReplay(action.highlightId);
        break;
      case 'toggle-workshop':
        if (this.awaitingRaceStart && !this.fixedEventRules()) this.workshopOpen = action.open;
        this.nextHudFrame = 0;
        break;
      case 'select-workshop-slot':
        this.workshopSlot = action.slot;
        this.nextHudFrame = 0;
        break;
      case 'equip-workshop-part':
        this.equipWorkshopPart(action.slot, action.partId);
        break;
      case 'toggle-settings':
        this.settingsOpen = action.open;
        if (!action.open && this.settingsCapture) this.finishInputRemapCapture();
        this.nextHudFrame = 0;
        break;
      case 'select-settings-tab':
        this.settingsTab = action.tab;
        this.nextHudFrame = 0;
        break;
      case 'change-setting':
        this.changeGameSetting(action.setting, action.value);
        break;
      case 'request-remap':
        this.beginInputRemapCapture(action.action, action.device);
        break;
      case 'resume-race':
        if (this.settingsCapture) this.finishInputRemapCapture();
        this.paused = false;
        this.settingsOpen = false;
        this.hud.setPaused(false);
        this.audio.setPaused(false);
        this.nextHudFrame = 0;
        break;
      default:
        break;
    }
  };

  private equipWorkshopPart(slot: HudWorkshopSlot, partId: string): void {
    if (!this.awaitingRaceStart || this.fixedEventRules()) return;
    const part = WORKSHOP_PARTS[partId as WorkshopPartId];
    if (!part || part.slot !== slot) return;
    const vehicleClass = this.selectedVehicleClass();
    const current = this.workshopGarage.loadouts[vehicleClass];
    this.workshopGarage = withWorkshopLoadout(this.workshopGarage, vehicleClass, {
      ...current,
      slots: { ...current.slots, [slot]: part.id },
    });
    saveWorkshopGarage(this.workshopGarage);
    this.room.updateLocalWorkshop(this.workshopGarage.loadouts[vehicleClass]);
    this.audio.trigger({ kind: 'upgrade', intensity: 0.48 });
    this.nextHudFrame = 0;
  }

  /**
   * Starts an exclusive input-listening window. Both live adapters are muted
   * while listening so the key/button being assigned can never steer, fire or
   * pause the race underneath the settings overlay.
   */
  private beginInputRemapCapture(action: string, device: 'keyboard' | 'gamepad'): void {
    const valid = device === 'keyboard'
      ? KEYBOARD_BINDING_ACTIONS.includes(action as KeyboardBindingAction)
      : GAMEPAD_BINDING_ACTIONS.includes(action as GamepadBindingAction);
    if (!valid) return;
    this.settingsCapture = { action, device };
    this.settingsCaptureArmedAt = performance.now() + 180;
    this.settingsCaptureGamepadNeutral = false;
    this.keyboardInput.enabled = false;
    this.gamepadInput.enabled = false;
    this.nextHudFrame = 0;
  }

  private finishInputRemapCapture(): void {
    this.settingsCapture = null;
    this.settingsCaptureArmedAt = 0;
    this.settingsCaptureGamepadNeutral = false;
    const gameplayEnabled = !this.captureMode;
    this.keyboardInput.enabled = gameplayEnabled;
    this.gamepadInput.enabled = gameplayEnabled;
    this.nextHudFrame = 0;
  }

  private commitKeyboardRemap(code: string): void {
    const capture = this.settingsCapture;
    if (!capture || capture.device !== 'keyboard'
      || !KEYBOARD_BINDING_ACTIONS.includes(capture.action as KeyboardBindingAction)) return;
    const action = capture.action as KeyboardBindingAction;
    this.applyGameSettings({
      ...this.settings,
      keyboardBindings: {
        ...this.settings.keyboardBindings,
        [action]: [code],
      },
    });
    this.finishInputRemapCapture();
  }

  private commitGamepadRemap(binding: GamepadControlBinding): void {
    const capture = this.settingsCapture;
    if (!capture || capture.device !== 'gamepad'
      || !GAMEPAD_BINDING_ACTIONS.includes(capture.action as GamepadBindingAction)) return;
    const action = capture.action as GamepadBindingAction;
    this.applyGameSettings({
      ...this.settings,
      gamepadBindings: {
        ...this.settings.gamepadBindings,
        [action]: [binding],
      },
    });
    this.finishInputRemapCapture();
  }

  /** Polls the browser's standard Gamepad API after a neutral-release gate. */
  private pollGamepadRemapCapture(): void {
    const capture = this.settingsCapture;
    if (!capture || capture.device !== 'gamepad' || performance.now() < this.settingsCaptureArmedAt) {
      return;
    }
    let pads: readonly (Gamepad | null)[];
    try {
      pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    } catch {
      return;
    }
    const pad = pads.find((candidate) => candidate?.connected !== false) ?? null;
    if (!pad) return;
    const pressedButton = pad.buttons.findIndex((button) => button.pressed || button.value >= 0.72);
    let strongestAxisIndex = -1;
    let strongestAxis = 0;
    for (let index = 0; index < pad.axes.length; index += 1) {
      const value = pad.axes[index] ?? 0;
      if (Math.abs(value) > Math.abs(strongestAxis)) {
        strongestAxis = value;
        strongestAxisIndex = index;
      }
    }
    if (!this.settingsCaptureGamepadNeutral) {
      if (pressedButton < 0 && Math.abs(strongestAxis) < 0.34) {
        this.settingsCaptureGamepadNeutral = true;
      }
      return;
    }
    if (pressedButton >= 0) {
      this.commitGamepadRemap({ type: 'button', index: pressedButton });
      return;
    }
    if (strongestAxisIndex < 0 || Math.abs(strongestAxis) < 0.68) return;
    const action = capture.action as GamepadBindingAction;
    if (action === 'steer') {
      this.commitGamepadRemap({
        type: 'axis',
        index: strongestAxisIndex,
        mode: 'signed',
        // Capturing with a rightward stick movement establishes the game's
        // positive-screen-right / negative-simulation-yaw handedness.
        scale: strongestAxis > 0 ? -1 : 1,
      });
      return;
    }
    this.commitGamepadRemap({
      type: 'axis',
      index: strongestAxisIndex,
      mode: strongestAxis > 0 ? 'positive' : 'negative',
      scale: 1,
      threshold: 0.5,
    });
  }

  private changeGameSetting(path: string, value: number | boolean | string): void {
    const [group, key, extra] = path.split('.');
    if (extra || !key) return;
    if (group === 'comfort' && key in this.settings.comfort) {
      this.applyGameSettings({
        ...this.settings,
        comfort: { ...this.settings.comfort, [key]: value },
      });
    } else if (group === 'audio' && key in this.settings.audio) {
      this.applyGameSettings({
        ...this.settings,
        audio: { ...this.settings.audio, [key]: value },
      });
    } else if (group === 'controls' && key in this.settings.controls) {
      this.applyGameSettings({
        ...this.settings,
        controls: { ...this.settings.controls, [key]: value },
      });
    }
  }

  /**
   * Projects authoritative combat/world state into at most four glanceable
   * screen-edge warnings. Bearing is relative to the local craft, so network
   * guests and the host read the same threat even from different cameras.
   */
  private createThreatCues(): readonly HudThreatCueViewModel[] {
    if (this.awaitingRaceStart || this.race.state.phase !== 'racing') return [];
    const localId = this.localRacerId();
    const local = this.race.state.entries.find((entry) => entry.id === localId)
      ?? this.race.state.entries.find((entry) => entry.isPlayer);
    if (!local) return [];
    const origin = local.vehicle.position;
    const yaw = local.vehicle.orientation.yaw;
    const cues: HudThreatCueViewModel[] = [];
    const addCue = (
      id: string,
      label: string,
      x: number,
      z: number,
      urgency: number,
      kind: HudThreatCueViewModel['kind'],
    ): void => {
      const dx = x - origin.x;
      const dz = z - origin.z;
      const relative = Math.atan2(dx, dz) - yaw;
      cues.push({
        id,
        label,
        bearingDegrees: ((relative * 180 / Math.PI + 540) % 360) - 180,
        urgency: Math.min(1, Math.max(0, urgency)),
        kind,
      });
    };

    for (const projectile of this.race.state.galacticWorld.projectiles) {
      if (projectile.ownerId === localId) continue;
      const dx = origin.x - projectile.position.x;
      const dz = origin.z - projectile.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 280) continue;
      const velocityLength = Math.max(1, Math.hypot(projectile.velocity.x, projectile.velocity.z));
      const closing = (dx * projectile.velocity.x + dz * projectile.velocity.z)
        / Math.max(1, distance * velocityLength);
      if (closing < 0.18) continue;
      addCue(
        projectile.id,
        'INCOMING LANCE',
        projectile.position.x,
        projectile.position.z,
        (1 - distance / 280) * 0.72 + Math.max(0, closing) * 0.36,
        'weapon',
      );
    }

    for (const mine of this.race.state.galacticWorld.mines) {
      if (mine.ownerId === localId || mine.armTime > 0) continue;
      const distance = Math.hypot(mine.position.x - origin.x, mine.position.z - origin.z);
      if (distance > 150) continue;
      addCue(
        mine.id,
        'SCRAP MINE',
        mine.position.x,
        mine.position.z,
        1 - distance / 170,
        'hazard',
      );
    }

    for (const hazard of this.race.state.galacticWorld.hazards) {
      const sample = this.race.course.sampleAtProgress(hazard.progress);
      const x = sample.x + sample.rightX * hazard.lateralOffset;
      const z = sample.z + sample.rightZ * hazard.lateralOffset;
      const distance = Math.hypot(x - origin.x, z - origin.z);
      if (distance > 230) continue;
      addCue(
        hazard.id,
        hazard.kind.replaceAll('-', ' ').toUpperCase(),
        x,
        z,
        1 - distance / 260,
        'hazard',
      );
    }

    for (const rival of this.race.state.entries) {
      if (rival.id === localId || rival.status !== 'racing') continue;
      const dx = rival.vehicle.position.x - origin.x;
      const dz = rival.vehicle.position.z - origin.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 52) continue;
      const relativeVelocityX = rival.vehicle.velocity.x - local.vehicle.velocity.x;
      const relativeVelocityZ = rival.vehicle.velocity.z - local.vehicle.velocity.z;
      const closingSpeed = distance > 0.01
        ? -(dx * relativeVelocityX + dz * relativeVelocityZ) / distance
        : 20;
      if (distance > 30 && closingSpeed < 5) continue;
      addCue(
        `rival-${rival.id}`,
        closingSpeed > 8 ? 'IMPACT VECTOR' : rival.name.toUpperCase(),
        rival.vehicle.position.x,
        rival.vehicle.position.z,
        (1 - distance / 58) * 0.7 + Math.min(0.35, Math.max(0, closingSpeed) / 45),
        closingSpeed > 8 ? 'impact' : 'rival',
      );
    }

    return cues
      .sort((left, right) => right.urgency - left.urgency || left.id.localeCompare(right.id))
      .slice(0, 4);
  }

  private getResultsPresentation(): HudResultsPresentationViewModel {
    if (this.resultsPresentation) return this.resultsPresentation;
    this.highlightPackage = this.highlights.snapshot(this.race.state.entries);
    const names = new Map(this.race.state.entries.map((entry) => [entry.id, entry.name]));
    const localId = this.localRacerId();
    const mapKind = (
      kind: RaceHighlightPackage['moments'][number]['kind'],
    ): HudResultHighlightViewModel['kind'] => {
      if (kind === 'photo-finish') return 'photo-finish';
      if (kind === 'takedown' || kind === 'wreck') return 'takedown';
      if (kind === 'overtake' || kind === 'slingshot') return 'comeback';
      return 'clean-race';
    };
    const highlights = this.highlightPackage.moments.slice(0, 5).map((moment) => {
      const racer = moment.racerId ? names.get(moment.racerId) : null;
      const other = moment.otherRacerId ? names.get(moment.otherRacerId) : null;
      const participants = [racer, other].filter((name): name is string => Boolean(name));
      return {
        id: moment.id,
        title: moment.label,
        detail: participants.length > 0 ? participants.join(' // ') : 'Race director highlight',
        kind: mapKind(moment.kind),
        time: moment.raceTime ?? moment.time,
      } satisfies HudResultHighlightViewModel;
    });
    const photo = this.highlightPackage.moments.find((moment) => moment.kind === 'photo-finish');
    const playerWonPhoto = photo?.racerId === localId;
    const photoRivalId = playerWonPhoto ? photo?.otherRacerId : photo?.racerId;
    this.resultsPresentation = {
      headline: photo ? 'BY A POD’S NOSE' : highlights[0]?.title ?? 'RACE CLASSIFIED',
      photoFinish: photo && this.highlightPackage.photoFinishGap !== null
        ? {
            rivalName: names.get(photoRivalId ?? '') ?? 'the nearest rival',
            gapSeconds: this.highlightPackage.photoFinishGap,
            won: playerWonPhoto,
          }
        : undefined,
      highlights,
    };
    return this.resultsPresentation;
  }

  private startHighlightReplay(highlightId: string): void {
    // Resolve through the bounded authoritative package; stale DOM actions can
    // never steer the results camera or access an out-of-range frame.
    const moment = this.highlightPackage?.moments.find((candidate) => candidate.id === highlightId);
    const frames = this.highlightPackage?.frames;
    if (!moment || !frames || frames.length === 0) return;
    const startIndex = Math.max(0, Math.min(frames.length - 1, moment.frameIndex - 15));
    const endIndex = Math.max(startIndex, Math.min(frames.length - 1, moment.frameIndex + 18));
    // Long-range takedowns are visually clearest at the point of impact. The
    // attacker remains named in the replay banner, while the cinematic camera
    // follows the victim instead of presenting a distant projectile origin.
    const focusVictim = moment.kind === 'takedown' && moment.otherRacerId
      ? moment.otherRacerId
      : null;
    const focusRacerId = focusVictim
      ?? moment.racerId
      ?? moment.otherRacerId
      ?? this.localRacerId();
    this.highlightReplay = {
      momentId: moment.id,
      kind: moment.kind,
      startIndex,
      endIndex,
      focusRacerId,
      focusOtherRacerId: focusVictim
        ? moment.racerId ?? undefined
        : moment.otherRacerId ?? undefined,
      startedAt: performance.now(),
      durationMs: 3_400,
      impactEmitted: false,
    };
    const racerNames = new Map(
      this.race.state.entries.map((entry) => [entry.id, entry.name]),
    );
    const focusName = moment.racerId ? racerNames.get(moment.racerId) : null;
    const otherName = moment.otherRacerId ? racerNames.get(moment.otherRacerId) : null;
    const participants = [focusName, otherName]
      .filter((name): name is string => Boolean(name));
    this.hud.root.dataset.highlightTitle = participants.length > 0
      ? `${moment.label} · ${participants.join(' // ')}`
      : moment.label;
    this.hud.root.dataset.highlightReplay = 'true';
    this.cameraRig.setHighlightFraming(true);
    this.cameraDirector.setManualMode('side');
    const startFrame = frames[startIndex];
    if (startFrame) {
      this.syncHighlightCameraSubject(startFrame);
      this.cameraRig.snap(this.subject);
    }
    this.cameraRig.impulse(0.12);
  }

  private resolveHighlightReplayFrame(): {
    frame: RaceHighlightFrame;
    elapsedSeconds: number;
  } | null {
    const replay = this.highlightReplay;
    const frames = this.highlightPackage?.frames;
    if (!replay || !frames || frames.length === 0) return null;
    const elapsedMs = Math.max(0, performance.now() - replay.startedAt);
    if (elapsedMs >= replay.durationMs) {
      this.highlightReplay = null;
      this.hud.root.dataset.highlightReplay = 'false';
      delete this.hud.root.dataset.highlightTitle;
      this.cameraRig.setHighlightFraming(false);
      this.cameraDirector.setManualMode(null);
      this.syncCameraSubject();
      this.cameraRig.snap(this.subject);
      return null;
    }
    // Ease past the action beat: the first and final thirds move normally,
    // while the middle lingers for an anime-style photo-finish read.
    const normalized = elapsedMs / replay.durationMs;
    const eased = normalized < 0.42
      ? normalized * 0.86
      : normalized < 0.68
        ? 0.3612 + (normalized - 0.42) * 0.42
        : 0.4704 + (normalized - 0.68) * 1.655;
    const frameIndex = Math.min(
      replay.endIndex,
      Math.max(replay.startIndex, Math.round(
        replay.startIndex + (replay.endIndex - replay.startIndex) * Math.min(1, eased),
      )),
    );
    const frame = frames[frameIndex];
    return frame ? { frame, elapsedSeconds: elapsedMs / 1000 } : null;
  }

  /**
   * Replays keep authoritative race state immutable, but the decisive beat
   * still needs authored presentation. Emit one pooled energy burst and a
   * sand kick at the recorded victim pose, then let the regular effect pools
   * age it out. This is presentation-only and cannot affect damage or results.
   */
  private emitHighlightReplayImpact(
    frame: RaceHighlightFrame,
    elapsedSeconds: number,
    presentationTime: number,
  ): void {
    const replay = this.highlightReplay;
    if (
      !replay
      || replay.kind !== 'takedown'
      || replay.impactEmitted
      || elapsedSeconds < 2.04
    ) return;
    const victim = frame.racers.find((candidate) => candidate.id === replay.focusRacerId);
    if (!victim) return;
    replay.impactEmitted = true;
    const forwardX = Math.sin(victim.yaw);
    const forwardZ = Math.cos(victim.yaw);
    const groundY = this.race.terrain.heightAt(victim.x, victim.z);
    this.galacticEffects.emitCrash({
      type: 'crash',
      time: presentationTime,
      position: { x: victim.x, y: victim.y + 1.1, z: victim.z },
      velocity: {
        x: forwardX * victim.speed * 0.45,
        y: 3.8,
        z: forwardZ * victim.speed * 0.45,
      },
      groundY,
      // Energy plates scale from this value. A restrained replay-only burst
      // preserves the flash/debris silhouette while keeping the victim and
      // point of impact readable through the full linger beat.
      severity: 1.1,
      color: '#ff714c',
      style: 'energy',
    });
    this.dust.emitSpray(
      victim.x,
      groundY + 0.35,
      victim.z,
      -forwardX,
      -forwardZ,
      1.45,
      22,
    );
    this.cameraRig.impulse(0.48);
  }

  private syncHighlightCameraSubject(frame: RaceHighlightFrame): void {
    const focusId = this.highlightReplay?.focusRacerId ?? this.localRacerId();
    const pose = frame.racers.find((candidate) => candidate.id === focusId)
      ?? frame.racers.find((candidate) => candidate.id === this.localRacerId())
      ?? frame.racers[0];
    if (!pose) return;
    const candidateOtherPose = this.highlightReplay?.focusOtherRacerId
      ? frame.racers.find((candidate) => candidate.id === this.highlightReplay?.focusOtherRacerId)
      : undefined;
    // A projectile takedown can legitimately happen from far down-course.
    // Framing the arithmetic midpoint of racers separated by a hundred metres
    // produces an empty establishing shot, not a highlight. Keep paired
    // framing for close overtakes/contact, and cut to the focus actor alone for
    // long-range events so at least the decisive machine remains hero scale.
    const pairSeparation = candidateOtherPose
      ? Math.hypot(candidateOtherPose.x - pose.x, candidateOtherPose.z - pose.z)
      : Number.POSITIVE_INFINITY;
    const otherPose = pairSeparation <= 44 ? candidateOtherPose : undefined;
    const forwardX = Math.sin(pose.yaw);
    const forwardZ = Math.cos(pose.yaw);
    this.subject.position.set(
      otherPose ? (pose.x + otherPose.x) * 0.5 : pose.x,
      otherPose ? (pose.y + otherPose.y) * 0.5 : pose.y,
      otherPose ? (pose.z + otherPose.z) * 0.5 : pose.z,
    );
    this.subject.forward.set(forwardX, 0, forwardZ).normalize();
    const framedSpeed = otherPose ? (pose.speed + otherPose.speed) * 0.5 : pose.speed;
    this.subject.velocity.set(forwardX * framedSpeed, 0, forwardZ * framedSpeed);
    this.subject.speed = framedSpeed;
  }

  private createOnlineRoom(): void {
    if (this.room.lobby.role !== 'solo') return;
    void this.room.createRoom({
      name: 'Host',
      vehicleClass: this.selectedVehicleClass(),
      workshopLoadout: this.workshopGarage.loadouts[this.selectedVehicleClass()],
    }, this.selectedLaps).then(() => {
      this.room.setRaceMode(this.selectedRaceMode);
      this.room.setAIDifficulty(this.selectedAIDifficulty);
    }).catch(() => undefined);
  }

  private joinRoomFromHud(): void {
    if (this.room.lobby.role !== 'solo') return;
    const input = this.hud.root.querySelector<HTMLInputElement>('[data-hud="room-code-input"]');
    const code = input?.value ?? '';
    void this.room.joinRoom(code, {
      name: this.multiplayerCallsign,
      vehicleClass: this.selectedVehicleClass(),
      workshopLoadout: this.workshopGarage.loadouts[this.selectedVehicleClass()],
    }).catch(() => undefined);
  }

  private copyRoomCode(): void {
    const code = this.room.lobby.code;
    if (code.length !== 6 || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      this.roomCopiedUntil = performance.now() + 1_600;
      this.nextHudFrame = 0;
      window.setTimeout(() => {
        this.nextHudFrame = 0;
      }, 1_650);
    }).catch(() => undefined);
  }

  private leaveOnlineRoom(): void {
    const vehicleClass = this.selectedVehicleClass();
    this.room.leave();
    this.restartRace(vehicleClass);
    this.reserveSoloCourse();
  }

  private consumeRoomControlSignals(): void {
    if (this.room.lobby.role !== 'guest') return;
    if (this.room.consumeReturnToLobby()) {
      this.restartRace();
      return;
    }
    const start = this.room.consumeStart();
    if (start && this.awaitingRaceStart) this.applyRaceStart(start);
  }

  private applyGuestAuthoritativeState(
    snapshot: ReturnType<RaceSimulation['snapshot']>,
    localInput: PlayerInputState,
    authoritativeEvents: readonly RoomAuthoritativeEventEnvelope[],
  ): void {
    const localRacerId = this.room.lobby.localRacerId;
    if (!localRacerId) return;
    // Reliable room packets are ordered, but a delayed frame from the previous
    // rematch must never be projected against the newly generated spline.
    if (snapshot.seed !== this.race.state.seed || snapshot.seed !== this.currentCourseSeed) return;
    this.race.restoreAuthoritativeSnapshot(snapshot, localRacerId);
    this.simulationFrame = snapshot.step;
    this.selectedLaps = snapshot.totalLaps as HudLapCount;
    this.selectedRaceMode = snapshot.settings.mode;
    this.selectedAIDifficulty = snapshot.settings.aiDifficulty;
    this.networkSnapshotAge = 0;
    const inferredInputs: Record<string, PlayerInputState> = {};
    for (const entry of this.race.state.entries) {
      inferredInputs[entry.id] = entry.id === localRacerId
        ? localInput
        : normalizePlayerInput({
            throttle: entry.vehicle.telemetry.normalizedSpeed > 0.08 ? 0.86 : 0,
            steer: Math.max(-1, Math.min(1, -entry.vehicle.orientation.bank * 1.8)),
            boost: entry.vehicle.boost.active,
          });
    }
    this.lastRaceInputs = inferredInputs;
    const time = snapshot.step * FIXED_DT;
    this.highlights.recordFrame(time, this.race.state.entries);
    for (const envelope of authoritativeEvents) {
      this.highlights.consumeEvents(envelope.step * FIXED_DT, [envelope.event], Math.max(0, snapshot.raceTime - (snapshot.step - envelope.step) * FIXED_DT));
    }
    // RoomSession already returns each sequence once. Guests consume the same
    // semantic presentation events while their simulation remains host-owned.
    const galacticEvents = authoritativeEvents.map((envelope) => envelope.event as GalacticEvent);
    this.combatPresentation.consume(authoritativeEvents.map((envelope) => ({
      id: `room:${envelope.sequence}`, event: envelope.event as GalacticEvent,
    })), performance.now(), this.combatContext());
    this.consumeGalacticEffects(galacticEvents, time, authoritativeEvents.map(envelope => envelope.step));
    this.audio.handleEvents(authoritativeEvents.map((envelope) => envelope.event), { playerId: localRacerId });
    this.cameraDirector.consumeEvents(authoritativeEvents.map((envelope) => envelope.event), { playerId: localRacerId });
    for (let index = 0; index < this.race.state.entries.length; index += 1) {
      const entry = this.race.state.entries[index];
      if (entry) this.pushRacerWake(index, entry.vehicle, time);
    }
    this.syncCameraSubject();
    this.nextHudFrame = 0;
  }

  private hudLobbyViewModel(): HudLobbyViewModel {
    const lobby = this.room.lobby;
    if (lobby.role === 'solo') {
      return {
        role: 'solo',
        roomCode: '',
        status: 'idle',
        statusText: 'Solo race ready',
        members: [{ id: 'player', name: 'You', isHost: true, isLocal: true }],
        capacity: lobby.capacity,
        canStart: true,
      };
    }
    const copied = this.roomCopiedUntil > performance.now();
    const statusText = copied
      ? 'Room code copied'
      : lobby.status === 'connecting'
        ? 'Connecting through hyperspace…'
        : lobby.status === 'error'
          ? lobby.error ?? 'Room connection failed'
          : lobby.role === 'host'
            ? `${lobby.members.length} racer${lobby.members.length === 1 ? '' : 's'} ready · You host`
            : 'Connected · Host controls laps and start';
    return {
      role: lobby.role,
      roomCode: lobby.code,
      status: lobby.status,
      statusText,
      members: lobby.members.map((member) => ({
        id: member.racerId,
        name: member.racerId === lobby.localRacerId ? 'You' : member.name,
        isHost: member.isHost,
        isLocal: member.racerId === lobby.localRacerId,
      })),
      capacity: lobby.capacity,
      canStart: lobby.canStart,
    };
  }

  private loadMultiplayerCallsign(): string {
    const fallback = `Pilot ${100 + Math.floor(Math.random() * 900)}`;
    try {
      const key = 'podracing-multiplayer-callsign';
      const stored = window.sessionStorage.getItem(key);
      if (stored) return stored;
      window.sessionStorage.setItem(key, fallback);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
    return fallback;
  }

  private setPreset(name: CapturePreset): void {
    this.mastery.cancelRun();
    if (this.race.competitionProfile !== 'chaos') this.rebuildRaceForCourse(this.currentCourseSeed, {}, 'chaos');
    this.preset = name;
    this.reviewScenario = name;
    this.reviewInput = null;
    this.setReviewCameraFocus();
    this.recentGalacticEvents.length = 0;
    this.simulationFrame = 0;
    this.accumulator = 0;
    this.applyPresetMoment(name);
    // A diagnostic preset is an explicitly requested game moment, never the
    // passive first-load registry. This also keeps live keyboard smoke tests
    // from being intercepted by the boot gate.
    this.awaitingRaceStart = false;
    this.race.lockPlayerVehicleSelection();
    this.cameraRig.snap(this.subject);
    this.render(FIXED_DT);
  }

  private setCamera(name: CaptureCamera): void {
    this.cancelCombatCut();
    this.cameraMode = name;
    this.reviewCameraMode = name;
    // The extreme review-only course lens exposes articulation differences
    // between the one-draw racer MRT proxy and its animated beauty meshes as
    // detached ground contours. Gameplay cameras retain the complete MRT +
    // Sobel stack; the overhead audit view uses hull ink without that proxy.
    this.post.setEnabled(name !== 'course');
    this.cameraDirector.setManualMode(name);
    this.cameraRig.snap(this.subject);
    this.render(FIXED_DT);
  }

  private setReviewScenario(name: ReviewCapturePreset): void {
    if (!this.captureMode) {
      throw new Error('Expansion review scenarios are capture-mode only.');
    }
    const legacy = ['desert', 'countdown', 'race', 'airtime', 'drift', 'finish'] as const;
    if ((legacy as readonly string[]).includes(name)) {
      this.setPreset(name as CapturePreset);
      return;
    }
    this.mastery.cancelRun();
    if (this.race.competitionProfile !== 'chaos') this.rebuildRaceForCourse(this.currentCourseSeed, {}, 'chaos');
    this.reviewScenario = name;
    this.simulationFrame = 0;
    this.accumulator = 0;
    this.recentGalacticEvents.length = 0;
    this.applyExpansionScenario(name as ExpansionCapturePreset);
    this.syncCameraSubject();
    this.cameraRig.snap(this.subject);
    this.render(FIXED_DT);
  }

  private setReviewCamera(name: ReviewCaptureCamera): void {
    const mapped: CaptureCamera = name === 'overhead'
      ? 'course'
      : name === 'impact'
        ? 'side'
        : name;
    this.setCamera(mapped);
    this.reviewCameraMode = name;
  }

  private setReviewInput(input: Partial<PlayerInputState>): void {
    if (!this.captureMode) throw new Error('Review input injection is capture-mode only.');
    this.reviewInput = normalizePlayerInput(input);
  }

  private placeReviewRacer(
    racerIndex: number,
    progress: number,
    lane: number,
    damage = 0.04,
    motion: PodracerCapturePreset = 'race',
  ): void {
    const entry = this.race.state.entries[racerIndex];
    if (!entry) return;
    const wrapped = ((progress % 1) + 1) % 1;
    const course = this.race.course.sampleAtProgress(wrapped);
    setPodracerRespawnPose(entry.vehicle, {
      x: course.x + course.rightX * lane,
      z: course.z + course.rightZ * lane,
      y: null,
      yaw: Math.atan2(course.tangentX, course.tangentZ),
    });
    applyPodracerCapturePreset(entry.vehicle, motion, this.terrainAdapter);
    entry.vehicle.damage = damage;
    entry.status = 'racing';
    entry.progress.courseProgress = wrapped;
    entry.progress.previousProgress = wrapped;
    entry.progress.unwrappedProgress = wrapped;
    entry.progress.completedLaps = 0;
    entry.progress.currentLap = 1;
    entry.progress.lateralOffset = lane;
    entry.progress.cornerPreview = this.race.course.getCornerPreview(wrapped);
    entry.progress.finishTime = null;
    // Review teleports must advance the ordered checkpoint cursor too. Leaving
    // it at the reset value makes the AI watchdog interpret every staged rival
    // as having skipped the first gate and snap all of them onto one recovery
    // pose on the very next deterministic tick.
    const checkpoints = this.race.course.checkpoints;
    if (checkpoints.length > 0) {
      let nextCheckpointIndex = 0;
      let shortestForwardArc = Number.POSITIVE_INFINITY;
      for (const checkpoint of checkpoints) {
        const forwardArc = ((checkpoint.progress - wrapped) % 1 + 1) % 1;
        if (forwardArc > 1e-6 && forwardArc < shortestForwardArc) {
          shortestForwardArc = forwardArc;
          nextCheckpointIndex = checkpoint.index;
        }
      }
      entry.progress.nextCheckpointIndex = nextCheckpointIndex;
      entry.progress.lastCheckpointIndex = (
        nextCheckpointIndex - 1 + checkpoints.length
      ) % checkpoints.length;
    }
  }

  private reviewProgress(progress: number, forwardMetres: number): number {
    return progress + forwardMetres / this.race.course.totalLength;
  }

  private reviewWorldPosition(
    progress: number,
    lane: number,
    height = 0.45,
  ): { x: number; y: number; z: number } {
    const course = this.race.course.sampleAtProgress(progress);
    const x = course.x + course.rightX * lane;
    const z = course.z + course.rightZ * lane;
    return { x, y: this.terrain.sampleHeight(x, z) + height, z };
  }

  private setReviewCameraFocus(forward = 0, right = 0, height = 0): void {
    this.reviewCameraForwardOffset = forward;
    this.reviewCameraRightOffset = right;
    this.reviewCameraHeightOffset = height;
  }

  /**
   * Review tableaux must prove one authored interaction, not whichever combat
   * choice the AI happens to make on the next deterministic tick. Keep rivals
   * physically alive and moving while suppressing unrelated weapons, mines,
   * shields and redline shells for the few frames used by the capture harness.
   */
  private quietReviewOpponents(): void {
    for (let index = 1; index < this.race.state.entries.length; index += 1) {
      const rival = this.race.state.entries[index]?.galactic;
      if (!rival) continue;
      rival.weapon.cooldown = 60;
      rival.weapon.triggerHeld = false;
      rival.mine.cooldown = 60;
      rival.mine.charges = 0;
      rival.shield.active = false;
      rival.shield.remaining = 0;
      rival.shield.cooldown = 60;
      rival.redline.active = false;
      rival.redline.heat = 0.08;
      rival.redline.peakHeat = 0.08;
      rival.redline.lockout = 60;
      rival.controls.fireHeld = false;
      rival.controls.shieldHeld = false;
    }
  }

  /**
   * Seeds the impact end of a Heat Lance shot immediately behind a target.
   * The normal input path still emits the player-origin projectile on tick
   * one; this second, collinear projectile strikes on that same tick. A single
   * captured frame can therefore show origin, in-flight tracer and target hit
   * while receipts prove that both simulation events really occurred.
   */
  private stageReviewHeatLanceImpact(ownerIndex: number, targetIndex: number): void {
    const owner = this.race.state.entries[ownerIndex];
    const target = this.race.state.entries[targetIndex];
    if (!owner || !target) return;
    const yaw = target.vehicle.orientation.yaw;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const x = target.vehicle.position.x - forwardX * 3.8;
    const z = target.vehicle.position.z - forwardZ * 3.8;
    this.race.state.galacticWorld.projectiles.push({
      id: `review-impact-lance-${owner.id}-${target.id}`,
      ownerId: owner.id,
      position: { x, y: target.vehicle.position.y + 0.55, z },
      previousPosition: {
        x: x - forwardX * 5,
        y: target.vehicle.position.y + 0.55,
        z: z - forwardZ * 5,
      },
      velocity: { x: forwardX * 320, y: 0, z: forwardZ * 320 },
      remaining: 1.2,
      radius: 1.15,
      damage: 0.12,
      heat: 0.13,
    });
  }

  private applyExpansionScenario(name: ExpansionCapturePreset): void {
    const base: CapturePreset = 'race';
    this.preset = base;
    this.applyPresetMoment(base);
    this.reviewScenario = name;
    this.reviewInput = normalizePlayerInput();
    this.setReviewCameraFocus();
    this.galacticEffects.clearEffects();
    this.wreckGroundContacts.clear();
    const player = this.race.state.entries.find((entry) => entry.isPlayer);
    const galactic = player?.galactic;
    if (!player || !galactic) return;
    this.race.state.galacticWorld.projectiles.length = 0;
    this.race.state.galacticWorld.mines.length = 0;
    this.quietReviewOpponents();

    switch (name) {
      case 'vehicle-showcase': {
        // Keep the grid motionless and order the authored classes from the
        // needle-like bike through the wide twin-engine pod. Two offset rows
        // prove the shipping eight-craft field without overlapping silhouettes.
        const progress = 0.304;
        const lanesByRacer = [-42, -14, 14, 42, -42, -14, 14, 42] as const;
        for (let index = 0; index < lanesByRacer.length; index += 1) {
          const entry = this.race.state.entries[index];
          const showcaseClass = GALACTIC_VEHICLE_ORDER[index % GALACTIC_VEHICLE_ORDER.length];
          if (entry?.galactic && showcaseClass) entry.galactic.vehicleClass = showcaseClass;
          const rowProgress = index < 4 ? progress : this.reviewProgress(progress, -34);
          this.placeReviewRacer(index, rowProgress, lanesByRacer[index] ?? 0, 0.02, 'start');
        }
        this.setReviewCameraFocus(-17, 0, 3);
        break;
      }
      case 'weapon-fired': {
        const progress = 0.318;
        // Keep the shot clear of the mint centre-line so its orange/white
        // silhouette and forward direction are visually unambiguous.
        this.placeReviewRacer(0, progress, -9);
        this.placeReviewRacer(1, this.reviewProgress(progress, 30), -9, 0.14);
        this.placeReviewRacer(2, this.reviewProgress(progress, -62), -12, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -86), 12, 0.08);
        this.setReviewCameraFocus(-5);
        galactic.weapon.cooldown = 0;
        galactic.mine.charges = 0;
        this.stageReviewHeatLanceImpact(0, 1);
        this.reviewInput = normalizePlayerInput({ throttle: 1, fire: true });
        break;
      }
      case 'shield-active': {
        const progress = 0.318;
        this.placeReviewRacer(0, progress, 0);
        this.placeReviewRacer(1, this.reviewProgress(progress, -52), 3, 0.1);
        this.placeReviewRacer(2, this.reviewProgress(progress, -76), -9, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -98), 10, 0.08);
        this.setReviewCameraFocus(-8, 0, 0);
        galactic.shield.cooldown = 0;
        const yaw = player.vehicle.orientation.yaw;
        const forwardX = Math.sin(yaw);
        const forwardZ = Math.cos(yaw);
        const projectileX = player.vehicle.position.x - forwardX * 15;
        const projectileZ = player.vehicle.position.z - forwardZ * 15;
        this.race.state.galacticWorld.projectiles.push({
          id: 'review-shield-strike',
          ownerId: 'ai-vexa',
          position: { x: projectileX, y: player.vehicle.position.y + 0.5, z: projectileZ },
          previousPosition: {
            x: projectileX - forwardX * 4,
            y: player.vehicle.position.y + 0.5,
            z: projectileZ - forwardZ * 4,
          },
          velocity: { x: forwardX * 270, y: 0, z: forwardZ * 270 },
          remaining: 1.2,
          radius: 1.05,
          damage: 0.08,
          heat: 0.12,
        });
        this.reviewInput = normalizePlayerInput({ throttle: 0.82, shield: true });
        break;
      }
      case 'mine-trigger': {
        const progress = 0.337;
        const victimProgress = this.reviewProgress(progress, 23);
        this.placeReviewRacer(0, progress, -15, 0.04, 'start');
        // Keep the victim and blast out from under the left-side minimap so
        // the planted mine -> impact -> disabled rival chain reads at a glance.
        this.placeReviewRacer(1, victimProgress, 5, 0.12, 'start');
        this.placeReviewRacer(2, this.reviewProgress(progress, -58), -10, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -82), 10, 0.08);
        this.setReviewCameraFocus(-5);
        const victim = this.race.state.entries[1];
        if (victim) {
          this.race.state.galacticWorld.mines.push({
            id: 'review-trigger-mine',
            ownerId: player.id,
            position: {
              x: victim.vehicle.position.x,
              y: this.race.terrain.heightAt(victim.vehicle.position.x, victim.vehicle.position.z) + 0.45,
              z: victim.vehicle.position.z,
            },
            remaining: 12,
            armTime: 0,
            triggerRadius: 11,
            damage: 0.24,
          }, {
            id: 'review-display-mine',
            ownerId: player.id,
            // This inert twin stays beside the blast centre after the live
            // mine is consumed, preserving the planted-object -> victim read.
            position: this.reviewWorldPosition(victimProgress, 9),
            remaining: 12,
            armTime: 0,
            triggerRadius: 0.25,
            damage: 0.24,
          });
        }
        this.reviewInput = normalizePlayerInput({ throttle: 0.72 });
        break;
      }
      case 'hazard': {
        const hazard = this.race.state.galacticWorld.hazards.find(
          (candidate) => candidate.kind === 'rockfall',
        ) ?? this.race.state.galacticWorld.hazards[0];
        if (hazard) {
          const centreProgress = hazard.progress;
          const centreLane = hazard.lateralOffset;
          const protectedRacers = Object.fromEntries(
            this.race.state.entries.map((entry) => [entry.id, 60]),
          );
          // Three phase-offset volumes make the rockfall read as descending
          // stones rather than a single generic ground explosion. Only the
          // centre volume is live for ai-vexa; the flanking stones are visual
          // staging and cannot manufacture extra damage or receipts.
          this.race.state.galacticWorld.hazards = [{
            id: 'review-rockfall-centre',
            kind: 'rockfall',
            progress: centreProgress,
            lateralOffset: centreLane,
            progressRadius: 0.0014,
            lateralRadius: 7,
            cooldowns: {},
          }, {
            id: 'review-rockfall-left',
            kind: 'rockfall',
            progress: this.reviewProgress(centreProgress, -4),
            lateralOffset: centreLane - 5,
            progressRadius: 0.0014,
            lateralRadius: 7,
            cooldowns: { ...protectedRacers },
          }, {
            id: 'review-rockfall-right',
            kind: 'rockfall',
            progress: this.reviewProgress(centreProgress, 4),
            lateralOffset: centreLane + 5,
            progressRadius: 0.0014,
            lateralRadius: 7,
            cooldowns: { ...protectedRacers },
          }];
          const approach = this.reviewProgress(centreProgress, -22);
          this.placeReviewRacer(0, approach, centreLane, 0.24);
          this.placeReviewRacer(1, centreProgress, centreLane, 0.18, 'start');
          this.placeReviewRacer(2, this.reviewProgress(approach, -58), -11, 0.08);
          this.placeReviewRacer(3, this.reviewProgress(approach, -82), 11, 0.08);
          this.setReviewCameraFocus(-5);
        }
        this.reviewInput = normalizePlayerInput({ throttle: 0.82, steer: -0.08 });
        break;
      }
      case 'redline': {
        const progress = 0.318;
        this.placeReviewRacer(0, progress, -5, 0.34);
        this.placeReviewRacer(1, this.reviewProgress(progress, 26), 4, 0.08);
        this.placeReviewRacer(2, this.reviewProgress(progress, -62), -10, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -86), 10, 0.08);
        this.setReviewCameraFocus(-5);
        galactic.redline.heat = 0.84;
        galactic.redline.peakHeat = 0.84;
        galactic.redline.lockout = 0;
        player.vehicle.boost.energy = 1;
        this.reviewInput = normalizePlayerInput({ throttle: 1, boost: true });
        break;
      }
      case 'wreck': {
        const progress = 0.318;
        this.placeReviewRacer(0, progress, 0, 0.91);
        this.placeReviewRacer(1, this.reviewProgress(progress, 16), 5, 0.12);
        this.placeReviewRacer(2, this.reviewProgress(progress, -48), -8, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -70), 8, 0.08);
        this.setReviewCameraFocus(-8);
        player.vehicle.damage = 0.91;
        galactic.wreck.phase = 'running';
        galactic.wreck.invulnerable = 0;
        this.reviewInput = normalizePlayerInput({ throttle: 0.25 });
        break;
      }
      case 'recovery': {
        const progress = 0.318;
        this.placeReviewRacer(0, progress, 0, 0.94);
        this.placeReviewRacer(1, this.reviewProgress(progress, 12), 8, 0.12, 'start');
        this.placeReviewRacer(2, this.reviewProgress(progress, -54), -9, 0.08, 'start');
        this.placeReviewRacer(3, this.reviewProgress(progress, -78), 10, 0.08, 'start');
        this.setReviewCameraFocus();
        player.vehicle.damage = 0.94;
        galactic.wreck.phase = 'wrecked';
        galactic.wreck.timer = 0.001;
        galactic.wreck.cause = 'impact';
        galactic.wreck.sourceId = 'ai-vexa';
        this.reviewInput = normalizePlayerInput();
        break;
      }
      case 'upgrade':
        galactic.upgrades.afterburner = 2;
        galactic.upgrades.cornering = 1;
        galactic.upgrades.resilience = 2;
        galactic.upgrades.parts = [
          'pulse-capacitor',
          'landing-recuperator',
          'mine-printer',
        ];
        galactic.mine.charges = 5;
        {
          const pickup = this.race.state.galacticWorld.pickups.find(
            (candidate) => candidate.part === 'vector-vanes',
          );
          if (pickup) {
            // Start inside the pickup volume. Tick one consumes the world
            // object, installs Vector Vanes level two, and emits the reward
            // burst, so the frame is an install moment rather than a beauty
            // shot of an untouched generic pickup.
            this.placeReviewRacer(0, pickup.progress, pickup.lateralOffset, 0.06, 'start');
            this.placeReviewRacer(1, this.reviewProgress(pickup.progress, -66), pickup.lateralOffset + 10, 0.08, 'start');
            this.placeReviewRacer(2, this.reviewProgress(pickup.progress, -90), -10, 0.08, 'start');
            this.placeReviewRacer(3, this.reviewProgress(pickup.progress, -114), 11, 0.08, 'start');
            this.setReviewCameraFocus(-4);
          }
        }
        this.reviewInput = normalizePlayerInput({ throttle: 0.42 });
        break;
      case 'combat-stress': {
        const progress = 0.285;
        this.placeReviewRacer(0, progress, 0, 0.28);
        this.placeReviewRacer(1, this.reviewProgress(progress, 30), 0, 0.26);
        this.placeReviewRacer(2, this.reviewProgress(progress, -66), -13, 0.08);
        this.placeReviewRacer(3, this.reviewProgress(progress, -92), 13, 0.08);
        this.setReviewCameraFocus(-5);
        const target = this.race.state.entries[1]?.galactic;
        if (target) {
          target.shield.active = true;
          target.shield.remaining = 2.2;
          target.shield.cooldown = 5;
        }
        galactic.weapon.cooldown = 0;
        galactic.redline.heat = 0.42;
        galactic.mine.charges = 0;
        this.stageReviewHeatLanceImpact(0, 1);
        this.reviewInput = normalizePlayerInput({
          throttle: 1,
          fire: true,
        });
        break;
      }
    }
    this.syncCameraSubject();
  }

  private applyPresetMoment(name: CapturePreset): void {
    const frameByPreset: Record<CapturePreset, number> = {
      desert: 0,
      countdown: 120,
      race: 2400,
      airtime: 5100,
      drift: 7600,
      finish: 14_400,
    };
    this.simulationFrame = frameByPreset[name];
    this.race.reset();
    this.dust.clear();
    this.galacticEffects.clearEffects();
    this.wreckGroundContacts.clear();
    const progressByPreset: Record<CapturePreset, number> = {
      // The wide review camera doubles as proof of the authored canyon set
      // piece, while still showing the infinite terrain rings around it.
      desert: 0.46,
      countdown: 0.998,
      race: 0.28,
      airtime: 0.155,
      drift: 0.705,
      finish: 0.995,
    };
    const laneOffsets = name === 'countdown'
      ? [0, -14, 14, 0, -12, 12, -8, 8] as const
      : [0, -7.5, 7.5, -13, 14, -16, 16, 0] as const;
    const countdownProgressOffsets = [
      0, 0.0018, 0.0018, 0.0036, 0.0054, 0.0054, 0.0072, 0.0072,
    ] as const;
    // Keep the authored four-craft battle close to camera while staging the
    // expanded field down-course. This prevents diagnostic captures from
    // stacking racers five through eight at exactly the player's pose.
    const raceProgressOffsets = [
      0, 0.0025, 0.005, -0.002, -0.012, -0.017, -0.022, -0.028,
    ] as const;
    const baseProgress = progressByPreset[name];
    for (let racerIndex = 0; racerIndex < this.race.state.entries.length; racerIndex += 1) {
      const entry = this.race.state.entries[racerIndex];
      if (!entry) continue;
      const progress = name === 'countdown'
        ? baseProgress - (countdownProgressOffsets[racerIndex] ?? 0)
        : name === 'race'
          ? baseProgress + (raceProgressOffsets[racerIndex] ?? 0)
          : baseProgress - racerIndex * 0.0032;
      const courseSample = this.race.course.sampleAtProgress(progress);
      const lane = laneOffsets[racerIndex] ?? 0;
      setPodracerRespawnPose(entry.vehicle, {
        x: courseSample.x + courseSample.rightX * lane,
        z: courseSample.z + courseSample.rightZ * lane,
        y: null,
        yaw: Math.atan2(courseSample.tangentX, courseSample.tangentZ),
      });
      const simulationPreset = entry.isPlayer && name === 'drift'
        ? 'drift'
        : entry.isPlayer && name === 'airtime'
          ? 'airtime'
          : name === 'countdown'
            ? 'start'
            : 'race';
      applyPodracerCapturePreset(
        entry.vehicle,
        simulationPreset,
        this.terrainAdapter,
      );
      const dynamics = this.pilotDynamics[racerIndex];
      if (dynamics) {
        this.pilots[racerIndex]?.resetAnimationState();
        const yaw = entry.vehicle.orientation.yaw;
        dynamics.previousLateralSpeed = entry.vehicle.velocity.x * Math.cos(yaw)
          - entry.vehicle.velocity.z * Math.sin(yaw);
        dynamics.previousVerticalSpeed = entry.vehicle.velocity.y;
        dynamics.lateralAcceleration = 0;
        dynamics.verticalAcceleration = 0;
      }
    }
    if (name === 'countdown') {
      this.race.state.phase = 'countdown';
      this.race.state.countdownRemaining = 2.7;
      this.race.state.countdownCue = 3;
    } else if (name === 'finish') {
      const finishTimes = [
        178.432, 180.916, 183.744, 187.208,
        190.441, 193.827, 197.113, 202.604,
      ] as const;
      const lastFinishTime = finishTimes.at(-1) ?? 202.604;
      this.race.state.phase = 'finished';
      this.race.state.countdownRemaining = 0;
      this.race.state.countdownCue = 0;
      this.race.state.raceTime = lastFinishTime;
      for (let racerIndex = 0; racerIndex < this.race.state.entries.length; racerIndex += 1) {
        const entry = this.race.state.entries[racerIndex];
        if (!entry) continue;
        const finishTime = finishTimes[racerIndex] ?? lastFinishTime;
        entry.status = 'finished';
        entry.progress.completedLaps = this.race.state.totalLaps;
        entry.progress.currentLap = this.race.state.totalLaps;
        entry.progress.placement = racerIndex + 1;
        entry.progress.finishTime = finishTime;
        entry.progress.lapTimes = [
          finishTime * 0.337,
          finishTime * 0.331,
          finishTime * 0.332,
        ];
      }
      this.race.state.results = this.race.state.entries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        placement: entry.progress.placement ?? 4,
        finishTime: entry.progress.finishTime,
        lapTimes: [...entry.progress.lapTimes],
        splits: [...entry.progress.splits],
      }));
    } else {
      this.race.state.phase = 'racing';
      this.race.state.countdownRemaining = 0;
      this.race.state.countdownCue = 0;
      for (const entry of this.race.state.entries) entry.status = 'racing';
    }
    this.lastRaceInputs = {};
    this.syncCameraSubject();
  }

  private captureInput(preset: CapturePreset, time: number): PlayerInputState {
    switch (preset) {
      case 'countdown':
        return { ...NEUTRAL_PLAYER_INPUT };
      case 'desert':
        return { ...NEUTRAL_PLAYER_INPUT, throttle: 0.48, steer: Math.sin(time * 0.33) * 0.12 };
      case 'drift':
        return {
          ...NEUTRAL_PLAYER_INPUT,
          throttle: 1,
          steer: 0.78,
          drift: this.playerState.simulationTime % 5.2 < 3.8,
        };
      case 'airtime':
        return { ...NEUTRAL_PLAYER_INPUT, throttle: 1, steer: -0.08 };
      case 'finish':
        return { ...NEUTRAL_PLAYER_INPUT, throttle: 0.25 };
      case 'race':
      default:
        return {
          ...NEUTRAL_PLAYER_INPUT,
          throttle: 1,
          steer: 0.28 + Math.sin(time * 0.42) * 0.12,
          boost: this.playerState.boost.energy > 0.34 && Math.sin(time * 0.17) > 0.72,
        };
    }
  }

  /** One source of displayed body, camera and rupture transforms; race state is read-only. */
  private resolveWreckVisualPose(entry: RaceEntryState, extrapolationSeconds = 0): WreckVisualPose {
    const view = this.racerViews[this.race.state.entries.findIndex(candidate => candidate.id === entry.id)] ?? this.playerView;
    let cache = this.wreckVisualPoses.get(view);
    if (!cache) {
      cache = new WreckVisualPoseCache();
      this.wreckVisualPoses.set(view, cache);
    }
    cache.refresh(view, view.importedActive ? view.imported.geometryMeshes : view.prepassMeshes,
      view.geometryRevision);
    // Recovery camera bounds use the intact displayed pose; never replay the
    // wreck animation merely because its timer has reached zero.
    const remaining = entry.galactic?.wreck.phase === 'wrecked'
      ? entry.galactic.wreck.timer : 2.15 + extrapolationSeconds;
    const pose = cache.update(entry.vehicle, remaining, this.race.terrain, extrapolationSeconds);
    if (view.importedActive) view.imported.updateWreckBreakup(pose, remaining, this.race.terrain, extrapolationSeconds);
    return pose;
  }

  private syncCombatCameraSubject(extrapolationSeconds: number): void {
    const entry = this.race.state.entries.find(candidate => candidate.vehicle === this.playerState);
    if (!entry) return;
    const pose = this.resolveWreckVisualPose(entry, extrapolationSeconds);
    this.subject.combatFocus = pose.center;
    this.subject.combatForward = pose.forward;
    this.subject.combatImpactPosition = pose.rupture?.position;
    this.subject.combatRadius = pose.radius;
    this.subject.combatBounds = pose.bounds;
    this.subject.combatTerrain = this.race.terrain;
    this.subject.wreckRecovery = entry.galactic?.wreck.phase === 'recovering';
  }

  private syncCameraSubject(extrapolationSeconds = 0): void {
    const state = this.playerState;
    const forwardX = Math.sin(state.orientation.yaw);
    const forwardZ = Math.cos(state.orientation.yaw);
    const rightX = Math.cos(state.orientation.yaw);
    const rightZ = -Math.sin(state.orientation.yaw);
    this.subject.position.set(
      state.position.x + state.velocity.x * extrapolationSeconds
        + forwardX * this.reviewCameraForwardOffset
        + rightX * this.reviewCameraRightOffset,
      state.position.y + state.velocity.y * extrapolationSeconds + this.reviewCameraHeightOffset,
      state.position.z + state.velocity.z * extrapolationSeconds
        + forwardZ * this.reviewCameraForwardOffset
        + rightZ * this.reviewCameraRightOffset,
    );
    this.subject.forward.set(forwardX, 0, forwardZ).normalize();
    this.subject.velocity.set(state.velocity.x, state.velocity.y, state.velocity.z);
    this.subject.speed = state.telemetry.speed;
    this.subject.chaseClearance = vehicleChaseClearance(this.playerView.activeAppearanceId);
    const entry = this.race.state.entries.find(candidate => candidate.vehicle === state);
    this.subject.junctionLookAhead=undefined;this.subject.junctionWeight=0;
    if(entry){
      const ahead = this.race.course.sampleAtDistance(entry.progress.courseProgress * this.race.course.totalLength + 55 + Math.min(70, state.telemetry.speed * .3));
      this.routeCameraPreview.set(ahead.x, ahead.y + 3, ahead.z);
      this.subject.routeLookAhead = this.routeCameraPreview;
      this.subject.junctionWeight = updateCourseJunctionFraming(this.race.course, entry.progress.courseProgress,
        this.subject.position, this.subject.forward, this.junctionCameraPreview);
      if (this.subject.junctionWeight > 0) this.subject.junctionLookAhead = this.junctionCameraPreview;
    } else this.subject.routeLookAhead = undefined;
  }

  /**
   * Position changes are authoritative race state, so the same gate works for
   * local simulation and for a network guest after an authoritative snapshot.
   * A multi-place pass still produces one clean callout instead of stacked
   * copies; PodracerAudio owns the final overlap/cooldown guard.
   */
  private updateOvertakeCallout(): void {
    const local = this.race.state.entries.find((entry) => entry.isPlayer);
    const placement = local?.progress.placement;
    if (!placement || this.race.state.phase !== 'racing') {
      this.lastLocalPlacement = placement ?? null;
      return;
    }
    const previous = this.lastLocalPlacement;
    this.lastLocalPlacement = placement;
    if (
      !this.captureMode
      && this.race.state.raceTime > 0.75
      && previous !== null
      && placement < previous
    ) {
      this.audio.playOvertakeCallout();
    }
  }

  private consumeVehicleEvents(
    events: readonly PodracerEvent[],
    state: PodracerState,
    primary: boolean,
  ): void {
    if (primary && !this.captureMode) {
      this.audio.handleEvents(events);
      this.cameraDirector.consumeEvents(events);
    }
    for (const event of events) {
      if (event.type === 'sand-spray') {
        const yaw = state.orientation.yaw;
        this.dust.emitSpray(
          event.position.x,
          this.race.terrain.heightAt(event.position.x, event.position.z) + 0.3,
          event.position.z,
          Math.sin(yaw),
          Math.cos(yaw),
          event.intensity,
          8 + Math.round(event.intensity * 14),
        );
      }
    }
  }

  private pushRacerWake(racerIndex: number, state: PodracerState, time: number): void {
    const yaw = state.orientation.yaw;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const view = this.racerViews[racerIndex];
    const localZ = view?.wakeAnchors[0]?.position.z ?? -7.6;
    const halfSpreads = [8.4, 7.5, 9.5, 8.75] as const;
    const halfSpread = Math.abs(
      view?.wakeAnchors[1]?.position.x ?? halfSpreads[racerIndex] ?? 8.4,
    );
    const leftX = view?.wakeAnchors[0]?.position.x ?? -halfSpread;
    const rightX = view?.wakeAnchors[1]?.position.x ?? halfSpread;
    const toWorld = (localX: number): [number, number] => [
      state.position.x + localX * cosYaw + localZ * sinYaw,
      state.position.z - localX * sinYaw + localZ * cosYaw,
    ];
    const left = toWorld(leftX);
    const right = toWorld(rightX);
    const strength = Math.min(1, state.telemetry.normalizedSpeed * 1.15)
      * (state.grounded ? 1 : 0.18);
    this.dust.pushWakePair(
      racerIndex,
      left[0],
      left[1],
      right[0],
      right[1],
      strength,
      time,
    );
  }

  private updateGroundDust(): void {
    this.dust.beginFrame();
    for (let index = 0; index < this.race.state.entries.length; index += 1) {
      const entry = this.race.state.entries[index]!;
      const vehicle = entry.vehicle;
      const input = this.lastRaceInputs[entry.id] ?? NEUTRAL_PLAYER_INPUT;
      const thrust = Math.min(
        1,
        input.throttle * 0.52 + vehicle.telemetry.normalizedSpeed * 0.7,
      );
      const view = this.racerViews[index];
      if (view?.importedActive) {
        const sin = Math.sin(vehicle.orientation.yaw), cos = Math.cos(vehicle.orientation.yaw);
        for (const anchor of view.dustAnchors) {
          const x = vehicle.position.x + anchor.position.x * cos + anchor.position.z * sin;
          const z = vehicle.position.z - anchor.position.x * sin + anchor.position.z * cos;
          this.dust.emitGroundContact(x, this.race.terrain.heightAt(x, z) + .3, z,
            Math.abs(anchor.position.x) > 1 ? 4.8 : 3.1, thrust * (vehicle.grounded ? 1 : .16));
        }
        continue;
      }
      for (const probe of vehicle.probes) {
        this.dust.emitGroundContact(
          probe.worldX,
          probe.groundHeight + Math.max(0.2, probe.clearance),
          probe.worldZ,
          probe.id.startsWith('engine') ? 4.8 : 3.1,
          thrust * (probe.active ? 1 : 0.16),
        );
      }
    }
  }

  /**
   * Adapts authoritative JSON combat/world state into the eight fixed render
   * pools. Scratch objects are retained between frames: a crowded firefight
   * changes instance matrices, never the scene graph or the garbage collector.
   */
  private syncGalacticEffects(time: number): void {
    this.activeGalacticShields.length = 0;
    this.activeGalacticLances.length = 0;
    this.activeGalacticMines.length = 0;
    this.activeGalacticHazards.length = 0;

    let shieldIndex = 0;
    for (const entry of this.race.state.entries) {
      const galactic = entry.galactic;
      if (!galactic || shieldIndex >= this.galacticShieldPool.length) continue;
      const recoveryShell = galactic.wreck.phase === 'recovering' || galactic.wreck.invulnerable > 0;
      if (!galactic.shield.active && !recoveryShell) continue;
      const effect = this.galacticShieldPool[shieldIndex];
      if (!effect) continue;
      effect.position.x = entry.vehicle.position.x;
      effect.position.y = entry.vehicle.position.y + 0.5;
      effect.position.z = entry.vehicle.position.z;
      effect.radius = GALACTIC_VEHICLES[galactic.vehicleClass].collisionRadius
        * (recoveryShell ? 1.12 : 1.22);
      effect.intensity = recoveryShell
        ? 1.35
        : Math.min(1.4, 0.95 + galactic.shield.remaining * 0.18);
      effect.phase = time + shieldIndex * 0.37;
      effect.color = recoveryShell ? '#00ff66' : '#00dfff';
      effect.mode = recoveryShell ? 'recovery' : 'shield';
      this.activeGalacticShields.push(effect);
      shieldIndex += 1;
    }
    for (const entry of this.race.state.entries) {
      const galactic = entry.galactic;
      if (!galactic || galactic.wreck.phase !== 'running' || galactic.redline.heat <= 0.65) continue;
      const definition = GALACTIC_VEHICLES[galactic.vehicleClass];
      const engineSpread = definition.collisionRadius
        * (galactic.vehicleClass === 'speeder-bike' ? 0.24 : 0.54);
      const yaw = entry.vehicle.orientation.yaw;
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);
      for (const side of [-1, 1] as const) {
        if (shieldIndex >= this.galacticShieldPool.length) break;
        const effect = this.galacticShieldPool[shieldIndex];
        if (!effect) break;
        effect.position.x = entry.vehicle.position.x + rightX * engineSpread * side;
        effect.position.y = entry.vehicle.position.y + 0.55;
        effect.position.z = entry.vehicle.position.z + rightZ * engineSpread * side;
        effect.radius = Math.max(1.7, definition.collisionRadius * 0.4);
        effect.intensity = Math.min(1.5, 0.82 + galactic.redline.heat * 0.55);
        effect.phase = time * 2.3 + shieldIndex * 0.59;
        effect.color = '#ff2600';
        effect.mode = 'redline';
        this.activeGalacticShields.push(effect);
        shieldIndex += 1;
      }
    }

    const projectiles = this.race.state.galacticWorld.projectiles;
    const lanceCount = Math.min(projectiles.length, this.galacticLancePool.length);
    for (let index = 0; index < lanceCount; index += 1) {
      const projectile = projectiles[index];
      const effect = this.galacticLancePool[index];
      if (!projectile || !effect) continue;
      const speed = Math.max(1, Math.hypot(
        projectile.velocity.x,
        projectile.velocity.y,
        projectile.velocity.z,
      ));
      const directionX = projectile.velocity.x / speed;
      const directionY = projectile.velocity.y / speed;
      const directionZ = projectile.velocity.z / speed;
      const trail = 32 + Math.min(18, speed * 0.045);
      // A newborn projectile has not travelled a full trail length yet. Clamp
      // its tail to the owning craft's forward muzzle so the graphic can never
      // extend behind the player/camera and read as a rear-firing weapon.
      const owner = this.race.state.entries.find((entry) => entry.id === projectile.ownerId);
      let visibleTrail = trail;
      if (owner) {
        const muzzleX = owner.vehicle.position.x + directionX
          * (GALACTIC_VEHICLES[owner.galactic?.vehicleClass ?? 'podracer'].collisionRadius + 1.7);
        const muzzleY = owner.vehicle.position.y + 0.6;
        const muzzleZ = owner.vehicle.position.z + directionZ
          * (GALACTIC_VEHICLES[owner.galactic?.vehicleClass ?? 'podracer'].collisionRadius + 1.7);
        const travelled = (projectile.position.x - muzzleX) * directionX
          + (projectile.position.y - muzzleY) * directionY
          + (projectile.position.z - muzzleZ) * directionZ;
        visibleTrail = Math.min(trail, Math.max(0, travelled));
      }
      effect.origin.x = projectile.position.x - directionX * visibleTrail;
      effect.origin.y = projectile.position.y - directionY * visibleTrail;
      effect.origin.z = projectile.position.z - directionZ * visibleTrail;
      effect.target.x = projectile.position.x + directionX * 8;
      effect.target.y = projectile.position.y + directionY * 8;
      effect.target.z = projectile.position.z + directionZ * 8;
      effect.width = 1.15 + projectile.radius * 0.42;
      effect.intensity = 1.5;
      effect.phase = time + index * 0.21;
      effect.color = '#ff5a1f';
      this.activeGalacticLances.push(effect);
    }

    const mines = this.race.state.galacticWorld.mines;
    const mineCount = Math.min(mines.length, this.galacticMinePool.length);
    for (let index = 0; index < mineCount; index += 1) {
      const mine = mines[index];
      const effect = this.galacticMinePool[index];
      if (!mine || !effect) continue;
      effect.position.x = mine.position.x;
      effect.position.z = mine.position.z;
      effect.position.y = this.race.terrain.heightAt(mine.position.x, mine.position.z) + 0.48;
      effect.yaw = index * 1.618;
      effect.armed = mine.armTime <= 0;
      effect.phase = time + index * 0.43;
      // A trap must survive chase-camera perspective at 400+ km/h. Its
      // trigger radius is already several metres, so a 1.5x graphic body is
      // still honest to gameplay while remaining readable before contact.
      effect.scale = effect.armed ? 1.55 : 1.05;
      effect.variant = 'mine';
      this.activeGalacticMines.push(effect);
    }
    let worldObjectIndex = mineCount;
    const localPickupClaims = this.race.state.entries.find((entry) => entry.id === this.localRacerId())
      ?.galactic?.upgrades.collectedPickupIds;
    for (const pickup of this.race.state.galacticWorld.pickups) {
      if (pickup.collectedBy !== null || worldObjectIndex >= this.galacticMinePool.length) continue;
      if ((pickup.part === 'emp-cell' || pickup.part === 'repair-salvage')
        && localPickupClaims?.includes(pickup.id)) continue;
      const effect = this.galacticMinePool[worldObjectIndex];
      if (!effect) continue;
      const course = this.race.course.sampleAtProgress(pickup.progress);
      effect.position.x = course.x + course.rightX * pickup.lateralOffset;
      effect.position.z = course.z + course.rightZ * pickup.lateralOffset;
      effect.position.y = this.race.terrain.heightAt(effect.position.x, effect.position.z) + 0.5;
      effect.yaw = worldObjectIndex * 1.618;
      effect.armed = false;
      effect.phase = time + worldObjectIndex * 0.61;
      effect.scale = 2.25;
      effect.variant = pickup.part === 'emp-cell' ? 'emp' : pickup.part === 'repair-salvage' ? 'repair' : 'pickup';
      this.activeGalacticMines.push(effect);
      worldObjectIndex += 1;
    }

    const hazards = this.race.state.galacticWorld.hazards;
    const hazardCount = Math.min(hazards.length, this.galacticHazardPool.length);
    for (let index = 0; index < hazardCount; index += 1) {
      const hazard = hazards[index];
      const effect = this.galacticHazardPool[index];
      if (!hazard || !effect) continue;
      const course = this.race.course.sampleAtProgress(hazard.progress);
      effect.position.x = course.x + course.rightX * hazard.lateralOffset;
      effect.position.z = course.z + course.rightZ * hazard.lateralOffset;
      effect.position.y = this.race.terrain.heightAt(effect.position.x, effect.position.z) + 0.14;
      effect.kind = hazard.kind === 'heat-vent'
        ? 'heat-vent'
        : hazard.kind === 'rockfall'
          ? 'rockfall'
          : 'sand-geyser';
      effect.radius = Math.max(4.5, hazard.lateralRadius);
      effect.height = hazard.kind === 'rockfall'
        ? 4.6
        : hazard.kind === 'dust-interference'
          ? 13
          : 8.5;
      effect.intensity = hazard.kind === 'dust-interference' ? 0.58 : 1;
      effect.phase = index * 0.71;
      effect.warning = 0.72 + Math.sin(time * 3.2 + index) * 0.28;
      this.activeGalacticHazards.push(effect);
    }

    this.galacticEffects.setState({
      shields: this.activeGalacticShields,
      heatLances: this.activeGalacticLances,
      scrapMines: this.activeGalacticMines,
      hazards: this.activeGalacticHazards,
    });
  }

  private consumeGalacticEffects(events: readonly GalacticEvent[], time: number, authoritativeFrames?: readonly number[]): void {
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex]!;
      if (event.type === 'wreck') {
        const entry = this.race.state.entries.find(candidate => candidate.id === event.racerId);
        if (entry?.galactic?.wreck.phase === 'wrecked') {
          this.wreckGroundContacts.begin(event.racerId,
            authoritativeFrames?.[eventIndex] ?? this.simulationFrame, entry.galactic.wreck.crashCount);
        }
      }
      let racerId: string | null = null;
      let style: 'crash' | 'mine' | 'sand' | 'rock' | 'redline' | 'reward' | 'energy' | 'recovery' = 'crash';
      let severity = 1;
      let color = '#ff6a2d';
      switch (event.type) {
        case 'scrap-mine-triggered':
          racerId = event.racerId;
          style = 'mine';
          severity = 1.85;
          color = '#ff631c';
          break;
        case 'hazard-hit':
          racerId = event.racerId;
          style = event.hazard === 'rockfall' ? 'rock' : 'sand';
          severity = 1.35 + event.intensity * 0.45;
          color = event.hazard === 'rockfall' ? '#7b3a27' : '#ffd071';
          break;
        case 'redline-explosion':
          racerId = event.racerId;
          style = 'redline';
          severity = 2;
          color = '#ff2f18';
          break;
        case 'wreck':
          if (event.cause === 'redline-explosion') continue;
          racerId = event.racerId;
          style = event.cause === 'rockfall' ? 'rock' : 'crash';
          severity = event.cause === 'rockfall' ? 1.65 : 1.8;
          color = event.racerId === this.localRacerId() ? '#ff6a2d' : '#58d8ff';
          break;
        case 'emp-pulse':
          racerId = event.racerId;
          style = 'energy';
          severity = 1.8;
          color = '#bb66ff';
          break;
        case 'emp-hit':
          racerId = event.targetId;
          style = 'energy';
          severity = event.blocked ? 0.7 : 1.1;
          color = event.blocked ? '#58efff' : '#bb66ff';
          break;
        case 'repair-salvage-collected':
          racerId = event.racerId;
          style = 'reward';
          severity = 1.35;
          color = '#8fff45';
          break;
        case 'upgrade-collected':
          racerId = event.racerId;
          style = 'reward';
          severity = 1.55;
          color = '#ffd34d';
          break;
        case 'recovered':
          racerId = event.racerId;
          style = 'recovery';
          severity = 1.4;
          color = '#60ff91';
          break;
        case 'shield-block':
          racerId = event.racerId;
          style = 'energy';
          severity = 1.05;
          color = '#58efff';
          break;
        case 'weapon-hit':
          if (event.weapon === 'scrap-mine') continue;
          racerId = event.targetId;
          style = 'energy';
          severity = event.shielded ? 0.9 : 1.2;
          color = event.shielded ? '#58efff' : '#ff6940';
          break;
        default:
          continue;
      }
      const racerIndex = this.race.state.entries.findIndex((candidate) => candidate.id === racerId);
      const entry = this.race.state.entries[racerIndex];
      if (!entry) continue;
      let position = entry.vehicle.position;
      let direction: Vector3 | undefined;
      let surfaceNormal: Vector3 | undefined;
      if (style === 'redline' || style === 'crash') {
        const view = this.racerViews[racerIndex];
        const wreckPose = entry.galactic?.wreck.phase === 'wrecked'
          ? this.resolveWreckVisualPose(entry) : null;
        if (wreckPose?.rupture) {
          // The authored cut witness already includes the displayed body and
          // rear-section transforms. Keep its exact surface origin in world space.
          position = wreckPose.rupture.position;
          direction = wreckPose.rupture.direction;
          surfaceNormal = wreckPose.rupture.direction;
        } else {
          // Events identify the racer, not a collision world point. Emit this
          // casing rupture from actual engine geometry, never an invented hit.
          const anchor = view?.importedActive
            ? view.imported.getAttachment('exhaustRight')
            : view?.procedural.getObjectByName('engine-right');
          if (view && anchor) {
            const local = view.worldToLocal(anchor.getWorldPosition(new Vector3()));
            const vehicle = entry.vehicle;
            // Resolve before the first rendered wreck frame too. The shared
            // renderer pose owns pivot/terrain clearance for body, camera and FX.
            this.wreckRuptureDirection.set(0, 0, 1);
            if (wreckPose && view.importedActive) {
              this.wreckRuptureOrigin.set(0, 0, 0);
              view.imported.transformWreckAttachment('exhaustRight', this.wreckRuptureDirection);
              view.imported.transformWreckAttachment('exhaustRight', this.wreckRuptureOrigin);
              this.wreckRuptureDirection.sub(this.wreckRuptureOrigin).applyEuler(wreckPose.rotation).normalize();
            } else this.wreckRuptureDirection.set(Math.sin(vehicle.orientation.yaw), 0, Math.cos(vehicle.orientation.yaw));
            direction = this.wreckRuptureDirection;
            if (wreckPose) view.imported.transformWreckAttachment('exhaustRight', local);
            local.applyEuler(wreckPose?.rotation ?? new Euler(vehicle.orientation.pitch,
              vehicle.orientation.yaw, vehicle.orientation.roll + vehicle.orientation.bank, 'YXZ'));
            const origin = wreckPose?.position ?? vehicle.position;
            position = { x: origin.x + local.x, y: origin.y + local.y, z: origin.z + local.z };
          }
        }
      }
      this.galacticEffects.emitCrash({
        type: 'crash',
        time,
        position,
        velocity: entry.vehicle.velocity,
        direction,
        surfaceNormal,
        wreckOwner: surfaceNormal ? racerIndex : undefined,
        wreckSequence: surfaceNormal ? entry.galactic?.wreck.crashCount : undefined,
        groundY: this.race.terrain.heightAt(position.x, position.z),
        severity,
        color,
        style,
      });
    }
  }

  private installReviewApi(): void {
    const api: PodRacingReviewApi = {
      ready: this.inkstormWorld.loaded,
      version: 2,
      setCaptureMode: (enabled) => this.setCaptureMode(enabled),
      setPerformanceQuality: (level) => {
        this.performanceGovernor.setAdaptiveEnabled(level === null && !this.captureMode);
        if(level !== null) this.applyPerformanceDecision(this.performanceGovernor.setQualityLevel(level));
        this.performanceGovernor.resetMeasurements();
      },
      setPreset: (name) => this.setPreset(name),
      setCamera: (name) => this.setCamera(name),
      setScenario: (name) => this.setReviewScenario(name),
      setReviewCamera: (name) => this.setReviewCamera(name),
      seekCourse: (progress) => {
        if (!this.captureMode || !Number.isFinite(progress)) throw new Error('Course framing is capture-mode only.');
        this.mastery.cancelRun();
        this.setPreset('race');
        const normalized = ((progress % 1) + 1) % 1;
        for (let index = 0; index < this.race.state.entries.length; index += 1) {
          this.placeReviewRacer(index, this.reviewProgress(normalized, -index * 42), index % 2 ? -8 : 6, 0.38);
        }
        this.syncCameraSubject();
        this.cameraRig.snap(this.subject);
        this.render(FIXED_DT);
      },
      setInput: (input) => this.setReviewInput(input),
      clearInput: () => {
        if (!this.captureMode) throw new Error('Review input injection is capture-mode only.');
        this.reviewInput = null;
      },
      clearEvents: () => {
        if (!this.captureMode) throw new Error('Review event mutation is capture-mode only.');
        this.recentGalacticEvents.length = 0;
      },
      step: (frames) => {
        const count = Math.max(0, Math.min(60_000, Math.floor(frames)));
        for (let i = 0; i < count; i += 1) {
          this.stepSimulation();
          this.dust.advancePersistentEffects(
            this.simulationFrame * FIXED_DT,
            FIXED_DT,
          );
        }
        // Review captures jump hundreds of fixed ticks without intermediate
        // renders. Snap after the jump so the spring camera does not preserve a
        // stale position and falsely make the racer look tiny or absent.
        if (this.captureMode) this.cameraRig.snap(this.subject);
        this.render(FIXED_DT);
      },
      snapshot: () => this.snapshot(),
    };
    window.__PODRACING__ = api;
    void Promise.all([this.inkstormWorld.ready,this.sky.ready]).then(() => { if (!this.disposed) api.ready = this.inkstormWorld.loaded; });
  }

  private snapshot(): ReviewSnapshot {
    const info = this.renderer.info.render;
    const metrics = this.viewport.getMetrics();
    const player = this.race.state.entries.find((entry) => entry.isPlayer);
    const galactic = player?.galactic;
    const galacticRacers = this.race.state.entries.flatMap((entry) => (
      entry.galactic ? [{
        id: entry.id,
        galactic: entry.galactic,
        position: [
          entry.vehicle.position.x,
          entry.vehicle.position.y,
          entry.vehicle.position.z,
        ] as const,
        yaw: entry.vehicle.orientation.yaw,
        courseProgress: entry.progress.courseProgress,
        lateralOffset: entry.progress.lateralOffset,
      }] : []
    ));
    const courseSamples = this.race.course.getMinimapSamples(32);
    const courseBounds = this.minimapCourse.reduce((bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z),
    }), {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    });
    const sectionCounts = this.race.course.controlPoints.reduce<Record<string, number>>(
      (counts, point) => {
        counts[point.tag] = (counts[point.tag] ?? 0) + 1;
        return counts;
      },
      {},
    );
    return {
      preset: this.preset,
      camera: this.cameraMode,
      simulationFrame: this.simulationFrame,
      raceTime: this.race.state.raceTime,
      renderer: {
        sceneryShadow: { ...this.inkstormSunShadow.receipt,
          terrain: { ...this.inkstormWorld.terrainShadowReceipt } },
        racerShadow: { ...this.inkstormRacerShadow.receipt },
        width: Math.floor(metrics.cssWidth * metrics.pixelRatio),
        height: Math.floor(metrics.cssHeight * metrics.pixelRatio),
        pixelRatio: metrics.pixelRatio,
        calls: info.calls,
        triangles: info.triangles,
        points: info.points,
        lines: info.lines,
        performance: {
          qualityLevel: this.performanceGovernor.decision.qualityLevel,
          adaptive: this.performanceGovernor.telemetry.adaptiveEnabled,
          reason: this.performanceGovernor.decision.reason,
          terrainRequestedLevels: this.terrain.requestedLevelCount,
          terrainEffectiveLevels: this.terrain.levelCount,
          terrainCoverageRadius: this.terrain.coverageRadius,
          workEmaMs: this.performanceGovernor.telemetry.frame.emaFrameMs,
          cadenceEmaMs: this.performanceGovernor.telemetry.cadence?.emaFrameMs ?? null,
          cadenceSamples: this.performanceGovernor.telemetry.cadence?.totalSamples ?? 0,
          cadenceLastMs: this.performanceGovernor.telemetry.cadence?.lastFrameMs ?? null,
        },
        memory: {
          geometries: this.renderer.info.memory.geometries,
          textures: this.renderer.info.memory.textures,
          programs: this.renderer.info.programs?.length ?? 0,
        },
      },
      game: {
        milestone: 9,
        vehiclePresentation: {
          selected: this.vehicleAppearance,
          library: this.vehicleArtLibrary.diagnostics,
          racers: this.racerViews.map((view) => ({
            vehicleClass: view.vehicleClass, requested: view.appearanceId,
            active: view.importedActive ? view.imported.activeSource?.id : 'procedural',
            status: view.appearanceStatus, error: view.imported.error?.message ?? null,
            lod: view.lodMode, revision: view.geometryRevision,
            registeredPrepasses: this.racerPrepassUnregister.get(view)?.length ?? 0,
            visiblePrepasses: view.prepassMeshes.reduce((count, mesh) => count + Number(mesh.visible), 0),
            embeddedPilot: view.importedActive && view.imported.hasEmbeddedPilot,
            breakupAvailable: view.breakupAvailable, breakupActive: view.breakupActive,
            damageVariantAvailable: view.damageVariantAvailable, damageVariantActive: view.damageVariantActive,
            damageVariantError: view.imported.damageVariantError?.message ?? null,
            statistics: view.imported.statistics,
            residentStatistics: view.imported.residentStatistics,
          })),
        },
        inkstorm: { loaded: this.inkstormWorld.loaded, error: this.inkstormWorld.error, detail: { ...this.inkstormWorld.detailReceipt } },
        mastery: this.room.lobby.role === 'solo'
          ? this.mastery.model(this.awaitingRaceStart ? this.masteryStartOptions() : undefined) : null,
        competitionProfile: this.race.competitionProfile,
        reviewScenario: this.reviewScenario,
        reviewCamera: this.reviewCameraMode,
        speed: this.subject.speed,
        position: [
          this.playerState.position.x,
          this.playerState.position.y,
          this.playerState.position.z,
        ],
        cameraFocusPosition: this.subject.position.toArray(),
        cameraPosition: this.cameraRig.camera.position.toArray(),
        combatPresentation: this.combatPresentation.diagnostics,
        combatCamera: {
          cut: this.combatCameraCut,
          recoveryArmed: this.combatChaseRecovery,
          wreckChase: !!this.subject.wreckChase,
          wreckRecovery: !!this.subject.wreckRecovery,
        },
        renderedRacerPositions: this.racerViews.map((view, index) => ({
          id: this.race.state.entries[index]?.id ?? `racer-${index}`,
          position: view.position.toArray(),
        })),
        highlightReplay: this.highlightReplay ? {
          momentId: this.highlightReplay.momentId,
          kind: this.highlightReplay.kind,
          focusRacerId: this.highlightReplay.focusRacerId,
          focusOtherRacerId: this.highlightReplay.focusOtherRacerId ?? null,
          impactEmitted: this.highlightReplay.impactEmitted,
        } : null,
        cameraFocusOffset: {
          forward: this.reviewCameraForwardOffset,
          right: this.reviewCameraRightOffset,
          height: this.reviewCameraHeightOffset,
        },
        yaw: this.playerState.orientation.yaw,
        inputSteer: this.lastRaceInputs[this.localRacerId()]?.steer ?? 0,
        inputFire: this.lastRaceInputs[this.localRacerId()]?.fire ?? false,
        inputMine: this.lastRaceInputs[this.localRacerId()]?.mine ?? false,
        inputShield: this.lastRaceInputs[this.localRacerId()]?.shield ?? false,
        awaitingStart: this.awaitingRaceStart,
        selectedLaps: this.selectedLaps,
        pendingCourse: this.pendingSoloCourse ? { ...this.pendingSoloCourse } : null,
        course: {
          seed: this.currentCourseSeed,
          signature: this.race.course.signature,
          ordinal: this.courseOrdinal,
          totalLength: this.race.course.totalLength,
          checkpointCount: this.race.course.checkpoints.length,
          bounds: courseBounds,
          sectionCounts,
          sections: (() => {
            const points=this.race.course.getRenderData(256).points;
            const section=(tag:string,fraction=.3)=>{const hits=points.filter(p=>p.tag===tag);return hits[Math.floor((hits.length-1)*fraction)]?.progress??0;};
            return [
              {id:'01-grid',progress:.003},{id:'02-salt-run',progress:section('fast-straight',.2)},
              {id:'03-canyon',progress:section('narrow-canyon',.2)},
              {id:'04-fork',progress:this.race.course.branches[0]?.entryProgress??section('wide-sweeper')},
              {id:'05-launch',progress:section('launch-crest',.4)},
              {id:'06-foundry',progress:section('chicane',.06)},
              {id:'07-finish',progress:section('hairpin',.35)},
            ];
          })(),
          samples: courseSamples.map((point) => ({
            x: Math.round(point.x * 10) / 10,
            z: Math.round(point.z * 10) / 10,
            width: Math.round(point.width * 10) / 10,
            tag: point.tag,
          })),
        },
        onlineRoom: this.room.lobby,
        networkSnapshotAge: this.networkSnapshotAge,
        vehicleSelectionLocked: this.race.playerVehicleSelectionLocked,
        vehicleClass: galactic?.vehicleClass ?? 'podracer',
        shieldActive: galactic?.shield.active ?? false,
        shieldCooldown: galactic?.shield.cooldown ?? 0,
        weaponCooldown: galactic?.weapon.cooldown ?? 0,
        mineCharges: galactic?.mine.charges ?? 0,
        redlineHeat: galactic?.redline.heat ?? 0,
        wreckPhase: galactic?.wreck.phase ?? 'running',
        takedowns: galactic?.takedowns ?? 0,
        projectiles: this.race.state.galacticWorld.projectiles.length,
        mines: this.race.state.galacticWorld.mines.length,
        activeHazards: this.race.state.galacticWorld.hazards.length,
        upgrades: galactic?.upgrades ?? null,
        audio: {
          ready: this.audio.ready,
          ...this.audio.menuMusicStatus,
          overtakeCallout: this.audio.overtakeCalloutStatus,
        },
        postMode: this.post.mode,
        postFailure: this.post.failureReason,
      },
      galactic: {
        racers: galacticRacers,
        world: this.race.state.galacticWorld,
        recentEvents: this.recentGalacticEvents,
      },
    };
  }

  private installContextRecovery(): void {
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      cancelAnimationFrame(this.raf);
      this.mount.dataset.rendererState = 'lost';
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.mount.dataset.rendererState = 'ready';
      this.inkstormSunShadow.invalidate();
      this.inkstormRacerShadow.invalidate();
      this.racerShadowBindingRevision = -1;
      this.previousTime = performance.now();
      this.start();
    });
  }

  private bindRacerPresentation(view: RacerPresentation): void {
    if (this.disposed) return;
    let wreckCache = this.wreckVisualPoses.get(view);
    if (!wreckCache) {
      wreckCache = new WreckVisualPoseCache();
      this.wreckVisualPoses.set(view, wreckCache);
    }
    wreckCache.refresh(view, view.importedActive ? view.imported.geometryMeshes : view.prepassMeshes,
      view.geometryRevision);
    for (const unregister of this.racerPrepassUnregister.get(view) ?? []) unregister();
    this.racerPrepassUnregister.set(view,
      view.prepassMeshes.map((mesh) => this.post.registerCustomPrepass(mesh, this.racerMrt)));
    for (const material of view.imported.materials) Object.assign(material.uniforms, this.inkstormSunShadow.uniforms);
    const hero = this.race.state.entries.findIndex((entry) => entry.id === this.localRacerId());
    if (this.racerViews[hero] === view) this.inkstormRacerShadow.refreshCasters(view);
    this.nextHudFrame = 0;
  }

  private applyPerformanceDecision(decision: Readonly<PerformanceDecision>): void {
    this.viewport.setAdaptivePixelRatio(decision.pixelRatio);
    this.post.setPrepassScale(decision.prepassScale);
    this.terrain.setLevelCount(decision.terrainLevelCount);
    this.dust.setQuality(decision.dustQuality);
    // The player is never simplified: cockpit readability and the hero outline
    // are part of the handling feedback. Rivals consume the governor's render-
    // side hint and distance boundary independently on every frame below.
    this.playerView.setLodMode('full');
    this.updateRivalLods(decision);
  }

  private updateRivalLods(decision: Readonly<PerformanceDecision>): void {
    const camera = this.cameraRig.camera.position;
    const expansionCapture = this.captureMode && ![
      'desert', 'countdown', 'race', 'airtime', 'drift', 'finish',
    ].includes(this.reviewScenario);
    let nearestRivalIndex = -1;
    let nearestRivalDistanceSq = Number.POSITIVE_INFINITY;
    if (this.race.state.phase !== 'countdown' && !expansionCapture) {
      for (let index = 0; index < this.rivalViews.length; index += 1) {
        const entry = this.race.state.entries[index + 1];
        if (!entry) continue;
        const dx = entry.vehicle.position.x - camera.x;
        const dy = entry.vehicle.position.y - camera.y;
        const dz = entry.vehicle.position.z - camera.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq < nearestRivalDistanceSq) {
          nearestRivalDistanceSq = distanceSq;
          nearestRivalIndex = index;
        }
      }
    }
    for (let index = 0; index < this.rivalViews.length; index += 1) {
      const view = this.rivalViews[index];
      const entry = this.race.state.entries[index + 1];
      if (!view || !entry) continue;
      // The starting grid puts every rival inside the normal hero-detail
      // boundary at once. Keep their authored engine/cockpit silhouettes and
      // class modules, but retire sub-pixel pilots, turbines and chassis trim
      // until the pack launches and naturally spreads out. This avoids a
      // one-second draw-call spike precisely when the launch meter needs the
      // steadiest possible input timing.
      if (this.race.state.phase === 'countdown' && this.reviewScenario !== 'vehicle-showcase') {
        // The three closest opponents retain their separate engine/cockpit
        // masses; the rear two rows are already mostly occluded and use the
        // merged silhouette proxy. All seven restore their normal adaptive
        // distance LOD on the first racing frame.
        const mode: DistantRivalLod = index < 3 ? 'simplified' : 'silhouette';
        view.setLodMode(mode);
        this.rivalLodModes[index] = mode;
        continue;
      }
      if (expansionCapture) {
        const mode = this.reviewScenario === 'vehicle-showcase' ? 'full' : 'simplified';
        view.setLodMode(mode);
        this.rivalLodModes[index] = mode;
        continue;
      }
      const dx = entry.vehicle.position.x - camera.x;
      const dy = entry.vehicle.position.y - camera.y;
      const dz = entry.vehicle.position.z - camera.z;
      const rivalDecision = index === nearestRivalIndex
        ? decision.distantRivalLod === 'full'
          ? HERO_RIVAL_LOD_DECISION
          : decision
        : PACK_RIVAL_LOD_DECISION;
      this.rivalLodModes[index] = applyDistantRivalLodDecision(
        view,
        this.rivalLodModes[index] ?? 'full',
        rivalDecision,
        Math.hypot(dx, dy, dz),
      );
    }
  }

  private installPriorityOutlines(): void {
    const sources: Mesh[] = [];
    const silhouetteParts = new Set([
      'engine-shell',
      'intake-cowl',
      'nozzle',
      'cockpit-shell',
      'cockpit-nose',
    ]);
    for (const root of this.racerViews) {
      root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        // Sobel supplies the small mechanical/interior lines. Inverted hulls
        // are reserved for silhouette-defining masses so the two line systems
        // do not double up and each tiny bolt does not become a draw call.
        if (!silhouetteParts.has(object.name)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (materials.some((material) => material.transparent || !material.depthWrite)) return;
        sources.push(object);
      });
    }
    for (const source of sources) {
      this.outlineHandles.push(createInvertedHullOutline(source, {
        ink: '#100c1a',
        widthPx: 1.32,
        opacity: 0.98,
        generateMissingNormals: true,
      }));
    }
    this.installCourseOutlines();
  }

  private installCourseOutlines(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.courseView.traverse((object) => {
      if (!(object instanceof Mesh) || object.name.endsWith(':ink-hull')) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => material.transparent || !material.depthWrite)) return;
      const handle = createInvertedHullOutline(object, {
        ink: '#100c1a',
        widthPx: 1.32,
        opacity: 0.98,
        generateMissingNormals: true,
      });
      handle.setViewport(width, height, pixelRatio);
      this.courseOutlineHandles.push(handle);
    });
  }
}
