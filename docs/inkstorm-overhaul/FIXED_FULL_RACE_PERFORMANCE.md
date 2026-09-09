# Full ordinary races at fixed highest renderer quality

6 September 2026, completed **22:44 local**. **Both complete races pass at fixed DPR 2 / 2880×1800**, with approximately 60 Hz native RAF cadence and **zero intervals above 25 ms across all 11,882 racing intervals**. This is the same final-art JavaScript and asset content used by the adaptive benchmark in `FULL_RACE_PERFORMANCE.md`.

The prior adaptive resolution reductions were **not necessary to meet the measured cadence target for these two runs on this Apple M4**. That conclusion is specific to this local browser, workload and duration; it does not establish device-wide or universal FPS, GPU execution time, or physical display presentation.

## Continuous race results

| Ordinary event | Actual player finish | Complete measured racing phase | RAF intervals | Mean cadence | p95 / p99 | Maximum | >25 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Stock Time Attack, one lap | 63.3167 s | 63.3308 s | 3,800 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |
| Stock Canyon Cup, two laps, eight racers | 126.6667 s | 134.6947 s | 8,082 | 60.0024 Hz | 16.7 / 16.8 ms | 16.8 ms | 0 |

The first racing sample is at race time zero in each run. Cup remains measured after the player's finish through its normal eight-second classification grace until results. No racing warmup, dense scene, interior frames, slow interval, contact or late lap is excluded. The full ordered laps are completed by live steering, throttle and brake input through the shipped gamepad adapter, without capture mode, stepping, pose/progress writes or internal resets.

Both results are valid gold PBs, with ten Time Attack sectors and twenty Cup sectors. Cup finishes third for ten points and Continue opens Foundry. Matching finish-highlight time and the initially visible primary results actions also pass. Practice and visible ghost replay remain covered by the earlier competitive-flow study and are not repeated here.

Both saved cadence gates are `PASS`, with no issues. Their criteria require finite nonempty samples, complete race-start/finish and duration coverage, mean cadence at least 40 Hz and p95 at most 25 ms. Separate fixed-quality gates are also `PASS`: all observed renderer DPR extrema remain 2, and all canvas samples are 2880×1800.

## Fixed-quality intervention and resolution evidence

The harness accepts `--fixed-quality=0` only alongside `--performance`. After the app reports ready, it calls the rendering-only review method `setPerformanceQuality(0)` **exactly once**, before the first Start click. Level zero selects the highest renderer quality and disables adaptive governor changes. The same page remains alive through Cup; there is no reload, repeat quality call or mid-race intervention. The requested override and its scope are explicitly recorded in the receipt.

| Run | Requested DPR / effective DPR | Actual buffer | Resolution samples / initial observation | Racing duration at DPR 2 | Whole-run maximum calls / triangles |
|---|---|---|---:|---:|---:|
| Time Attack | 2 / 2 | 2880×1800 | 67 / 1 | **63.3308 s — 100%** | 127 / 1,035,660 |
| Canyon Cup | 2 / 2 | 2880×1800 | 137 / 1 | **134.6947 s — 100%** | 309 / 1,064,958 |

There are no resolution changes after each initial observation. The exact duration arithmetic intersects the resolution timeline with the first racing RAF timestamp minus its interval through the last racing RAF timestamp. It sums to the entire measured racing duration. Whole-run extrema include observed countdown, racing and brief results frames. Racing-only resolution samples peak at 127 calls / 1,029,020 triangles solo and 296 / 997,760 triangles Cup; periodic samples need not catch every instantaneous peak.

For comparison, the same-build adaptive run selected DPR 1–1.75 solo and DPR 1–2 Cup. Solo spent 16.3% at DPR 1 and never reached DPR 2; Cup spent 29.0% at DPR 1 and only 4.2% at DPR 2. Both adaptive and fixed runs produced approximately 60 Hz cadence. These observations show that the tested governor reduced resolution without a demonstrated cadence need in this specific case. They do not identify GPU headroom or prove adaptive quality is unnecessary for other hardware or more demanding gameplay.

## Countdown and measurement cost

| Observed countdown | Duration / intervals | Mean cadence | p95 / maximum | >25 ms |
|---|---:|---:|---:|---:|
| Time Attack | 2.7166 s / 161 | 59.27 Hz | 16.7 / **50.0 ms** | 1 |
| Canyon Cup | 2.7999 s / 167 | 59.64 Hz | 16.7 / **33.4 ms** | 1 |

Countdown hitches are retained separately, not removed from evidence. Recording begins during countdown after driver preparation and before racing, so these are observed countdown portions rather than a claim that every millisecond following the launch click was captured. Their causes were not isolated.

The existing controller snapshot, input calculation and logging are included in browser workload. Measured callback overhead averages **0.399 ms** solo and **0.368 ms** Cup; p95 is 0.6 / 0.5 ms and maximum is 1.2 / 1.1 ms, over 3,995 / 8,256 callbacks. These are harness CPU times, not GPU measurements. No screenshot is taken during racing; completed-result images are captured after the recorder stops.

The controller supplies **zero boost, drift, fire, mine, shield or reset inputs**. Cup's observed Galactic event stream includes 170 AI redline-surge state transitions; solo records none. Ordinary base vehicle/racer collision events are not exposed by the read-only API, so collision counts remain `null`, not inferred zero. The exact-route controller does not establish human handling quality or coverage of combat chaos, deliberate drift-heavy play, every vehicle class, alternate route or seed.

## Provenance, artifacts and cleanup

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --fixed-quality=0 --output=output/playwright/full-race-performance-fixed-final
```

- Completed at `2026-09-06T15:44:41.418Z`.
- Actual served build: `http://127.0.0.1:54810/assets/index-yCpWuPH-.js`.
- Fetched JavaScript SHA-256: `9b0b979eb04053dab441c6e72eeb259a0b9e2672d64e6a4540a8cf289835b45e`, identical to the adaptive final-art study.
- Harness source SHA-256 at launch: `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`.
- Chrome **152.0.7977.77**, headless; WebGL 2.0; CSS viewport **1440×900**; requested DPR **2**; hardware concurrency **10**.
- GPU: `ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)`; vendor `Google Inc. (Apple)`. The compatibility user-agent is retained in the receipt and is not treated as a hardware identifier.
- Premeasurement file manifest captured at `2026-09-06T15:40:59.685Z`: all **14 dist GLBs and three paint textures**. Serialized entries SHA-256: `6b21f1ad6270ec7ad747aff489592dee6608df3d2ce020bc5a1930da8ece1798`, identical to the adaptive study.
- `asset-sha256-before.json` records relative paths, byte sizes and hashes; `asset-sha256-after.json` verifies all 17 remained unchanged after measurement. File provenance does not imply every asset was visible or loaded at every point.
- Root held other browsers, builds and heavy CPU work throughout measurement. Source-only work elsewhere did not change the frozen served build.
- **Zero page/console errors.** Browser and preview server closed in `finally`; a subsequent `lsof` check found no listener on owned port **54810**.

Evidence directory: `output/playwright/full-race-performance-fixed-final/`. `receipt.json` records the requested override, actual build/GPU, both cadence and fixed-quality acceptance objects, raw RAF samples, renderer/phase transitions, callback overhead, input/events, profiles and result HTML. `derived-summary.json` records exact fixed-DPR durations. `time-attack.json` and `cup-round-1.json` retain individual raw records, alongside completed-results and Foundry Continue images.

The harness change was syntax-checked; invalid standalone `--fixed-quality=0` and unsupported `--performance --fixed-quality=1` are rejected before browser startup. The complete successful run validates the accepted flag and preserved override. No app code, game state, course or simulation was changed for this experiment.

This result measures native RAF callback cadence with the automated controller overhead included. It does not measure GPU timer queries, compositor completion, physical display presentation, mobile performance or sustained thermal behavior. The adaptive report remains a separate historical observation of the same final-art build under its default governor.
