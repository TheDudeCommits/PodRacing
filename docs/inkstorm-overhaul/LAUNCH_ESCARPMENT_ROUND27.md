# Bounded launch escarpments — round 27 candidate

`src/game/race/LaunchBasinPlan.ts` now breaks the two leading distant terrain caps into unequal projecting shelves and deep open slots. The original source is preserved at `assets/source/inkstorm/launch-escarpment-v27/LaunchBasinPlan.round26.ts`; its SHA-256 is `1cfc5368ece68da9be7bb2429d79015eb084a6b8f7ff4698e8b1b12826ce7719`. The candidate source SHA-256 is `c14f456e553894e2db3a2e4b7aa4bbfd877ae06e24309f795b33c788c19e461a`.

The bounded edit affects `west-basin-shelves` and `industrial-east-ridge`. Each receives three unequal polygonal shelves and two terminating, skewed slots through its leading cap. Shelf elevations and endpoints differ; there is no periodic stratum function or repeated concentric stair contour. The existing wall midpoint is retained, while its broad 81–104 m rounded transition narrows to 48 m only inside the two front windows. Slot joins feather over 40 m; shelf joins use 24 m; each overall window fades through 56 m. The original spines, upper summit targets, connected talus, near-west mass, final industrial bench blend, course masks, basin reveal and curved floor remain in place. Terrain elevations changed through the existing physical field. No mesh topology, texture, material, camera, physics configuration, course plan or geometry budget was added or changed by this subtask.

The first 26 m wall draft failed the existing continuity limit and introduced up to 51 m of off-road clipmap/physical discrepancy at sampled rays. Its joins were broadened; the existing test threshold was retained. The final candidate passes **27 tests in eight focused files**, plus typecheck and whitespace validation. This includes the unchanged historical **532,296-sample racing corridor/shoulder/normal hash**, the negative bowl and finish hashes, bench flatness/continuity, launch grading, scan depth/ownership, and three new tests for actual front recesses, adjacent surviving shelves, and unchanged near/central/rear regions.

The combined suite exposed one historical interpolation fixture whose terrain was intentionally cut by this change. `authoredTerrainRound26.ts` now freezes its seven exact pre-sculpt physical heights from the preserved round26 field, including both coarse/detail triangle vertices. The original **>130 m** reproduction remains strict: **136.296 m coarse error →4.459 m detailed error**, with an additional tenfold-improvement assertion. A separate current-field test at the same site measures **55.578 m →1.946 m**, retains the **<8 m** limit and requires at least fourfold improvement. Physical-height invariance, six draws, <=400k triangles, stitching and mode/disposal tests remain. All four tests in that file pass; the focused terrain/detail total is therefore **31 passing tests across nine files**.

Before source integration, `capture-field.ts round26` saved the original two physical grids and reconstructed the source camera pose for the actual launch, crest and descent receipts. Position disagreement was 0–2.5e-14 m. After integration, camera quaternions, FOV, positions and the launch grade profile remained identical. The baseline/candidate grid files and descriptors are under `assets/source/inkstorm/launch-escarpment-v27/`; they allow the comparison to run without temporarily swapping source.

`compare-fields.ts` finds 11,947 changed launch texels, all inside the two declared front windows. There are **zero changed near-west texels and zero changed padded bench-core texels**. Independent physical before/after samples have exactly zero difference across 15,851 near-west points and 11,014 points covering the full three yard footprints. The entire finish grid is byte-identical (`bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`). Maximum off-road change is -249.573 m / +62.995 m; the positive changes occur where the existing cap wall becomes steeper at its unchanged midpoint, within its prior footprint. These are substantial intentional off-road geometry changes, not just texture edits.

The view study reconstructs the actual production `TerrainSystem` ring indices, including the current center samples, and displaces their vertices with the matching physical field. Each saved camera has the same **390,656 terrain triangles before and after**. Exact ray/triangle first hits are accelerated with XZ grid traversal. Five front-face ROIs use 117 rays each:

| Visible region | Rays changed by >5 m | Rays receding >25 m | Largest recession | Largest sampled clipmap/field height discrepancy |
|---|---:|---:|---:|---:|
| Launch west front | 86 | 39 | 291.14 m | 13.80 m |
| Launch east front | 68 | 36 | 277.36 m | 14.88 m |
| Crest west front | 95 | 56 | 295.66 m | 17.85 m |
| Crest east front | 56 | 25 | 305.67 m | 12.15 m |
| Descent west front | 73 | 39 | 302.82 m | 16.09 m |

These measurements establish that the edited geometry affects the actual front-face viewing regions, including the west mass that becomes central on descent. They do not establish visual quality. The comparison records every first hit, its terrain level, world/launch-local coordinate, physical height and viewing distance. Some rays advance onto a newly projecting ledge; the full report retains those results rather than counting only recessions. The reported discrepancies are sampled values, not a bound over the entire terrain.

This is a **terrain-only CPU study**, not a raster capture or full scene ID pass. Scanned rocks, buildings, gantries, vehicles and HUD may occlude some sampled terrain pixels. The original actual captures and root's concept-only launch paintover guide the shape; the paintover is not acceptance evidence. Root is taking the coordinated combined in-world capture before any further sculpting. Art acceptance, absence of visually regular stairs, in-world scan grounding, and the next measured full-race gate remain open.

Actual candidate1 review: directly viewed `output/gauntlet/round27-candidate1/{05-launch,launch-crest,launch-descent}.png`. The new recesses open on the visible fronts and the ledges are unequal, so the depth change is worth retaining as a base. The result still has long smooth curved wall columns and rounded lips, with some narrow pointed residual fins; it does not match the paintover's broad fractured planes. It does not read as a repeated contour staircase. Bright sky contours in this combined capture are a separately identified contact-shader defect being corrected by root, not evidence of terrain displacement. Candidate1 source, grids and studies are preserved together in the `candidate1/` subdirectory. Further shape work awaits blind image review.

Reproduce from the repo:

```sh
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/capture-field.ts candidate
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/compare-fields.ts
npx --no-install tsx assets/source/inkstorm/launch-escarpment-v27/project-terrain.ts candidate
python3 assets/source/inkstorm/launch-escarpment-v27/compare-rois.py
npx vitest run tests/terrain/authoredTerrainDetail.test.ts tests/terrain/launchEscarpment.test.ts tests/terrain/connectedLaunchRidge.test.ts tests/terrain/erodedLaunchRidge.test.ts tests/terrain/signedCourseTerrain.test.ts tests/terrain/launchBasinComposition.test.ts tests/terrain/launchElevationProfile.test.ts tests/render/inkstormLaunchDepth.test.ts tests/race/inkstormLaunchOwnership.test.ts
```

Do not regenerate `round26` files from the candidate source. They are the preserved pre-edit field. This subtask did not run a browser, Blender, production build, or GPU render.
