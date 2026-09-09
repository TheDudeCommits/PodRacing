# Private V24 camera QA

The candidate enlarges the principal engines, but the measured desktop views remain below the desired 65–80% viewport width. This is a partial composition improvement, not visual acceptance.

| Actual geometry / fixture frame | V23-behavior width | Candidate width | Baseline → candidate distance to impact center | Baseline → candidate eye above terrain |
| --- | ---: | ---: | ---: | ---: |
| Hero / 932 | 38.48% | 45.57% | 37.36 → 32.95 m | 11.69 → 10.78 m |
| Hero / 1067 | 39.98% | 53.99% | 36.29 → 30.08 m | 11.39 → 9.98 m |
| Rival / 932 | 37.35% | 45.55% | 38.43 → 32.93 m | 12.11 → 10.77 m |
| Rival / 1067 | 40.12% | 53.98% | 36.13 → 30.07 m | 11.33 → 9.98 m |

These are complete principal-engine source POSITION extents at desktop aspect 1440/900, measured in the existing source-safety pass. Both cameras consume the same pose and share the birth/side/chase history. The baseline camera omits impact framing and retains the prior full-assembly behavior. Rival geometry is substituted into the same deterministic input/terrain trajectory; this is not independent rival driving or native video evidence.

At frame 1067, the **lower vertical caption constraint** determines the fit: hero requires 30.067 m axial distance, versus 27.941 m for horizontal fit, 12.096 m for the upper boundary, and 14.422 m for full-assembly near-plane clearance. Rival values are 30.056 / 27.905 / 11.871 / 14.420 m. Neither settled view has measurable extra spring distance. At frame 932, the lower boundary still dominates the geometric fit, with a further 1.968 m hero / 1.959 m rival retained by the spring history. Unused top matte space alone therefore does not address the settled limiting constraint. No boundary or target was changed to force a pass.

Four new actual-geometry tests passed. They cover hero and rival, desktop and portrait, metadata-absent frame 910 through first active update and 157 active ticks, side-to-chase spring motion, three sparse source checkpoints, exact source-box transforms, rupture/contact witnesses, source ownership, reset, protected recovery and ordinary-camera return. Impact points retain NDC x ±0.74 and y [-0.58, 0.70]; complete visible source geometry stays beyond the near plane and before the far plane; camera clearance is at least 1.2 m above runtime terrain. Full bounds remain 40 corners for hero and 32 for rival, with exact active/intact POSITION counts of 90,581/73,048 and 45,605/42,278 respectively.

The unchanged `CinematicCamera`, `GalacticCamera` and `WreckBoundsFraming` tests also passed under the candidate remap: **25 tests / 3 files**, 8.12 seconds. Their full-assembly containment assertions were not edited. Total runtime validation is **29 tests / 4 files**. The initial fixture mismatches and compiler output are preserved separately; those fixes changed fixture/type expectations, not camera containment predicates.

Measurements: `same-snapshot-metrics.json`. Focused log: `focused-final.log`. Compatibility log: `compatibility-tests.log`. The optional metrics output writes only when `V24_CAMERA_METRICS_PATH` is explicitly supplied; ordinary admitted test runs create no files. Candidate tests and their fixture use admission-ready `tests/` → `src/` imports, with no private baseline dependency.

No browser, GPU, build, renderer capture or live source/test change was performed. Source projections establish geometric behavior, not native perceptual quality or FPS.
