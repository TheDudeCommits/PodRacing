# Round 30 complete-race performance

**PASS for all four required local adaptive race runs and both Continue flows. World concept parity remains FAIL, 0/7.** This is the completed round 30 checkpoint, including baked workshop lighting, hybrid markers, grounded fork foundation, foundry V3 network and final pursuit UI. Active experimental round 31 launch/course 9 and fork-guidance integration is unaccepted and outside this evidence. Round 30 is the last fully verified checkpoint.

Exact build: **index-DFdPXgCs.js**, SHA256 **4a5cfa6b986bb1813628c15b1e8783e5c07cd98fc919c048d131a0515e7960f3**, **1,595,979 bytes**. `output/gauntlet/round30-accepted-ui-verify.log` records **593 tests / 106 files**, typecheck and production build passing. Root also completed whitespace checks. No commit, push or deployment occurred.

## Completed races

| Appearance | Event | Player finish | Mean racing-phase cadence | p95 | Maximum | Intervals >25 ms | Actual DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Teemto | Time Attack | 63.325000 s | 59.749724 Hz | 16.7 ms | 33.4 ms | 16 | 1–2 |
| Teemto | Canyon Cup | 126.733333 s | 59.705547 Hz | 16.8 ms | 33.4 ms | 40 | 1.75–2 |
| Sebulba | Time Attack | 63.308333 s | 59.717998 Hz | 16.7 ms | 33.4 ms | 18 | 1–2 |
| Sebulba | Canyon Cup | 126.516667 s | 59.667902 Hz | 16.8 ms | 33.4 ms | 45 | 1.75–2 |

Every race records a valid personal best, gold medal and ordered sector result: ten for Time Attack and twenty for the two-lap Cup. Both Cup runs place the player second with 12 championship points. The real Continue action reaches `cup-foundry`, awaiting Start, with one completed championship round. This does not complete the three-round championship.

**Player finish and measured racing-phase duration are different.** The normal Cup keeps running for classification after the player finishes, and the harness waits for the rendered finished phase. Teemto's last racing sample is at **134.741667 s**, following the **126.733333 s** finish. Sebulba's is at **134.525000 s**, following the **126.516667 s** finish. Each Cup retains **481 racing-labelled intervals after the player's finish**. The driver neutralizes throttle/brakes when a result exists; these intervals are classification/result wait, not additional active player driving. No grace-period intervals were removed from the cadence gate. Time Attack's final racing sample is within one simulation tick of its finish.

## Measurement and raw evidence

Local Apple M4 through ANGLE Metal; headless Chrome **152.0.7977.77**; 1440×900 CSS viewport; requested DPR 2; no quality override. Both Time Attacks use adaptive DPR 1–2 and recover DPR 2 at approximately 35.35 s. Both Cups briefly reach DPR 1.75, recover 1.875 around 2.97/2.98 s and DPR 2 around 6.97/6.98 s. Authored terrain remains six effective levels and 3072 m coverage throughout the sampled resolution history, even when fewer detail levels are requested.

All **24,378 raw frame rows** remain: **23,636 racing intervals**, **119 racing intervals above 25 ms**, no racing intervals above 50 ms, and **five countdown intervals above 25 ms**, including one 50.1 ms countdown interval. The metadata reconciliation independently recomputed every countdown/racing count, duration, mean, quantile and threshold count and matched the raw/analysis summaries exactly. Every noninitial interval matches the difference between adjacent RAF timestamps; no raw interior rows or slow frames were discarded.

All **412 sampled renderer/shadow records** have null dynamic/static shadow failures. This is sampled telemetry, not every-frame pixel or shadow visibility proof. Maximum observed calls/triangles are Teemto Time Attack103/4,109,250, Cup274/4,151,674; Sebulba Time Attack96/4,103,463, Cup267/4,145,887. Collision event counts are not exposed by this read-only recorder: unavailable does not mean zero.

These are native browser RAF intervals with the ordinary input controller and read-only observation overhead included. They are not GPU execution time, physical-display presentation timestamps, fixed-DPR results, other-device acceptance or human driving enjoyment. The independent gate remains mean≥40 Hz, p95≤25 ms, valid continuous coverage and ordinary gameplay completion.

## Frozen artifacts and cleanup

The wrapper ran from **22:49:42 to 22:56:48 UTC on7 September 2026**, completed both appearances with exit0 and ended with `ROUND30 TEEMTO + SEBULBA TIME ATTACK + CANYON CUP + CONTINUE FINISHED`. The exact wrapper is retained at `output/playwright/full-race-performance-round30-runner.py`, SHA256 `b8253b21fb680963abde69a14267ca067101d5c6e699af06408a66f3fdaae30f`.

All four before/after artifact manifests match each other and `output/gauntlet/round30-freeze/before.json`: **136 source / 32 public-art / 39 dist / six harness / four configuration files**, plus the exact bundle above. All 32 public-art entries match their served dist counterparts. This comparison concerns the recorded round 30 freeze, not later round 31 experimental source.

The harness awaited Chrome closure in `finally`; wrapper process-group cleanup found no owned residual group. Preview ports **54067** and **54209** were verified closed. The unrelated 5211 port received no stop signal. Both final race receipts contain `errors: []` and `outcome: PASS`.

## Harness correction and other acceptance scopes

The final competitive harness SHA is `93fb91bdcf0168727ddd7681e81421e49a459b0f43d9c81ef6c70d7b20afb3c6`. It differs from round 29 only in the independently reviewed completion observation: the read-only snapshot and rendered finished flag are read together in one synchronous browser evaluation. The old separate protocol reads could straddle a finish tick. Driving, simulation clocks, timeouts, independent clock formatting, raw cadence collection and acceptance thresholds remain unchanged. These final four races use that corrected observation; the preserved pre-correction pursuit failure is not relabelled as a pass. [Observation review](HARNESS_OBSERVATION_ROUND30.md).

The final pursuit flow separately passes two real input-only laps, numeric PB/sector checks, byte-preserved slower-run PB/ghost storage and reload, and result/hangar layouts at 1440×900 and 1280×720. A post-hoc check matches all nine saved live HUD pace values to their sampled accepted deltas at displayed millisecond precision; the final gate goes directly to results. This resolves correspondence for that receipt, not the sampler's general cross-call timing limitation. The final image-only UI review is **PASS for its bounded criteria**, with nonblocking small-type/footer/baseline-dash issues. [Final UI review](BLIND_MASTERY_FINAL_ROUND30.md).

The final 21-image world gallery, 14-stage appearance lifecycle, WebGL context/framebuffer fallback/recovery and three-cycle resource plateau checks also pass their technical scopes on this build. The two vehicle HTTP 503 console errors are deliberate failure injections; do not describe that lifecycle receipt as error-free. Context recovery has no page/console errors, and resource cycles have errors[]. These diagnostics are separate from full-race cadence and do not establish art parity or a complete leak proof.

The fresh world critic reviewed `output/gauntlet/round-30`, before final UI v3, and returned strict **FAIL, 0/7, mean 3.9/10**. Only `src/ui/RaceHud.ts` and `src/ui/inkstormStyles.ts` changed between that source freeze and final round 30; public art and world geometry are unchanged. `round-30-final` is the final-build gallery, but it was not silently substituted into the critic's historical input set. [World review](BLIND_WORLD_ROUND30.md).

## Evidence

- `output/playwright/full-race-performance-round30-{teemto,sebulba}/`: complete raw race JSON, results/Continue screenshots, cadence and resolution histories, manifests, analysis and cleanup.
- `output/playwright/full-race-performance-round30-wrapper.log`: complete wrapper stdout, including both successful final outcomes.
- `output/gauntlet/round30-freeze/{before,complete-race-comparison,race-evidence-inventory}.json`: frozen identities, independently checked statistics and hashed evidence inventory.
- `output/gauntlet/round30-freeze/finalize-evidence.py`: read-only evidence reconciliation and byte-copy packaging; no runtime/browser/build execution.
- `docs/inkstorm-overhaul/evidence/round-30/`: 21 byte-exact final gallery PNGs and their source/copy hash inventory. [Gallery](CURRENT_VISUALS.md).
- `output/playwright/mastery-pursuit-round30-v3-atomic/`: final UI flow, screenshots and numeric HUD audit; prior `v3` uppercase-unit and `v3-retry` finish-observation failures remain intact.

Human handling, controller/audio, full championship, long-session balance, other devices and production acceptance remain open. Round 31's active deeper launch profile, course 9 archive migration and fork guidance require their own complete verification, driving checks, captures and timing.
