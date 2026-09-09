# Runtime architecture

## Product contract

“Now This Is PodRacing” is a one-to-three-lap, eight-racer arcade game whose frame must
read as graphic anime art before it reads as WebGL. The primary verbs are
accelerate, carve, drift, release a charged boost, manage heat/damage, and land
an unstable repulsorlift craft across an endless procedural desert.

The Inkstorm renderer combines authored GLB vehicles and scenery with procedural
terrain, pooled effects, shader materials and synthesized audio. Runtime models,
textures and local audio are served from `public/`. Downloaded originals, Blender
builders, exports and attribution records live under `assets/source/`; large
source binaries use Git LFS. See `docs/inkstorm-overhaul/VEHICLE_CATALOG.md` for
provenance and runtime admission, including restricted sources that are not used
in the game.

## Ownership boundaries

```text
src/
  game/          pure fixed-step race, AI, course and vehicle state
    input/       physical key mapping -> semantic actions
  network/       room-code signaling, peer transport and host snapshots
  render/        Three.js view adapters only
    terrain/     analytic CPU height + matching shader displacement, dust
    materials/   ramp lighting, outline, sky, post shaders
    objects/     racer, course, rock and atmosphere views
    pilots/      procedural pilot rigs and animation
    post/        depth/normal Sobel and graphic color finishing
  camera/        chase/orbit/result cameras and impulse shake
  audio/         gameplay synthesis + selection-sting/score lifecycle
  ui/            race instruments, overlays and procedural card portraits
  diagnostics/   perf governor and deterministic review hooks
```

Simulation objects never contain `THREE.Object3D` instances. Render views read
the current fixed-step state; UI and audio consume that same state and neither
owns race truth. The 120 Hz simulation rate keeps direct presentation smooth
while avoiding a second, divergent interpolated gameplay state.

The browser keyboard adapter captures physical gameplay codes only when focus
is outside native menu controls and editable fields, and no browser modifier is active. Editable nodes
are detected through the composed event path, so text inputs and shadow-DOM
controls retain native typing, selection, and clipboard shortcuts without
leaking bound letters into the simulation.

## World and timing conventions

- metres, Y-up, right-handed coordinates; ground is queried by `(x, z)`
- simulation yaw `0` faces world `+Z`; local `+X` is racer-right (render
  geometry adapters may rotate authored meshes, but never change simulation truth)
- closed seeded Catmull-Rom course, arc-length progress normalized to `[0, 1)`
- fixed 120 Hz vehicle/race update, variable-rate presentation
- gameplay clock advances only in fixed steps and freezes while paused
- first load keeps the fixed-step accumulator frozen in race setup; activating
  Race commits the selected pod and event before countdown stepping begins
- route markers share one authoritative placement list between simulation and
  rendering, with runoff beyond all driving lanes and scenery exclusions
- static-marker contact is separated and latched, so one scrape cannot emit
  120 damage/audio/shake events per second
- authored canyon walls expose renderer-free analytic collision proxies; full
  penetration correction and latched impulses keep every racer inside the visible cliffs
- sustained major or immediate extreme off-course deviation resets to the latest
  ordered checkpoint pose, so recovery cannot become a shortcut
- results finalize when the field finishes, or classify the remaining live
  order after an eight-second player-finish orbit so a stalled rival cannot gate UI
- terrain LOD rings snap around the camera while the analytic height field is
  sampled in world coordinates, so the horizon can continue without mesh seams
- deterministic capture seed: `0x504f4452` (`PODR`)

## Procedural race lifecycle

The authored control-point set is a topology contract, not a fixed track. For
each released grid, a seeded generator applies rotation/mirroring, anisotropic
scale, shear, broad harmonic deformation, section-specific chicane/hairpin/
sweeper shaping, and width variation. It then probes the analytic terrain to
place the launch section on a real crest. This keeps all eight designed race
beats and ten ordered checkpoints while producing a materially different closed
plan for each race.

A new race replaces `RaceSimulation` and every course-dependent adapter as one
transaction: ribbon/gates/pylons/canyon, inverted-hull registrations, minimap,
hazard poses, checkpoints, AI paths, dust/effect pools, camera state, and stale
network snapshots. Vehicle choices, names, renderer-owned racer views, and the
top-level player state object survive the transaction. Restarting a current
race is deterministic; returning to the lobby and releasing a new grid consumes
a guaranteed-unused session seed.

Online, only the host creates that seed. It travels in the immutable start
packet before simulation release, and guests reconstruct the same geometry
locally. Authoritative snapshots whose seed belongs to an earlier rematch are
discarded before projection against the new spline.

## Online-room authority

Online play keeps networking outside both the simulation and Three.js layers:

```text
guest keyboard -> semantic input packet ┐
                                        v
host keyboard -----------------> 120 Hz RaceSimulation
                                        |
                              canonical JSON snapshot
                                        v
                        guest presentation + HUD/audio
```

- A six-character room code maps to a PeerJS signaling identifier. PeerJS is
  dynamically imported only when Create or Join is used; solo startup does not
  pay its parse cost.
- The host owns the only advancing race simulation. Guests send normalized
  control intent on change plus a 30 Hz heartbeat; missing/disconnected input
  expires to neutral and the existing AI controller immediately fills the slot.
- Full authoritative state is distributed at approximately 20 Hz through the
  chunked binary data channel. Packets are sequenced, stale packets are
  rejected, and bounded send queues favor a fresh frame over delayed history.
- Guest render poses extrapolate velocity for at most 80 ms while the camera's
  spring damping hides packet cadence. This never advances checkpoints,
  weapons, collisions, placement, damage, or race time on the guest.
- Host-owned lap count and every connected member's vehicle class are synced in
  the lobby and become immutable when the host starts. Empty slots remain AI;
  a departed player's stable slot returns to AI without rebuilding the scene.
- Return-to-lobby is a room message, not a disconnect, so rematches retain the
  same code and participants. `dispose()` closes every data connection and
  destroys the signaling peer.

## Frame graph

1. update fixed simulation accumulator (bounded to avoid spiral-of-death)
2. terrain depth/normal prepass for edge and ground-proximity effects
3. opaque cel scene (3–4 diffuse bands, hard specular, Fresnel rim)
4. inverted hulls for priority silhouettes
5. transparent wakes, crest dust, sand spray and graphic flares
6. Sobel composite using prepass depth/normal, with exterior suppression
7. DOM HUD update at a throttled 30 Hz

The setup uses four short race-type tabs, one selected pod preview, optional
lap/difficulty controls and Race. Battle is the default eight-racer armed event;
Race is an eight-racer clean event, Time Trial is solo, and Cup is a sequence.
Advanced settings and legacy course/build tools are disclosed separately.
One shared preview renderer produces the selected authored model; dragging or
keyboard inspection renders the actual mesh from the chosen angle. There is no
continuous idle portrait loop. Native focused buttons/inspection own menu keys,
and committing the grid releases focus back to driving. Menu audio attempts immediate
playback, falls back to the first browser-approved gesture when autoplay is
blocked, crossfades from the supplied sting into the synthesized score, then
ducks without restarting when the countdown begins.

The adaptive performance governor scales DPR, MRT prepass resolution, terrain
ring count, dust density, and distant-racer detail. The cel post graph remains
enabled so the visual language does not disappear under load.

## Galactic combat expansion

The combat-racing layer follows the same one-way data flow as the base race:

```text
keyboard / AI intent
        ↓
fixed-step race simulation
  ├─ vehicle-class handling profile
  ├─ shield / weapon / redline state
  ├─ upgrade and salvage state
  ├─ deterministic traps and terrain hazards
  └─ wreck, recovery and takedown events
        ↓
render effects + HUD + camera + synthesized audio
```

- Vehicle classes are data profiles, not renderer-owned modes. The same class
  identifier drives handling, damage resistance, ability tune, silhouette and
  engine voice. Authored 1–5 card ratings summarize those real tunes; selection
  becomes immutable as soon as the player confirms the grid.
- Weapons resolve in the 120 Hz simulation. Rendering receives short-lived
  event records and uses fixed-capacity pools; a missed frame cannot change a
  hit and no projectile mesh is gameplay truth. The Heat Lance reuses those
  pools for a faceted sheath, white-hot core and travel pulse, with its newborn
  trail clamped to the owning vehicle's forward muzzle.
- Shields, cooldowns, upgrades, wreck timers, takedowns and hazard phases are
  finite JSON state included in deterministic snapshots.
- Course hazards are assigned to semantic sections (launch, canyon, chicane,
  and hairpin), then converted to world poses through the generated course
  sampler. This keeps every trap attached to its intended race beat without
  hard-coded scene coordinates.
- A wreck is a bounded race state: impact, debris/camera presentation, a short
  loss of control, checkpoint recovery, and retained consequences. It never
  replaces the player object or allows a physics NaN to escape into rendering.
- Dynamic terrain gameplay uses analytic hazard fields (sand geysers, heat
  vents, rockfall lanes and dust squalls) whose active windows are deterministic.
  Their visual meshes are instanced and their CPU collision volumes use the
  same phase and course pose.
- Expansion effects are partitioned into eight fixed instanced pools, so they
  add at most eight draw calls and must keep the complete high-density review
  frame below the 260-call / 600k-triangle gate.

## Performance budgets (Retina MacBook Pro / Chrome)

- 16.67 ms target frame; 13.5 ms governor soft ceiling
- DPR starts at `min(devicePixelRatio, 1.75)` and adapts within `1.0–2.0`
- <= 150 draw calls in steady real-time play; <= 260 in deterministic
  high-density review moments where every pooled effect is deliberately visible
- instanced rocks/pylons/dust; pooled particles and wake vertices
- terrain: camera-centred concentric LOD rings with shared analytic height
- no per-frame geometry/material allocation; models and textures load through
  the bounded asset library; room signaling starts after an explicit online action
- Sobel prepass runs at adaptive 0.65–1.0 scale

## Deterministic review API

The app exposes `window.__PODRACING__` after boot:

```ts
interface PodRacingReviewApi {
  ready: boolean;
  version: 2;
  setCaptureMode(enabled: boolean): void;
  setPreset(name: CapturePreset): void;
  setCamera(name: CaptureCamera): void;
  setScenario(name: ExpansionCapturePreset): void;
  setReviewCamera(name: ReviewCaptureCamera): void;
  setInput(input: Partial<PlayerInputState>): void;
  clearInput(): void;
  clearEvents(): void;
  step(frames: number): void;
  snapshot(): ReviewSnapshot;
}
```

Capture mode disables wall-clock advancement and dynamic DPR, applies a fixed
seed, and advances only through `step`. Named presets provide stable moments:
`desert`, `countdown`, `race`, `airtime`, `drift`, and `finish`. Named cameras:
`chase`, `hero`, `side`, `course`, and `cockpit`. Version 2 adds deterministic
vehicle, weapon, shield, trap, hazard, redline, wreck, recovery, upgrade, and
combat-stress scenarios. Their snapshots include authoritative expansion
state and recent event receipts so a screenshot cannot silently claim a
mechanic that the simulation did not execute.
The browser harness also captures the uncanned first-load registry and proves
zero pre-start fixed steps, pointer selection, Space confirmation, and the
locked-class invariant before entering deterministic capture mode.
The dedicated selector harness additionally drives ten seconds of alternating
keyboard input at 2x DPR and rejects opacity changes, geometry movement,
missing portraits, multiple-selection states, or non-identical settled frames.
The multiplayer harness launches two isolated Chrome contexts and requires a
real room handshake entered with bound-letter typing and native clipboard
paste, guest vehicle replication, host lap authority, remote semantic movement,
low host/guest snapshot divergence, no browser errors, and four Retina UI
evidence frames.
The procedural-course harness additionally performs a real Enter-to-race,
finish, lobby, and rematch flow; compares normalized minimap pixels and sampled
world geometry; proves byte-identical same-seed reconstruction; rejects sampled
self-intersections; and confirms two real peers receive one identical course
signature.

## Milestone quality gates

Every milestone must boot, accept input, survive resize, typecheck, build, and
produce deterministic screenshots. A visual critic reports concrete defects
from the PNGs. “Works” is not an art-quality acceptance criterion.
