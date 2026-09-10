/** Crossfade timing for existing audio files; no composition or synthesis. */
export interface MenuMusicTransitionSchedule {
  introStartSeconds: number;
  introEndSeconds: number;
  scoreStartSeconds: number;
  scoreFadeEndSeconds: number;
  crossfadeSeconds: number;
}

export function createMenuMusicTransitionSchedule(
  introDurationSeconds: number,
  desiredCrossfadeSeconds = 1.55,
): MenuMusicTransitionSchedule {
  const introDuration = Number.isFinite(introDurationSeconds)
    ? Math.max(0.1, introDurationSeconds)
    : 0.1;
  const crossfade = Math.min(
    introDuration * 0.72,
    Math.max(0.25, Number.isFinite(desiredCrossfadeSeconds) ? desiredCrossfadeSeconds : 1.55),
  );
  const scoreStart = Math.max(0, introDuration - crossfade);
  return {
    introStartSeconds: 0,
    introEndSeconds: introDuration,
    scoreStartSeconds: scoreStart,
    scoreFadeEndSeconds: introDuration + 0.08,
    crossfadeSeconds: crossfade,
  };
}
