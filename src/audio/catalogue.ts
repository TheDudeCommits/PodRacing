import type { PodracerAudioCueKind } from './types';

/** Existing sourced files only. Attribution: /audio/salt-dusk-v2/CREDITS.html. */
const file = (name: string): string => `/audio/salt-dusk-v2/${name}.ogg`;
export const RECORDED_LOOPS = Object.freeze({
  engine: file('propulsion'),
  rival: file('rival'),
});
// The owner's SFX revision retains the licensed composition and its exact excerpt.
export const RECORDED_MUSIC_URL = '/audio/salt-dusk/juggernaut.mp3';

/** Empty lists deliberately omit nonessential reward and warning bleeps. */
export const RECORDED_CUES: Readonly<Record<PodracerAudioCueKind, readonly string[]>> = Object.freeze({
  impact: [file('hull-impact')],
  sand: [],
  boost: [file('boost')],
  horn: [file('boost')],
  countdown: [file('mechanical-click')],
  checkpoint: [],
  lap: [],
  finish: [],
  warning: [],
  electric: [],
  'emp-pulse': [file('shield-pulse')],
  repair: [file('mechanical-click')],
  ui: [file('mechanical-click')],
  weapon: [file('weapon')],
  'weapon-hit': [file('hull-impact')],
  shield: [file('shield-pulse')],
  mine: [file('rupture')],
  hazard: [file('hull-impact')],
  redline: [],
  wreck: [file('rupture')],
  takedown: [],
  recovery: [],
  upgrade: [file('mechanical-click')],
  vehicle: [file('mechanical-click')],
});

/** Headroom and sparse playback apply per actual recording, including aliases. */
export const RECORDED_CUE_ROLES: Readonly<Record<string, { gain: number; gap: number; voices: number }>> = Object.freeze({
  [file('hull-impact')]: { gain: 0.42, gap: 0.18, voices: 2 },
  [file('boost')]: { gain: 0.2, gap: 1.6, voices: 1 },
  [file('mechanical-click')]: { gain: 0.075, gap: 0.16, voices: 1 },
  [file('weapon')]: { gain: 0.24, gap: 0.09, voices: 3 },
  [file('shield-pulse')]: { gain: 0.2, gap: 0.35, voices: 2 },
  [file('rupture')]: { gain: 0.5, gap: 0.5, voices: 2 },
});

export const RECORDED_EFFECT_URLS = Object.freeze([...new Set([
  ...Object.values(RECORDED_LOOPS), ...Object.values(RECORDED_CUES).flat(),
])]);
