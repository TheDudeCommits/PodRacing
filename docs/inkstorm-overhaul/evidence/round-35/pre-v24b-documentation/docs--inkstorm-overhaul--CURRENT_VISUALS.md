# Inkstorm current visual review — Round 35, 9 September 2026

The active UI/combat checkpoint and its exact evidence are in [ROUND35_UI_COMBAT_HANDOVER.md](ROUND35_UI_COMBAT_HANDOVER.md). The overhaul and final art remain incomplete. Current work includes the reference-inspired interface, actual solo slow motion and two chaos pickups; the four registered fleet families are unchanged. No deployment is claimed.

## Current V22 interface

These are actual local game captures from `index-CmUCVazP.js` (SHA-256 `edcb8d7a510025d4a554e4c89fb511774c00c0b27fe681a271005c0a90cd52f3`). They show implemented screens, not generated targets. The complete 17-capture native UI check passes, including all equipment options and saved-event flow. Fresh independent visual review remains FAIL: HUD6.5/6.5, Build7/8, map6.5/8, garage7.5/7.5 (style/readability). A functional pass does not establish reference parity.

![Actual V22 HUD during driving](../../output/gauntlet/round35-broadcast-native-v22/06-desktop-live-race.png)

![Actual V22 Build screen](../../output/gauntlet/round35-broadcast-native-v22/03-desktop-build.png)

![Actual V22 destination map](../../output/gauntlet/round35-broadcast-native-v22/02-desktop-map.png)

![Actual V22 garage](../../output/gauntlet/round35-broadcast-native-v22/01-desktop-garage.png)

The latest independently reviewed crash is V22, **5/10 FAIL at 8**: the earlier drop is visible, but separated machinery still looks suspended and the ground strike needs more force. [Actual temporal review and footage](../../output/playwright/round35-combat-v22/temporal-review/REVIEW.md). Its exact build is the same V22 artifact. Prior V20 images, footage and measured performance remain preserved in their evidence folders. See [current verification and limitations](ROUND35_UI_COMBAT_HANDOVER.md).

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
