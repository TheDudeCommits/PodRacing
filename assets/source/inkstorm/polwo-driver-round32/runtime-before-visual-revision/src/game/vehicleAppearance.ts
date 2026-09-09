import type { VehicleArtAttachment, VehicleArtDefinition, VehicleArtSurfaceStyle } from '../render/vehicles';
import { DEFAULT_CEL_PALETTE } from '../render/materials/celPalette';
import type { GalacticVehicleClass } from './galactic/types';
import { resolveBrowserSettingsStorage, type SettingsStorage } from './settings/storage';

export type VehicleAppearanceId = 'teemto' | 'sebulba' | 'polwo' | 'procedural';
export type VehicleArtLod = 'hero' | 'rival';

/** Appearance never changes the physics class, workshop loadout or record identity. */
export const ART_APPEARANCES = Object.freeze({
  teemto: Object.freeze({ id: 'teemto', label: 'Teemto', vehicleClass: 'podracer' } as const),
  sebulba: Object.freeze({ id: 'sebulba', label: 'Sebulba', vehicleClass: 'podracer' } as const),
  polwo: Object.freeze({ id: 'polwo', label: 'Polwo', vehicleClass: 'podracer' } as const),
  procedural: Object.freeze({ id: 'procedural', label: 'Classic', vehicleClass: 'podracer' } as const),
});

export const DEFAULT_VEHICLE_APPEARANCE: VehicleAppearanceId = 'teemto';
export const VEHICLE_APPEARANCE_STORAGE_KEY = 'now-this-is-podracing.vehicle-appearance';
export const VEHICLE_APPEARANCE_VERSION = 1 as const;
const MAX_APPEARANCE_JSON_LENGTH = 1024;

/** Exact exported nodes; mesh positions are baked and group transforms start at identity. */
export const TEEMTO_BODY_NODES = Object.freeze({
  cockpit: 'teemto-cockpit-body',
  engineLeft: 'teemto-engine-left-body',
  engineRight: 'teemto-engine-right-body',
});

export const TEEMTO_BODY_GROUP_NODES = Object.freeze({
  cockpit: 'teemto-cockpit.001',
  engineLeft: 'teemto-engine-left.001',
  engineRight: 'teemto-engine-right.001',
});

/** Sebulba is a static rigid shell/hardware pair, without separate engine pivots. */
export const SEBULBA_BODY_NODES = Object.freeze({
  hardware: 'sebulba-body-hardware.002',
  shell: 'sebulba-body-shell.002',
});

/** Canonical rigid mesh names from the Polwo runtime packager. */
export const POLWO_BODY_NODES = Object.freeze({
  main: 'polwo-body-0',
  antenna: 'polwo-body-1',
});

function rootAttachment(x: number, y: number, z: number): VehicleArtAttachment {
  return Object.freeze({ position: Object.freeze([x, y, z] as const) });
}

/** DCC-provided model-root coordinates; exported art is +Z forward and +Y up. */
const TEEMTO_ATTACHMENTS: Readonly<Record<string, VehicleArtAttachment>> = Object.freeze({
  pilot: rootAttachment(0, 2.2, -5.2),
  exhaustLeft: rootAttachment(-4.075, 0.178, 5.638),
  exhaustRight: rootAttachment(4.025, 0.178, 5.638),
  couplingLeft: rootAttachment(-1.3, 3.238, 18.941),
  couplingRight: rootAttachment(1.325, 3.238, 18.941),
});

/** Measured normalized export coordinates; both optimized variants share this basis. */
const SEBULBA_ATTACHMENTS: Readonly<Record<string, VehicleArtAttachment>> = Object.freeze({
  pilot: rootAttachment(0, 1.366, -5.2),
  exhaustLeft: rootAttachment(-4.426030636, 3.854108810, 3.669570684),
  exhaustRight: rootAttachment(4.426030159, 3.854107857, 3.669572830),
  couplingLeft: rootAttachment(-2.767781019, 3.899996042, 10.019994736),
  couplingRight: rootAttachment(2.767776728, 3.899995565, 10.019995689),
});

/** DCC root measurements from polwo-driver-round32/attachments-study.json.
 * Nozzle opening/contact alignment still requires the actual runtime review. */
const POLWO_ATTACHMENTS: Readonly<Record<string, VehicleArtAttachment>> = Object.freeze({
  pilot: rootAttachment(0, 4.2725324630737305, -5.199999809265137),
  exhaustLeft: rootAttachment(-3.929196834564209, 1.6775317192077637, 5.835364818572998),
  exhaustRight: rootAttachment(3.929197072982788, 1.677531659603119, 5.835364818572998),
  couplingLeft: rootAttachment(-3.0361387729644775, 1.6775315403938293, 14.65654182434082),
  couplingRight: rootAttachment(3.0361380577087402, 1.6775315403938293, 14.65653944015503),
});

const TEEMTO_CLOTH_PALETTE = Object.freeze({
  ...DEFAULT_CEL_PALETTE,
  diffuseBands: ['#9ba5b7', '#c0c4c9', '#e5ddd0', '#fff2dd'] as const,
});
const TEEMTO_CLOTH_STYLE: VehicleArtSurfaceStyle = Object.freeze({
  palette: TEEMTO_CLOTH_PALETTE,
  normalStrength: .25, specularStrength: .025, rimStrength: 0,
  reflectionStrength: 0, wear: 0,
});
/** Exact DCC material contracts: cloth, webbing and leather keep distinct responses. */
const TEEMTO_PILOT_SURFACE_STYLES = Object.freeze({
  'Pilot atlas v4c runtime suit': TEEMTO_CLOTH_STYLE,
  'Pilot atlas v4c runtime accent': TEEMTO_CLOTH_STYLE,
  'Pilot atlas v4c runtime webbing': Object.freeze({ ...TEEMTO_CLOTH_STYLE,
    normalStrength: .35, specularStrength: .035, rimStrength: .01 }),
  'Pilot atlas v4c runtime rubber': Object.freeze({
    normalStrength: .5, specularStrength: .09, rimStrength: .035,
    reflectionStrength: .015, wear: 0,
  }),
} satisfies Readonly<Record<string, VehicleArtSurfaceStyle>>);

/** Pure metadata: importing this module does not create a loader or request art. */
export const TEEMTO_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'teemto',
    revision: 'teemto-open-cockpit-v2',
    url: '/assets/inkstorm/vehicles/teemto-hero-open-v2.glb',
    embeddedPilotNodePrefix: 'teemto-pilot-',
    attachments: TEEMTO_ATTACHMENTS,
    surfaceStyles: TEEMTO_PILOT_SURFACE_STYLES,
  }),
  rival: Object.freeze({
    id: 'teemto',
    revision: 'teemto-v1',
    url: '/assets/inkstorm/vehicles/teemto-rival.glb',
    embeddedPilotNodePrefix: 'teemto-pilot-',
    attachments: TEEMTO_ATTACHMENTS,
  }),
});

export const SEBULBA_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'sebulba', revision: 'sebulba-v1',
    url: '/assets/inkstorm/vehicles/sebulba-hero.glb',
    embeddedPilotNodePrefix: 'sebulba-pilot-', attachments: SEBULBA_ATTACHMENTS,
  }),
  rival: Object.freeze({
    id: 'sebulba', revision: 'sebulba-v1',
    url: '/assets/inkstorm/vehicles/sebulba-rival.glb',
    embeddedPilotNodePrefix: 'sebulba-pilot-', attachments: SEBULBA_ATTACHMENTS,
  }),
});

export const POLWO_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'polwo', revision: 'polwo-inkstorm-v1',
    url: '/assets/inkstorm/vehicles/polwo-hero-v1.glb',
    embeddedPilotNodePrefix: 'polwo-pilot-', attachments: POLWO_ATTACHMENTS,
    surfaceStyles: TEEMTO_PILOT_SURFACE_STYLES,
  }),
  rival: Object.freeze({
    id: 'polwo', revision: 'polwo-inkstorm-v1',
    url: '/assets/inkstorm/vehicles/polwo-rival-v1.glb',
    embeddedPilotNodePrefix: 'polwo-pilot-', attachments: POLWO_ATTACHMENTS,
    surfaceStyles: TEEMTO_PILOT_SURFACE_STYLES,
  }),
});

export function isVehicleAppearanceId(value: unknown): value is VehicleAppearanceId {
  return value === 'teemto' || value === 'sebulba' || value === 'polwo' || value === 'procedural';
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

/** Null explicitly selects the procedural fallback; unknown runtime values cannot fetch art. */
export function getVehicleArtDefinition(
  id: VehicleAppearanceId,
  lod: VehicleArtLod = 'hero',
): VehicleArtDefinition | null {
  if (lod !== 'hero' && lod !== 'rival') return null;
  if (id === 'teemto') return TEEMTO_ART_DEFINITIONS[lod];
  if (id === 'sebulba') return SEBULBA_ART_DEFINITIONS[lod];
  return id === 'polwo' ? POLWO_ART_DEFINITIONS[lod] : null;
}
