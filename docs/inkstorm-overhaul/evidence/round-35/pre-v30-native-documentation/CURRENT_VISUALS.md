# Actual Inkstorm visuals — Round 35 / V29

These are actual native captures and an unchanged-speed recording excerpt from V29. Generated concepts remain targets only. [Current implementation/acceptance](ROUND35_UI_COMBAT_HANDOVER.md).

**V29 is the current verified local checkpoint:** **914 tests / 153 files**, TypeScript/build, four native crash/control cases, the separate **219.216887 m/s** high-speed case and **17 native UI captures PASS**. All owned browsers/servers closed with no recorded errors. Bundle `index-BXt2HrHp.js`, **1,850,956 bytes**, SHA-256 `b690e6daa218d438dc97bd232412545f31825d849337ed8a7aef74289389154e`. [Frozen inventory](../../assets/source/inkstorm/combat-round35/v29-frozen-bundle/inventory.json) · [Verification](../../output/reference-ui-round35/verify-v29.log).

**Visual acceptance remains FAIL:** UI style/readability **HUD 7/6.5, Build 7/7.5, map 7.5/8, garage 7.5/7**; crash **5/10** against the required 8. Build, map and garage images are byte-identical to V28 and V27; score variation on those images is not implementation improvement. [Completed UI review and audits](../../output/critics/blind-hud-v29/REVIEW_COMPLETE.json) · [Fresh crash review](../../output/playwright/round35-combat-v29/blind-critic/cli-critic-attempt1/review.md).

The **667×375 primary warning is visibly available**, but **all-warning clearance FAILS**: GO covers a secondary grouped arrow/count during the first 0.0167–0.10 seconds of actual running. The original supplemental native PASS receipt is preserved alongside this independent visual failure; it does not establish post-GO clearance. [Actual warning image](../../output/playwright/round35-compact-warning-native-v29/native-compact-warning.png) · [Raw/visual audit](../../output/critics/blind-hud-v29/COMPACT_WARNING_RAW_AUDIT.json).

**No V29 FPS/performance run has been completed.** V28's measured 59.531562/59.147948 Hz full races and V24b's 59.47/58.98 Hz remain historical, exact-build evidence and do not carry forward. **V30 is private preparation only**, including a bounded GO reservation/post-GO warning check and further crash work. The full AAA overhaul, art-eight acceptance and **22 remaining fleet integrations** stay open. No overhaul commit, push or deployment is claimed.

## Actual V29 crash clip

[Play the 4.88-second native crash excerpt](../../output/playwright/round35-combat-v29/temporal-review/v29-native-crash-excerpt.mp4) · [Original source PTS and encoding provenance](../../output/playwright/round35-combat-v29/temporal-review/short-clip-receipt.json) · [Temporal assessment](../../output/playwright/round35-combat-v29/temporal-review/VISUAL_REVIEW.md). No speed changes or added overlays; this 25fps recording is not an engine-FPS measurement. Fresh spectacle score remains **5/10 FAIL**.

![Actual V29 native crash](/Users/amir/Projects/PodRacing/output/playwright/round35-combat-v29/solo-chase-wreck.png)

## Actual V29 interface

[Build](../../output/gauntlet/round35-broadcast-native-v29/03-desktop-build.png), [map](../../output/gauntlet/round35-broadcast-native-v29/02-desktop-map.png) and [garage](../../output/gauntlet/round35-broadcast-native-v29/01-desktop-garage.png) are byte-identical to their V28 and V27 images. The seven-image critic uses these unchanged captures and the original references; supplemental views do not replace its inputs.

![Actual V29 native HUD](/Users/amir/Projects/PodRacing/output/gauntlet/round35-broadcast-native-v29/06-desktop-live-race.png)

## Actual compact warning: primary visible, secondary obscured

This ordinary 667×375 launch opportunity has a readable left IMPACT warning and SOLA DINN label. The large GO covers the secondary grouped arrow/count near the top center. The original native PASS receipt is preserved, while independent visual inspection records **all-warning paint FAIL**. This is not post-GO coverage. [Exact before/after snapshots and actual bounds](../../output/playwright/round35-compact-warning-native-v29/receipt.json) · [Independent audit](../../output/critics/blind-hud-v29/COMPACT_WARNING_RAW_AUDIT.json).

![Actual V29 compact launch with GO obscuring a secondary warning](/Users/amir/Projects/PodRacing/output/playwright/round35-compact-warning-native-v29/native-compact-warning.png)

The [V30 countdown-only candidate](../../output/critics/ui-countdown-threat-v30/HANDOFF.md) is private component evidence and is not shown as an actual V30 native result. Historical V28 on-course 10/20/30-second and forward IMPACT/Director galleries, V27 menu motion, and older image/reference history remain in the [complete pre-V29 visual archive](evidence/round-35/pre-v29-documentation/CURRENT_VISUALS.md). [Historical V28 forward-clearance audit](../../output/critics/blind-hud-v28/FORWARD_DIRECTOR_SUPPLEMENT.json) · [Archive hashes](evidence/round-35/pre-v29-documentation/inventory.json).

## Generated V30 dust target — not gameplay

This focused paint-over guides the private replacement of the faint contact streak with rounded, illuminated sand plumes at the existing rear-engine contact. It is not source-geometry, terrain, GPU or FPS evidence, and it does not authorize invented front/left contacts. The blind comparison still uses the original supplied video frame. [Target notes](concepts/19-ground-strike-volume-v30-target.md) · [Input/output provenance](concepts/19-ground-strike-volume-v30-receipt.json).

![Generated ground-strike volume target](/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/19-ground-strike-volume-v30-target.png)
