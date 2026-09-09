# Full-race performance — round25, Teemto and Sebulba

**PASS for all four complete-race cadence gates.** Default Teemto and UI-selected Sebulba each completed the ordinary Time Attack and two-lap Canyon Cup, followed by the actual Continue action. Every racing phase averaged approximately 60 Hz, had a 16.7 ms p95 and retained zero racing intervals above 25 ms. This was adaptive rendering: both Time Attacks dropped to DPR 1 and recovered to DPR 2 around 35 seconds; both Cups briefly used DPR 1.875 before returning to 2.

All raw intervals, including three slow countdown intervals across the two initial starts, remain in the saved JSON. These local automated measurements do not establish visual/art acceptance, human driving feel, universal device performance or fixed-DPR-2 performance throughout every race.

## Candidate, method and freeze

The frozen build was `dist/assets/index-DYsxLpxt.js`, **1,544,377 bytes**, SHA-256 **`14c129a2de533fa5c3e4adbdacd1eb1e6cda21112df3fa7317b2e613ae1ac4b5`**. The combined verification passed 512 tests in 90 files, TypeScript, build and diff check. The candidate includes the corrected paused-garage appearance status, authored terrain topology of 390,656 triangles in six draws, and two canyon shoulders. The physical terrain field and public art were unchanged by the denser terrain presentation. Teemto and Sebulba use the existing v1 public exports; the separate pilot material study remains unpublished.

The root closed the world25 capture and held other browser, Blender and CPU/GPU-heavy work during these measurements. Only image reading and documentation ran alongside. There were no runtime, public-art, dist, harness or cadence-threshold edits during the runs.

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round25-teemto
npx --yes tsx scripts/competitive-flow.ts --performance --appearance=sebulba --output=output/playwright/full-race-performance-round25-sebulba
```

The harness SHA was **`07ccba4b9f8ca567099f6d0e9b85ade62cadbda0d8e1123ab62bddc3490966f5`**. Before timing, it gained only the validated optional Sebulba selector and corresponding receipt. That option clicks the visible garage button and waits for actual race geometry and decoded preview before Start. The default path does not change appearance. The existing steering/throttle/brake driver, frame collection and gates were unchanged. `scripts/lib/race-cadence.ts` retained SHA **`ade1535f700fd2cf3dc50031103e57b7e6ad437055adc138c36c21eefa50bc85`**.

Both runs used Chrome 152.0.7977.77 headless, WebGL 2, `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`, 1440×900 CSS pixels, requested device DPR 2 and hardware concurrency 10. Each starts with disposable empty competitive storage. The driver verifies its offline course signature against the running course and supplies ordinary inputs through the shipped GamepadInput adapter. It does not seek, step simulation, mutate pose/progress, write mastery data directly, invoke capture mode or override adaptive quality.

The recorder retains native RAF intervals across the complete racing phase, including launch and Cup classification grace after the player finish. Countdown is summarized separately and finished rows remain in raw arrays. No racing warmup removal, interior exclusions or slow-frame filtering occur. Snapshot and controller overhead is included. The unchanged gate is mean cadence **≥40 Hz**, p95 **≤25 ms**, with start/finish coverage tolerance **0.05 seconds**. RAF is not GPU execution time or physical display presentation timing.

## Complete racing intervals

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Actual player finish, seconds | 63.34166666666371 | 126.13333333337978 | 63.34166666666371 | 126.13333333337978 |
| Racing intervals | 3,802 | 8,048 | 3,800 | 8,048 |
| Recorded interval duration, ms | 63,364.1 | 134,128 | 63,330.8 | 134,128 |
| Mean cadence, Hz | 60.00243039828547 | 60.00238578074675 | 60.002400096003846 | 60.00238578074675 |
| p50 / p95 / p99, ms | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 |
| Maximum interval, ms | 16.8 | 16.8 | 16.8 | 16.8 |
| Intervals >25 / >33.3334 / >50 ms | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| First racing sample time, seconds | 0 | 0.016666666666666666 | 0.016666666666666666 | 0.016666666666666666 |
| Last racing sample time, seconds | 63.34166666666371 | 134.13333333337567 | 63.33333333333038 | 134.13333333337567 |
| Gate / issues | PASS / none | PASS / none | PASS / none | PASS / none |

Each Cup includes approximately eight seconds of ordinary post-player classification grace. Sebulba Time Attack's final sample is 0.00833333333333 seconds before its actual finish, within the unchanged tolerance. Interval display values are rounded to 0.1 ms here; full floating-point timestamps are preserved.

## All raw rows and countdowns

| Metric | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| All raw rows | 4,005 | 8,269 | 4,006 | 8,269 |
| Countdown / racing / finished rows | 159 / 3,802 / 44 | 165 / 8,048 / 56 | 162 / 3,800 / 44 | 165 / 8,048 / 56 |
| Non-null countdown intervals | 158 | 164 | 161 | 164 |
| Countdown duration, ms | 2,666.6 | 2,733.2 | 2,716.5 | 2,733.2 |
| Countdown mean, Hz | 59.25148128703218 | 60.00292697204716 | 59.267439720228225 | 60.00292697204748 |
| Countdown p95 / max, ms | 16.8 / **50.0** | 16.7 / 16.8 | 16.8 / **33.3** | 16.7 / 16.8 |
| Countdown >25 / >33.3334 / >50 ms | 1 / 1 / 0 | 0 / 0 / 0 | 2 / 0 / 0 | 0 / 0 / 0 |

Each run's first raw row has no preceding interval. The Teemto 50 ms countdown interval and two Sebulba approximately 33.3 ms intervals were retained, not converted into filtered passes. All **24,549 raw rows** and **23,698 racing intervals** remain available across the four race files. Both benchmark invocations passed on their first attempts; no failed timing attempt was discarded or overwritten.

## Exact adaptive resolution progression

The two Time Attacks visited the same quality/DPR sequence. The race times below preserve the recorded transition values; multiple countdown transitions have race time zero because countdown does not advance the race clock. Full RAF timestamps are in the raw transitions and derived summaries.

| Phase | Quality | DPR | Canvas pixels | Teemto race time, s | Sebulba race time, s |
| --- | ---: | ---: | --- | ---: | ---: |
| Countdown initial | 2 | 1.75 | 2520×1575 | 0 | 0 |
| Countdown | 3 | 1.625 | 2340×1462 | 0 | 0 |
| Countdown | 4 | 1.5 | 2160×1350 | 0 | 0 |
| Countdown | 5 | 1.375 | 1980×1237 | 0 | 0 |
| Racing | 6 | 1.25 | 1800×1125 | 0.7666666666666664 | 0.6166666666666669 |
| Racing | 7 | 1.125 | 1620×1012 | 1.6666666666666632 | 1.5166666666666637 |
| Racing minimum | 8 | 1 | 1440×900 | 2.583333333333327 | 2.4166666666666607 |
| Recovery | 7 | 1.125 | 1620×1012 | 7.333333333333488 | 7.18333333333348 |
| Recovery | 6 | 1.25 | 1800×1125 | 11.33333333333333 | 11.183333333333339 |
| Recovery | 5 | 1.375 | 1980×1237 | 15.333333333333103 | 15.183333333333112 |
| Recovery | 4 | 1.5 | 2160×1350 | 19.333333333332877 | 19.183333333332886 |
| Recovery | 3 | 1.625 | 2340×1462 | 23.33333333333265 | 23.18333333333266 |
| Recovery | 2 | 1.75 | 2520×1575 | 27.333333333332423 | 27.18333333333243 |
| Recovery | 1 | 1.875 | 2700×1687 | 31.333333333332195 | 31.183333333332204 |
| Racing maximum | 0 | 2 | 2880×1800 | 35.33333333333197 | 35.18333333333198 |

Both Cups began their recorded countdown at quality 0 / DPR 2 / 2880×1800, briefly dropped to quality 1 / DPR 1.875 / 2700×1687 during countdown, and returned to quality 0 / DPR 2 at **2.099999999999995 s** for Teemto and **2.116666666666662 s** for Sebulba. They remained at DPR 2 for the rest of the recorded phases.

Both Time Attacks record 68 renderer samples and both Cups 138. All **412 samples** retain six effective terrain levels and 3072 m coverage; Time Attack requests span 6, 5 and 4 while Cup requests stay at 6. The adaptive decision remains reported truthfully even when authored coverage retains six rings.

| Whole-frame renderer maximum | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Calls | 93 | 264 | 90 | 261 |
| Submitted triangles | 3,721,986 | 3,742,530 | 3,733,437 | 3,753,981 |

These are frame totals across render passes, not unique visible geometry. The two appearance runs are sequential ordinary UI flows with their own asset-loading/adaptation histories; they are not a controlled isolated GPU-cost comparison.

## Actual geometry and dynamic shadow

Both Teemto result snapshots retain the actual ready 50,705-triangle hero, three body/four pilot meshes, seven registered/visible MRT sources, full hero LOD and embedded pilot. Both Sebulba results retain the actual ready 54,522-triangle hero, two body/four pilot meshes, six registered/visible MRT sources, full hero LOD and embedded pilot. The Sebulba pre-Start receipt also proves the ordinary garage selection installed that art before the first race. Cup podracer rivals continue to use the 26,180-triangle Teemto rival; other rival classes remain procedural. This does not claim a live all-Sebulba grid or every catalog vehicle.

Every sampled player shadow uses the 512² atlas and actual body sources: Teemto three casters/draws and 43,545 triangles, Sebulba two casters/draws and 47,362 triangles. All samples report zero omitted casters and null failure/skipped fields; all sampled static-atlas failures are also null.

| Shadow diagnostic | Teemto Time Attack | Teemto Cup | Sebulba Time Attack | Sebulba Cup |
| --- | ---: | ---: | ---: | ---: |
| Sampled frame counter | 28 → 4,002 | 4,070 → 12,290 | 35 → 4,001 | 4,079 → 12,300 |
| Result frame counter | 4,031 | 12,338 | 4,040 | 12,346 |
| Monotonic samples | yes | yes | yes | yes |
| CPU p50 / p95 / max, ms | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 | 0.1 / 0.2 / 0.2 |
| Result lifetime maximum CPU, ms | 6.4 | 6.4 | 6.5 | 6.5 |

Shadow diagnostics are sampled approximately once per second and on resolution changes, not every RAF. Their failure-free record is not an every-frame failure census. CPU values measure submission work; the lifetime maxima include startup and are distinct from sampled race values. No GPU timer result or visual shadow acceptance is inferred.

## Driver flow, records and cleanup

Time Attack produced a clean gold PB with ten sectors and a persisted ghost for each appearance. Each Cup produced a clean gold PB with twenty sectors, second place and 12 banked points. Actual Continue opened `cup-foundry` in preparation with one Cup round retained. The primary result actions fit the initial viewport and the replay-highlight clock matched the actual finish. This covers Canyon and Continue, not all three Cup circuits or a new-series replay cycle.

Included controller CPU overhead p50/p95/max was **0.5 / 0.7 / 0.8 ms** for both Time Attacks and approximately **0.4 / 0.5 / 0.7 ms** for both Cups. Trace rows were 48/111 for Teemto and 49/111 for Sebulba, with zero sampled wrong-way rows. Boost, drift, fire, mine, shield and reset input counts were zero. Each Cup exposed 194 redline-surge events across the field. Base vehicle collision counts remain unavailable (`null`), not zero. These ordinary runs do not establish a worst-case combat/effects stress budget.

Both invocations ended **PASS with zero browser errors**. The Teemto receipt completed at **2026-09-07 16:42:34.153 UTC** and Sebulba at **16:46:28.002 UTC**. Browser closure and server termination happened in each harness's `finally` before receipt completion. Subsequent listener checks confirmed Teemto port **58900** and Sebulba port **59024** were closed. The preceding functional browser's port **58820** was also closed. The root received the browser/GPU/CPU and source-freeze release after both final manifests completed at 16:46:45 UTC.

Each output directory contains the raw `time-attack.json`, `cup-round-1.json`, `receipt.json`, log, result/Continue screenshots, before/after manifests, manifest comparison and derived `analysis-summary.json`. All **130 runtime source files, 26 public Inkstorm files (including attribution), 33 dist files and three harness files** were unchanged in both measurements; all public/dist art pairs match. `output/playwright/round25-freeze-comparison.json` additionally verifies every before/after manifest across the functional run and both benchmarks matches the initial freeze. The freeze window spans **16:36:31.845892–16:46:45.134537 UTC**.

The preceding status/lifecycle acceptance is recorded separately in `VEHICLE_APPEARANCE_ROUND25.md`. The earlier round24 stale label finding and unresolved vehicle art limitations remain documented in `SEBULBA_APPEARANCE_ROUND24.md`; these performance passes do not supersede that art assessment.
