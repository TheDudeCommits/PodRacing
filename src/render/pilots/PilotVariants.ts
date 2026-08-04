import type { CelPalette } from '../materials';
import { CEL_PALETTES } from '../materials';

export type PilotVariantId = 'sunflare' | 'dune-fang' | 'gilded-bolt' | 'night-comet';
export type PilotHelmetStyle = 'goggles' | 'fin' | 'full-visor' | 'desert-wrap';
export type PilotAccessory = 'scarf' | 'breather' | 'crest' | 'head-tails';

export interface PilotVariantConfig {
  readonly id: PilotVariantId;
  readonly callSign: string;
  readonly suitPalette: CelPalette;
  readonly accentPalette: CelPalette;
  readonly skinPalette: CelPalette;
  readonly helmetStyle: PilotHelmetStyle;
  readonly accessory: PilotAccessory;
  readonly dominantSide: -1 | 1;
  readonly motionPhase: number;
  readonly proportions: {
    readonly height: number;
    readonly shoulderWidth: number;
    readonly torsoDepth: number;
    readonly headScale: number;
    readonly armScale: number;
  };
}

const warmSkin = Object.freeze({
  diffuseBands: ['#401d24', '#8c4638', '#d78a61', '#ffd09a'],
  ink: '#180d17',
  specular: '#ffe1af',
  rim: '#79ecd8',
  reflection: '#755f9f',
  emissive: '#e36d44',
  haze: '#dc7951',
} as const satisfies CelPalette);

const jadeSkin = Object.freeze({
  diffuseBands: ['#16252a', '#31524b', '#71916a', '#bdd18f'],
  ink: '#0c1419',
  specular: '#f4e3b1',
  rim: '#ffb759',
  reflection: '#5365a6',
  emissive: '#68c68d',
  haze: '#d77750',
} as const satisfies CelPalette);

const copperSkin = Object.freeze({
  diffuseBands: ['#2c1721', '#63352f', '#a96345', '#e6a269'],
  ink: '#140c15',
  specular: '#ffe0a3',
  rim: '#f06d75',
  reflection: '#70528d',
  emissive: '#d46c3d',
  haze: '#db764d',
} as const satisfies CelPalette);

const moonSkin = Object.freeze({
  diffuseBands: ['#1a172b', '#3c3758', '#716b92', '#b8abd1'],
  ink: '#0d0b18',
  specular: '#f5e5ff',
  rim: '#67e6de',
  reflection: '#4e62af',
  emissive: '#936dd6',
  haze: '#d57955',
} as const satisfies CelPalette);

const creamAccent = Object.freeze({
  diffuseBands: ['#382128', '#7e5139', '#d39a55', '#ffe29a'],
  ink: '#180f19',
  specular: '#fff4c7',
  rim: '#71ebd8',
  reflection: '#6b6fb4',
  emissive: '#ff9a4c',
  haze: '#de7950',
} as const satisfies CelPalette);

const tealAccent = Object.freeze({
  diffuseBands: ['#111b29', '#1e5061', '#32a7a0', '#a2f0bc'],
  ink: '#091019',
  specular: '#fff0b8',
  rim: '#ffb758',
  reflection: '#5f67ba',
  emissive: '#60ffc0',
  haze: '#dd7950',
} as const satisfies CelPalette);

const redAccent = Object.freeze({
  diffuseBands: ['#29131f', '#6d2931', '#c84a3f', '#ff9a58'],
  ink: '#130b14',
  specular: '#ffe7a9',
  rim: '#ffe260',
  reflection: '#7653a7',
  emissive: '#ff623e',
  haze: '#dd764c',
} as const satisfies CelPalette);

const violetSuit = Object.freeze({
  diffuseBands: ['#151329', '#332b59', '#6254a0', '#b38ae2'],
  ink: '#0a0915',
  specular: '#f5dcff',
  rim: '#70f0dc',
  reflection: '#536dcc',
  emissive: '#b86cff',
  haze: '#d77653',
} as const satisfies CelPalette);

const violetAccent = Object.freeze({
  diffuseBands: ['#17162b', '#2c5363', '#3ca9a2', '#a6f2ca'],
  ink: '#090c17',
  specular: '#f9efbf',
  rim: '#d891ff',
  reflection: '#5c62bb',
  emissive: '#70ffd5',
  haze: '#d77751',
} as const satisfies CelPalette);

export const PILOT_VARIANTS = Object.freeze({
  sunflare: {
    id: 'sunflare',
    callSign: 'Sunflare Kid',
    suitPalette: CEL_PALETTES.player,
    accentPalette: creamAccent,
    skinPalette: warmSkin,
    helmetStyle: 'goggles',
    accessory: 'scarf',
    dominantSide: 1,
    motionPhase: 0.17,
    proportions: {
      height: 0.96,
      shoulderWidth: 0.92,
      torsoDepth: 0.92,
      headScale: 1.06,
      armScale: 0.95,
    },
  },
  'dune-fang': {
    id: 'dune-fang',
    callSign: 'Dune Fang',
    suitPalette: CEL_PALETTES.rivalTeal,
    accentPalette: tealAccent,
    skinPalette: jadeSkin,
    helmetStyle: 'fin',
    accessory: 'breather',
    dominantSide: -1,
    motionPhase: 1.83,
    proportions: {
      height: 1.07,
      shoulderWidth: 1.08,
      torsoDepth: 0.98,
      headScale: 0.94,
      armScale: 1.05,
    },
  },
  'gilded-bolt': {
    id: 'gilded-bolt',
    callSign: 'Gilded Bolt',
    suitPalette: CEL_PALETTES.rivalGold,
    accentPalette: redAccent,
    skinPalette: copperSkin,
    helmetStyle: 'full-visor',
    accessory: 'crest',
    dominantSide: 1,
    motionPhase: 3.29,
    proportions: {
      height: 1.02,
      shoulderWidth: 1.16,
      torsoDepth: 1.08,
      headScale: 1.0,
      armScale: 1.02,
    },
  },
  'night-comet': {
    id: 'night-comet',
    callSign: 'Night Comet',
    suitPalette: violetSuit,
    accentPalette: violetAccent,
    skinPalette: moonSkin,
    helmetStyle: 'desert-wrap',
    accessory: 'head-tails',
    dominantSide: -1,
    motionPhase: 4.71,
    proportions: {
      height: 1.12,
      shoulderWidth: 0.87,
      torsoDepth: 0.88,
      headScale: 1.13,
      armScale: 1.08,
    },
  },
} as const satisfies Readonly<Record<PilotVariantId, PilotVariantConfig>>);

export const PILOT_VARIANT_ORDER = Object.freeze([
  'sunflare',
  'dune-fang',
  'gilded-bolt',
  'night-comet',
] as const satisfies readonly PilotVariantId[]);

export function pilotVariantForRacer(racerIndex: number): PilotVariantConfig {
  const safeIndex = Number.isFinite(racerIndex) ? Math.abs(Math.trunc(racerIndex)) : 0;
  const id = PILOT_VARIANT_ORDER[safeIndex % PILOT_VARIANT_ORDER.length] ?? 'sunflare';
  return PILOT_VARIANTS[id];
}
