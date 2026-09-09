# Round 17 uninterrupted race performance

Both ordinary-race cadence gates passed on the frozen round 17 build: one complete stock Time Attack lap and the complete stock, two-lap Canyon Cup round with eight racers. Each recorded racing interval remained at or below 16.80 ms in this local Chrome run. Time Attack used adaptive resolution during its first 36.217 seconds; the subsequent Canyon Cup held DPR 2 throughout its recorded run. This is not a fixed-DPR-2 result for the entire Time Attack.

The run completed at `2026-09-07T12:43:41.278Z`. The browser closed in the existing harness's `finally` block, the harness process exited zero, and the preview server received `SIGTERM`. No build, runtime, asset, or harness edits were made for this run. Browser/source freeze was released only after the after-run artifact manifest matched.

## Frozen artifacts and method

Command:

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round17
```

- Served bundle: `index-DDt5c0Zg.js`, SHA-256 `6a4e5a193edc949487477ce0fdaac9fdb0ce466b5b23eae29e1e319894b93184`.
- Unmodified harness: SHA-256 `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`.
- Canyon high-detail GLB: SHA-256 `ad9f484c3cd751e9042ecc332e9517c7c21d34919758dfdaa89bde77f153a5e6`.
- Canyon LOD GLB: SHA-256 `9262af74e76f008803f96c21a17bfbe62eca2098648f58640a716d20de75f21a`.
- All **20** public Inkstorm art files and all 20 matching `dist` copies were hashed before and after. Every public/dist pair matched and remained unchanged. The served JS matched the manifest; the JS and harness hashes also remained unchanged.
- Chrome **152.0.7977.77**, headless; ANGLE Metal renderer **Apple M4**; WebGL 2; viewport **1440×900**; requested DPR **2**; reported hardware concurrency **10**.
- Adaptive quality stayed enabled; no fixed-quality override was requested. The runs occurred in order in the same browser, so Canyon Cup followed Time Attack with existing caches and governor history.

The shipped live `GamepadInput` consumed an automated standard gamepad. Its controller used throttle, brake, and steering, with a read-only snapshot and an independently generated course whose signature had to match the live course. The harness did not activate capture mode, seek, step simulation, teleport, write progress/poses, reset a racer, or change production storage. Controller/snapshot overhead remains in the measured native `requestAnimationFrame` intervals.

The existing cadence gate requires mean cadence at least **40 Hz**, p95 interval at most **25 ms**, valid start/finish coverage within **0.05 seconds**, and enough recorded racing duration to cover the player's finish time. No warmup removal, slow-frame filtering, interior-window selection, or post-player grace removal was applied. Countdown and finished-phase rows remain in the raw files; countdown statistics below cover the intervals recorded after the existing driver attached, separately from the complete racing phase.

## Complete racing cadence

| Measurement | Time Attack | Stock Canyon Cup, round 1 |
| --- | ---: | ---: |
| Outcome | PASS | PASS |
| Racing intervals | 3,802 | 8,050 |
| Recorded interval sum | 63.364200 s | 134.161300 s |
| Player finish time | 63.341667 s | 126.133333 s |
| First / last recorded race time | 0 / 63.341667 s | 0 / 134.141667 s |
| Mean cadence | 60.002336 Hz | 60.002400 Hz |
| p50 interval | 16.70 ms | 16.70 ms |
| p95 interval | 16.70 ms | 16.70 ms |
| p99 interval | 16.80 ms | 16.80 ms |
| Maximum interval | 16.80 ms | 16.80 ms |
| Intervals over 25 / 33.3334 / 50 ms | 0 / 0 / 0 | 0 / 0 / 0 |

The Cup measurement retains **8.008333 seconds of race-time classification grace after the player finished**. Its 134.161300-second interval sum is not shortened to the 126.133333-second player result. Both gates returned empty issue lists.

Recorded countdown remained explicit: Time Attack had 159 intervals over 2.683200 seconds, mean 59.257603 Hz, p95 16.80 ms, maximum **50.00 ms**, and one interval over 25 ms. Cup had 164 intervals over 2.733200 seconds, mean 60.002927 Hz, p95/maximum 16.80 ms, and none over 25 ms. The Time Attack countdown's 50 ms interval was preserved.

Raw row counts are 4,001 for Time Attack (160 countdown, 3,802 racing, 39 finished) and 8,262 for Cup (165 countdown, 8,050 racing, 47 finished). Each run's first raw row has no prior RAF timestamp, explaining the extra countdown row relative to its interval count.

## Actual resolution progression

Time Attack began its recorded countdown at 2520×1575 / DPR 1.75 / quality level 2. During countdown it stepped through DPR 1.625, 1.5, and 1.375. Its subsequent racing transitions were:

| Race time | DPR | Actual canvas | Quality level |
| --- | ---: | --- | ---: |
| 0.766667 s | 1.25 | 1800×1125 | 6 |
| 1.683333 s | 1.125 | 1620×1012 | 7 |
| 2.583333 s | 1 | 1440×900 | 8 |
| 8.216667 s | 1.125 | 1620×1012 | 7 |
| 12.216667 s | 1.25 | 1800×1125 | 6 |
| 16.216667 s | 1.375 | 1980×1237 | 5 |
| 20.216667 s | 1.5 | 2160×1350 | 4 |
| 24.216667 s | 1.625 | 2340×1462 | 3 |
| 28.216667 s | 1.75 | 2520×1575 | 2 |
| 32.216667 s | 1.875 | 2700×1687 | 1 |
| 36.216667 s | 2 | 2880×1800 | 0 |

It remained at DPR 2 afterward. The observed run-wide DPR range was 1–2. Maximum reported whole-frame renderer work was 154 draw calls and 1,458,889 triangles.

Stock Canyon Cup recorded one initial resolution entry: **2880×1800 / DPR 2 / quality level 0**. There were no subsequent resolution transitions; run-wide minimum and maximum DPR were both 2. Adaptive quality was still enabled. Maximum reported whole-frame renderer work was 338 draw calls and 1,485,899 triangles. These maxima include all frame-graph passes and are not beauty-pass-only counts.

## Live player shadow receipts

Player-shadow diagnostics are captured with resolution telemetry approximately once per second and at every resolution change, not on every RAF. The existing harness was not altered to increase that sampling rate.

| Measurement | Time Attack | Canyon Cup |
| --- | ---: | ---: |
| Diagnostic samples | 68 | 137 |
| Atlas size in every sample | 512 | 512 |
| Actual caster draw calls in every sample | 19 | 19 |
| Actual caster triangles in every sample | 12,532 | 12,532 |
| Omitted caster count in every sample | 0 | 0 |
| Observed failure / skip samples | 0 / 0 | 0 / 0 |
| Successful frame counter, sampled range | 26–3,994 | 4,064–12,295 |
| Successful frame counter, final result snapshot | 4,025 | 12,324 |
| Sampled CPU submission p50 | 0.10 ms | 0.10 ms |
| Sampled CPU submission p95 | 0.20 ms | 0.20 ms |
| Maximum sampled CPU submission | 0.20 ms | 0.30 ms |

Successful frame counters increased monotonically in both sample sequences. Each final result snapshot retained 19 draws, 12,532 triangles, and null `failure`/`skipped` fields. The adapter's cumulative lifetime CPU maximum was **7.00 ms** in both runs; that counter spans its lifetime from page initialization and is not a per-race percentile. The sampled 0.10–0.30 ms values measure CPU preparation/render submission, not GPU execution. These receipts establish no observed failure/skip in the 205 diagnostic samples; they do not claim a per-frame skip census.

## Driving and progression acceptance

- Time Attack: one stock podracer, one lap, medium difficulty, valid **63.341667 s** PB, gold, 10 sectors, null invalidation reason, and a persisted PB ghost. Visible result controls and the finish-highlight clock matched the recorded finish. The driver recorded 49 control trace samples and no wrong-way trace samples.
- Canyon Cup: eight racers, two laps, clean-race profile, stock podracer, medium difficulty, valid **126.133333 s** PB, gold, 20 sectors, and null invalidation reason. The player finished **second**, earning **12 points**. Round 1 was banked; the real Continue action opened `cup-foundry` while the completed-round count remained 1. The driver recorded 111 control trace samples and no wrong-way trace samples. The later Cup rounds were not raced by this performance command.
- Course identity was `inkstorm-canyon`, seed `1229867859`; both persisted records retained `loadoutKey: stock` and the same live tuning contract.
- Boost, drift, fire, mine, shield, and reset input counts were all zero in both runs. Cup telemetry observed 166 `redline-surge` events; Time Attack observed no galactic events. Base suspension/racer collision counts are unavailable in the read-only API and remain **null**, not zero.
- Included controller/snapshot CPU overhead: Time Attack p50/p95/max **0.50 / 0.60 / 0.80 ms**; Cup **0.40 / 0.50 / 0.60 ms**. These are browser-side controller measurements, not game GPU time.
- Combined page/console error array: **empty**. Overall competitive-flow outcome: **PASS**.

## Evidence and limits

All evidence is under `output/playwright/full-race-performance-round17/`:

- `receipt.json`: overall flow, exact served bundle, device, Continue result, error list, and embedded run receipts.
- `time-attack.json` and `cup-round-1.json`: every recorded RAF row, controller timing, resolution/shadow samples, events, trace, persisted profile, results, raw summaries, and original gate decisions.
- `run.log`: unedited stdout/stderr, including cadence gates and actual finish results.
- `artifact-manifest-before.json`, `artifact-manifest-after.json`, `artifact-manifest-comparison.json`: all 20 public/dist art pairs, frozen bundle, unchanged harness, and matching served JS.
- `analysis-summary.json`: derived report statistics; it does not replace or modify raw intervals or gate decisions.
- `time-attack-results.png`, `cup-round-1-results.png`, and `cup-continue-foundry.png`: actual resulting UI states.

This is one local headless Chrome/Apple M4 run of each event with automated input and adaptive rendering. Native RAF cadence is not a GPU timer or a physical-display presentation measurement. The result does not establish universal device FPS, human driving feel, multiplayer-network performance, visual target parity, fixed-DPR-2 Time Attack performance, or completion of all Cup rounds. No failure was converted into a filtered pass, and prior-round evidence was not overwritten.
