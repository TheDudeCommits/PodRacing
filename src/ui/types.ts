import type { GalacticRacerState, GalacticVehicleClass } from '../game/galactic/types';

export type HudRacePhase = 'countdown' | 'racing' | 'finished';

export type HudCornerDirection = 'left' | 'straight' | 'right';

export type HudGalacticWreckPhase = 'wrecked' | 'recovering';

export interface HudCoursePoint {
  x: number;
  z: number;
  progress?: number;
  branchId?: string;
  branchKind?: 'safe' | 'shortcut' | 'jump' | 'salvage' | 'technical';
}

export type HudCourseBranchKind = NonNullable<HudCoursePoint['branchKind']>;

/** An open alternate route. It is intentionally separate from the closed main loop. */
export interface HudCourseBranchViewModel {
  id: string;
  kind: HudCourseBranchKind;
  points: readonly HudCoursePoint[];
  /** Director emphasis; absent means an ordinary always-available alternate. */
  status?: 'warning' | 'open';
}

export interface HudRacerViewModel {
  id: string;
  name: string;
  x: number;
  z: number;
  courseProgress: number;
  placement: number;
  isPlayer: boolean;
  finished?: boolean;
  /** CSS colour. The HUD falls back to its authored four-racer palette. */
  color?: string;
}

export interface HudCornerViewModel {
  direction: HudCornerDirection;
  severity: number;
  distance: number;
  label?: string;
}

export interface HudResultViewModel {
  id: string;
  name: string;
  placement: number;
  finishTime: number | null;
  bestLap: number | null;
  isPlayer?: boolean;
}

export interface HudVehicleStatViewModel {
  label: 'Speed' | 'Acceleration' | 'Drift' | 'Defense' | 'Weapons';
  /** Authored one-to-five rating used only by the selection presentation. */
  value: 1 | 2 | 3 | 4 | 5;
}

export interface HudVehicleCardViewModel {
  id: GalacticVehicleClass;
  name: string;
  description: string;
  accent: string;
  stats: readonly HudVehicleStatViewModel[];
}

export type HudLapCount = 1 | 2 | 3;

export type HudAiDifficulty = 'easy' | 'medium' | 'hard';

export type HudRaceMode =
  | 'circuit'
  | 'eliminator'
  | 'checkpoint-sprint'
  | 'combat-race'
  | 'survival-gauntlet'
  | 'drift-trial'
  | 'team-race';

export type HudWorkshopSlot = 'engine' | 'cooling' | 'armour' | 'steering' | 'gadget';

export interface HudWorkshopSlotViewModel {
  slot: HudWorkshopSlot;
  label: string;
  equippedPartId: string;
  equippedPartName: string;
  effect: string;
}

export interface HudWorkshopPartViewModel {
  id: string;
  slot: HudWorkshopSlot;
  name: string;
  description: string;
  benefit: string;
  tradeoff: string;
  equipped: boolean;
}

export interface HudWorkshopSummaryViewModel {
  bonuses: readonly string[];
  penalties: readonly string[];
  synergies: readonly string[];
}

export interface HudWorkshopViewModel {
  open: boolean;
  activeSlot: HudWorkshopSlot;
  slots: readonly HudWorkshopSlotViewModel[];
  parts: readonly HudWorkshopPartViewModel[];
  summary: HudWorkshopSummaryViewModel;
}

export type HudLobbyRole = 'solo' | 'host' | 'guest';

export type HudLobbyStatus = 'idle' | 'connecting' | 'waiting' | 'ready' | 'error';

export interface HudLobbyMemberViewModel {
  id: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
}

/** JSON-only room presentation. Networking and authority stay outside the HUD. */
export interface HudLobbyViewModel {
  role: HudLobbyRole;
  roomCode: string;
  status: HudLobbyStatus;
  statusText: string;
  members: readonly HudLobbyMemberViewModel[];
  capacity: number;
  canStart: boolean;
}

export interface HudVehicleSelectionOptions {
  selectedLaps?: HudLapCount;
  aiDifficulty?: HudAiDifficulty;
  raceMode?: HudRaceMode;
  workshop?: HudWorkshopViewModel;
  lobby?: HudLobbyViewModel;
}

/**
 * Pre-race presentation state. Input remains owned by the game shell: the HUD
 * renders this JSON-safe selection but never changes race state itself.
 */
export interface HudPreRaceViewModel {
  active: boolean;
  selectedVehicleClass: GalacticVehicleClass;
  selectedLaps: HudLapCount;
  aiDifficulty: HudAiDifficulty;
  raceMode: HudRaceMode;
  workshop?: HudWorkshopViewModel;
  lobby: HudLobbyViewModel;
  cards: readonly HudVehicleCardViewModel[];
}

export type HudSettingsTab = 'controls' | 'comfort' | 'audio';

export interface HudInputBindingViewModel {
  action: string;
  label: string;
  keyboard: string;
  gamepad: string;
}

export interface HudSettingsViewModel {
  open: boolean;
  activeTab: HudSettingsTab;
  capture: { action: string; device: 'keyboard' | 'gamepad' } | null;
  controls: {
    gamepadDeadzone: number;
    gamepadSensitivity: number;
    steeringAssist: number;
    bindings: readonly HudInputBindingViewModel[];
  };
  comfort: {
    cameraShake: number;
    fovEffects: number;
    motionIntensity: number;
    reducedMotion: boolean;
    highContrast: boolean;
    directionalThreatCues: boolean;
  };
  audio: {
    master: number;
    music: number;
    engine: number;
    effects: number;
    voice: number;
  };
}

export interface HudThreatCueViewModel {
  id: string;
  label: string;
  bearingDegrees: number;
  urgency: number;
  kind: 'weapon' | 'impact' | 'hazard' | 'rival';
}

export type HudLaunchOutcome = 'perfect' | 'good' | 'bog' | 'overheat';

/** Countdown rev matching and the short launch-result sting share one compact surface. */
export interface HudLaunchViewModel {
  stage: 'charging' | 'result';
  rev: number;
  target: number;
  sweetSpotMin: number;
  sweetSpotMax: number;
  heat: number;
  outcome: HudLaunchOutcome | null;
}

export interface HudRaceModeStatusViewModel {
  mode: HudRaceMode;
  name: string;
  objective: string;
  scoreLabel: string;
  scoreValue: string;
  /** Optional normalized objective completion rendered as a thin authored rule. */
  progress: number | null;
}

export type HudRaceDirectorKind =
  | 'sandstorm'
  | 'heatwave'
  | 'lane-collapse'
  | 'gate-blackout'
  | 'shortcut-window';

export interface HudRaceDirectorViewModel {
  id: string;
  kind: HudRaceDirectorKind;
  phase: 'warning' | 'active' | 'end';
  title: string;
  detail: string;
}

export interface HudResultHighlightViewModel {
  id: string;
  title: string;
  detail: string;
  kind: 'photo-finish' | 'fastest-lap' | 'comeback' | 'takedown' | 'clean-race';
  time?: number;
}

export interface HudResultsPresentationViewModel {
  headline?: string;
  photoFinish?: {
    rivalName: string;
    gapSeconds: number;
    won: boolean;
  };
  highlights: readonly HudResultHighlightViewModel[];
}

export type HudSettingPath =
  | 'controls.gamepadDeadzone'
  | 'controls.gamepadSensitivity'
  | 'controls.steeringAssist'
  | 'comfort.cameraShake'
  | 'comfort.fovEffects'
  | 'comfort.motionIntensity'
  | 'comfort.reducedMotion'
  | 'comfort.highContrast'
  | 'comfort.directionalThreatCues'
  | 'audio.master'
  | 'audio.music'
  | 'audio.engine'
  | 'audio.effects'
  | 'audio.voice';

export type RaceHudAction =
  | { type: 'select-ai-difficulty'; difficulty: HudAiDifficulty }
  | { type: 'select-race-mode'; mode: HudRaceMode }
  | { type: 'toggle-workshop'; open: boolean }
  | { type: 'select-workshop-slot'; slot: HudWorkshopSlot }
  | { type: 'equip-workshop-part'; slot: HudWorkshopSlot; partId: string }
  | { type: 'resume-race' }
  | { type: 'toggle-settings'; open: boolean }
  | { type: 'select-settings-tab'; tab: HudSettingsTab }
  | { type: 'change-setting'; setting: HudSettingPath; value: number | boolean }
  | { type: 'request-remap'; action: string; device: 'keyboard' | 'gamepad' }
  | { type: 'view-highlight'; highlightId: string };

/** Compact combat/progression state kept at the edge of the racing HUD. */
export interface HudGalacticViewModel {
  vehicleClass: string;
  shieldRemaining: number;
  shieldActive: boolean;
  shieldCooldown: number;
  shieldDuration: number;
  weaponName: string;
  weaponCooldown: number;
  weaponCooldownDuration: number;
  weaponTarget: string | null;
  weaponShots: number;
  weaponHits: number;
  mineCount: number;
  redlineHeat: number;
  redlineActive: boolean;
  statusLabel: string | null;
  statusIntensity: number;
  wreckPhase: HudGalacticWreckPhase | null;
  wreckTimer: number;
  upgrades: readonly string[];
  takedowns: number;
}

/**
 * Plain, JSON-safe state consumed by the DOM HUD. It deliberately mirrors no
 * simulation class, which keeps race truth on the simulation side of the app.
 */
export interface RaceHudViewModel {
  phase: HudRacePhase;
  speedMps: number;
  normalizedSpeed: number;
  lap: number;
  totalLaps: number;
  position: number;
  racerCount: number;
  raceTime: number;
  lastSplit: number | null;
  splitDelta: number | null;
  boost: number;
  boostActive: boolean;
  driftCharge: number;
  heat: number;
  damage: number;
  wrongWay: boolean;
  /** True once the repulsorlift no longer has terrain support. */
  airborne?: boolean;
  /** Average probe clearance above the procedural terrain, in metres. */
  groundClearance?: number;
  /** World-space vertical velocity used for the landing/bracing cue. */
  verticalSpeed?: number;
  corner: HudCornerViewModel;
  countdownCue: 3 | 2 | 1 | 0 | 'go' | null;
  course: readonly HudCoursePoint[];
  /** Optional structured alternate routes. Legacy branch-tagged course points remain supported. */
  courseBranches?: readonly HudCourseBranchViewModel[];
  racers: readonly HudRacerViewModel[];
  results: readonly HudResultViewModel[];
  resultsPresentation?: HudResultsPresentationViewModel;
  preRace?: HudPreRaceViewModel;
  settings?: HudSettingsViewModel;
  threats?: readonly HudThreatCueViewModel[];
  launch?: HudLaunchViewModel;
  raceModeStatus?: HudRaceModeStatusViewModel;
  directorEvent?: HudRaceDirectorViewModel;
  controlsVisible?: boolean;
  /** Absent for the original race rules, allowing legacy snapshots to render unchanged. */
  galactic?: HudGalacticViewModel;
}

export interface RaceHudSnapshotEntryLike {
  id: string;
  name: string;
  isPlayer: boolean;
  status?: string;
  vehicle: {
    position: { x: number; z: number };
    velocity?: { y: number };
    telemetry: { speed: number; normalizedSpeed?: number; groundClearance?: number };
    boost: { energy: number; active?: boolean };
    drift?: { charge?: number };
    heat: number;
    damage: number;
    grounded?: boolean;
    airborneTime?: number;
  };
  progress: {
    courseProgress: number;
    completedLaps: number;
    currentLap: number;
    placement: number | null;
    wrongWay: boolean;
    cornerPreview: {
      direction: HudCornerDirection;
      severity: number;
      distance: number;
      tag?: string;
    };
    splits?: readonly {
      lap: number;
      checkpointIndex: number;
      raceTime: number;
      segmentTime: number;
    }[];
  };
  galactic?: GalacticRacerState;
  launch?: {
    outcome: 'pending' | HudLaunchOutcome;
    targetThrottle: number;
    displayedRev: number;
    engineHeat: number;
  };
  competition?: {
    teamId: 'sun' | 'shadow';
    score: number;
    checkpointsPassed: number;
    survivalLives: number;
  };
}

export interface RaceHudSnapshotLike {
  phase: HudRacePhase;
  countdownRemaining?: number;
  countdownCue?: 3 | 2 | 1 | 0;
  raceTime: number;
  totalLaps: number;
  settings?: { mode: HudRaceMode };
  modeState?: {
    mode: HudRaceMode;
    objectiveTarget: number;
    nextEliminationAt: number;
    teamScores: { sun: number; shadow: number };
  };
  director?: {
    events: readonly {
      id: string;
      kind: HudRaceDirectorKind;
      sectionTag: string;
      duration: number;
      phase: 'pending' | 'warning' | 'active' | 'complete';
      activatedAt: number | null;
      completedAt: number | null;
      side: -1 | 1;
    }[];
  };
  entries: readonly RaceHudSnapshotEntryLike[];
  results?: readonly {
    id: string;
    name: string;
    placement: number;
    finishTime: number | null;
    lapTimes?: readonly number[];
  }[];
}

export interface DeriveRaceHudOptions {
  course?: readonly HudCoursePoint[];
  courseBranches?: readonly HudCourseBranchViewModel[];
  controlsVisible?: boolean;
  playerId?: string;
  preRace?: HudPreRaceViewModel;
  settings?: HudSettingsViewModel;
  threats?: readonly HudThreatCueViewModel[];
  resultsPresentation?: HudResultsPresentationViewModel;
  /** Explicit values override automatic derivation from a full RaceSimulation snapshot; null hides. */
  launch?: HudLaunchViewModel | null;
  raceModeStatus?: HudRaceModeStatusViewModel | null;
  directorEvent?: HudRaceDirectorViewModel | null;
}
