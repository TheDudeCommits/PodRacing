import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKSHOP_LOADOUTS } from '../../src/game/galactic';
import {
  DEFAULT_WORKSHOP_GARAGE,
  loadWorkshopGarage,
  sanitizeWorkshopGarage,
  saveWorkshopGarage,
  withWorkshopLoadout,
  type SettingsStorage,
} from '../../src/game/settings';

class MemoryStorage implements SettingsStorage {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
  removeItem(): void { this.value = null; }
}

describe('workshop garage persistence', () => {
  it('keeps four independent five-slot builds through a JSON round trip', () => {
    const storage = new MemoryStorage();
    const modified = withWorkshopLoadout(DEFAULT_WORKSHOP_GARAGE, 'podracer', {
      ...DEFAULT_WORKSHOP_LOADOUTS.podracer,
      slots: { ...DEFAULT_WORKSHOP_LOADOUTS.podracer.slots, engine: 'krayt-torque-core' },
    });
    expect(saveWorkshopGarage(modified, storage)).toBe(true);
    const loaded = loadWorkshopGarage(storage);
    expect(loaded.loadouts.podracer.slots.engine).toBe('krayt-torque-core');
    expect(loaded.loadouts.landspeeder).toEqual(DEFAULT_WORKSHOP_LOADOUTS.landspeeder);
    expect(Object.keys(loaded.loadouts.podracer.slots)).toHaveLength(5);
  });

  it('repairs corrupt vehicles independently and survives blocked storage', () => {
    const repaired = sanitizeWorkshopGarage({
      version: 1,
      loadouts: {
        podracer: { version: 1, vehicleClass: 'podracer', slots: { engine: 'unknown' } },
        landspeeder: DEFAULT_WORKSHOP_LOADOUTS.landspeeder,
      },
    });
    expect(repaired.loadouts.podracer).toEqual(DEFAULT_WORKSHOP_LOADOUTS.podracer);
    expect(repaired.loadouts.landspeeder).toEqual(DEFAULT_WORKSHOP_LOADOUTS.landspeeder);

    const blocked: SettingsStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(loadWorkshopGarage(blocked)).toEqual(DEFAULT_WORKSHOP_GARAGE);
    expect(saveWorkshopGarage(repaired, blocked)).toBe(false);
  });
});
