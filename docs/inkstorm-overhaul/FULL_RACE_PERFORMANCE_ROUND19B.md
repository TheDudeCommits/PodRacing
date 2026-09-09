# Full ordinary-race performance — round 19b

**PASS** for both uninterrupted races on the frozen local build. Time Attack averaged **60.002305 Hz** with **16.7 ms p95**; Canyon Cup averaged **60.002400 Hz** with **16.8 ms p95**. Neither racing phase contained an interval above 25 ms. These are native browser RAF cadence measurements on the recorded local device, with adaptive resolution enabled; they are not universal-device FPS or human driving acceptance.

Run completed `2026-09-07T14:19:38.992Z`, exit 0, zero captured browser errors. Output: `output/playwright/full-race-performance-round19b`.

## Frozen build and method

```sh
npx --yes tsx scripts/competitive-flow.ts --performance --output=output/playwright/full-race-performance-round19b
```

- Served bundle: `index-DppP0e9i.js`, SHA-256 `495193ccd54ce3ddeca44cb8c2ca4334caef7dfabdeb5442bf7e1856cd42ea04`, 1,499,959 bytes.
- Unmodified performance harness: SHA-256 `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`.
- Chrome 152.0.7977.77, headless; ANGLE Metal on Apple M4; WebGL 2; reported hardware concurrency 10; viewport 1440 × 900; requested DPR 2. The first recorded canvas was 2520 × 1575 because the adaptive governor had already reduced resolution.
- Course seed and director seed 1229867859; `inkstorm-course-8`, `inkstorm-drive-4`, `inkstorm-rules-2`; stock Podracer, medium difficulty. Full tune identity is retained in the raw record.
- Time Attack was followed by Cup in the same fresh browser, so Cup used warmed resources and existing governor history. No quality override was called.
- The actual UI started and selected events. The controller supplied ordinary throttle, brake and steering through shipped `GamepadInput`, using a independently generated course whose signature had to match the browser. It did not invoke capture mode, fixed-step review, pose/progress writes, boost, drift, weapons, shield or recovery.

Every native RAF row was retained. The gate uses the complete ordinary racing phase, including classification grace after the player's finish. Countdown is reported separately; finished rows also remain in raw JSON. There was no racing warmup removal, interior exclusion, transient-frame removal or gate change. Controller and snapshot overhead is included. The fixed criteria remain mean ≥40 Hz, p95 ≤25 ms and start/finish coverage within 0.05 seconds.

## Raw cadence and coverage

| Metric | Time Attack | Canyon Cup |
| --- | ---: | ---: |
| Actual player finish, seconds | 63.34166666666371 | 126.13333333337978 |
| Racing intervals | 3,800 | 8,050 |
| Sum of racing intervals, seconds | 63.3309 | 134.1613 |
| Mean cadence, Hz | 60.00230535173194 | 60.00240009600383 |
| p50 / p95 / p99, ms | 16.7 / 16.7 / 16.8 | 16.7 / 16.8 / 16.8 |
| Maximum racing interval, ms | 16.8 | 16.8 |
| Intervals >25 / >33.3334 / >50 ms | 0 / 0 / 0 | 0 / 0 / 0 |
| First observed racing time, seconds | 0.016666666666666666 | 0 |
| Last observed racing time, seconds | 63.33333333333038 | 134.141666666709 |
| Gate | PASS, no issues | PASS, no issues |

Time Attack's last observed time precedes its finish by 0.00833333333333 seconds, inside the unchanged 0.05-second coverage tolerance. Cup includes 8.008333333329 seconds of ordinary classification grace after the player finishes; that period remains in the racing result.

Time Attack retained **4,004 raw rows**: 158 countdown, 3,800 racing and 46 finished. Its 157 non-null countdown intervals total 2.6498 seconds, mean 59.24975469846782 Hz, p95 16.8 ms, maximum 33.3 ms; **two countdown intervals exceed 25 ms**, none exceed 33.3334 ms. Cup retained **8,263 raw rows**: 164 countdown, 8,050 racing and 49 finished. Its 163 countdown intervals total 2.7166 seconds, mean 60.00147242877145 Hz, p95 16.7 ms and maximum 16.8 ms, with none above 25 ms. The first raw countdown row has no previous interval.

## Exact resolution progression

Adaptive mode remained enabled. Time Attack began at recorded quality level 2 and traversed levels 3–8, then returned through 7–0. Cup stayed at quality level 0, DPR 2, canvas 2880 × 1800 throughout its captured countdown, racing and finished rows.

| Time Attack transition | Race time, seconds | DPR | Canvas pixels | Quality level |
| --- | ---: | ---: | --- | ---: |
| First recorded countdown | 0 | 1.75 | 2520 × 1575 | 2 |
| Countdown | 0 | 1.625 | 2340 × 1462 | 3 |
| Countdown | 0 | 1.5 | 2160 × 1350 | 4 |
| Countdown | 0 | 1.375 | 1980 × 1237 | 5 |
| Racing | 0.75 | 1.25 | 1800 × 1125 | 6 |
| Racing | 1.666666667 | 1.125 | 1620 × 1012 | 7 |
| Racing minimum | 2.566666667 | 1 | 1440 × 900 | 8 |
| Racing recovery | 7.55 | 1.125 | 1620 × 1012 | 7 |
| Racing recovery | 11.55 | 1.25 | 1800 × 1125 | 6 |
| Racing recovery | 15.55 | 1.375 | 1980 × 1237 | 5 |
| Racing recovery | 19.55 | 1.5 | 2160 × 1350 | 4 |
| Racing recovery | 23.55 | 1.625 | 2340 × 1462 | 3 |
| Racing recovery | 27.55 | 1.75 | 2520 × 1575 | 2 |
| Racing recovery | 31.55 | 1.875 | 2700 × 1687 | 1 |
| Racing maximum | 35.55 | 2 | 2880 × 1800 | 0 |

The raw transitions preserve full-precision race times and RAF timestamps. Maximum reported whole-frame render submissions/triangles were **156 / 3,166,431** in Time Attack and **338 / 3,180,411** in Cup. These are renderer totals across the frame's passes, not a count of unique visible geometry.

## Player shadow and controller cost

The harness records renderer diagnostics roughly once per second and at resolution changes, not on every RAF. Across **68 Time Attack + 137 Cup samples**, all reported a **512** player-shadow atlas, **19** casters/draws, **13,204** drawn triangles and **0** omitted casters. There were **0 sampled failure values and 0 sampled skipped values**. This does not establish an every-frame failure census.

| Diagnostic | Time Attack | Cup |
| --- | ---: | ---: |
| Sampled shadow frame counter | 30 → 4,014 | 4,070 → 12,307 |
| Result snapshot frame counter | 4,032 | 12,331 |
| Counter monotonic across samples | Yes | Yes |
| Sampled CPU p50 / p95, ms | 0.1 / 0.2 | 0.1 / 0.2 |
| Maximum sampled CPU, ms | 0.3 | 0.2 |
| Lifetime CPU maximum at result, ms | 7.4 | 7.4 |

The lifetime peak includes startup and is not the sampled racing p95. These values measure CPU submission work, not GPU execution or visible shadow quality.

The input controller's included overhead was p50/p95/max **0.5 / 0.6 / 0.7 ms** in Time Attack and **0.4 / 0.5 / 0.7 ms** in Cup. Input counters for boost, drift, fire, mine, shield and reset were all zero. Trace rows were 48 and 111, with zero wrong-way trace rows. Cup's exposed event stream recorded 194 redline-surge events across the field. Base vehicle collision totals are unavailable in the review API and remain `null`, not zero.

## Functional outcome and cleanup

Time Attack produced a clean gold PB with ten sectors and a saved ghost. Cup produced a clean gold PB with twenty sectors; the player placed second and banked 12 points. The actual **Next event** button then opened `cup-foundry` in preparation with one Cup round retained. The harness also verified that the displayed finish-highlight clock matches the actual finish and that primary result actions fit the initial viewport.

The separate [Cup lifecycle report](CUP_CYCLE_ROUND19B.md) covers all three circuits, both visible replay actions and an actual completed first round of a new series. Its first case-sensitive label failure is preserved; it was not relabeled as a pass. The performance harness was not changed by that correction.

The parent explicitly released Blender/heavy work at 14:14:36 UTC. Performance began after the functional browser was closed, with its before-manifest at `2026-09-07T14:16:08.623463+00:00`. The after-manifest at `2026-09-07T14:19:54.768789+00:00` confirms all source files, the bundle, both harnesses and **21 public art files plus their 21 dist copies** were unchanged during measurement. Public/dist pairs all matched. The 20 round-18 art files remain identical; the sole addition is `machinery-paint.png`, SHA `63e7a4c2925352e1d38c0842b6b87a9bde1441a8097a075f85909d313698a894`.

The owned browser closed in `finally`; preview port **53015** had no listener afterward, and no Cup/performance/preview process remained. Browser, heavy-CPU and source/art/build freeze ownership was released after verification. No build, runtime change or asset edit occurred during these measurements.

Raw receipts, complete frame/resolution/event/controller arrays, screenshots, logs and manifests remain in the output directory; `analysis-summary.json` is a derived convenience file. This one local result cannot establish physical display presentation timing, GPU time, fixed-DPR-2 Time Attack performance, performance on other devices, human controller feel or long-term replay appeal.
