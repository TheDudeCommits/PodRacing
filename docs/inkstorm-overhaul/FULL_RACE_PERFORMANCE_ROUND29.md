# Round29 complete-race performance

**PASS for the four required local adaptive race runs and both Continue flows. Visual concept parity remains FAIL.** This checkpoint combines shared pit/district grading and saved anchors, revision4 workshop/gantry geometry, corrected blue-paint classification and initial local task lighting. It does not include the staged round30 road-level anchors or baked lighting.

Exact build: **index-B2tbJL7E.js**, SHA256 **f919adbafbd0c0a27a9e719693f0585fb08a3ed17fe9df82f58173983d1b6008**, **1,579,162 bytes**. `npm run verify`: **582 tests / 104 files**, typecheck and build pass; `git diff --check` passes. The previous round28 dist is preserved byte-exact in `output/gauntlet/frozen-build-round28-before-workshop29/`.

## Completed races

| Appearance | Event | Player finish time | Mean racing cadence | p95 interval | Max interval | Intervals >25ms | Actual DPR range |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Teemto | Time Attack | 63.325000 s | 59.781433 Hz | 16.7 ms | 33.4 ms | 14 | 1–2 |
| Teemto | Canyon Cup | 126.208333 s | 59.778928 Hz | 16.7 ms | 33.4 ms | 30 | 1.75–2 |
| Sebulba | Time Attack | 63.333333 s | 59.749758 Hz | 16.7 ms | 33.4 ms | 16 | 1–2 |
| Sebulba | Canyon Cup | 126.225000 s | 59.719348 Hz | 16.8 ms | 33.4 ms | 38 | 1.75–2 |

Every race has a valid personal best, gold medal and ordered sector result (10 Time Attack /20 two-lap Cup). Both Cup runs record second place/12 points and the actual Continue action reaches Foundry awaiting Start with one completed championship round. Cup cadence includes the ordinary eight-second post-player-finish grace while the race is still running; player finish time and measured racing-phase duration are deliberately separate. These runs do not complete all three championship rounds.

## Measurement and retained data

Local Apple M4 via ANGLE Metal, Chrome152.0.7977.77 headless, 1440×900 CSS viewport and requested DPR2. No quality override. Normal adaptive rendering used DPR1–2 for Time Attack and1.75–2 for Cup. Effective authored terrain coverage stayed at six levels/3072m even when Time Attack requested fewer detail levels. This is browser RAF cadence, not a GPU timer query or physical-display measurement, and does not establish fixed-DPR or other-device performance.

The unmodified native race harness is `scripts/competitive-flow.ts`, SHA256 `667941482387f3634aeb0abbb2d7db0d355eb07ce267332d9d96ad842145ac37`. It uses ordinary virtual-gamepad driving, genuine simulation time and real result/Continue actions; no capture mode, seek, time advancement or artificial frame clock. The independent nanosecond-normalized display oracle from round28 is retained unchanged. No retry or harness edit was needed in round29. The cadence gate requires mean >=40Hz, p95 <=25ms, valid continuous coverage and ordinary gameplay completion.

All **24,444 raw frame rows** remain, including **23,611 racing intervals**, **98 racing intervals above25ms** and **2 slow countdown intervals**. No racing interval exceeds50ms. All **413 sampled renderer/shadow records** have null dynamic/static shadow failures. These sampled records are not proof of every-frame shadow visibility. Maximum observed calls/triangles: Teemto TA99/4,010,418, Cup274/4,052,842; Sebulba TA92/4,004,631, Cup267/4,025,175.


The benchmark ran from21:09:39 to21:16:46UTC on7September2026. Across both appearances and all four before/after manifests, the exact build,132 source files,30 public-art files,37 dist files,6 harness files and4 configuration files match. Every public-art file matches its served dist counterpart. All17 actual world captures were taken before these races on this freeze and have empty browser-error arrays; still captures have their own narrower scope. [Fresh world review](BLIND_WORLD_ROUND29.md) rejects all7 section targets. The earlier14-stage vehicle lifecycle/context-recovery evidence remains scoped to round28 and was not rerun here.

Owned Chrome browsers closed in the harness `finally`. Preview ports50883 and51041 were verified closed. The unrelated5211 port received no stop signal. Both race receipts report errors[] and outcome PASS. No deployment or source commit occurred.

## Evidence

- `output/playwright/full-race-performance-round29-{teemto,sebulba}/`: raw time-attack/Cup records, screenshots, result/Continue receipts, device/resolution history, manifests, analysis and cleanup.
- `output/playwright/full-race-performance-round29-runner.py`: exact-build external wrapper; its invocation hash is recorded per appearance.
- `output/gauntlet/round29-freeze/{before,complete-race-comparison,race-evidence-inventory}.json`: combined freeze, cross-run comparison and hashed raw-evidence inventory.
- `output/gauntlet/round29-verify.log` and `output/gauntlet/round-29/`: tests/build and17 actual world images.

Reproduce against the recorded build using the preserved wrapper. Do not run Blender, GPU captures or another benchmark concurrently. Preserve failed attempts under new directories if future code changes cause a failure. Human handling enjoyment, competitive balance, direct audio/controller review, full championship and other-device acceptance remain open.
