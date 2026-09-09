# Now This Is PodRacing — local Inkstorm overhaul

An original Three.js/TypeScript desert racer with an ongoing authored visual and interface overhaul. The local checkpoint is **Round 35 / V29**; the full overhaul is unfinished.

**V29 is the current verified local checkpoint:** **914 tests / 153 files**, TypeScript/build, four native crash/control cases, the separate **219.216887 m/s** high-speed case and **17 native UI captures PASS**. All owned browsers/servers closed with no recorded errors. Bundle `index-BXt2HrHp.js`, **1,850,956 bytes**, SHA-256 `b690e6daa218d438dc97bd232412545f31825d849337ed8a7aef74289389154e`. [Frozen inventory](assets/source/inkstorm/combat-round35/v29-frozen-bundle/inventory.json) · [Verification](output/reference-ui-round35/verify-v29.log).

**Visual acceptance remains FAIL:** UI style/readability **HUD 7/6.5, Build 7/7.5, map 7.5/8, garage 7.5/7**; crash **5/10** against the required 8. Build, map and garage images are byte-identical to V28 and V27; score variation on those images is not implementation improvement. [Completed UI review and audits](output/critics/blind-hud-v29/REVIEW_COMPLETE.json) · [Fresh crash review](output/playwright/round35-combat-v29/blind-critic/cli-critic-attempt1/review.md).

The **667×375 primary warning is visibly available**, but **all-warning clearance FAILS**: GO covers a secondary grouped arrow/count during the first 0.0167–0.10 seconds of actual running. The original supplemental native PASS receipt is preserved alongside this independent visual failure; it does not establish post-GO clearance. [Actual warning image](output/playwright/round35-compact-warning-native-v29/native-compact-warning.png) · [Raw/visual audit](output/critics/blind-hud-v29/COMPACT_WARNING_RAW_AUDIT.json).

**No V29 FPS/performance run has been completed.** V28's measured 59.531562/59.147948 Hz full races and V24b's 59.47/58.98 Hz remain historical, exact-build evidence and do not carry forward. **V30 is private preparation only**, including a bounded GO reservation/post-GO warning check and further crash work. The full AAA overhaul, art-eight acceptance and **22 remaining fleet integrations** stay open. No overhaul commit, push or deployment is claimed.

[Actual V29 crash clip](output/playwright/round35-combat-v29/temporal-review/v29-native-crash-excerpt.mp4) · [Current gallery](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Implementation and QA](docs/inkstorm-overhaul/ROUND35_UI_COMBAT_HANDOVER.md) · [Source catalogue/licences](docs/inkstorm-overhaul/VEHICLE_CATALOG.md).

Run from `/Users/amir/Projects/PodRacing`:

```sh
npm install
npm run dev
```

`npm run verify` runs TypeScript checks, tests and the production build. Coordinate browser/GPU runs and preserve the current frozen build during measurements. The [handover](HANDOVER.md) identifies the checkout and active limits. The [exact archived README](docs/inkstorm-overhaul/evidence/round-35/pre-v29-documentation/README.md) preserves the full earlier product descriptions, controls and verification history; its old acceptance claims belong to their original checkpoints.
