import {
  DEFAULT_GAME_SETTINGS,
  sanitizeGameSettings,
  type GameSettings,
} from './schema';

export const GAME_SETTINGS_STORAGE_KEY = 'now-this-is-podracing.settings';
const MAX_SETTINGS_JSON_LENGTH = 128_000;

/** Small localStorage-compatible boundary, injectable in tests and non-DOM hosts. */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** localStorage access itself can throw in restricted or privacy-mode contexts. */
export function resolveBrowserSettingsStorage(): SettingsStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Loads and validates settings. Missing, oversized, malformed, future-version,
 * or inaccessible storage always returns a complete safe fallback document.
 */
export function loadGameSettings(
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = GAME_SETTINGS_STORAGE_KEY,
  fallback: GameSettings = DEFAULT_GAME_SETTINGS,
): Readonly<GameSettings> {
  if (!storage) return sanitizeGameSettings(fallback, DEFAULT_GAME_SETTINGS);
  try {
    const json = storage.getItem(key);
    if (json === null || json.length > MAX_SETTINGS_JSON_LENGTH) {
      return sanitizeGameSettings(fallback, DEFAULT_GAME_SETTINGS);
    }
    return sanitizeGameSettings(JSON.parse(json) as unknown, fallback);
  } catch {
    return sanitizeGameSettings(fallback, DEFAULT_GAME_SETTINGS);
  }
}

/**
 * Validates before saving and reports quota/security failures instead of
 * allowing persistence errors to interrupt gameplay.
 */
export function saveGameSettings(
  settings: unknown,
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = GAME_SETTINGS_STORAGE_KEY,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(sanitizeGameSettings(settings)));
    return true;
  } catch {
    return false;
  }
}

/** Best-effort reset; callers can immediately use DEFAULT_GAME_SETTINGS. */
export function clearSavedGameSettings(
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
  key = GAME_SETTINGS_STORAGE_KEY,
): boolean {
  if (!storage?.removeItem) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
