# Round 32 — frozen complete-race performance

**PASS for all six local cadence gates and all three actual Continue flows.** Teemto, Sebulba and Polwo each finish ordinary Time Attack and two-lap Canyon Cup. Mean racing cadence is **59.536–59.736 Hz**, with **16.7–16.8 ms p95**, at adaptive DPR 1–2 for Time Attack and 1.75–2 for Cup. There are 216 racing intervals above 25 ms and none above 50 ms. Strict source/vehicle/world art remains **FAIL**; all seven original world targets remain unmet.

The tested build is `dist/assets/index-1xbykiGm.js`, **1,604,509 bytes**, SHA256 `f09516c19dc7c4b04372e7ee4416537444a9b989c404a05206088f9fb27855e0`, course9 / drive4 / rules2. **618 tests / 111 files**, TypeScript and production build pass. [Verification log](../../output/gauntlet/round32-final-verify.log). These results apply to the [preserved round32 runtime](../../output/gauntlet/round32-frozen-runtime/inventory.json), not subsequent round33 working-source edits or a later bundle. No commit, push or deployment.

| Appearance | Event | Player finish | Mean Hz | p95 interval | Maximum interval | Racing intervals >25 ms | Actual DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Teemto | Time Attack | 63.758333 s | 59.735676 | 16.7 ms | 33.4 ms | 17 | 1–2 |
| Teemto | Canyon Cup | 130.266667 s | 59.691453 | 16.8 ms | 33.5 ms | 43 | 1.75–2 |
| Sebulba | Time Attack | 63.741667 s | 59.704442 | 16.7 ms | 33.4 ms | 19 | 1–2 |
| Sebulba | Canyon Cup | 129.866667 s | 59.654203 | 16.8 ms | 33.4 ms | 48 | 1.75–2 |
| Polwo | Time Attack | 63.733333 s | 59.610181 | 16.8 ms | 33.4 ms | 25 | 1–2 |
| Polwo | Canyon Cup | 129.283333 s | 59.536211 | 16.8 ms | 33.4 ms | 64 | 1.75–2 |

All **37,179 raw rows** and **36,065 racing intervals** remain. The native harness includes all ordinary racing-phase intervals, transient slow frames and controller/snapshot overhead, with no warmup removal or interior filtering. Countdown is reported separately: five intervals above 25 ms, none above 50 ms, maximum 50.0 ms. Every raw interval was checked against its adjacent RAF timestamps; every saved phase statistic was reproduced exactly. There are 10 recorded sectors per Time Attack and 20 per Cup, with valid gold results and matching sector sums. Browser error arrays are empty.

## Player finish and result-wait scope

Cup sampling includes the ordinary classification/result wait after the player finishes. It must not be described as uninterrupted active player driving.

| Appearance | Player finish | Last observed racing time | Post-finish racing intervals | Their summed duration |
| --- | ---: | ---: | ---: | ---: |
| Teemto | 130.266667 s | 138.266667 s | 480 | 7,999.6 ms |
| Sebulba | 129.866667 s | 137.866667 s | 480 | 7,999.7 ms |
| Polwo | 129.283333 s | 137.283333 s | 480 | 7,999.6 ms |

Time Attack has no post-player-finish intervals classified as racing. The ordinary Continue button was clicked after each Cup result. All three open `cup-foundry`, championship round 1, simulation frame 0, awaiting Start. This proves the transition to the next round, not completion of the whole championship. Ghost availability/enabled flags do not certify visible replay geometry; collision event counts are unavailable, not zero. These automated input runs do not establish human driving feel.

## Frozen identities and evidence

All six before/after manifests match the initial freeze across **137 source files, 36 public-art files, 43 dist files, 11 harness files and four configuration files**. The public-to-dist checks and served bundle hash match across all three invocations. The native competitive harness SHA256 is `dc3a10762c0b4e813bb28d752d0e503d74b90482f8eaf1aab706c2adfb7af491`; its input controller, atomic result observation and admission/cadence criteria were not modified during timing. [Complete artifact comparison](../../output/gauntlet/round32-freeze/complete-race-comparison.json) · [Six-race inventory, raw paths and hashes](../../output/gauntlet/round32-freeze/race-evidence-inventory.json).

The separate frozen snapshot preserves **394 files / 83,433,926 bytes** of runtime source, tests, scripts, configuration and complete dist. Large source-art history remains in its existing preserved folders. A subsequent read-only documentation audit verified every frozen file and all **56** inventoried race-evidence files by size/SHA256, with no mismatches. At 09:31:52 UTC, that audit found round33 changes to `inkstormLayout.ts` and `InkstormWorld.ts`, plus a new gantry module/test; the saved dist still matched round32. These later working files are outside the result above. [Timestamped scope audit](../../output/gauntlet/round32-freeze/documentation-audit.json).

The first post-run finalizer attempt failed an exact summary-equality check: Python's compensated `sum` differed from JavaScript's sequential left-fold addition by one ULP for two phase totals, affecting Sebulba duration and derived mean. All native race gates had already passed. The prior finalizer remains preserved; explicit sequential `+=` now reproduces the native arithmetic exactly. No tolerance, raw row, game code, native harness or gate criterion changed. [Failure and arithmetic reconciliation](../../output/gauntlet/round32-freeze/analysis-float-reconciliation.json) · [Preserved first finalizer](../../output/gauntlet/round32-freeze/finalize-evidence-before-left-fold.py).

## Measurement and cleanup limits

Environment: local Apple M4 / ANGLE Metal / Chrome **152.0.7977.77**, headless **1440×900**, requested DPR 2 with ordinary adaptive rendering. Timing ran sequentially from 09:12:21 to 09:23:11 UTC while Blender/GPU work, other browser checks, builds and runtime mutations were paused. Normal system activity and lightweight documentation work remained. This measures native RAF/CPU/controller cadence, not GPU execution time, physical display presentation, fixed-DPR performance or other devices.

All **629** renderer/resolution/shadow samples report no static/dynamic shadow failure. They are sampled diagnostics, not an inspection of every rendered frame. Complete-pass reported maxima reach **273 calls / 4,145,887 triangles**; these multipass counters are not unique asset geometry and do not imply the older provisional primitive/frame budgets passed. Adaptive Time Attack reaches DPR 1 and Cup reaches 1.75; nominal Retina DPR 2 is not claimed throughout.

Each native harness awaits browser closure in `finally`; owned process-group and port cleanup is recorded separately. **Ports 65162, 65284 and 65424 are closed**, with no surviving owned group. Unrelated port5211 was never signalled. Per-appearance evidence includes native receipts, raw intervals, analysis, result PNGs, Continue PNGs, manifests and cleanup:

- [Teemto native receipt](../../output/playwright/full-race-performance-round32-teemto/receipt.json).
- [Sebulba native receipt](../../output/playwright/full-race-performance-round32-sebulba/receipt.json).
- [Polwo native receipt](../../output/playwright/full-race-performance-round32-polwo/receipt.json).

The final 12-stage Polwo lifecycle and three existing regression diagnostics also pass on this exact bundle; their deliberate HTTP503 errors and earlier failed fixture attempts remain preserved in [ROUND32](ROUND32.md). The [nine-image gallery](CURRENT_VISUALS.md) contains seven staged section views, a garage view and a short live still. Those PNGs do not establish motion or these cadence results. The [revision3 critic](POLWO_REVISION3_REVIEW_ROUND32.md) is independent but implementation-aware, not fresh/blind, and retains only bounded exhaust/framing repairs. The last fresh world verdict is still round31 **FAIL, 0/7, 4.79/10**. A new fresh blind round32 worker has started after earlier thread-cap failures; its verdict remains pending. Three runtime vehicle families are integrated; 23 other acquired source families still need runtime preparation and the strict vehicle/driver/world art gate remains open.
