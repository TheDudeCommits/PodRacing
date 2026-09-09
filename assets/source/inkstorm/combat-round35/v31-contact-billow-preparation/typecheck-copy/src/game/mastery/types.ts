import type { GalacticVehicleClass, WorkshopLoadout } from '../galactic/types';
import type { AIDifficulty, RaceMode } from '../race/types';

export type CompetitionProfile = 'chaos' | 'clean-race' | 'time-trial' | 'training';
export type MasteryMedal = 'none' | 'bronze' | 'silver' | 'gold';
export interface MasteryEvent {
  id: string;
  title: string;
  subtitle: string;
  courseId: string;
  seed: number;
  mode: RaceMode;
  profile: CompetitionProfile;
  laps: 1 | 2 | 3;
  difficulty: AIDifficulty;
  stock: boolean;
  medalTimes: { gold: number; silver: number; bronze: number };
  championshipRound?: number;
  dailyDate?: string;
}

/** Every competitive condition belongs to the identity, including the tune. */
export interface RecordIdentity {
  version: 1;
  courseId: string;
  courseSeed: number;
  generatorVersion: string;
  physicsVersion: string;
  rulesVersion: string;
  eventId: string;
  directorSeed: number;
  profile: CompetitionProfile;
  mode: RaceMode;
  laps: number;
  difficulty: AIDifficulty;
  vehicleClass: GalacticVehicleClass;
  loadoutKey: string;
  tuneKey: string;
}

/** Compact pose tuple: time, position xyz, yaw, pitch, roll, bank. */
export type GhostFrame = [number, number, number, number, number, number, number, number];
export interface GhostRun {
  version: 1;
  identityKey: string;
  duration: number;
  sampleHz: 10;
  frames: GhostFrame[];
}
export interface GhostPose {
  x: number; y: number; z: number;
  yaw: number; pitch: number; roll: number; bank: number;
}
export interface MasteryRecord {
  identity: RecordIdentity;
  time: number;
  lapTimes: number[];
  sectors: number[];
  medal: MasteryMedal;
  recordedAt: string;
  ghost: GhostRun | null;
}
export interface SavedCourse {
  id: string;
  title: string;
  seed: number;
  generatorVersion: string;
  savedAt: string;
}
export interface ChampionshipRound {
  eventId: string;
  results: { id: string; name: string; placement: number; points: number }[];
}
export interface MasteryProfile {
  version: 1;
  records: Record<string, MasteryRecord>;
  favorites: SavedCourse[];
  /** Past editions remain historical metadata, never active targets or ghosts. */
  archivedRecords: MasteryRecord[];
  archivedFavorites: SavedCourse[];
  history: { id: string; eventId: string; time: number; placement: number; medal: MasteryMedal; valid: boolean; recordedAt: string }[];
  championship: { version: 1; rounds: ChampionshipRound[] };
  tutorialComplete: boolean;
  ghostEnabled: boolean;
}
export interface MasterySector {
  index: number;
  lap?: number;
  label?: string;
  time: number;
  delta: number | null;
  paceDelta?: number | null;
}
export interface MasteryRetryTarget {
  sectorIndex: number;
  lap: number;
  label: string;
  loss: number;
  currentTime: number;
  targetTime: number;
}
export interface MasteryResult {
  eventTitle: string;
  time: number;
  personalBest: boolean;
  bestTime: number | null;
  improvement: number | null;
  medal: MasteryMedal;
  nextMedal: { medal: Exclude<MasteryMedal, 'none'>; time: number } | null;
  sectors: MasterySector[];
  invalidReason: string | null;
  nextEventId: string | null;
  nextObjective: string;
  retryTarget?: MasteryRetryTarget | null;
}
export interface TutorialCue {
  step: number;
  total: number;
  title: string;
  instruction: string;
  progress: number;
  complete: boolean;
}
/** DOM-independent projection for the HUD; seconds remain numeric. */
export interface HudMasteryViewModel {
  eventId: string;
  eventTitle: string;
  eventSubtitle: string;
  events: { id: string; title: string; subtitle: string }[];
  bestTime: number | null;
  medal: MasteryMedal;
  ghostAvailable: boolean;
  ghostEnabled: boolean;
  courseSaved: boolean;
  latestSector: MasterySector | null;
  retryTarget?: MasteryRetryTarget | null;
  tutorial: TutorialCue | null;
  result: MasteryResult | null;
  championship: { name: string; points: number; isPlayer: boolean }[];
  championshipRound: number;
  championshipContext?: { title: string; detail: string; actionLabel?: string };
  storageWarning: string | null;
  archiveNotice?: string | null;
}

export interface MasteryStartOptions {
  event: MasteryEvent;
  courseSeed: number;
  directorSeed: number;
  vehicleClass: GalacticVehicleClass;
  loadout?: WorkshopLoadout | null;
  /** Stable serialization of the effective base tune, not only its label. */
  tune?: unknown;
  playerId?: string;
  /** Review hooks and online sessions must not write local competitive records. */
  recordEligible?: boolean;
  /** Presentation only; keyed by authoritative checkpoint index, not record identity. */
  sectorLabels?: readonly string[];
}
