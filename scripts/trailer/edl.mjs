/**
 * Trailer edit decision list. 60.000s at 1920x1080/60fps.
 *
 * Cut lengths sit on the music grid: "Juggernaut" runs 120.25 BPM, so a beat is
 * 0.499s and a 4/4 bar is 1.996s. Durations here are beat multiples rounded to
 * 0.5s, which holds sync across a minute without drifting audibly.
 *
 *   kind 'game'  frame sequence in output/trailer/shots/<src>/ at 60fps
 *   kind 'gen'   generated mp4 in output/trailer/gen/ (24fps, resampled)
 *   kind 'card'  transparent PNG in output/trailer/cards/ over a plate
 *   in           seconds into the source
 *   dur          seconds on screen
 *   push         punch-in amount over the shot (1.0 = none)
 *   flash        warm flash-in frames at the cut
 */
export const MUSIC = { file: 'public/audio/salt-dusk/juggernaut.mp3', in: 13.97, dur: 60.0 };

export const EDL = [
  // Act 0 — cold open. Engine wakes, grid waits, then it goes. (8.0s)
  { kind: 'gen',  src: 'g1-engine-ignite', in: 1.45, dur: 2.5, push: 1.06 },
  { kind: 'game', src: 'a1-grid-side',     in: 0.6,  dur: 1.5, push: 1.05, flash: 2 },
  { kind: 'gen',  src: 'g2-low-pass',      in: 0.15, dur: 2.0, push: 1.04 },
  { kind: 'game', src: 'a1-launch-chase',  in: 0.35, dur: 2.0, push: 1.08, flash: 3 },

  // Act 1 — pure speed. (12.0s)
  { kind: 'game', src: 'a1-straight-pov',  in: 1.2,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a1-sunset-chase',  in: 0.8,  dur: 1.5, push: 1.06 },
  { kind: 'card', src: 'stab-race',        plate: 'a1-sunset-chase', plateIn: 2.2, dur: 1.0 },
  { kind: 'game', src: 'a4-hud-chase',     in: 0.9,  dur: 1.5, push: 1.04 },
  { kind: 'game', src: 'a2-banked-pov',    in: 0.7,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a2-drift-chase',   in: 1.1,  dur: 2.0, push: 1.07 },
  { kind: 'game', src: 'a2-drift-side',    in: 0.9,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a2-jump-chase',    in: 1.0,  dur: 1.5, push: 1.08 },

  // Act 2 — the circuit itself. (12.0s)
  { kind: 'gen',  src: 'g5-canyon',        in: 0.3,  dur: 2.0, push: 1.05, fallback: { kind: 'game', src: 'a2-canyon-pov', in: 1.0 } },
  { kind: 'game', src: 'a2-canyon-pov',    in: 1.1,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a2-refinery-pov',  in: 1.0,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a3-hazard-pov',    in: 1.1,  dur: 1.5, push: 1.06 },
  { kind: 'game', src: 'a2-jump-side',     in: 0.9,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a1-gantry-side',   in: 1.0,  dur: 2.0, push: 1.07 },
  { kind: 'gen',  src: 'g3-pilot',         in: 1.0,  dur: 2.0, push: 1.06 },

  // Act 3 — combat. (14.0s)
  { kind: 'card', src: 'stab-fight',       plate: 'a3-lance-side', plateIn: 0.5, dur: 1.0 },
  { kind: 'game', src: 'a3-lance-chase',   in: 0.35, dur: 1.5, push: 1.05, flash: 2 },
  { kind: 'game', src: 'a3-lance-side',    in: 0.35, dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a3-shield-side',   in: 0.3,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a3-mine-side',     in: 0.5,  dur: 1.5, push: 1.05 },
  { kind: 'gen',  src: 'g4-crash',         in: 2.75, dur: 2.0, push: 1.08, flash: 3 },
  { kind: 'game', src: 'a3-live-wreck',    in: 1.4,  dur: 1.5, push: 1.06 },
  { kind: 'game', src: 'a3-wreck-chase',   in: 0.5,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'a3-recovery',      in: 0.4,  dur: 1.0, push: 1.05 },
  { kind: 'game', src: 'a3-redline',       in: 0.4,  dur: 1.0, push: 1.06 },

  // Act 4 — climax and the line. (6.0s)
  { kind: 'card', src: 'stab-survive',     plate: 'a4-pack-hero', plateIn: 0.8, dur: 1.0 },
  { kind: 'game', src: 'a4-showcase',      in: 0.5,  dur: 1.0, push: 1.09 },
  { kind: 'game', src: 'a4-pack-hero',     in: 0.8,  dur: 1.5, push: 1.06 },
  { kind: 'game', src: 'a4-finish-chase',  in: 1.2,  dur: 1.5, push: 1.07 },
  { kind: 'game', src: 'a4-finish-side',   in: 1.0,  dur: 1.0, push: 1.05, flash: 2 },

  // Act 5 — title and where to play it. (8.0s)
  { kind: 'card', src: 'title',   plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 0.2, dur: 4.0, push: 1.05, dim: 0.22, flash: 4 },
  { kind: 'card', src: 'endcard', plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 3.0, dur: 4.0, push: 1.03, dim: 0.18 },
];

/** Sourced game SFX punched onto the cut. Never generated audio. */
export const SFX = [
  { at: 0.00,  file: 'public/audio/salt-dusk/turbine.ogg',            gain: 0.55 },
  { at: 2.50,  file: 'public/audio/salt-dusk/thrusterFire_000.ogg',   gain: 0.5 },
  { at: 6.00,  file: 'public/audio/salt-dusk-v2/boost.ogg',           gain: 0.7 },
  { at: 11.00, file: 'public/audio/salt-dusk/thrusterFire_002.ogg',   gain: 0.45 },
  { at: 20.00, file: 'public/audio/salt-dusk-v2/propulsion.ogg',      gain: 0.4 },
  { at: 32.00, file: 'public/audio/salt-dusk-v2/weapon.ogg',          gain: 0.6 },
  { at: 33.00, file: 'public/audio/salt-dusk/laserLarge_000.ogg',     gain: 0.55 },
  { at: 34.50, file: 'public/audio/salt-dusk/laserLarge_001.ogg',     gain: 0.55 },
  { at: 36.00, file: 'public/audio/salt-dusk-v2/shield-pulse.ogg',    gain: 0.6 },
  { at: 39.00, file: 'public/audio/salt-dusk/explosionCrunch_000.ogg', gain: 0.85 },
  { at: 41.00, file: 'public/audio/salt-dusk-v2/rupture.ogg',         gain: 0.6 },
  { at: 46.50, file: 'public/audio/salt-dusk/impactMetal_heavy_000.ogg', gain: 0.6 },
  { at: 52.00, file: 'public/audio/salt-dusk/explosionCrunch_002.ogg', gain: 0.7 },
];
