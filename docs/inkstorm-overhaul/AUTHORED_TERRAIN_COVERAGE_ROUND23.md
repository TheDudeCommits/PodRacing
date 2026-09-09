# Authored terrain coverage — round 23

The round-22 Teemto live capture exposed a real ground-coverage defect. At quality 7, the governor requested four terrain rings. `TerrainSystem.setLevelCount()` hid the two outer rings, reducing the camera-centred square's half-width from 3072 m to 768 m. The refinery remained visible beyond that edge, so the sky appeared below its foundations. This was a rendering-domain failure, independent of physical ground sampling or landmark placement.

## Change and cost

`TerrainSystem` now retains every configured ring while a `CourseGulfField` is installed. The normal flagship configuration has six rings. It keeps the most recent governor request separately and restores that requested count immediately when leaving the authored course. All existing geometries, shared displacement fields, bounds, materials and camera rebasing are retained. No additional geometry, texture fetch, per-frame allocation or physical terrain change is introduced by this coverage fix.

`levelCount` reports effective levels. `requestedLevelCount` and `coverageRadius` report the latest request and actual enabled half-width. GameApp's scalar review telemetry now includes `terrainRequestedLevels`, `terrainEffectiveLevels` and `terrainCoverageRadius`; it does not pretend the four-ring request was applied. All governor thresholds, sampling and other quality decisions remain unchanged.

The retained two far rings add **2 meshes and 13,056 triangles per consuming pass** when four rings would otherwise be requested. At a five-ring request only the existing final ring is additionally retained. The meshes remain frustum-cullable. There is no FPS claim for this tradeoff until the next uninterrupted race benchmark.

## Regression evidence

`tests/terrain/authoredTerrainCoverage.test.ts` verifies immediate course-entry restoration, preservation of the latest adaptive request across course exit/re-entry, configured ring capacity and non-finite request handling. It raycasts the actual triangle topology beneath a 3×3 footprint of each of the three real refinery terraces at all nine governor qualities and three camera positions with render-origin rebasing. It first proves that the old four-ring topology misses real footprint samples, then verifies that authored coverage retains every tested sample without replacing geometry. Shader displacement changes Y only, so this topology test addresses missing XZ ground, not visual shading or GPU execution.

Five focused suites passed 27 tests. The first typecheck identified that the new scalar telemetry fields also needed to be added to `ReviewSnapshot`; that declaration was updated. Combined `npm run verify` then passed **487 tests in 87 files**, TypeScript checking and the production build. Scoped whitespace checks passed.

The combined candidate also contains root's separate authored-grade geological material-mask correction and the newly published, inactive Sebulba files. Its bundle is **`dist/assets/index-Dp0pFqH7.js`**, SHA-256 **`9c28f1829f638090aae1082006729a6f48701e61a5fbb568e65105ae9ab31f74`**. No Sebulba art was activated or requested in this probe.

## Actual lowest-profile browser check

`scripts/terrain-coverage-acceptance.mjs` positions launch approach (progress .153), crest (.169) and descent (.218), then releases capture mode and applies fixed quality 0 or 8. Exiting capture mode matters: Viewport deliberately pins DPR to 2 while capture mode remains active. The actual sampled profiles were quality 0 / DPR 2 and quality 8 / DPR 1, with adaptation explicitly disabled for this bounded rendering check. These positioned frames are not race performance evidence.

Successful output: `output/playwright/terrain-coverage-round23-retry/receipt.json`, plus six PNGs and both artifact manifests. The harness SHA at the run was `27cbaacfccac5d6fc0f9708b171db73942ec96c3f6dbf689bae21e05c0733e3f`. Environment: Chrome 152.0.7977.77 headless, macOS arm64, Node 24.19.0, 1440×900 CSS viewport / device DPR 2. Screenshots retain device pixels while the rendered canvas uses the measured quality-dependent DPR.

Every capture reported six effective terrain rings / 3072 m coverage, including quality 8's four-ring request. The actual imported Teemto model was ready before capture. Dynamic shadow receipts remained 512 pixels, three body draws / 43,545 triangles, no omissions, no failure or skipped reason, and advancing frame counts. There were **zero browser or shader errors**. The three quality-8 images were visually inspected: ground and ridge terrain remain beneath the refinery in approach/crest views and continue across the descent. This accepts the specific missing-ground regression, not the overall art direction.

The first attempt remains unchanged at `output/playwright/terrain-coverage-round23/`. It passed the coverage assertions but failed the harness's DPR expectation because capture mode was still enabled. The retry corrected the harness sequence to leave capture mode before applying fixed quality; it did not change runtime code or relax the actual DPR/quality assertions. The raw failure and its prior harness hash remain in that receipt.

The browser closed in `finally` immediately after the probe. Both owned ports, 57251 (initial) and 57299 (retry), were separately checked with `lsof` and had no listener. Before/after manifests are identical for all 130 runtime source files, 26 public Inkstorm files and 33 dist files. Runtime/public/dist were then released to root's round-23 world capture, with no subsequent edits by this task.

## Startup timing finding — observed, not changed

GameApp begins measuring the live frame loop immediately in `start()`, before first-use shader/texture upload and preview work have necessarily settled. The work profiler measures synchronous simulation/render submission; the separate RAF profiler also sees work between callbacks. `RollingFrameProfiler` initializes its EMA to the first sample and uses a fixed `2 / 181` update coefficient with the default 180-sample window. Its approximately 90-sample decay time can retain a large first sample beyond the governor's 45-sample warmup. Recovery requires a longer sustained under-budget period than degradation.

The unchanged round-22 appearance receipt illustrates this: initial garage quality 2 had work EMA 156.92 ms / cadence EMA 376.83 ms at 11 cadence samples although the most recent interval was 16.6 ms. After reload/class browsing, the garage still showed 89.44 / 215.85 ms at 28 samples. At five seconds of driving it was quality 7 / DPR 1.125, with work EMA 3.36 ms / cadence EMA 17.59 ms at 514 samples. After real context restoration, the first recorded sample again showed work EMA 170.93 ms / cadence EMA 183.3 ms. Those values are retained in `output/playwright/vehicle-appearance-round22-retry/receipt.json`.

This supports investigating first-use loading/render preparation as a contributor to early quality reduction; it does not isolate GPU execution or prove every slow interval came from loading. This fix does not discard samples, reset measurements on asset completion, alter warmup/recovery thresholds or force a favorable quality. A separate improvement could move bounded preparation ahead of the interactive-ready boundary while preserving explicit loading measurements and all raw active-race cadence. The next full-race benchmark must report actual DPR progression and all slow intervals unchanged.
