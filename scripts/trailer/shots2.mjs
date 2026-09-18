/**
 * Trailer v2 shot list. Every take is a real race driven by the closed-loop
 * hero driver, staged so rivals are actually in frame.
 *
 *   yieldFor  seconds run at low throttle before capture, letting the seven
 *             rivals stream past so the hero starts in traffic (seekCourse
 *             otherwise places the hero ahead of the entire field)
 *   drive     command object handed to the in-page driver every frame
 *   at        timed events: { frame, drive?, camera?, wreckAhead?, wreckSelf? }
 */
export const SHOTS2 = [
  // --- The grid: machines, fleet, pilot -----------------------------------
  { id: 'v2-fleet-side',    scenario: 'vehicle-showcase', camera: 'side',  frames: 150 },
  { id: 'v2-fleet-chase',   scenario: 'vehicle-showcase', camera: 'chase', frames: 150 },
  { id: 'v2-grid-side',     seek: 0.980, camera: 'side',    yieldFor: 0.6, frames: 200, drive: { throttle: 1 } },
  { id: 'v2-launch-chase',  seek: 0.995, camera: 'chase',   yieldFor: 2.6, frames: 260, drive: { throttle: 1 } },

  // --- The race: traffic, overtakes, handling ------------------------------
  { id: 'v2-pack-side',     seek: 0.120, camera: 'side',    yieldFor: 4.2, frames: 260, drive: { throttle: 0.93, overtake: false } },
  { id: 'v2-pack-chase',    seek: 0.300, camera: 'chase',   yieldFor: 4.4, frames: 260, drive: { throttle: 0.93, overtake: false } },
  { id: 'v2-traffic-pov',   seek: 0.100, camera: 'cockpit', yieldFor: 4.2, frames: 240, drive: { throttle: 0.94, overtake: false } },
  { id: 'v2-gantry-side',   seek: 0.095, camera: 'side',    yieldFor: 4.0, frames: 220, drive: { throttle: 0.95, overtake: false } },
  { id: 'v2-overtake',      seek: 0.550, camera: 'chase',   yieldFor: 4.0, frames: 280 },
  { id: 'v2-refinery-pov',  seek: 0.560, camera: 'cockpit', yieldFor: 3.4, frames: 240 },
  { id: 'v2-drift-chase',   seek: 0.790, camera: 'chase',   yieldFor: 3.6, frames: 260, drive: { throttle: 0.96 } },
  { id: 'v2-drift-side',    seek: 0.790, camera: 'side',    yieldFor: 3.6, frames: 240, drive: { throttle: 0.96 } },
  { id: 'v2-jump-chase',    seek: 0.840, camera: 'chase',   yieldFor: 2.2, frames: 240 },
  { id: 'v2-jump-side',     seek: 0.838, camera: 'side',    yieldFor: 2.2, frames: 220 },
  { id: 'v2-canyon-chase',  seek: 0.420, camera: 'chase',   yieldFor: 4.0, frames: 240, drive: { throttle: 0.94, overtake: false } },
  { id: 'v2-arch-pov',      seek: 0.440, camera: 'cockpit', yieldFor: 4.0, frames: 220, drive: { throttle: 0.94, overtake: false } },
  { id: 'v2-hud-chase',     seek: 0.200, camera: 'chase',   yieldFor: 3.2, frames: 220, hud: true },

  // --- The war: real weapons at real targets -------------------------------
  { id: 'v2-lance-chase',   seek: 0.300, camera: 'chase',   yieldFor: 4.2, frames: 300, drive: { fire: true } },
  { id: 'v2-lance-side',    seek: 0.320, camera: 'side',    yieldFor: 4.2, frames: 260, drive: { fire: true } },
  { id: 'v2-lance-pov',     seek: 0.280, camera: 'cockpit', yieldFor: 4.2, frames: 260, drive: { fire: true } },
  { id: 'v2-brawl-side',    seek: 0.360, camera: 'side',    yieldFor: 4.6, frames: 300, drive: { fire: true } },
  { id: 'v2-mines-chase',   seek: 0.600, camera: 'chase',   yieldFor: 3.4, frames: 260, drive: { fire: true, mine: true } },
  { id: 'v2-kill-chase',    seek: 0.340, camera: 'chase',   yieldFor: 4.0, frames: 280, drive: { fire: true },
    at: [{ frame: 70, wreckAhead: true }] },
  { id: 'v2-kill-side',     seek: 0.345, camera: 'side',    yieldFor: 4.0, frames: 260, drive: { fire: true },
    at: [{ frame: 60, wreckAhead: true }] },
  { id: 'v2-hero-wreck',    seek: 0.500, camera: 'chase',   yieldFor: 3.2, frames: 300,
    at: [{ frame: 80, wreckSelf: true }] },

  // --- The line ------------------------------------------------------------
  { id: 'v2-finish-chase',  seek: 0.930, camera: 'chase',   yieldFor: 4.2, frames: 300, drive: { throttle: 0.96 } },
  { id: 'v2-finish-side',   seek: 0.945, camera: 'side',    yieldFor: 4.2, frames: 260, drive: { throttle: 0.96 } },
  { id: 'v2-finish-pov',    seek: 0.940, camera: 'cockpit', yieldFor: 4.2, frames: 260, drive: { throttle: 0.96 } },
];
