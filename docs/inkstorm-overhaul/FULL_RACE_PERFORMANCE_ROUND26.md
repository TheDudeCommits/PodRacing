# Full-race performance — round26, Teemto and Sebulba

**PASS for all four complete-race cadence gates.** Default Teemto and UI-selected Sebulba each completed the ordinary Time Attack and two-lap Canyon Cup, then the actual Continue action. Every complete racing phase averaged approximately 60 Hz, with a 16.7 ms p95 and zero racing intervals above 25 ms. Both invocations passed on their first attempts with zero browser errors.

These are **adaptive-rendering** results: both Time Attacks reached DPR 1 before recovering to DPR 2 around 35 seconds; both Cups briefly used DPR 1.875. All raw rows remain saved, including two slow countdown intervals. This establishes local automated race cadence and the exercised result/Continue flow. It does not establish visual/art acceptance, fixed-DPR-2 performance throughout, GPU execution time, physical display presentation, human driving feel or performance on other devices.

## Frozen candidate and unchanged method

The measured build was `dist/assets/index-BlxCUBzh.js`, **1,548,009 bytes**, SHA-256 **`749fd90ba1b87928161c6732fd18c6a8376acb03fe64c3cb7dd8e9b6d660d49e`**. This is the round26 candidate released by the root after its combined world capture and validation. The root held runtime/public-art/dist edits and other browser, Blender and heavy CPU/GPU activity until both measurements and final manifests completed. Only documentation, source reading and image review ran alongside.

The existing `scripts/competitive-flow.ts` was executed unmodified, sequentially:

```sh
INKSTORM_EXPECTED_BUILD=749fd90ba1b87928161c6732fd18c6a8376acb03fe64c3cb7dd8e9b6d660d49e npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round26-teemto
INKSTORM_EXPECTED_BUILD=749fd90ba1b87928161c6732fd18c6a8376acb03fe64c3cb7dd8e9b6d660d49e npx --yes tsx scripts/competitive-flow.ts --performance --appearance=sebulba --output=output/playwright/full-race-performance-round26-sebulba
```

The harness itself does not read `INKSTORM_EXPECTED_BUILD`. The external evidence wrapper asserted that exact SHA against the sole `dist/assets/index-*.js` before each invocation, then compared the served JavaScript SHA in each browser receipt afterward. Both matched. No quality override was requested or applied.

The unchanged harness SHA is **`07ccba4b9f8ca567099f6d0e9b85ade62cadbda0d8e1123ab62bddc3490966f5`**; the unchanged `scripts/lib/race-cadence.ts` SHA is **`ade1535f700fd2cf3dc50031103e57b7e6ad437055adc138c36c21eefa50bc85`**. Both match round25. The ordinary steering/throttle/brake controller supplies virtual gamepad input through the shipped adapter and verifies its offline course signature against the running course. Sebulba is selected with the visible garage button, with actual ready race geometry and decoded preview awaited before Start. Each invocation starts with empty disposable competitive storage.

Both runs used Chrome **152.0.7977.77 headless**, WebGL 2, `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`, **1440×900 CSS pixels**, requested device DPR **2**, and hardware concurrency **10**. The measured intervals are native RAF intervals with controller and read-only snapshot overhead included. There is no capture mode, seek, simulation stepping, pose/progress mutation, staged start, warmup removal, interior exclusion or slow-frame filtering. Countdown is summarized separately, and finished rows remain in the raw arrays. Cup coverage includes ordinary post-player classification grace.

The unchanged gate requires mean cadence **≥40 Hz**, p95 **≤25 ms**, and complete racing coverage with **0.05 seconds** start/finish tolerance.

## Complete racing intervals

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Actual player finish, seconds | 63.34166666666371 | 126.13333333337978 | 63.316666666663714 | 126.13333333337978 |
| Racing intervals | 3,802 | 8,048 | 3,798 | 8,048 |
| Recorded interval duration, ms | 63,364.1 | 134,128 | 63,297.600000000006 | 134,128 |
| Mean cadence, Hz | 60.00243039828547 | 60.00238578074675 | 60.002274967771285 | 60.00238578074675 |
| p50 / p95 / p99, ms | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 |
| Maximum interval, ms | 16.8 | 16.8 | 16.8 | 16.8 |
| Intervals >25 / >33.3334 / >50 ms | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| First racing sample time, seconds | 0 | 0.016666666666666666 | 0.016666666666666666 | 0.016666666666666666 |
| Last racing sample time, seconds | 63.34166666666371 | 134.13333333337567 | 63.29999999999705 | 134.13333333337567 |
| Gate / issues | PASS / none | PASS / none | PASS / none | PASS / none |

Each Cup retains approximately eight seconds of classification grace after the actual player finish. Sebulba Time Attack's last sample precedes its finish by approximately 0.0166667 seconds, within the unchanged tolerance. Interval quantiles and maxima are rounded to 0.1 ms here; full floating-point values remain in the JSON.

## Raw rows, countdown and attempts

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| All raw rows | 4,004 | 8,270 | 4,007 | 8,273 |
| Countdown / racing / finished rows | 159 / 3,802 / 43 | 165 / 8,048 / 57 | 163 / 3,798 / 46 | 165 / 8,048 / 60 |
| Non-null countdown intervals | 158 | 164 | 162 | 164 |
| Countdown duration, ms | 2,666.6 | 2,733.2 | 2,716.5 | 2,733.2 |
| Countdown mean, Hz | 59.25148128703217 | 60.00292697204748 | 59.63556046383215 | 60.00292697204748 |
| Countdown p95 / max, ms | 16.8 / **50.0** | 16.8 / 16.8 | 16.8 / **33.3** | 16.7 / 16.8 |
| Countdown >25 / >33.3334 / >50 ms | 1 / 1 / 0 | 0 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 |

All **24,554 raw rows**, including **23,696 racing intervals**, are preserved. Each race's first raw row has no preceding interval. The Teemto 50 ms and Sebulba approximately 33.3 ms countdown intervals remain intact. No failed timing invocation was discarded or overwritten: there was exactly one invocation per appearance, both exit code 0. `run.log`, `invocation.json`, browser errors, raw files and screenshots are retained for each attempt.

## Adaptive resolution and renderer evidence

Both Time Attacks follow the same quality/DPR sequence. Countdown transitions share race time zero because the race clock has not started. Full RAF timestamps remain in each `analysis-summary.json` and raw transition array.

| Phase | Quality | DPR | Canvas pixels | Teemto race time, s | Sebulba race time, s |
| --- | ---: | ---: | --- | ---: | ---: |
| Countdown initial | 2 | 1.75 | 2520×1575 | 0 | 0 |
| Countdown | 3 | 1.625 | 2340×1462 | 0 | 0 |
| Countdown | 4 | 1.5 | 2160×1350 | 0 | 0 |
| Countdown | 5 | 1.375 | 1980×1237 | 0 | 0 |
| Racing | 6 | 1.25 | 1800×1125 | 0.7666666666666664 | 0.6000000000000003 |
| Racing | 7 | 1.125 | 1620×1012 | 1.6666666666666632 | 1.5166666666666637 |
| Racing minimum | 8 | 1 | 1440×900 | 2.583333333333327 | 2.4166666666666607 |
| Recovery | 7 | 1.125 | 1620×1012 | 7.31666666666682 | 7.18333333333348 |
| Recovery | 6 | 1.25 | 1800×1125 | 11.316666666666665 | 11.183333333333339 |
| Recovery | 5 | 1.375 | 1980×1237 | 15.316666666666437 | 15.183333333333112 |
| Recovery | 4 | 1.5 | 2160×1350 | 19.31666666666621 | 19.183333333332886 |
| Recovery | 3 | 1.625 | 2340×1462 | 23.316666666665984 | 23.18333333333266 |
| Recovery | 2 | 1.75 | 2520×1575 | 27.316666666665757 | 27.18333333333243 |
| Recovery | 1 | 1.875 | 2700×1687 | 31.31666666666553 | 31.183333333332204 |
| Racing maximum | 0 | 2 | 2880×1800 | 35.316666666665306 | 35.18333333333198 |

Both Cups start their recorded countdown at quality 0 / DPR 2 / 2880×1800, briefly drop to quality 1 / DPR 1.875 / 2700×1687 during countdown, then return to DPR 2 at **2.116666666666662 s** for Teemto and **2.149999999999995 s** for Sebulba. They remain at DPR 2 for the rest of the recorded phases.

Both Time Attacks contain 68 renderer samples and both Cups contain 138. All **412 samples** retain six effective terrain levels and 3072 m coverage. Time Attack requested levels visit 6, 5 and 4; Cup requests stay at 6. Authored coverage remains reported independently from the adaptive request.

| Whole-frame renderer maximum | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Calls | 93 | 264 | 90 | 261 |
| Submitted triangles | 3,912,874 | 3,933,418 | 3,924,325 | 3,944,869 |

These totals span render passes and do not represent unique visible geometry. The sequential ordinary UI flows have distinct loading/adaptation histories; they are not an isolated comparison of GPU cost between appearances.

## Vehicle and shadow diagnostics

Both Teemto result snapshots retain the ready **50,705-triangle** hero, three body/four pilot meshes, seven registered/visible MRT sources, full hero LOD and embedded pilot. Both Sebulba snapshots retain the ready **54,522-triangle** hero, two body/four pilot meshes, six registered/visible MRT sources, full hero LOD and embedded pilot. Sebulba's before-Start receipt also proves the ordinary garage action installed that actual art before the first race. Cup podracer rivals remain the 26,180-triangle Teemto rival; other rival classes remain procedural. This is not an all-Sebulba grid or every catalog vehicle.

Every sampled dynamic player shadow uses a **512² atlas**, with actual body sources: Teemto three casters/draws and **43,545 triangles**; Sebulba two casters/draws and **47,362 triangles**. Every sample reports zero omitted casters, null failure and null skipped fields. Every sampled static-shadow failure is also null.

| Shadow diagnostic | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Sampled frame counter | 27 → 3,996 | 4,066 → 12,283 | 34 → 4,002 | 4,078 → 12,310 |
| Result frame counter | 4,029 | 12,335 | 4,039 | 12,349 |
| Monotonic samples | yes | yes | yes | yes |
| Sampled CPU p50 / p95 / max, ms | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 |
| Result lifetime maximum CPU, ms | 6.1 | 6.1 | 6.3 | 6.3 |

Shadow diagnostics are sampled approximately once per second and on resolution changes. This failure-free sample set is not an every-frame failure census. CPU values measure submission work, and lifetime maxima include startup. These diagnostics do not establish GPU timing or visual shadow quality.

## Actual flow, records and cleanup

Each Time Attack produces a valid gold PB with ten sectors and a persisted ghost. Each Cup produces a valid gold PB with twenty sectors, second place and **12 banked points**. The actual Continue action opens `cup-foundry` in preparation with one completed Cup round retained. Primary results actions fit the initial viewport, and the finish-highlight clocks match the actual Time Attack finish (`1:03.341` Teemto, `1:03.316` Sebulba). This exercises Canyon and Continue, not all three Cup circuits, a new-series replay cycle or visible-ghost acceptance.

Included controller CPU overhead p50/p95/max is **0.5 / 0.7 / 0.8 ms** for each Time Attack and **0.4 / 0.5 / 0.7 ms** for each Cup. Trace rows are 48/111 for Teemto and 49/111 for Sebulba, with zero sampled wrong-way rows. Boost, drift, fire, mine, shield and reset input counts are zero. Each Cup exposes 194 redline-surge events across the field. Base vehicle collision counts remain unavailable (`null`), not zero. These ordinary runs do not establish a worst-case combat/effects stress budget.

Teemto's receipt completes at **2026-09-07 17:45:27.932 UTC** and Sebulba's at **17:49:28.018 UTC**. The unmodified harness awaits browser closure and signals its preview server in `finally` before writing each receipt. Subsequent socket/listener checks confirm preview ports **60874** and **60995** are closed. The unrelated **5211** port received read-only listener checks and no stop signal; it had no listener at those checks. Each directory preserves `cleanup.json`.

All **130 runtime source files, 28 public Inkstorm files, 35 dist files, four harness files and four configuration files** were identical before/after each measurement and across both invocations. Every public/dist Inkstorm asset pair matches. The measured freeze spans **2026-09-07 17:41:44.049975–17:49:33.729336 UTC**; the root received the source/GPU release after the second final manifest.

The evidence directories are `output/playwright/full-race-performance-round26-teemto/` and `output/playwright/full-race-performance-round26-sebulba/`. Each contains raw race JSON, receipts, result/Continue screenshots, log, invocation metadata, before/after artifact manifests, manifest comparison, cleanup and derived analysis. `output/playwright/full-race-performance-round26-freeze-comparison.json` verifies all four manifests against the first baseline. The reusable collection/analysis helper is preserved as `output/playwright/full-race-performance-round26-evidence.py`; it does not modify the runtime or race harness. Earlier vehicle-art limitations and the separate round26 visual review remain independent of these performance passes.
