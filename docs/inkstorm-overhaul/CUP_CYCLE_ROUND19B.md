# Full Cup lifecycle — round 19b

**PASS on the explicit retry**, including a completed first round of the next Cup. The original assertion failure remains preserved and is described below. These are local functional results, not human fun or FPS acceptance.

Both attempts served frozen `index-DppP0e9i.js`, SHA-256 `495193ccd54ce3ddeca44cb8c2ca4334caef7dfabdeb5442bf7e1856cd42ea04`, in Chrome 152.0.7977.77 at a 1440 × 900 viewport and requested DPR 1. The test uses a disposable browser profile and the ordinary gamepad driver copied from the unchanged competitive-flow harness. It does not invoke mastery methods, capture mode, simulation stepping, or pose/progress writes.

## Completed retry

Command:

```sh
npx --yes tsx scripts/cup-cycle.ts --expected-build-sha=495193ccd54ce3ddeca44cb8c2ca4334caef7dfabdeb5442bf7e1856cd42ea04 --output=output/playwright/cup-cycle-round19b-retry --finish-replay-round
```

Exit 0, completed `2026-09-07T14:14:56.438Z`, zero captured browser errors. Harness SHA-256 `9a79698878db84e3df6ebb7658c291ad7f6280c8d46d0c35fb2a9c9d6aa9f1b0`.

| Run | Actual finish, seconds | Player result | Record result |
| --- | ---: | --- | --- |
| Cup Canyon | 126.13333333337978 | 2nd, 12 points | Gold, new PB and ghost |
| Cup Foundry | 131.95000000004433 | 3rd, 10 points | Gold, new PB and ghost |
| Cup Glasslands | 144.55000000003287 | 3rd, 10 points | Gold, new PB and ghost |
| New Cup Canyon | 126.13333333337978 | 2nd, 12 points in the new series | Gold, tied PB retained |

Every run completed both laps and all 20 sectors without a record-invalidating recovery. The first Cup ended with Talik Venn 45 points, Miri Voss 34, the player 32, Sola Dinn 24, Kodo Fizz 16, Olan Tarr 14, Rax Kordo 5 and Vexa Ruun 4. Final classification was observed before points were assessed. Repeated finished observations did not duplicate a round.

The actual **Next event** controls advanced Canyon → Foundry → Glasslands while preserving cumulative standings. After Glasslands, **Race another cup** was visible in the results action row at x=715, y=155.390625, width=175, height=43, within the initial viewport. A separate same-origin page loaded the completed Cup into the default Time Attack garage and clicked its visible replay button. It dispatched exactly one `restart-championship` action and opened fresh Canyon preparation. The original results page then clicked its own replay button and also dispatched exactly once. Both checks preserved every non-championship profile field. No direct restart method or profile fixture substituted for either click.

The fresh series and prior records survived page reload. The extra Canyon run then completed and banked only its new round, restoring **Next event → Foundry**. Three prior PBs remained available; history advanced from three to four runs and the saved course remained. The new run tied Canyon's previous best and did not replace it. Sampled driver traces contained 111 / 116 / 124 / 111 rows respectively, with zero wrong-way rows; these sparse traces are not a census of all vehicle collisions.

All four result snapshots reported the 512 player-shadow atlas, 19 caster draws, 13,204 triangles, zero omitted casters, and null failure/skipped diagnostics. Snapshot counters reset on the intentional page reload. These end snapshots do not establish an every-frame shadow-failure count or shadow image quality.

## Preserved first failure

`output/playwright/cup-cycle-round19b` remains **FAIL**, exit 1, completed `2026-09-07T14:03:34.475Z`. Its original harness SHA is `56bbb1f7b3cff6ac3b13bff220a008296356890dc2678c0caff3d637f3e9f9ef`. It completed Canyon in 126.13333333337978 s, Foundry in 131.95000000004433 s and Glasslands in 145.3333333333655 s, and passed both real replay clicks and preservation checks. It stopped before the new Cup race at `Replay does not prepare a fresh championship`.

The failure snapshot and screenshot show fresh `cup-canyon`, zero banked rounds, `awaitingStart=true`, context action `Start championship`, and the rendered **START CHAMPIONSHIP** button. CSS uppercase transformation made the harness's case-sensitive `innerText.includes('Start championship')` assertion fail. The authorized correction only lowercases that rendered label before comparison; it also records the reason and original harness SHA in the new receipt. No runtime change, threshold change, frame filtering or failure overwrite occurred. Both the original failure and successful rerun remain reviewable.

## Provenance, cleanup and limits

Each attempt has before/after manifests for all 21 public Inkstorm art files and their dist copies, all source files, the bundle and both harness scripts. Every comparison passed unchanged within that attempt. The art set includes the new machinery-paint PNG, SHA `63e7a4c2925352e1d38c0842b6b87a9bde1441a8097a075f85909d313698a894`. The original performance harness remains SHA `a0b70239216daaa41ce80787aef39e23f5b75b0d1aebb46afcf3afb1444815e7`.

Both owned browsers closed in `finally`; preview ports 51983 and 52417 had no listener after their runs. The retry was permitted to overlap separate Blender asset acquisition from approximately 14:09:38 to the explicit heavy-work release at 14:14:36 UTC, while source/public/dist remained frozen. Its `execution-environment.json` records that scope. This functional run makes no cadence/FPS claim. The separate performance run began only after the browser closed and heavy work was released.

Evidence: each output directory contains the raw receipt, per-round snapshot/profile/trace/result markup, actual HUD action receipts, screenshots, full run log, manifests and a derived `analysis-summary.json`. Automated full-round completion and UI reachability do not establish human driving feel, medal balance, long-term replay appeal or acceptance on other devices.
