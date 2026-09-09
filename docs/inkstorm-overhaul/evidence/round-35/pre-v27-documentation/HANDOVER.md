# PodRacing handover — 9 September 2026, Round 35

The latest work implements the user's attached UI/animation references and combat additions: cream/petrol garage and Build panels, amber race instruments, an orbital event atlas, solo wreck/takedown slow motion, EMP cells and repair salvage. **The full Inkstorm overhaul is still incomplete; final visual acceptance has not been reached.**

Use [Round 35 implementation and current QA](docs/inkstorm-overhaul/ROUND35_UI_COMBAT_HANDOVER.md) as the active checkpoint. **V26 passes 870 tests / 145 files, TypeScript/build, 17 native interface captures and four crash/control cases.** Its fresh crash review remains 5/10; interface scores are HUD 7/7.5, Build 7/6.5, map 7.5/8 and garage 8/7.5 (style/readability). The latest measured races are still the separate V24b build at 59.47/58.98 Hz average on M4; V26 does not inherit those measurements. Private V27 flame artwork and impact/settling work is underway. The previous overview below is historical.

Work in `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, baseline HEAD `0f0e8ab209cc5156efaf92b545630bd243b14478`; preserve all uncommitted work. `/Users/amir/Codex-ThreeJS` is unrelated. No overhaul commit, push or deployment has occurred. There are 26 preserved source families, four registered and 22 pending. Ivory fitting, Ark preparation and the private Foundry foundation patch remain separate unfinished work. Do not save the shared Blender file or touch unrelated port 5211. Close owned browsers immediately after use.

The pre-UI V13 runtime was preserved as an exact [composite checkpoint](output/gauntlet/round34-painted-shading-v13-composite-checkpoint/inventory.json), dependent on its retained V5 base. V13's resource delta was traced to the first GPU use of existing pilot resources; the native resource gate still failed and no resource fix was applied. V11 camera and V12 Foundry wash experiments remain rejected; V9 Sobel, V10 pilot palette and V13 painted softness remain retained. Their historical art scores do not validate the newer interface or combat camera.

## Historical 8 September overview, preserved below

# PodRacing handover — 8 September 2026, V8 experiment / V9 working candidate

**The Inkstorm overhaul remains incomplete and art is unaccepted.** The latest audited contact-color experiment is V8; it is locally admitted, but has demonstrated no quality improvement. No overhaul commit, push or deployment has occurred.

**The fresh paired contact-color review demonstrates no quality improvement:** all four pairs tie. Both V8 (A) and V5/V6-assets (B) score **materials 5/10, pilot readability 6/10, overall vehicle 5.5/10 — FAIL against 8/10**. The critic declared all nine attachments examined: eight actual images in four pairs plus generated concept12. [Review](assets/source/inkstorm/blockrunner-round34/contact-color-v1-blind-review/cli-critic-attempt1/review.md) · [Audited attachment/event proof](assets/source/inkstorm/blockrunner-round34/contact-color-v1-blind-review/audited-review-v1.json).

V8 completed typecheck/build and **671 tests / 120 executed files**; its 13 actual game captures and garage/narrow UI checks have empty error lists. The single V8 resource-owner diagnostic completed the original three cycles, seven section visits and 25 samples: native plateau PASS at 220 geometries / 114 textures / 50 programs, with healthy exact breakpoint/counter observation. **This is instrumented non-reproduction, not resource acceptance, a fix or historical V5 owner proof.** [V8 verify](output/gauntlet/round34-blockrunner-contact-color-v1/verify.log) · [Capture receipt](output/gauntlet/round34-blockrunner-contact-color-v1/captures/receipts.json) · [Diagnostic and cleanup](output/playwright/round34-blockrunner-contact-color-v8-resource-owner-attempt1/ANALYSIS-v1.md).

**The historical V5 partial checkpoint remains unchanged:** full Time Attack/Cup round 1 and Continue, seven-section cadence and Foundry context recovery PASS; uninstrumented resource plateau FAIL at **+1 geometry / +2 textures** in matching cycle 3 sections, with final garage delta zero. The cause remains unresolved; no leak is established. V5 timing and its earlier fresh overall 5.5/10 art FAIL belong to the preserved V5 files, not the V8 assets or later candidates. [Exact V5 report](docs/inkstorm-overhaul/FULL_RACE_PERFORMANCE_BLOCKRUNNER_V5_ROUND34.md).

**Current working candidate: retained V9 Sobel stencil.** Root applied and verified this separate change after the V8 diagnostic: **671 tests / 120 executed files**, typecheck/build PASS. Bundle `index-BQvDRTNC.js` is **1,620,951 bytes**, SHA256 `56d196f442cdfcc34edc732b536ec23a3d65f5c6c94d87ac075369a9c8093d97`; V8 vehicle GLBs remain. All 13 V9 captures have empty errors and the owned browser/server/port 5186 closed. The fresh paired edge review prefers V9 in salt and launch, ties grid and Foundry exit, and finds no convincing foreground-edge regression; the improvement is subtle. Its broader in-game/world score is **6/10, FAIL against 8/10**, a different scope from V8's vehicle 5.5 review. [V9 verify](output/gauntlet/round34-sobel-stencil-v9/verify.log) · [Matched capture comparison](output/gauntlet/round34-sobel-stencil-v9/matched-runtime-comparison.json) · [Fresh V9 review](assets/source/inkstorm/round34-distant-edge-diagnosis/blind-runtime-v9/cli-critic-attempt1/review.md) · [Audited V9 receipt](assets/source/inkstorm/round34-distant-edge-diagnosis/blind-runtime-v9/cli-critic-attempt1/audited-review-receipt.json). The 481-interval short capture is not a full-race or resource benchmark. No V9 resource/performance acceptance or transfer of V5/V8 results is claimed.

Work in **/Users/amir/Projects/PodRacing**, branch **codex/now-this-is-podracing**, baseline **0f0e8ab209cc5156efaf92b545630bd243b14478**; remote TheDudeCommits/PodRacing. `/Users/amir/Codex-ThreeJS` is unrelated. Preserve uncommitted work. The user approved recommendations 1–8, direction B / Inkstorm, the downloaded fleet with drivers, Blender MCP/imagegen, independent criticism and 40–60 fps.

**26 preserved source families; four registered families (Teemto, Sebulba, Polwo, Blockrunner), eight logical hero/rival variants, 12 public GLB paths, three project drivers added and 22 source families pending runtime preparation.** Blockrunner retains its original minifigure; it is not an added project driver. The 26 saved source GLBs total 748,730,812 bytes. The saved search retains 29 rows, 26 candidates and three exclusions; downloads pending and raw vendor archives are both zero.

V7 contact colour was actually authored and baked for body and pilot; V8 atlas materials, normalized export, seven-step private packaging/validation and two public copies are complete. The original V4B roughness masters were reused. Package comparison preserves geometry, normals, UV/index arrays, transforms, sampler clamps and non-colour material semantics; only the two colour image payloads change. Hero/rival remain **44,028 / 29,682 triangles**, five opaque draws each, including the same **4,128-triangle original pilot**. These are production/lineage checks, not visual acceptance. [Body bake](assets/source/inkstorm/blockrunner-round34/mcp-safe/bake-v7-body-color-receipt.json) · [Pilot bake](assets/source/inkstorm/blockrunner-round34/mcp-safe/bake-v7-pilot-color-receipt.json) · [Atlas](assets/source/inkstorm/blockrunner-round34/mcp-safe/contact-atlas-v8-receipt.json) · [Export](assets/source/inkstorm/blockrunner-round34/runtime-admission-preparation/export-atlas-v8-v1-receipt.json) · [Package comparison](assets/source/inkstorm/blockrunner-round34/runtime-admission-preparation/packaged-atlas-v8-v1/color-only-vs-v6-validation.json).

Preserve original source hashes, licence restrictions, the private NoDerivs boundary, the Ben membership exception and all eight historical HTTP 429 receipts. Restore **Cruise — Going Merry source 4b2cb678**, its ViewLayer, active **Sketchfab_model.001** and exact 15-object selection after Blender calls; never save the shared `.blend`. Preserve course9/drive4/rules2 and simulation/network/terrain authority. Ivory remains its own source-specific preparation, not another registered family.

Next work remains material/recess/pilot contrast, continuous world/route composition, unresolved resource behavior, the other 22 families and human/controller/audio/device/multiplayer acceptance. Close every owned browser immediately after use. V8 diagnostic Chrome/server/group/port 60854 and the image-capture ports 5186/60701 were closed; no later candidate inherits that cleanup or technical result.

[STATUS](docs/inkstorm-overhaul/STATUS.md) · [ROUND34](docs/inkstorm-overhaul/ROUND34.md) · [CURRENT_VISUALS](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Source history](docs/inkstorm-overhaul/BLOCKRUNNER_CLEANUP_ROUND34.md) · [Catalogue/licences](docs/inkstorm-overhaul/VEHICLE_CATALOG.md) · [Complete pre-V8 documents](docs/inkstorm-overhaul/evidence/round-34/pre-contact-color-v8-documentation/inventory.json).

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
