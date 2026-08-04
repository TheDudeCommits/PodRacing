import { describe, expect, it } from 'vitest';
import {
  GALACTIC_VEHICLE_ORDER,
  GALACTIC_VEHICLES,
  deriveGalacticVehicleConfig,
} from '../../src/game/galactic/catalog';
import { createGalacticRacerState } from '../../src/game/galactic/system';
import { DEFAULT_PODRACER_CONFIG } from '../../src/game/simulation/config';

describe('Galactic vehicle identities', () => {
  it('gives every selection card a distinct, bounded attribute profile', () => {
    const profiles = GALACTIC_VEHICLE_ORDER.map((vehicleClass) => {
      const definition = GALACTIC_VEHICLES[vehicleClass];
      expect(definition.role.length).toBeGreaterThan(3);
      expect(definition.description.length).toBeGreaterThan(20);
      expect(definition.advantages).toHaveLength(2);
      expect(definition.tradeoff.length).toBeGreaterThan(3);
      const ratings = Object.values(definition.stats);
      expect(ratings).toHaveLength(5);
      for (const rating of ratings) {
        expect(Number.isInteger(rating)).toBe(true);
        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(5);
      }
      return ratings.join(':');
    });

    expect(new Set(profiles).size).toBe(GALACTIC_VEHICLE_ORDER.length);
  });

  it('backs the card promises with genuinely different physics tunes', () => {
    const configs = Object.fromEntries(GALACTIC_VEHICLE_ORDER.map((vehicleClass) => {
      const state = createGalacticRacerState(vehicleClass);
      return [vehicleClass, deriveGalacticVehicleConfig(
        vehicleClass,
        DEFAULT_PODRACER_CONFIG,
        state.upgrades,
      )];
    }));

    expect(configs['speeder-bike']?.maxSpeed).toBeGreaterThan(configs.podracer?.maxSpeed ?? 0);
    expect(configs['speeder-bike']?.engineAcceleration).toBeGreaterThan(
      configs.landspeeder?.engineAcceleration ?? 0,
    );
    expect(configs.landspeeder?.mass).toBeGreaterThan(configs.podracer?.mass ?? 0);
    expect(GALACTIC_VEHICLES.landspeeder.incomingDamageScale).toBeLessThan(
      GALACTIC_VEHICLES.podracer.incomingDamageScale,
    );
    expect(configs['skim-speeder']?.driftLateralGrip).toBeGreaterThan(
      configs.podracer?.driftLateralGrip ?? 0,
    );
  });
});
