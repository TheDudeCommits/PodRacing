import { describe, expect, it } from 'vitest';
// Register Node-only asset header checks without adding Node types to the browser project.
import './vehicleAppearanceAssets.test.mjs';
import type { GalacticVehicleClass } from '../../src/game/galactic/types';
import { MASTERY_STORAGE_KEY } from '../../src/game/mastery/storage';
import { GAME_SETTINGS_STORAGE_KEY, type SettingsStorage } from '../../src/game/settings/storage';
import { WORKSHOP_GARAGE_STORAGE_KEY } from '../../src/game/settings/workshopStorage';
import {
  ART_APPEARANCES,
  getVehicleArtDefinition,
  isVehicleAppearanceId,
  loadVehicleAppearance,
  POLWO_ART_DEFINITIONS,
  resolveVehicleAppearance,
  saveVehicleAppearance,
  SEBULBA_ART_DEFINITIONS,
  TEEMTO_ART_DEFINITIONS,
  VEHICLE_APPEARANCE_STORAGE_KEY,
} from '../../src/game/vehicleAppearance';

class MemoryStorage implements SettingsStorage {
  readonly values = new Map<string, string>();
  readonly writes: string[] = [];
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); this.writes.push(key); }
}

describe('vehicle appearance preference', () => {
  it('defaults a new or unavailable save to Teemto without writing a preference', () => {
    const storage = new MemoryStorage();
    expect(loadVehicleAppearance(storage)).toBe('teemto');
    expect(loadVehicleAppearance(null)).toBe('teemto');
    expect(storage.writes).toEqual([]);
  });

  it.each(['teemto', 'sebulba', 'polwo', 'procedural'] as const)('retains an explicit %s selection through reloads', (id) => {
    const storage = new MemoryStorage();
    expect(saveVehicleAppearance(id, storage)).toBe(true);
    expect(loadVehicleAppearance(storage)).toBe(id);
    expect(JSON.parse(storage.values.get(VEHICLE_APPEARANCE_STORAGE_KEY)!)).toEqual({ version: 1, appearance: id });
  });

  it.each([
    '', '{', 'null', '[]', '"procedural"',
    '{"version":1}', '{"version":1,"appearance":"unregistered"}',
    '{"version":2,"appearance":"procedural"}',
    '{"version":1,"appearance":false}', ' '.repeat(1025),
  ])('defaults invalid data without overwriting it: %s', (json) => {
    const storage = new MemoryStorage();
    storage.values.set(VEHICLE_APPEARANCE_STORAGE_KEY, json);
    expect(loadVehicleAppearance(storage)).toBe('teemto');
    expect(storage.values.get(VEHICLE_APPEARANCE_STORAGE_KEY)).toBe(json);
    expect(storage.writes).toEqual([]);
  });

  it('rejects invalid writes without replacing the explicit procedural preference', () => {
    const storage = new MemoryStorage();
    saveVehicleAppearance('procedural', storage);
    for (const invalid of [null, undefined, '', 'podracer', 'unregistered', {}, 1, true]) {
      expect(isVehicleAppearanceId(invalid)).toBe(false);
      expect(saveVehicleAppearance(invalid, storage)).toBe(false);
    }
    expect(loadVehicleAppearance(storage)).toBe('procedural');
    expect(storage.writes).toEqual([VEHICLE_APPEARANCE_STORAGE_KEY]);
  });

  it('survives storage read, write and browser access failures', () => {
    const blocked: SettingsStorage = {
      getItem: () => { throw new Error('read blocked'); },
      setItem: () => { throw new Error('quota exceeded'); },
    };
    expect(loadVehicleAppearance(blocked)).toBe('teemto');
    expect(saveVehicleAppearance('procedural', blocked)).toBe(false);
    expect(saveVehicleAppearance('teemto', null)).toBe(false);

    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('access denied'); } });
    try {
      expect(loadVehicleAppearance()).toBe('teemto');
      expect(saveVehicleAppearance('procedural')).toBe(false);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it.each(['teemto', 'sebulba', 'polwo'] as const)('keeps the %s selection across other physics classes and preserves unrelated saves', (appearance) => {
    const storage = new MemoryStorage();
    const keys = [GAME_SETTINGS_STORAGE_KEY, WORKSHOP_GARAGE_STORAGE_KEY, MASTERY_STORAGE_KEY];
    for (const key of keys) storage.values.set(key, `unchanged:${key}`);
    saveVehicleAppearance(appearance, storage);
    for (const vehicleClass of ['landspeeder', 'speeder-bike', 'skim-speeder'] satisfies GalacticVehicleClass[]) {
      expect(resolveVehicleAppearance(vehicleClass, loadVehicleAppearance(storage))).toBe('procedural');
      expect(loadVehicleAppearance(storage)).toBe(appearance);
    }
    expect(resolveVehicleAppearance('podracer', loadVehicleAppearance(storage))).toBe(appearance);
    expect(resolveVehicleAppearance('podracer', 'procedural')).toBe('procedural');
    expect(resolveVehicleAppearance('podracer', 'unknown')).toBe('teemto');
    expect(storage.writes).toEqual([VEHICLE_APPEARANCE_STORAGE_KEY]);
    for (const key of keys) expect(storage.values.get(key)).toBe(`unchanged:${key}`);
  });
});

describe('vehicle appearance art contract', () => {
  it('offers three imported appearances with separate LOD URLs and an explicit procedural fallback', () => {
    expect(Object.keys(ART_APPEARANCES)).toEqual(['teemto', 'sebulba', 'polwo', 'procedural']);
    expect(Object.values(ART_APPEARANCES).every((art) => art.vehicleClass === 'podracer')).toBe(true);
    expect(getVehicleArtDefinition('procedural', 'hero')).toBeNull();
    expect(getVehicleArtDefinition('procedural', 'rival')).toBeNull();
    expect(getVehicleArtDefinition('teemto')).toBe(TEEMTO_ART_DEFINITIONS.hero);
    expect(getVehicleArtDefinition('teemto', 'rival')).toBe(TEEMTO_ART_DEFINITIONS.rival);
    expect(getVehicleArtDefinition('sebulba')).toBe(SEBULBA_ART_DEFINITIONS.hero);
    expect(getVehicleArtDefinition('sebulba', 'rival')).toBe(SEBULBA_ART_DEFINITIONS.rival);
    expect(getVehicleArtDefinition('polwo')).toBe(POLWO_ART_DEFINITIONS.hero);
    expect(getVehicleArtDefinition('polwo', 'rival')).toBe(POLWO_ART_DEFINITIONS.rival);
    expect(POLWO_ART_DEFINITIONS.hero.url).not.toBe(POLWO_ART_DEFINITIONS.rival.url);
    expect(POLWO_ART_DEFINITIONS.hero.surfaceStyles).toBe(TEEMTO_ART_DEFINITIONS.hero.surfaceStyles);
    expect(POLWO_ART_DEFINITIONS.rival.surfaceStyles).toBe(TEEMTO_ART_DEFINITIONS.hero.surfaceStyles);
    expect(Object.isFrozen(POLWO_ART_DEFINITIONS.hero.attachments?.pilot?.position)).toBe(true);
    // A third registered appearance must not turn an arbitrary ID into an art request.
    expect(getVehicleArtDefinition('unknown' as never)).toBeNull();
    expect(SEBULBA_ART_DEFINITIONS.hero.url).not.toBe(SEBULBA_ART_DEFINITIONS.rival.url);
    expect(Object.isFrozen(SEBULBA_ART_DEFINITIONS.hero.attachments?.pilot?.position)).toBe(true);
    expect(TEEMTO_ART_DEFINITIONS.hero.url).not.toBe(TEEMTO_ART_DEFINITIONS.rival.url);
    expect(TEEMTO_ART_DEFINITIONS.hero.id).toBe(TEEMTO_ART_DEFINITIONS.rival.id);
    expect(Object.isFrozen(TEEMTO_ART_DEFINITIONS.hero.attachments?.pilot?.position)).toBe(true);
  });
});
