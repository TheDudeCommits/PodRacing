# Full-race performance — round28, Teemto and Sebulba

**All four required complete-race cadence gates and both final appearance flows PASS, with two original Sebulba result-flow failures retained.** Teemto passed on its first invocation. Sebulba completed Time Attack twice but stopped before Cup because the original harness misformatted an integer-millisecond boundary; both invocations remain FAIL. A narrowly corrected expected-clock oracle then passed Sebulba Time Attack, Canyon Cup and the actual Continue action. This is not an all-first-attempt or single-harness-version pass.

The four required races average **59.797–59.838 Hz**, with **16.7–16.8 ms p95**, **33.4 ms maximum**, **72 racing intervals above 25 ms**, and none above 50 ms. These are **adaptive-rendering** results: both required Time Attacks reach DPR 1, and both Cups briefly use DPR 1.875. Complete unfiltered records for all six races, including the two failed-flow Time Attacks and five slow countdown intervals, remain saved.

## Frozen runtime, device and method

All attempts served `dist/assets/index-CED-RrRq.js`, **1,567,417 bytes**, SHA-256 **`ca752f0a0f3da8e7585dd6c999d7ed5615d56c766c04e4dd767ef07256f1175d`**. Each external wrapper separately asserted the sole local bundle immediately before and after invocation and checked the browser-served bundle receipt. `competitive-flow.ts` does not itself consume `INKSTORM_EXPECTED_BUILD`. No build, runtime, art, course, control, or quality changes occurred during measurement. The root reserved the GPU; other work was limited to documentation and read-only inspection, with the small oracle correction and focused regression checks between browser sessions.

All four invocations used Chrome **152.0.7977.77 headless**, WebGL 2, `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`, **1440×900 CSS pixels**, requested device DPR **2**, hardware concurrency **10**, and no requested quality override. Each starts with empty disposable competitive storage. Teemto follows the default selection; each Sebulba invocation clicks the visible garage appearance button and awaits actual ready race geometry and its decoded preview before Start.

The ordinary steering/throttle/brake controller supplies virtual gamepad input through the shipped adapter and verifies its offline course signature against the running course. Native RAF intervals include controller and read-only snapshot overhead. There is no capture mode, seek, simulation stepping, staged start, pose/progress mutation, warmup removal, interior exclusion, or slow-frame filtering. Countdown is summarized separately; finished rows remain in the raw arrays. Cup coverage includes the ordinary approximately eight-second classification grace after the actual player finish.

The unchanged cadence gate requires **mean ≥40 Hz**, **p95 ≤25 ms**, complete racing duration, and **0.05-second** start/finish boundary tolerance. This establishes local automated native cadence and the exercised results/Continue flow. It does not establish fixed-DPR-2 performance throughout, GPU execution time, physical display presentation, human driving feel, worst-case combat/effects load, other-device performance, or visual/art acceptance.

## Preserved failures and narrow oracle correction

Both original Sebulba attempts stored `63.32499999999705` seconds in the authoritative mastery result and persisted PB, matching the result snapshot race time. Their visible highlight reads `1:03.325 // You`. The original harness at `scripts/competitive-flow.ts:224` floors `seconds * 1000` without a floating-point boundary correction and expects `1:03.324 // You`; its exact assertion correctly remains recorded as failed. The app already applies `Math.floor(seconds * 1000 + 1e-6)` at `src/ui/model.ts:484`. The stored time lies approximately 2.95 picoseconds below 63.325 seconds, producing a one-millisecond text-oracle discrepancy.

The finish event uses `entry.progress.finishTime` as `totalTime` (`src/game/race/RaceSimulation.ts:785`), the highlight recorder uses that event value for `raceTime` (`src/game/race/highlights.ts:198`), and `GameApp.ts:2096` passes it to `RaceHud.ts:1819` for the existing formatter. The evidence supports a harness numeric-oracle defect; it does not show a separate replay-clock offset or justify changing the application time. Each failed folder contains `clock-mismatch-diagnostic.json`, the failure screenshot/text, raw race JSON, log, receipt, invocation metadata, cleanup, and matching before/after manifests. Neither failed invocation reached Cup.

| Failed Sebulba invocation | Actual TA finish, s | Mean Hz | p95 / max, ms | Racing >25 / >33.3334 / >50 ms | Countdown max / >25 count | Raw rows | Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| attempt 1 (`sebulba`) | 63.32499999999705 | 59.7972231476993 | 16.8 / 33.4 | 13 / 5 / 0 | 33.4 / 1 | 3993 | TA cadence PASS; flow FAIL before Cup |
| attempt 2 (`sebulba-attempt2`) | 63.32499999999705 | 59.79724503294531 | 16.7 / 33.4 | 13 / 6 / 0 | 33.3 / 1 | 3992 | TA cadence PASS; flow FAIL before Cup |

After these two failures, the root preserved the exact original harness and evidence helper in `assets/source/inkstorm/clock-oracle-round28/`, then changed only the clock-helper import and expected-string assignment in the race harness. The new independent `scripts/lib/result-clock.ts` normalizes to nanoseconds before truncating displayed milliseconds; it does not import the app formatter or accept a millisecond-wide tolerance. The comparison remains exact string equality, so a meaningful one-millisecond error still fails. The correction receipt records eight focused tests across two files, including four new oracle regressions for the observed boundary, genuine fractional milliseconds, a one-millisecond mismatch and hour formatting, plus the four existing cadence cases. The exact changes are retained in `correction.json` and two `.diff` files.

| Frozen file | Original version / corrected version SHA-256 |
| --- | --- |
| `scripts/competitive-flow.ts` | `07ccba4b9f8ca567099f6d0e9b85ade62cadbda0d8e1123ab62bddc3490966f5` → `667941482387f3634aeb0abbb2d7db0d355eb07ce267332d9d96ad842145ac37` |
| `scripts/lib/race-cadence.ts` | `ade1535f700fd2cf3dc50031103e57b7e6ad437055adc138c36c21eefa50bc85` (unchanged across every attempt) |
| `scripts/inkstorm-race-evidence.py` | `ba89e714dfdd8365d81cb7be4705309789250f681aab7771f9c421765c7cbafc` → `208965b3e27d99bb9feb10cbd82774d32135521fa662d9c6bf13308c5e51afa0` (adds the oracle to the manifest only) |
| `scripts/lib/result-clock.ts` | `1ceeb07ef97446b3304eeaac8802f4392f36204d3401316ec32549293027bbc8` (new expected-clock helper) |

The corrected attempt was separately named `sebulba-attempt3`. Its actual Time Attack finish was `63.34166666666371`, so it did **not** re-hit the `.325` boundary live. That exact earlier value is covered by the retained diagnostics and regression. The unchanged Teemto run was retained because the correction has no effect on the controller, native cadence collection, race gate, runtime or assets. Original failed outcomes were not rewritten as passes.

## Four required complete racing intervals

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack (attempt 3) | Sebulba Cup (attempt 3) |
| --- | --- | --- | --- | --- |
| Actual player finish, seconds | 63.316666666663714 | 126.16666666671314 | 63.34166666666371 | 126.35000000004662 |
| Racing intervals | 3788 | 8030 | 3788 | 8037 |
| Recorded interval duration, ms | 63314.200000000004 | 134194.69999999998 | 63347.5 | 134378 |
| Mean cadence, Hz | 59.82860085099393 | 59.83842879040678 | 59.79715063735743 | 59.80889728973493 |
| p50 / p95 / p99, ms | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 |
| Maximum interval, ms | 33.4 | 33.4 | 33.4 | 33.4 |
| Intervals >25 / >33.3334 / >50 ms | 11 / 3 / 0 | 22 / 10 / 0 | 13 / 7 / 0 | 26 / 10 / 0 |
| First racing sample time, seconds | 0.025 | 0 | 0 | 0.008333333333333333 |
| Last racing sample time, seconds | 63.316666666663714 | 134.1750000000423 | 63.33333333333038 | 134.35833333337547 |
| Gate / issues | PASS / [] | PASS / [] | PASS / [] | PASS / [] |

Sebulba’s final Time Attack sample precedes its actual finish by approximately 0.0083333 seconds, within the unchanged tolerance. Each Cup retains approximately eight seconds of post-player classification grace. Quantiles/maxima are rounded to 0.1 ms in these tables; exact floating-point values remain in JSON. Independent recomputation from every raw phase interval matches all saved summaries for all six races (`raw-summary-validation.json` in each folder).

## Raw rows and countdown

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack (attempt 3) | Sebulba Cup (attempt 3) |
| --- | --- | --- | --- | --- |
| All raw rows | 3994 | 8244 | 3991 | 8241 |
| Countdown / racing / finished rows | 161 / 3788 / 45 | 164 / 8030 / 50 | 161 / 3788 / 42 | 164 / 8037 / 40 |
| Non-null countdown intervals | 160 | 163 | 160 | 163 |
| Countdown duration, ms | 2683.1000000000004 | 2733.199999999997 | 2700 | 2716.5999999999913 |
| Countdown mean, Hz | 59.632514628601236 | 59.637055466120366 | 59.25925925925926 | 60.00147242877145 |
| Countdown p95 / maximum, ms | 16.7 / 33.3 | 16.7 / 33.3 | 16.7 / 50.0 | 16.7 / 16.8 |
| Countdown >25 / >33.3334 / >50 ms | 1 / 0 / 0 | 1 / 0 / 0 | 1 / 1 / 0 | 0 / 0 / 0 |

The four required race records retain **24,470 raw rows** and **23,643 racing intervals**. Including both failed-flow Time Attacks, the archive retains **32,455 raw rows** and **31,218 racing intervals**. Every first row has no preceding interval. All **98 racing intervals above 25 ms across all six races**, five countdown intervals above 25 ms, and the corrected Sebulba Time Attack’s exact 50 ms countdown interval remain intact; no racing interval exceeds 50 ms. There were four invocations: Teemto exit 0, original Sebulba exit 1, unchanged Sebulba retry exit 1, and corrected Sebulba attempt 3 exit 0. Every browser error array is empty; the two harness assertions are still explicit failures.

## Adaptive resolution, terrain and render passes

Both required Time Attacks begin the recorded countdown at quality 2 / DPR 1.75 and pass through quality 3 / DPR 1.625, quality 4 / DPR 1.5 and quality 5 / DPR 1.375 before the racing transitions below. Their complete transitions, including countdown RAF timestamps, remain in the raw JSON. No fixed-quality override was requested or applied.

| Phase | Quality | DPR | Drawing buffer | Teemto race time, s | Sebulba attempt 3 race time, s |
| --- | --- | --- | --- | --- | --- |
| racing | 6 | 1.25 | 1800×1125 | 0.7166666666666666 | 0.5666666666666671 |
| racing | 7 | 1.125 | 1620×1012 | 1.6166666666666634 | 1.4833333333333305 |
| racing | 8 | 1 | 1440×900 | 2.533333333333327 | 2.3833333333333275 |
| racing | 7 | 1.125 | 1620×1012 | 7.283333333333485 | 7.150000000000145 |
| racing | 6 | 1.25 | 1800×1125 | 11.283333333333333 | 11.150000000000007 |
| racing | 5 | 1.375 | 1980×1237 | 15.283333333333106 | 15.14999999999978 |
| racing | 4 | 1.5 | 2160×1350 | 19.28333333333288 | 19.149999999999554 |
| racing | 3 | 1.625 | 2340×1462 | 23.283333333332653 | 23.149999999999327 |
| racing | 2 | 1.75 | 2520×1575 | 27.283333333332425 | 27.1499999999991 |
| racing | 1 | 1.875 | 2700×1687 | 31.283333333332198 | 31.149999999998872 |
| racing | 0 | 2 | 2880×1800 | 35.283333333331974 | 35.14999999999865 |

Both Cups start countdown at quality 0 / DPR 2 / 2880×1800, briefly drop to quality 1 / DPR 1.875 / 2700×1687 during countdown, and return to DPR 2 at **2.2499999999999947 s** (Teemto) and **2.2666666666666613 s** (Sebulba). They remain at DPR 2 for the rest of the recorded phases. Both original failed Sebulba Time Attacks also reach DPR 1 and recover through the same quality steps; their complete transition histories are retained in their own analysis/raw files.

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack (attempt 3) | Sebulba Cup (attempt 3) |
| --- | --- | --- | --- | --- |
| Min / max DPR | 1 / 2 | 1.875 / 2 | 1 / 2 | 1.875 / 2 |
| Renderer samples | 68 | 138 | 68 | 138 |
| Whole-frame maximum calls | 99 | 274 | 92 | 267 |
| Whole-frame maximum submitted triangles | 3942466 | 3963010 | 3936679 | 3957223 |

All **412 samples** from the four required races, and **548 samples including both failed-flow races**, retain six effective terrain levels and **3072 m** coverage. Time Attack requested levels visit 6, 5 and 4; Cups remain at 6. Authored coverage is reported separately from the adaptive request. Whole-frame submitted geometry spans multiple passes and is not unique visible geometry. The sequential UI loading/adaptation histories do not isolate GPU cost between appearances.

## Hero art, dynamic shadows and controller scope

Both Teemto result snapshots retain the ready **59,324-triangle** full-LOD hero with three body/six pilot meshes, nine registered and visible MRT sources, and embedded pilot. Both final Sebulba snapshots retain the ready **54,522-triangle** full-LOD hero with two body/four pilot meshes, six registered and visible MRT sources, and embedded pilot. All Sebulba before-Start receipts also record that its actual requested race art was ready. Cup podracer rivals remain the **26,180-triangle** Teemto rival; other rival classes remain procedural. This does not establish every catalog vehicle or an all-Sebulba grid.

Every sampled dynamic player shadow uses a **512² atlas**. Teemto submits three body casters/draws and **43,545 triangles**; Sebulba submits two and **47,362 triangles**. All 548 samples report zero omitted casters, null dynamic failure and null skipped fields. All sampled static-shadow failures are null. Shadow samples occur approximately once per second and on quality changes; this is not an every-frame failure census or proof of visual shadow quality.

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack (attempt 3) | Sebulba Cup (attempt 3) |
| --- | --- | --- | --- | --- |
| Sampled shadow frame counter | 30 → 3993 | 4061 → 12272 | 37 → 3992 | 4066 → 12272 |
| Result shadow frame counter | 4022 | 12304 | 4027 | 12305 |
| Monotonic sampled counter | True | True | True | True |
| Shadow CPU p50 / p95 / max, ms | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 |
| Result lifetime maximum shadow CPU, ms | 6.1 | 6.1 | 6.3 | 6.3 |
| Included controller CPU p50 / p95 / max, ms | 0.5 / 0.7 / 1.1 | 0.4 / 0.5 / 0.6 | 0.5 / 0.7 / 0.8 | 0.4 / 0.5 / 1.1 |
| Controller trace rows / wrong-way samples | 48 / 0 | 111 / 0 | 49 / 0 | 111 / 0 |

These CPU diagnostics measure submission/controller work, not GPU execution, and lifetime shadow maxima include startup. Boost, drift, fire, mine, shield and reset input counts are zero across all six races. The Teemto Cup exposes 194 redline-surge events across the field; the Sebulba Cup exposes 188. Base suspension/racer collision counts remain unavailable (`null`), not zero. These ordinary races do not establish worst-case combat or effects stress performance.

## Actual results, cleanup and artifact integrity

Both required Time Attacks produce valid gold PBs with ten sectors and persisted ghosts. Both Cups produce valid gold PBs with twenty sectors, second place and **12 banked points**. The actual Continue action opens `cup-foundry` in preparation with one completed Cup round retained. The initial results action bounds fit the viewport, and final highlight clocks are `1:03.316 // You` for Teemto and `1:03.341 // You` for Sebulba. This covers Canyon and Continue, not racing all three Cup circuits, new-series replay, visible ghost acceptance, or human driving feel.

| Invocation / directory suffix | Harness | Exit / receipt | Receipt completion, UTC | Owned preview port / closed |
| --- | --- | --- | --- | --- |
| teemto | original | 0 / PASS | 2026-09-07T19:37:32.048Z | 64435 / yes |
| sebulba | original | 1 / FAIL | 2026-09-07T19:38:44.355Z | 64557 / yes |
| sebulba-attempt2 | original | 1 / FAIL | 2026-09-07T19:40:46.972Z | 64625 / yes |
| sebulba-attempt3 | corrected oracle | 0 / PASS | 2026-09-07T19:48:02.726Z | 64768 / yes |

The harness awaits `browser.close()` and signals its owned preview server in `finally` before writing the receipt. Each subsequent socket and listener check confirms its preview port closed; external wrapper cleanup also checks its own process group. Prior root lifecycle port **64233** was confirmed closed before measurement. Unrelated **5211** received read-only checks and no stop signal; no listener was present. No owned browser or server remains open.

The runtime freeze spans **2026-09-07 19:34:01.034125–19:48:02.918628 UTC**. All eight before/after manifests match the initial **131 runtime source files, 30 public Inkstorm files, 37 dist files, four configuration files, and the exact served bundle**. Every one of the **30 public/dist Inkstorm asset pairs** matches in each invocation. Each invocation has a fully unchanged harness before/after: five files for the first three invocations and six files after adding the independent clock oracle. Across versions, only the documented harness/helper changes differ; the cadence helper remains identical. The root received the GPU/runtime release only after final cleanup, manifests and cross-invocation comparison.

The original six-manifest comparison remains `output/playwright/full-race-performance-round28-freeze-comparison.json`. The final eight-manifest comparison is `output/playwright/full-race-performance-round28-final-freeze-comparison.json`; it explicitly distinguishes unchanged runtime groups from the two harness versions and confirms raw-summary recomputation. Evidence directories are `output/playwright/full-race-performance-round28-teemto/`, `…-sebulba/`, `…-sebulba-attempt2/` and `…-sebulba-attempt3/`. Each retains raw JSON, result screenshots, log, invocation metadata, browser receipt, before/after manifests, comparison, cleanup and analysis. Both failed attempts additionally retain their failure screenshot and clock diagnosis. The three external runner scripts remain adjacent to these directories. `full-race-performance-round28-evidence-inventory.json` hashes the preserved evidence files; it is an evidence index rather than a runtime mutation. Round28 visual acceptance remains independent of these performance results.

