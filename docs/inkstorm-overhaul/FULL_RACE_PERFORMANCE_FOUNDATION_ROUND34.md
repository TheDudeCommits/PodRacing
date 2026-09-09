# Round34 foundation material V1 — technical verification

**All four checks PASS on their first foundation-build attempts.** On 8 September 2026, the exact foundation-material V1 build completed two ordinary Polwo races and actual Cup Continue, seven staged Polwo section checks, Foundry context recovery using the existing readiness V2 adapter, and three original resource cycles. All owned browsers, preview servers, process groups and ports are closed. This is representative local technical evidence, not visual acceptance or a repeat of the three-appearance/six-race matrix.

Tested bundle: **`index-DAcqiho8.js`**, **1,617,115 bytes**, SHA256 **`3c07cc90bad7f90167eec60765c0f90e62ce88a990e662de6b8651905994433a`**. Root reported preceding `npm run verify` PASS: typecheck, build and **648 tests / 117 executed test files**. The [separate thirteen-image capture](../../output/gauntlet/round-34-foundation-material-v1/receipts.json) has its own [cleanup receipt](../../output/gauntlet/round-34-foundation-material-v1/cleanup.json). Every invocation matched the actual browser-served bundle to the expected SHA. These passes cover the frozen foundation V1 files only; later changes require separate evidence.

## Ordinary full races and clock scope

The accepted flow selected actual Polwo in the garage, waited for ready art/decoded preview, clicked Start and drove through ordinary virtual-gamepad input to natural finishes. Both results are valid gold. Actual Continue opened `cup-foundry`, championship round index 1, awaiting Start. It did not complete the second Cup round.

| Polwo event | Player finish | Valid sectors | Racing intervals | Mean RAF Hz | p95 / p99 ms | Maximum ms | >25 / >33.3334 / >50 ms |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| Flagship Time Attack | 63.758333 s | 10 | 3,792 | 59.453722 | 16.8 / 16.8 | 33.4 | 35 / 9 / 0 |
| Canyon Cup, round 1 | 131.008333 s | 20 | 8,195 | 58.945046 | 16.8 / 33.3 | 50.0 | 146 / 58 / 0 |

The unchanged native gate requires mean ≥40 Hz, p95 ≤25 ms and the existing 0.05 s launch/finish coverage rule. Both pass. Across the two collectors, **12,356 raw rows** contain **11,987 racing intervals**, **181 intervals >25 ms**, and **zero >50 ms**. The exact 50 ms Cup interval remains included. These are not hitch-free or per-frame threshold claims.

Time Attack finishes at **63.758333333330356 s**, matching its final racing snapshot; its racing interval sum is **63,780.7 ms**. The Cup player finishes at **131.00833333337852 s**, while ordinary classification grace keeps the collector in the racing phase through **139.01666666670457 s**; its interval sum is **139,027.8 ms**. **481 Cup intervals end after the player finish**, totaling **8,016.3000000000175 ms**. The first can straddle the finish because classification uses its ending snapshot. This is not 139.017 s of active player driving. The native collector retains that span without exclusions.

Countdown is separate. Time Attack records 161 intervals / 2,699.9 ms, mean 59.631838 Hz, p95 16.7 ms, maximum 33.3 ms; Cup records 162 / 2,716.5 ms, mean 59.635560 Hz, p95 16.7 ms, maximum 33.3 ms. Each includes one interval >25 ms and none >50 ms. Other phase rows remain in the raw record; native phase selection is unchanged.

No capture seeking/stepping, pose/progress writes, warmup removal or interior filtering occurred in these races. The original `cadenceSummary`, `startDriver` controller/raw collector, `finishRun`, cadence gate and result-clock gate remain byte-identical to their accepted versions. Controller/read-only snapshot overhead is included; maxima were 1.0999999940395355 ms and 0.699999988079071 ms.

Both races recorded zero boost, drift, fire, mine, shield and reset input samples. Time Attack's observed event map is empty. Cup records 208 `redline-surge` events and one **AI Sola impact wreck**, `recovery-start` at frame 16750 and `recovered` at frame 17009. The player's final wreck snapshot is running with crashCount 0. Base suspension/racer collision counts are **unavailable, not zero**. The observed AI recovery remains part of the evidence; these automated laps do not establish human driving feel or visible ghost geometry.

Evidence: [full-race receipt](../../output/playwright/full-race-performance-round34-polwo-foundation-material-v1/receipt.json), [Time Attack raw data](../../output/playwright/full-race-performance-round34-polwo-foundation-material-v1/time-attack.json), [Cup raw data](../../output/playwright/full-race-performance-round34-polwo-foundation-material-v1/cup-round-1.json), [actual Continue image](../../output/playwright/full-race-performance-round34-polwo-foundation-material-v1/cup-continue-foundry.png).

## Actual renderer profile

Local Chrome **152.0.7977.77**, macOS arm64, ANGLE Metal **Apple M4**, ten reported hardware threads; viewport 1440×900, requested DPR 2. There is **no fixed-quality override**. The adaptive governor stays enabled. The full-race collectors retain **211 renderer/resolution/shadow snapshots**: 69 for Time Attack and 142 for Cup, sampled on resolution changes or about once per second.

| Collector | Observed DPR / canvas range | Quality levels observed | Native maximum calls / triangles | Sampled geometry /texture /program ranges |
| --- | --- | --- | --- | --- |
| Time Attack | 1–2 / 1440×900 to 2880×1800 | 0–8 | 108 / 4,926,661 | 126–131 / 64–68 / 48–51 |
| Cup round 1 | 1.75–2 / 2520×1575 to 2880×1800 | 0–2 | 265 / 5,027,537 | 212–358 / 115–194 / 49–51 |

Time Attack observes all 0.125 DPR increments from 1 through 2; Cup observes 1.75, 1.875 and 2. Exact dimensions and state counts are retained in the aggregate. Snapshot counts are not time-weighted or a per-frame DPR distribution. Renderer triangles/calls include collected frames and phases, not unique source geometry. Memory figures are object/program counters, not GPU bytes or a leak diagnosis. These results do not establish fixed-DPR 2 performance, GPU execution duration, physical presentation timing, universal-device FPS or a 600k geometry-budget pass.

## Seven staged Polwo sections

All seven pass the unchanged p95 ≤25 ms gate, with 361 measured intervals each, **2,527 total**, and **zero >25 ms**. The existing sampler performs seven separate capture placements followed by live simulation/W input, the original 1.5 s warmup and approximately six measured seconds. Actual Polwo is ready first. Raw intervals are retained.

| Staged start | Mean RAF Hz | p95 ms | Ending DPR | Ending calls / triangles |
| --- | ---: | ---: | ---: | --- |
| Grid | 60.002659 | 16.7 | 1 | 67 / 1,340,515 |
| Salt run | 60.002659 | 16.8 | 1.125 | 141 / 1,620,093 |
| Canyon | 60.001662 | 16.8 | 1.25 | 169 / 4,755,851 |
| Fork | 60.003657 | 16.7 | 1.375 | 71 / 1,789,417 |
| Launch | 60.002659 | 16.7 | 1.5 | 100 / 1,430,681 |
| Foundry | 60.002659 | 16.7 | 1.625 | 71 / 1,789,417 |
| Finish | 60.002659 | 16.7 | 1.75 | 73 / 1,642,389 |

These renderer/DPR values are ending snapshots. The vehicle may have left its starting section during sampling; there is no claim that every interval remained in that section. Capture staging cancels records. These are not a continuous lap or fixed-DPR 2 proof. This separate staged session reaches 389 geometries / 210 textures / 51 programs in its final snapshots; it is distinct from the resource-cycle flow below. [Section raw intervals and snapshots](../../output/playwright/inkstorm-performance-round34-polwo-foundation-material-v1/section-performance.json).

## Foundry context and resource checks

The [Foundry context receipt](../../output/playwright/inkstorm-context-recovery-round34-foundry-polwo-foundation-material-v1/receipt.json) passes on its first foundation-build attempt using the **already-preserved readiness V2 adapter**. No harness revision or gate relaxation was made for this build. The prior corridor-build failure at ten cadence samples remains in the [earlier round34 report](FULL_RACE_PERFORMANCE_ROUND34.md), not as a foundation failure or a hidden discarded attempt.

The readiness requirement remains `cadenceSamples > 10` after diagnostic Foundry staging. Before/after readiness snapshots both have **11 samples**, raceTime 0.3000000000000001 s; the condition was already satisfied and the bounded wait did not need to delay this attempt. All original three-second context suspension, frozen-simulation, cadence-history reset, shadow recovery and injected incomplete-player-framebuffer fallback/recovery assertions pass.

The restoration boundary records zero cadence samples; the subsequent recorded cadence interval is **233.22000000000116 ms**, within the unchanged <250 ms recovery gate. This is not a no-hitch assertion. Scenery-shadow bakes progress 3→4→6 and racer-shadow frames 354→357→367 across pre-loss, first recovery and final recovery. Page/console error arrays are empty.

The actual browser response for **`/assets/inkstorm/foundry-service-gantry-v3.glb`** matches **1,327,988 bytes**, SHA256 **`55d694f8406d9a2ff819ba7d262d86e30f0bc8bafd543699a8ceff83da2380b4`**, and the CPU preflight finds exactly **192 warm palette records** among 33,518 primitive color records. The [preflight receipt](../../output/playwright/inkstorm-context-recovery-round34-foundry-polwo-foundation-material-v1/foundry-asset-preflight.json) and served hash are retained. V2 is not substituted.

Transparent viewport-only WebGL observation forwards original calls and verifies successfully linked `INKSTORM_FOUNDRY_EMISSION` programs plus positive geometry submission. It observes three new warm draws after staging, followed by 3, 26 and 5 warm-program draws in the three restoration epochs. This is submitted shader/geometry evidence, not emitted-pixel brightness, foundation-paint appearance or art acceptance. Diagnostic staging cancels competitive records and is separate from ordinary race cadence.

The [resource receipt](../../output/playwright/inkstorm-resource-cycles-round34-foundation-material-v1/receipt.json) retains the original **default Teemto player and actual Cup roster**, three seven-section/garage loops, identity/shadow checks and exact cycle2→cycle3 plateau gate. All **25 samples** pass. Every cycle's peak and final garage counters are **213 geometries / 115 textures / 52 programs**, and all eight stage deltas are exactly zero. This is specific renderer-counter stability for that sequence, not GPU-byte/heap measurement, a complete leak proof or Polwo-only resource stress. Staging changes the competition profile to chaos and cancels records.

## Frozen artifacts and independent audit

The [complete foundation snapshot](../../output/gauntlet/round34-foundation-material-v1-frozen-runtime/inventory.json) preserves **474 files / 164,288,407 bytes**: 142 source, 41 public, 47 complete dist, 107 harness, six configuration and 131 physical test files. The 131-file inventory includes support files; it is separate from 117 executed test files. All live and copied hashes matched the measurement manifests. Unrelated source assets and bulk output were excluded. Inventory SHA256: **`24afaafb774da7a98e6f456762cfeee2823ae8fb3e15e6091172f94b35c27f31`**. The [evidence inventory](../../output/gauntlet/round34-foundation-material-v1-frozen-runtime/verification-evidence-inventory.json) pins 101 files across the four runs, preparation and separate capture.

All **24 saved manifests agree on build/source/public/dist/configuration/tests**. Nineteen full-race/staged/resource manifests have the same 102 harness entries; five context manifests have those exact 102 plus five existing readiness V2 files, for 107. Their union is copied in the main snapshot. It would be false to call all 24 complete manifests identical; the documented difference is confined to those five added harness files.

The [independent summary and per-run file SHA inventory](../../output/playwright/foundation-material-v1-round34-verification-summary.json) is **75,275 bytes**, SHA256 **`3f9d5742806f109a8c4e2bdbee03ac457b09ef2272746d5c1d213aeea76a3c72`**. Its [reproducible analysis](../../output/playwright/foundation-round34-analysis.py) rehashes all 474 frozen files, checks manifest differences, verifies every adjacent RAF timestamp difference, and recomputes every race/countdown and staged summary exactly. Sequential `+=` matches JavaScript's left-to-right `reduce`; quantiles use `floor((N−1)×q)`. There is no tolerance, rounding-based equality or frame filtering. Only saved evidence and frozen files are read, so later working-tree edits cannot inherit these passes.

## Closed ownership and scope

| Attempt | Outcome | Owned port | Final cleanup UTC |
| --- | --- | ---: | --- |
| Polwo full races / Continue | PASS | 53481 | 11:52:22.840082 |
| Seven Polwo sections | PASS | 53648 | 11:53:43.726832 |
| Readiness V2 Foundry context | PASS | 53723 | 11:54:30.977493 |
| Original resource cycles | PASS | 53775 | 11:55:37.542661 |

Every attempt records awaited browser close and direct preview exit, no residual owned PIDs/process group/listener and no fallback kill actions. Dynamic ports were explicit with strict-port preview. Port 5211 was never adopted or signalled. No browser failures or reruns occurred on this foundation build. Runtime/public/build files were held through all checks and frozen before root was told later work could resume.

Existing wrappers, [native adapter provenance](../../output/playwright/round34-performance-adapter-provenance.json), [readiness V2 provenance](../../output/playwright/round34-context-readiness-adapter-provenance.json), [run plan](../../output/playwright/foundation-material-v1-round34-run-plan.json), previous failures and previous reports remain preserved. The prior `FULL_RACE_PERFORMANCE_ROUND34.md` was not overwritten. No art approval, human acceptance, complete fleet validation, commit, push or deployment is claimed.
