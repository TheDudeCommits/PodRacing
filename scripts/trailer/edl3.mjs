/**
 * Trailer v3 edit. 60.000s, 1920x1080, 60fps.
 *
 * Every gameplay in-point below was chosen by scripts/trailer/pick.mjs from
 * captured telemetry, not by eye: each window is gated to keep the hero within
 * 11 m of the racing line for its whole duration, and scored for the feature it
 * is meant to showcase. `worstLat` in the comments is the measured maximum.
 *
 * Generated shots are bridges. Each one is conditioned on the last frame of the
 * gameplay cut before it and the first frame of the cut after it, so it starts
 * and ends on real game frames instead of sitting beside them.
 *
 * No text until the end card.
 */
export const MUSIC = { file: 'public/audio/salt-dusk/juggernaut.mp3', in: 13.97, dur: 60.0 };

export const EDL3 = [
  // --- The machines --------------------------------------------------------
  { kind: 'gen',  src: 'g1-engine-ignite', in: 1.45, dur: 2.4, push: 1.05 },
  { kind: 'game', src: 't3-fleet-side',    in: 0.35, dur: 2.0, push: 1.06 },   // the authored pod classes
  { kind: 'game', src: 't3-fleet-chase',   in: 0.45, dur: 1.6, push: 1.06 },
  { kind: 'game', src: 't3-gantry',        in: 0.00, dur: 2.0, push: 1.05 },   // worstLat 3.6

  { kind: 'gen',  src: 'bridge-launch',    in: 0.00, fit: true, dur: 2.4, push: 1.04 },

  // --- The race ------------------------------------------------------------
  { kind: 'game', src: 't3-pack-a',        in: 0.30, dur: 2.0, push: 1.05 },   // worstLat 5.2
  { kind: 'game', src: 't3-pack-pov',      in: 0.00, dur: 1.6, push: 1.05 },   // worstLat 4.4
  { kind: 'game', src: 't3-pack-b',        in: 0.00, dur: 2.0, push: 1.05 },   // worstLat 2.8
  { kind: 'game', src: 't3-overtake',      in: 0.10, dur: 2.0, push: 1.05 },   // worstLat 0.3
  { kind: 'gen',  src: 'gen-pack',         in: 0.40, dur: 2.2, push: 1.05 },
  { kind: 'game', src: 't3-drift-canyon',  in: 0.30, dur: 2.0, push: 1.06 },   // drift peak 0.61 at 0.87s, worstLat 2.3
  { kind: 'game', src: 't3-drift-side',    in: 3.95, dur: 1.6, push: 1.05, crop: { z: 1.35, cy: 0.58 } },   // drift peak 1.00 at 4.20s
  { kind: 'game', src: 't3-jump-chase',    in: 0.00, dur: 2.0, push: 1.06 },   // airtime, worstLat 5.8
  { kind: 'game', src: 't3-jump-side',     in: 0.00, dur: 1.6, push: 1.05 },   // airtime, worstLat 7.1
  { kind: 'game', src: 't3-canyon',        in: 3.50, dur: 1.6, push: 1.05 },   // worstLat 2.9

  { kind: 'gen',  src: 'bridge-war',       in: 0.00, fit: true, dur: 2.2, push: 1.05 },

  // --- The war -------------------------------------------------------------
  { kind: 'game', src: 't3-lance-chase',   in: 5.35, dur: 2.2, push: 1.05, crop: { z: 1.45, cy: 0.46 } },   // lance fires 5.55s, worstLat 3.7
  { kind: 'gen',  src: 'gen-duel',         in: 0.40, dur: 2.2, push: 1.06 },
  { kind: 'game', src: 't3-shield-side',   in: 4.65, dur: 2.0, push: 1.05, crop: { z: 1.45, cy: 0.55 } },   // shield raises 4.77s, worstLat 7.1
  { kind: 'game', src: 't3-mine-side',     in: 2.20, dur: 1.6, push: 1.05, crop: { z: 1.40, cy: 0.60 } },   // mine drops 2.42s, worstLat 2.8
  { kind: 'game', src: 't3-shield-chase',  in: 5.20, dur: 1.6, push: 1.05, crop: { z: 1.35, cy: 0.50 } },   // lance fired under the arch
  { kind: 'game', src: 't3-kill-chase',    in: 3.25, dur: 2.0, push: 1.06, crop: { z: 1.30, cy: 0.52 } },   // rival wrecks 3.50s, worstLat 4.6
  { kind: 'gen',  src: 'g4-crash',         in: 2.75, dur: 2.0, push: 1.07 },
  { kind: 'game', src: 't3-kill-side',     in: 0.95, dur: 2.0, push: 1.05, crop: { z: 1.30, cy: 0.52 } },   // rival wrecks 1.18s, worstLat 9.4
  { kind: 'game', src: 't3-hero-wreck',    in: 3.70, dur: 2.4, push: 1.06 },   // damaged, back on the line

  // --- The line ------------------------------------------------------------
  { kind: 'gen',  src: 'bridge-finish',    in: 0.00, fit: true, dur: 2.2, push: 1.04 },
  { kind: 'game', src: 't3-finish-pov',    in: 4.40, dur: 2.2, push: 1.05 },   // worstLat 5.4
  { kind: 'game', src: 't3-finish-chase',  in: 0.50, dur: 2.4, push: 1.06 },   // worstLat 0.6

  // --- End card (the only text in the cut) ---------------------------------
  { kind: 'card', src: 'endcard', plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 0.4, dur: 4.0, push: 1.04, dim: 0.20 },
];

/** Sourced game SFX punched onto the cut. Never generated audio. */
export const SFX = [
  { at: 0.00,  file: 'public/audio/salt-dusk/turbine.ogg',               gain: 0.55 },
  { at: 2.40,  file: 'public/audio/salt-dusk/thrusterFire_000.ogg',      gain: 0.5 },
  { at: 8.00,  file: 'public/audio/salt-dusk-v2/boost.ogg',              gain: 0.72 },
  { at: 14.0,  file: 'public/audio/salt-dusk/thrusterFire_002.ogg',      gain: 0.42 },
  { at: 21.0,  file: 'public/audio/salt-dusk-v2/propulsion.ogg',         gain: 0.4 },
  { at: 25.0,  file: 'public/audio/salt-dusk-v2/boost.ogg',              gain: 0.5 },
  { at: 31.2,  file: 'public/audio/salt-dusk-v2/weapon.ogg',             gain: 0.6 },
  { at: 32.2,  file: 'public/audio/salt-dusk/laserLarge_000.ogg',        gain: 0.58 },
  { at: 33.4,  file: 'public/audio/salt-dusk/laserLarge_001.ogg',        gain: 0.58 },
  { at: 35.6,  file: 'public/audio/salt-dusk-v2/shield-pulse.ogg',       gain: 0.62 },
  { at: 39.2,  file: 'public/audio/salt-dusk-v2/mechanical-click.ogg',   gain: 0.5 },
  { at: 40.8,  file: 'public/audio/salt-dusk/explosionCrunch_000.ogg',   gain: 0.82 },
  { at: 42.8,  file: 'public/audio/salt-dusk-v2/rupture.ogg',            gain: 0.72 },
  { at: 44.8,  file: 'public/audio/salt-dusk/explosionCrunch_002.ogg',   gain: 0.72 },
  { at: 46.8,  file: 'public/audio/salt-dusk-v2/hull-impact.ogg',        gain: 0.65 },
  { at: 53.8,  file: 'public/audio/salt-dusk-v2/boost.ogg',              gain: 0.6 },
];
