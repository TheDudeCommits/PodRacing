/**
 * Trailer v2 edit decision list. 60.000s, 1920x1080, 60fps.
 *
 * v1 had no spine; it was a tour of scenery. This one is an escalation in four
 * movements, and every racing shot has rivals in frame:
 *
 *   THE GRID  0:00-0:10  the machines, the fleet, the launch
 *   THE RACE  0:10-0:27  traffic, overtakes, drift, the crest
 *   THE WAR   0:27-0:45  lance, mines, kills, wrecks
 *   THE LINE  0:45-0:54  the last push and the finish
 *   TITLE     0:54-1:00
 *
 * Generated shots are placed on the beat they depict, next to the gameplay of
 * the same action, rather than dropped in as loose atmosphere.
 */
export const MUSIC = { file: 'public/audio/salt-dusk/juggernaut.mp3', in: 13.97, dur: 60.0 };
const G = 'output/trailer/gen';

export const EDL2 = [
  // --- THE GRID (10.0s) ---------------------------------------------------
  { kind: 'gen',  src: 'g1-engine-ignite', in: 1.45, dur: 2.5, push: 1.06 },
  { kind: 'game', src: 'v2-fleet-side',    in: 0.40,  dur: 1.5, push: 1.07, flash: 2 },
  { kind: 'game', src: 'v2-grid-side',     in: 0.30,  dur: 1.5, push: 1.05 },
  { kind: 'gen',  src: 'g2-low-pass',      in: 0.15, dur: 2.0, push: 1.04 },
  { kind: 'game', src: 'v2-launch-chase',  in: 0.25,  dur: 2.5, push: 1.08, flash: 3 },

  // --- THE RACE (17.5s) ---------------------------------------------------
  { kind: 'game', src: 'v2-pack-side',     in: 0.25,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-traffic-pov',   in: 0.20,  dur: 1.5, push: 1.05 },
  { kind: 'card', src: 'stab-race',        plate: 'v2-pack-side', plateIn: 0.6, dur: 1.0 },
  { kind: 'game', src: 'v2-overtake',      in: 0.40,  dur: 2.0, push: 1.06 },
  { kind: 'gen',  src: 'gen-pack',         in: 0.4,  dur: 2.0, push: 1.05 },
  { kind: 'game', src: 'v2-drift-chase',   in: 0.50,  dur: 2.0, push: 1.07 },
  { kind: 'game', src: 'v2-drift-side',    in: 0.40,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-jump-chase',    in: 1.2,  dur: 1.5, push: 1.08 },
  { kind: 'game', src: 'v2-jump-side',     in: 1.1,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-canyon-chase',  in: 0.35,  dur: 1.5, push: 1.05 },
  { kind: 'gen',  src: 'g5-canyon',        in: 0.35, dur: 1.5, push: 1.05 },

  // --- THE WAR (17.5s) ----------------------------------------------------
  { kind: 'card', src: 'stab-fight',       plate: 'v2-lance-side', plateIn: 0.7, dur: 1.0 },
  { kind: 'game', src: 'v2-lance-pov',     in: 0.10,  dur: 1.5, push: 1.05, flash: 2 },
  { kind: 'game', src: 'v2-lance-chase',   in: 3.15,  dur: 1.5, push: 1.05 },
  { kind: 'gen',  src: 'gen-duel',         in: 0.4,  dur: 2.0, push: 1.06 },
  { kind: 'game', src: 'v2-lance-side',    in: 0.60,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-brawl-side',    in: 0.60,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-mines-chase',   in: 0.50,  dur: 1.5, push: 1.05 },
  // Timed kills: the in-point sits just before the rival is wrecked on camera.
  { kind: 'game', src: 'v2-kill-chase',    in: 0.95, dur: 2.0, push: 1.06, flash: 2 },
  { kind: 'gen',  src: 'g4-crash',         in: 2.75, dur: 2.0, push: 1.08, flash: 3 },
  { kind: 'game', src: 'v2-kill-side',     in: 0.80, dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-hero-wreck',    in: 1.15, dur: 1.5, push: 1.06 },

  // --- THE LINE (9.0s) ----------------------------------------------------
  { kind: 'card', src: 'stab-survive',     plate: 'v2-hero-wreck', plateIn: 1.6, dur: 1.0 },
  { kind: 'game', src: 'v2-hud-chase',     in: 0.40,  dur: 1.5, push: 1.04, hud: true },
  { kind: 'gen',  src: 'gen-pilot',        in: 0.6,  dur: 1.5, push: 1.05 },
  { kind: 'game', src: 'v2-finish-pov',    in: 0.50,  dur: 1.5, push: 1.06 },
  { kind: 'game', src: 'v2-finish-chase',  in: 0.60,  dur: 2.0, push: 1.07 },
  { kind: 'game', src: 'v2-finish-side',   in: 0.50,  dur: 1.5, push: 1.05, flash: 2 },

  // --- TITLE (6.0s) -------------------------------------------------------
  { kind: 'card', src: 'title',   plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 0.2, dur: 3.5, push: 1.05, dim: 0.22, flash: 4 },
  { kind: 'card', src: 'endcard', plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 2.6, dur: 2.5, push: 1.03, dim: 0.18 },
];

/** Sourced game SFX punched onto the cut. Never generated audio. */
export const SFX = [
  { at: 0.00,  file: 'public/audio/salt-dusk/turbine.ogg',              gain: 0.55 },
  { at: 2.50,  file: 'public/audio/salt-dusk/thrusterFire_000.ogg',     gain: 0.5 },
  { at: 7.50,  file: 'public/audio/salt-dusk-v2/boost.ogg',             gain: 0.72 },
  { at: 13.5,  file: 'public/audio/salt-dusk/thrusterFire_002.ogg',     gain: 0.45 },
  { at: 21.5,  file: 'public/audio/salt-dusk-v2/propulsion.ogg',        gain: 0.4 },
  { at: 27.5,  file: 'public/audio/salt-dusk-v2/weapon.ogg',            gain: 0.62 },
  { at: 28.5,  file: 'public/audio/salt-dusk/laserLarge_000.ogg',       gain: 0.58 },
  { at: 30.0,  file: 'public/audio/salt-dusk/laserLarge_001.ogg',       gain: 0.58 },
  { at: 32.0,  file: 'public/audio/salt-dusk-v2/shield-pulse.ogg',      gain: 0.6 },
  { at: 36.5,  file: 'public/audio/salt-dusk/explosionCrunch_000.ogg',  gain: 0.8 },
  { at: 38.5,  file: 'public/audio/salt-dusk-v2/rupture.ogg',           gain: 0.72 },
  { at: 41.0,  file: 'public/audio/salt-dusk/impactMetal_heavy_000.ogg', gain: 0.6 },
  { at: 43.0,  file: 'public/audio/salt-dusk/explosionCrunch_002.ogg',  gain: 0.7 },
  { at: 45.0,  file: 'public/audio/salt-dusk-v2/hull-impact.ogg',       gain: 0.6 },
  { at: 52.5,  file: 'public/audio/salt-dusk-v2/boost.ogg',             gain: 0.6 },
  { at: 54.0,  file: 'public/audio/salt-dusk/explosionCrunch_002.ogg',  gain: 0.62 },
];
