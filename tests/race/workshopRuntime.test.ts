import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSHOP_LOADOUTS,
  deriveGalacticVehicleConfig,
  type GalacticUpgradeState,
  type WorkshopLoadout,
} from '../../src/game/galactic';
import {
  createRaceSimulation,
  createRacerWorkshopState,
  deriveWorkshopVehicleConfig,
  workshopIncomingDamageScale,
  workshopShieldDurationScale,
  workshopWeaponDamageScale,
} from '../../src/game/race';
import {
  DEFAULT_PODRACER_CONFIG,
  FLAT_HEIGHT_SAMPLER,
} from '../../src/game/simulation';

function podracerBuild(
  slots: Partial<WorkshopLoadout['slots']>,
): WorkshopLoadout {
  return {
    version: 1,
    vehicleClass: 'podracer',
    slots: {
      ...DEFAULT_WORKSHOP_LOADOUTS.podracer.slots,
      ...slots,
    },
  };
}

const weaponBuild = podracerBuild({
  engine: 'siege-pulse-reactor',
  armour: 'reactive-plating',
  gadget: 'heat-lance-amplifier',
});

const defenceBuild = podracerBuild({
  engine: 'siege-pulse-reactor',
  cooling: 'sealed-heat-sink',
  armour: 'durasteel-ribcage',
  steering: 'gyro-lock-yoke',
  gadget: 'pulse-shield-relay',
});

const coolingBuild = podracerBuild({
  engine: 'balanced-ion-drive',
  cooling: 'cryoflux-radiator',
  armour: 'durasteel-ribcage',
  steering: 'gyro-lock-yoke',
  gadget: 'pulse-shield-relay',
});

const mineBuild = podracerBuild({ gadget: 'scrap-mine-printer' });

function emptyUpgrades(): GalacticUpgradeState {
  return {
    afterburner: 0,
    cornering: 0,
    resilience: 0,
    parts: [],
    collectedPickupIds: [],
  };
}

describe('workshop race runtime', () => {
  it('preserves the exact legacy tune when no build is supplied', () => {
    const base = deriveGalacticVehicleConfig(
      'podracer',
      DEFAULT_PODRACER_CONFIG,
      emptyUpgrades(),
    );
    expect(deriveWorkshopVehicleConfig(base, undefined)).toBe(base);

    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
    });
    const player = race.state.entries[0]!;
    expect(player.workshop).toBeUndefined();
    expect(player.galactic?.mine.charges).toBe(3);
  });

  it('projects authored tradeoffs into the real fixed-step vehicle tune', () => {
    const base = deriveGalacticVehicleConfig(
      'podracer',
      DEFAULT_PODRACER_CONFIG,
      emptyUpgrades(),
    );
    const speedState = createRacerWorkshopState(DEFAULT_WORKSHOP_LOADOUTS.podracer);
    const defenceState = createRacerWorkshopState(defenceBuild);
    const tuned = deriveWorkshopVehicleConfig(base, speedState);

    expect(tuned.maxSpeed).toBeGreaterThan(base.maxSpeed);
    expect(tuned.boostAcceleration).toBeGreaterThan(base.boostAcceleration);
    expect(tuned.engineAcceleration).toBeLessThan(base.engineAcceleration);
    expect(workshopWeaponDamageScale(speedState)).toBeGreaterThan(1);
    expect(workshopIncomingDamageScale(defenceState)).toBeLessThan(1);
    expect(workshopShieldDurationScale(defenceState)).toBeGreaterThan(1);
    expect(tuned.fixedDelta).toBe(base.fixedDelta);
    expect(tuned.probes).toBe(base.probes);
  });

  it('accepts only valid matching builds before lock and serializes the canonical result', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 3,
      fieldSize: 4,
    });
    expect(race.setPlayerWorkshopLoadout({ version: 7 })).toBe(false);
    expect(race.setPlayerWorkshopLoadout(DEFAULT_WORKSHOP_LOADOUTS.landspeeder)).toBe(false);
    expect(race.setPlayerWorkshopLoadout(mineBuild)).toBe(true);

    const player = race.state.entries[0]!;
    expect(player.workshop?.loadout).toEqual(mineBuild);
    expect(player.workshop?.mineCapacity).toBe(4);
    expect(player.galactic?.mine.charges).toBe(4);
    expect(JSON.parse(JSON.stringify(race.snapshot()))).toEqual(race.snapshot());

    expect(race.clearRacerWorkshopLoadout(player.id)).toBe(true);
    expect(player.workshop).toBeUndefined();
    expect(player.galactic?.mine.charges).toBe(3);
    expect(race.setPlayerWorkshopLoadout(mineBuild)).toBe(true);
    race.lockPlayerVehicleSelection();
    expect(race.setPlayerWorkshopLoadout(weaponBuild)).toBe(false);
    expect(race.clearRacerWorkshopLoadout(player.id)).toBe(false);
  });

  it('applies weapon, shield, cooling and rack stats to live combat actions', () => {
    const makeRace = (loadout?: WorkshopLoadout) => createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
      workshopLoadouts: loadout ? { player: loadout } : undefined,
    });

    const baseWeapon = makeRace();
    const tunedWeapon = makeRace(weaponBuild);
    baseWeapon.step({ fire: true });
    tunedWeapon.step({ fire: true });
    const baseProjectile = baseWeapon.state.galacticWorld.projectiles.find(
      (projectile) => projectile.ownerId === 'player',
    )!;
    const tunedProjectile = tunedWeapon.state.galacticWorld.projectiles.find(
      (projectile) => projectile.ownerId === 'player',
    )!;
    expect(tunedProjectile.damage).toBeGreaterThan(baseProjectile.damage);

    const baseShield = makeRace();
    const tunedShield = makeRace(defenceBuild);
    baseShield.step({ shield: true });
    tunedShield.step({ shield: true });
    expect(tunedShield.state.entries[0]!.galactic!.shield.remaining)
      .toBeGreaterThan(baseShield.state.entries[0]!.galactic!.shield.remaining);

    const baseCooling = makeRace();
    const tunedCooling = makeRace(coolingBuild);
    for (let tick = 0; tick < 90; tick += 1) {
      baseCooling.step({ throttle: 1, boost: true });
      tunedCooling.step({ throttle: 1, boost: true });
    }
    expect(tunedCooling.state.entries[0]!.galactic!.redline.heat)
      .toBeLessThan(baseCooling.state.entries[0]!.galactic!.redline.heat);

    const mineRace = makeRace(mineBuild);
    expect(mineRace.state.entries[0]!.galactic!.mine.charges).toBe(4);
    mineRace.step({ mine: true });
    expect(mineRace.state.entries[0]!.galactic!.mine.charges).toBe(3);
    expect(mineRace.state.galacticWorld.mines.some((mine) => mine.ownerId === 'player')).toBe(true);
  });

  it('reduces actual collision damage for a defensive build', () => {
    const collide = (loadout?: WorkshopLoadout): number => {
      const race = createRaceSimulation({
        terrain: FLAT_HEIGHT_SAMPLER,
        countdownSeconds: 0,
        fieldSize: 4,
        workshopLoadouts: loadout ? { player: loadout } : undefined,
      });
      const player = race.state.entries[0]!;
      const rival = race.state.entries[1]!;
      Object.assign(player.vehicle.position, { x: 0, y: 2.5, z: 0 });
      Object.assign(rival.vehicle.position, { x: 10, y: 2.5, z: 0 });
      Object.assign(player.vehicle.velocity, { x: 50, y: 0, z: 0 });
      Object.assign(rival.vehicle.velocity, { x: -50, y: 0, z: 0 });
      race.step();
      return player.vehicle.damage;
    };

    expect(collide(defenceBuild)).toBeLessThan(collide());
  });

  it('replays identical workshop physics and combat bit-for-bit', () => {
    const options = {
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      fieldSize: 4,
      seed: 0x7711aa,
      workshopLoadouts: { player: weaponBuild },
    } as const;
    const first = createRaceSimulation(options);
    const second = createRaceSimulation(options);
    for (let tick = 0; tick < 240; tick += 1) {
      const input = {
        throttle: 1,
        steer: Math.sin(tick * 0.031) * 0.4,
        boost: tick % 80 < 24,
        fire: tick % 97 === 0,
        shield: tick % 131 === 0,
        mine: tick === 150,
      };
      first.step(input);
      second.step(input);
    }
    expect(second.snapshot()).toEqual(first.snapshot());
  });
});
