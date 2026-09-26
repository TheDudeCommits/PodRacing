import type { VehicleArtAttachment, VehicleArtDefinition } from '../render/vehicles';
import type { GalacticVehicleClass } from './galactic/types';
import { resolveBrowserSettingsStorage, type SettingsStorage } from './settings/storage';

export type VehicleAppearanceId = 'teemto' | 'sebulba' | 'polwo' | 'blockrunner' | 'verdigris' | 'skybolt' | 'needle' | 'pog' | 'procedural';
export type VehicleArtLod = 'hero' | 'rival';

/** Appearance never changes the physics class, workshop loadout or record identity. */
export const ART_APPEARANCES = Object.freeze({
  teemto: Object.freeze({ id: 'teemto', label: 'Kestrel', vehicleClass: 'podracer' } as const),
  sebulba: Object.freeze({ id: 'sebulba', label: 'Scrapjack', vehicleClass: 'podracer' } as const),
  polwo: Object.freeze({ id: 'polwo', label: 'Hornet', vehicleClass: 'podracer' } as const),
  blockrunner: Object.freeze({ id: 'blockrunner', label: 'Bulwark', vehicleClass: 'podracer' } as const),
  verdigris: Object.freeze({ id: 'verdigris', label: 'Sirocco', vehicleClass: 'podracer' } as const),
  skybolt: Object.freeze({ id: 'skybolt', label: 'Longshot', vehicleClass: 'podracer' } as const),
  needle: Object.freeze({ id: 'needle', label: 'Glasswing', vehicleClass: 'podracer' } as const),
  pog: Object.freeze({ id: 'pog', label: 'Crucible', vehicleClass: 'podracer' } as const),
  procedural: Object.freeze({ id: 'procedural', label: 'Classic', vehicleClass: 'podracer' } as const),
});

export const DEFAULT_VEHICLE_APPEARANCE: VehicleAppearanceId = 'teemto';
/** Player-facing carousel; procedural art remains an internal loading fallback. */
export const SELECTABLE_POD_APPEARANCES: readonly VehicleAppearanceId[] = Object.freeze([
  'teemto', 'sebulba', 'polwo', 'blockrunner', 'verdigris', 'skybolt', 'needle', 'pog',
]);

export function selectablePodAppearance(preference: VehicleAppearanceId): VehicleAppearanceId {
  return SELECTABLE_POD_APPEARANCES.includes(preference) ? preference : DEFAULT_VEHICLE_APPEARANCE;
}
/** Storage key kept for save compatibility; the id values are internal slots. */
export const VEHICLE_APPEARANCE_STORAGE_KEY = 'now-this-is-podracing.vehicle-appearance';
export const VEHICLE_APPEARANCE_VERSION = 1 as const;

/** Stable identity preferences; the existing physics-class gate still applies. */
const AI_APPEARANCE_ROSTER: Readonly<Record<string, VehicleAppearanceId>> = Object.freeze({
  'ai-vexa': 'polwo',
  'ai-talik': 'verdigris',
  'ai-kodo': 'sebulba',
  'ai-sola': 'blockrunner',
  'ai-rax': 'skybolt',
  'ai-miri': 'needle',
  'ai-olan': 'pog',
});

/** Human guests occupy AI ids; their replicated choice overrides the AI roster. */
export function resolveRacerAppearancePreference(
  racerId: string | undefined,
  localRacerId: string,
  localPreference: VehicleAppearanceId,
  humanMembers: readonly { readonly racerId: string; readonly podIdentity?: VehicleAppearanceId }[],
): VehicleAppearanceId {
  if (racerId === undefined) return 'procedural';
  if (racerId === localRacerId) return localPreference;
  for (const member of humanMembers) {
    if (member.racerId === racerId) return member.podIdentity && isVehicleAppearanceId(member.podIdentity) ? member.podIdentity : DEFAULT_VEHICLE_APPEARANCE;
  }
  return Object.hasOwn(AI_APPEARANCE_ROSTER, racerId)
    ? AI_APPEARANCE_ROSTER[racerId]!
    : DEFAULT_VEHICLE_APPEARANCE;
}

/** Tall bodywork needs an elevated eye to separate the cockpit and engines.
 * Values follow the original fleet's measured silhouettes (output/fleet). */
export function vehicleChaseClearance(appearance: VehicleAppearanceId): number {
  switch (appearance) {
    case 'teemto': return 3.2;      // Kestrel: tall swept tail fins
    case 'sebulba': return 3.4;     // Scrapjack: oversized salvage engines
    case 'blockrunner': return 3.2; // Bulwark: armoured cage cockpit
    case 'verdigris': return 4.5;   // Sirocco: raised third engine
    case 'needle': return 2.2;      // Glasswing: translucent fins
    case 'pog': return 2.6;         // Crucible: single giant turbine
    default: return 0;
  }
}
const MAX_APPEARANCE_JSON_LENGTH = 1024;

function rootAttachment(x: number, y: number, z: number): VehicleArtAttachment {
  return Object.freeze({ position: Object.freeze([x, y, z] as const) });
}

export function isVehicleAppearanceId(value: unknown): value is VehicleAppearanceId {
  return typeof value === 'string' && Object.hasOwn(ART_APPEARANCES, value);
}

/** Reads only the appearance key. Defaults are not written over corrupt or future saves. */
export function loadVehicleAppearance(
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
): VehicleAppearanceId {
  if (!storage) return DEFAULT_VEHICLE_APPEARANCE;
  try {
    const json = storage.getItem(VEHICLE_APPEARANCE_STORAGE_KEY);
    if (json === null || json.length > MAX_APPEARANCE_JSON_LENGTH) return DEFAULT_VEHICLE_APPEARANCE;
    const saved: unknown = JSON.parse(json);
    if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return DEFAULT_VEHICLE_APPEARANCE;
    const document = saved as Record<string, unknown>;
    return document.version === VEHICLE_APPEARANCE_VERSION && isVehicleAppearanceId(document.appearance)
      ? document.appearance
      : DEFAULT_VEHICLE_APPEARANCE;
  } catch {
    return DEFAULT_VEHICLE_APPEARANCE;
  }
}

/** Invalid input and unavailable storage leave the last saved preference untouched. */
export function saveVehicleAppearance(
  id: unknown,
  storage: SettingsStorage | null = resolveBrowserSettingsStorage(),
): boolean {
  if (!storage || !isVehicleAppearanceId(id)) return false;
  try {
    storage.setItem(VEHICLE_APPEARANCE_STORAGE_KEY, JSON.stringify({
      version: VEHICLE_APPEARANCE_VERSION,
      appearance: id,
    }));
    return true;
  } catch {
    return false;
  }
}

/** Other classes use their procedural body without replacing the podracer preference. */
export function resolveVehicleAppearance(
  physicsClass: GalacticVehicleClass,
  preference: unknown = DEFAULT_VEHICLE_APPEARANCE,
): VehicleAppearanceId {
  if (physicsClass !== 'podracer') return 'procedural';
  return isVehicleAppearanceId(preference) ? preference : DEFAULT_VEHICLE_APPEARANCE;
}

/**
 * The original fleet. Parts were generated from the fleet concept sheet
 * (Higgsfield image, Meshy image-to-3D) and assembled by
 * output/fleet/build_fleet.py into this runtime contract: +Z forward, +Y up,
 * bottom near y=0, rigid opaque meshes, Draco geometry and WebP textures.
 * Each craft fits the physics envelope of the slot it occupies
 * (src/game/podGeometry.ts), so handling and collision are unchanged.
 */
function fleetArt(id: VehicleAppearanceId, pod: string, attachments: Readonly<Record<string, VehicleArtAttachment>>,
  exhaustApertureRadius: number | undefined): Readonly<Record<VehicleArtLod, VehicleArtDefinition>> {
  const definition = (lod: VehicleArtLod): VehicleArtDefinition => Object.freeze({
    id, revision: `${pod}-fleet-v1`, url: `/assets/fleet/${pod}-${lod}.glb`,
    hasAuthoredExhaustHardware: true,
    ...(exhaustApertureRadius !== undefined ? { exhaustApertureRadius } : {}),
    attachments: Object.freeze(attachments),
  });
  return Object.freeze({ hero: definition('hero'), rival: definition('rival') });
}

export const FLEET_ART_DEFINITIONS: Readonly<Partial<Record<VehicleAppearanceId, Readonly<Record<VehicleArtLod, VehicleArtDefinition>>>>> = Object.freeze({
  teemto: fleetArt('teemto', 'kestrel', { pilot: rootAttachment(0.0, 1.535, -4.6), exhaustLeft: rootAttachment(-4.05, 3.294, 5.9), exhaustRight: rootAttachment(4.05, 3.294, 5.9), couplingLeft: rootAttachment(-1.946, 4.318, 19.64), couplingRight: rootAttachment(1.946, 4.318, 19.64) }, 1.074),
  sebulba: fleetArt('sebulba', 'scrapjack', { pilot: rootAttachment(0.0, 2.758, -3.9), exhaustLeft: rootAttachment(-4.43, 3.888, 3.9), exhaustRight: rootAttachment(4.43, 3.874, 3.9), couplingLeft: rootAttachment(-1.371, 5.066, 16.328), couplingRight: rootAttachment(1.073, 5.047, 16.328) }, 1.561),
  polwo: fleetArt('polwo', 'hornet', { pilot: rootAttachment(0.0, 3.75, -4.0), exhaustLeft: rootAttachment(-3.93, 1.602, 9.516), exhaustRight: rootAttachment(3.93, 1.602, 9.516), couplingLeft: rootAttachment(-2.13, 2.002, 21.345), couplingRight: rootAttachment(2.13, 2.002, 21.345) }, 0.638),
  blockrunner: fleetArt('blockrunner', 'bulwark', { pilot: rootAttachment(0.0, 3.872, -6.0), exhaustLeft: rootAttachment(-3.15, 2.6, -1.25), exhaustRight: rootAttachment(3.15, 2.6, -1.25), couplingLeft: rootAttachment(-1.344, 3.4, 6.832), couplingRight: rootAttachment(1.344, 3.4, 6.832) }, 0.921),
  verdigris: fleetArt('verdigris', 'sirocco', { pilot: rootAttachment(0.0, 2.345, -3.6), exhaustLeft: rootAttachment(-4.36, 2.006, 4.75), exhaustRight: rootAttachment(4.36, 2.006, 4.75), couplingLeft: rootAttachment(-2.8, 2.582, 10.454), couplingRight: rootAttachment(2.8, 2.582, 10.454) }, 0.796),
  skybolt: fleetArt('skybolt', 'longshot', { pilot: rootAttachment(0.0, 1.115, -3.9), exhaustLeft: rootAttachment(-3.08, 1.716, 3.5), exhaustRight: rootAttachment(3.08, 1.716, 3.5), couplingLeft: rootAttachment(-2.05, 2.156, 15.354), couplingRight: rootAttachment(2.05, 2.156, 15.354) }, 0.525),
  needle: fleetArt('needle', 'glasswing', { pilot: rootAttachment(0.0, 1.957, -1.3), exhaustLeft: rootAttachment(-3.91, 2.516, 5.2), exhaustRight: rootAttachment(3.91, 2.516, 5.2), couplingLeft: rootAttachment(-2.349, 3.252, 9.756), couplingRight: rootAttachment(2.349, 3.252, 9.756) }, 0.796),
  pog: fleetArt('pog', 'crucible', { pilot: rootAttachment(0.0, 2.286, -5.6), exhaustLeft: rootAttachment(0.0, 2.314, -2.0) }, undefined),
});

/** Null explicitly selects the procedural fallback; unknown runtime values cannot fetch art. */
export function getVehicleArtDefinition(
  id: VehicleAppearanceId,
  lod: VehicleArtLod = 'hero',
): VehicleArtDefinition | null {
  if (lod !== 'hero' && lod !== 'rival') return null;
  return FLEET_ART_DEFINITIONS[id]?.[lod] ?? null;
}
