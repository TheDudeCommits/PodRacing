import {
  DEFAULT_GAMEPAD_BINDINGS,
  DEFAULT_INPUT_TUNING,
  DEFAULT_KEYBOARD_BINDINGS,
  sanitizeGamepadBindings,
  sanitizeInputTuning,
  sanitizeKeyboardBindings,
  type GamepadBindings,
  type InputTuningSettings,
  type KeyboardBindings,
} from '../input';

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export interface ComfortSettings {
  /** Camera impulse strength, from off to authored maximum. */
  cameraShake: number;
  /** Speed-driven field-of-view widening, from off to authored maximum. */
  fovEffects: number;
  /** Global motion-VFX intensity without changing gameplay speed. */
  motionIntensity: number;
  /** Removes non-essential motion and overrides animated UI flourishes. */
  reducedMotion: boolean;
  /** Raises HUD and threat-marker contrast. */
  highContrast: boolean;
  /** Enables spatial indicators for attacks and hazards outside the view. */
  directionalThreatCues: boolean;
}

export interface AudioSettings {
  master: number;
  music: number;
  engine: number;
  effects: number;
  voice: number;
}

export interface ControlSettings extends InputTuningSettings {}

/** Complete versioned, JSON-safe user settings document. */
export interface GameSettings {
  version: typeof SETTINGS_SCHEMA_VERSION;
  comfort: ComfortSettings;
  audio: AudioSettings;
  controls: ControlSettings;
  keyboardBindings: KeyboardBindings;
  gamepadBindings: GamepadBindings;
}

export const DEFAULT_COMFORT_SETTINGS: Readonly<ComfortSettings> = Object.freeze({
  cameraShake: 0.8,
  fovEffects: 0.85,
  motionIntensity: 1,
  reducedMotion: false,
  highContrast: false,
  directionalThreatCues: true,
});

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  master: 0.85,
  music: 0.65,
  engine: 0.85,
  effects: 0.85,
  voice: 0.8,
});

export const DEFAULT_CONTROL_SETTINGS: Readonly<ControlSettings> = DEFAULT_INPUT_TUNING;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unitValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function freezeComfort(value: ComfortSettings): Readonly<ComfortSettings> {
  return Object.freeze(value);
}

function freezeAudio(value: AudioSettings): Readonly<AudioSettings> {
  return Object.freeze(value);
}

/** Field-level validation lets one corrupt preference fall back without losing the rest. */
export function sanitizeComfortSettings(
  value: unknown,
  fallback: ComfortSettings = DEFAULT_COMFORT_SETTINGS,
): Readonly<ComfortSettings> {
  const source = isRecord(value) ? value : {};
  return freezeComfort({
    cameraShake: unitValue(source.cameraShake, fallback.cameraShake),
    fovEffects: unitValue(source.fovEffects, fallback.fovEffects),
    motionIntensity: unitValue(source.motionIntensity, fallback.motionIntensity),
    reducedMotion: booleanValue(source.reducedMotion, fallback.reducedMotion),
    highContrast: booleanValue(source.highContrast, fallback.highContrast),
    directionalThreatCues: booleanValue(
      source.directionalThreatCues,
      fallback.directionalThreatCues,
    ),
  });
}

/** Field-level validation for mix-bus values, all normalized to [0, 1]. */
export function sanitizeAudioSettings(
  value: unknown,
  fallback: AudioSettings = DEFAULT_AUDIO_SETTINGS,
): Readonly<AudioSettings> {
  const source = isRecord(value) ? value : {};
  return freezeAudio({
    master: unitValue(source.master, fallback.master),
    music: unitValue(source.music, fallback.music),
    engine: unitValue(source.engine, fallback.engine),
    effects: unitValue(source.effects, fallback.effects),
    voice: unitValue(source.voice, fallback.voice),
  });
}

function freezeGameSettings(settings: GameSettings): Readonly<GameSettings> {
  return Object.freeze(settings);
}

export const DEFAULT_GAME_SETTINGS: Readonly<GameSettings> = freezeGameSettings({
  version: SETTINGS_SCHEMA_VERSION,
  comfort: DEFAULT_COMFORT_SETTINGS,
  audio: DEFAULT_AUDIO_SETTINGS,
  controls: DEFAULT_CONTROL_SETTINGS,
  keyboardBindings: DEFAULT_KEYBOARD_BINDINGS,
  gamepadBindings: DEFAULT_GAMEPAD_BINDINGS,
});

/**
 * Validates an unknown settings document. Unsupported versions intentionally
 * fall back as a unit so future schemas are never misinterpreted as version 1.
 */
export function sanitizeGameSettings(
  value: unknown,
  fallback: GameSettings = DEFAULT_GAME_SETTINGS,
): Readonly<GameSettings> {
  if (!isRecord(value) || value.version !== SETTINGS_SCHEMA_VERSION) {
    return freezeGameSettings({
      version: SETTINGS_SCHEMA_VERSION,
      comfort: sanitizeComfortSettings(fallback.comfort),
      audio: sanitizeAudioSettings(fallback.audio),
      controls: sanitizeInputTuning(fallback.controls),
      keyboardBindings: sanitizeKeyboardBindings(fallback.keyboardBindings),
      gamepadBindings: sanitizeGamepadBindings(fallback.gamepadBindings),
    });
  }
  return freezeGameSettings({
    version: SETTINGS_SCHEMA_VERSION,
    comfort: sanitizeComfortSettings(value.comfort, fallback.comfort),
    audio: sanitizeAudioSettings(value.audio, fallback.audio),
    controls: sanitizeInputTuning(value.controls, fallback.controls),
    keyboardBindings: sanitizeKeyboardBindings(
      value.keyboardBindings,
      fallback.keyboardBindings,
    ),
    gamepadBindings: sanitizeGamepadBindings(value.gamepadBindings, fallback.gamepadBindings),
  });
}
