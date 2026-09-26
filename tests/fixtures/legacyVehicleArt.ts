/**
 * The retired replica pods (Round 32-53). They no longer ship: the runtime
 * resolves only the original fleet (src/game/vehicleAppearance.ts). Their
 * packages live in tests/fixtures/legacy-pods so the damage, wreck and camera
 * contracts they were measured against keep running. URLs keep their
 * historical runtime form; legacyPodFile() maps them to the fixture folder.
 */
import type { VehicleArtAttachment, VehicleArtDefinition, VehicleArtSurfaceStyle } from '../../src/render/vehicles';
import { DEFAULT_CEL_PALETTE } from '../../src/render/materials/celPalette';
import type { VehicleAppearanceId, VehicleArtLod } from '../../src/game/vehicleAppearance';

/** Repository-relative fixture path for a historical runtime URL or public/ path. */
export function legacyPodFile(url: string): string {
  return url.replace(/^\/?(public\/)?assets\/inkstorm\/vehicles\//, 'tests/fixtures/legacy-pods/');
}

function rootAttachment(x: number, y: number, z: number): VehicleArtAttachment {
  return Object.freeze({ position: Object.freeze([x, y, z] as const) });
}

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

/** Canonical package nodes; the four original pilot roles remain separate draws. */
export const BLOCKRUNNER_BODY_NODES = Object.freeze({ main: 'blockrunner-body' });


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

/** DCC root measurements; the rear fan plane replaces the initial spike-tip
 * bound for exhaust. See polwo-driver-round32/nozzle-correction/attachments-study-v2.json. */
const POLWO_ATTACHMENTS: Readonly<Record<string, VehicleArtAttachment>> = Object.freeze({
  pilot: rootAttachment(0, 4.2725324630737305, -5.199999809265137),
  exhaustLeft: rootAttachment(-3.929196834564209, 1.6775317192077637, 8.135646316150098),
  exhaustRight: rootAttachment(3.929197072982788, 1.677531659603119, 8.135646316150098),
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

/** This atlas already carries paint wear. An additive red rim over cobalt
 * creates mauve panels, so retain its authored color and surface normal. */
const POLWO_SURFACE_STYLES = Object.freeze({
  ...TEEMTO_PILOT_SURFACE_STYLES,
  'Polwo Inkstorm body paint-v1': Object.freeze({
    specularStrength: .08, rimStrength: 0, reflectionStrength: 0, wear: 0,
    normalStrength: 1,
  }),
} satisfies Readonly<Record<string, VehicleArtSurfaceStyle>>);

/** Pure metadata: importing this module does not create a loader or request art. */
export const TEEMTO_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'teemto',
    revision: 'teemto-open-cockpit-v2',
    url: '/assets/inkstorm/vehicles/optimized/teemto-hero-open-v2-r48.glb',
    damageVariant: Object.freeze({ id: 'teemto-damage', revision: 'teemto-damage-hero-v16-b',
      url: '/assets/inkstorm/vehicles/teemto-damage-hero-v16.glb' }),
    embeddedPilotNodePrefix: 'teemto-pilot-',
    attachments: TEEMTO_ATTACHMENTS,
    surfaceStyles: TEEMTO_PILOT_SURFACE_STYLES,
  }),
  rival: Object.freeze({
    id: 'teemto',
    revision: 'teemto-v1',
    url: '/assets/inkstorm/vehicles/optimized/teemto-rival-r48.glb',
    damageVariant: Object.freeze({ id: 'teemto-damage', revision: 'teemto-damage-rival-v16-b',
      url: '/assets/inkstorm/vehicles/teemto-damage-rival-v16.glb' }),
    embeddedPilotNodePrefix: 'teemto-pilot-',
    attachments: TEEMTO_ATTACHMENTS,
  }),
});

export const SEBULBA_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'sebulba', revision: 'sebulba-v1',
    url: '/assets/inkstorm/vehicles/optimized/sebulba-hero-r48.glb',
    embeddedPilotNodePrefix: 'sebulba-pilot-', attachments: SEBULBA_ATTACHMENTS,
  }),
  rival: Object.freeze({
    id: 'sebulba', revision: 'sebulba-v1',
    url: '/assets/inkstorm/vehicles/optimized/sebulba-rival-r48.glb',
    embeddedPilotNodePrefix: 'sebulba-pilot-', attachments: SEBULBA_ATTACHMENTS,
  }),
});

export const POLWO_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'polwo', revision: 'polwo-inkstorm-v1',
    hasAuthoredExhaustHardware: true,
    url: '/assets/inkstorm/vehicles/optimized/polwo-hero-v1-r48.glb',
    embeddedPilotNodePrefix: 'polwo-pilot-', attachments: POLWO_ATTACHMENTS,
    surfaceStyles: POLWO_SURFACE_STYLES,
  }),
  rival: Object.freeze({
    id: 'polwo', revision: 'polwo-inkstorm-v1',
    hasAuthoredExhaustHardware: true,
    url: '/assets/inkstorm/vehicles/optimized/polwo-rival-v1-r48.glb',
    embeddedPilotNodePrefix: 'polwo-pilot-', attachments: POLWO_ATTACHMENTS,
    surfaceStyles: POLWO_SURFACE_STYLES,
  }),
});

/** Warm key light and cool reflected fill separate the existing atlas surfaces.
 * Paint wear remains authored in the maps; these colors only shape response. */
const BLOCKRUNNER_PALETTE = Object.freeze({
  ...DEFAULT_CEL_PALETTE,
  diffuseBands: ['#535b70', '#9999a3', '#d5d1cb', '#fff4e3'] as const,
  specular: '#fff0cf', rim: '#dbc5a4', reflection: '#9ab6ca',
});
/** Slate cloth stays below the titanium helmet; the shared source atlas still
 * supplies pigment and contact detail. No material or texture is repainted. */
const BLOCKRUNNER_SUIT_PALETTE = Object.freeze({
  ...BLOCKRUNNER_PALETTE,
  diffuseBands: ['#8d99ad', '#b3bdc6', '#d4d6d5', '#eee7d8'] as const,
  rim: '#c4cbd0',
});
const BLOCKRUNNER_HELMET_PALETTE = Object.freeze({
  ...BLOCKRUNNER_PALETTE,
  diffuseBands: ['#8b98ac', '#b6c0c9', '#e0e1dd', '#fff4e3'] as const,
});
const BLOCKRUNNER_SURFACE_STYLES = Object.freeze({
  'Blockrunner Inkstorm body atlas v1': Object.freeze({
    palette: BLOCKRUNNER_PALETTE, paintedShadingSoftness: .85,
    specularStrength: .24, rimStrength: .025, reflectionStrength: .045, wear: 0,
  }),
  'Blockrunner Inkstorm pilot suit atlas v1': Object.freeze({
    palette: BLOCKRUNNER_SUIT_PALETTE, baseColorStrength: .86, paintedShadingSoftness: .45,
    normalStrength: .25, specularStrength: .035, rimStrength: .025, reflectionStrength: 0, wear: 0,
  }),
  'Blockrunner Inkstorm pilot helmet atlas v1': Object.freeze({
    palette: BLOCKRUNNER_HELMET_PALETTE, baseColorStrength: .94, paintedShadingSoftness: .75,
    specularStrength: .32, rimStrength: .035, reflectionStrength: .1, wear: 0,
  }),
  'Blockrunner Inkstorm pilot visor atlas v1': Object.freeze({
    palette: BLOCKRUNNER_PALETTE,
    specularStrength: .42, rimStrength: .015, reflectionStrength: .18, wear: 0,
  }),
  'Blockrunner Inkstorm pilot gloves atlas v1': Object.freeze({
    specularStrength: .035, rimStrength: 0, reflectionStrength: 0, wear: 0,
  }),
} satisfies Readonly<Record<string, VehicleArtSurfaceStyle>>);

/** Exact normalization candidate: package verification must prove these root coordinates.
 * The rigid source crossbeam needs no duplicate energy coupling. */
const BLOCKRUNNER_ATTACHMENTS: Readonly<Record<string, VehicleArtAttachment>> = Object.freeze({
  pilot: rootAttachment(0, 2.8454298774641376, -5.200000000000003),
  exhaustLeft: rootAttachment(-3.651407175599785, 1.4209392232848972, 2.96253509241496),
  exhaustRight: rootAttachment(3.482691623294051, 1.4209392232848972, 2.9625384568864277),
});

/** Requires the separately reviewed exhaust-aperture candidate before application. */
export const BLOCKRUNNER_ART_DEFINITIONS: Readonly<Record<VehicleArtLod, VehicleArtDefinition>> = Object.freeze({
  hero: Object.freeze({
    id: 'blockrunner', revision: 'blockrunner-inkstorm-v1',
    url: '/assets/inkstorm/vehicles/optimized/blockrunner-hero-v1-r48.glb',
    embeddedPilotNodePrefix: 'blockrunner-pilot-',
    hasAuthoredExhaustHardware: true, exhaustApertureRadius: .34,
    attachments: BLOCKRUNNER_ATTACHMENTS, surfaceStyles: BLOCKRUNNER_SURFACE_STYLES,
  }),
  rival: Object.freeze({
    id: 'blockrunner', revision: 'blockrunner-inkstorm-v1',
    url: '/assets/inkstorm/vehicles/optimized/blockrunner-rival-v1-r48.glb',
    embeddedPilotNodePrefix: 'blockrunner-pilot-',
    hasAuthoredExhaustHardware: true, exhaustApertureRadius: .34,
    attachments: BLOCKRUNNER_ATTACHMENTS, surfaceStyles: BLOCKRUNNER_SURFACE_STYLES,
  }),
});

/** Recovered source packages; anchors are measured in the isolated DCC export. */
function recoveredArt(id: VehicleAppearanceId, attachments: Readonly<Record<string, VehicleArtAttachment>>): Readonly<Record<VehicleArtLod, VehicleArtDefinition>> {
  const definition = (lod: VehicleArtLod): VehicleArtDefinition => Object.freeze({
    id, revision: `${id}-recovery-v1`, url: `/assets/inkstorm/vehicles/optimized/${id}-${lod}-v1-r48.glb`,
    hasAuthoredExhaustHardware: true, embeddedPilotNodePrefix: `${id}-pilot-`,
    attachments: Object.freeze(attachments), surfaceStyles: TEEMTO_PILOT_SURFACE_STYLES,
  });
  return Object.freeze({ hero: definition('hero'), rival: definition('rival') });
}
export const RECOVERED_ART_DEFINITIONS: Readonly<Partial<Record<VehicleAppearanceId, Readonly<Record<VehicleArtLod, VehicleArtDefinition>>>>> = Object.freeze({
  verdigris: recoveredArt('verdigris', { pilot: rootAttachment(0.0, 2.87261, -4.24028), exhaustLeft: rootAttachment(-4.366, 1.57021, 5.60172), exhaustRight: rootAttachment(4.366, 1.57021, 5.60172), couplingLeft: rootAttachment(-2.442, 1.76261, 8.70972), couplingRight: rootAttachment(2.442, 1.76261, 8.70972) }),
  skybolt: recoveredArt('skybolt', { pilot: rootAttachment(0.0, 2.9402, -4.1018), exhaustLeft: rootAttachment(-3.08, 1.7102, 3.2982), exhaustRight: rootAttachment(3.08, 1.7102, 3.2982), couplingLeft: rootAttachment(-2.0, 1.7102, 11.6982), couplingRight: rootAttachment(2.0, 1.7102, 11.6982) }),
  needle: recoveredArt('needle', { pilot: rootAttachment(0.0, 2.98694, -0.51527), exhaustLeft: rootAttachment(-3.91532, 2.52494, 6.74473), exhaustRight: rootAttachment(3.91228, 2.52494, 6.74473), couplingLeft: rootAttachment(-2.48972, 2.52494, 8.19673), couplingRight: rootAttachment(2.52628, 2.52494, 8.19673) }),
  pog: recoveredArt('pog', { pilot: rootAttachment(0, 6, -3), exhaustLeft: rootAttachment(0.0, 1.55288, -5.83469) }),
});


/** The historical resolver, for contracts that exercised the replica packages. */
export function getLegacyVehicleArtDefinition(id: VehicleAppearanceId, lod: VehicleArtLod = 'hero'): VehicleArtDefinition | null {
  if (id === 'teemto') return TEEMTO_ART_DEFINITIONS[lod];
  if (id === 'sebulba') return SEBULBA_ART_DEFINITIONS[lod];
  if (id === 'polwo') return POLWO_ART_DEFINITIONS[lod];
  return id === 'blockrunner' ? BLOCKRUNNER_ART_DEFINITIONS[lod] : RECOVERED_ART_DEFINITIONS[id]?.[lod] ?? null;
}
