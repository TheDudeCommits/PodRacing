import { GALACTIC_VEHICLES, GALACTIC_VEHICLE_ORDER } from '../game/galactic/catalog';
import {
  DEFAULT_WORKSHOP_LOADOUTS,
  WORKSHOP_PARTS,
  WORKSHOP_PARTS_BY_SLOT,
  WORKSHOP_SLOTS,
  deriveWorkshopSummary,
  sanitizeWorkshopLoadout,
  type WorkshopPartDefinition,
  type WorkshopSlot,
  type WorkshopStat,
} from '../game/galactic';
import {
  GAMEPAD_BINDING_ACTIONS,
  KEYBOARD_BINDING_ACTIONS,
  type GamepadControlBinding,
} from '../game/input';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '../game/settings';
import type {
  GalacticRacerState,
  GalacticStatusState,
  GalacticVehicleClass,
} from '../game/galactic/types';
import type {
  DeriveRaceHudOptions,
  HudAiDifficulty,
  HudCornerDirection,
  HudGalacticViewModel,
  HudLaunchOutcome,
  HudLaunchViewModel,
  HudLapCount,
  HudLobbyViewModel,
  HudRaceDirectorKind,
  HudRaceDirectorViewModel,
  HudResultViewModel,
  HudVehicleCardViewModel,
  HudVehicleStatViewModel,
  HudPreRaceViewModel,
  HudRaceMode,
  HudRaceModeStatusViewModel,
  HudSettingsTab,
  HudSettingsViewModel,
  HudVehicleSelectionOptions,
  HudWorkshopPartViewModel,
  HudWorkshopSlotViewModel,
  HudWorkshopViewModel,
  RaceHudSnapshotEntryLike,
  RaceHudSnapshotLike,
  RaceHudViewModel,
} from './types';

const DEFAULT_MAX_SPEED_MPS = 212;

const VEHICLE_CARD_ACCENTS: Readonly<Record<GalacticVehicleClass, string>> = Object.freeze({
  podracer: '#ef694d',
  landspeeder: '#f2b55f',
  'speeder-bike': '#53d9ff',
  'skim-speeder': '#78f29a',
});

/** Selection copy stays intentionally glanceable; mechanical detail belongs in the bars. */
const VEHICLE_CARD_BLURBS: Readonly<Record<GalacticVehicleClass, string>> = Object.freeze({
  podracer: 'Balanced twin-engine power built to hold the lead.',
  landspeeder: 'Heavy armour and weaponry built to survive hard contact.',
  'speeder-bike': 'Explosive acceleration made for fearless overtakes.',
  'skim-speeder': 'Precision drift control for chaining corner boosts.',
});

function vehicleRating(value: number): HudVehicleStatViewModel['value'] {
  return Math.min(5, Math.max(1, Math.round(Number.isFinite(value) ? value : 1))) as HudVehicleStatViewModel['value'];
}

export const HUD_VEHICLE_CARDS: readonly HudVehicleCardViewModel[] = Object.freeze(
  GALACTIC_VEHICLE_ORDER.map((id) => Object.freeze({
    id,
    name: GALACTIC_VEHICLES[id].label,
    description: VEHICLE_CARD_BLURBS[id],
    accent: VEHICLE_CARD_ACCENTS[id],
    stats: Object.freeze([
      { label: 'Speed', value: vehicleRating(GALACTIC_VEHICLES[id].stats.speed) },
      { label: 'Acceleration', value: vehicleRating(GALACTIC_VEHICLES[id].stats.acceleration) },
      { label: 'Drift', value: vehicleRating(GALACTIC_VEHICLES[id].stats.drift) },
      { label: 'Defense', value: vehicleRating(GALACTIC_VEHICLES[id].stats.defence) },
      { label: 'Weapons', value: vehicleRating(GALACTIC_VEHICLES[id].stats.weapons) },
    ] satisfies readonly HudVehicleStatViewModel[]),
  })),
);

export const HUD_SOLO_LOBBY: HudLobbyViewModel = Object.freeze({
  role: 'solo',
  roomCode: '',
  status: 'idle',
  statusText: 'Solo race ready',
  members: Object.freeze([
    Object.freeze({ id: 'local', name: 'You', isHost: true, isLocal: true }),
  ]),
  capacity: 4,
  canStart: true,
});

export const HUD_AI_DIFFICULTIES: readonly HudAiDifficulty[] = Object.freeze([
  'easy',
  'medium',
  'hard',
]);

export const HUD_RACE_MODES: readonly Readonly<{ id: HudRaceMode; label: string }>[] = Object.freeze([
  Object.freeze({ id: 'circuit', label: 'Circuit' }),
  Object.freeze({ id: 'eliminator', label: 'Eliminator' }),
  Object.freeze({ id: 'checkpoint-sprint', label: 'Checkpoint Sprint' }),
  Object.freeze({ id: 'combat-race', label: 'Combat' }),
  Object.freeze({ id: 'survival-gauntlet', label: 'Survival' }),
  Object.freeze({ id: 'drift-trial', label: 'Drift Trial' }),
  Object.freeze({ id: 'team-race', label: 'Team Race' }),
]);

const RACE_MODE_COPY: Readonly<Record<HudRaceMode, Readonly<{ name: string; objective: string }>>> = Object.freeze({
  circuit: Object.freeze({ name: 'Circuit', objective: 'Finish first when the final lap closes' }),
  eliminator: Object.freeze({ name: 'Eliminator', objective: 'Stay clear of last place at every cutoff' }),
  'checkpoint-sprint': Object.freeze({ name: 'Checkpoint Sprint', objective: 'Clear the full gate chain before your rivals' }),
  'combat-race': Object.freeze({ name: 'Combat', objective: 'Score through hits, hazards and takedowns' }),
  'survival-gauntlet': Object.freeze({ name: 'Survival', objective: 'Protect your lives through the gauntlet' }),
  'drift-trial': Object.freeze({ name: 'Drift Trial', objective: 'Bank points through long chained drifts' }),
  'team-race': Object.freeze({ name: 'Team Race', objective: 'Push your squad to the highest combined score' }),
});

export interface CreateRaceModeStatusOptions {
  lap?: number;
  totalLaps?: number;
  position?: number;
  racerCount?: number;
  score?: number;
  objectiveTarget?: number;
  checkpointsPassed?: number;
  survivalLives?: number;
  nextEliminationAt?: number;
  raceTime?: number;
  teamId?: 'sun' | 'shadow';
  teamScores?: Readonly<{ sun: number; shadow: number }>;
}

function readableScore(value: number): string {
  return Math.max(0, Math.round(finite(value))).toLocaleString('en-US');
}

/** Creates the compact objective/scoring readout shared by every race mode. */
export function createRaceModeStatusViewModel(
  mode: HudRaceMode,
  options: CreateRaceModeStatusOptions = {},
): HudRaceModeStatusViewModel {
  const copy = RACE_MODE_COPY[mode];
  const score = Math.max(0, finite(options.score));
  const target = Math.max(1, finite(options.objectiveTarget, 1));
  const lap = Math.max(1, Math.floor(finite(options.lap, 1)));
  const totalLaps = Math.max(1, Math.floor(finite(options.totalLaps, 3)));
  const position = Math.max(1, Math.floor(finite(options.position, 1)));
  const racerCount = Math.max(1, Math.floor(finite(options.racerCount, 4)));
  switch (mode) {
    case 'circuit':
      return {
        mode, ...copy, scoreLabel: 'Race order', scoreValue: `${position} / ${racerCount}`,
        progress: clampUnit((lap - 1) / totalLaps),
      };
    case 'eliminator': {
      const remaining = Math.max(0, Math.ceil(finite(options.nextEliminationAt) - finite(options.raceTime)));
      return {
        mode, ...copy, scoreLabel: 'Next cutoff', scoreValue: `${remaining} S`,
        progress: null,
      };
    }
    case 'checkpoint-sprint': {
      const checkpoints = Math.max(0, Math.floor(finite(options.checkpointsPassed)));
      return {
        mode, ...copy, scoreLabel: 'Gates', scoreValue: `${checkpoints} / ${Math.round(target)}`,
        progress: clampUnit(checkpoints / target),
      };
    }
    case 'survival-gauntlet': {
      const lives = Math.max(0, Math.floor(finite(options.survivalLives, 3)));
      return { mode, ...copy, scoreLabel: 'Lives', scoreValue: String(lives), progress: clampUnit(lives / 3) };
    }
    case 'team-race': {
      const scores = options.teamScores ?? { sun: 0, shadow: 0 };
      const ownTeam = options.teamId ?? 'sun';
      const own = Math.max(0, finite(scores[ownTeam]));
      const rival = Math.max(0, finite(scores[ownTeam === 'sun' ? 'shadow' : 'sun']));
      return {
        mode, ...copy, scoreLabel: `${ownTeam.toUpperCase()} / RIVAL`,
        scoreValue: `${readableScore(own)} / ${readableScore(rival)}`,
        progress: own + rival <= 0 ? 0 : clampUnit(own / (own + rival)),
      };
    }
    case 'combat-race':
    case 'drift-trial':
      return {
        mode, ...copy, scoreLabel: 'Score',
        scoreValue: `${readableScore(score)} / ${readableScore(target)}`,
        progress: clampUnit(score / target),
      };
  }
}

interface LaunchHudStateLike {
  outcome: 'pending' | HudLaunchOutcome;
  targetThrottle: number;
  displayedRev: number;
  engineHeat: number;
}

/** Returns undefined outside the countdown and the short launch-result window. */
export function createPerfectLaunchHudViewModel(
  state: Readonly<LaunchHudStateLike> | undefined,
  phase: RaceHudSnapshotLike['phase'],
  raceTime: number,
): HudLaunchViewModel | undefined {
  if (!state) return undefined;
  const charging = phase === 'countdown' && state.outcome === 'pending';
  if (!charging && (state.outcome === 'pending' || finite(raceTime) > 1.8)) return undefined;
  const target = clampUnit(state.targetThrottle);
  return {
    stage: charging ? 'charging' : 'result',
    rev: clampUnit(state.displayedRev),
    target,
    sweetSpotMin: clampUnit(target - 0.105),
    sweetSpotMax: clampUnit(target + 0.105),
    heat: clampUnit(state.engineHeat),
    outcome: state.outcome === 'pending' ? null : state.outcome,
  };
}

interface RaceDirectorStateLike {
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
}

const DIRECTOR_COPY: Readonly<Record<HudRaceDirectorKind, Readonly<{
  warning: string;
  active: string;
  end: string;
  warningDetail: string;
  activeDetail: string;
}>>> = Object.freeze({
  sandstorm: Object.freeze({ warning: 'Sandstorm inbound', active: 'Sandstorm active', end: 'Sandstorm cleared', warningDetail: 'Crosswind and low visibility ahead', activeDetail: 'Read the pylons // Hold your line' }),
  heatwave: Object.freeze({ warning: 'Thermal surge inbound', active: 'Heatwave active', end: 'Core temperature normal', warningDetail: 'Cooling efficiency will fall', activeDetail: 'Manage redline // Protect the engines' }),
  'lane-collapse': Object.freeze({ warning: 'Track collapse ahead', active: 'Lane collapse active', end: 'Route stabilized', warningDetail: 'One side of the course will close', activeDetail: 'Follow the open racing line' }),
  'gate-blackout': Object.freeze({ warning: 'Gate blackout inbound', active: 'Gate blackout active', end: 'Gate power restored', warningDetail: 'Checkpoint lights will drop', activeDetail: 'Trust the course markers' }),
  'shortcut-window': Object.freeze({ warning: 'Shortcut opening', active: 'Shortcut live', end: 'Shortcut closed', warningDetail: 'High-risk route about to unlock', activeDetail: 'Alternate route // Limited window' }),
});

/** Selects one deterministic warning/active/recently-ended Race Director event. */
export function createRaceDirectorHudViewModel(
  state: Readonly<RaceDirectorStateLike> | undefined,
  raceTime: number,
): HudRaceDirectorViewModel | undefined {
  if (!state) return undefined;
  const now = Math.max(0, finite(raceTime));
  const event = state.events.find((candidate) => candidate.phase === 'active')
    ?? state.events.find((candidate) => candidate.phase === 'warning')
    ?? [...state.events]
      .filter((candidate) => candidate.phase === 'complete'
        && candidate.completedAt !== null
        && now - candidate.completedAt <= 2.4)
      .sort((left, right) => (right.completedAt ?? 0) - (left.completedAt ?? 0))[0];
  if (!event) return undefined;
  const phase = event.phase === 'complete' ? 'end' : event.phase;
  if (phase === 'pending') return undefined;
  const copy = DIRECTOR_COPY[event.kind];
  const section = readableLabel(event.sectionTag, 'course').toUpperCase();
  const side = event.kind === 'lane-collapse'
    ? `${event.side > 0 ? 'RIGHT LANE BLOCKED // MOVE LEFT' : 'LEFT LANE BLOCKED // MOVE RIGHT'}`
    : '';
  return {
    id: event.id,
    kind: event.kind,
    phase,
    title: copy[phase],
    detail: phase === 'warning'
      ? `${section} // ${copy.warningDetail}`
      : phase === 'active'
        ? event.kind === 'lane-collapse' ? side : `${side}${copy.activeDetail}`
        : `${section} // Event clear`,
  };
}

const WORKSHOP_SLOT_LABELS: Readonly<Record<WorkshopSlot, string>> = Object.freeze({
  engine: 'Engine', cooling: 'Cooling', armour: 'Armour', steering: 'Steering', gadget: 'Gadget',
});

const WORKSHOP_STAT_LABELS: Readonly<Record<WorkshopStat, string>> = Object.freeze({
  topSpeed: 'top speed', acceleration: 'acceleration', boost: 'boost', cooling: 'cooling',
  armour: 'armour', handling: 'handling', drift: 'drift', weaponPower: 'weapon power',
  shield: 'shield', mineCapacity: 'mine capacity',
});

function modifierLabel(stat: WorkshopStat, amount: number): string {
  const sign = amount >= 0 ? '+' : '−';
  return `${sign}${Math.round(Math.abs(amount) * 100)}% ${WORKSHOP_STAT_LABELS[stat]}`;
}

function partEffects(part: WorkshopPartDefinition, positive: boolean): string {
  const modifiers = part.modifiers.filter((modifier) => positive ? modifier.amount > 0 : modifier.amount < 0);
  return modifiers.slice(0, 2).map((modifier) => modifierLabel(modifier.stat, modifier.amount)).join(' • ')
    || (positive ? 'Balanced output' : 'No major penalty');
}

export interface CreateWorkshopHudOptions {
  open?: boolean;
  activeSlot?: WorkshopSlot;
}

/** Maps the pure workshop domain into compact, callback-free selector presentation. */
export function createWorkshopHudViewModel(
  vehicleClass: GalacticVehicleClass,
  loadout: unknown = DEFAULT_WORKSHOP_LOADOUTS[vehicleClass],
  options: CreateWorkshopHudOptions = {},
): HudWorkshopViewModel {
  const safeLoadout = sanitizeWorkshopLoadout(loadout, vehicleClass);
  const summary = deriveWorkshopSummary(safeLoadout, vehicleClass);
  const activeSlot = WORKSHOP_SLOTS.includes(options.activeSlot ?? 'engine')
    ? options.activeSlot ?? 'engine'
    : 'engine';
  const slots: HudWorkshopSlotViewModel[] = WORKSHOP_SLOTS.map((slot) => {
    const part = WORKSHOP_PARTS[safeLoadout.slots[slot]];
    return {
      slot,
      label: WORKSHOP_SLOT_LABELS[slot],
      equippedPartId: part.id,
      equippedPartName: part.name,
      effect: partEffects(part, true),
    };
  });
  const parts: HudWorkshopPartViewModel[] = WORKSHOP_SLOTS.flatMap((slot) =>
    WORKSHOP_PARTS_BY_SLOT[slot].map((partId) => {
      const part = WORKSHOP_PARTS[partId];
      return {
        id: part.id,
        slot,
        name: part.name,
        description: part.description,
        benefit: partEffects(part, true),
        tradeoff: partEffects(part, false),
        equipped: safeLoadout.slots[slot] === part.id,
      };
    }),
  );
  return {
    open: options.open ?? false,
    activeSlot,
    slots,
    parts,
    summary: {
      bonuses: summary.bonuses.map((effect) => modifierLabel(effect.stat, effect.amount)),
      penalties: summary.penalties.map((effect) => modifierLabel(effect.stat, effect.amount)),
      synergies: summary.synergies.map((synergy) => `${synergy.name}: ${synergy.description}`),
    },
  };
}

const BINDING_LABELS: Readonly<Record<string, string>> = Object.freeze({
  throttle: 'Throttle', brake: 'Brake', steer: 'Analog steer', steerLeft: 'Steer left',
  steerRight: 'Steer right', drift: 'Drift', boost: 'Redline', fire: 'Heat Lance',
  mine: 'Mine', shield: 'Shield', cycleVehicle: 'Cycle vehicle', reset: 'Recover', pause: 'Pause',
});

function readableKey(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('Arrow', '').replace('Left', ' L').replace('Right', ' R');
}

function readableGamepadBinding(binding: GamepadControlBinding): string {
  if (binding.type === 'button') {
    const names: Readonly<Record<number, string>> = {
      0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
      8: 'View', 9: 'Menu', 12: 'D-pad ↑', 13: 'D-pad ↓', 14: 'D-pad ←', 15: 'D-pad →',
    };
    return names[binding.index] ?? `Button ${binding.index}`;
  }
  const axis = binding.index === 0 ? 'LS X' : binding.index === 1 ? 'LS Y' : `Axis ${binding.index}`;
  return `${binding.scale < 0 ? '−' : ''}${axis}`;
}

export interface CreateSettingsHudOptions {
  open?: boolean;
  activeTab?: HudSettingsTab;
  capture?: HudSettingsViewModel['capture'];
}

/** Produces a stable settings/pause model from the versioned saved document. */
export function createSettingsHudViewModel(
  settings: Readonly<GameSettings> = DEFAULT_GAME_SETTINGS,
  options: CreateSettingsHudOptions = {},
): HudSettingsViewModel {
  const actions = KEYBOARD_BINDING_ACTIONS.filter((action) => GAMEPAD_BINDING_ACTIONS.includes(action));
  return {
    open: options.open ?? false,
    activeTab: options.activeTab ?? 'controls',
    capture: options.capture ?? null,
    controls: {
      ...settings.controls,
      bindings: actions.map((action) => ({
        action,
        label: BINDING_LABELS[action] ?? action,
        keyboard: settings.keyboardBindings[action].map(readableKey).join(' / ') || 'Unbound',
        gamepad: settings.gamepadBindings[action].map(readableGamepadBinding).join(' / ') || 'Unbound',
      })),
    },
    comfort: { ...settings.comfort },
    audio: { ...settings.audio },
  };
}

/** Creates the immutable, callback-free model consumed by the pre-race HUD. */
export function createVehicleSelectionViewModel(
  selectedVehicleClass: GalacticVehicleClass = 'podracer',
  active = true,
  options: HudVehicleSelectionOptions = {},
): HudPreRaceViewModel {
  const safeSelectedId = GALACTIC_VEHICLE_ORDER.includes(selectedVehicleClass)
    ? selectedVehicleClass
    : 'podracer';
  return {
    active,
    selectedVehicleClass: safeSelectedId,
    selectedLaps: ([1, 2, 3] as const).includes(options.selectedLaps ?? 3)
      ? options.selectedLaps ?? 3
      : 3 as HudLapCount,
    aiDifficulty: HUD_AI_DIFFICULTIES.includes(options.aiDifficulty ?? 'medium')
      ? options.aiDifficulty ?? 'medium'
      : 'medium',
    raceMode: HUD_RACE_MODES.some((mode) => mode.id === options.raceMode)
      ? options.raceMode ?? 'circuit'
      : 'circuit',
    workshop: options.workshop ?? createWorkshopHudViewModel(safeSelectedId),
    lobby: options.lobby ?? HUD_SOLO_LOBBY,
    cards: HUD_VEHICLE_CARDS,
  };
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function formatSpeed(speedMps: number): string {
  const safeSpeed = Number.isFinite(speedMps) ? Math.max(0, speedMps) : 0;
  return String(Math.min(999, Math.round(safeSpeed * 3.6))).padStart(3, '0');
}

export function formatRaceTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '—:——.———';
  }
  const milliseconds = Math.floor(seconds * 1_000 + 1e-6);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  const body = `${String(wholeSeconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${body}`;
  return `${minutes}:${body}`;
}

/** Compact live-race clock. Results retain millisecond precision. */
export function formatRaceTimeHundredths(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '—:——.——';
  }
  const centiseconds = Math.floor(seconds * 100 + 1e-6);
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const wholeSeconds = Math.floor((centiseconds % 6_000) / 100);
  const hundredths = centiseconds % 100;
  const body = `${String(wholeSeconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${body}`;
  return `${minutes}:${body}`;
}

export function formatSplitDelta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const prefix = seconds > 0 ? '+' : seconds < 0 ? '−' : '±';
  return `${prefix}${Math.abs(seconds).toFixed(3)}`;
}

export function formatOrdinal(value: number): string {
  const integer = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
  const mod100 = integer % 100;
  const suffix = mod100 >= 11 && mod100 <= 13
    ? 'TH'
    : integer % 10 === 1
      ? 'ST'
      : integer % 10 === 2
        ? 'ND'
        : integer % 10 === 3
          ? 'RD'
          : 'TH';
  return `${integer}${suffix}`;
}

export function cornerGlyph(direction: HudCornerDirection, severity: number): string {
  if (direction === 'straight') return '↑';
  const hard = clampUnit(severity) >= 0.58;
  if (direction === 'left') return hard ? '↰' : '↖';
  return hard ? '↱' : '↗';
}

function finite(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readableLabel(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim().replaceAll(/[-_]+/g, ' ');
  return normalized ? normalized : fallback;
}

const STATUS_LABELS: readonly [keyof GalacticStatusState, string][] = [
  ['rockfallStun', 'rockfall stun'],
  ['ionized', 'ion interference'],
  ['heatVent', 'heat vent'],
  ['sandGeyser', 'sand geyser'],
  ['dustInterference', 'dust interference'],
];

function strongestStatus(status: Readonly<GalacticStatusState>): {
  label: string | null;
  intensity: number;
} {
  let label: string | null = null;
  let remaining = 0;
  for (const [key, nextLabel] of STATUS_LABELS) {
    const next = Math.max(0, finite(status[key]));
    if (next > remaining) {
      remaining = next;
      label = nextLabel;
    }
  }
  return { label, intensity: clampUnit(remaining) };
}

function upgradeLabels(state: Readonly<GalacticRacerState>): string[] {
  const labels: string[] = [];
  if (state.upgrades.afterburner > 0) labels.push(`afterburner ${state.upgrades.afterburner}`);
  if (state.upgrades.cornering > 0) labels.push(`cornering ${state.upgrades.cornering}`);
  if (state.upgrades.resilience > 0) labels.push(`resilience ${state.upgrades.resilience}`);
  for (const part of state.upgrades.parts) {
    const label = readableLabel(part, '');
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

/** Sanitizes the optional expansion state without importing simulation types. */
export function deriveGalacticHudViewModel(
  state: GalacticRacerState | undefined,
): HudGalacticViewModel | undefined {
  if (!state) return undefined;
  const definition = GALACTIC_VEHICLES[state.vehicleClass];
  const status = strongestStatus(state.status);
  return {
    vehicleClass: definition.label,
    shieldRemaining: Math.max(0, finite(state.shield.remaining)),
    shieldActive: state.shield.active,
    shieldCooldown: Math.max(0, finite(state.shield.cooldown)),
    shieldDuration: definition.shieldDuration,
    weaponName: 'Heat Lance',
    weaponCooldown: Math.max(0, finite(state.weapon.cooldown)),
    weaponCooldownDuration: definition.weaponCooldown,
    weaponTarget: null,
    weaponShots: Math.max(0, Math.floor(finite(state.weapon.shotsFired))),
    weaponHits: Math.max(0, Math.floor(finite(state.weapon.hits))),
    mineCount: Math.min(99, Math.max(0, Math.floor(finite(state.mine.charges)))),
    redlineHeat: clampUnit(state.redline.heat),
    redlineActive: state.redline.active,
    statusLabel: status.label,
    statusIntensity: status.intensity,
    wreckPhase: state.wreck.phase === 'running' ? null : state.wreck.phase,
    wreckTimer: Math.max(0, finite(
      state.wreck.phase === 'recovering' && state.wreck.invulnerable > 0
        ? state.wreck.invulnerable
        : state.wreck.timer,
    )),
    upgrades: upgradeLabels(state),
    takedowns: Math.min(999, Math.max(0, Math.floor(finite(state.takedowns)))),
  };
}

function racerScore(entry: RaceHudSnapshotEntryLike): number {
  return Math.max(0, finite(entry.progress.completedLaps)) + clampUnit(entry.progress.courseProgress);
}

function derivePlacement(entry: RaceHudSnapshotEntryLike, entries: readonly RaceHudSnapshotEntryLike[]): number {
  if (entry.progress.placement !== null && Number.isFinite(entry.progress.placement)) {
    return Math.max(1, Math.floor(entry.progress.placement));
  }
  const ordered = [...entries].sort((a, b) => racerScore(b) - racerScore(a) || a.id.localeCompare(b.id));
  return Math.max(1, ordered.findIndex((candidate) => candidate.id === entry.id) + 1);
}

function bestLap(lapTimes: readonly number[] | undefined): number | null {
  if (!lapTimes) return null;
  let best = Number.POSITIVE_INFINITY;
  for (const lapTime of lapTimes) {
    if (Number.isFinite(lapTime) && lapTime >= 0) best = Math.min(best, lapTime);
  }
  return Number.isFinite(best) ? best : null;
}

function deriveResults(
  snapshot: RaceHudSnapshotLike,
  playerId: string,
): HudResultViewModel[] {
  const source = snapshot.results && snapshot.results.length > 0
    ? snapshot.results
    : snapshot.entries
        .filter((entry) => entry.status === 'finished')
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          placement: derivePlacement(entry, snapshot.entries),
          finishTime: null,
          lapTimes: [] as readonly number[],
        }));
  return source
    .map((result) => ({
      id: result.id,
      name: result.name,
      placement: Math.max(1, Math.floor(finite(result.placement, 4))),
      finishTime: result.finishTime !== null ? finite(result.finishTime) : null,
      bestLap: bestLap(result.lapTimes),
      isPlayer: result.id === playerId,
    }))
    .sort((a, b) => a.placement - b.placement || a.id.localeCompare(b.id));
}

function deriveSplit(
  player: RaceHudSnapshotEntryLike,
  entries: readonly RaceHudSnapshotEntryLike[],
): { lastSplit: number | null; splitDelta: number | null } {
  const splits = player.progress.splits ?? [];
  const last = splits[splits.length - 1];
  if (!last || !Number.isFinite(last.segmentTime)) return { lastSplit: null, splitDelta: null };
  let benchmark = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    if (entry.id === player.id) continue;
    const matching = (entry.progress.splits ?? []).find((split) =>
      split.lap === last.lap && split.checkpointIndex === last.checkpointIndex,
    );
    if (matching && Number.isFinite(matching.segmentTime)) {
      benchmark = Math.min(benchmark, matching.segmentTime);
    }
  }
  return {
    lastSplit: Math.max(0, last.segmentTime),
    splitDelta: Number.isFinite(benchmark) ? last.segmentTime - benchmark : null,
  };
}

/** Adapts structural race state into the stable, JSON-only HUD contract. */
export function deriveRaceHudViewModel(
  snapshot: RaceHudSnapshotLike,
  options: DeriveRaceHudOptions = {},
): RaceHudViewModel {
  const player = snapshot.entries.find((entry) =>
    options.playerId ? entry.id === options.playerId : entry.isPlayer,
  ) ?? snapshot.entries[0];
  if (!player) throw new RangeError('A HUD snapshot needs at least one racer.');
  const playerId = options.playerId ?? player.id;
  const position = derivePlacement(player, snapshot.entries);
  const split = deriveSplit(player, snapshot.entries);
  const preview = player.progress.cornerPreview;
  const normalizedSpeed = player.vehicle.telemetry.normalizedSpeed === undefined
    ? clampUnit(player.vehicle.telemetry.speed / DEFAULT_MAX_SPEED_MPS)
    : clampUnit(player.vehicle.telemetry.normalizedSpeed);
  const countdownCue = snapshot.phase === 'countdown'
    ? (snapshot.countdownCue && snapshot.countdownCue > 0
        ? snapshot.countdownCue
        : Math.min(3, Math.max(1, Math.ceil(snapshot.countdownRemaining ?? 3))) as 3 | 2 | 1)
    : null;
  const launch = options.launch === undefined
    ? createPerfectLaunchHudViewModel(player.launch, snapshot.phase, snapshot.raceTime)
    : options.launch ?? undefined;
  const activeMode = snapshot.settings?.mode ?? snapshot.modeState?.mode;
  const raceModeStatus = options.raceModeStatus === undefined && activeMode
    ? createRaceModeStatusViewModel(activeMode, {
        lap: player.progress.currentLap,
        totalLaps: snapshot.totalLaps,
        position,
        racerCount: snapshot.entries.length,
        score: player.competition?.score,
        objectiveTarget: snapshot.modeState?.objectiveTarget,
        checkpointsPassed: player.competition?.checkpointsPassed,
        survivalLives: player.competition?.survivalLives,
        nextEliminationAt: snapshot.modeState?.nextEliminationAt,
        raceTime: snapshot.raceTime,
        teamId: player.competition?.teamId,
        teamScores: snapshot.modeState?.teamScores,
      })
    : options.raceModeStatus ?? undefined;
  const directorEvent = options.directorEvent === undefined
    ? createRaceDirectorHudViewModel(snapshot.director, snapshot.raceTime)
    : options.directorEvent ?? undefined;

  return {
    phase: snapshot.phase,
    speedMps: Math.max(0, finite(player.vehicle.telemetry.speed)),
    normalizedSpeed,
    lap: Math.min(snapshot.totalLaps, Math.max(1, Math.floor(finite(player.progress.currentLap, 1)))),
    totalLaps: Math.max(1, Math.floor(finite(snapshot.totalLaps, 3))),
    position,
    racerCount: Math.max(1, snapshot.entries.length),
    raceTime: Math.max(0, finite(snapshot.raceTime)),
    lastSplit: split.lastSplit,
    splitDelta: split.splitDelta,
    boost: clampUnit(player.vehicle.boost.energy),
    boostActive: player.vehicle.boost.active === true,
    driftCharge: clampUnit(player.vehicle.drift?.charge ?? 0),
    heat: clampUnit(player.vehicle.heat),
    damage: clampUnit(player.vehicle.damage),
    wrongWay: player.progress.wrongWay,
    airborne: player.vehicle.grounded === false,
    groundClearance: Math.max(0, finite(player.vehicle.telemetry.groundClearance ?? 0)),
    verticalSpeed: finite(player.vehicle.velocity?.y ?? 0),
    corner: {
      direction: preview.direction,
      severity: clampUnit(preview.severity),
      distance: Math.max(0, finite(preview.distance)),
      label: preview.tag?.replaceAll('-', ' '),
    },
    countdownCue,
    course: options.course ?? [],
    courseBranches: options.courseBranches,
    racers: snapshot.entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      x: finite(entry.vehicle.position.x),
      z: finite(entry.vehicle.position.z),
      courseProgress: clampUnit(entry.progress.courseProgress),
      placement: derivePlacement(entry, snapshot.entries),
      isPlayer: entry.id === playerId,
      finished: entry.status === 'finished',
    })),
    results: deriveResults(snapshot, playerId),
    resultsPresentation: options.resultsPresentation,
    preRace: options.preRace,
    settings: options.settings,
    threats: options.threats,
    launch,
    raceModeStatus,
    directorEvent,
    controlsVisible: options.controlsVisible,
    galactic: deriveGalacticHudViewModel(player.galactic),
  };
}
