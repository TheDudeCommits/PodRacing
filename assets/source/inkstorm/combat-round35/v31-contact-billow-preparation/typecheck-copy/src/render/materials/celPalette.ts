import type { ColorRepresentation } from 'three';

export type CelDiffuseBands =
  | readonly [ColorRepresentation, ColorRepresentation, ColorRepresentation]
  | readonly [
      ColorRepresentation,
      ColorRepresentation,
      ColorRepresentation,
      ColorRepresentation,
    ];

/** A complete, deliberately limited palette for one family of game objects. */
export interface CelPalette {
  readonly diffuseBands: CelDiffuseBands;
  readonly ink: ColorRepresentation;
  readonly specular: ColorRepresentation;
  readonly rim: ColorRepresentation;
  readonly reflection: ColorRepresentation;
  readonly emissive: ColorRepresentation;
  readonly haze: ColorRepresentation;
}

export const DEFAULT_CEL_THRESHOLDS = Object.freeze([0.16, 0.46, 0.74] as const);
export const DEFAULT_CEL_THRESHOLDS_THREE_BAND = Object.freeze([0.3, 0.68] as const);

/**
 * Shared art-direction swatches. Reusing a small set of palettes is intentional:
 * the racers should read as graphic shapes, not as a collection of PBR materials.
 */
export const CEL_PALETTES = Object.freeze({
  player: {
    diffuseBands: ['#142238', '#234563', '#386f91', '#648fa7'],
    ink: '#130d1e',
    specular: '#ffe49b',
    rim: '#75f2da',
    reflection: '#6b7fe8',
    emissive: '#ff6a35',
    haze: '#e88354',
  },
  rivalTeal: {
    diffuseBands: ['#10202b', '#174f58', '#25958a', '#92e0ac'],
    ink: '#0b101b',
    specular: '#f8e9ad',
    rim: '#ffb051',
    reflection: '#596fd1',
    emissive: '#79ffbd',
    haze: '#df7b50',
  },
  rivalGold: {
    diffuseBands: ['#302038', '#853c37', '#de613d', '#ffc487'],
    ink: '#120d19',
    specular: '#fff0bd',
    rim: '#ee5d75',
    reflection: '#805bc6',
    emissive: '#ffe064',
    haze: '#e27b4c',
  },
  machinery: {
    diffuseBands: ['#151526', '#303247', '#646071', '#b8a98c'],
    ink: '#090a12',
    specular: '#f9dca3',
    rim: '#df5a4f',
    reflection: '#4b61ae',
    emissive: '#ee512e',
    haze: '#d4744a',
  },
  sandstone: {
    diffuseBands: ['#342947', '#854658', '#d97149', '#ffc48c'],
    ink: '#2a1724',
    specular: '#ffe5a0',
    rim: '#f9a64f',
    reflection: '#7e547f',
    emissive: '#f0a54f',
    haze: '#dc7147',
  },
  checkpoint: {
    diffuseBands: ['#102331', '#17535a', '#179979', '#70f4a2'],
    ink: '#08131b',
    specular: '#eaffca',
    rim: '#b6ff8a',
    reflection: '#4c74c5',
    emissive: '#48ff86',
    haze: '#d97849',
  },
} satisfies Readonly<Record<string, CelPalette>>);

export const DEFAULT_CEL_PALETTE: CelPalette = CEL_PALETTES.machinery;
