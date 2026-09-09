# Now This Is PodRacing — local Inkstorm overhaul

A Three.js/TypeScript desert racer with an ongoing authored visual and interface overhaul.

**V30 is the current verified local checkpoint, with rejected dust visuals.** TypeScript/build and **923 tests / 155 files** pass. Four native crash/control cases, a separate **222.630037 m/s** explosion, and **17 native UI captures** pass. Bundle `index-B0KOQq1G.js`, **1,858,418 bytes**, SHA-256 `f451557b7e96c72fe0c85f6062f1f0a242e0de2db6752ecfcf4b46d54b37bc6e`.

**Exact-build M4 performance passes:** full races **59.516059 / 59.071497 Hz**, p95 **16.8 ms** each; isolated crash cadence is about 60 Hz. Browser RAF intervals at 1440×900, requested DPR2 with adaptive resolution, are not physical scanout or other-device evidence. All four freeze boundaries match across seven categories; owned browsers/servers closed.

**Visual acceptance remains FAIL:** fresh crash **4.5/10**; UI style/readability **HUD 6.5/6.5, Build 7/8, map 7.5/8, garage 7.5/7.5**. The new opaque dust looks like small outlined mounds and is explicitly rejected. Menu images are byte-identical to V27–V30; changed menu scores are reviewer variation. V31 soft dust and driving-instrument changes are private work, not admitted or measured.

At **667×375**, the post-GO native warning check passes. The separate GO-active opportunity remains **UNAVAILABLE** because natural grouping changed between snapshots; its actual grouped arrow/count is clear of GO, but a later **INCOMING LANCE +1** caption overflows. Preserve that failure separately. The full overhaul, art-eight acceptance and **22 of 26 source-family integrations** remain open. No overhaul commit, push or deployment is claimed.

[Implementation and evidence](docs/inkstorm-overhaul/ROUND35_UI_COMBAT_HANDOVER.md) · [Actual gallery](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Frozen V30](assets/source/inkstorm/combat-round35/v30-frozen-bundle/inventory.json)

Run from `/Users/amir/Projects/PodRacing`:

```sh
npm install
npm run dev
```

`npm run verify` runs TypeScript checks, tests and the production build. Coordinate browser/GPU work and keep the exact build frozen during measurements. [Vehicle source catalogue/licences](docs/inkstorm-overhaul/VEHICLE_CATALOG.md) · [Checkout handover](HANDOVER.md) · [Exact prior README](docs/inkstorm-overhaul/evidence/round-35/pre-v30-native-documentation/README.md).
