# PodRacing handover — 8 September 2026 continuation

> Round32 in progress: all26 source imports are complete. Polwo appearance code and source paint/driver repair are being integrated; the current working tree has changed since the frozen round31 build. The round31 performance result applies only to its saved bundle. Final round32 build, asset lifecycle, in-game captures and performance are pending. No deployment.

Work in **/Users/amir/Projects/PodRacing**, branch **codex/now-this-is-podracing**, baseline **0f0e8ab209cc5156efaf92b545630bd243b14478**. The original task folder `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all current uncommitted work. No overhaul commit, push or deployment has occurred.

The user approved recommendations 1–8 and art style **B / Inkstorm**, requested all downloadable catalogue vehicles with drivers, Blender MCP/imagegen, repeated blind criticism and 40–60fps. **The request remains incomplete.** Read [STATUS](docs/inkstorm-overhaul/STATUS.md), [ROUND31](docs/inkstorm-overhaul/ROUND31.md) and [CURRENT_VISUALS](docs/inkstorm-overhaul/CURRENT_VISUALS.md) first.

Latest verified technical checkpoint: **round31**, `index-DGjkpNeh.js`, SHA256 `913a7744af6b9237800e54f7dd0898ec0ca3355c2f9638f93545cbcc747a24cb`, 1,602,555 bytes. **600 tests / 108 files**, typecheck/build/diff and final capture/lifecycle/context/resource checks pass. Both Teemto and Sebulba finish ordinary Time Attack and Canyon Cup, and Continue to Foundry. **59.699–59.736 Hz mean racing cadence, 16.8 ms p95, adaptive DPR 1–2 for Time Attack and 1.75–2 for Cup**; one preserved 66.6 ms hitch, 114 racing intervals >25 ms. All 24,745 raw rows remain, including Cup classification wait after player finish. 137 source/34 public-art/41 dist/six harness/four config entries match across all frozen manifests. [Exact scope](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_ROUND31.md).

Retained round31 changes: shared physical 138 m launch descent and broader bank joins, **course 9 / drive 4 / rules 2** with old-record archive migration; advance fork guidance; open-cockpit Teemto V2 with visible driver and ten opaque draws. A stale V4C count assertion failed once in the lifecycle harness; its preserved, corrected V2 fixture now pins actual GLB SHA/counts and passes 14 stages. Details and previous failed drafts are preserved.

**Fresh world art still FAILS: 0/7, mean 4.79/10.** V2 cockpit is preferred at 6/10 but fails finished construction/material acceptance. Original seven concepts are targets, not screenshots; concept09 is supplementary. New blind workers subsequently hit account usage limits; do not replace a blind gate with self-approval.

**All 26 candidate vehicle sources are now officially imported and GLB-preserved**, 748,730,812 total bytes, with the same 29-result current search. The remaining 24 downloads succeeded in this continuation; eight older 429s remain preserved. **Only two families are runtime-integrated**, with two added static drivers. New candidates need occupancy inspection, stylization, anchors, LODs and in-game review. One NoDerivs source remains restricted from public adaptations. [Catalogue and provenance](docs/inkstorm-overhaul/VEHICLE_CATALOG.md). Current source-inspection work: `assets/source/inkstorm/catalogue-inspection-round32/`.

Every owned completed browser is closed; final race ports 61676/61776 and diagnostic ports 61375/61424/61485/61509 are closed. Never stop unrelated port5211. Blender tools preserve the original active Cruise scene/layer/15-object selection, use isolated source scenes and clear temporary configuration. Ben export observed an unrelated Cruise-scene membership addition of `Icosphere.005`; origin unestablished and object preserved. Do not claim every global membership stayed exact for that one import; subsequent 22 imports did. Never save the full shared `.blend`. Historical full handover is [preserved](docs/inkstorm-overhaul/HANDOVER_BEFORE_ROUND31.md).

Next: prepare the new catalogue; fix compact cockpit/chassis transitions and material consistency; author geological depth and stronger landmark construction; resume blind critics; complete human/controller/audio, full championship balance and other-device acceptance. Existing synthesized audio and 32.43-second capture lack a critical direct audition. The prior published product description below remains historical and does not describe this overhaul.

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
