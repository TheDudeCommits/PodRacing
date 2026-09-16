import type { PodracerAudioCueKind } from './types';

/** Existing sourced files only. Attribution: /audio/salt-dusk-v2/CREDITS.html. */
const file = (name: string): string => `/audio/salt-dusk-v2/${name}.ogg`;
export const RECORDED_LOOPS = Object.freeze({
  engine: file('propulsion'),
  rival: file('rival'),
});
// The owner's SFX revision retains the licensed composition and its exact excerpt.
export const RECORDED_MUSIC_URL = '/audio/salt-dusk/juggernaut.mp3';

/**
 * Race-phase scores: existing high-energy compositions, rotated per race.
 * Attribution: /audio/race-set/CREDITS.html. The selection score keeps the
 * Juggernaut excerpt; these only play while a race is running.
 */
export interface RecordedRaceTrack {
  readonly url: string;
  readonly title: string;
  readonly artist: string;
}
export const RECORDED_RACE_MUSIC: readonly RecordedRaceTrack[] = Object.freeze([
  { url: '/audio/race-set/exhilarate.mp3', title: 'Exhilarate', artist: 'Kevin MacLeod' },
  { url: '/audio/race-set/cyborg-ninja.mp3', title: 'Cyborg Ninja', artist: 'Kevin MacLeod' },
]);
export const RECORDED_RACE_MUSIC_URLS: readonly string[] = Object.freeze(RECORDED_RACE_MUSIC.map((track) => track.url));

/**
 * Sourced voice lines (Kenney "Voiceover Pack: Fighter", CC0) for rivalry beats
 * and the final lap. Attribution: /audio/voice-fighter/CREDITS.html. Each line
 * is an existing recording; none were synthesised.
 */
export type RecordedVoiceLineId = 'rival-marked' | 'revenge-pass' | 'revenge-settled' | 'final-lap' | 'photo-finish';
export const RECORDED_VOICE_LINES: Readonly<Record<RecordedVoiceLineId, string>> = Object.freeze({
  'rival-marked': '/audio/voice-fighter/prepare-yourself.ogg',
  'revenge-pass': '/audio/voice-fighter/loser.ogg',
  'revenge-settled': '/audio/voice-fighter/combo-breaker.ogg',
  'final-lap': '/audio/voice-fighter/final-round.ogg',
  'photo-finish': '/audio/voice-fighter/sudden-death.ogg',
});
export const RECORDED_VOICE_LINE_URLS: readonly string[] = Object.freeze([...new Set(Object.values(RECORDED_VOICE_LINES))]);

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
  // Voice cues name their recording on the cue itself (PodracerAudioCue.voice).
  voice: [],
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

/**
 * Sourced engine identities for the registered pods. Each is an existing
 * licensed loop from the audio bank (attributions in both CREDITS pages) with
 * a narrow playback-rate, filter and gain shape; nothing is synthesized.
 */
export interface RecordedEngineVoice {
  url: string;
  /** Base playback rate multiplier applied under the shared load curve. */
  rate: number;
  /** Added to the shared low-pass cutoff (Hz); negative darkens the voice. */
  filterOffset: number;
  /** Multiplies the shared engine bed level. */
  gain: number;
  credit: string;
}
export const RECORDED_ENGINE_VOICES: Readonly<Record<string, RecordedEngineVoice>> = Object.freeze({
  'twin-turbine': Object.freeze({ url: file('propulsion'), rate: 1, filterOffset: 0, gain: 1,
    credit: 'Rocket Boost Engine Loop — Iwan Gabovitch (qubodup), CC0 1.0' }),
  'split-x': Object.freeze({ url: file('propulsion'), rate: 1.13, filterOffset: 900, gain: 0.92,
    credit: 'Rocket Boost Engine Loop — Iwan Gabovitch (qubodup), CC0 1.0' }),
  turbofan: Object.freeze({ url: '/audio/salt-dusk/turbine.ogg', rate: 1.02, filterOffset: 1400, gain: 0.9,
    credit: 'Fan motor — Rvgerxini, CC0 1.0' }),
  diesel: Object.freeze({ url: '/audio/salt-dusk/engine.ogg', rate: 0.88, filterOffset: -500, gain: 1.05,
    credit: 'Car Engine Loop 96kHz, 4s — qubodup, CC BY 3.0' }),
});
export const DEFAULT_ENGINE_VOICE_ID = 'twin-turbine';
export const RECORDED_ENGINE_VOICE_URLS = Object.freeze([...new Set(
  Object.values(RECORDED_ENGINE_VOICES).map((voice) => voice.url),
)]);
