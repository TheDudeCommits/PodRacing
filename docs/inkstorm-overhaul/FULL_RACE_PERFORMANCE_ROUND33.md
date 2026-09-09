# Round33 V5 — representative race cadence and recovery

**Technical checks PASS on the frozen V5 build; visual acceptance remains FAIL.** Two complete Polwo races, the actual Cup Continue action, seven staged Polwo section checks, targeted Foundry context recovery and the original resource-cycle checks passed sequentially on 8 September 2026. This is a representative V5 check, not a rerun of round32's three-appearance/six-race matrix. It covers the exact frozen files below; later working-tree edits or bundles require new evidence.

The measured bundle is **`index-CQCm3676.js`**, **1,607,258 bytes**, SHA256 **`1071c747951e84a8954c94bff228b6edcebcce0b81d36920fa8770925c88feb8`**. Root's preceding [full verification](../../output/gauntlet/round33-curved-joints-v5-verify.log) passed typecheck, build and **637 tests / 115 test files**. The browser-served bundle hashes in all four runs match this identity. V4 was superseded before timing; these results do not describe V4.

## Frozen files and audit

The [complete V5 snapshot](../../output/gauntlet/round33-v5-frozen-runtime/inventory.json) contains **463 files / 161,502,359 bytes**: 139 source, 40 public, 46 dist, 103 harness, six configuration and 129 physical test files. The 129-file inventory includes test support files; it is distinct from the 115 executed test files. Harness copies include the original scripts, output-only adapters, wrappers, helpers, diffs and preparation provenance. Bulk output and authoring history were excluded. Every copied file matched the measurement baseline and was independently rehashed after copying. The round32 snapshot was left intact.

Inventory SHA256: **`99a295e52a2f06f6979b49e1629c3bab7c22a7a2e4da16855bfe75688df0b98e`**; [inventory hash receipt](../../output/gauntlet/round33-v5-frozen-runtime/inventory-sha256.json). **All 24 saved manifests** match exactly across build/source/public/dist/harness/configuration/tests: six full-race boundaries, nine staged-section boundaries, five context boundaries and four resource boundaries. Checks use saved manifests and frozen copies, not assumptions about the later working tree.

The [independent aggregate and evidence SHA inventory](../../output/playwright/round33-final-v5-verification-summary.json) is **53,203 bytes**, SHA256 **`60de872dc12e52e0c40549d426a677988b741853373035566e2452cdb2a399a2`**. Its [reproducible read-only analysis](../../output/playwright/round33-v5-analysis.py) verifies every adjacent RAF timestamp difference and recomputes both native phase summaries exactly, without tolerances or rounded comparisons. Float totals use sequential `+=` to match JavaScript's left-to-right `reduce`; quantiles use `floor((N−1) × q)`. The independent analysis does not modify or filter original measurements.

## Complete races

Both races used actual garage Polwo selection, decoded/ready art, ordinary Start, stock inputs through the accepted virtual-gamepad controller, natural race completion and actual results UI. The controller and raw collector are unchanged. No capture seeking, progress/pose writes, review stepping, warmup removal or interior-frame exclusions occur in these races. Controller/snapshot overhead remains included.

| Polwo race | Player finish | Valid sectors / medal | Racing intervals | Mean RAF Hz | p95 / p99 ms | Max ms | >25 / >33.3334 / >50 ms |
| --- | ---: | --- | ---: | ---: | --- | ---: | --- |
| Flagship Time Attack | 63.775 s | 10 / gold | 3,792 | 59.453629 | 16.8 / 16.8 | 33.4 | 35 / 14 / 0 |
| Canyon Cup, first round | 130.350 s | 20 / gold | 8,180 | 59.120663 | 16.8 / 33.3 | 50.0 | 121 / 50 / 0 |

The unchanged cadence gate requires mean ≥40 Hz, p95 ≤25 ms and launch/finish coverage within the existing 0.05 s boundary rule. Both pass; invalid result reasons are null. Across both collectors there are **12,323 raw rows, 11,972 racing intervals, 156 intervals >25 ms and zero >50 ms**, with **210 renderer/resolution/shadow samples**. The exact 50 ms Cup interval is retained. Neither the gate nor these local results establish hitch-free rendering.

The Cup player finishes at **130.35000000004578 s**, while the collector's final racing-phase snapshot is **138.35833333337183 s** during result classification grace. Its 138,361.09999999998 ms interval total therefore includes post-player-finish sampling. **481 intervals end after the player's finish**, totaling **8,016.299999999988 ms**; the first can straddle the finish because classification uses the interval's ending snapshot. This is not 138.358 s of active player driving. Time Attack's final racing snapshot equals its 63.77499999999702 s finish, with no post-finish racing intervals. All these intervals remain in the unchanged native gate.

Countdown is separate: Time Attack has 162 intervals / 2,716.6 ms, mean 59.633365 Hz, p95 16.7 ms; Cup has 163 / 2,733.3 ms, mean 59.634874 Hz, p95 16.8 ms. Each includes one >25 ms interval and none >50 ms. The ordinary **Continue** click opens `cup-foundry`, championship round index 1, awaiting Start; this does not mean the second Cup race was completed.

The two races recorded zero boost, drift, fire, mine, shield and reset input samples. The Cup's observed event stream includes 180 `redline-surge` events; Time Attack's observed event map is empty. Base suspension/racer collision counts are **unavailable**, not zero. These automated laps do not establish human driving feel, visible ghost geometry or complete championship acceptance.

Evidence: [full-race receipt](../../output/playwright/full-race-performance-round33-polwo-final-v5/receipt.json), [Time Attack raw rows](../../output/playwright/full-race-performance-round33-polwo-final-v5/time-attack.json), [Cup raw rows](../../output/playwright/full-race-performance-round33-polwo-final-v5/cup-round-1.json), [Continue image](../../output/playwright/full-race-performance-round33-polwo-final-v5/cup-continue-foundry.png).

## Device, adaptive rendering and staged sections

Local Chrome **152.0.7977.77**, macOS arm64, ANGLE Metal **Apple M4**, ten reported hardware threads, 1440×900 viewport, requested DPR 2. The governor remains adaptive with **no fixed-quality override**. Full-race observed DPR ranges are **1–2** for Time Attack and **1.75–2** for Cup. Renderer extrema report at most **104 / 265 calls** and **4,725,951 / 4,768,375 triangles**, respectively. These are renderer counters, not unique asset triangles, GPU time or physical display timestamps. They do not satisfy or redefine a 600k geometry target. The mean cadence is a local native-RAF observation, not a universal or fixed-DPR2 FPS claim.

The separate section adapter selects and waits for actual Polwo. It preserves the existing sampler and p95 ≤25 ms gate, retaining raw intervals. Each section is independently staged, then runs live simulation and W input with the original 1.5 s warmup and approximately six measured seconds. Records are disabled by staging. All seven pass, each with **361 intervals**, for **2,527 total**, and zero >25 ms intervals.

| Staged start | Mean RAF Hz | p95 ms | Ending DPR |
| --- | ---: | ---: | ---: |
| Grid | 60.001662 | 16.7 | 1 |
| Salt run | 60.002659 | 16.7 | 1.125 |
| Canyon | 60.001662 | 16.8 | 1.25 |
| Fork | 60.001662 | 16.7 | 1.375 |
| Launch | 60.002659 | 16.7 | 1.5 |
| Foundry | 60.001662 | 16.7 | 1.625 |
| Finish | 60.001662 | 16.7 | 1.75 |

These DPR values are ending snapshots, not complete per-section DPR histories. The seven runs do not form a continuous lap or prove every measured frame remained in its starting section. [Section receipt and raw intervals](../../output/playwright/inkstorm-performance-round33-polwo-final-v5/section-performance.json).

## Foundry context recovery and resource cycles

The [targeted context receipt](../../output/playwright/inkstorm-context-recovery-round33-foundry-polwo-final-v5/receipt.json) passes all original three-second context-suspension, cadence-reset, static/racer-shadow and injected incomplete-player-framebuffer fallback/recovery assertions. Actual Polwo is selected; diagnostic Foundry seeking/stepping occurs before loss and cancels records. This test is recovery evidence, not ordinary-driving or performance evidence.

The served gantry payload matches **1,331,516 bytes / SHA256 `58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba`**. [CPU asset preflight](../../output/playwright/inkstorm-context-recovery-round33-foundry-polwo-final-v5/foundry-asset-preflight.json) finds 192 vertices satisfying the actual warm palette predicate among 33,604 primitive color records. Transparent viewport-only WebGL observation forwards original calls unchanged and verifies a successfully linked `INKSTORM_FOUNDRY_EMISSION` program plus positive draw submission before loss and after each restoration. Before loss there are three new warm-program draws after Foundry staging; restored epochs observe 3, 27 and 3 draws. This proves shader/geometry submission, not emitted pixel brightness or illumination of neighboring surfaces.

The restoration boundary resets cadence sample count to zero. The first restored sample is **233.286 ms**, inside the original <250 ms recovery gate; it is not a no-hitch claim. Scenery-shadow bakes progress 3→4→6 and racer-shadow frames 355→359→370 across the recorded pre-loss, first recovery and final recovery snapshots. The deliberate player framebuffer failure is injected once, remains bounded in fallback and recovers after explicit invalidation. Page and console error arrays are empty.

The [resource-cycle receipt](../../output/playwright/inkstorm-resource-cycles-round33-final-v5/receipt.json) uses the **original default Teemto player and Cup roster**, not a Polwo player adaptation. It visits all seven sections and returns to the garage three times. All **25 samples** satisfy the original assertions. Each cycle's peak and final garage counters are **213 geometries / 115 textures / 51 programs**; all eight stage-by-stage cycle2→cycle3 deltas are exactly zero. Staging changes the competition profile to chaos and cancels records. This is a stable renderer-counter plateau, not GPU-memory bytes, JS heap, a complete leak proof or race cadence.

## Provenance and cleanup

All four browser attempts pass on the first executed attempt. They use versioned output-only adapters: relocated imports, exact expected-build checks, dynamic owned ports, filesystem guards outside collectors, awaited browser/server cleanup, Polwo section/Foundry selection and the explicit context observations described above. The accepted full-race controller, raw collector, race gates and native resource/context assertions remain unchanged. [Adapter diffs, original hashes and unchanged-block proof](../../output/playwright/round33-performance-adapter-provenance.json), [static preparation history](../../output/playwright/round33-performance-static-validation.json) and [wrapper instructions](../../output/playwright/ROUND33_PERFORMANCE_WRAPPERS.md) are retained. Static parser/setup failures were repaired before browser execution and remain recorded; no failed browser run is omitted.

| Run | Owned port | Browser/server/group cleanup | Final cleanup UTC |
| --- | ---: | --- | --- |
| Full races | 51018 | PASS, no residual PIDs/group/listener | 10:33:49.599965 |
| Seven sections | 51129 | PASS, no residual PIDs/group/listener | 10:35:09.914397 |
| Foundry context | 51192 | PASS, no residual PIDs/group/listener | 10:36:03.848091 |
| Resource cycles | 51249 | PASS, no residual PIDs/group/listener | 10:37:27.085498 |

Each folder retains `adapter-cleanup.json`, `wrapper-process-cleanup.json`, its invocation, native receipt, before/after/boundary manifests and run log. All browser closes and owned preview exits were awaited; no fallback kill was needed. Unrelated port5211 was neither adopted nor signalled. No build, runtime or public mutation occurred during these checks. The frozen copy was completed before later source/public work was released.

## Visual boundary

The independent [fresh V5 critic](BLIND_FOUNDRY_V5_ROUND33.md) scores **construction 6.5/10 FAIL** and **original world scene 5.5/10 FAIL**, separately against the strict 8 gate. The [earlier V4 critic](BLIND_FOUNDRY_COMBINED_V4_ROUND33.md) scored 7.5/6.5 and also failed both; that is a different critic and superseded geometry, not an averaged trend. These technical passes do not override either review, replace the seven original world targets or complete recommendations1–8/fleet acceptance. The [round32 six-race checkpoint](FULL_RACE_PERFORMANCE_ROUND32.md) remains exact historical evidence for its own frozen bundle. No commit, push or deployment follows from this report.
