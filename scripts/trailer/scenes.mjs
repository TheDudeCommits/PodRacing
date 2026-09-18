/**
 * Scene-by-scene remake of the reference trailer. 91.000s, 1920x1080, 60fps.
 *
 * Each entry names the reference scene it recreates and that scene's timecode
 * in the original, so the two can be run side by side.
 *
 * Where the reference shows content this game does not have - outer space, a
 * jungle island, a lava cave, an ice world, actors delivering dialogue - the
 * beat is kept and played with the circuit's own equivalent, and the comment
 * says so. Nothing here advertises content the game does not ship.
 *
 * Gameplay in-points are bounded by each take's measured clean run: the hero is
 * on the racing line and not wrecked for the whole of every gameplay cut.
 */
export const MUSIC = {
  file: 'public/audio/salt-dusk/juggernaut.mp3',
  in: 0.0, dur: 75.0,
  // Juggernaut is exactly 75s. Starting it at t=3 lands its final resolve on
  // the title at t=78; the end card then plays out on sourced desert wind.
  at: 3.0,
};
export const TAIL = { file: 'public/audio/salt-dusk/wind.ogg', at: 77.0, gain: 0.55 };

export const SCENES = [
  // 1  | 0:00-0:02 | studio emblem on black; here, something waking in the dark
  { n: 1, kind: 'gen', src: 'g6-dust-plate', in: 0.20, dur: 2.0, dim: 0.72, push: 1.03 },
  // 2  | 0:02-0:05 | craft hanging in space, camera tracks in
  { n: 2, kind: 'gen', src: 'gen-sky', dur: 3.0, fit: true, push: 1.03 },
  // 3  | 0:05-0:06 | descent into atmosphere, friction glow
  { n: 3, kind: 'gen', src: 'gen-descent', dur: 1.0, fit: true },
  // 4  | 0:06-0:11 | low tracking over an industrial landscape. The reference
  //      holds this for 5s; the refinery take only has a 3.28s clean run, so the
  //      beat is carried across two continuous industrial shots.
  { n: 4, kind: 'game', src: 't4-refinery-pov', in: 0.00, dur: 3.0, push: 1.05 },
  { n: 4, kind: 'game', src: 't4-arch-pov', in: 0.90, dur: 2.0, push: 1.05 },
  // 5  | 0:11-0:13 | the racer walks toward camera; here, the machine itself
  { n: 5, kind: 'game', src: 't3-fleet-chase', in: 0.45, dur: 2.0, push: 1.07 },
  // 6  | 0:13-0:16 | a scrapyard of crashed ships; here, the aftermath of a wreck
  { n: 6, kind: 'game', src: 't3-kill-side', in: 2.60, dur: 3.0, push: 1.04 },
  // 7  | 0:16-0:18 | walking past silhouettes toward the hangar; here, the field
  { n: 7, kind: 'game', src: 't3-fleet-side', in: 0.35, dur: 2.0, push: 1.06 },
  // 8  | 0:18-0:21 | wide: the grid under an industrial bridge
  { n: 8, kind: 'game', src: 't3-gantry', in: 0.00, dur: 3.0, push: 1.04 },
  // 9  | 0:21-0:23 | close-up: engines ignite
  { n: 9, kind: 'gen', src: 'g1-engine-ignite', in: 1.45, dur: 2.0, push: 1.05, flash: 2 },
  // 10 | 0:23-0:24 | close-up: pilot in the cockpit; framed tight on the sled
  { n: 10, kind: 'game', src: 't3-pack-pov', in: 0.20, dur: 1.0, crop: { z: 2.0, cy: 0.74 } },
  // 11 | 0:24-0:26 | launch off the line, camera behind
  { n: 11, kind: 'gen', src: 'bridge-launch', dur: 2.0, fit: true, flash: 3 },
  // 12 | 0:26-0:28 | POV down a narrow canyon, rivals ahead dodging pylons
  { n: 12, kind: 'game', src: 't3-pack-a', in: 0.30, dur: 2.0, push: 1.05 },
  // 13 | 0:28-0:30 | leaning into a hard turn, skimming the surface
  { n: 13, kind: 'game', src: 't3-drift-side', in: 3.95, dur: 2.0, push: 1.05, crop: { z: 1.35, cy: 0.58 } },
  // 14 | 0:30-0:32 | from behind the pilot, out through the canopy
  { n: 14, kind: 'game', src: 't4-arch-pov', in: 0.00, dur: 2.0, push: 1.05 },
  // 15 | 0:32-0:34 | side profile tracking past a glowing pool
  { n: 15, kind: 'game', src: 't3-pack-b', in: 0.00, dur: 2.0, push: 1.05 },
  // 16 | 0:34-0:36 | collision with a pillar: explosion, sparks, camera shake
  { n: 16, kind: 'game', src: 't3-kill-chase', in: 3.25, dur: 2.0, push: 1.06, crop: { z: 1.30, cy: 0.52 }, flash: 2 },
  // 17 | 0:36-0:37 | establishing a desert of crashed hulls
  { n: 17, kind: 'game', src: 't3-canyon', in: 4.05, dur: 1.0, push: 1.04 },
  // 18 | 0:37-0:38 | low tracking as a racer tears across the sand
  { n: 18, kind: 'game', src: 't4-lowpass-side', in: 0.00, dur: 1.0, push: 1.05 },
  // 19 | 0:38-0:40 | POV threading a gap in the wreckage; here, the rock arch
  { n: 19, kind: 'game', src: 't4-arch-pov', in: 1.10, dur: 2.0, push: 1.05 },
  // 20 | 0:40-0:41 | racers running through explosions
  { n: 20, kind: 'game', src: 't3-kill-chase', in: 3.30, dur: 1.0, push: 1.05, crop: { z: 1.30, cy: 0.52 } },
  // 21 | 0:41-0:42 | POV through the chambers of a derelict; here, the refinery
  { n: 21, kind: 'game', src: 't4-refinery-pov', in: 0.20, dur: 1.0, push: 1.05 },
  // 22 | 0:42-0:44 | close-up: a racer screams past, electricity between prongs
  { n: 22, kind: 'gen', src: 'gen-pass', dur: 2.0, fit: true },
  // 23 | 0:44-0:46 | swerving clear of falling debris, dust fills frame
  { n: 23, kind: 'game', src: 't3-kill-chase', in: 5.00, dur: 2.0, push: 1.06 },
  // 24 | 0:46-0:47 | POV looking back at three pursuers
  { n: 24, kind: 'gen', src: 'gen-rear', dur: 1.0, fit: true },
  // 25 | 0:47-0:48 | side tracking, skimming the sand
  { n: 25, kind: 'game', src: 't4-lowpass-side', in: 1.40, dur: 1.0, push: 1.05 },
  // 26 | 0:48-0:50 | a racer flips violently and breaks apart
  { n: 26, kind: 'gen', src: 'g4-crash', in: 2.75, dur: 2.0, push: 1.07, flash: 3 },
  // 27 | 0:50-0:51 | POV through a glowing engine room; here, refinery pipework
  { n: 27, kind: 'game', src: 't4-refinery-pov', in: 1.05, dur: 1.0, push: 1.05 },
  // 28 | 0:51-0:52 | a racer spins out into rock, sparks
  { n: 28, kind: 'game', src: 't3-kill-side', in: 1.05, dur: 1.0, push: 1.05, crop: { z: 1.30, cy: 0.52 } },
  // 29 | 0:52-0:53 | two racers pass a low camera
  { n: 29, kind: 'game', src: 't4-arch-side', in: 0.30, dur: 1.0, push: 1.05, crop: { z: 1.30, cy: 0.62 } },
  // 30 | 0:53-0:55 | close-up, the rival speaks; here, the roster in close
  { n: 30, kind: 'game', src: 't3-fleet-side', in: 1.50, dur: 2.0, crop: { z: 1.70, cx: 0.38, cy: 0.58 } },
  // 31 | 0:55-0:56 | he kicks a droid aside
  { n: 31, kind: 'game', src: 't3-fleet-chase', in: 1.60, dur: 1.0, crop: { z: 1.70, cx: 0.60, cy: 0.60 } },
  // 32 | 0:56-0:58 | flanked by guards, squaring up
  { n: 32, kind: 'game', src: 't3-fleet-side', in: 1.60, dur: 2.0, crop: { z: 1.45, cy: 0.60 } },
  // 33 | 0:58-1:00 | pointing, face tight with anger
  { n: 33, kind: 'gen', src: 'gen-duel', in: 0.40, dur: 2.0, push: 1.06 },
  // 34 | 1:00-1:03 | wide reveal of a new world; here, the dusk spires
  { n: 34, kind: 'game', src: 't4-spires-dusk', in: 0.00, dur: 3.0, push: 1.06 },
  // 35 | 1:03-1:05 | POV through dense growth; here, the canyon
  { n: 35, kind: 'game', src: 't3-canyon', in: 3.50, dur: 2.0, push: 1.05 },
  // 36 | 1:05-1:06 | crossing a bridge over a canyon, high and to the side
  { n: 36, kind: 'game', src: 't3-jump-side', in: 0.00, dur: 1.0, push: 1.05 },
  // 37 | 1:06-1:07 | POV under low stone arches; here, the rock arch
  { n: 37, kind: 'game', src: 't4-arch-pov', in: 2.10, dur: 1.0, push: 1.05 },
  // 38 | 1:07-1:08 | clipping scenery, debris flies
  { n: 38, kind: 'game', src: 't3-kill-side', in: 4.40, dur: 1.0, push: 1.05 },
  // 39 | 1:08-1:09 | POV through a dark tunnel
  { n: 39, kind: 'game', src: 't4-arch-side', in: 1.80, dur: 1.0, push: 1.05 },
  // 40 | 1:09-1:10 | POV into a lava cave; here, the refinery under a low sun
  { n: 40, kind: 'game', src: 't4-refinery-pov', in: 1.90, dur: 1.0, push: 1.05 },
  // 41 | 1:10-1:12 | bursting back out into the light, leaning hard
  { n: 41, kind: 'gen', src: 'g5-canyon', in: 2.60, dur: 2.0, push: 1.04 },
  // 42 | 1:12-1:13 | off a cliff edge into open air
  { n: 42, kind: 'game', src: 't3-jump-chase', in: 0.00, dur: 1.0, push: 1.06 },
  // 43 | 1:13-1:14 | POV through frozen pipework; here, the refinery's pipework
  { n: 43, kind: 'game', src: 't4-refinery-pov', in: 2.20, dur: 1.0, push: 1.05 },
  // 44 | 1:14-1:15 | POV across an open plain, dodging pillars
  { n: 44, kind: 'game', src: 't4-spires-dusk', in: 1.60, dur: 1.0, push: 1.05 },
  // 45 | 1:15-1:17 | close-up in the cockpit, hands locked on the controls
  { n: 45, kind: 'game', src: 't3-shield-side', in: 4.65, dur: 2.0, push: 1.05, crop: { z: 1.45, cy: 0.55 } },
  // 46 | 1:17-1:18 | wide, through a narrow lit corridor
  { n: 46, kind: 'game', src: 't3-finish-chase', in: 0.50, dur: 1.0, push: 1.05 },
  // 47 | 1:18-1:22 | the title, neon outline on smoke
  { n: 47, kind: 'card', src: 'title', dur: 4.0, plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 0.4, push: 1.04, dim: 0.22, flash: 4 },
  // 48 | 1:22-1:24 | one last high-speed run
  { n: 48, kind: 'game', src: 't3-lance-chase', in: 5.35, dur: 2.0, push: 1.05, crop: { z: 1.45, cy: 0.46 } },
  // 49 | 1:24-1:26 | close-up on the pilot, decided
  { n: 49, kind: 'game', src: 't3-finish-pov', in: 4.40, dur: 2.0, crop: { z: 1.90, cy: 0.72 } },
  // 50 | 1:26-1:31 | end card: where to play it
  { n: 50, kind: 'card', src: 'endcard', dur: 5.0, plate: 'g6-dust-plate', plateKind: 'gen', plateIn: 2.4, push: 1.03, dim: 0.18 },
];

/** Sourced game SFX, punched on the reference's own beats. */
export const SFX = [
  { at: 0.20,  file: 'public/audio/salt-dusk/turbine.ogg',               gain: 0.60 },
  { at: 5.20,  file: 'public/audio/salt-dusk/thrusterFire_002.ogg',      gain: 0.50 },
  { at: 21.2,  file: 'public/audio/salt-dusk/thrusterFire_000.ogg',      gain: 0.62 },
  { at: 24.1,  file: 'public/audio/salt-dusk-v2/boost.ogg',              gain: 0.75 },
  { at: 28.2,  file: 'public/audio/salt-dusk-v2/propulsion.ogg',         gain: 0.42 },
  { at: 34.1,  file: 'public/audio/salt-dusk/explosionCrunch_000.ogg',   gain: 0.85 },
  { at: 40.1,  file: 'public/audio/salt-dusk/laserLarge_000.ogg',        gain: 0.60 },
  { at: 42.1,  file: 'public/audio/salt-dusk-v2/weapon.ogg',             gain: 0.55 },
  { at: 48.1,  file: 'public/audio/salt-dusk-v2/rupture.ogg',            gain: 0.78 },
  { at: 51.1,  file: 'public/audio/salt-dusk/impactMetal_heavy_000.ogg', gain: 0.62 },
  { at: 58.1,  file: 'public/audio/salt-dusk/laserLarge_001.ogg',        gain: 0.58 },
  { at: 67.1,  file: 'public/audio/salt-dusk/explosionCrunch_002.ogg',   gain: 0.60 },
  { at: 72.1,  file: 'public/audio/salt-dusk-v2/shield-pulse.ogg',       gain: 0.62 },
  { at: 78.0,  file: 'public/audio/salt-dusk/explosionCrunch_002.ogg',   gain: 0.80 },
  { at: 82.1,  file: 'public/audio/salt-dusk-v2/boost.ogg',              gain: 0.60 },
];
