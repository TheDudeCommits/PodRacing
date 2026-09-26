import { Color, Vector3 } from 'three';

import type { RacingBiomeId } from '../../game/race/racingBiomes';

/** Art-directed camera response for one world. Values are scene-referred
 * (fog, bloom, rays) or display-referred (grade), see cinematicShaders.ts. */
export interface CinematicLook {
  exposure: number;
  bloomStrength: number;
  bloomThreshold: number;
  bloomKnee: number;
  bloomRadius: number;
  raysStrength: number;
  raysDecay: number;
  raysDensity: number;
  raysThreshold: number;
  raysSpread: number;
  sunColor: Color;
  fogColor: Color;
  fogSunColor: Color;
  fogDensity: number;
  fogFalloff: number;
  fogBase: number;
  fogMax: number;
  fogStart: number;
  lift: Vector3;
  gamma: Vector3;
  gain: Vector3;
  saturation: number;
  contrast: number;
  shadowTint: Vector3;
  highlightTint: Vector3;
  splitTone: number;
  vignette: number;
  vignetteColor: Vector3;
  grain: number;
}

type LookSpec = Omit<CinematicLook, 'sunColor' | 'fogColor' | 'fogSunColor' | 'lift' | 'gamma' | 'gain'
  | 'shadowTint' | 'highlightTint' | 'vignetteColor'> & {
  sunColor: string; fogColor: string; fogSunColor: string;
  lift: [number, number, number]; gamma: [number, number, number]; gain: [number, number, number];
  shadowTint: [number, number, number]; highlightTint: [number, number, number];
  vignetteColor: [number, number, number];
};

/** Golden hour over the canyon: warm key, violet shadows, peach-lavender air. */
const SUNSCAR: LookSpec = {
  exposure: 1.06, bloomStrength: .62, bloomThreshold: .92, bloomKnee: .55, bloomRadius: 1,
  raysStrength: 1.05, raysDecay: .962, raysDensity: .92, raysThreshold: .62, raysSpread: .09,
  sunColor: '#ffcf8f', fogColor: '#a996b4', fogSunColor: '#ffbf7a',
  fogDensity: .00026, fogFalloff: .0042, fogBase: -20, fogMax: .7, fogStart: 45,
  lift: [.016, .006, .026], gamma: [1.02, 1, .97], gain: [1.05, 1, .93],
  saturation: 1.12, contrast: 1.07,
  shadowTint: [.46, .43, .60], highlightTint: [.64, .53, .40], splitTone: .28,
  vignette: .42, vignetteColor: [.36, .24, .42], grain: .022,
};

/** Blue hour and aurora: cold air, warm refinery lights. */
const FROSTLINE: LookSpec = {
  exposure: 1.04, bloomStrength: .78, bloomThreshold: .9, bloomKnee: .5, bloomRadius: 1,
  raysStrength: .7, raysDecay: .955, raysDensity: .85, raysThreshold: .7, raysSpread: .07,
  sunColor: '#ffd6b0', fogColor: '#8fa9d6', fogSunColor: '#f6c7ad',
  fogDensity: .0004, fogFalloff: .0038, fogBase: -20, fogMax: .82, fogStart: 45,
  lift: [.012, .02, .05], gamma: [1, 1, 1.02], gain: [.98, 1.01, 1.06],
  saturation: 1.1, contrast: 1.06,
  shadowTint: [.40, .46, .66], highlightTint: [.62, .54, .46], splitTone: .3,
  vignette: .44, vignetteColor: [.2, .26, .42], grain: .02,
};

/** Night race lit from below by lava. */
const EMBER_RIFT: LookSpec = {
  exposure: 1.02, bloomStrength: .62, bloomThreshold: 1.05, bloomKnee: .6, bloomRadius: 1.05,
  raysStrength: .2, raysDecay: .95, raysDensity: .8, raysThreshold: .7, raysSpread: .12,
  sunColor: '#ff8a4a', fogColor: '#1c1418', fogSunColor: '#4a2016',
  fogDensity: .00048, fogFalloff: .0036, fogBase: -30, fogMax: .82, fogStart: 35,
  lift: [.012, .008, .022], gamma: [.99, 1, 1.02], gain: [1.04, .99, .96],
  saturation: 1.04, contrast: 1.14,
  shadowTint: [.36, .38, .6], highlightTint: [.7, .52, .36], splitTone: .24,
  vignette: .5, vignetteColor: [.07, .03, .05], grain: .026,
};

/** Morning mist through the canopy: god rays, emerald shade, gold light. */
const VERDANT: LookSpec = {
  exposure: 1.04, bloomStrength: .6, bloomThreshold: .92, bloomKnee: .55, bloomRadius: 1,
  raysStrength: 1.35, raysDecay: .965, raysDensity: .95, raysThreshold: .58, raysSpread: .11,
  sunColor: '#ffe3a0', fogColor: '#9fb392', fogSunColor: '#ffe2a2',
  fogDensity: .00046, fogFalloff: .005, fogBase: -20, fogMax: .8, fogStart: 30,
  lift: [.01, .024, .02], gamma: [1, 1.02, 1], gain: [1.04, 1.02, .92],
  saturation: 1.12, contrast: 1.05,
  shadowTint: [.38, .5, .5], highlightTint: [.64, .56, .38], splitTone: .3,
  vignette: .44, vignetteColor: [.18, .26, .2], grain: .02,
};

const SPECS: Readonly<Record<RacingBiomeId, LookSpec>> = Object.freeze({
  desert: SUNSCAR, frozen: FROSTLINE, volcanic: EMBER_RIFT, jungle: VERDANT,
});

function build(spec: LookSpec): CinematicLook {
  const v = (x: [number, number, number]) => new Vector3(x[0], x[1], x[2]);
  return {
    ...spec,
    sunColor: new Color(spec.sunColor), fogColor: new Color(spec.fogColor), fogSunColor: new Color(spec.fogSunColor),
    lift: v(spec.lift), gamma: v(spec.gamma), gain: v(spec.gain),
    shadowTint: v(spec.shadowTint), highlightTint: v(spec.highlightTint), vignetteColor: v(spec.vignetteColor),
  };
}

export function createCinematicLook(biome: RacingBiomeId = 'desert'): CinematicLook {
  return build(SPECS[biome]);
}

/** Copies a preset into an existing look object so uniform references stay live. */
export function applyCinematicLook(target: CinematicLook, biome: RacingBiomeId): void {
  const source = build(SPECS[biome]);
  for (const key of Object.keys(source) as (keyof CinematicLook)[]) {
    const value = source[key];
    const current = target[key];
    if (current instanceof Color && value instanceof Color) current.copy(value);
    else if (current instanceof Vector3 && value instanceof Vector3) current.copy(value);
    else (target as unknown as Record<string, unknown>)[key] = value;
  }
}

/** Per-frame, gameplay-driven lens response. Presentation only. */
export interface CinematicFrame {
  time: number;
  /** 0..1 radial speed blur at the screen edges. */
  speedBlur: number;
  /** 0..1 chromatic fringing. */
  chromatic: number;
  /** Additive flash, e.g. a hit or a boost ignition. */
  flash: number;
  flashColor: Color;
  /** Scene visibility from the race director (dust squalls), 0.12..1. */
  visibility: number;
}

export function createCinematicFrame(): CinematicFrame {
  return { time: 0, speedBlur: 0, chromatic: 0, flash: 0, flashColor: new Color('#ffd9a8'), visibility: 1 };
}
