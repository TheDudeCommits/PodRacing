# Inkstorm acceptance — Round 35 / V29, 9 September 2026

**V29 is the current verified local checkpoint:** **914 tests / 153 files**, TypeScript/build, four native crash/control cases, the separate **219.216887 m/s** high-speed case and **17 native UI captures PASS**. All owned browsers/servers closed with no recorded errors. Bundle `index-BXt2HrHp.js`, **1,850,956 bytes**, SHA-256 `b690e6daa218d438dc97bd232412545f31825d849337ed8a7aef74289389154e`. [Frozen inventory](../../assets/source/inkstorm/combat-round35/v29-frozen-bundle/inventory.json) · [Verification](../../output/reference-ui-round35/verify-v29.log).

**Visual acceptance remains FAIL:** UI style/readability **HUD 7/6.5, Build 7/7.5, map 7.5/8, garage 7.5/7**; crash **5/10** against the required 8. Build, map and garage images are byte-identical to V28 and V27; score variation on those images is not implementation improvement. [Completed UI review and audits](../../output/critics/blind-hud-v29/REVIEW_COMPLETE.json) · [Fresh crash review](../../output/playwright/round35-combat-v29/blind-critic/cli-critic-attempt1/review.md).

The **667×375 primary warning is visibly available**, but **all-warning clearance FAILS**: GO covers a secondary grouped arrow/count during the first 0.0167–0.10 seconds of actual running. The original supplemental native PASS receipt is preserved alongside this independent visual failure; it does not establish post-GO clearance. [Actual warning image](../../output/playwright/round35-compact-warning-native-v29/native-compact-warning.png) · [Raw/visual audit](../../output/critics/blind-hud-v29/COMPACT_WARNING_RAW_AUDIT.json).

**No V29 FPS/performance run has been completed.** V28's measured 59.531562/59.147948 Hz full races and V24b's 59.47/58.98 Hz remain historical, exact-build evidence and do not carry forward. **V30 is private preparation only**, including a bounded GO reservation/post-GO warning check and further crash work. The full AAA overhaul, art-eight acceptance and **22 remaining fleet integrations** stay open. No overhaul commit, push or deployment is claimed.

Current evidence:

| Scope | Status | Evidence |
|---|---|---|
| TypeScript, tests and build | PASS 914 tests / 153 files | [Exact verification](../../output/reference-ui-round35/verify-v29.log) |
| Four crash/control cases and high speed | PASS; 1,512 retained observer samples independently recomputed across five cases | [Combined controls audit](../../output/playwright/round35-combat-v29/native-independent-audit/combined-v29-controls-audit.json) |
| Native UI | PASS 17 captures; 60 part equip/restore actions; 30 total rows; 7 activity/settlement traces | [Receipt](../../output/gauntlet/round35-broadcast-native-v29/receipt.json) |
| Independent UI/raw audit | PASS 3,923 native + 18 critic protocol + 450 grouped-total checks; max row center spread 0.0078125 px | [Complete audit](../../output/critics/blind-hud-v29/REVIEW_COMPLETE.json) |
| Native compact warning | Primary visible; all-warning paint FAIL because GO obscures secondary | [Independent audit](../../output/critics/blind-hud-v29/COMPACT_WARNING_RAW_AUDIT.json) |
| Current art target | UI and crash FAIL8 | [UI critic](../../output/critics/blind-hud-v29/cli-critic-attempt1/review.md), [crash critic](../../output/playwright/round35-combat-v29/blind-critic/cli-critic-attempt1/review.md) |
| Current performance | NOT RUN for V29 | [Historical V28 measurement](evidence/round-35/full-race-v28-summary.json) |

V30's countdown-only private component passes 24 cases / 1,102 checks and has a prepared post-GO native script, **not an admitted V30 runtime or native result**. [Private UI handoff](../../output/critics/ui-countdown-threat-v30/HANDOFF.md). Existing unrelated pressured portrait/844 warning availability and combat-score/Director overlap remain outside that fix. The historical V28 ordinary forward IMPACT/Director clearance remains [separate exact-build evidence](../../output/critics/blind-hud-v28/FORWARD_DIRECTOR_SUPPLEMENT.json); the original HEAT VENT type is component regression evidence.

[Current implementation](ROUND35_UI_COMBAT_HANDOVER.md) · [Actual V29 images and clip](CURRENT_VISUALS.md) · [Exact pre-V29 status and all older boundaries](evidence/round-35/pre-v29-documentation/STATUS.md) · [Archive hashes](evidence/round-35/pre-v29-documentation/inventory.json).
