import type { PodracerAudioCueKind } from './types';

/** Existing recordings/catalogue files only. See /audio/salt-dusk/CREDITS.html. */
const base = '/audio/salt-dusk/';
const file = (name: string): string => `${base}${name}.ogg`;

export const RECORDED_LOOPS = Object.freeze({
  engine: file('engine'),
  turbine: file('turbine'),
  wind: file('wind'),
});
export const RECORDED_MUSIC_URL = `${base}juggernaut.mp3`;

export const RECORDED_CUES: Readonly<Record<PodracerAudioCueKind, readonly string[]>> = Object.freeze({
  impact: [file('impactMetal_heavy_000'), file('impactMetal_heavy_001')],
  sand: [file('impactGeneric_light_000')],
  boost: [file('thrusterFire_000')],
  horn: [file('bong_001')],
  countdown: [file('select_001')],
  checkpoint: [file('confirmation_001')],
  lap: [file('confirmation_002')],
  finish: [file('confirmation_004')],
  warning: [file('error_005')],
  electric: [file('computerNoise_000')],
  'emp-pulse': [file('forceField_002')],
  repair: [file('confirmation_002')],
  ui: [file('click_001')],
  weapon: [file('laserLarge_000'), file('laserLarge_001'), file('laserSmall_002')],
  'weapon-hit': [file('explosionCrunch_000'), file('impactMetal_light_000')],
  shield: [file('forceField_000')],
  mine: [file('lowFrequency_explosion_000')],
  hazard: [file('explosionCrunch_002')],
  redline: [file('thrusterFire_002')],
  wreck: [file('explosionCrunch_002')],
  takedown: [file('confirmation_004')],
  recovery: [file('select_001')],
  upgrade: [file('confirmation_001')],
  vehicle: [file('impactPlate_medium_000')],
});

export const RECORDED_EFFECT_URLS = Object.freeze([...new Set([
  ...Object.values(RECORDED_LOOPS), ...Object.values(RECORDED_CUES).flat(),
])]);
