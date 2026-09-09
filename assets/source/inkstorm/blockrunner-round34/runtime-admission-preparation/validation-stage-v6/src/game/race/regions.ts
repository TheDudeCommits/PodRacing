import type { CourseBranchKind, DesertRegionId } from './types';

export const TERRAIN_REGION_CELL_SIZE = 9_600;
export const TERRAIN_REGION_TRANSITION = 720;

export const DESERT_REGION_ORDER = Object.freeze([
  'sunscar-dunes',
  'glass-flats',
  'red-canyon',
  'storm-basin',
  'machine-graveyard',
  'geothermal-badlands',
] as const satisfies readonly DesertRegionId[]);

export interface DesertRegionProfile {
  id: DesertRegionId;
  label: string;
  terrainIndex: number;
  preferredBranches: readonly CourseBranchKind[];
  palette: Readonly<{
    shadow: string;
    dark: string;
    mid: string;
    sun: string;
    crest: string;
    mineral: string;
    sparkle: string;
    haze: string;
  }>;
  atmosphere: Readonly<{
    skyTop: string;
    skyHorizon: string;
    haze: string;
    sunTint: string;
    dustTint: string;
    windStrength: number;
  }>;
  /** Terrain-aware generator thresholds, deliberately looser on flat regions. */
  minimumLaunchScore: number;
  maximumCourseSlope: number;
}

function branchKinds(...kinds: CourseBranchKind[]): readonly CourseBranchKind[] {
  return Object.freeze(kinds);
}

export const DESERT_REGIONS: Readonly<Record<DesertRegionId, DesertRegionProfile>> = Object.freeze({
  'sunscar-dunes': Object.freeze({
    id: 'sunscar-dunes', label: 'Sunscar Dunes', terrainIndex: 0,
    preferredBranches: branchKinds('jump', 'shortcut', 'technical'),
    palette: Object.freeze({
      shadow: '#672b35', dark: '#bd5839', mid: '#e37b42', sun: '#ffb55f',
      crest: '#ffd786', mineral: '#b94338', sparkle: '#fff1ae', haze: '#e58159',
    }),
    atmosphere: Object.freeze({
      skyTop: '#a28ea4', skyHorizon: '#ffd6a7', haze: '#c6a0b0', sunTint: '#fff4cc',
      dustTint: '#ffd18a', windStrength: 0.96,
    }),
    minimumLaunchScore: 0.07, maximumCourseSlope: 1.35,
  }),
  'glass-flats': Object.freeze({
    id: 'glass-flats', label: 'Sunglass Flats', terrainIndex: 1,
    preferredBranches: branchKinds('salvage', 'shortcut', 'safe'),
    palette: Object.freeze({
      shadow: '#283149', dark: '#596a78', mid: '#8fa3a8', sun: '#c5d9cc',
      crest: '#eaffdc', mineral: '#4ec1ae', sparkle: '#ffffff', haze: '#9cc8bd',
    }),
    atmosphere: Object.freeze({
      skyTop: '#284c74', skyHorizon: '#b2e2d2', haze: '#9cc8bd', sunTint: '#e9ffe0',
      dustTint: '#c5dfd1', windStrength: 0.62,
    }),
    minimumLaunchScore: 0.015, maximumCourseSlope: 0.5,
  }),
  'red-canyon': Object.freeze({
    id: 'red-canyon', label: 'Krayt Red Canyon', terrainIndex: 2,
    preferredBranches: branchKinds('shortcut', 'technical', 'safe'),
    palette: Object.freeze({
      shadow: '#391724', dark: '#73272a', mid: '#a83f2d', sun: '#df7140',
      crest: '#f6ab61', mineral: '#5c1c2a', sparkle: '#ffd39a', haze: '#9b4038',
    }),
    atmosphere: Object.freeze({
      skyTop: '#aa8190', skyHorizon: '#ffd0a0', haze: '#bc99ae', sunTint: '#fff1c7',
      dustTint: '#d56b48', windStrength: 0.74,
    }),
    minimumLaunchScore: 0.045, maximumCourseSlope: 1.25,
  }),
  'storm-basin': Object.freeze({
    id: 'storm-basin', label: 'Vanta Storm Basin', terrainIndex: 3,
    preferredBranches: branchKinds('safe', 'technical', 'shortcut'),
    palette: Object.freeze({
      shadow: '#241d3b', dark: '#4d4158', mid: '#756477', sun: '#a98a8b',
      crest: '#d4b5a6', mineral: '#49335b', sparkle: '#d9d2ff', haze: '#65556f',
    }),
    atmosphere: Object.freeze({
      skyTop: '#191b38', skyHorizon: '#77627b', haze: '#65556f', sunTint: '#d9c5d7',
      dustTint: '#8a7182', windStrength: 1.3,
    }),
    minimumLaunchScore: 0.03, maximumCourseSlope: 0.75,
  }),
  'machine-graveyard': Object.freeze({
    id: 'machine-graveyard', label: 'Machine Graveyard', terrainIndex: 4,
    preferredBranches: branchKinds('salvage', 'technical', 'shortcut'),
    palette: Object.freeze({
      shadow: '#1f2530', dark: '#4b4b49', mid: '#766f5b', sun: '#aaa078',
      crest: '#dfcf93', mineral: '#4f796e', sparkle: '#eaffc6', haze: '#807863',
    }),
    atmosphere: Object.freeze({
      skyTop: '#263249', skyHorizon: '#9c8f72', haze: '#807863', sunTint: '#e8d69a',
      dustTint: '#a79a78', windStrength: 0.8,
    }),
    minimumLaunchScore: 0.02, maximumCourseSlope: 0.8,
  }),
  'geothermal-badlands': Object.freeze({
    id: 'geothermal-badlands', label: 'Geothermal Badlands', terrainIndex: 5,
    preferredBranches: branchKinds('jump', 'technical', 'salvage'),
    palette: Object.freeze({
      shadow: '#2c1728', dark: '#663238', mid: '#9a4f37', sun: '#cf783e',
      crest: '#f3b85d', mineral: '#7c2840', sparkle: '#ffe887', haze: '#985044',
    }),
    atmosphere: Object.freeze({
      skyTop: '#3d234b', skyHorizon: '#c2674d', haze: '#985044', sunTint: '#ffc95f',
      dustTint: '#bd6e4d', windStrength: 1.04,
    }),
    minimumLaunchScore: 0.055, maximumCourseSlope: 1.5,
  }),
});

function positiveModulo(value: number, divisor: number): number {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function smoother(value: number): number {
  const safe = Math.min(1, Math.max(0, value));
  return safe * safe * safe * (safe * (safe * 6 - 15) + 10);
}

export function desertRegionByIndex(index: number): DesertRegionProfile {
  const id = DESERT_REGION_ORDER[positiveModulo(Math.floor(index), DESERT_REGION_ORDER.length)]
    ?? 'sunscar-dunes';
  return DESERT_REGIONS[id];
}

export function desertRegionForSeed(seed: number): DesertRegionProfile {
  if ((seed >>> 0) === 0x494e4b53) return DESERT_REGIONS['red-canyon'];
  if ((seed >>> 0) === 0x464f554e) return DESERT_REGIONS['machine-graveyard'];
  if ((seed >>> 0) === 0x474c4153) return DESERT_REGIONS['glass-flats'];
  let value = seed >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return desertRegionByIndex(value >>> 0);
}

export interface TerrainRegionBlend {
  fromIndex: number;
  toIndex: number;
  amount: number;
}

/** Allocation-free region lookup shared by gameplay terrain and diagnostics. */
export function terrainRegionBlendAt(
  worldX: number,
  out: TerrainRegionBlend,
): TerrainRegionBlend {
  const cell = Math.floor(worldX / TERRAIN_REGION_CELL_SIZE + 0.5);
  const local = worldX - cell * TERRAIN_REGION_CELL_SIZE;
  const half = TERRAIN_REGION_CELL_SIZE * 0.5;
  const blendStart = half - TERRAIN_REGION_TRANSITION;
  if (local > blendStart) {
    out.fromIndex = positiveModulo(cell, 6);
    out.toIndex = positiveModulo(cell + 1, 6);
    out.amount = smoother((local - blendStart) / (TERRAIN_REGION_TRANSITION * 2));
  } else if (local < -blendStart) {
    out.fromIndex = positiveModulo(cell - 1, 6);
    out.toIndex = positiveModulo(cell, 6);
    out.amount = smoother(
      (local + half + TERRAIN_REGION_TRANSITION) / (TERRAIN_REGION_TRANSITION * 2),
    );
  } else {
    out.fromIndex = positiveModulo(cell, 6);
    out.toIndex = out.fromIndex;
    out.amount = 0;
  }
  return out;
}

/** Places a generated circuit deep inside its selected region's plateau. */
export function desertRegionAnchor(
  region: DesertRegionId,
  seed: number,
): Readonly<{ x: number; z: number }> {
  const index = DESERT_REGIONS[region].terrainIndex;
  const signedCell = index <= 2 ? index : index - 6;
  const mixed = Math.imul((seed ^ 0x71f2a9cd) >>> 0, 0x9e3779b1) >>> 0;
  const zJitter = (mixed / 0x1_0000_0000 - 0.5) * 1_600;
  return Object.freeze({ x: signedCell * TERRAIN_REGION_CELL_SIZE, z: zJitter });
}
