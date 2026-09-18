/**
 * Trailer shot list. Each entry is one deterministic take rendered offline at
 * 60fps from the built bundle. Locations come from scripts/trailer/scout.mjs.
 *
 *   seek      course progress 0..1 to stage the pack at (mutually exclusive
 *             with `scenario`, which stages its own authored moment)
 *   scenario  expansion review scenario name
 *   camera    chase | hero | side | cockpit   ('course' drops the cel post)
 *   hud       show the HUD (default false: cinematic shots run clean)
 *   settle    sim ticks to run before the first captured frame
 *   frames    captured output frames at 60fps
 *   input     player input held for the take
 *   at        [{ frame, input?, wreck?, camera? }] timed changes during the take
 */
export const SHOTS = [
  // --- Act 1: launch and speed -------------------------------------------
  { id: 'a1-grid-side',    seek: 0.985, camera: 'side',    frames: 150, settle: 0,   input: { throttle: 1 } },
  { id: 'a1-launch-chase', seek: 0.0,   camera: 'chase',   frames: 200, settle: 12,  input: { throttle: 1, boost: true } },
  { id: 'a1-straight-pov', seek: 0.095, camera: 'cockpit', frames: 200, settle: 30,  input: { throttle: 1, boost: true } },
  { id: 'a1-gantry-side',  seek: 0.10,  camera: 'side',    frames: 160, settle: 24,  input: { throttle: 1 } },
  { id: 'a1-sunset-hero',  seek: 0.195, camera: 'hero',    frames: 180, settle: 24,  input: { throttle: 1 } },
  { id: 'a1-sunset-chase', seek: 0.20,  camera: 'chase',   frames: 180, settle: 24,  input: { throttle: 1, boost: true } },

  // --- Act 2: handling ----------------------------------------------------
  { id: 'a2-drift-chase',  seek: 0.795, camera: 'chase',   frames: 220, settle: 30,
    input: { throttle: 1 }, at: [{ frame: 40, input: { throttle: 1, drift: true, steer: -0.85 } }, { frame: 170, input: { throttle: 1 } }] },
  { id: 'a2-drift-side',   seek: 0.795, camera: 'side',    frames: 200, settle: 30,
    input: { throttle: 1 }, at: [{ frame: 30, input: { throttle: 1, drift: true, steer: -0.85 } }] },
  { id: 'a2-banked-pov',   seek: 0.80,  camera: 'cockpit', frames: 180, settle: 24,  input: { throttle: 1, boost: true } },
  { id: 'a2-jump-chase',   seek: 0.845, camera: 'chase',   frames: 220, settle: 12,  input: { throttle: 1, boost: true } },
  { id: 'a2-jump-side',    seek: 0.845, camera: 'side',    frames: 200, settle: 12,  input: { throttle: 1, boost: true } },
  { id: 'a2-canyon-pov',   seek: 0.42,  camera: 'cockpit', frames: 200, settle: 24,  input: { throttle: 1, boost: true } },
  { id: 'a2-canyon-chase', seek: 0.44,  camera: 'chase',   frames: 180, settle: 24,  input: { throttle: 1 } },
  { id: 'a2-spires-hero',  seek: 0.69,  camera: 'hero',    frames: 180, settle: 24,  input: { throttle: 1 } },
  { id: 'a2-refinery-pov', seek: 0.565, camera: 'cockpit', frames: 200, settle: 24,  input: { throttle: 1, boost: true } },
  { id: 'a2-refinery-side',seek: 0.585, camera: 'side',    frames: 180, settle: 24,  input: { throttle: 1 } },

  // --- Act 3: combat ------------------------------------------------------
  { id: 'a3-lance-side',    scenario: 'weapon-fired',   camera: 'side',  frames: 160, settle: 0 },
  { id: 'a3-lance-chase',   scenario: 'weapon-fired',   camera: 'chase', frames: 160, settle: 0 },
  { id: 'a3-shield-side',   scenario: 'shield-active',  camera: 'side',  frames: 160, settle: 0 },
  { id: 'a3-mine-side',     scenario: 'mine-trigger',   camera: 'side',  frames: 180, settle: 0 },
  { id: 'a3-wreck-side',    scenario: 'wreck',          camera: 'side',  frames: 200, settle: 0 },
  { id: 'a3-wreck-chase',   scenario: 'wreck',          camera: 'chase', frames: 200, settle: 0 },
  { id: 'a3-recovery',      scenario: 'recovery',       camera: 'chase', frames: 180, settle: 0 },
  { id: 'a3-redline',       scenario: 'redline',        camera: 'chase', frames: 160, settle: 0 },
  { id: 'a3-stress-hero',   scenario: 'combat-stress',  camera: 'hero',  frames: 180, settle: 0 },
  { id: 'a3-hazard-pov',    scenario: 'hazard',         camera: 'cockpit', frames: 180, settle: 0 },
  // A real rival detonating mid-race, not a staged tableau.
  { id: 'a3-live-wreck',   seek: 0.30, camera: 'chase', frames: 220, settle: 24, input: { throttle: 1 },
    at: [{ frame: 30, wreck: 'ai' }] },

  // --- Act 4: field and finish -------------------------------------------
  { id: 'a4-pack-hero',    seek: 0.32,  camera: 'hero',  frames: 200, settle: 36, input: { throttle: 1 } },
  { id: 'a4-showcase',     scenario: 'vehicle-showcase', camera: 'hero', frames: 160, settle: 0 },
  { id: 'a4-finish-chase', seek: 0.955, camera: 'chase', frames: 220, settle: 12, input: { throttle: 1, boost: true } },
  { id: 'a4-finish-side',  seek: 0.965, camera: 'side',  frames: 180, settle: 12, input: { throttle: 1, boost: true } },
  // One HUD-on take so the cut can prove this is a real, playable game.
  { id: 'a4-hud-chase',    seek: 0.10,  camera: 'chase', frames: 200, settle: 24, hud: true, input: { throttle: 1, boost: true } },
];
