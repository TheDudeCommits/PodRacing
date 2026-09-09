# Inkstorm acceptance — Round 35 / V30

**V30 is the current verified local checkpoint, with rejected dust visuals.** TypeScript/build and **923 tests / 155 files** pass. Four native crash/control cases, a separate **222.630037 m/s** explosion, and **17 native UI captures** pass. Bundle `index-B0KOQq1G.js`, **1,858,418 bytes**, SHA-256 `f451557b7e96c72fe0c85f6062f1f0a242e0de2db6752ecfcf4b46d54b37bc6e`.

**Exact-build M4 performance passes:** full races **59.516059 / 59.071497 Hz**, p95 **16.8 ms** each; isolated crash cadence is about 60 Hz. Browser RAF intervals at 1440×900, requested DPR2 with adaptive resolution, are not physical scanout or other-device evidence. All four freeze boundaries match across seven categories; owned browsers/servers closed.

**Visual acceptance remains FAIL:** fresh crash **4.5/10**; UI style/readability **HUD 6.5/6.5, Build 7/8, map 7.5/8, garage 7.5/7.5**. The new opaque dust looks like small outlined mounds and is explicitly rejected. Menu images are byte-identical to V27–V30; changed menu scores are reviewer variation. V31 soft dust and driving-instrument changes are private work, not admitted or measured.

At **667×375**, the post-GO native warning check passes. The separate GO-active opportunity remains **UNAVAILABLE** because natural grouping changed between snapshots; its actual grouped arrow/count is clear of GO, but a later **INCOMING LANCE +1** caption overflows. Preserve that failure separately. The full overhaul, art-eight acceptance and **22 of 26 source-family integrations** remain open. No overhaul commit, push or deployment is claimed.

| Scope | Current result | Evidence |
|---|---|---|
| TypeScript, tests, build | PASS 923/155 | [Verification](../../output/reference-ui-round35/verify-v30.log) |
| Five native crash/control analyses | PASS, 1,520 raw samples independently recomputed | [Audit](../../output/playwright/round35-combat-v30/native-independent-audit/combined-v30-controls-audit.json) |
| Native UI | PASS17, 60 equip/restore actions, 30 totals, seven activity traces | [Receipt](../../output/gauntlet/round35-broadcast-native-v30/receipt.json) |
| UI raw/protocol/grouped totals | PASS 3,942 / 18 / 450; max center spread .0078125px | [Completed review](../../output/critics/blind-hud-v30/REVIEW_COMPLETE.json) |
| Actual post-GO compact warnings | PASS; 53 raw checks | [Audit](../../output/critics/blind-hud-v30/COMPACT_POST_GO_RAW_AUDIT.json) |
| Separate GO-active grouping | UNAVAILABLE; GO clearance visible, subsequent caption fit FAIL | [Separate audit](../../output/critics/blind-hud-v30/COMPACT_GO_ACTIVE_RAW_AUDIT.json) |
| UI / crash art target | FAIL8; solid dust rejected | [UI critic](../../output/critics/blind-hud-v30/cli-critic-attempt1/review.md), [crash critic](../../output/playwright/round35-combat-v30/blind-critic/cli-critic-attempt1/review.md) |
| Exact V30 M4 performance | PASS 59.516059 / 59.071497Hz | [Full measurements and cleanup](evidence/round-35/full-race-v30-summary.json) |
| Ivory fit | Bounded neutral fit sanity only, no runtime admission | [Four matched renders and guards](../../assets/source/inkstorm/blockrunner-ivory-round34/control-fit-review-v1/REVIEW_COMPLETE.json) |

V31 has a [driving-HUD plan](../../output/critics/ui-driving-hierarchy-v31/PLAN.md) and [soft-billow proposal](../../output/playwright/round35-combat-v30/temporal-review/NEXT_REPRESENTATION_PROPOSAL.md). Neither inherits V30 performance or visual acceptance. Broader pressured-layout/Director/score overlaps, audio, physical-device/controller, multiplayer, world and fleet acceptance remain open. [Current implementation](ROUND35_UI_COMBAT_HANDOVER.md) · [Gallery](CURRENT_VISUALS.md) · [Exact prior status](evidence/round-35/pre-v30-native-documentation/STATUS.md).
