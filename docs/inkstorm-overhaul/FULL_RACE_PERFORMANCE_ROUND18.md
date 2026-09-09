# Round 18 uninterrupted race performance

The frozen round 18 build passed both unchanged cadence gates: one ordinary stock Time Attack lap and the complete stock, two-lap Canyon Cup round with eight racers. Time Attack averaged **60.002338 Hz**; Canyon Cup averaged **59.957668 Hz**. Both had **16.70 ms p95** intervals. Cup retained six racing intervals over 25 ms, with a 33.40 ms maximum; none were removed to obtain the pass.

Time Attack used adaptive DPR 1–2 before returning to DPR 2 at race time 36.483333 seconds. The subsequent Cup stayed at **2880×1800 / DPR 2 / quality level 0** throughout its recorded run, with adaptive quality still enabled. This does not establish fixed-DPR-2 performance for the entire Time Attack.

The run completed at `2026-09-07T13:12:09.794Z`. The existing harness closed its browser in `finally`, exited zero, and terminated its preview server. Port `49549` was then confirmed to have no listener. Browser/source freeze was released only after the after-run artifact checks matched. No build, runtime, public asset, or harness edits were made for this benchmark; round 17 evidence was preserved.

## Exact build and method

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round18
```

| Artifact | SHA-256 |
| --- | --- |
| Served `index-D-2rzRUw.js` | `455011d66a059ceb09275c6337a65929b2585265617546d59bb7e09d7bce63e6` |
| Unmodified `scripts/competitive-flow.ts` | `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7` |
| Canyon high-detail GLB | `ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6` |
| Canyon LOD GLB | `9262af74e76f008803f96c21a17bfbe62eca2098648f58640a716d20de75f21a` |

All **20 public art assets and their 20 matching dist copies** matched before/after and were identical to round 17's art manifest. The frozen bundle and harness also remained unchanged, and the served JS matched the manifest. Source and asset changes were held during measurement.

Environment: Chrome **152.0.7977.77**, headless; **ANGLE Metal Renderer: Apple M4**; WebGL 2; viewport **1440×900**; requested DPR **2**; reported hardware concurrency **10**. No fixed-quality override was used. The runs occurred sequentially in one disposable browser context, so Cup followed Time Attack with existing caches and governor history.

The existing automated standard gamepad drives through the shipped `GamepadInput` using throttle, brake, and steering. Its independently generated course must match the browser's course signature. It uses read-only snapshots and does not activate capture mode, step/seek simulation, teleport, write pose/progress, reset a racer, or modify real-user competitive storage. Native `requestAnimationFrame` interval measurements include its controller/snapshot overhead.

The unchanged gate requires **mean cadence ≥40 Hz**, **p95 ≤25 ms**, valid start/finish coverage within **0.05 seconds**, and enough racing duration to cover the finish with that tolerance. No warmup removal, interior-window selection, slow-frame filtering, or post-player classification-grace removal was applied. Recorded countdown and finished rows remain in the raw files.

## Full racing-phase results

| Measurement | Time Attack | Canyon Cup, round 1 |
| --- | ---: | ---: |
| Original cadence gate | PASS | PASS |
| Racing intervals | 3,799 | 8,045 |
| Sum of racing intervals | 63.314200 s | 134.178000 s |
| Player finish time | 63.316667 s | 126.150000 s |
| First / last observed race time | 0.016667 / 63.316667 s | 0.008333 / 134.158333 s |
| Mean cadence | 60.002338 Hz | 59.957668 Hz |
| p50 interval | 16.70 ms | 16.70 ms |
| p95 interval | 16.70 ms | 16.70 ms |
| p99 interval | 16.80 ms | 16.80 ms |
| Maximum interval | 16.80 ms | 33.40 ms |
| Intervals over 25 ms | 0 | 6 |
| Intervals over 33.3334 ms | 0 | 4 |
| Intervals over 50 ms | 0 | 0 |

The first observed race times fall within the published 0.05-second boundary tolerance. Cup's measured racing phase includes **8.008333 seconds of race-time classification grace after the player's finish**, rather than stopping its cadence accounting at 126.150000 seconds. Both original gate issue arrays were empty.

The six Cup intervals over 25 ms all occurred at DPR 2, with latest-sector index 15. They remain in the gate input and are individually identifiable:

| Race time | Interval | Course progress |
| --- | ---: | ---: |
| 94.850000 s | 33.40 ms | 0.535415 |
| 95.100000 s | 33.40 ms | 0.537967 |
| 95.216667 s | 33.40 ms | 0.539235 |
| 95.366667 s | 33.30 ms | 0.540938 |
| 95.600000 s | 33.30 ms | 0.543735 |
| 95.716667 s | 33.40 ms | 0.545198 |

This is an observed pacing cluster, not an isolated cause. These measurements do not identify which renderer, simulation, browser, or OS work produced it.

Recorded countdown, reported separately after driver attachment: Time Attack had **154 intervals / 2.616500 s**, mean **58.857252 Hz**, p95 **16.70 ms**, maximum **49.90 ms**, and **two** intervals over 25 ms. Cup had **163 intervals / 2.716500 s**, mean **60.003681 Hz**, p95/maximum **16.80 ms**, and none over 25 ms. The Time Attack countdown spikes were preserved.

Raw records contain **4,002 rows** for Time Attack (155 countdown, 3,799 racing, 48 finished) and **8,258 rows** for Cup (164 countdown, 8,045 racing, 49 finished). Each run's first raw row lacks a prior timestamp, accounting for one extra countdown row relative to its interval count.

## Actual DPR and renderer workload

Time Attack's recorded countdown began at DPR **1.75**, 2520×1575, quality level 2, then moved through **1.625 / 2340×1462 / level 3**, **1.5 / 2160×1350 / level 4**, and **1.375 / 1980×1237 / level 5**. Racing transitions were:

| Race time | DPR | Actual canvas | Quality level |
| --- | ---: | --- | ---: |
| 0.741667 s | 1.25 | 1800×1125 | 6 |
| 1.650000 s | 1.125 | 1620×1012 | 7 |
| 2.550000 s | 1 | 1440×900 | 8 |
| 8.483333 s | 1.125 | 1620×1012 | 7 |
| 12.483333 s | 1.25 | 1800×1125 | 6 |
| 16.483333 s | 1.375 | 1980×1237 | 5 |
| 20.483333 s | 1.5 | 2160×1350 | 4 |
| 24.483333 s | 1.625 | 2340×1462 | 3 |
| 28.483333 s | 1.75 | 2520×1575 | 2 |
| 32.483333 s | 1.875 | 2700×1687 | 1 |
| 36.483333 s | 2 | 2880×1800 | 0 |

Time Attack remained at DPR 2 afterward. Cup recorded only its initial **DPR 2 / 2880×1800 / quality 0** entry, with no subsequent resolution transitions. Adaptive quality was enabled in every recorded telemetry sample in both runs.

Maximum reported whole-frame renderer counts were **156 calls / 3,508,643 triangles** for Time Attack and **340 calls / 3,529,187 triangles** for Cup. These include all frame-graph passes. They exceed the isolated-section triangle counts supplied before the benchmark and are retained as the actual full-run maxima.

For context, round 17's corresponding maxima were 154 / 1,458,889 and 338 / 1,485,899. Its Cup had no racing intervals over 25 ms; round 18 has six, while p95 remains 16.70 ms and the gate still passes. The code/course generator and geometry presentation changed between these runs, so this comparison does not attribute the pacing difference to one feature.

## Moving player-shadow statistics

The unchanged harness captures renderer diagnostics approximately once per second and at resolution changes; shadow statistics below are diagnostic samples, not an every-RAF failure/skip census.

| Measurement | Time Attack | Canyon Cup |
| --- | ---: | ---: |
| Diagnostic samples | 68 | 137 |
| Atlas in every sample | 512 px | 512 px |
| Caster draw calls in every sample | 19 | 19 |
| Caster triangles in every sample | 13,204 | 13,204 |
| Omitted casters in every sample | 0 | 0 |
| Observed failure / skip samples | 0 / 0 | 0 / 0 |
| Successful frame counter, sampled range | 34–4,014 | 4,076–12,302 |
| Successful frame counter, final result snapshot | 4,035 | 12,332 |
| Sampled CPU submission p50 | 0.10 ms | 0.10 ms |
| Sampled CPU submission p95 | 0.20 ms | 0.20 ms |
| Maximum sampled CPU submission | 0.30 ms | 0.30 ms |

The 13,204-triangle workload is **672 triangles above round 17** while draw count stays 19. Frame counters were monotonic; final result snapshots retained 19 draws, 13,204 triangles, and null failure/skip fields. The adapter's cumulative lifetime CPU maximum was **9.50 ms** in both runs, versus 7.00 ms in round 17. That lifetime counter spans page initialization and both races; it is not a per-race percentile or a GPU timer. No sampled failure/skip was observed across the 205 diagnostic samples.

## Driver and progression checks

Time Attack completed one stock, medium-difficulty lap with a valid **63.316667 s** PB, gold medal, 10 sectors, and null invalidation reason. PB ghost persistence, visible result controls, and the finish-highlight clock passed the existing checks. The driver produced 48 control trace samples and no wrong-way trace samples.

Stock Canyon Cup completed two laps with eight racers, the clean-race profile, medium difficulty, a valid **126.150000 s** PB, gold medal, 20 sectors, and null invalidation reason. The player finished **second for 12 points**. Round 1 was banked and the real Continue action opened `cup-foundry` with one completed round. The driver produced 111 control trace samples and no wrong-way trace samples. Later Cup rounds were not driven by this command.

Both records identify `inkstorm-canyon`, seed `1229867859`, generator `inkstorm-course-7`, physics `inkstorm-drive-4`, rules `inkstorm-rules-2`, and stock podracer loadout. The offline driver/live course-signature assertion passed. Boost, drift, fire, mine, shield, and reset input counts were zero in both runs. Cup observed 164 `redline-surge` events; Time Attack observed no galactic events. Base suspension/racer collision counts are unavailable through the read-only API and remain **null**, not zero.

Included controller/snapshot CPU overhead was p50/p95/max **0.50 / 0.60 / 1.10 ms** for Time Attack and **0.40 / 0.50 / 0.80 ms** for Cup. The combined page/console error array was empty. Overall competitive-flow outcome: **PASS**.

## Raw evidence and limits

Evidence is preserved in `output/playwright/full-race-performance-round18/`: `receipt.json`, `time-attack.json`, `cup-round-1.json`, unedited `run.log`, before/after/comparison artifact manifests, and `analysis-summary.json`. The two race JSON files retain every RAF row, controller timing, resolution and shadow sample, event, trace, persisted profile, original summary, and gate decision. Derived analysis did not replace raw data. Actual result screenshots are `time-attack-results.png`, `cup-round-1-results.png`, and `cup-continue-foundry.png`.

This is one local headless Chrome/Apple M4 run of each event with automated input and adaptive rendering. RAF cadence does not measure GPU execution or physical display presentation. It does not establish universal-device FPS, human driving feel, multiplayer-network performance, visual target parity, a fixed-DPR-2 Time Attack, or completion of the whole championship. No failure or slow interval was converted into a filtered pass.
