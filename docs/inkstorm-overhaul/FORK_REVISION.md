# Fork revision: bounded live framing and physical divider

Implemented after round 17's unreadable-fork finding. This is a source/numeric release for the next actual capture, **not visual acceptance**. No browser or build was run for this subtask.

## What changed

- `CourseJunctionFraming.ts` caches the actual edges of both routes at four upcoming distances. Its live angular envelope replaces the deep island-midpoint camera target. The existing approach/choice fade remains; the maximum chase orbit drops from 23.4° to 12.7°. It writes to the existing reusable vector without per-frame allocations, and cannot steer a vehicle or change a route.
- `GameApp.syncCameraSubject()` supplies that same helper to normal live play and review poses. There is no screenshot-only camera override.
- `getInkstormForkDividers()` fits three **full rotated rectangles** inside all canonical and branch corridors. The existing canyon-buttress GLB is reused, with elongated footprints, overlapping envelope extents and ascending crowns. The former circular envelopes produced narrow, tall columns.
- Divider collision now covers the same rotated boxes, including corners that the former ellipses omitted. Spatial buckets include the boxes' full diagonals. Crowns remain conservatively bounded above the geology grounding adapter's nominal tops.
- Actual branch points, bridge elevation, lane widths, terrain fields, entry/exit joins and checkpoints are unchanged. Course identity should advance to **course 7** for the revised scenery collision layout; the parent owns that identity change.

The three nominal boxes are approximately **26.3×50.4×90 m**, **65.3×96×130 m**, and **38.7×129.6×90 m** (X×Y×Z before yaw). Their recorded minimum complete-box clearance from an 8192-sample canonical loop and densely interpolated branches is **12.010 / 12.024 / 12.023 m** beyond the complete lane widths. Adjacent boxes overlap on every separating axis. This establishes connected placement envelopes; the actual scanned rock surfaces remain irregular within them.

The world adapter and public assets were not edited. The same three family instances remain; no new render pass, texture or geometry family was added. Frame-rate acceptance remains separate.

## Validation and evidence

- 34 focused tests in six files passed: actual-course camera framing/fade, divider whole-footprint/corner collision, layout/geology contracts, and existing bridge physical/checkpoint invariants.
- TypeScript and `git diff --check` passed.
- Camera tests cover 108 combinations of approach, lateral position and speed. Both lane-edge envelopes at +90/+150/+220 m remain inside the live lens; these projection checks explicitly do not imply unobstructed visibility.
- Eight full input-only laps passed: all four stock classes through the canonical route, then all four through the bridge. Every run finished naturally, crossed checkpoints **1–9 then 0**, and had **zero collisions and zero resets**. The bridge runs spent 3.11–3.67 seconds over the raised section, with 1.66–1.96 grounded seconds and positive minimum deck clearance. The canonical runs spent zero seconds there, confirming distinct route choices.

| Class | Canonical lap | Bridge lap |
| --- | ---: | ---: |
| Podracer | 54.74 s | 55.89 s |
| Landspeeder | 62.67 s | 63.37 s |
| Speeder bike | 51.44 s | 52.57 s |
| Skim speeder | 57.87 s | 58.86 s |

These times describe the diagnostic driver's decisions, not optimal route balance or human usability.

Receipts:

- `output/terrain/fork-revision/framing.json`: exact source/GLB hashes, nominal placements, dense clearances, live camera poses, route projections, and CPU raycasts against the current grounded divider meshes.
- `output/terrain/fork-revision/acceptance.json`: eight ordered-checkpoint/route-choice assertions.
- `output/drive-balance/fork-main-revision.json` and `fork-bridge-revision.json`: raw input-only full-lap traces and source hashes.

Reproduce without browser/build:

```sh
npx --yes tsx scripts/inkstorm-fork-framing.ts
npx --yes tsx scripts/drive-balance.ts --only=inkstorm-trial --label=fork-main-revision --wall=45
npx --yes tsx scripts/drive-balance.ts --only=inkstorm-trial --bridge --label=fork-bridge-revision --wall=45
```

## Important remaining composition limit

At the sampled entry pose, the new camera's actual yaw bias is **10.14°**. All six near route-center targets are in the lens, and the current divider GLB occludes none. However, the real terrain/deck height envelope still hides the lower canonical route at +150/+220 m by approximately **3.10/5.45 m**. Its +90 m target and the three bridge targets clear that envelope. Thus this revision improves the available framing and central mass, but does **not** establish the concept's uninterrupted lower-road continuation.

The next actual capture should inspect the approach, entry, and each route after commitment. If the near choice still fails, resolving the remaining crest needs a separately reviewed shared physical terrain/profile change or a modest live camera change tested for vehicle framing. Moving only a rendered road or a review camera would not resolve it. The diagnostic ray tests also omit other world objects and racers, so they are not complete in-world occlusion evidence.
