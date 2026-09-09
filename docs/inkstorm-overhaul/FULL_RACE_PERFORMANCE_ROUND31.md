# Round 31 — frozen complete-race performance

**PASS for all four local cadence gates and both actual Continue flows.** This is 59.699–59.736 Hz mean racing cadence, 16.8 ms p95, adaptive DPR 1–2 for Time Attack and 1.75–2 for Cup. One Teemto Cup interval is 66.6 ms; a pass does not mean every frame stayed within 25 ms. Strict world art remains FAIL.

Build `dist/assets/index-DGjkpNeh.js`, **1,602,555 bytes**, SHA256 `913a7744af6b9237800e54f7dd0898ec0ca3355c2f9638f93545cbcc747a24cb`. Course 9 / drive 4 / rules 2. `npm run verify` passes **600 tests / 108 files**, TypeScript and production build; `git diff --check` passes. The final V2 asset-count correction changes the lifecycle harness only, and is included in the frozen harness identities. [Verification log](../../output/gauntlet/round31-final-verify.log).

| Appearance | Event | Player finish | Mean Hz | p95 interval | Maximum interval | Racing intervals >25 ms | Actual DPR |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Teemto | time-attack | 63.766667 s | 59.735770 | 16.8 ms | 33.4 ms | 17 | 1–2 |
| Teemto | cup-round-1 | 130.625000 s | 59.699425 | 16.8 ms | 66.6 ms | 40 | 1.75–2 |
| Sebulba | time-attack | 63.766667 s | 59.704348 | 16.8 ms | 33.4 ms | 19 | 1–2 |
| Sebulba | cup-round-1 | 128.416667 s | 59.723917 | 16.8 ms | 33.5 ms | 38 | 1.75–2 |

All **24,745 raw rows** and **24,040 racing intervals** remain. There are **114 racing intervals above 25 ms**, **one above 50 ms**, and two slow countdown intervals (49.9 and 50.0 ms). Statistics were recomputed from every retained phase interval, and each raw interval matches its adjacent RAF timestamps exactly. No interior sample trimming or substitutions occurred. All 418 renderer/shadow samples have no recorded failures and retain six effective terrain levels / 3072 m coverage.

Cup sampling includes the normal classification/result wait after the player finishes. Teemto finishes at 130.625 s; the last observed racing phase is 138.633333 s. Sebulba finishes at 128.416667 s; sampling continues to 136.425 s. Both include 481 post-finish racing intervals. These are not extra seconds of active player driving. Both ordinary Continue clicks open Foundry at championship round 1 awaiting Start. All results are valid gold records, with sector sums matching stored time; browser error arrays are empty.

## Artifact and measurement scope

The freeze, both before/after manifests, and public-to-dist pairs match across **137 source files, 34 public-art files, 41 dist files, six harness files and four configuration files**. The served bundle hash is checked on every invocation. The competitive harness retains atomic result observation and SHA256 `93fb91bdcf0168727ddd7681e81421e49a459b0f43d9c81ef6c70d7b20afb3c6`; controller actions and cadence thresholds were not changed. [Artifact comparison](../../output/gauntlet/round31-freeze/complete-race-comparison.json) · [Raw evidence inventory](../../output/gauntlet/round31-freeze/race-evidence-inventory.json).

Environment: local Apple M4, ANGLE Metal, Chrome 152, headless 1440×900 viewport with requested DPR 2 and ordinary adaptive rendering. Blender imports/renders were paused during timing; normal system processes remained. Lightweight documentation and public metadata reads ran alongside. This is RAF/CPU/controller cadence, not GPU timers, display-presentation timestamps, fixed-DPR acceptance or other-device evidence. Physics/contact counters do not establish collision-free human play. Peak complete-pass reported triangles reach 4.15 million and calls reach 277; older provisional primitive budgets are not represented as passed.

The unchanged native harness closes each browser in `finally`; wrapper cleanup checks owned descendants and listening ports. **Ports 61676 and 61776 are closed.** Unrelated port 5211 was never signalled. Per-appearance receipts are under `output/playwright/full-race-performance-round31-{teemto,sebulba}/`; the wrapper log and repeatable finalizer remain under `output/playwright/` and `output/gauntlet/round31-freeze/`.

A separate failed lifecycle attempt still expected V4C's mesh counts. Its preserved failure is followed by a corrected V2 fixture that verifies the exact served GLB hash, 57,618 triangles, ten prepasses and four body shadow draws / 41,839 triangles. The final 14-stage lifecycle, context/framebuffer recovery and three resource cycles all pass. That fixture correction does not modify the game bundle or loosen admission budgets. [Integration review](ROUND31_INTEGRATION_REVIEW.md).

[Final 28-image gallery](CURRENT_VISUALS.md) · [Fresh world critic: strict FAIL, 0/7, 4.79/10](BLIND_WORLD_ROUND31.md) · [Cockpit critic: retain V2, finished cockpit FAIL](BLIND_COCKPIT_V2_ROUND31.md). No commit, push or deployment.
