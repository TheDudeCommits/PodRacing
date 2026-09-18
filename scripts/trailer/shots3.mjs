/**
 * Trailer v3 takes. Each one exists to showcase a specific feature, and each is
 * captured long so the cut can be chosen from measured telemetry rather than a
 * guessed in-point.
 *
 *   feature   what this take is meant to prove; pick.mjs scores windows for it
 *   yieldFor  low-throttle seconds before capture so rivals stream past. Omit it
 *             to keep the hero ahead of the field (needed for mines behind).
 */
export const SHOTS3 = [
  // Pod variety: the authored classes side by side, held long enough to read.
  { id: 't3-fleet-side',   scenario: 'vehicle-showcase', camera: 'side',  frames: 220, feature: 'fleet' },
  { id: 't3-fleet-chase',  scenario: 'vehicle-showcase', camera: 'chase', frames: 200, feature: 'fleet' },

  // Racing in traffic across distinct parts of the circuit.
  { id: 't3-pack-a',   seek: 0.120, camera: 'chase',   yieldFor: 4.2, frames: 420, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  { id: 't3-pack-b',   seek: 0.300, camera: 'side',    yieldFor: 4.2, frames: 420, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  { id: 't3-pack-pov', seek: 0.100, camera: 'cockpit', yieldFor: 4.2, frames: 420, feature: 'pack', drive: { throttle: 0.95, overtake: false } },
  { id: 't3-overtake', seek: 0.550, camera: 'chase',   yieldFor: 4.6, frames: 420, feature: 'overtake' },
  { id: 't3-gantry',   seek: 0.095, camera: 'side',    yieldFor: 4.0, frames: 360, feature: 'pack', drive: { throttle: 0.95, overtake: false } },
  { id: 't3-canyon',   seek: 0.420, camera: 'chase',   yieldFor: 4.0, frames: 360, feature: 'pack', drive: { throttle: 0.95, overtake: false } },

  // Drift: swing the commanded line hard across the banked sweeper so the slide
  // is real, while the clamp keeps it on the surface.
  { id: 't3-drift-chase', seek: 0.760, camera: 'chase', yieldFor: 3.0, frames: 420, feature: 'drift',
    drive: { throttle: 0.95, weave: 3.0, overtake: false } },
  { id: 't3-drift-side',  seek: 0.760, camera: 'side',  yieldFor: 3.0, frames: 400, feature: 'drift',
    drive: { throttle: 0.95, weave: 3.0, overtake: false } },
  { id: 't3-drift-canyon', seek: 0.430, camera: 'chase', yieldFor: 3.0, frames: 400, feature: 'drift',
    drive: { throttle: 0.95, weave: 3.0, overtake: false } },

  // Airtime over the launch crest.
  { id: 't3-jump-chase', seek: 0.836, camera: 'chase', yieldFor: 2.4, frames: 360, feature: 'air', drive: { overtake: false } },
  { id: 't3-jump-side',  seek: 0.834, camera: 'side',  yieldFor: 2.4, frames: 340, feature: 'air', drive: { overtake: false } },

  // Heat Lance: rivals ahead, trigger armed, long enough to land several shots.
  { id: 't3-lance-chase', seek: 0.300, camera: 'chase',   yieldFor: 4.4, frames: 480, feature: 'lance', drive: { fire: true, throttle: 0.88, overtake: false } },
  { id: 't3-lance-side',  seek: 0.320, camera: 'side',    yieldFor: 4.4, frames: 440, feature: 'lance', drive: { fire: true, throttle: 0.88, overtake: false } },
  { id: 't3-lance-pov',   seek: 0.280, camera: 'cockpit', yieldFor: 4.4, frames: 440, feature: 'lance', drive: { fire: true, throttle: 0.88, overtake: false } },

  // Shield: sit in the middle of a firefight and raise it on real incoming.
  { id: 't3-shield-side',  seek: 0.360, camera: 'side',  yieldFor: 4.8, frames: 440, feature: 'shield', drive: { fire: true, throttle: 0.93, overtake: false } },
  { id: 't3-shield-chase', seek: 0.365, camera: 'chase', yieldFor: 4.8, frames: 440, feature: 'shield', drive: { fire: true, throttle: 0.93, overtake: false } },

  // Mines: no yield, so the hero leads and the rack drops into the pack behind.
  { id: 't3-mine-chase', seek: 0.600, camera: 'chase', frames: 400, feature: 'mine', drive: { mine: true, throttle: 0.9, overtake: false } },
  { id: 't3-mine-side',  seek: 0.610, camera: 'side',  frames: 380, feature: 'mine', drive: { mine: true, throttle: 0.9, overtake: false } },

  // Explosions: wreck rivals on camera, repeatedly.
  { id: 't3-kill-chase', seek: 0.340, camera: 'chase', yieldFor: 4.2, frames: 440, feature: 'explosion', drive: { fire: true, throttle: 0.90, overtake: false },
    at: [{ frame: 80, wreckAhead: true }, { frame: 200, wreckAhead: true }, { frame: 320, wreckAhead: true }] },
  { id: 't3-kill-side',  seek: 0.345, camera: 'side',  yieldFor: 4.2, frames: 420, feature: 'explosion', drive: { fire: true, throttle: 0.90, overtake: false },
    at: [{ frame: 70, wreckAhead: true }, { frame: 190, wreckAhead: true }, { frame: 300, wreckAhead: true }] },
  { id: 't3-hero-wreck', seek: 0.500, camera: 'chase', yieldFor: 3.2, frames: 420, feature: 'explosion',
    at: [{ frame: 90, wreckSelf: true }] },

  // The line.
  { id: 't3-finish-chase', seek: 0.920, camera: 'chase',   yieldFor: 4.0, frames: 440, feature: 'finish', drive: { throttle: 0.97 } },
  { id: 't3-finish-side',  seek: 0.935, camera: 'side',    yieldFor: 4.0, frames: 400, feature: 'finish', drive: { throttle: 0.97 } },
  { id: 't3-finish-pov',   seek: 0.930, camera: 'cockpit', yieldFor: 4.0, frames: 400, feature: 'finish', drive: { throttle: 0.97 } },,

  // --- Added for the scene-by-scene remake ---------------------------------
  // The reference cuts repeatedly to POV shots threading through structures
  // (ship wreckage, engine rooms, stone arches, frozen pipework). These are the
  // circuit's equivalents: the rock arch and the refinery.
  { id: 't4-arch-pov',     seek: 0.435, camera: 'cockpit', yieldFor: 4.0, frames: 400, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  { id: 't4-arch-side',    seek: 0.437, camera: 'side',    yieldFor: 4.0, frames: 380, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  { id: 't4-refinery-pov', seek: 0.575, camera: 'cockpit', yieldFor: 4.0, frames: 400, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  { id: 't4-spires-dusk',  seek: 0.680, camera: 'chase',   yieldFor: 4.0, frames: 400, feature: 'pack', drive: { throttle: 0.94, overtake: false } },
  // A low, close side pass: the reference's "craft screams past the lens".
  { id: 't4-lowpass-side', seek: 0.150, camera: 'side',    yieldFor: 4.6, frames: 400, feature: 'pack', drive: { throttle: 0.90, overtake: false } },
];
