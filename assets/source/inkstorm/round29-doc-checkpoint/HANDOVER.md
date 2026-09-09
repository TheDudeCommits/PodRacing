# Now This Is PodRacing — session handover

Last updated: 2026-09-08 (round28 checkpoint recorded 7 September UTC)

## Inkstorm overhaul continuation — local work in progress

The current working tree contains the user-authorized implementation of art
direction B and recommendations 1–8. Start with
[the current overhaul status](docs/inkstorm-overhaul/STATUS.md),
[bridge acceptance](docs/inkstorm-overhaul/BRIDGE_ACCEPTANCE.md), and
[vehicle ingestion status](docs/inkstorm-overhaul/VEHICLE_CATALOG.md).
The baseline for these uncommitted changes is `0f0e8ab209cc5156efaf92b545630bd243b14478`
on `codex/now-this-is-podracing`, in `/Users/amir/Projects/PodRacing`.
No changes from this overhaul have been committed, pushed or deployed.

**Round28 is the latest complete visual, vehicle and full-race checkpoint; round29 grid repairs are now active.** The measured build is `index-CED-RrRq.js`, SHA **`ca752f0a0f3da8e7585dd6c999d7ed5615d56c766c04e4dd767ef07256f1175d`**, 1,567,417 bytes. **563 tests / 99 files**, typecheck/build/diff, 17 actual world captures with zero browser errors, and all 14 vehicle lifecycle stages pass. It combines the round27 nozzle/contact/rock-lighting work with six bounded off-road launch cuts, three fractured spires and Teemto's V4C cloth. The 532,296 recorded route/shoulder/normal probes remain unchanged.

Both appearances completed Time Attack, Canyon Cup and actual Continue on the exact round28 runtime: mean **59.797–59.838Hz**, p95 **16.7–16.8ms**, maximum **33.4ms**, with adaptive DPR1–2 in Time Attack and1.875–2 in Cup. The four required races retain72 intervals above25ms. Two original Sebulba invocations failed a test clock oracle: a value2.95picoseconds below63.325s was incorrectly expected as1:03.324 rather than the game's correct1:03.325. Both failures remain; the test's independent nanosecond-normalized oracle was corrected without changing the game, input controller or cadence gate. All32,455 raw rows across six actual races remain. The eight source/public/dist manifests match, owned browsers/ports are closed, and the freeze was released at19:48:02UTC. Read [the complete round28 performance report](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_ROUND28.md) for exact resolution, failures and scope. This is local adaptive performance, not fixed-resolution, other-device or art acceptance.

Current round29 source aligns the pit slabs/foundations, grades the three pit complexes using shared physical/rendered offsets and saved anchors, installs the revised repair equipment/gantry kit, and adds the initial task lights. The24 focused CPU/render checks, typecheck and actual175-point/four-state GLSL sampler readback pass. Actual paired source captures have zero browser errors and identical cameras/building matrices. Fresh blind critics retain grading, equipment and narrowly the lighting; strict parity still fails. The heavier cloth edge is being revised, a muted-blue paint/emission classifier defect is being corrected, and district grading remains staged pending separate integration. No round29 build or full-race performance result exists. Start with [the active workshop comparison gallery](docs/inkstorm-overhaul/WORKSHOP_ROUND29.md); all images are actual diagnostic cameras, not ordinary racing/FPS evidence.

The full user request is **not accepted or complete**. The fresh [round28 world review](docs/inkstorm-overhaul/BLIND_WORLD_ROUND28.md) is **FAIL, 0/7 section targets accepted**. The [driver review](docs/inkstorm-overhaul/BLIND_PILOT_RUNTIME_ROUND28.md) retains V4C's clearer blue cloth, but also fails the art gate. Its normal and roughness textures are preserved; six exact material groups provide separate cloth, webbing, glove and hardware responses. See [V4C runtime evidence](docs/inkstorm-overhaul/TEEMTO_PILOT_V4C_RUNTIME_ROUND28.md). The earlier 13 GPU shader comparisons and 20-second GPU query probe are scoped to their recorded round27 builds, not a new round28 full-race result.

Teemto and Sebulba were officially downloaded, source-preserved, repainted, given original static drivers and exported as hero/rival GLBs; both are selectable in the garage and race. Coverage remains **2 functional integrations / 26 candidates**, with **24 awaiting acquisition: 22 unattempted and 2 rate-limited** after four Ben Quadinaros requests and three requests for JakacBatko’s Podracer returned HTTP429. The latest request at 20:52:51 UTC followed 91m46s backoff, imported no objects and restored the exact shared Blender context; all 93 pre-existing scenes retain identical object membership, with the sole new empty intake bringing the total to 94. The official browser fallback still cannot open: a fresh CUA state check confirms the Mac remains locked; user unlock is pending. No owned browser was created by that fallback. Teemto's current hero uses V4C; its rival and Sebulba retain V1. The V1 and V4B sibling files and all earlier studies/failures are preserved. There are four logical runtime variants and six physical public vehicle GLBs.

A preserved historical full-race technical freeze is **round26**, `index-BlxCUBzh.js`, SHA **`749fd90ba1b87928161c6732fd18c6a8376acb03fe64c3cb7dd8e9b6d660d49e`**. **519 tests / 92 files**, typecheck/build/diff pass. It combines the sky seam and continuous bridge-row fixes, revised rock material, five launch scan placements, and the normalized scanned arch v3. Runtime uses `canyon-arch-v3.glb`; the original `canyon-arch.glb` is preserved alongside it. The combined capture produced **17 PNGs: seven sections, eight supplemental views, garage and short live input**, with zero browser errors. See [the current visual checkpoint](docs/inkstorm-overhaul/CURRENT_VISUALS.md) and [fresh round26 criticism](docs/inkstorm-overhaul/BLIND_WORLD_ROUND26.md).

**Both exact round26 full runs passed** on local Apple M4 / Chrome 152 at adaptive resolution. Teemto Time Attack/Cup averaged **60.002430 / 60.002386 Hz**; Sebulba **60.002275 / 60.002386 Hz**. All four racing phases had p95 **16.7 ms**, maximum **16.8 ms**, zero intervals above 25 ms and zero browser errors. Time Attacks used DPR 1–2 and recovered 2 at 35.32/35.18 seconds; Cups briefly used 1.875 before returning to 2 at 2.12/2.15 seconds. All **24,554 raw rows** remain, including two slow countdown intervals. Actual Continue reached Foundry for both appearances. All 130 source / 28 public-art / 35 dist / four harness / four configuration files matched across both before/after manifests; browsers and preview ports 60874/60995 closed. Read [FULL_RACE_PERFORMANCE_ROUND26.md](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_ROUND26.md) for exact metrics and scope. This is not fixed-resolution, other-device or art acceptance.

**Historical round25 functional acceptance remains scoped to round25.** Build `index-DYsxLpxt.js`, SHA `14c129a2de533fa5c3e4adbdacd1eb1e6cda21112df3fa7317b2e613ae1ac4b5`, passed 512 tests / 90 files and the 14-stage vehicle lifecycle harness. It verified delayed load cancellation, persistence, fallback/Retry, shadows/MRT and the paused readiness label at simulationFrame 0; context restoration was checked on Teemto, not independently on Sebulba. The round26 race harness did not repeat every lifecycle stage. [Round25 functional report](docs/inkstorm-overhaul/VEHICLE_APPEARANCE_ROUND25.md) · [Historical round25 timing](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_ROUND25.md). Round24's stale Preparing-label finding and prior failures remain preserved.

The round26 arch is visually attached to the canyon, but target acceptance still fails: similar purple rock masses, thin fork curb wedges, smooth launch mesas, sparse industrial depth and flat luminous engine ends remain. These are historical round26 defects; the fresh round28 review above is authoritative for the current images. Round28 measurement is complete; its timing does not automatically cover active round29 changes. There are still **24 catalog downloads pending**, **0/7 world sections accepted**, and **no overhaul deployment**.

Round-17 context restoration, player-shadow framebuffer fallback and all 54 HUD assertions passed within their recorded earlier scope. Start with STATUS.md and CURRENT_VISUALS.md for exact acceptance.

The scanned geology comes from official CC0 Poly Haven sources, processed through Blender MCP. It does not satisfy the requested Sketchfab vehicle import. Local scanned-geology `*-checkpoint.blend*` recovery files include an unrelated saved workshop scene; they are narrowly ignored and must not be included in repository publication. Deliver isolated exports/builders/provenance. The original saved workshop file was preserved.

A 32.43-second actual gameplay audio capture is in output/audio; signal checks found no clipping, but there was no direct audition and pause attempts did not engage. Read SENSORY_QA.md for the measured scope. Sketchfab authentication was rechecked successfully through MCP during this continuation; the earlier disabled/locked-session blocker is historical.

Seven imagegen section concepts, original Blender MCP environment sources,
optimized glTFs, their receipts and the iteration reports are preserved.
Concept PNGs are targets; screenshots in `output/gauntlet` are renderer or
live-play evidence with different limits. Do not treat a staged screenshot
as a completed lap or a frame-rate measurement. Check the current status for
the precise build, tests, performance resolution and remaining acceptance.

The original handover below describes the previously published baseline and
remains historical context; its entirely procedural asset description and
test counts do not describe this working tree.

## Links and source state

- Repository: <https://github.com/TheDudeCommits/PodRacing>
- Active development branch: `codex/now-this-is-podracing`
- Branch on GitHub: <https://github.com/TheDudeCommits/PodRacing/tree/codex/now-this-is-podracing>
- Public production game: <https://now-this-is-podracing.vercel.app>
- Vercel project: `amirs-projects-d9680079/now-this-is-podracing`
- Feature baseline before this handover: `8346ad5` (`Build procedural multiplayer podracing expansion`)

Start a continuation session from this repository and branch. Before changing
anything, run `git status --short --branch` and preserve any user-owned edits.

## Local setup

```bash
git clone https://github.com/TheDudeCommits/PodRacing.git
cd PodRacing
git switch codex/now-this-is-podracing
npm install
npm run dev
```

Vite serves the game at <http://localhost:5173>. The primary target is current
Chrome on Apple Silicon at Retina resolution.

## Product state

The game is a complete Vite + Three.js + TypeScript browser racer with a
procedural cel-shaded rendering pipeline. Runtime geometry, materials, terrain,
textures, particles, pilots, HUD graphics, and gameplay audio are generated in
code. The only bundled recording is the short user-supplied selection sting at
`public/audio/podracing-selection-intro.webm`; it transitions into synthesized
music.

The current build includes:

- four selectable and mechanically distinct vehicle classes, locked once a
  race starts, with procedural 3D selection-card portraits;
- an eight-racer field, including up to four room-code multiplayer humans with
  AI filling all vacant slots;
- host-authoritative 120 Hz simulation, sequenced guest inputs and snapshots,
  rematches, pasteable six-character room codes, and AI takeover after a
  disconnect;
- one, two, or three laps; Easy, Medium, or Hard AI; and Circuit, Eliminator,
  Checkpoint Sprint, Combat Race, Survival Gauntlet, Drift Trial, and Team Race;
- a newly seeded course every race, six procedural desert regions, semantic
  straights/sweepers/chicanes/hairpins/canyons/launch crests, branch routes,
  safe and risky shortcuts, solid canyon collision, and checkpoint recovery;
- Race Director events, drafting/turbulence/slingshots, a perfect-launch heat
  test, persistent per-vehicle Workshop builds, combat, shields, mines, traps,
  wreck/recovery states, upgrades, and dynamic hazards;
- race highlights, photo-finish detection, cinematic real-pointer replays, and
  the supplied “NOW THIS IS PODRACING” overtake callout;
- keyboard and gamepad remapping, deadzone/sensitivity/assist controls, audio
  mixing, reduced motion, shake/FOV controls, high contrast, and threat cues;
- quantized cel lighting, banded specular, Fresnel rims, distance-aware inverted
  hulls, MRT depth/normal Sobel edges, adaptive DPR and LOD, pooled effects,
  procedural dune displacement, wake ribbons, dust rings, sand spray, haze,
  graphic clouds, and twin suns.

## Controls and menus

The starting screen contains vehicle, AI level, race mode, lap count, Workshop,
and online-room controls. The game waits for `Space` or `Enter`; it never starts
on page load. Editable room fields keep native keyboard input and clipboard
paste, so gameplay bindings do not fire while typing.

Default race controls:

- `W` / `S`: throttle / brake
- `A` / `D`: steer left / right
- `Space`: drift and release boost
- `Shift`: redline boost and heat management
- `E`: Heat Lance
- `F`: Scrap Mine
- `Q`: pulse shield
- `R`: checkpoint recovery or results restart
- `P` / `Escape`: pause
- `H`: controls card
- `M`: mute

## Architecture map

- `src/game/`: deterministic vehicle simulation, race rules, AI, director,
  procedural course generation, branches, regions, highlights, and Workshop
  runtime effects.
- `src/network/`: PeerJS room lifecycle, lobby authority, normalized semantic
  inputs, chunked snapshots, event replication, reconnect and cleanup.
- `src/render/`: Three.js application shell and all procedural views.
- `src/render/terrain/`: analytic CPU terrain shared with shader displacement,
  terrain LOD, dust, wakes, and spray.
- `src/render/materials/` and `src/render/post/`: cel ramp, banded specular,
  Fresnel, outlines, normal/depth prepass, and Sobel composite.
- `src/render/objects/` and `src/render/pilots/`: vehicle/course/sky views and
  code-rigged pilots.
- `src/ui/`: HUD, minimap, lobby/selection/Workshop/settings UI, and procedural
  vehicle portraits.
- `src/audio/`: Web Audio engine voices, impacts, weapons, ambience, callout,
  selection-sting lifecycle, and synthesized score.
- `src/diagnostics/`: deterministic capture hooks and adaptive performance
  governor.
- `scripts/`: Retina screenshot, selector stability, multiplayer, procedural
  course, and performance harnesses.
- `tests/`: 47 Vitest files covering simulation, AI, race systems, networking,
  rendering contracts, input, UI, audio, settings, pilots, and terrain.

See `ARCHITECTURE.md` for invariants, timing, online authority, frame graph,
performance budgets, and the `window.__PODRACING__` deterministic review API.

## Required verification

For logic-only work, at minimum run:

```bash
npm run typecheck
npm test
npm run build
```

For visual, input, course, networking, or performance work, also run the
relevant browser harnesses:

```bash
npm run capture
npm run capture:selector
npm run capture:multiplayer
npm run capture:procedural
npm run profile
```

All harnesses write ignored evidence to `output/playwright/`. Browser processes
must be closed immediately when a harness or interactive browser check is done.

Latest accepted evidence before this handover:

- 47/47 test files and 258/258 tests passed;
- TypeScript and Vite production build passed;
- Retina deterministic frame work measured 5.5 ms p95 with no samples over
  16.67 ms;
- steady review draw calls measured 98 and 86 against the 150-call budget;
- procedural rematch centerlines differed by 1881.26 m RMS and minimaps by
  91.41%, while same-seed reconstruction remained deterministic;
- two-client multiplayer passed room creation/join, native paste, host-owned
  setup, guest vehicle selection, start synchronization, remote control,
  authoritative convergence, mines, redline heat, and browser-error checks;
- the final visual critic reported no P0, P1, or P2 defects on the accepted
  Retina build and no console, shader, renderer, or WebGL errors.

## Performance and correctness invariants

- Keep race truth in the fixed-step simulation; render, HUD, audio, and replay
  presentation must not mutate it.
- The host is the only online race authority. Guests may extrapolate visual
  poses briefly but never advance collisions, laps, weapons, damage, or time.
- A course replacement is transactional: spline, branches, gates, pylons,
  canyon collision, minimap, checkpoints, hazards, AI pathing, effects, and
  stale network snapshots must all switch to the same seed.
- CPU terrain queries and shader terrain displacement must stay mathematically
  aligned or vehicle contact, canyon placement, ribbons, and dust will drift.
- Preserve pooled/instanced effects and avoid per-frame geometry or material
  allocation.
- Performance budgets are 13.5 ms soft work, 150 steady-state draw calls, 260
  high-density review calls, and 600k triangles per complete frame.
- Keep editable fields isolated from bound gameplay input and binding capture
  isolated from the old action.
- Preserve A-left, D-right and `F` for mines unless the user explicitly changes
  the defaults.
- Vehicle choice and Workshop loadout become immutable when the grid releases.

## Known operational notes

- The production bundle is intentionally large and Vite reports a chunk-size
  warning; this is not a build failure. If splitting it, preserve synchronous
  race boot and lazy-load only genuinely optional systems such as PeerJS.
- Chrome may warn that AudioContext playback requires a gesture. The audio
  lifecycle already handles autoplay restrictions and resumes on the first
  approved input; do not treat that warning alone as a runtime defect.
- PeerJS signaling is account-free and direct peer transport is sufficient for
  simple rooms, but it is not a persistent authoritative backend or global
  matchmaking service.
- This is a fan-made, non-commercial homage. Do not add downloaded Star Wars
  models, textures, film audio, logos, or character likenesses.
- `output/`, `dist/`, `.vercel/`, and `node_modules/` are intentionally ignored.

## Deployment

The directory is linked locally to the existing Vercel project. Production is
deployed with:

```bash
npx vercel deploy . --prod -y
```

The stable public alias must remain:
<https://now-this-is-podracing.vercel.app>.

After deployment, report the immutable deployment URL and stable alias. Do not
overwrite or create a second Vercel project unless the existing link is
demonstrably unavailable.

## Suggested continuation prompt

> Continue “Now This Is PodRacing” from `HANDOVER.md` on branch
> `codex/now-this-is-podracing`. Inspect the current worktree before editing,
> preserve the simulation/network/terrain invariants, implement my next request,
> run proportional Vitest and Retina browser verification, close every browser
> immediately afterward, then commit, push, and production-deploy only if I ask.
