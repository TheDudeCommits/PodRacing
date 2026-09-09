# Launch escarpment candidate 2

Candidate 2 changes only the two distant leading fronts in `LaunchBasinPlan.ts`. Source SHA-256: `a0ab709353a86372c02e238feaa76083f171f9be85c0a3a9c58a9b21d60ac357`. Candidate 1 and its field/ROI evidence remain in `assets/source/inkstorm/launch-escarpment-v27/candidate1/`; candidate 2 has its own source, tests, scripts, field binaries, receipts, and comparison JSON under `candidate2/`. This is a further working candidate, not art acceptance.

The narrow pointed slots are replaced with wider, blunt-ended fracture bays. Four unequal inset floor shelves interrupt the long drop: one outer west toe, two inner west benches, and one east rubble bench. These are residual volumes inside the excavated bays, below the original rock top. The leading capsule ends now use chamfered broad planes. A mostly linear wall ramp has short C1 joins, replacing the previous continuously curved quintic wall. Wall width is 32 m, bay transitions 30 m, shelf transitions 16–18 m, and the overall two-window fade remains 56 m. The change does not add repeating contour stairs, separate rocks, triangles, draws, or global normal/material changes.

The original ridges, crown targets, connected talus base, bench blending, course/corridor guards, bowl and finish plan remain. The edit is limited to west local forward 640–1140/right -710–-180 and east forward 300–1120/right 180–700. The 32 m ramp has a lower maximum derivative than candidate 1's 48 m quintic ramp; the existing composition continuity test remains unchanged and passes. This does not eliminate all clipmap interpolation error.

**Validation: 31 tests in nine focused files pass, typecheck passes, and `git diff --check` passes.** The original 532,296-sample racing corridor/shoulder/normal hash, 1,909-sample negative bowl hash, and finish grid hash remain unchanged. Independent before/after physical samples retain exactly zero difference across 15,851 near-west points and 11,014 yard-interior points. Across the full saved launch grid, 11,872 texels change, with zero changes outside the two windows, zero near-west changes and zero padded bench-core changes. The finish grid stays byte-identical, SHA-256 `bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`. Camera poses/FOV and launch grade profile remain identical. Maximum off-road height change from round 26 is -251.268 m / +110.011 m; the positive changes come from reshaping the existing cap into projecting faces inside the authorized windows.

The new shape test preserves the deep bay floor and separately requires a higher inset shelf, instead of requiring one uninterrupted vertical drop. The frozen historical interpolation fixture still reproduces the original >130 m coarse error with <8 m detail error; the current-field fixture retains <8 m detail error and at least fourfold improvement. No historical continuity, protection or mesh-budget assertion was loosened.

The same five actual-camera terrain ROIs each use 117 rays. Every camera has the same **390,656 terrain triangles / six draws**. Relative to round 26:

| Region | Rays changed >5 m | Rays receding >25 m | Largest recession | Largest sampled mesh/physical height error | Error p95 |
|---|---:|---:|---:|---:|---:|
| Launch west | 91 | 50 | 311.32 m | 10.19 m | 8.68 m |
| Launch east | 70 | 37 | 274.03 m | 14.88 m | 9.56 m |
| Crest west | 102 | 66 | 309.67 m | 30.33 m | 10.54 m |
| Crest east | 53 | 26 | 305.02 m | 13.53 m | 6.94 m |
| Descent west | 83 | 50 | 415.11 m | 21.89 m | 7.67 m |

The largest interpolation outlier is on the west bay back transition at local forward 1075.512/right -323.201, in a 12 m mesh cell, viewed at normalized crest pixel (0.276923, 0.358333). Its mesh hit is 152.054 m high versus physical height 182.382 m. It is off the protected route. Candidate 1's largest sampled crest-west error was 17.85 m, so candidate 2 worsens this local value while widening the recess. This is an explicit resolution limitation, not a claim of uniformly improved geometry. The reports retain advancing rays as well as receding rays. `candidate1-delta.json` separately compares the two candidates.

The ROI study reconstructs exact production ring triangles and camera poses with the CPU physical field. It excludes occlusion by scans, factory, gantry, vehicle and HUD. It is not a GPU raster capture and sampled maxima are not global bounds.

Directly viewed `output/gauntlet/round27-nozzle-v1/05-launch.png`, whose bundled source root verified against the candidate 2 SHA above, alongside candidate 1 and the focused concept paintover. The tall pointed inner-left wedge becomes a squat broken shelf, and the larger left recess exposes side planes. This is useful but modest: long smooth faces and the abrupt transition to detailed scans still fall short of the target. The combined capture also contains root's nozzle and contact-shader changes, so it is not a terrain-only A/B. Crest/descent review, blind art assessment and measured full-race acceptance remain open. This subtask did not build dist or run a browser, Blender or render.

Reproduce the CPU evidence from the repo with candidate 2 source present:

```sh
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/capture-field.ts candidate2
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/compare-fields.ts candidate2
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/project-terrain.ts candidate2
python3 assets/source/inkstorm/launch-escarpment-v27/compare-rois.py candidate2
npx vitest run tests/terrain/authoredTerrainDetail.test.ts tests/terrain/launchEscarpment.test.ts tests/terrain/connectedLaunchRidge.test.ts tests/terrain/erodedLaunchRidge.test.ts tests/terrain/signedCourseTerrain.test.ts tests/terrain/launchBasinComposition.test.ts tests/terrain/launchElevationProfile.test.ts tests/render/inkstormLaunchDepth.test.ts tests/race/inkstormLaunchOwnership.test.ts
```

Do not regenerate the frozen `round26` fields from candidate source. Root coordinates the actual crest/descent captures and subsequent decision.
