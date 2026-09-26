import { describe, expect, it } from 'vitest';
// Register Node-only asset header checks without adding Node types to the browser project.
import './vehicleAppearanceAssets.test.mjs';
import type { GalacticVehicleClass } from '../../src/game/galactic/types';
import { MASTERY_STORAGE_KEY } from '../../src/game/mastery/storage';
import { GAME_SETTINGS_STORAGE_KEY, type SettingsStorage } from '../../src/game/settings/storage';
import { WORKSHOP_GARAGE_STORAGE_KEY } from '../../src/game/settings/workshopStorage';
import { ART_APPEARANCES, FLEET_ART_DEFINITIONS, getVehicleArtDefinition, isVehicleAppearanceId, loadVehicleAppearance, resolveVehicleAppearance, saveVehicleAppearance, VEHICLE_APPEARANCE_STORAGE_KEY } from '../../src/game/vehicleAppearance';

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

  it.each(['teemto', 'sebulba', 'polwo', 'blockrunner', 'verdigris', 'skybolt', 'needle', 'pog', 'procedural'] as const)('retains an explicit %s selection through reloads', (id) => {
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

  it.each(['teemto', 'sebulba', 'polwo', 'blockrunner'] as const)('keeps the %s selection across other physics classes and preserves unrelated saves', (appearance) => {
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
  it('resolves the original fleet with separate LOD URLs and an explicit procedural fallback', () => {
    expect(Object.keys(ART_APPEARANCES)).toEqual(['teemto', 'sebulba', 'polwo', 'blockrunner', 'verdigris', 'skybolt', 'needle', 'pog', 'procedural']);
    expect(Object.values(ART_APPEARANCES).every((art) => art.vehicleClass === 'podracer')).toBe(true);
    expect(getVehicleArtDefinition('procedural', 'hero')).toBeNull();
    expect(getVehicleArtDefinition('procedural', 'rival')).toBeNull();
    // Slot ids are internal; each slot now resolves an original craft.
    const fleet = {
      teemto: 'kestrel', sebulba: 'scrapjack', polwo: 'hornet', blockrunner: 'bulwark',
      verdigris: 'sirocco', skybolt: 'longshot', needle: 'glasswing', pog: 'crucible',
    } as const;
    for (const [id, pod] of Object.entries(fleet) as [keyof typeof fleet, string][]) {
      const hero = getVehicleArtDefinition(id)!, rival = getVehicleArtDefinition(id, 'rival')!;
      expect(hero).toBe(FLEET_ART_DEFINITIONS[id]!.hero);
      expect(rival).toBe(FLEET_ART_DEFINITIONS[id]!.rival);
      expect(hero.url).toBe(`/assets/fleet/${pod}-hero.glb`);
      expect(rival.url).toBe(`/assets/fleet/${pod}-rival.glb`);
      expect([hero.id, rival.id]).toEqual([id, id]);
      expect(ART_APPEARANCES[id].label.toLowerCase()).toBe(pod);
      // No replica package, pilot hierarchy or authored damage variant is requested.
      expect(hero.url).not.toContain('/inkstorm/vehicles/');
      expect(hero.damageVariant).toBeUndefined();
      expect(hero.embeddedPilotNodePrefix).toBeUndefined();
      expect(hero.attachments).toBe(rival.attachments);
      expect(hero.attachments?.pilot).toBeDefined();
      expect(hero.attachments?.exhaustLeft).toBeDefined();
      expect(Object.isFrozen(hero.attachments?.pilot?.position)).toBe(true);
    }
    // A registered appearance must not turn an arbitrary ID into an art request.
    expect(getVehicleArtDefinition('unknown' as never)).toBeNull();
  });
});
