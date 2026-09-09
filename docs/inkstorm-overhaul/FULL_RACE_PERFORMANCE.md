# Continuous ordinary-race cadence

## Governor-policy baseline on round 13 art — 6 September 2026, 22:54 local

**PASS on `index-D2dLaNav.js` with the normal adaptive governor and no quality override:** both complete input-driven races maintain approximately 60 Hz, with **11,883 racing intervals and zero above 25 ms**. Cup remains at **DPR 2 / 2880×1800 for its entire measured racing phase**. Solo initially drops as low as DPR 1, then recovers to DPR 2 at race time 35.5667 seconds. This is acceptance of the updated governor on the frozen **round 13 art baseline**, not of subsequent terrain or vehicle changes.

The same-art fixed-quality experiment in `FIXED_FULL_RACE_PERFORMANCE.md` already showed both full races sustaining this cadence at DPR 2. That evidence established that the prior geometry-driven reductions were conservative for these Apple M4 workloads. The updated governor improves Cup's DPR-2 residency from 4.2% to 100%. Solo startup/history response remains conservative despite no racing interval above 25 ms; the cause of the early reductions is not isolated here.

| Ordinary event | Actual player finish | Complete measured racing phase | Intervals | Mean cadence | p95 / p99 | Maximum | >25 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stock Time Attack, one lap | 63.3667 s | 63.3475 s | 3,801 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |
| Stock Canyon Cup, two laps, eight racers | 126.6667 s | 134.6946 s | 8,082 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |

The recorder begins during countdown and continues to actual results. Each run completes all ordered checkpoints through steering, throttle and brake input via the shipped live gamepad adapter. No staging, capture mode, pose/progress writes, internal reset, warmup removal or interior frame exclusion is used. Cup includes its normal eight-second classification grace. Both cadence gates are `PASS` with no issues: finite nonempty samples, start/finish and duration coverage within 0.05-second boundary tolerance, mean at least 40 Hz and p95 at most 25 ms.

Phase boundaries are observable samples, not a claim of exact simulation-tick alignment. Solo's first racing-labelled sample is at race time **0.0167 s**, its last at **63.3500 s**, and the first finished-labelled sample at **63.3667 s**. Cup's first racing sample is at **0 s** and last at **134.6750 s**. Every raw RAF sample, including the adjacent countdown/results frames, is preserved. The roughly 19 ms difference between solo's recorded racing window and actual finish is within the declared gate tolerance and is not an internal exclusion.

Both actual results are valid gold PBs with ten/twenty sectors. Cup places the player third, banks ten points and Continue opens Foundry. Finish-highlight time and initially visible results actions pass the existing UI checks. This performance flow deliberately does not repeat practice or visible ghost replay, which have separate earlier acceptance.

### Updated adaptive resolution and duration

CSS viewport is **1440×900**, requested DPR **2**. The receipt explicitly records `requestedQualityOverride: null`; the harness makes no quality API call in this mode.

| Run | Effective DPR | Actual canvas buffer range | Resolution records / observations of changes | Whole-run maximum calls / triangles |
|---|---|---|---:|---:|
| Time Attack | 1–2 | 1440×900–2880×1800 | 67 / 15 | 127 / 1,035,660 |
| Canyon Cup | 2 only | 2880×1800 throughout | 137 / 1 | 309 / 1,064,958 |

Change observations include the initial value. Cup has no subsequent resolution change. Whole-run maxima include observed countdown, racing and brief results frames. Racing-only periodic samples peak at 127 calls / 1,031,676 triangles solo and 290 / 997,760 Cup. Samples record actual canvas dimensions and renderer state approximately once per second and whenever resolution changes; renderer extrema are updated on each existing driver snapshot.

| Effective DPR | Solo racing duration | Cup racing duration |
|---|---:|---:|
| 1.000 | 5.0164 s | 0 s |
| 1.125 | 4.8999 s | 0 s |
| 1.250 | 4.9164 s | 0 s |
| 1.375 | 4.7332 s | 0 s |
| 1.500 | 3.9998 s | 0 s |
| 1.625 | 3.9999 s | 0 s |
| 1.750 | 3.9998 s | 0 s |
| 1.875 | 3.9998 s | 0 s |
| 2.000 | **27.7823 s** | **134.6946 s** |
| **Total measured racing** | **63.3475 s** | **134.6946 s** |

Durations intersect the complete resolution-transition timeline with the first racing RAF timestamp minus its interval through the last racing RAF timestamp; totals equal the measured racing windows. Solo spends **43.86% at DPR 2** and **7.92% at DPR 1**. It enters the racing phase at DPR 1.375, drops to 1 at 2.55 seconds, begins recovery at 7.5667 seconds and advances by 0.125 approximately every four seconds until reaching 2 at 35.5667 seconds. It stays at 2 for the remainder, and the subsequent Cup stays at 2 throughout. Do not describe solo as full-resolution throughout or infer that its early reductions were necessary from this trace.

### Countdown, controller workload and scope

| Observed countdown | Duration / intervals | Mean cadence | p95 / maximum | >25 ms |
|---|---:|---:|---:|---:|
| Time Attack | 2.7166 s / 161 | 59.27 Hz | 16.8 / **50.0 ms** | 1 |
| Canyon Cup | 2.7832 s / 166 | 59.64 Hz | 16.8 / **33.3 ms** | 1 |

These countdown portions begin after driver attachment; they do not claim every millisecond after the UI launch click. The hitches remain in the receipt and are not attributed to a particular CPU or GPU cause.

Controller callbacks, including the existing read-only snapshot, input calculation and logging, average **0.314 ms** solo and **0.367 ms** Cup. p95 is 0.4 / 0.5 ms; maximum is 0.9 / 1.0 ms across 3,990 / 8,266 callbacks. This harness CPU workload remains included in measured cadence; it is not GPU time. No racing screenshots are taken; result images follow recorder shutdown.

Supplied boost, drift, fire, mine, shield and reset inputs are all zero. The Galactic event stream observes 170 AI redline-surge transitions in Cup and none in solo. Ordinary base vehicle/racer collision counts are unavailable through the read-only API and remain `null`. This is automated canonical-route gameplay, not human driving feel or a benchmark of intentional drift, player effect spam, combat chaos, alternate routes, every vehicle/seed, mobile or long-term thermal behavior. Native RAF callback cadence does not establish GPU execution time, compositor completion, physical display presentation or universal device FPS.

### Updated-build provenance and cleanup

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-cadence-governor
```

- Completed at `2026-09-06T15:54:57.826Z` (22:54 local).
- Actual served script: `http://127.0.0.1:55853/assets/index-D2dLaNav.js`.
- Fetched JavaScript SHA-256: `04c0a582569d37435fc60cf4ef6949a0bc5fede3a6fb0d2525d41aa8c70a83ff`.
- Unchanged harness SHA-256: `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`; fixed-quality flag omitted.
- Chrome **152.0.7977.77**, headless; WebGL 2.0; GPU `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`; vendor `Google Inc. (Apple)`; hardware concurrency **10**. Compatibility user-agent is retained verbatim in the receipt.
- Premeasurement manifest captured at `2026-09-06T15:51:28.099Z`, hashing all **14 dist GLBs and three paint textures**. Serialized entries digest: `6b21f1ad6270ec7ad747aff489592dee6608df3d2ce020bc5a1930da8ece1798`, identical to both earlier round 13 art studies. Postmeasurement hashes confirm all 17 remained unchanged. File hashes establish asset provenance, not every asset's visibility.
- Root held source/dist edits, other browsers, builds and heavy CPU work through measurement. **Zero page/console errors.** Browser and preview server closed in `finally`; a subsequent `lsof` check found no listener on owned port **55853**.

Evidence is in `output/playwright/full-race-performance-cadence-governor/`: `receipt.json`, individual run records, `derived-summary.json`, raw phase/resolution timing and counters, actual results HTML/screenshots, and `asset-sha256-before.json` / `asset-sha256-after.json`. Earlier fixed and adaptive artifacts remain untouched. Subsequent art changes require their own evidence and must not inherit this build's acceptance.

## Historical round 13 adaptive art build — 6 September 2026, 22:35 local

**PASS for both uninterrupted ordinary races on `index-yCpWuPH-.js`: 11,885 racing intervals, approximately 60 Hz native RAF cadence, zero intervals above 25 ms.** This uses adaptive resolution: solo ranges from **DPR 1 to 1.75**, and Cup from **DPR 1 to 2**. The prior adaptive governor selected lower resolution for more of the race than the historical build below. Solo never reaches DPR 2; Cup spends only 4.2% of its measured racing phase there. This is a local cadence result, not fixed-DPR-2 or physical display presentation acceptance. The subsequent fixed-quality study establishes that these reductions were not required to meet the observed cadence on this M4.

| Ordinary event | Actual player finish | Full measured racing phase | Intervals | Mean cadence | p95 / p99 | Maximum | >25 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stock Time Attack, one lap | 63.3667 s | 63.3808 s | 3,803 | 60.0024 Hz | 16.8 / 16.8 ms | 16.8 ms | 0 |
| Stock Canyon Cup, two laps, eight racers | 126.6667 s | 134.6945 s | 8,082 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |

Both racing windows begin at race time zero and include the entire ordered course, without staged starts, internal resets, warmup removal, contact exclusions or frame filtering. Cup includes the normal eight-second classification grace after the player's finish. The actual results are valid gold PBs with ten/twenty sectors; Cup places the player third, banks ten points and Continue opens Foundry. The existing results checks also pass for matching finish-highlight time and the initially visible action bar. Ghost replay and practice are not repeated in this performance run.

The saved acceptance objects both contain `outcome: PASS` and no issues. The gate requires finite nonempty measurements, complete start/finish coverage and duration, mean cadence at least 40 Hz, and p95 at most 25 ms. Completion alone is not treated as a performance pass.

### Exact adaptive-resolution cost

Viewport is 1440×900 CSS pixels, requested browser DPR 2. Actual canvas dimensions are read from the canvas, alongside renderer DPR and counters; no fixed-quality override is supplied.

| Run | Effective DPR | Actual canvas buffer range | Resolution records / changes | Whole-run maximum calls / triangles |
|---|---|---|---:|---:|
| Time Attack | 1.0–1.75 | 1440×900–2520×1575 | 71 / 23 | 124 / 1,035,660 |
| Canyon Cup | 1.0–2.0 | 1440×900–2880×1800 | 141 / 28 | 307 / 1,063,656 |

Changes include the initial observation. Whole-run maxima include observed countdown, racing and brief results frames. Racing-only resolution samples peak at 122 calls / 1,003,624 triangles solo and 288 / 1,047,844 Cup. Resolution records are taken on every observed DPR/buffer change and approximately once per second; renderer extrema are also updated at each existing driver snapshot.

| Effective DPR | Time Attack racing duration | Canyon Cup racing duration |
|---|---:|---:|
| 1.000 | 10.3496 s | 39.0151 s |
| 1.125 | 12.2495 s | 15.1161 s |
| 1.250 | 10.8828 s | 18.1660 s |
| 1.375 | 10.4997 s | 25.5654 s |
| 1.500 | 8.0163 s | 12.8162 s |
| 1.625 | 4.8999 s | 8.5163 s |
| 1.750 | 6.4830 s | 4.8998 s |
| 1.875 | 0 s | 4.8998 s |
| 2.000 | 0 s | 5.6998 s |
| **Total** | **63.3808 s** | **134.6945 s** |

Durations intersect the full resolution-transition timeline with the measured racing interval window: first racing RAF timestamp minus its interval, through the last racing RAF timestamp. They sum to each complete measured racing duration. Solo spends 16.3% at DPR 1; Cup spends 29.0% at DPR 1 and 4.2% at DPR 2. The normal governor also adjusts other rendering budgets, so this does not establish maximum visual quality throughout. The increased final-art geometry and lower resolution are observed together; this study does not isolate their individual performance costs.

### Countdown, workload and measurement limits

| Observed countdown | Duration / intervals | Mean cadence | p95 / maximum | >25 ms |
|---|---:|---:|---:|---:|
| Time Attack | 2.6999 s / 160 | 59.26 Hz | 16.7 / 33.4 ms | 2 |
| Canyon Cup | 2.8000 s / 168 | 60.00 Hz | 16.7 / 16.8 ms | 0 |

These are the observed countdown portions after driver attachment, not every millisecond following the launch click. Recording is established before racing starts. Both solo countdown hitches remain in the evidence; their causes were not isolated.

The autonomous controller supplies steering, throttle and braking through the shipped gamepad adapter, using exact course knowledge in disposable browser storage. It supplies zero boost, drift, fire, mine, shield and reset inputs. The Galactic stream observes 170 AI redline-surge state transitions in Cup; solo records no Galactic events. Ordinary base vehicle/racer collision counts are unavailable in the read-only API and remain `null`, not a claimed zero. No effect is artificially invoked to inflate coverage.

Measured callback overhead includes the existing read-only snapshot, controller calculation and performance logging: solo averages 0.481 ms, p95 0.6 ms, maximum 0.8 ms over 4,001 callbacks; Cup averages 0.391 ms, p95 0.5 ms, maximum 0.8 ms over 8,258 callbacks. That workload remains included in the recorded cadence. No screenshots occur during racing; result screenshots are captured after the recorder stops.

This covers the full flagship solo lap and eight-racer Canyon Cup with the normal adaptive governor. It does not measure GPU execution time, compositor completion or physical display presentation, and does not establish performance for other devices, mobile, prolonged thermal load, every vehicle/seed/alternate route, intentional drift-heavy play or combat chaos. The existing input driver follows the canonical route; this is automated gameplay evidence, not human driving feel.

### Current-build provenance and cleanup

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-art-final
```

- Completed at `2026-09-06T15:35:18.665Z` (22:35 local).
- Actual served script: `http://127.0.0.1:53798/assets/index-yCpWuPH-.js`.
- Fetched script SHA-256: `9b0b979eb04053dab441c6e72eeb259a0b9e2672d64e6a4540a8cf289835b45e`.
- Harness source SHA-256 at launch: `29f50f29e1917ab4c9b88ce54d439e2831962e5ac2691a51990657d62272f0db`. No app or harness edits were made for this repeat.
- Chrome 152.0.7977.77, headless, WebGL 2.0; GPU `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`; vendor `Google Inc. (Apple)`; hardware concurrency 10. The compatibility user-agent is retained verbatim in the receipt and does not override the reported GPU.
- Before measurement, all **14 GLBs and three paint textures** in `dist` were hashed at `2026-09-06T15:31:49.809Z`. `asset-sha256-before.json` retains every relative path, byte size and SHA-256. Digest of its serialized entries array: `6b21f1ad6270ec7ad747aff489592dee6608df3d2ce020bc5a1930da8ece1798`.
- `asset-sha256-after.json` confirms all 17 asset content hashes remained unchanged after measurement. These are file-provenance checks, not claims that every asset was fetched or visible in every race.
- Other task browsers, builds and heavy CPU work were held throughout measurement. There are **zero page/console errors**. Browser and preview server closed in `finally`; a subsequent `lsof` check found no listener on owned port **53798**.

Current evidence is in `output/playwright/full-race-performance-art-final/`: `receipt.json` contains both acceptance objects, fetched build/GPU data, raw RAF samples, phase/resolution transitions, counters, overhead, events, profiles and actual results HTML. `derived-summary.json` records exact DPR duration arithmetic; `time-attack.json` and `cup-round-1.json` retain individual run evidence. The completed-results and Foundry Continue screenshots are actual UI states captured after measurement.

## Historical build — `index-edr4kL2B.js`

The following earlier measurement is preserved as history. Its higher DPR residency and lower geometry counts must not be attributed to the current final-art build.

6 September 2026, completed 22:07 local. **Both complete races maintained approximately 60 Hz native browser RAF cadence with adaptive rendering resolution.** All 11,882 racing-phase intervals are retained; none exceeds 25 ms. This closes the earlier staged-section-only coverage gap. It is not a fixed-DPR-2 result or a measurement of physical display presentation.

## Complete racing phases

| Ordinary event | Actual player finish | Measured racing phase | Native RAF intervals | Mean cadence | p95 / p99 | Largest interval | Intervals >25 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stock Time Attack, one lap | 63.3167 s | 63.3308 s | 3,800 | 60.00 Hz | 16.8 / 16.8 ms | 16.8 ms | 0 |
| Stock Canyon Cup, two laps, eight racers | 126.6667 s | 134.6946 s | 8,082 | 60.00 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |

The Cup measurement continues after the player's finish through the **normal eight-second classification grace**, until the race enters results. Both runs begin recording during their normal countdown, start on the actual grid and complete their full ordered laps. The player earns a valid gold PB with ten sectors in Time Attack and twenty sectors in Cup. Cup ends in third place, banks ten points and correctly opens Foundry as the next event.

Native RAF intervals are assigned to the observed race phase; when race time begins before the less-frequent HUD updates its countdown label, that launch interval is retained as racing. The first racing sample is at race time zero in both runs. Boundary intervals account for the small difference between the measured RAF window and the 120 Hz race clock. No racing warmup, first corner, dense scene, low-resolution period, contact, late lap or slow interval is excluded.

## Adaptive resolution is part of this result

CSS viewport is **1440×900**, requested browser DPR **2**. The effective canvas changes during ordinary operation:

| Run | Effective DPR range | Actual canvas buffer range | Resolution records / changes | Observed whole-run maximum draw calls / triangles |
|---|---|---|---:|---:|
| Time Attack | 1.25–2.0 | 1800×1125–2880×1800 | 69 / 11 | 129 / 720,408 |
| Canyon Cup | 1.0–2.0 | 1440×900–2880×1800 | 141 / 17 | 323 / 745,122 |

Whole-run maxima include the observed countdown, racing and brief results frames. Resolution changes are captured whenever buffer size/DPR changes, with additional one-second samples. The receipt records actual `canvas.width`/`height`, renderer dimensions, DPR, calls, triangles and memory counters. The changes column includes the initial observed resolution. Intermediate DPRs use increments of 0.125 between 1 and 2 where applicable; every actual transition is retained.

During racing, Time Attack spends approximately **30.83 seconds at DPR 2** (48.7% of its measured phase); Cup spends approximately **64.13 seconds at DPR 2** (47.6%). Cup spends approximately **27.82 seconds at DPR 1** (20.7%). These durations come from the full resolution-transition timeline intersected with the exact racing-interval window, from the first racing RAF timestamp minus its interval through the last racing RAF timestamp. Do not present the 60 Hz result as continuous 2880×1800 rendering. The governor also controls other rendering budgets; this benchmark does not claim all visual quality settings stayed at maximum.

## Countdown and instrumentation cost

The observed countdown portions are reported independently rather than discarded:

| Run | Observed countdown | Intervals | Mean cadence | Largest interval | >25 ms |
|---|---:|---:|---:|---:|---:|
| Time Attack | 2.7499 s | 163 | 59.27 Hz | **50.1 ms** | 1 |
| Canyon Cup | 2.8165 s | 168 | 59.65 Hz | **33.4 ms** | 1 |

The recorder attaches after the UI launch click and deterministic-course preparation, during the countdown, so these are observed portions rather than a claim that every millisecond before attachment was captured. Recording is established before the first racing tick. The source of these countdown hitches was not isolated by this study.

The autonomous input controller and its existing read-only snapshot call remain inside the measured browser workload. Measured callback overhead, including snapshot reads, input computation and logging, averages **0.485 ms** for the solo run and **0.404 ms** for Cup; p95 is 0.6/0.5 ms and maximum 0.9/0.8 ms respectively. This is harness CPU time, not GPU execution time. Resolution samples reuse the snapshot already read by the driver. No screenshot is taken during racing; completed-result screenshots happen after the driver/measurement loop is stopped.

## Observed gameplay scope

The controller supplies normal steering, throttle and braking through the shipped live gamepad adapter. It supplies **zero boost, drift, fire, mine, shield or reset inputs** in both runs. It follows the canonical route, not a staged pose or cinematic camera path. No weapon or drift inputs were artificially invoked to inflate effect coverage.

The available Galactic event stream records **170 AI redline-surge state transitions** in Cup (85 activation and 85 deactivation events); none belongs to the player. Time Attack records no Galactic events. These are observed stream events, not inferred visual activations. Ordinary base vehicle/racer collision events and base boost-start events are **not exposed by the read-only review API**, so their counts remain `null`/unavailable rather than fabricated zeroes. The valid completed records establish no disqualifying player recovery/wreck, but do not establish a collision-free Cup.

This run covers the normal flagship solo lap and full eight-racer Canyon Cup at medium difficulty. It does not benchmark intentional drift-heavy play, player boost/redline spam, combat chaos modes, all alternate routes, every vehicle class, every seed, mobile hardware or thermal throttling over a long play session. Earlier live ghost and completed-practice acceptance remains in `COMPETITIVE_FLOW.md`; those flows are deliberately not repeated in this performance run.

## Reproduce and provenance

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance
```

- Build script: `index-edr4kL2B.js`.
- SHA-256 of the actual JavaScript fetched from the local preview server: `84dbadba7876dcf5ac45f81781427aded7966cd4f2d908e941594843b8d629ca`.
- Browser: Chrome **152.0.7977.77**, headless.
- GPU reported by WebGL debug info: **ANGLE Metal Renderer: Apple M4**; vendor `Google Inc. (Apple)`; WebGL 2.0.
- Reported hardware concurrency: 10. The browser's compatibility user-agent says Intel/Mac OS X 10_15_7; that is retained verbatim in the receipt and is not used to override the GPU report.
- Harness source SHA-256 at launch: `42ac48d3d02d31355faebf9cddfb0c24c51963ad23ffc8193fad997acfa60bf8`.
- Other task browsers, builds and heavy CPU work were held during this measurement. No fixed-quality diagnostic override was used.

Evidence directory: `output/playwright/full-race-performance/`. `receipt.json` contains the fetched build hash, browser/GPU data, both full run records, raw RAF samples, phase/resolution transitions, renderer samples, measured controller overhead, observed events, actual result HTML, profiles and traces. Individual `time-attack.json` and `cup-round-1.json` retain the same per-run evidence. Both completed-result screenshots are real UI results, not staged performance frames.

There are **zero page/console errors**. Browser and owned preview server closed immediately in `finally`; port **51461** no longer listens. These numbers describe native RAF callback cadence on this local configuration with the normal adaptive governor. They do not measure GPU timer queries, compositor completion, physical screen presentation or universal device FPS.
