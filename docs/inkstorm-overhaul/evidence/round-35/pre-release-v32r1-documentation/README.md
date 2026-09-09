# Now This Is PodRacing — local Inkstorm overhaul

A Three.js/TypeScript desert racer with authored scenery, a workshop, race progression, combat and an ongoing Inkstorm visual overhaul.

**Current local checkpoint: V31.** The driving HUD is cleaner and ground-contact dust is softer. TypeScript/build, 923 tests, five native crash/control scenarios and 17 UI captures pass. Complete races averaged **59.5 / 59.0 fps** on the tested M4 Mac at 1440×900 with adaptive resolution.

The visual target is still open: the fresh crash review is **5/10**, and HUD style/readability is **6.5/7**. Four of 26 preserved vehicle families are integrated. No overhaul commit, push or deployment is claimed.

[Checkout handover](HANDOVER.md) · [Acceptance status](docs/inkstorm-overhaul/STATUS.md) · [Actual game images and clip](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Exact build and measurements](docs/inkstorm-overhaul/ROUND35_UI_COMBAT_HANDOVER.md) · [Vehicle catalogue/licences](docs/inkstorm-overhaul/VEHICLE_CATALOG.md).

Run from `/Users/amir/Projects/PodRacing`:

```sh
npm install
npm run dev
```

`npm run verify` runs TypeScript checks, tests and the production build. Keep source/build frozen during measurements and close owned browsers after use. [Exact prior README](docs/inkstorm-overhaul/evidence/round-35/pre-v31-documentation/README.md).
