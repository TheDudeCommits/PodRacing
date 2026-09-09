# Vehicle appearance acceptance — round25

**PASS for the expanded functional checks, including the confirmed round24 stale readiness defect.** The browser held preview image decoding after the actual Sebulba race geometry became ready, observed “Preparing Sebulba preview… Your race craft is ready.”, then released decoding. The visible status became “Sebulba · seated pilot · twin engines” while the authoritative simulation frame remained **0 → 0**. No extra HUD update, simulation step or art-state write was used.

The fix is limited to `RaceHud.ts` and `VehicleCardPreview.ts`. The preview publishes status transitions after decoded-image commit; the HUD uses its latest garage selection to update the status text and Retry control. The whole HUD does not gain a per-frame garage update. Three focused regressions cover delayed completion without another HUD tick, auxiliary preview failure while race art is ready, and ignored late decode after leaving the garage. The combined round25 source verification passed 512 tests in 90 files, typecheck, build and diff check.

## Exact candidate and browser receipt

- Build: `dist/assets/index-DYsxLpxt.js`, 1,544,377 bytes.
- Build SHA-256: `14c129a2de533fa5c3e4adbdacd1eb1e6cda21112df3fa7317b2e613ae1ac4b5`.
- Harness: `scripts/vehicle-appearance-acceptance.mjs --sebulba`, SHA-256 `f15314fbad2448c5d19d6c9cf249e63a80d89960a20569499783f1649679845e`.
- Raw output: `output/playwright/vehicle-appearance-round25/`.
- Run: 2026-09-07 16:37:47.766–16:38:21.975 UTC, Chrome 152.0.7977.77, 1440×900 CSS viewport, requested DPR 2; separate initial fault context 1280×720.

The first attempt passed all 14 stages from the prior appearance harness: default Teemto, explicit Classic persistence, Teemto return, ordinary live Teemto drive, real Teemto WebGL restoration, Teemto HTTP fallback/retry, late Sebulba cancellation, actual Sebulba garage and two inspected angles, ordinary live Sebulba drive, and Sebulba HTTP fallback/retry. It additionally checks settled ready labels on the relevant garage, reload, inspection and retry paths. Only the two deliberately injected HTTP 503 console errors occurred; there were zero unexpected browser or shader errors.

The held Sebulba request remained deduplicated to one request; releasing its response after the user chose Teemto did not replace the newer choice. Actual Sebulba geometry retains two body/four pilot meshes, six MRT sources and a two-draw body shadow; actual Teemto retains three body/four pilot meshes and seven MRT sources. Existing focused tests and the immutable round24 report contain detailed geometry, ownership, anchor and public asset receipts. No public vehicle asset changed for round25.

`artifact-manifest-before.json`, `artifact-manifest-after.json` and `artifact-manifest-comparison.json` establish that the exact build, all 130 runtime source files, 26 public Inkstorm files, 33 dist files and three relevant harness files were unchanged during this run. All 26 public/dist art pairs match. Chrome and the preview server closed in `finally`; owned port **58820** had no listener afterward.

## Inspection and acceptance boundary

`garage-sebulba.png` was visually inspected and shows the correct ready label with the real imported craft. The same source pilot and capped, pale nozzle cores remain; the previously identified art limitations have not been resolved by this UI fix. The combined candidate also contains independently authored terrain/canyon changes whose visual assessment belongs to the world25 capture.

These results establish the listed functional behavior on this browser. They do not establish human enjoyment, overall art acceptance, Sebulba-specific WebGL restoration or full-race FPS. The separate uninterrupted Teemto and Sebulba Time Attack/Canyon Cup measurements subsequently passed and are recorded in `FULL_RACE_PERFORMANCE_ROUND25.md`. The earlier round24 receipt remains unchanged and its stale UI failure is documented in `SEBULBA_APPEARANCE_ROUND24.md`.
