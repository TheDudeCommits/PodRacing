import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  GAME_SETTINGS_STORAGE_KEY,
  SETTINGS_SCHEMA_VERSION,
  clearSavedGameSettings,
  loadGameSettings,
  sanitizeGameSettings,
  saveGameSettings,
  type SettingsStorage,
} from '../../src/game/settings';

class MemoryStorage implements SettingsStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('versioned game settings', () => {
  it('defines the complete comfort, audio and steering settings schema', () => {
    expect(DEFAULT_GAME_SETTINGS).toMatchObject({
      version: SETTINGS_SCHEMA_VERSION,
      comfort: {
        cameraShake: expect.any(Number),
        fovEffects: expect.any(Number),
        motionIntensity: expect.any(Number),
        reducedMotion: false,
        highContrast: false,
        directionalThreatCues: true,
      },
      audio: {
        master: expect.any(Number),
        music: expect.any(Number),
        engine: expect.any(Number),
        effects: expect.any(Number),
        voice: expect.any(Number),
      },
      controls: {
        gamepadDeadzone: expect.any(Number),
        gamepadSensitivity: expect.any(Number),
        steeringAssist: expect.any(Number),
      },
    });
    expect(Object.isFrozen(DEFAULT_GAME_SETTINGS)).toBe(true);
  });

  it('round-trips remapped bindings and accessibility preferences', () => {
    const storage = new MemoryStorage();
    const custom = sanitizeGameSettings({
      ...DEFAULT_GAME_SETTINGS,
      comfort: {
        ...DEFAULT_GAME_SETTINGS.comfort,
        cameraShake: 0,
        reducedMotion: true,
        highContrast: true,
      },
      audio: { ...DEFAULT_GAME_SETTINGS.audio, master: 0.45, voice: 0.2 },
      controls: {
        gamepadDeadzone: 0.2,
        gamepadSensitivity: 1.4,
        steeringAssist: 0.7,
      },
      keyboardBindings: {
        ...DEFAULT_GAME_SETTINGS.keyboardBindings,
        fire: ['KeyX'],
        mine: [],
      },
      gamepadBindings: {
        ...DEFAULT_GAME_SETTINGS.gamepadBindings,
        fire: [{ type: 'button', index: 10 }],
      },
    });

    expect(saveGameSettings(custom, storage)).toBe(true);
    expect(loadGameSettings(storage)).toEqual(custom);
    expect(storage.values.has(GAME_SETTINGS_STORAGE_KEY)).toBe(true);
  });

  it('falls back invalid fields independently instead of discarding valid preferences', () => {
    const result = sanitizeGameSettings({
      version: 1,
      comfort: {
        ...DEFAULT_GAME_SETTINGS.comfort,
        cameraShake: 4,
        fovEffects: 0.25,
        reducedMotion: 'yes',
      },
      audio: {
        ...DEFAULT_GAME_SETTINGS.audio,
        master: Number.NaN,
        music: 0.1,
      },
      controls: {
        gamepadDeadzone: 5,
        gamepadSensitivity: 1.5,
        steeringAssist: -1,
      },
      keyboardBindings: {
        ...DEFAULT_GAME_SETTINGS.keyboardBindings,
        fire: [123],
      },
      gamepadBindings: {
        ...DEFAULT_GAME_SETTINGS.gamepadBindings,
        fire: [{ type: 'button', index: 999 }],
      },
    });

    expect(result.comfort.cameraShake).toBe(DEFAULT_GAME_SETTINGS.comfort.cameraShake);
    expect(result.comfort.fovEffects).toBe(0.25);
    expect(result.comfort.reducedMotion).toBe(false);
    expect(result.audio.master).toBe(DEFAULT_GAME_SETTINGS.audio.master);
    expect(result.audio.music).toBe(0.1);
    expect(result.controls).toEqual({
      gamepadDeadzone: DEFAULT_GAME_SETTINGS.controls.gamepadDeadzone,
      gamepadSensitivity: 1.5,
      steeringAssist: DEFAULT_GAME_SETTINGS.controls.steeringAssist,
    });
    expect(result.keyboardBindings.fire).toEqual(DEFAULT_GAME_SETTINGS.keyboardBindings.fire);
    expect(result.gamepadBindings.fire).toEqual(DEFAULT_GAME_SETTINGS.gamepadBindings.fire);
  });

  it('rejects unsupported versions as a unit', () => {
    const result = sanitizeGameSettings({
      version: 99,
      comfort: { ...DEFAULT_GAME_SETTINGS.comfort, cameraShake: 0 },
    });
    expect(result).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it('survives missing, malformed, oversized and throwing storage', () => {
    const storage = new MemoryStorage();
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);

    storage.setItem(GAME_SETTINGS_STORAGE_KEY, '{not json');
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);

    storage.setItem(GAME_SETTINGS_STORAGE_KEY, 'x'.repeat(128_001));
    expect(loadGameSettings(storage)).toEqual(DEFAULT_GAME_SETTINGS);

    const throwing: SettingsStorage = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    };
    expect(loadGameSettings(throwing)).toEqual(DEFAULT_GAME_SETTINGS);
    expect(saveGameSettings(DEFAULT_GAME_SETTINGS, throwing)).toBe(false);
    expect(clearSavedGameSettings(throwing)).toBe(false);
    expect(saveGameSettings(DEFAULT_GAME_SETTINGS, null)).toBe(false);
  });

  it('clears the saved document through the injectable storage boundary', () => {
    const storage = new MemoryStorage();
    expect(saveGameSettings(DEFAULT_GAME_SETTINGS, storage)).toBe(true);
    expect(clearSavedGameSettings(storage)).toBe(true);
    expect(storage.getItem(GAME_SETTINGS_STORAGE_KEY)).toBeNull();
  });
});
