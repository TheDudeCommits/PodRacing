# Round34 V1 — race cadence, Foundry recovery and resource evidence

**Technical checks PASS after a preserved context-readiness retry.** On 8 September 2026, the frozen corridor/effects V1 build completed two ordinary Polwo races, actual Cup Continue, seven staged Polwo section checks and three original resource cycles. The initial Foundry context attempt failed before context loss at its cadence-history prerequisite. A separate adapter revision retained that assertion, added a bounded wait for the same prerequisite and passed all original recovery/fallback checks. Both attempts and their cleanup receipts remain available. This report makes no art-acceptance claim.

Exact tested bundle: **`index-CV-CIBxc.js`**, **1,614,359 bytes**, SHA256 **`080280e5f7ea965d9d2343c13292dcf81abc89a63da8b40cb7c5e91143be887d`**. Root reported preceding `npm run verify` PASS: typecheck, build, **645 tests / 116 executed test files**. The [thirteen-image capture receipt](../../output/gauntlet/round-34-corridor-effects-v1/receipts.json) and [capture cleanup](../../output/gauntlet/round-34-corridor-effects-v1/cleanup.json) are separate evidence. Every test invocation verified the exact browser-served entry bundle. These results cover the frozen V1 files; later source, public or bundle changes require their own evidence.

## Ordinary full races

The accepted controller selected Polwo through the garage, waited for ready runtime art and decoded preview, used ordinary Start and drove through the live virtual-gamepad input. Both races finished naturally with valid results. The actual Continue action then opened `cup-foundry`, championship round index 1, awaiting Start. The second Cup round was not driven.

| Polwo event | Player finish | Sectors / medal | Racing intervals | Mean RAF Hz | p95 / p99 ms | Maximum ms | >25 / >33.3334 / >50 ms |
| --- | ---: | --- | ---: | ---: | --- | ---: | --- |
| Flagship Time Attack | 63.741667 s | 10 valid / gold | 3,791 | 59.469092 | 16.8 / 16.8 | 33.5 | 34 / 14 / 0 |
| Canyon Cup, round 1 | 129.833333 s | 20 valid / gold | 8,127 | 58.950639 | 16.8 / 33.3 | 50.0 | 144 / 54 / 0 |

Both pass the unchanged native gate: mean ≥40 Hz, p95 ≤25 ms and the existing 0.05 s launch/finish coverage rule. Across the two collectors, **12,303 raw rows** contain **11,918 racing intervals**, **178 intervals >25 ms** and **zero >50 ms**. An exact 50 ms Cup interval remains included. These results do not mean every interval met the p95 threshold or that rendering was hitch-free.

Time Attack's authoritative finish and last racing snapshot are both **63.74166666666369 s**; its interval total is **63,747.4 ms**. The Cup player finishes at **129.83333333337958 s**, while the collector continues through ordinary result-classification grace to **137.84166666670563 s**. Its racing interval total is **137,861.1 ms**. **481 Cup intervals end after the player's finish**, totaling **8,016.3000000000175 ms**; the first can straddle the finish because classification uses the ending snapshot. This is not 137.842 seconds of active player driving. None of these intervals were removed from the native result.

Countdown is separate: Time Attack records 160 intervals / 2,699.9 ms, mean 59.261454 Hz, p95 16.8 ms, maximum 50 ms; Cup records 162 / 2,716.5 ms, mean 59.635560 Hz, p95 16.7 ms, maximum 33.2 ms. Each includes one interval >25 ms and none >50 ms. Raw rows also retain phases outside countdown/racing; phase selection follows the original collector and summary code.

The full-race `cadenceSummary`, `startDriver` controller/raw collector, `finishRun`, imported cadence gate and result-clock gate remain byte-identical to the accepted versions. No capture seek/step, pose/progress mutation, warmup removal or interior-frame filtering occurred in these races. Controller and read-only snapshot overhead remains included; measured controller maxima were 1.300000011920929 ms and 0.7000000178813934 ms. Both races recorded zero boost, drift, fire, mine, shield and reset input samples. The Cup event stream records 176 `redline-surge` events; Time Attack's observed event map is empty. Base suspension/racer collision counts are **unavailable, not zero**. This automated flow does not establish human driving feel or visible ghost geometry.

Evidence: [full-race receipt](../../output/playwright/full-race-performance-round34-polwo-corridor-effects-v1/receipt.json), [Time Attack raw data](../../output/playwright/full-race-performance-round34-polwo-corridor-effects-v1/time-attack.json), [Cup raw data](../../output/playwright/full-race-performance-round34-polwo-corridor-effects-v1/cup-round-1.json), [actual Continue image](../../output/playwright/full-race-performance-round34-polwo-corridor-effects-v1/cup-continue-foundry.png).

## Actual rendering profile

Local Chrome **152.0.7977.77**, macOS arm64, ANGLE Metal **Apple M4**, ten reported hardware threads, viewport 1440×900, requested DPR 2. **No fixed-quality override** was applied. The native adaptive governor remained enabled. There are **211 renderer/resolution/shadow snapshots**: 69 for Time Attack and 142 for Cup, collected on resolution changes or about once per second.

| Collector | Observed DPR | Observed canvas range | Quality levels observed | Native maximum calls / triangles |
| --- | --- | --- | --- | --- |
| Time Attack | 1–2 | 1440×900 to 2880×1800 | 0–8 | 108 / 4,926,661 |
| Cup round 1 | 1.75–2 | 2520×1575 to 2880×1800 | 0–2 | 265 / 5,031,589 |

Time Attack snapshots include each 0.125 DPR step from 1 through 2; Cup includes 1.75, 1.875 and 2. The aggregate retains exact width/height/DPR states and observation counts. Those counts are not time-weighted or a per-frame DPR distribution. Observed renderer-memory ranges were 126–131 geometries / 64–68 textures / 48–51 programs for Time Attack and 212–358 / 115–194 / 49–51 for Cup. These are sampled object/program counters, not GPU bytes or a leak diagnosis.

The triangle/call extrema are renderer counters across collected frames and phases, not unique source mesh counts. No fixed-DPR 2, GPU-duration, physical-presentation or universal-device FPS claim follows. These counts do not meet or redefine a 600k geometry target. The two Polwo races are representative V1 evidence, not a repeat of the round32 three-appearance/six-race matrix or proof of performance parity with another build.

## Seven staged Polwo sections

The original staged sampler and p95≤25 ms gate are unchanged. Each section is independently placed through capture controls, then live simulation runs with W input, the original 1.5 s warmup and approximately six measured seconds. Actual Polwo is ready before sampling. Each section contains 361 intervals, for **2,527 total**, with **zero intervals >25 ms**; all seven pass.

| Staged start | Mean RAF Hz | p95 ms | Ending DPR | Ending calls / triangles |
| --- | ---: | ---: | ---: | --- |
| Grid | 60.001662 | 16.7 | 1 | 66 / 1,340,115 |
| Salt run | 60.001662 | 16.7 | 1.125 | 141 / 1,620,093 |
| Canyon | 60.002659 | 16.8 | 1.25 | 168 / 4,755,439 |
| Fork | 60.002659 | 16.7 | 1.375 | 71 / 1,789,417 |
| Launch | 60.001662 | 16.8 | 1.5 | 99 / 1,374,281 |
| Foundry | 60.001662 | 16.7 | 1.625 | 71 / 1,789,417 |
| Finish | 60.003657 | 16.7 | 1.75 | 72 / 1,641,989 |

DPR and renderer counters above are ending snapshots only. The ending vehicle location may differ from its starting section; this test does not prove every sampled frame remained in that section. Staging cancels competitive records. These are seven separate starts, not continuous driving or fixed-DPR 2 evidence. The distinct staged session reaches 389 geometries / 210 textures / 51 programs by its final snapshots; it is not the resource-cycle test below. [Section receipt, exact raw intervals and ending snapshots](../../output/playwright/inkstorm-performance-round34-polwo-corridor-effects-v1/section-performance.json).

## Preserved context failure and bounded retry

The [initial context receipt](../../output/playwright/inkstorm-context-recovery-round34-foundry-polwo-corridor-effects-v1/receipt.json) failed at **`No pre-suspension cadence history`**. Its snapshot contained exactly **10 cadence samples**, raceTime 0.2833333333333334 s, last cadence 16.8 ms. It had loaded the correct gantry, linked the warm-emission program, submitted new warm draws and passed the preceding shadow readiness checks. Page/console error arrays were empty. **Context loss had not occurred**, so this attempt establishes no restoration result. Browser, preview, process group and owned port 52442 were closed.

The source cause is the adapter's Foundry diagnostic staging: `GameApp.setCaptureMode(false)` resets governor measurements. The original context script's live-race wait occurred before that added staging. Waiting for an emitted-program draw and ready shadow atlas does not guarantee more than ten new cadence samples. The first attempt reached that boundary with ten.

The separate [readiness V2 adapter diff](../../output/playwright/inkstorm-context-recovery-round34-readiness-v2.diff) adds only a bounded 10 s wait for the **same `cadenceSamples > 10` prerequisite**, then retains the original assertion and every original context/reset/framebuffer gate. It does not reset counters, change renderer behavior, raise any native gate timeout or relax a threshold. Removing the inserted block reproduces the first adapter byte-for-byte. Before/after readiness snapshots are recorded. On the [retest](../../output/playwright/inkstorm-context-recovery-round34-foundry-polwo-corridor-effects-v1-readiness-v2/receipt.json), both contained **13 samples** at raceTime 0.33333333333333354 s: the condition was already satisfied, so the wait did not need to delay this attempt. The successful retry is not proof that extra waiting caused success.

The retest passes the original three-second context suspension, frozen simulation, governor-history reset, static/racer-shadow recovery, deliberate incomplete-player-framebuffer fallback and later explicit recovery. Cadence sample count at restoration resets to zero; the observed post-restoration cadence sample is 16.7 ms. Scenery bakes progress 3→4→6 and racer-shadow frames 356→360→372 across before/first recovery/final recovery. These are diagnostic recovery observations, not a full-race timing sample or a no-hitch guarantee.

Both attempts pin the actual browser fetch of **`/assets/inkstorm/foundry-service-gantry-v3.glb`**, **1,327,988 bytes**, SHA256 **`55d694f8406d9a2ff819ba7d262d86e30f0bc8bafd543699a8ceff83da2380b4`**, and exactly **192 qualifying warm palette records** among 33,518 primitive color records. The [CPU preflight](../../output/playwright/inkstorm-context-recovery-round34-foundry-polwo-corridor-effects-v1-readiness-v2/foundry-asset-preflight.json) uses the actual shader predicate. Gantry V2 is not accepted by this contract.

Transparent viewport-only WebGL observation forwards original calls unchanged. It confirms a successfully linked `INKSTORM_FOUNDRY_EMISSION` program and positive draw submissions before loss and after each restored context. The retest observes three new warm draws after Foundry staging, then 4, 26 and 6 warm-program draws in the three restoration epochs. This proves geometry submission through the emission program, not pixel radiance, illumination of neighboring surfaces or art acceptance. Diagnostic staging cancels records.

## Resource cycles

The [original resource-cycle flow](../../output/playwright/inkstorm-resource-cycles-round34-corridor-effects-v1/receipt.json) passes with the **default Teemto player and actual Cup roster**, not a Polwo player adaptation. All three seven-section/garage loops, identity/shadow checks and the original exact second-to-third plateau assertion are unchanged. All **25 samples** pass; each cycle's peak and garage counters are **213 geometries / 115 textures / 52 programs**. All eight stage-by-stage cycle2→cycle3 deltas are exactly zero.

Staging changes the competition profile to chaos and cancels records. The plateau is specific to this sequence and these renderer counters. It does not measure GPU bytes or JavaScript heap, establish a complete leak proof, or override the different counts observed in the separate staged and full-race sessions.

## Frozen files, exact audit and cleanup

The [initial frozen runtime inventory](../../output/gauntlet/round34-corridor-effects-v1-frozen-runtime/inventory.json) preserves **467 files / 164,210,788 bytes**: 141 source, 41 public, 47 complete dist, 102 harness, six configuration and 130 physical test files. The 130-file inventory includes support files; root's executed test count is 116 files. Every live file matched the original measurement baseline before copying and every copied hash was verified. Unrelated source assets and bulk output were excluded. Initial inventory SHA256: **`c63799874dccf7af3e6959fe9580b81a474e4de68252ef2803e40d2f24f599dc`**. The [initial evidence inventory](../../output/gauntlet/round34-corridor-effects-v1-frozen-runtime/verification-evidence-inventory.json) pins 95 files across the four first attempts and actual capture, retaining the context failure.

**23 initial manifests match exactly across every group**. The retest has **five internally identical manifests**. Across all 28, build/source/public/dist/configuration/tests match exactly. Harness groups are deliberately different: all 102 initial entries remain exact, and the retest adds five new readiness-adapter/support files, for 107 entries. It would be false to call all 28 complete manifests identical. The five additional files were copied and hashed separately in the [readiness supplement](../../output/gauntlet/round34-corridor-effects-v1-frozen-runtime/context-readiness-v2-supplement.json), SHA256 **`c9696ee90d85bf5fbc2f314df201cf8a3481b38b57c23b33a116640bd93877eb`**, without changing the initial inventory or failed evidence.

The [independent aggregate and run-file SHA inventory](../../output/playwright/round34-corridor-effects-v1-verification-summary.json) is **83,675 bytes**, SHA256 **`ce7e39861456490d546edb10adf3fd1be2bd142054e3ac6e94ed53b1ebdff343`**. Its [reproducible analysis](../../output/playwright/round34-v1-analysis.py) rehashes all 467 frozen files plus the five supplemental files, verifies manifest differences, checks every adjacent RAF timestamp difference and recomputes all native race/countdown and staged summaries exactly. Float totals use sequential `+=` to match JavaScript `reduce`; quantiles use `floor((N−1)×q)`. No tolerances, frame exclusions or rounded equality are used. Analysis reads saved evidence/frozen copies, not later working-tree state.

| Attempt | Outcome | Owned port | Final cleanup UTC |
| --- | --- | ---: | --- |
| Polwo full races / Continue | PASS | 52246 | 11:17:25.800222 |
| Seven Polwo sections | PASS | 52363 | 11:18:50.291849 |
| Initial Foundry context | FAIL before loss, preserved | 52442 | 11:19:36.994112 |
| Original resource cycles | PASS | 52503 | 11:21:15.646045 |
| Foundry readiness V2 retest | PASS | 52603 | 11:24:53.898845 |

Each attempt records awaited browser close and preview exit, no residual owned PIDs/process group/listener and no fallback kill actions. Dynamic ports were explicit and preview used strict-port mode. Port 5211 was never adopted or signalled. No runtime/public edits or builds occurred during the initial sequence or retest. The initial files and readiness supplement were frozen before root was notified that later edits could resume. All browser work is closed.

Original wrappers, [preparation provenance](../../output/playwright/round34-performance-adapter-provenance.json), [static validation](../../output/playwright/round34-performance-static-validation.json), failed receipts and [readiness revision provenance](../../output/playwright/round34-context-readiness-adapter-provenance.json) remain separate. The prior [V5 report](FULL_RACE_PERFORMANCE_ROUND33.md) and frozen round32 evidence are historical records for their own builds. This report does not replace them or claim visual completion, human acceptance, a release, commit, push or deployment.
