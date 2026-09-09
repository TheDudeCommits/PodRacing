# Authored cliff tessellation — round25 evidence

The launch cliffs' folded silhouettes were partly a sampling defect: the beauty mesh used 48 m cells where the shared physical field contains narrower ravines. The same field sampled at triangle corners could replace a tall face with a diagonal plane more than 100 m lower. This revision adds geometric samples to the authored terrain mesh. The course field, driving surface, road, physics, records and source art are unchanged.

## Evidence and design

`scripts/terrain-interpolation-study.ts` reads the actual four round24 launch camera positions and compares indexed-cell interpolation with the unchanged physical sampler. The paired study uses identical sites for every plan. It explicitly omits the union of transition-fan bands, which receive separate topology tests. This is CPU geometric evidence, not an image-quality or GPU timing result.

| Camera | Old p95 height error | Revised p95 height error | Old maximum | Revised maximum |
| --- | ---: | ---: | ---: | ---: |
| Launch | 43.45 m | 2.44 m | 136.30 m | 11.79 m |
| Approach | 43.32 m | 2.63 m | 122.50 m | 16.41 m |
| Crest | 41.80 m | 2.11 m | 137.56 m | 8.95 m |
| Descent | 35.66 m | 2.69 m | 128.22 m | 16.54 m |

Each view has 4,248–4,383 identical paired sites on the raised launch cliffs. The final receipt is `output/terrain/round25-interpolation-study-centers/receipt.json`. Initial exploratory and paired receipts remain alongside it.

The authored cell sizes are now `[1.5, 6, 12, 12, 12, 24]` m. Levels 3 and 4 additionally sample each regular cell centre and draw four triangles around it. Shared boundaries and transition fans keep their existing vertices. Terrain topology rises from **64,896 to 390,656 triangles per consuming pass**, with **six meshes/draws**. The same registered mesh objects serve beauty, depth and MRT; only their cached geometry changes on course-mode entry/exit. Procedural courses retain the original topology. The cache is disposed with the terrain system, including both geometry sets exactly once.

The first 269,312-triangle attempt, without centre samples, failed the new recorded-face test: its error was **12.506 m**, above the unchanged **8 m** requirement. That failed log remains at `output/terrain/round25-detail-tests.log`. The geometry was refined further; the 8 m requirement was retained. The exploratory topology budget consequently increased from 270k to 400k triangles. At source handoff the user's actual **40–60 fps** budget still required measurement; the subsequent local adaptive result is recorded below. A triangle count is not a substitute.

## Source-stage verification — preserved

The recorded physical-face test, adjacent boundary stitching, repeated mode-cache/disposal, coverage, signed bounds and shared-field tests pass: **20 tests in five files**, plus typecheck and diff check. The coverage raycast test exceeds its former 5-second runner timeout with the denser mesh; its timeout is now 20 seconds and all 729 quality/position/footprint checks remain. The timeout failure is retained in `round25-detail-final-tests.log`; the complete retry passes in `round25-detail-final-retry-tests.log`. This timeout is unrelated to the unchanged browser cadence gate.

The first complete suite passed 511 of 512 tests; its exhaustive per-vertex bounds test also exceeded the old 5-second timeout under parallel load (5.484 seconds). That test now has a 20-second timeout, with every vertex and bound assertion retained. The first suite log is `output/gauntlet/round-25-verify.log`.

At source handoff, combined build, actual screenshots, fresh criticism and full-race timing were pending. Existing source and failed evidence remain preserved. The instruction to optimize a measured bottleneck while retaining visible surface quality remains applicable to future revisions.

## Subsequent combined round25 acceptance

The combined build `index-DYsxLpxt.js`, SHA `14c129a2de533fa5c3e4adbdacd1eb1e6cda21112df3fa7317b2e613ae1ac4b5`, passed **512 tests / 90 files**, typecheck, build and diff check. Seven sections, eight supplemental views, garage and live capture rendered without browser errors. Actual launch images reduce the giant triangular caps, but the resulting crowns remain too smooth and featureless for the target. Fresh criticism is **FAIL, 0/7 art sections accepted**; see [round25 image review](BLIND_WORLD_ROUND25.md).

Both complete Time Attack/Canyon Cup runs then passed on **local Apple M4 / Chrome 152 at adaptive resolution**, once with default Teemto and once with UI-selected Sebulba. All four racing phases averaged approximately 60 Hz, p95 **16.7 ms**, maximum **16.8 ms**, with no racing interval above 25 ms and zero browser errors. Time Attacks used DPR 1–2 and Cups briefly used 1.875 before recovering 2. All 412 renderer samples retained six effective rings and 3072 m coverage. Maximum whole-frame submissions were 3,742,530 triangles for Teemto Cup and 3,753,981 for Sebulba Cup. This establishes the measured local adaptive budget, not fixed-DPR-2, other-device or art acceptance. [Exact performance, raw frames and manifests](FULL_RACE_PERFORMANCE_ROUND25.md).

All runtime/public/dist/harness manifests matched through those runs and owned browsers/servers closed. The round25 timing freeze is now released. **Round26 arch/fork work is not validated** and does not inherit these results. Pilot v2c remains processed-only and rejected at 5.6/10; 24 vehicle downloads remain pending and no overhaul deployment has occurred.
