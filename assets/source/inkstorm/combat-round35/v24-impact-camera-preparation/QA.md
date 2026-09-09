# Private V24 camera QA

The candidate enlarges the principal engines, but the measured desktop views remain below the desired 65–75% viewport width. This is a partial composition improvement, not visual acceptance.

| Actual geometry / fixture frame | V23-behavior width | Candidate width | Baseline → candidate distance to impact center | Baseline → candidate eye above terrain |
| --- | ---: | ---: | ---: | ---: |
| Hero / 932 | 38.48% | 62.86% | 37.36 → 26.42 m | 11.69 → 6.32 m |
| Hero / 1067 | 39.98% | 61.33% | 36.29 → 27.68 m | 11.39 → 6.36 m |
| Rival / 932 | 37.35% | 62.93% | 38.43 → 26.37 m | 12.11 → 6.31 m |
| Rival / 1067 | 40.12% | 61.39% | 36.13 → 27.65 m | 11.33 → 6.32 m |

These are complete principal-engine source POSITION extents at desktop aspect 1440/900, measured in the existing source-safety pass. Both cameras consume the same pose and share the birth/side/chase history. The baseline camera omits impact framing and retains the prior full-assembly behavior. Rival geometry is substituted into the same deterministic input/terrain trajectory; this is not independent rival driving or native video evidence.

The final balanced-aim trial is limited by the **horizontal source-box constraint**. At frame 1067, hero requires 27.349 m axial distance for horizontal fit, versus 21.081 m for vertical fit and 14.422 m for full-assembly near-plane clearance. Rival requires 27.314 / 20.963 / 14.420 m respectively. Frame 932 is also horizontally limited: hero 26.044 m / rival 25.996 m. All four measured camera axial distances equal the geometric fit to numerical precision: no extra spring distance remains. Terrain is not limiting. Complete source boxes use a conservative 60-degree fit lens; actual principal-engine vertices occupy less screen width than that envelope. The 65% target remains unmet, and no safety boundary or target was changed to force a pass.

The earlier fixed-aim trial was constrained by the lower caption boundary and reached only 45.55–53.99%. Its exact source, metrics and logs are preserved under `first-trial-fixed-aim/`. The final source changes the aim within the same safe rectangle; it does not relax the rectangle or full-assembly near-plane exclusion.

Four new actual-geometry tests passed. They cover hero and rival, desktop and portrait, metadata-absent frame 910 through first active update and 157 active ticks, side-to-chase spring motion, three sparse source checkpoints, exact source-box transforms, rupture/contact witnesses, source ownership, reset, protected recovery and ordinary-camera return. Impact points retain NDC x ±0.74 and y [-0.58, 0.70]; complete visible source geometry stays beyond the near plane and before the far plane; camera clearance is at least 1.2 m above runtime terrain. Full bounds remain 40 corners for hero and 32 for rival, with exact active/intact POSITION counts of 90,581/73,048 and 45,605/42,278 respectively.

The unchanged `CinematicCamera`, `GalacticCamera` and `WreckBoundsFraming` tests also passed under the candidate remap: **25 tests / 3 files**, 8.19 seconds. Their full-assembly containment assertions were not edited. Final runtime validation is **29 tests / 4 files PASS**. The complete private candidate source tree and new actual-camera tests also pass native TypeScript 7.0.2 with the repository’s strict settings (`typecheck-final.log`). The initial fixture mismatches and compiler output are preserved separately; those fixes changed fixture/type expectations, not camera containment predicates.

Measurements: `same-snapshot-metrics.json`. Focused log: `focused-final.log`. Compatibility log: `compatibility-tests.log`. The optional metrics output writes only when `V24_CAMERA_METRICS_PATH` is explicitly supplied; ordinary admitted test runs create no files. Candidate tests and their fixture use admission-ready `tests/` → `src/` imports, with no private baseline dependency.

No browser, GPU, build, renderer capture or live source/test change was performed. Source projections establish geometric behavior, not native perceptual quality or FPS.
