export { PodracerAudio } from './PodracerAudio';
export {
  clampAudioUnit,
  createAudioEnvelopeSchedule,
  derivePodracerAudioTargets,
  getAudioEnvelope,
  mapGameEventsToAudioCues,
} from './model';
export {
  MENU_MUSIC_BAR_COUNT,
  MENU_MUSIC_BEATS_PER_BAR,
  MENU_MUSIC_BPM,
  MENU_MUSIC_TONIC_MIDI,
  createMenuMusicTransitionSchedule,
  createOriginalMenuScorePlan,
  renderOriginalMenuScore,
  renderOriginalMenuScoreAsync,
} from './menuMusic';
export type {
  AudioEnvelopePoint,
  AudioEnvelopeProfile,
  AudioEventLike,
  AudioEventMapOptions,
  AudioVoiceTarget,
  MenuMusicMode,
  MenuMusicStatus,
  OvertakeCalloutStatus,
  PodracerAudioCue,
  PodracerAudioCueKind,
  PodracerAudioMix,
  PodracerAudioOptions,
  PodracerAudioTargets,
  PodracerAudioTelemetry,
} from './types';
export type {
  AsyncMenuScoreRenderOptions,
  MenuMusicTransitionSchedule,
  MenuScoreHit,
  MenuScoreNote,
  MenuScorePlan,
  MenuScoreVoice,
} from './menuMusic';
