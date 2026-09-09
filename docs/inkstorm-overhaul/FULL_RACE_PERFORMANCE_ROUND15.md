# Round 15 continuous ordinary-race cadence

7 September 2026, completed **18:43 Bangkok time** (`2026-09-07T11:43:12.615Z`). **PASS on the supplied `index-zFbiBUHH.js` build with the normal adaptive governor:** both complete input-driven races meet the unchanged **mean ≥40 Hz / p95 ≤25 ms** gate. All **11,782 racing RAF intervals** are retained. Time Attack averages **59.7346 Hz** with 17 intervals above 25 ms; Canyon Cup averages **60.0024 Hz**, has no interval above 25 ms, and stays at **DPR 2 / 2880×1800** throughout its measured race.

This result belongs to the current build containing the shared basin, hero vehicle, 20 public art files, scenery-shadow atlas and VFX integration. The build was already present; this verification made no game/harness/asset edits and performed no rebuild or fixed-quality rerun. Earlier round 13 results in `FULL_RACE_PERFORMANCE.md` describe different builds and are not substituted for this measurement.

## Complete racing phases and real flow

| Ordinary event | Actual player finish | Full measured racing phase | RAF intervals | Mean cadence | p95 / p99 | Maximum | >25 ms / >33.3334 ms / >50 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stock Time Attack, one lap | 63.4917 s | 63.4808 s | 3,792 | 59.7346 Hz | 16.7 / 16.8 ms | 33.4 ms | 17 / 5 / 0 |
| Stock Canyon Cup, two laps, eight racers | 125.1417 s | 133.1613 s | 7,990 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 / 0 / 0 |

The existing harness enters through the actual Start Race button and supplies steering, throttle and braking through the shipped live gamepad adapter. It starts recording during countdown, completes the ordered route, and stops after the normal results transition. Cup includes its normal approximately eight-second classification grace after the player's finish. No capture mode, simulation stepping, pose/progress writes, staged start, internal reset, warmup removal, contact exclusion or interior frame filtering is used.

Both stored cadence acceptance objects are `PASS` with empty issue lists. In addition to the cadence thresholds, the unchanged gate requires finite samples and duration, at least two racing intervals, and start/finish/duration coverage within **0.05 seconds**. Solo's first racing sample is at race time **0.0167 s**, its last at **63.4833 s**, and the first finished sample at **63.4917 s**. Cup starts at race time **0 s** and ends its racing-labelled coverage at **133.1500 s**. Raw adjacent countdown/results samples remain in the receipt. These observed phase boundaries are not exact simulation-tick boundaries; solo's approximately 11 ms duration difference is within the declared tolerance.

Solo completes a valid gold PB with all **10 sectors** and a persisted ghost recording. Cup completes a valid gold PB with all **20 sectors**, places the player **second**, and banks **12 points**. Four racers are classified as finishers, including the player; four AI racers are DNF when ordinary classification grace expires. Continue opens **Inkstorm Cup • Foundry**, round 2 of 3, with the banked standings intact. The existing solo results-action visibility and finish-highlight-clock assertions pass. Actual solo/Cup results and Foundry continuation screenshots were inspected: the expected result, primary actions, splits, standings and next-event identity are visible. Full ghost replay visibility and practice are not repeated by this performance mode.

The solo's **17 slow intervals** are approximately 33.3–33.4 ms and cluster at race times **53.6667–59.4667 s**, at DPR 2, around recorded course progress 0.8724–0.9480. They remain in the aggregate and in `derived-summary.json` as `slowFrames`, alongside the complete original raw sequence. The cause was not isolated; the data does not attribute these intervals to the atlas, terrain, VFX, CPU, or GPU.

## Adaptive resolution and rendering workload

CSS viewport is **1440×900**, requested browser DPR is **2**, and `requestedQualityOverride` is explicitly `null`. The governor remains adaptive. DPR stability alone does not prove every other render budget stayed at maximum.

| Run | Effective DPR | Actual canvas buffer range | Resolution records / change observations | Whole-run maximum draw calls / triangles |
|---|---|---|---:|---:|
| Time Attack | 1–2 | 1440×900–2880×1800 | 69 / 15 | 131 / 1,100,635 |
| Canyon Cup | 2 only | 2880×1800 throughout | 136 / 1 | 306 / 1,119,123 |

Change observations include the initial value; Cup has no subsequent resolution change. Resolution records are saved on each observed buffer/DPR change and approximately once per second. They include actual canvas dimensions, renderer dimensions, DPR, performance-governor telemetry, draw counters, memory counts and atlas diagnostics. Whole-run extrema are updated on every driver snapshot and include observed countdown, racing and brief results frames. Racing-only periodic/change-triggered samples peak at **131 calls / 1,093,453 triangles** solo and **249 calls / 1,088,909 triangles** Cup; those samples do not replace the whole-run extrema.

| Effective DPR | Solo racing duration | Cup racing duration |
|---|---:|---:|
| 1.000 | 6.0497 s | 0 s |
| 1.125 | 4.8999 s | 0 s |
| 1.250 | 4.8998 s | 0 s |
| 1.375 | 4.7498 s | 0 s |
| 1.500 | 3.9999 s | 0 s |
| 1.625 | 3.9998 s | 0 s |
| 1.750 | 3.9998 s | 0 s |
| 1.875 | 3.9998 s | 0 s |
| 2.000 | **26.8823 s** | **133.1613 s** |
| **Total measured racing** | **63.4808 s** | **133.1613 s** |

Durations intersect the complete resolution-transition timeline with the first racing RAF timestamp minus its interval through the last racing RAF timestamp. Their sum was checked against the full racing duration, without removing any interval. Solo spends **42.35% at DPR 2** and **9.53% at DPR 1**. It enters racing at DPR 1.375, reaches DPR 1 at **2.55 s**, begins recovery at **8.60 s**, and reaches DPR 2 at **36.60 s**, staying there to the end. This is a substantial early solo resolution reduction; it is not continuous full-resolution acceptance. Cup stays at DPR 2 for **100%** of its measured race. No fixed-quality experiment was performed in this round; this first adaptive result was reported before considering any additional run.

## Atlas and memory diagnostics

| Recorded race | Atlas size | Top-level caster objects | Texel footprint | Atlas revision / cumulative bakes | Reported failure |
|---|---:|---:|---:|---:|---|
| Time Attack | 4096×4096 | 16 | 1.6874 m | 2 / 2 | `null` |
| Canyon Cup | 4096×4096 | 16 | 1.6874 m | 4 / 4 | `null` |

These values remain unchanged in every recorded resolution sample for each race: no rebake is recorded during either measured race. The `casters` counter is the atlas scene's top-level child count, not the total number of rendered instances. Foundry's postmeasurement continuation snapshot reports revision/bakes **5/5**, **15 caster objects**, size **4096**, approximately **1.6919 m** per texel, and `failure: null`. A successful bake receipt does not by itself prove artistic shadow quality in every scene.

| Observed renderer memory counters | Geometry count range | Texture count range | Program count range | Finished snapshot geometry / textures / programs |
|---|---:|---:|---:|---:|
| Time Attack, sampled whole run | 98–113 | 30–34 | 41–42 | 113 / 34 / 42 |
| Canyon Cup, sampled whole run | 189–392 | 78–174 | 41–42 | 392 / 174 / 42 |

Cup's first racing periodic sample at **0.35 s** reports **316 geometries / 136 textures**. Its samples rise to **377 / 166** by **54.8667 s**, remain there through racing, then report **392 / 174** at results. Foundry continuation reports **389 / 172 / 42**. Solo's sampled geometry count reaches 113 by 32.60 s; sampled textures alternate between 30 and 34 during the resolution changes. These are renderer object counts, not GPU memory bytes, atlas allocation sizes, proof of a leak, or proof of stable memory over repeated races. The memory-growth observation is preserved without assigning a cause.

## Countdown, instrumentation and coverage limits

| Observed countdown | Duration / intervals | Mean cadence | p95 / maximum | >25 ms |
|---|---:|---:|---:|---:|
| Time Attack | 2.6332 s / 156 | 59.2435 Hz | 16.8 / 50.0 ms | 1 |
| Canyon Cup | 2.6665 s / 159 | 59.6287 Hz | 16.7 / 33.3 ms | 1 |

Countdown is reported separately because the racing cadence gate scopes the racing phase. These observed portions begin after the launch click and driver preparation, and do not claim all pre-attachment countdown time. Their hitches remain in the raw evidence.

The input controller's callback, including its existing read-only snapshot, input calculations and logging, averages **0.3313 ms** across 3,980 callbacks solo and **0.3655 ms** across 8,196 callbacks Cup. p95 is **0.5 ms** for each; maximum is **1.1 / 1.8 ms**. This browser CPU instrumentation workload remains inside the measured cadence. No screenshot is taken during racing; result screenshots follow controller/measurement shutdown.

Boost, drift, fire, mine, shield and reset input counts are all **zero**. The Galactic event stream records **186 AI redline-surge transitions** in Cup—93 active and 93 inactive, across the seven AI IDs—and no solo events. It does not record a player redline activation. Ordinary base vehicle/racer collision counts are unavailable through this read-only API and remain `null`, rather than zero. A valid PB does not establish a collision-free race.

This verifies the ordinary flagship stock solo lap, the complete eight-racer Canyon Cup, and the next-round UI transition on this local configuration. It does not benchmark intentional drift-heavy play, player boost/effect spam, combat modes, alternate routes, every vehicle/seed, human controller feel, mobile hardware or long-session thermal behavior. The reported values are **native browser RAF callback cadence and CPU controller overhead**, not GPU execution timers, compositor completion, physical display presentation, or universal device FPS.

## Reproduction, provenance and cleanup

```sh
npx --no-install tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round15
```

- Actual served script: `http://127.0.0.1:59786/assets/index-zFbiBUHH.js`.
- SHA-256 of JavaScript fetched from that preview server: `88aa8415b3601e7aa4d3b0594fe13abd628cc5e2450716ead2ec46caaf6e4633`; matches the before/after dist hash.
- Unchanged harness SHA-256: `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`.
- Chrome **152.0.7977.77**, headless; WebGL **2.0 (OpenGL ES 3.0 Chromium)**; GPU string **`ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`**; vendor **`Google Inc. (Apple)`**; hardware concurrency **10**.
- Compatibility user-agent is retained verbatim in `receipt.json`: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36`. Its compatibility platform token does not override the GPU report.
- Before-manifest captured at `2026-09-07T11:39:26.595Z`. It discovers and hashes **all 20 current public art files: 17 GLBs and three PNG paint textures**, plus their served dist copies. All public/dist pairs match. Serialized entries digest: `6615f215f35bc2d31fd55941fd90767c473a1fd8cc1b398b8f1d66c20ab7e716`. The after-manifest confirms all 20 files, the built JavaScript and the harness remained unchanged. This is file provenance, not a claim that every file was fetched or visible during every race.
- Root held this task's competing browsers, builds and heavy CPU work during measurement. No game source, assets, build or harness were changed by this verification. Unrelated pre-existing preview listeners were left untouched.
- **Zero page/console errors.** The harness awaited browser closure and terminated its owned preview process in `finally` before writing the final receipt and exiting **0**. A subsequent check at `2026-09-07T11:43:39.164Z` found no listener on owned port **59786** (`lsof` exit 1, empty output). No browser was reopened for report preparation.

Evidence directory: `output/playwright/full-race-performance-round15/`. `receipt.json`, `time-attack.json` and `cup-round-1.json` preserve full raw RAF samples, phase/resolution transitions, input/event counters, CPU overhead, renderer/atlas/memory samples, profiles, results text/HTML and controller traces. `derived-summary.json` preserves exact DPR-duration arithmetic, retained slow frames, memory changes and boundary samples. `asset-sha256-before.json`, `asset-sha256-after.json` and `cleanup.json` preserve provenance and cleanup checks. The three PNG files are actual completed UI states captured after race measurement, not staged racing frames.
