import { GALACTIC_VEHICLE_ORDER } from './catalog';
import type {
  GalacticVehicleClass,
  WorkshopEffectSummary,
  WorkshopLoadout,
  WorkshopPartDefinition,
  WorkshopPartId,
  WorkshopSlot,
  WorkshopStat,
  WorkshopStatModifier,
  WorkshopSummary,
  WorkshopSynergySummary,
  WorkshopValidationIssue,
  WorkshopValidationIssueCode,
  WorkshopValidationResult,
} from './types';

export const WORKSHOP_SLOTS = [
  'engine',
  'cooling',
  'armour',
  'steering',
  'gadget',
] as const satisfies readonly WorkshopSlot[];

export const WORKSHOP_STATS = [
  'topSpeed',
  'acceleration',
  'boost',
  'cooling',
  'armour',
  'handling',
  'drift',
  'weaponPower',
  'shield',
  'mineCapacity',
] as const satisfies readonly WorkshopStat[];

function definePart(
  id: WorkshopPartId,
  slot: WorkshopSlot,
  name: string,
  description: string,
  modifiers: readonly WorkshopStatModifier[],
  tags: readonly string[],
): WorkshopPartDefinition {
  return Object.freeze({
    id,
    slot,
    name,
    description,
    modifiers: Object.freeze(modifiers.map((modifier) => Object.freeze({ ...modifier }))),
    tags: Object.freeze([...tags]),
  });
}

/** Authored parts use decimal multipliers and always make a legible racing tradeoff. */
export const WORKSHOP_PARTS = Object.freeze({
  'balanced-ion-drive': definePart(
    'balanced-ion-drive', 'engine', 'R-44 Balanced Ion Drive',
    'A tractable twin-feed engine that trades a little terminal velocity for predictable launch torque.',
    [{ stat: 'acceleration', amount: 0.06 }, { stat: 'handling', amount: 0.03 }, { stat: 'topSpeed', amount: -0.02 }],
    ['balanced', 'efficient'],
  ),
  'nova-burst-turbines': definePart(
    'nova-burst-turbines', 'engine', 'Nova-Burst Turbines',
    'Redline turbines deliver brutal straight-line pace while pouring heat into a lightly braced chassis.',
    [{ stat: 'topSpeed', amount: 0.12 }, { stat: 'boost', amount: 0.12 }, { stat: 'cooling', amount: -0.1 }, { stat: 'armour', amount: -0.04 }],
    ['hot', 'redline'],
  ),
  'krayt-torque-core': definePart(
    'krayt-torque-core', 'engine', 'Krayt Torque Core',
    'A low-ratio drive rockets out of hairpins but runs out of breath on the longest desert straights.',
    [{ stat: 'acceleration', amount: 0.14 }, { stat: 'drift', amount: 0.04 }, { stat: 'topSpeed', amount: -0.07 }, { stat: 'cooling', amount: -0.03 }],
    ['torque', 'responsive'],
  ),
  'siege-pulse-reactor': definePart(
    'siege-pulse-reactor', 'engine', 'Siege Pulse Reactor',
    'An armoured combat reactor feeds heavy weapons at the cost of launch response and steering agility.',
    [{ stat: 'weaponPower', amount: 0.12 }, { stat: 'armour', amount: 0.07 }, { stat: 'acceleration', amount: -0.06 }, { stat: 'handling', amount: -0.05 }],
    ['heavy', 'weapon'],
  ),
  'desert-fin-array': definePart(
    'desert-fin-array', 'cooling', 'Desert Fin Array',
    'Wide ceramic fins shed heat in clean air, but their exposed edges are easy prey in contact racing.',
    [{ stat: 'cooling', amount: 0.1 }, { stat: 'handling', amount: 0.03 }, { stat: 'armour', amount: -0.04 }],
    ['airflow', 'desert'],
  ),
  'cryoflux-radiator': definePart(
    'cryoflux-radiator', 'cooling', 'Cryoflux Radiator',
    'A dense phase-change reservoir keeps boost online longer while adding vulnerable plumbing and mass.',
    [{ stat: 'cooling', amount: 0.18 }, { stat: 'boost', amount: 0.03 }, { stat: 'armour', amount: -0.07 }, { stat: 'acceleration', amount: -0.03 }],
    ['cryo', 'high-capacity'],
  ),
  'venturi-sand-scoop': definePart(
    'venturi-sand-scoop', 'cooling', 'Venturi Sand Scoop',
    'A speed-fed intake turns desert air into boost cooling, sacrificing low-speed precision and weapon feed.',
    [{ stat: 'cooling', amount: 0.12 }, { stat: 'boost', amount: 0.07 }, { stat: 'handling', amount: -0.05 }, { stat: 'weaponPower', amount: -0.02 }],
    ['airflow', 'boost'],
  ),
  'sealed-heat-sink': definePart(
    'sealed-heat-sink', 'cooling', 'Sealed Heat Sink',
    'Impact-proof thermal blocks survive canyon fights, though their mass dulls speed and acceleration.',
    [{ stat: 'armour', amount: 0.07 }, { stat: 'cooling', amount: 0.08 }, { stat: 'topSpeed', amount: -0.05 }, { stat: 'acceleration', amount: -0.03 }],
    ['sealed', 'heavy'],
  ),
  'durasteel-ribcage': definePart(
    'durasteel-ribcage', 'armour', 'Durasteel Ribcage',
    'Deep structural rails shrug off crashes and shield bleed-through but make every direction change deliberate.',
    [{ stat: 'armour', amount: 0.16 }, { stat: 'shield', amount: 0.03 }, { stat: 'acceleration', amount: -0.07 }, { stat: 'handling', amount: -0.06 }],
    ['heavy', 'structural'],
  ),
  'ceramic-skirmish-shell': definePart(
    'ceramic-skirmish-shell', 'armour', 'Ceramic Skirmish Shell',
    'Overlapping light plates preserve agility and blunt glancing hits, but insulate weapons and trim top speed.',
    [{ stat: 'armour', amount: 0.1 }, { stat: 'handling', amount: 0.04 }, { stat: 'weaponPower', amount: -0.04 }, { stat: 'topSpeed', amount: -0.02 }],
    ['balanced', 'skirmish'],
  ),
  'reactive-plating': definePart(
    'reactive-plating', 'armour', 'Reactive Charge Plating',
    'Charged armour hardens under fire and feeds the lance bus, creating a dangerous cooling deficit.',
    [{ stat: 'armour', amount: 0.11 }, { stat: 'weaponPower', amount: 0.06 }, { stat: 'cooling', amount: -0.08 }, { stat: 'boost', amount: -0.03 }],
    ['reactive', 'weapon'],
  ),
  'stripped-racing-frame': definePart(
    'stripped-racing-frame', 'armour', 'Stripped Racing Frame',
    'Everything nonessential is cut away for exceptional pace, leaving the pilot exposed to weapons and walls.',
    [{ stat: 'topSpeed', amount: 0.09 }, { stat: 'acceleration', amount: 0.07 }, { stat: 'armour', amount: -0.16 }, { stat: 'shield', amount: -0.04 }],
    ['lightweight', 'racing'],
  ),
  'vector-vane-rack': definePart(
    'vector-vane-rack', 'steering', 'Vector Vane Rack',
    'Aggressive repulsor vanes carve precise slides while adding drag and fragile lateral hardware.',
    [{ stat: 'handling', amount: 0.12 }, { stat: 'drift', amount: 0.11 }, { stat: 'topSpeed', amount: -0.03 }, { stat: 'armour', amount: -0.02 }],
    ['vector', 'drift'],
  ),
  'gyro-lock-yoke': definePart(
    'gyro-lock-yoke', 'steering', 'Gyro-Lock Yoke',
    'A stabilised control yoke resists collision yaw, but fights deep drift angles and explosive boost rotation.',
    [{ stat: 'handling', amount: 0.15 }, { stat: 'armour', amount: 0.03 }, { stat: 'drift', amount: -0.09 }, { stat: 'boost', amount: -0.02 }],
    ['stable', 'defensive'],
  ),
  'countersteer-fins': definePart(
    'countersteer-fins', 'steering', 'Countersteer Fins',
    'Oversized rear fins turn long slides into boost, but expose cooling lines and crumple in side impacts.',
    [{ stat: 'drift', amount: 0.17 }, { stat: 'boost', amount: 0.06 }, { stat: 'armour', amount: -0.05 }, { stat: 'cooling', amount: -0.03 }],
    ['drift', 'lightweight'],
  ),
  'long-course-stabilizers': definePart(
    'long-course-stabilizers', 'steering', 'Long-Course Stabilizers',
    'High-speed trim surfaces settle fast sweepers while slowing initial turn-in and shortening sustained slides.',
    [{ stat: 'topSpeed', amount: 0.06 }, { stat: 'handling', amount: 0.08 }, { stat: 'acceleration', amount: -0.05 }, { stat: 'drift', amount: -0.04 }],
    ['airflow', 'stable'],
  ),
  'pulse-shield-relay': definePart(
    'pulse-shield-relay', 'gadget', 'Pulse-Shield Relay',
    'A priority defence bus strengthens emergency shielding by diverting energy from weapons and boost.',
    [{ stat: 'shield', amount: 0.2 }, { stat: 'armour', amount: 0.03 }, { stat: 'weaponPower', amount: -0.06 }, { stat: 'boost', amount: -0.03 }],
    ['shield', 'defensive'],
  ),
  'heat-lance-amplifier': definePart(
    'heat-lance-amplifier', 'gadget', 'Heat-Lance Amplifier',
    'A tuned discharge chamber makes every lance hit vicious while stressing shields and the cooling loop.',
    [{ stat: 'weaponPower', amount: 0.18 }, { stat: 'topSpeed', amount: 0.02 }, { stat: 'cooling', amount: -0.09 }, { stat: 'shield', amount: -0.04 }],
    ['weapon', 'hot'],
  ),
  'scrap-mine-printer': definePart(
    'scrap-mine-printer', 'gadget', 'Scrap-Mine Printer',
    'An onboard foundry replenishes the mine rack but weighs down launch response and quick corrections.',
    [{ stat: 'mineCapacity', amount: 0.35 }, { stat: 'armour', amount: 0.03 }, { stat: 'acceleration', amount: -0.05 }, { stat: 'handling', amount: -0.03 }],
    ['mine', 'foundry'],
  ),
  'repulsor-recuperator': definePart(
    'repulsor-recuperator', 'gadget', 'Repulsor Recuperator',
    'Slide energy is reclaimed into boost, leaving less capacitor headroom for weapons and mine deployment.',
    [{ stat: 'boost', amount: 0.1 }, { stat: 'drift', amount: 0.04 }, { stat: 'weaponPower', amount: -0.06 }, { stat: 'mineCapacity', amount: -0.08 }],
    ['recuperation', 'drift'],
  ),
}) satisfies Readonly<Record<WorkshopPartId, WorkshopPartDefinition>>;

export const WORKSHOP_PARTS_BY_SLOT = Object.freeze({
  engine: Object.freeze([
    'balanced-ion-drive', 'nova-burst-turbines', 'krayt-torque-core', 'siege-pulse-reactor',
  ] as const),
  cooling: Object.freeze([
    'desert-fin-array', 'cryoflux-radiator', 'venturi-sand-scoop', 'sealed-heat-sink',
  ] as const),
  armour: Object.freeze([
    'durasteel-ribcage', 'ceramic-skirmish-shell', 'reactive-plating', 'stripped-racing-frame',
  ] as const),
  steering: Object.freeze([
    'vector-vane-rack', 'gyro-lock-yoke', 'countersteer-fins', 'long-course-stabilizers',
  ] as const),
  gadget: Object.freeze([
    'pulse-shield-relay', 'heat-lance-amplifier', 'scrap-mine-printer', 'repulsor-recuperator',
  ] as const),
}) satisfies Readonly<Record<WorkshopSlot, readonly WorkshopPartId[]>>;

function createLoadout(
  vehicleClass: GalacticVehicleClass,
  slots: Record<WorkshopSlot, WorkshopPartId>,
): WorkshopLoadout {
  return Object.freeze({ version: 1, vehicleClass, slots: Object.freeze({ ...slots }) });
}

/** Each vehicle starts with a coherent identity, but every slot remains replaceable. */
export const DEFAULT_WORKSHOP_LOADOUTS = Object.freeze({
  podracer: createLoadout('podracer', {
    engine: 'nova-burst-turbines',
    cooling: 'cryoflux-radiator',
    armour: 'reactive-plating',
    steering: 'long-course-stabilizers',
    gadget: 'heat-lance-amplifier',
  }),
  landspeeder: createLoadout('landspeeder', {
    engine: 'siege-pulse-reactor',
    cooling: 'sealed-heat-sink',
    armour: 'durasteel-ribcage',
    steering: 'gyro-lock-yoke',
    gadget: 'pulse-shield-relay',
  }),
  'speeder-bike': createLoadout('speeder-bike', {
    engine: 'krayt-torque-core',
    cooling: 'desert-fin-array',
    armour: 'stripped-racing-frame',
    steering: 'countersteer-fins',
    gadget: 'scrap-mine-printer',
  }),
  'skim-speeder': createLoadout('skim-speeder', {
    engine: 'balanced-ion-drive',
    cooling: 'venturi-sand-scoop',
    armour: 'ceramic-skirmish-shell',
    steering: 'vector-vane-rack',
    gadget: 'repulsor-recuperator',
  }),
}) satisfies Readonly<Record<GalacticVehicleClass, WorkshopLoadout>>;

interface WorkshopSynergyRule extends WorkshopSynergySummary {
  requires: readonly WorkshopPartId[];
}

function defineSynergy(
  id: string,
  name: string,
  description: string,
  requires: readonly WorkshopPartId[],
  modifiers: readonly WorkshopStatModifier[],
): WorkshopSynergyRule {
  return Object.freeze({
    id,
    name,
    description,
    requires: Object.freeze([...requires]),
    modifiers: Object.freeze(modifiers.map((modifier) => Object.freeze({ ...modifier }))),
  });
}

const WORKSHOP_SYNERGY_RULES = Object.freeze([
  defineSynergy(
    'redline-furnace', 'Redline Furnace',
    'Cryoflux absorbs the Nova-Burst heat spike, extending the engine\'s full-power window.',
    ['nova-burst-turbines', 'cryoflux-radiator'],
    [{ stat: 'boost', amount: 0.06 }, { stat: 'topSpeed', amount: 0.04 }, { stat: 'cooling', amount: 0.03 }],
  ),
  defineSynergy(
    'siege-circuit', 'Siege Circuit',
    'A reinforced pulse bus links reactor, ribcage and shield into one bruising defensive loop.',
    ['siege-pulse-reactor', 'durasteel-ribcage', 'pulse-shield-relay'],
    [{ stat: 'armour', amount: 0.07 }, { stat: 'shield', amount: 0.08 }, { stat: 'weaponPower', amount: 0.05 }, { stat: 'handling', amount: -0.03 }],
  ),
  defineSynergy(
    'razor-vector', 'Razor Vector',
    'A stripped frame lets the countersteer fins rotate the entire craft around a razor-thin line.',
    ['stripped-racing-frame', 'countersteer-fins'],
    [{ stat: 'handling', amount: 0.07 }, { stat: 'drift', amount: 0.08 }, { stat: 'armour', amount: -0.03 }],
  ),
  defineSynergy(
    'desert-breather', 'Desert Breather',
    'The stabilizers feed clean high-speed air directly into the Venturi cooling throat.',
    ['venturi-sand-scoop', 'long-course-stabilizers'],
    [{ stat: 'topSpeed', amount: 0.04 }, { stat: 'cooling', amount: 0.05 }],
  ),
  defineSynergy(
    'predator-focus', 'Predator Focus',
    'Reactive plate discharge is phase-matched to the lance, producing a fierce but hotter firing cycle.',
    ['reactive-plating', 'heat-lance-amplifier'],
    [{ stat: 'weaponPower', amount: 0.08 }, { stat: 'cooling', amount: -0.03 }],
  ),
  defineSynergy(
    'recuperative-slide', 'Recuperative Slide',
    'Vector vanes maintain the exact slip angle the recuperator needs for continuous energy recovery.',
    ['vector-vane-rack', 'repulsor-recuperator'],
    [{ stat: 'boost', amount: 0.07 }, { stat: 'drift', amount: 0.05 }],
  ),
  defineSynergy(
    'mobile-foundry', 'Mobile Foundry',
    'The sealed sink captures waste heat to run the mine printer without exposing its feed mechanism.',
    ['sealed-heat-sink', 'scrap-mine-printer'],
    [{ stat: 'mineCapacity', amount: 0.2 }, { stat: 'armour', amount: 0.03 }, { stat: 'acceleration', amount: -0.02 }],
  ),
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVehicleClass(value: unknown): value is GalacticVehicleClass {
  return typeof value === 'string'
    && GALACTIC_VEHICLE_ORDER.includes(value as GalacticVehicleClass);
}

function isPartId(value: unknown): value is WorkshopPartId {
  return typeof value === 'string' && Object.hasOwn(WORKSHOP_PARTS, value);
}

function describeReceived(value: unknown): string | null {
  if (value === null) return null;
  if (Array.isArray(value)) return '[array]';
  if (typeof value === 'object') return '[object]';
  if (typeof value === 'function') return '[function]';
  return String(value);
}

function issue(
  code: WorkshopValidationIssueCode,
  path: string,
  received: unknown,
  replacement: string,
): WorkshopValidationIssue {
  return Object.freeze({ code, path, received: describeReceived(received), replacement });
}

/**
 * Strictly validates unknown JSON-shaped data while also returning a repaired loadout.
 * Valid part IDs installed in the wrong bay are rejected rather than silently moved.
 */
export function validateWorkshopLoadout(
  value: unknown,
  fallbackVehicleClass: GalacticVehicleClass = 'podracer',
): WorkshopValidationResult {
  const fallbackClass = isVehicleClass(fallbackVehicleClass) ? fallbackVehicleClass : 'podracer';
  const issues: WorkshopValidationIssue[] = [];
  const root = isRecord(value) ? value : null;

  if (!root) {
    issues.push(issue('invalid-root', '$', value, fallbackClass));
  }

  const rawVehicleClass = root?.vehicleClass;
  const vehicleClass = isVehicleClass(rawVehicleClass) ? rawVehicleClass : fallbackClass;
  if (root && !isVehicleClass(rawVehicleClass)) {
    issues.push(issue('invalid-vehicle-class', '$.vehicleClass', rawVehicleClass, fallbackClass));
  }
  if (root && root.version !== 1) {
    issues.push(issue('invalid-version', '$.version', root.version, '1'));
  }

  const defaults = DEFAULT_WORKSHOP_LOADOUTS[vehicleClass];
  const rawSlots = root && isRecord(root.slots) ? root.slots : null;
  if (root && !rawSlots) {
    issues.push(issue('invalid-slots', '$.slots', root.slots, 'default slots'));
  }

  if (rawSlots) {
    const unexpectedSlots = Object.keys(rawSlots)
      .filter((slot) => !WORKSHOP_SLOTS.includes(slot as WorkshopSlot))
      .sort();
    for (const slot of unexpectedSlots) {
      issues.push(issue('unexpected-slot', `$.slots.${slot}`, rawSlots[slot], 'removed'));
    }
  }

  const slots = {} as Record<WorkshopSlot, WorkshopPartId>;
  for (const slot of WORKSHOP_SLOTS) {
    const fallbackPart = defaults.slots[slot];
    const candidate = rawSlots?.[slot];
    let selectedPart = fallbackPart;
    if (rawSlots && candidate === undefined) {
      issues.push(issue('missing-part', `$.slots.${slot}`, candidate, fallbackPart));
    } else if (rawSlots) {
      if (!isPartId(candidate)) {
        issues.push(issue('unknown-part', `$.slots.${slot}`, candidate, fallbackPart));
      } else if (WORKSHOP_PARTS[candidate].slot !== slot) {
        issues.push(issue('wrong-slot', `$.slots.${slot}`, candidate, fallbackPart));
      } else {
        selectedPart = candidate;
      }
    }
    slots[slot] = selectedPart;
  }

  const loadout = createLoadout(vehicleClass, slots);
  return Object.freeze({
    valid: issues.length === 0,
    loadout,
    issues: Object.freeze(issues),
  });
}

export function sanitizeWorkshopLoadout(
  value: unknown,
  fallbackVehicleClass: GalacticVehicleClass = 'podracer',
): WorkshopLoadout {
  return validateWorkshopLoadout(value, fallbackVehicleClass).loadout;
}

export function isWorkshopLoadout(value: unknown): value is WorkshopLoadout {
  return validateWorkshopLoadout(value).valid;
}

function createStatRecord<T>(factory: () => T): Record<WorkshopStat, T> {
  return {
    topSpeed: factory(),
    acceleration: factory(),
    boost: factory(),
    cooling: factory(),
    armour: factory(),
    handling: factory(),
    drift: factory(),
    weaponPower: factory(),
    shield: factory(),
    mineCapacity: factory(),
  };
}

function roundModifier(value: number): number {
  const rounded = Math.round(value * 10_000) / 10_000;
  return Math.abs(rounded) < 0.00005 ? 0 : rounded;
}

/** Derives stable, presentation-ready effects; no simulation or storage state is mutated. */
export function deriveWorkshopSummary(
  value: unknown,
  fallbackVehicleClass: GalacticVehicleClass = 'podracer',
): WorkshopSummary {
  const loadout = sanitizeWorkshopLoadout(value, fallbackVehicleClass);
  const selectedParts = new Set(WORKSHOP_SLOTS.map((slot) => loadout.slots[slot]));
  const positive = createStatRecord(() => 0);
  const negative = createStatRecord(() => 0);
  const positiveSources = createStatRecord<string[]>(() => []);
  const negativeSources = createStatRecord<string[]>(() => []);

  const applyModifiers = (source: string, modifiers: readonly WorkshopStatModifier[]): void => {
    for (const modifier of modifiers) {
      if (modifier.amount > 0) {
        positive[modifier.stat] += modifier.amount;
        positiveSources[modifier.stat].push(source);
      } else if (modifier.amount < 0) {
        negative[modifier.stat] += modifier.amount;
        negativeSources[modifier.stat].push(source);
      }
    }
  };

  for (const slot of WORKSHOP_SLOTS) {
    const part = WORKSHOP_PARTS[loadout.slots[slot]];
    applyModifiers(part.name, part.modifiers);
  }

  const synergies: WorkshopSynergySummary[] = [];
  for (const rule of WORKSHOP_SYNERGY_RULES) {
    if (!rule.requires.every((partId) => selectedParts.has(partId))) continue;
    const synergy = Object.freeze({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      modifiers: rule.modifiers,
    });
    synergies.push(synergy);
    applyModifiers(rule.name, rule.modifiers);
  }

  const bonuses: WorkshopEffectSummary[] = [];
  const penalties: WorkshopEffectSummary[] = [];
  const totals = {} as Record<WorkshopStat, number>;
  for (const stat of WORKSHOP_STATS) {
    if (positive[stat] > 0) {
      bonuses.push(Object.freeze({
        stat,
        amount: roundModifier(positive[stat]),
        sources: Object.freeze([...positiveSources[stat]]),
      }));
    }
    if (negative[stat] < 0) {
      penalties.push(Object.freeze({
        stat,
        amount: roundModifier(negative[stat]),
        sources: Object.freeze([...negativeSources[stat]]),
      }));
    }
    totals[stat] = roundModifier(positive[stat] + negative[stat]);
  }

  return Object.freeze({
    version: 1,
    vehicleClass: loadout.vehicleClass,
    loadout,
    bonuses: Object.freeze(bonuses),
    penalties: Object.freeze(penalties),
    synergies: Object.freeze(synergies),
    totals: Object.freeze(totals),
  });
}
