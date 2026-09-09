# Inkstorm acceptance — Round 35 / V31

**V31 is admitted and locally verified; visual acceptance remains FAIL.** Bundle `index-CON7YNy8.js`, 1,860,357 bytes, SHA-256 `c9e1cf4e6c2c3d3d64ec048bbc682925823757d04f8c26e6aa7516ae92990915`.

| Scope | Current result | Evidence |
|---|---|---|
| TypeScript, tests, build | PASS: 923 tests / 155 files | [Verification](../../output/reference-ui-round35/verify-v31.log) |
| Five native crash/control analyses | PASS: 1,517 raw samples independently recomputed | [Audit](../../output/playwright/round35-combat-v31/native-independent-audit/combined-v31-controls-audit.json) |
| Native UI | PASS: 17 captures, 60 equip/restore actions, 30 totals, seven motion traces | [Receipt](../../output/gauntlet/round35-broadcast-native-v31/receipt.json) |
| UI raw/protocol/grouped totals | PASS: 3,885 / 18 / 450; max center spread .0078125 px | [Completed review](../../output/critics/blind-hud-v31/REVIEW_COMPLETE.json) |
| Post-GO compact warnings | PASS: 53 raw checks, GO hidden | [Audit](../../output/critics/blind-hud-v31/COMPACT_POST_GO_RAW_AUDIT.json) |
| Separate GO-active grouping | UNAVAILABLE: no eligible opportunity within unchanged 12-second bound, no image | [Receipt](../../output/playwright/round35-compact-go-warning-native-v31/receipt.json) |
| HUD style/readability | 6.5/7; FAIL against art target 8 | [Fresh UI critic](../../output/critics/blind-hud-v31/cli-critic-attempt1/review.md) |
| Crash art | 5/10; FAIL against 8 | [Fresh crash critic](../../output/playwright/round35-combat-v31/blind-critic/cli-critic-attempt1/review.md) |
| Exact V31 M4 performance | PASS: 59.516532 / 59.000434 Hz, p95 16.8 ms each | [Full measurements and cleanup](evidence/round-35/full-race-v31-summary.json) |
| Ivory material finish | Actual source copy and matched views; fresh critic 5.5/10 overall, materials 4/10; no runtime admission | [Source review](../../assets/source/inkstorm/blockrunner-ivory-round34/material-finish-v1/REVIEW_COMPLETE.json), [blind critic](../../output/critics/blind-ivory-material-v1/REVIEW_COMPLETE.json) |

Build/map/garage scores are 7/8, 7/8 and 7.5/7.5. Their images are byte-identical V27–V31; score movement is reviewer variation. Contact dust no longer has the rejected V30 solid-mound appearance, but remains faint and partly obscured beneath the engine. Camera/aftermath force is still insufficient. Component checks and performance do not override those visual failures.

V31 wrapping captions pass 87 component warning cases. Its actual compact post-GO scenario contains impact/mines; no new native GO-active or INCOMING LANCE opportunity was captured. V30's partial GO image and later caption overflow remain historical evidence.

V32 ability-frame consistency is private preparation, without admission/native/FPS evidence. Existing HUD key captions E/Q/F are hardcoded and do not follow remaps. Broader pressured layouts, audio, physical controller/device, multiplayer, world and fleet acceptance remain open. Four registered / 26 preserved families; 22 pending. No overhaul commit/push/deployment.

[Current implementation](ROUND35_UI_COMBAT_HANDOVER.md) · [Gallery](CURRENT_VISUALS.md) · [Exact prior status](evidence/round-35/pre-v31-documentation/STATUS.md).
