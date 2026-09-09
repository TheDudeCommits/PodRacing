# Full-race performance — round 23

**PASS for both unchanged cadence gates** on the local Apple M4 browser: one complete Time Attack and one complete two-lap Canyon Cup round, followed by the actual Next event action. Both races averaged approximately 60 Hz with a 16.7 ms p95 and zero racing intervals above 25 ms. This run used the actual Teemto v1 hero/rival presentation and retained the full authored terrain coverage at low quality. It was adaptive: Time Attack reached DPR 1 before recovering to 2; Cup briefly used DPR 1.875 before recovering to 2.

## Frozen artifact and method

Measured 2026-09-07 after root's round-23 world capture closed. Parent explicitly held all other Blender, browser and CPU/GPU-heavy work; other work was limited to image reading and documentation. No runtime, public-art, build or harness changes occurred during measurement.

```text
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round23
```

The unchanged harness SHA-256 is `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`. The served bundle was **`index-Dp0pFqH7.js`**, 1,539,944 bytes, SHA-256 **`9c28f1829f638090aae1082006729a6f48701e61a5fbb568e65105ae9ab31f74`**. The preceding combined verification passed 487 tests in 87 files, TypeScript and the production build. The unused Sebulba GLBs are present in this frozen dist, but no Sebulba presentation is active.

Environment: Chrome 152.0.7977.77 headless, WebGL 2, `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`, 1440×900 CSS viewport, requested device DPR 2, hardware concurrency 10. The harness uses the shipped live GamepadInput adapter with an automated steering/throttle/brake controller in disposable empty storage. It verifies the offline driver's course signature against the running course. It does not seek, step, mutate pose/progress, invoke capture mode, override quality or write mastery data directly.

Native RAF intervals cover each complete ordinary racing phase, including launch and Cup classification grace after the player finishes. Countdown is reported separately; finished rows remain in the raw arrays. There is no racing warmup removal, interior exclusion or slow-frame filtering. Read-only snapshot and controller overhead is included. The unchanged criteria are mean cadence ≥40 Hz, p95 ≤25 ms and start/finish coverage within 0.05 seconds.

## Full raw cadence

| Metric | Time Attack | Canyon Cup |
| --- | ---: | ---: |
| Actual player finish, seconds | 63.291666666663716 | 126.13333333337978 |
| Racing intervals | 3,798 | 8,050 |
| Racing interval duration, seconds | 63.2974 | 134.1613 |
| Mean cadence, Hz | 60.00246455620611 | 60.00240009600383 |
| p50 / p95 / p99, ms | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 |
| Maximum racing interval, ms | 16.8 | 16.8 |
| Intervals >25 / >33.3334 / >50 ms | 0 / 0 / 0 | 0 / 0 / 0 |
| First recorded racing time, seconds | 0.008333333333333333 | 0 |
| Last recorded racing time, seconds | 63.28333333333038 | 134.141666666709 |
| Gate | PASS, no issues | PASS, no issues |

Time Attack's final sample precedes its actual finish by 0.00833333333333 seconds, within the unchanged tolerance. Cup includes 8.008333333329 seconds of ordinary post-player classification grace; those intervals remain in its racing summary. Decimal interval values above are displayed to 0.1 ms; the full floating-point timestamps are retained in raw JSON.

Time Attack preserves **4,006 raw rows**: 160 countdown, 3,798 racing and 48 finished. The 159 non-null countdown intervals total 2.6833 seconds, mean 59.25539447695003 Hz, p95 16.8 ms and maximum **50.1 ms**. That one countdown interval exceeds all three reported slow-frame thresholds and remains in the record. Cup preserves **8,272 raw rows**: 165 countdown, 8,050 racing and 57 finished. Its 164 countdown intervals total 2.7332 seconds, mean 60.00292697204748 Hz, p95 16.7 ms, maximum 16.8 ms and no interval above 25 ms. The first row of each run has no preceding interval.

## Exact adaptive resolution progression

Adaptation remained enabled; there was no fixed-quality override. Full-precision transition times and actual canvas dimensions are stored in both raw race files and `analysis-summary.json`.

| Time Attack phase | Race time, seconds | Quality | Actual DPR | Canvas pixels |
| --- | ---: | ---: | ---: | --- |
| First recorded countdown | 0 | 2 | 1.75 | 2520×1575 |
| Countdown | 0 | 3 | 1.625 | 2340×1462 |
| Countdown | 0 | 4 | 1.5 | 2160×1350 |
| Countdown | 0 | 5 | 1.375 | 1980×1237 |
| Racing | 0.75 | 6 | 1.25 | 1800×1125 |
| Racing | 1.666666667 | 7 | 1.125 | 1620×1012 |
| Racing minimum | 2.566666667 | 8 | 1 | 1440×900 |
| Recovery | 7.266666667 | 7 | 1.125 | 1620×1012 |
| Recovery | 11.266666667 | 6 | 1.25 | 1800×1125 |
| Recovery | 15.266666667 | 5 | 1.375 | 1980×1237 |
| Recovery | 19.266666667 | 4 | 1.5 | 2160×1350 |
| Recovery | 23.266666667 | 3 | 1.625 | 2340×1462 |
| Recovery | 27.266666667 | 2 | 1.75 | 2520×1575 |
| Recovery | 31.266666667 | 1 | 1.875 | 2700×1687 |
| Racing maximum | 35.266666667 | 0 | 2 | 2880×1800 |

Cup began its recorded countdown at quality 0 / DPR 2 / 2880×1800, dropped to quality 1 / DPR 1.875 / 2700×1687 during countdown, and returned to quality 0 / DPR 2 at race time **2.099999999999995 seconds**, remaining there through the rest of the recorded run.

All 68 Time Attack and 138 Cup resolution samples reported **six effective terrain levels and 3072 m coverage**. Time Attack's requested level count ranged through 6, 5 and 4; the full authored domain remained enabled. Maximum whole-frame renderer totals were **93 calls / 3,070,502 triangles** for Time Attack and **264 calls / 3,091,046 triangles** for Cup. These aggregate the frame's render passes; they are not unique visible geometry counts.

## Actual vehicle, shadow and controller

Both result snapshots show Teemto v1 ready on the player: 50,705 imported triangles, seven opaque meshes (three body/four pilot), seven registered and visible MRT proxies, full hero LOD and the embedded pilot active. The Cup's podracer rival is also Teemto ready, with 26,180 triangles and seven proxies; the other six rival classes retain their procedural art.

Across the **206 renderer/shadow samples**, every player shadow reported a 512 atlas, three actual body casters/draws, 43,545 drawn triangles, zero omitted casters, and null failure/skipped fields. Diagnostics are recorded approximately once per second and at resolution changes, not on every RAF; this is not an every-frame failure census.

| Shadow diagnostic | Time Attack | Cup |
| --- | ---: | ---: |
| Sampled frame counter | 27 → 4,000 | 4,069 → 12,295 |
| Result frame counter | 4,032 | 12,339 |
| Monotonic sampled counter | Yes | Yes |
| Sampled CPU p50 / p95, ms | 0.1 / 0.2 | 0.1 / 0.2 |
| Maximum sampled CPU, ms | 0.2 | 0.2 |
| Lifetime maximum at result, ms | 6.2 | 6.2 |

The lifetime maximum includes startup and is distinct from the sampled racing values. These measure CPU submission work, not GPU execution or visible shadow quality. The result snapshots retain no player art load error and no shadow failure/skipped reason.

Included input-controller overhead was p50/p95/max **0.5 / 0.6 / 0.8 ms** for Time Attack and **0.4 / 0.5 / 0.7 ms** for Cup. Boost, drift, fire, mine, shield and reset input counters were zero. There were 49 and 111 controller trace rows, with zero sampled wrong-way rows. Cup's exposed event stream recorded 194 redline-surge events across the field. Base vehicle collision totals remain unavailable (`null`), not zero.

## Functional result and cleanup

Time Attack produced a clean gold PB, ten sectors and a persisted ghost. Cup produced a clean gold PB with twenty sectors; the player placed second and banked 12 points. The actual Next event click opened `cup-foundry` in preparation with one Cup round retained. Results primary actions fit the initial viewport, and the finish-highlight clock matched the actual finish. This run covers Canyon and Continue, not completion of all three Cup circuits or the visible restart-series cycle.

The before manifest was recorded at **15:52:30.703897 UTC**. The harness completed at **15:56:01.636 UTC**, immediately closing the browser in `finally`; the after manifest was recorded at **15:56:30.164181 UTC**. All 130 source files, 26 public Inkstorm files (including attribution), 33 dist files, the performance harness and its cadence judge are unchanged. All 26 public/dist counterparts match. The exact actually served build matches the frozen bundle hash. No benchmark failure or threshold change occurred.

Preview port **57453** was independently verified to have no listener afterward; no competitive-flow, preview or owned Chrome process remained. Browser, CPU/GPU and runtime/public/dist freeze ownership was released to root after these checks. Subsequent work is outside this receipt.

Raw receipts, complete frame/resolution/event/controller arrays, screenshots, logs and before/after/comparison manifests remain in `output/playwright/full-race-performance-round23/`. `analysis-summary.json` is a derived convenience file and does not replace raw evidence. This single local run does not establish fixed-DPR-2 race performance, physical display presentation timing, GPU time, other-device performance, human driving feel or long-term replay appeal.
