# Blockrunner round34 — final framing V3 technical evidence

**Attempt 1 is incomplete: full races/Continue, seven staged sections and Foundry context recovery PASS; the resource plateau check FAILS.** All four owned browsers, servers, process groups and ports are closed. The failure remains preserved; no gate was relaxed, sample removed or retry substituted. This is local technical evidence, not art or human-driving acceptance.

Tested bundle: **`index-Cnysa7ZZ.js`**, **1,619,624 bytes**, SHA256 **`10ef7eb7189f407f530f73e802cdbc59acc1ebd47f5cfb2a26e3341e3b9bb04e`**. The actual [final verification log](../../output/gauntlet/round34-blockrunner-admission-v1/verify-framing-v3.log) records typecheck/build and **671 tests / 120 executed files PASS**. Earlier framing builds were not benchmarked here. The [separate final capture](../../output/gauntlet/round34-blockrunner-admission-v1/captures-framing-v3/receipts.json) contains thirteen staged images and no errors; it is separate from these timing runs.

The visible garage selection loaded the final V6 Blockrunner hero: **44,028 triangles, five opaque draws (one body/four pilot)**, 3,693,000 bytes, SHA256 `7eeca075e2a8ea9b1b11e381ff447d6ec7bb83d8f73f6ddb41f843b4cbadfeb4`. Ordinary Canyon Cup loaded actual **ai-sola**, unchanged podracer/index 4, with the **29,682-triangle, five-draw rival**, 3,228,580 bytes, SHA256 `ae90b8f56c2ebca7e128aeee14c6a6e5c59d473a6a0898f8fc64dfbfc283342a`. Passive browser-response hashes match the final public/dist files; actual presentation statistics match their GLB headers exactly. Rax remains the class-gated procedural landspeeder. Time Attack neither contains Sola nor requests the absent rival. [Actual admission receipts](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/receipt.json).

## Full races and actual clock scope

Both ordinary virtual-gamepad races finish naturally with valid gold results and zero invalidation. The native mean ≥40 Hz, p95 ≤25 ms and 0.05 s start/finish-coverage rules pass. Actual Continue opens `cup-foundry`, championship round index 1, awaiting Start; the second Cup race was not completed.

| Event | Player finish | Valid sectors | Racing intervals | Mean RAF Hz | p95 / p99 ms | Max ms | >25 / >33.3334 / >50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Flagship Time Attack | 63.750000 s | 10 | 3,793 | 59.500373 | 16.8 / 16.8 | 33.4 | 32 / 15 / 0 |
| Canyon Cup, round 1 | 129.675000 s | 20 | 8,142 | 59.138075 | 16.8 / 33.3 | 33.4 | 119 / 31 / 0 |

Across **12,270 raw rows**, **11,935 racing intervals** contain **151 intervals >25 ms and zero >50 ms**. The original controller, raw collector, phase selection and native acceptance math remain unchanged. No capture seeking, pose/progress writes, interior filtering or warmup removal occurred in the full races.

Time Attack's last racing sample is **63.73333333333036 s**, versus player finish **63.74999999999702 s**; the 0.016667 s difference satisfies the existing coverage rule. Its racing intervals sum to **63,747.5 ms**. Cup finishes at **129.6750000000464 s**, while ordinary classification grace keeps the racing-phase collector through **137.68333333337245 s**; its intervals sum to **137,677.80000000002 ms**. **481 intervals end after the player finish**, totaling **8,016.200000000012 ms**. The first may straddle finish. This is not 137.683 s of active player driving.

Countdown remains separate: 159 intervals / 2,666.6 ms for Time Attack and 163 / 2,733.199999999997 ms for Cup, each with one interval >25 ms and none >50 ms. Other phase rows remain preserved. Both races record zero boost/drift/fire/mine/shield/reset input samples. No wreck/recovery event was observed; player crashCount is zero. Cup records 178 redline-surge events. Base suspension/racer collision counts are **unavailable, not zero**. Controller observation overhead is included, with maxima 0.800000011920929 and 0.699999988079071 ms.

[Time Attack raw data](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/time-attack.json) · [Cup raw data](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/cup-round-1.json) · [Continue image](../../output/playwright/round34-blockrunner-final-framing-v3-full-race-attempt1/cup-continue-foundry.png).

Local Chrome **152.0.7977.77**, ANGLE Metal **Apple M4**, ten reported hardware threads; viewport **1440×900**, requested DPR **2**, adaptive governor enabled, no fixed-quality override. **209 resolution/renderer snapshots** are retained (69 Time Attack, 140 Cup), sampled on resolution changes or about once per second.

| Collector | Observed DPR / canvas range | Quality levels | Max calls / submitted triangles | Sampled geometry / texture / program ranges |
| --- | --- | --- | --- | --- |
| Time Attack | 1–2 / 1440×900–2880×1800 | 0–8 | 100 / 4,919,217 | 122–127 / 56–60 / 47–50 |
| Cup | 1.75–2 / 2520×1575–2880×1800 | 0–2 | 254 / 5,029,751 | 207–369 / 104–188 / 48–50 |

DPR snapshot counts are not a time-weighted distribution. Submitted triangles include render passes, not unique source geometry. These results do not establish fixed-DPR 2 performance, GPU duration or a scene-geometry budget pass.

## Staged, recovery and resource results

All seven staged sections pass the unchanged p95 ≤25 ms gate: **361 measured intervals each, 2,527 total, zero >25 ms**. The original 1.5 s warmup and approximately six-second sampler remain. These use diagnostic placements followed by live W input; the vehicle may leave its starting section, and staging cancels records. Ending DPR progresses **1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75**; these are ending snapshots, not fixed-DPR 2 measurements. Mean RAF rates are 60.001662–60.002659 Hz; p95 is 16.7–16.8 ms. [All raw section intervals](../../output/playwright/round34-blockrunner-final-framing-v3-staged-attempt1/section-performance.json).

[Foundry context recovery](../../output/playwright/round34-blockrunner-final-framing-v3-context-attempt1/receipt.json) passes all original suspension, frozen-simulation, history-reset, shadow, injected incomplete-framebuffer fallback and explicit recovery assertions. The existing readiness V2 wait reaches **11 samples from 9**, retaining `cadenceSamples > 10`. The restoration boundary resets cadence samples to zero; the recorded resumed cadence is **16.700000000000728 ms**, within the unchanged <250 ms gate. Scenery bakes advance **3→4→6**, racer-shadow frames **356→360→370**. The actual service-gantry V3 response matches **1,327,988 bytes**, SHA256 `55d694f8406d9a2ff819ba7d262d86e30f0bc8bafd543699a8ceff83da2380b4`, with **192 warm color records**. Linked warm programs and positive submitted geometry are observed before and after restoration; this is not emitted-pixel or visual acceptance. Browser error arrays are empty.

The [resource attempt](../../output/playwright/round34-blockrunner-final-framing-v3-resources-attempt1/receipt.json) preserves the original **three cycles, seven sections and 25 samples**, with actual Blockrunner hero and Sola rival. Its exact cycle2→cycle3 plateau gate **fails**:

| Sample scope | Geometries delta | Textures delta | Programs delta |
| --- | ---: | ---: | ---: |
| Each of seven corresponding grid–finish stages | +2 | +2 | 0 |
| Final garage | 0 | 0 | 0 |

Cycle 1 peaks/ends at **216 / 108 / 50**; cycles 2 and 3 peak/end at **218 / 110 / 50**. The two additional geometry/texture resources appear at cycle 2's garage return. No browser error is recorded. Equal garage totals do not satisfy the stage-by-stage gate. The cause remains under investigation; renderer counters alone do not establish a leak. No extra cycle, delayed-sample substitution or gate relaxation was applied.

## Frozen evidence and closed ownership

The [attempt1 runtime inventory](../../output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime/inventory.json) preserves **503 files / 178,371,665 bytes**: **142 source, 43 public, 49 complete dist, 126 harness, six configuration and 137 physical test files**. Physical test inventory includes fixtures/support and differs from the 120 executed files. All copied hashes were independently reverified. Inventory SHA256: **`fb8b4b820300b830cf7732974af714549de6935abbbc6b8e913af17f2298613c`**.

All **30 saved manifests match every group exactly**: full-race 6, staged 16, context 5, resources 3. The resource assertion occurs before its final inner boundary; that missing success boundary is not invented. The [127-file evidence inventory](../../output/gauntlet/round34-blockrunner-final-framing-v3-attempt1-frozen-runtime/verification-evidence-inventory.json) pins raw runs, cleanup, final capture, actual verification log and V6 package receipts.

The [independent aggregate](../../output/playwright/blockrunner-final-framing-v3-attempt1-round34-verification-summary.json), **111,439 bytes**, SHA256 **`ee09ed352d1cea6c4cf480dc1797a4168148299ce98d98e3ecf3f2e2c31884c9`**, recomputes every raw adjacent RAF difference, race/countdown summary and staged summary exactly. [Reproducible analysis](../../output/playwright/blockrunner-final-framing-v3-round34-analysis-attempt1.py) uses sequential `+=` to match JavaScript's left fold and `floor((N−1)×q)` quantiles, with no tolerance or frame filtering. It reads saved evidence and frozen copies; later working-tree changes cannot inherit these results.

| Check | Outcome | Closed owned port | Cleanup UTC, 8 Sep 2026 |
| --- | --- | ---: | --- |
| Full races / Continue | PASS | 57957 | 14:22:08.996732 |
| Seven staged sections | PASS | 58081 | 14:23:52.248620 |
| Foundry context recovery | PASS | 58140 | 14:25:11.000979 |
| Resource cycles | FAIL | 58181 | 14:26:02.246752 |

Every adapter awaited browser closure and direct preview exit. Wrapper checks found no residual owned PID, process group or listener and used no fallback kill actions. Port 5211 was neither adopted nor signalled. Previous checkpoints and failed attempts remain intact. No complete four-check pass, all-family performance matrix, art approval, commit, push or deployment is claimed.
