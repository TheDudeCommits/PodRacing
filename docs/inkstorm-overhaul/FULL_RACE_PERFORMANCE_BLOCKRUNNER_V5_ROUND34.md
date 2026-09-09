# Blockrunner round 34 — material/framing V5 technical evidence

**Attempt 1 remains partial: full races/Continue, seven staged cadence checks and Foundry context recovery PASS; the exact resource plateau gate FAILS.** All four owned browsers, servers, process groups and ports are closed. No retry, gate relaxation or resource-owner debugger instrumentation was used. This run does not establish a resource fix, art acceptance or human-driving acceptance.

The tested bundle is **`index-CFofn-oM.js`**, **1,620,221 bytes**, SHA256 **`2d8ff97639d335f22e1c683562c418d3f55572251f1b55dc71268bda015d264b`**. The [actual V5 verification log](../../output/gauntlet/round34-blockrunner-admission-v1/verify-material-framing-v5.log) records **671 tests / 120 executed files**, typecheck and build PASS. V5 changes Blockrunner's opt-in material response/palette, garage framing and portrait cap, and narrow garage layout. The final V6 GLBs, 4.8 m chase clearance, simulation and shader source remain the prior versions. [Thirteen separate V5 captures](../../output/gauntlet/round34-blockrunner-admission-v1/captures-material-framing-v5/receipts.json) completed with no errors; staged images are not timing evidence. The prior 6/10 art FAIL remains independent of technical results.

Actual garage selection loads the final **44,028-triangle hero, five opaque draws (one body/four pilot)**: 3,693,000 bytes, SHA256 `7eeca075e2a8ea9b1b11e381ff447d6ec7bb83d8f73f6ddb41f843b4cbadfeb4`. Ordinary Canyon Cup loads **ai-sola**, unchanged podracer/index 4, with the **29,682-triangle rival and the same five-draw structure**: 3,228,580 bytes, SHA256 `ae90b8f56c2ebca7e128aeee14c6a6e5c59d473a6a0898f8fc64dfbfc283342a`. Naturally served browser payloads match public/dist hashes and runtime statistics match GLB headers. Rax remains the procedural landspeeder. Time Attack has no Sola and makes no absent-rival request.

## Full races and clock scope

Both ordinary virtual-gamepad races finish naturally with valid gold results. The unchanged native mean ≥40 Hz, p95 ≤25 ms and 0.05 s start/finish coverage gates pass. The actual Continue action opens `cup-foundry`, championship round index 1, awaiting Start. It does not complete the second Cup race.

| Event | Player finish | Sectors | Racing intervals | Mean RAF Hz | p95 / p99 ms | Max ms | >25 / >33.3334 / >50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| time-attack | 63.725000 s | 10 | 3,794 | 59.516153 | 16.8 / 16.8 | 33.4 | 31 / 9 / 0 |
| cup-round-1 | 129.516667 s | 20 | 8,124 | 59.064521 | 16.8 / 33.3 | 33.5 | 129 / 42 / 0 |

Across **12,260 raw rows**, **11,918 racing intervals** contain **160 intervals >25 ms and zero >50 ms**. Native phase selection and raw interval math are unchanged. No diagnostic seek, pose/progress writes, interior filtering or warmup removal occurred in either full race.

Time Attack's last racing sample and player finish both read **63.724999999997024 s**; its intervals sum to **63747.40000000001 ms**. Cup player finish is **129.5166666667132 s**, while the ordinary classification grace keeps the collector in racing phase through **137.52500000003926 s**. Cup intervals sum to **137544.5 ms**, including **481 intervals ending after player finish**, totaling **8016.299999999988 ms**. The first can straddle finish. This is not 137.525 seconds of active player driving.

Countdown remains separate: Time Attack 159 intervals / 2,683.2 ms, Cup 159 / 2,666.5 ms. Each contains one interval >25 ms; the maxima are 50.0 and 33.3 ms, with zero >50 ms. Other phase rows remain in the raw data. Both races record zero boost/drift/fire/mine/shield/reset input samples and no observed wreck/recovery event; player crashCount is zero. Cup records 174 redline-surge events. Base collision counts are **unavailable, not zero**. Maximum controller observation overhead is 0.9000000059604645 ms for Time Attack and 0.7000000178813934 ms for Cup; it is included in the run.

[Time Attack raw data](../../output/playwright/round34-blockrunner-material-framing-v5-full-race-attempt1/time-attack.json) · [Cup raw data](../../output/playwright/round34-blockrunner-material-framing-v5-full-race-attempt1/cup-round-1.json) · [Continue/admission receipt](../../output/playwright/round34-blockrunner-material-framing-v5-full-race-attempt1/receipt.json).

Chrome **152.0.7977.77**, ANGLE Metal **Apple M4**, ten reported hardware threads; viewport **1440×900**, requested DPR **2**, adaptive governor enabled, no fixed-quality override. There are **209 resolution/renderer snapshots** (69 Time Attack, 140 Cup), taken on changes or about once per second.

| Collector | Observed DPR / canvas range | Quality levels | Max calls / submitted triangles | Sampled geometry / texture / program ranges |
| --- | --- | --- | --- | --- |
| Time Attack | 1–2 / 1440×900–2880×1800 | 0–8 | 100 / 4,919,217 | 122–127 / 56–60 / 47–50 |
| Cup | 1.75–2 / 2520×1575–2880×1800 | 0–2 | 254 / 5,029,755 | 207–350 / 104–178 / 48–50 |

DPR snapshot counts are not time-weighted. Submitted triangles include render passes, not unique source geometry. RAF intervals are not GPU durations; these results are not fixed-DPR 2 performance.

## Staged cadence and context recovery

All seven staged sections pass the unchanged p95 ≤25 ms gate: **361 intervals each, 2,527 total, zero >25 ms**. The original 1.5-second warmup and approximately six-second W-input sampler remain. These diagnostic placements cancel records and the vehicle can leave the starting section. The ending renderer values below are snapshots, not per-frame or fixed-DPR measurements.

| Starting section | Mean RAF Hz | p95 ms | Ending DPR | Calls / submitted triangles |
| --- | ---: | ---: | ---: | --- |
| 01-grid | 60.002659 | 16.7 | 1 | 59 / 1,337,217 |
| 02-salt-run | 60.002659 | 16.8 | 1.125 | 130 / 1,628,177 |
| 03-canyon | 60.001662 | 16.7 | 1.25 | 161 / 4,752,553 |
| 04-fork | 60.001662 | 16.7 | 1.375 | 63 / 1,786,119 |
| 05-launch | 60.001662 | 16.8 | 1.5 | 92 / 1,371,383 |
| 06-foundry | 60.001662 | 16.7 | 1.625 | 63 / 1,786,119 |
| 07-finish | 60.002659 | 16.8 | 1.75 | 65 / 1,639,091 |

[All staged raw intervals](../../output/playwright/round34-blockrunner-material-framing-v5-staged-attempt1/section-performance.json).

[Foundry context recovery](../../output/playwright/round34-blockrunner-material-framing-v5-context-attempt1/receipt.json) passes the original three-second suspension, frozen-simulation, history reset, shadow recovery, incomplete-player-framebuffer fallback and explicit recovery gates. The existing readiness V2 condition reaches **11 samples from 9**, preserving `cadenceSamples > 10`; no new wait was added. Restoration resets cadence history to zero. The recorded resumed cadence is **16.599999999998545 ms**, below the native 250 ms limit. Scenery bakes progress **3→4→6** and racer-shadow frames **356→360→372**.

Actual service gantry V3 is **1,327,988 bytes**, SHA256 `55d694f8406d9a2ff819ba7d262d86e30f0bc8bafd543699a8ceff83da2380b4`, with **192 warm color records**. The unchanged viewport GL observer finds a linked warm-emission program and submitted draws before restoration, after restoration, during fallback and after final recovery. This is shader/submission evidence, not a radiance or pixel-brightness assertion. Browser error arrays are empty.

## Resource failure retained

The resource check ran **first**, without the earlier CDP owner observer, and retained **three cycles, seven sections, 25 samples and the exact cycle 2→3 plateau gate**. Actual Blockrunner hero/Sola rival readiness and served hashes passed before cycling.

| Sample comparison, cycle 3 minus cycle 2 | Geometries | Textures | Programs |
| --- | ---: | ---: | ---: |
| Each corresponding grid–finish stage | +1 | +2 | 0 |
| Final garage | 0 | 0 | 0 |

Cycle 1 peaks/ends at **216 / 108 / 50**; cycles 2 and 3 peak/end at **217 / 110 / 50**. The additional geometry and two textures appear at the second garage return. Equal final garage totals do not satisfy the stage-by-stage gate. The native assertion fails, with no page errors, retry, extra cycles or delayed-sample replacement. The owner and cause remain unresolved; counters alone do not establish a leak.

[V5 failed resource receipt](../../output/playwright/round34-blockrunner-material-framing-v5-resources-attempt1/receipt.json) · [V3 partial checkpoint, unchanged](FULL_RACE_PERFORMANCE_BLOCKRUNNER_ROUND34.md) · [Earlier instrumented nonreproduction and its limitations](../../output/playwright/round34-blockrunner-resource-owner-diagnostic-attempt1/ANALYSIS-v1.md). The V3 +2 geometry/+2 texture failure, its imperfect observer trace and this V5 +1/+2 failure remain separate evidence. No causal repair or proof of absence is claimed.

## Frozen identity and cleanup

The [new V5 runtime inventory](../../output/gauntlet/round34-blockrunner-material-framing-v5-attempt1-frozen-runtime/inventory.json) preserves **503 files / 178,375,074 bytes**: **142 source, 43 public, 49 complete dist, 126 harness, six configuration and 137 physical test files**. The test inventory includes fixtures/support and differs from 120 executed test files. All copied hashes were independently reverified. Inventory SHA256: **`ad4f840b52540f406f69e3e3d0004e24a3297c9e630d588e0ebe8d36e22e0bdc`**.

All **30 saved manifests match every group exactly**: full races 6, staged 16, context 5, resources 3. The failed resource assertion precedes its final inner boundary; no success boundary is invented. All 126 harness entries also remain byte-identical to the V3 frozen checkpoint. The [128-file evidence inventory](../../output/gauntlet/round34-blockrunner-material-framing-v5-attempt1-frozen-runtime/verification-evidence-inventory.json) pins actual raw runs, cleanup, V5 captures/verify log and final V6 package receipts.

The [independent aggregate](../../output/playwright/blockrunner-material-framing-v5-attempt1-round34-verification-summary.json), **111,817 bytes**, SHA256 **`e0a96666e41128bf73727381163cc0cf8f5aafbc1e45f5e141f2829db5af6fa1`**, recomputes every adjacent RAF difference, race/countdown summary and staged summary exactly. The [analysis](../../output/playwright/blockrunner-material-framing-v5-round34-analysis-partial-attempt1.py) uses sequential `+=` matching JavaScript's left fold and `floor((N−1)×q)` quantiles, without tolerance or filtering. Later working-tree changes cannot inherit this frozen V5 result.

| Check, execution order | Outcome | Closed owned port | Cleanup UTC, 8 Sep 2026 |
| --- | --- | ---: | --- |
| Resources | FAIL | 59328 | 15:03:23.184253 |
| Full races / Continue | PASS | 59412 | 15:07:47.797492 |
| Seven staged sections | PASS | 59575 | 15:09:37.182413 |
| Foundry context | PASS | 59647 | 15:10:34.564041 |

Every adapter awaited browser closure and direct preview exit. Wrapper checks found no residual owned PID, process group or listener, and used no fallback kill actions. Port 5211 was neither adopted nor signalled. This is not a complete four-check pass, all-family race matrix, human-driving or art approval, commit, push or deployment.
