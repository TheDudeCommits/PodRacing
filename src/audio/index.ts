export { PodracerAudio } from './PodracerAudio';
export {
  clampAudioUnit,
  createAudioEnvelopeSchedule,
  derivePodracerAudioTargets,
  deriveRivalAudioTargets,
  ENGINE_VOICE_PROFILES,
  getAudioEnvelope,
  mapGameEventsToAudioCues,
} from './model';
export { createMenuMusicTransitionSchedule } from './menuMusic';
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
  RivalAudioTelemetry,
  RivalAudioTarget,
} from './types';
export type { MenuMusicTransitionSchedule } from './menuMusic';
