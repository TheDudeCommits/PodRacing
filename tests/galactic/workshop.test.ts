import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORKSHOP_LOADOUTS,
  GALACTIC_VEHICLE_ORDER,
  WORKSHOP_PARTS,
  WORKSHOP_PARTS_BY_SLOT,
  WORKSHOP_SLOTS,
  WORKSHOP_STATS,
  deriveWorkshopSummary,
  isWorkshopLoadout,
  sanitizeWorkshopLoadout,
  validateWorkshopLoadout,
  type WorkshopLoadout,
} from '../../src/game/galactic';

function jsonRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('Galactic workshop domain', () => {
  it('defines exactly five complete bays with four meaningful tradeoff parts apiece', () => {
    expect(WORKSHOP_SLOTS).toEqual(['engine', 'cooling', 'armour', 'steering', 'gadget']);
    expect(Object.keys(WORKSHOP_PARTS)).toHaveLength(20);

    const listedPartIds: string[] = [];
    for (const slot of WORKSHOP_SLOTS) {
      const ids = WORKSHOP_PARTS_BY_SLOT[slot];
      expect(ids).toHaveLength(4);
      for (const id of ids) {
        const part = WORKSHOP_PARTS[id];
        listedPartIds.push(id);
        expect(part.id).toBe(id);
        expect(part.slot).toBe(slot);
        expect(part.name.length).toBeGreaterThan(8);
        expect(part.description.length).toBeGreaterThan(40);
        expect(part.tags.length).toBeGreaterThanOrEqual(2);
        expect(part.modifiers.some((modifier) => modifier.amount > 0)).toBe(true);
        expect(part.modifiers.some((modifier) => modifier.amount < 0)).toBe(true);
        expect(new Set(part.modifiers.map((modifier) => modifier.stat)).size)
          .toBe(part.modifiers.length);
      }
    }

    expect(new Set(listedPartIds).size).toBe(20);
    expect(new Set(listedPartIds)).toEqual(new Set(Object.keys(WORKSHOP_PARTS)));
  });

  it('provides a valid, distinct, synergistic default loadout for every vehicle', () => {
    const signatures = GALACTIC_VEHICLE_ORDER.map((vehicleClass) => {
      const loadout = DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
      expect(isWorkshopLoadout(loadout)).toBe(true);
      expect(validateWorkshopLoadout(loadout)).toMatchObject({ valid: true, issues: [] });
      expect(deriveWorkshopSummary(loadout).synergies.length).toBeGreaterThanOrEqual(1);
      return WORKSHOP_SLOTS.map((slot) => loadout.slots[slot]).join(':');
    });

    expect(new Set(signatures).size).toBe(GALACTIC_VEHICLE_ORDER.length);
  });

  it('repairs corrupt, missing and wrong-bay serialized values against the chosen vehicle', () => {
    const validation = validateWorkshopLoadout({
      version: 9,
      vehicleClass: 'landspeeder',
      slots: {
        engine: 'pulse-shield-relay',
        cooling: 'prototype-radiator',
        armour: null,
        steering: 'vector-vane-rack',
        gadget: 'scrap-mine-printer',
        cargo: 'nova-burst-turbines',
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual([
      'invalid-version',
      'unexpected-slot',
      'wrong-slot',
      'unknown-part',
      'unknown-part',
    ]);
    expect(validation.loadout).toEqual({
      version: 1,
      vehicleClass: 'landspeeder',
      slots: {
        engine: 'siege-pulse-reactor',
        cooling: 'sealed-heat-sink',
        armour: 'durasteel-ribcage',
        steering: 'vector-vane-rack',
        gadget: 'scrap-mine-printer',
      },
    });
    expect(sanitizeWorkshopLoadout(jsonRoundTrip(validation.loadout)))
      .toEqual(validation.loadout);
    expect(Object.keys(validation.loadout.slots)).toEqual(WORKSHOP_SLOTS);
    expect(jsonRoundTrip(validation)).toEqual(validation);
  });

  it('falls back safely for non-object input without leaking non-JSON values', () => {
    const repaired = validateWorkshopLoadout(Symbol('broken'), 'speeder-bike');

    expect(repaired).toMatchObject({
      valid: false,
      loadout: DEFAULT_WORKSHOP_LOADOUTS['speeder-bike'],
      issues: [{ code: 'invalid-root', path: '$', received: 'Symbol(broken)' }],
    });
    expect(isWorkshopLoadout(Symbol('broken'))).toBe(false);
    expect(jsonRoundTrip(repaired)).toEqual(repaired);
  });

  it('derives deterministic bonuses, penalties, net totals and named synergies', () => {
    const loadout = DEFAULT_WORKSHOP_LOADOUTS.podracer;
    const first = deriveWorkshopSummary(loadout);
    const second = deriveWorkshopSummary(jsonRoundTrip(loadout));

    expect(first.synergies.map((synergy) => synergy.name)).toEqual([
      'Redline Furnace',
      'Predator Focus',
    ]);
    expect(first.totals).toMatchObject({
      topSpeed: 0.24,
      acceleration: -0.08,
      boost: 0.18,
      cooling: -0.09,
      armour: 0,
      handling: 0.08,
      drift: -0.04,
      weaponPower: 0.32,
      shield: -0.04,
      mineCapacity: 0,
    });
    expect(first.bonuses.find((effect) => effect.stat === 'armour')).toMatchObject({
      amount: 0.11,
      sources: ['Reactive Charge Plating'],
    });
    expect(first.penalties.find((effect) => effect.stat === 'armour')).toMatchObject({
      amount: -0.11,
      sources: ['Nova-Burst Turbines', 'Cryoflux Radiator'],
    });
    expect(first.bonuses.map((effect) => effect.stat))
      .toEqual(WORKSHOP_STATS.filter((stat) => first.bonuses.some((effect) => effect.stat === stat)));
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(jsonRoundTrip(first)).toEqual(first);
  });

  it('removes a synergy deterministically when one required part changes', () => {
    const changed: WorkshopLoadout = {
      ...DEFAULT_WORKSHOP_LOADOUTS.podracer,
      slots: {
        ...DEFAULT_WORKSHOP_LOADOUTS.podracer.slots,
        engine: 'balanced-ion-drive',
      },
    };
    const summary = deriveWorkshopSummary(changed);

    expect(summary.synergies.map((synergy) => synergy.name)).toEqual(['Predator Focus']);
    expect(summary.totals.topSpeed).toBeLessThan(
      deriveWorkshopSummary(DEFAULT_WORKSHOP_LOADOUTS.podracer).totals.topSpeed,
    );
  });
});
