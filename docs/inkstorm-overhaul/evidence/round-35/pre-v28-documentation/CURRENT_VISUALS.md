# Inkstorm current visual review — Round 35, 9 September 2026

The active UI/combat checkpoint and its exact evidence are in [ROUND35_UI_COMBAT_HANDOVER.md](ROUND35_UI_COMBAT_HANDOVER.md). The overhaul and final art remain incomplete. Current work includes the reference-inspired interface, actual solo slow motion and two chaos pickups; the four registered fleet families are unchanged. No deployment is claimed.

## Current V27 interface and crash

These are actual local game captures from `index-CH_QOFv7.js` (SHA-256 `54e20c0f1d4741620789c5009900f834573892b545ff331bff97cf2466e1fcbc`). They show implemented screens and effects, not generated target scenes. [Native UI receipt](../../output/gauntlet/round35-broadcast-native-v27/receipt.json) passes 17 captures with zero errors and closed owned browsers/servers. [Four native crash cases](../../output/playwright/round35-combat-v27/receipt.json) pass with the exact new atlas loaded. Completed visual reviews remain below target.

The fresh seven-image UI review remains **FAIL overall**: HUD **7/7**, Build **7.5/7.5**, map **8/8**, garage **7.5/7.5** (style/readability). Map and garage critic images are byte-identical to V26; their score changes are critic variation, not implementation improvement. The completed UI audit passes **3,923 native checks, 18 critic-protocol checks and 450 grouped-total checks**, covering 60 part actions/restores and all 30 total rows; maximum label/value/track center spread is **0.0078125 px**. Bounded actual-video review finds no sampled map-name occlusion or garage bleed through Build entry. [Completed UI review and audit inventory](../../output/critics/blind-hud-v27/REVIEW_COMPLETE.json) · [Fresh crash review: 5/10 FAIL](../../output/playwright/round35-combat-v27/blind-critic/cli-critic-attempt1/review.md) · [Native high-speed check: PASS at 219.2169 m/s](../../output/playwright/round35-combat-high-speed-v27/receipt.json). The high-speed check records zero errors and owned cleanup; recorded control evidence is not an FPS benchmark.

**V28 is a focused crash-only private pass in progress, with no live admission yet. V27 UI remains frozen. No V27 FPS measurement has been run.** V24b's measured **59.47/58.98 Hz** M4 races remain historical and do not transfer to V27 or V28. The full overhaul remains open: four registered fleet families and **22 remaining**.

![Actual V27 HUD during driving](../../output/gauntlet/round35-broadcast-native-v27/06-desktop-live-race.png)

![Actual V27 Build screen](../../output/gauntlet/round35-broadcast-native-v27/03-desktop-build.png)

![Actual V27 destination map](../../output/gauntlet/round35-broadcast-native-v27/02-desktop-map.png)

![Actual V27 garage](../../output/gauntlet/round35-broadcast-native-v27/01-desktop-garage.png)

![Actual V27 crash with loaded painted flame](../../output/playwright/round35-combat-v27/solo-chase-wreck.png)

Build's compact desktop overview preserves complete benefit/tradeoff strings and access to full notes; narrow/touch retains expanded prose. The first crash screenshot shows a sharper attached flame, but only the full sequence and fresh criticism can judge whether the motion/effects deliver enough force. Prior V26 scores (crash 5/10 and UI below 8 in both dimensions) remain preserved in the [active handover](ROUND35_UI_COMBAT_HANDOVER.md). The latest measured races still belong to V24b, not these images.

## Historical V8/V9 overview, preserved below

# Inkstorm runtime images — retained V9 Sobel candidate, 8 September 2026

These **13 unedited actual V9 game PNGs** belong to `index-BQvDRTNC.js`, SHA256 `56d196f442cdfcc34edc732b536ec23a3d65f5c6c94d87ac075369a9c8093d97`, with the V8 contact-color vehicle GLBs. [Capture receipt](../../output/gauntlet/round34-sobel-stencil-v9/captures/receipts.json) has empty errors. Page viewport is 1440×900 at DPR 1.5; these image settings differ from adaptive benchmark runs. All eleven staged camera/vehicle poses match V8; the stencil affects only a small fraction of pixels. These stills and one short Start/W frame are not full races or motion/performance acceptance.

**Current working candidate: retained V9 Sobel stencil.** Root applied and verified this separate change after the V8 diagnostic: **671 tests / 120 executed files**, typecheck/build PASS. Bundle `index-BQvDRTNC.js` is **1,620,951 bytes**, SHA256 `56d196f442cdfcc34edc732b536ec23a3d65f5c6c94d87ac075369a9c8093d97`; V8 vehicle GLBs remain. All 13 V9 captures have empty errors and the owned browser/server/port 5186 closed. The fresh paired edge review prefers V9 in salt and launch, ties grid and Foundry exit, and finds no convincing foreground-edge regression; the improvement is subtle. Its broader in-game/world score is **6/10, FAIL against 8/10**, a different scope from V8's vehicle 5.5 review. [V9 verify](../../output/gauntlet/round34-sobel-stencil-v9/verify.log) · [Matched capture comparison](../../output/gauntlet/round34-sobel-stencil-v9/matched-runtime-comparison.json) · [Fresh V9 review](../../assets/source/inkstorm/round34-distant-edge-diagnosis/blind-runtime-v9/cli-critic-attempt1/review.md) · [Audited V9 receipt](../../assets/source/inkstorm/round34-distant-edge-diagnosis/blind-runtime-v9/cli-critic-attempt1/audited-review-receipt.json). The 481-interval short capture is not a full-race or resource benchmark. No V9 resource/performance acceptance or transfer of V5/V8 results is claimed.

**The fresh paired contact-color review demonstrates no quality improvement:** all four pairs tie. Both V8 (A) and V5/V6-assets (B) score **materials 5/10, pilot readability 6/10, overall vehicle 5.5/10 — FAIL against 8/10**. The critic declared all nine attachments examined: eight actual images in four pairs plus generated concept12. [Review](../../assets/source/inkstorm/blockrunner-round34/contact-color-v1-blind-review/cli-critic-attempt1/review.md) · [Audited attachment/event proof](../../assets/source/inkstorm/blockrunner-round34/contact-color-v1-blind-review/audited-review-v1.json).

That paired review covers garage, grid, Foundry middle and exit only, with one concept image. It is not a fresh review of all 13 V8 frames, the original seven world concepts, narrow UI, motion or performance. The earlier fresh V5 overall 5.5 FAIL and prior-context V4/V5-garage findings remain historical, not averaged. [Complete V5 gallery/review document](evidence/round-34/pre-contact-color-v8-documentation/CURRENT_VISUALS.md).

V8's single healthy instrumented resource run is **diagnostic non-reproduction only**. Historical V5 timing PASS and resource +1 geometry/+2 textures FAIL remain unchanged. [V8 diagnostic](../../output/playwright/round34-blockrunner-contact-color-v8-resource-owner-attempt1/ANALYSIS-v1.md) · [V5 performance/failure](FULL_RACE_PERFORMANCE_BLOCKRUNNER_V5_ROUND34.md). These staged stills and one short ordinary Start/W frame are not full races, motion or FPS evidence.

The separate [V8 garage/UI probe](../../output/gauntlet/round34-blockrunner-contact-color-v1/garage-inspection/receipt.json) confirms 6 px descriptor/model separation, no horizontal overflow at 390 px and Start reachable after actual scroll. It closed browser/server with empty errors. That probe is functional evidence, not an additional critic review; the taller-page tradeoff remains.

V7 contact-color body/pilot bakes, V8 atlas/export/packages and public admission have actually executed. [Source/package lineage](ROUND34.md). The V8 experiment and its thirteen source PNGs remain preserved in the [V8 capture inventory](evidence/round-34/pre-contact-color-v8-documentation/v8-compact-evidence.json).

[Round scope](ROUND34.md) · [Acceptance](STATUS.md) · [Pre-V8 gallery](evidence/round-34/pre-contact-color-v8-documentation/CURRENT_VISUALS.md). V8 color quality did not improve in its paired review; V9 edges improved subtly in two pairs. Neither result meets final art acceptance. No commit, push or deployment.

## Garage

![Garage — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/garage.png)

## Grid

![Grid — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/01-grid.png)

## Salt run

![Salt run — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/02-salt-run.png)

## Canyon

![Canyon — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/03-canyon.png)

## Fork

![Fork — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/04-fork.png)

## Launch

![Launch — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/05-launch.png)

## Foundry

![Foundry — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/06-foundry.png)

## Foundry approach

![Foundry approach — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/foundry-approach.png)

## Foundry near span

![Foundry near span — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/foundry-near-span.png)

## Foundry middle

![Foundry middle — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/foundry-middle.png)

## Foundry exit

![Foundry exit — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/foundry-exit.png)

## Finish

![Finish — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/07-finish.png)

## Short ordinary Start/W capture

![Short ordinary Start/W capture — actual V9 Sobel runtime](../../output/gauntlet/round34-sobel-stencil-v9/captures/live-drive.png)

## Separate source and target references

[Actual V6 neutral driver source comparison](../../assets/source/inkstorm/blockrunner-round34/paint-v1-driver-20260908-round34-clamp-v6.png) verifies the atlas wrap seam under matched source lighting; it is not a game screenshot. [Executed scope](../../assets/source/inkstorm/blockrunner-round34/V6_EXECUTED_SOURCE_REVIEW.md).

[Supplemental Blockrunner concept12](concepts/12-blockrunner-round34.png) is generated art direction. Its invented rear inset is not source geometry or anchor authority. Original world concepts01–07 remain unchanged and unaccepted. The [previous foundation gallery document](evidence/round-34/pre-blockrunner-admission-documentation/CURRENT_VISUALS.md) and its original image files remain historical evidence.
