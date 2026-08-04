export interface PodracerAudioTelemetry {
  speedMps: number;
  normalizedSpeed?: number;
  throttle: number;
  boost: number;
  boostActive: boolean;
  drift: number;
  heat: number;
  damage: number;
  grounded: boolean;
  engineTorque?: number;
  simulationTime?: number;
}

export interface AudioVoiceTarget {
  frequency: number;
  gain: number;
  filterFrequency: number;
}

export interface PodracerAudioTargets {
  engineLeft: AudioVoiceTarget;
  engineRight: AudioVoiceTarget;
  repulsorFrequency: number;
  repulsorGain: number;
  windGain: number;
  windFilterFrequency: number;
  couplingGain: number;
  couplingFilterFrequency: number;
}

export type PodracerAudioCueKind =
  | 'impact'
  | 'sand'
  | 'boost'
  | 'horn'
  | 'countdown'
  | 'checkpoint'
  | 'lap'
  | 'finish'
  | 'warning'
  | 'electric'
  | 'ui'
  | 'weapon'
  | 'weapon-hit'
  | 'shield'
  | 'mine'
  | 'hazard'
  | 'redline'
  | 'wreck'
  | 'takedown'
  | 'recovery'
  | 'upgrade'
  | 'vehicle';

export interface PodracerAudioCue {
  kind: PodracerAudioCueKind;
  intensity: number;
  /** Multiplicative pitch adjustment. */
  pitch?: number;
}

export interface AudioEventLike {
  readonly type: string;
}

export interface AudioEventMapOptions {
  /** When present, racer-scoped race events for other racers are ignored. */
  playerId?: string;
}

export interface AudioEnvelopeProfile {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  peak: number;
}

export interface AudioEnvelopePoint {
  time: number;
  value: number;
  curve: 'linear' | 'exponential';
}

export interface PodracerAudioOptions {
  masterVolume?: number;
  initiallyMuted?: boolean;
  createContext?: () => AudioContext;
  /** Injectable for deterministic tests; defaults to same-origin `fetch`. */
  fetchAudio?: (url: string) => Promise<ArrayBuffer>;
  /** Injectable to keep lifecycle tests independent of procedural render time. */
  renderMenuScore?: (context: BaseAudioContext) => Promise<AudioBuffer>;
  /** Clamped to the authored 3–5 second anti-spam range. */
  overtakeCalloutCooldownSeconds?: number;
}

/** Independent normalized buses used by the accessibility/settings menu. */
export interface PodracerAudioMix {
  master: number;
  music: number;
  engine: number;
  effects: number;
  voice: number;
}

export type MenuMusicMode = 'off' | 'selection' | 'race';

/** A diagnostic snapshot; mutating it cannot alter the live audio graph. */
export interface MenuMusicStatus {
  mode: MenuMusicMode;
  requested: boolean;
  loading: boolean;
  introScheduled: boolean;
  scoreScheduled: boolean;
  awaitingGesture: boolean;
  url: string | null;
}

export interface OvertakeCalloutStatus {
  /** The decoded user-supplied buffer and a running Web Audio graph are ready. */
  ready: boolean;
  scheduled: boolean;
  playing: boolean;
  paused: boolean;
  cooldownRemainingSeconds: number;
  playCount: number;
}
