# PodRacing handover — round34 Blockrunner admission

**The full Inkstorm overhaul remains incomplete.** Colour Blockrunner is now the fourth locally registered family, using the actual V6 atlas packages and its original minifigure pilot. Final art is not accepted. Current V3 build **index-Cnysa7ZZ.js**, **1,619,624 bytes**, SHA256 `10ef7eb7189f407f530f73e802cdbc59acc1ebd47f5cfb2a26e3341e3b9bb04e` passes **671 tests / 120 files**, typecheck/build and 13 error-free runtime captures.

**Final full-race, section/context/resource checks and frozen evidence inventory: PENDING ROOT FINAL FACTS.** The build/capture pass below does not substitute for these checks.

Work in **/Users/amir/Projects/PodRacing**, branch **codex/now-this-is-podracing**, baseline **0f0e8ab209cc5156efaf92b545630bd243b14478**; remote TheDudeCommits/PodRacing. The task folder `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all uncommitted work. No overhaul commit, push or deployment has occurred.

The user approved recommendations 1–8, art **B / Inkstorm**, all downloaded catalogue vehicles with drivers, Blender MCP/imagegen, independent criticism and 40–60fps. [STATUS](docs/inkstorm-overhaul/STATUS.md) owns acceptance and remaining scope; [ROUND34](docs/inkstorm-overhaul/ROUND34.md) owns this runtime revision and exact technical evidence; [CURRENT_VISUALS](docs/inkstorm-overhaul/CURRENT_VISUALS.md) owns current images; [Blockrunner source record](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md) owns preparation/provenance; [catalogue](docs/inkstorm-overhaul/VEHICLE_CATALOG.md) and its manifest own vehicle counts and licence boundaries.

**26 preserved source families; four registered families (Teemto, Sebulba, Polwo, Blockrunner), eight logical hero/rival variants, 12 preserved public GLBs, three project drivers added, and 22 source families pending runtime preparation.** Blockrunner retains its original minifigure pilot; it is not a fourth added driver. All 26 saved catalogue downloads are complete; source GLBs total 748,730,812 bytes.

The V6 hero/rival public files are 3,693,000 / 3,228,580 bytes and 44,028 / 29,682 triangles, each with the same 4,128-triangle original pilot and five material submissions before extra passes. Normalization, source-preserving control fit, baked palette/wear, derivative LOD and ClampToEdge are recorded by actual receipts. Their registration is separate from final gameplay and art acceptance. [Source/export/package scope](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md).

The completed V1 in-game review remains **5.5/10 selected craft / 6/10 world, FAIL**. It is independent but **not fresh blind** because the reviewer previously saw limited aperture/catalogue implementation context; the agent limit prevented a new reviewer. V3 camera changes are captured; their final review is **PENDING ROOT FINAL FACTS**. No final art PASS is claimed.

The previous foundation-material V1 freeze and its performance results are historical; do not describe `index-DAcqiho8.js` as current. [Preserved report](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_FOUNDATION_ROUND34.md). The seven pre-admission documents/manifest are [byte-preserved](docs/inkstorm-overhaul/evidence/round-34/pre-blockrunner-admission-documentation/inventory.json).

Blender has **152 preserved scenes**, ending with the isolated normalized V6 export; source, cleanup, control-fit and paint histories remain. Restore original **Cruise — Going Merry source 4b2cb678**, its ViewLayer, active **Sketchfab_model.001** and exact 15-object selection after every call. Never save the shared `.blend`. Structural FNV checks and separate source-file SHA256 receipts have their recorded scope; preserve the earlier Ben-import membership observation. Keep the NoDerivs source private and do not blindly stage the source archive.

Continue with the remaining visual material/framing/world gaps and the other 22 families; the ivory variant needs independent source references because its beam placement, triangulation and normals differ. Retain deterministic simulation/network/terrain authority, course9/drive4/rules2 and existing driving classes. Human/controller/audio, full championship balance, other-device and multiplayer acceptance remain open. Close every owned browser immediately after use; never adopt or signal unrelated port5211. Current final cleanup details remain pending with the final performance evidence.

## Archived pre-overhaul product handover — preserved verbatim

The following 9,333 bytes are historical, including their old counts, “current” wording and asset restrictions. They are retained for provenance; the active scope and evidence above take precedence.

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
