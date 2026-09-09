# Actual Inkstorm visuals — Round 35 / V30

**V30 is the current verified local checkpoint, with rejected dust visuals.** TypeScript/build and **923 tests / 155 files** pass. Four native crash/control cases, a separate **222.630037 m/s** explosion, and **17 native UI captures** pass. Bundle `index-B0KOQq1G.js`, **1,858,418 bytes**, SHA-256 `f451557b7e96c72fe0c85f6062f1f0a242e0de2db6752ecfcf4b46d54b37bc6e`.

**Exact-build M4 performance passes:** full races **59.516059 / 59.071497 Hz**, p95 **16.8 ms** each; isolated crash cadence is about 60 Hz. Browser RAF intervals at 1440×900, requested DPR2 with adaptive resolution, are not physical scanout or other-device evidence. All four freeze boundaries match across seven categories; owned browsers/servers closed.

**Visual acceptance remains FAIL:** fresh crash **4.5/10**; UI style/readability **HUD 6.5/6.5, Build 7/8, map 7.5/8, garage 7.5/7.5**. The new opaque dust looks like small outlined mounds and is explicitly rejected. Menu images are byte-identical to V27–V30; changed menu scores are reviewer variation. V31 soft dust and driving-instrument changes are private work, not admitted or measured.

At **667×375**, the post-GO native warning check passes. The separate GO-active opportunity remains **UNAVAILABLE** because natural grouping changed between snapshots; its actual grouped arrow/count is clear of GO, but a later **INCOMING LANCE +1** caption overflows. Preserve that failure separately. The full overhaul, art-eight acceptance and **22 of 26 source-family integrations** remain open. No overhaul commit, push or deployment is claimed.

## Actual V30 crash: rejected dust trial

[Play the straight4.96s native excerpt](../../output/playwright/round35-combat-v30/temporal-review/v30-native-crash-excerpt.mp4) · [Timing/provenance](../../output/playwright/round35-combat-v30/temporal-review/short-clip-receipt.json) · [Dense visual review](../../output/playwright/round35-combat-v30/temporal-review/VISUAL_REVIEW.md). No retiming/overlays;25fps capture is not engine FPS. Fresh critic4.5/10FAIL; the small outlined ground cluster looks solid and is rejected.

![Actual V30 debris-return frame, rejected dust appearance](/Users/amir/Projects/PodRacing/output/playwright/round35-combat-v30/temporal-review/debris-return-pts11.60.png)

## Actual V30 driving interface

![Actual V30 native HUD](/Users/amir/Projects/PodRacing/output/gauntlet/round35-broadcast-native-v30/06-desktop-live-race.png)

[Build](../../output/gauntlet/round35-broadcast-native-v30/03-desktop-build.png), [map](../../output/gauntlet/round35-broadcast-native-v30/02-desktop-map.png) and [garage](../../output/gauntlet/round35-broadcast-native-v30/01-desktop-garage.png) remain byte-identical V27–V30. [Fresh UI review](../../output/critics/blind-hud-v30/cli-critic-attempt1/review.md); no menu-score change is treated as new implementation.

## Actual post-GO compact warning check

RaceTime2.0167–2.10s, countdown hidden, real ordinary controller. [53-check post-GO audit](../../output/critics/blind-hud-v30/COMPACT_POST_GO_RAW_AUDIT.json).

![Actual V30 post-GO compact warning opportunity](/Users/amir/Projects/PodRacing/output/playwright/round35-compact-warning-native-v30/native-compact-warning.png)

The separate [GO-active opportunity](../../output/playwright/round35-compact-go-warning-native-v30/native-compact-go-warning.png) is UNAVAILABLE under its retained grouping-stability criteria. Its saved grouped arrow/+1 is clear of GO, while a subsequent INCOMING LANCE +1 caption fails fit. [Separate audit](../../output/critics/blind-hud-v30/COMPACT_GO_ACTIVE_RAW_AUDIT.json). Do not combine these into universal warning acceptance.

## Generated targets — not gameplay

Concept19 guides the ground cloud. Native V30 above does not meet it; V31 changes representation. [Notes](concepts/19-ground-strike-volume-v30-target.md) · [Provenance](concepts/19-ground-strike-volume-v30-receipt.json).

![Generated ground-strike target](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/19-ground-strike-volume-v30-target.png)

Concept20 studies an open speed outline and compact alert/resource rows. Generator omissions/reconstruction are not instructions to remove live data or alter source geometry. [Notes](concepts/20-clean-driving-instruments-v31-target.md) · [Provenance](concepts/20-clean-driving-instruments-v31-receipt.json).

![Generated driving-instrument target](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/20-clean-driving-instruments-v31-target.png)

[Current implementation](ROUND35_UI_COMBAT_HANDOVER.md) · [Exact former V29 gallery](evidence/round-35/pre-v30-native-documentation/CURRENT_VISUALS.md) · [Complete older gallery](evidence/round-35/pre-v29-documentation/CURRENT_VISUALS.md).
