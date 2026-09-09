# Round28 launch composition — local integration

Integrated locally and ready for root's combined capture/performance checkpoint. After completing the isolated proposal, this task updated `LaunchBasinPlan.ts`, `InkstormVista.ts`, the ID-scoped grounding condition in `InkstormWorld.ts`, and focused tests/fixtures. No public asset or distribution files changed. The candidate is not visually accepted and carries no frame-rate claim.

The original `concepts/05-launch.png` has an uneven sequence of low terraces, projecting ledges and narrow taller masses across several depths. The current round27 launch, crest and descent frames still concentrate their height into two large high walls. The small normal correction improves individual faces but does not solve that composition.

## Concrete candidate

`assets/source/inkstorm/launch-composition-round28/LaunchBasinPlan.ts` is a complete staged replacement for the current runtime file. It adds six bounded cuts to the two leading escarpments: a lower west talus terrace with a projecting middle ledge; a cross-range amphitheatre between the leading tooth and farther crest; terminating outer and inner west shelves; a low inner service bay; and an outer process-yard amphitheatre. The new floor planes have gentle unequal slopes, and their secondary ledges terminate within individual cuts. No fine noise layer, extra terrain mesh or camera change is proposed.

The older near-west range, rear range, central bowl, road profiles and founded industrial bench cores retain priority. The taller connected spine survives behind the new lower shoulders. One early draft lowered an existing opposed-relief probe too far; the inner shelf was shortened to retain that original guard. Its failed receipt is preserved in `rejected-v1/`. A narrower first composition passed the protection checks but barely changed the visible first-hit faces; its source and ROI comparison are preserved in `draft-v2/`. The final leading terrace addresses those front faces directly.

The proposal also contains three explicit middle-distance `fractured-spire` placements in `VistaLandforms.ts`. They use the already shipped high and LOD assets with different uniform sizes and rotations. Their original dimensions are retained apart from the existing bounded grounding treatment. They are placed in the spaces opened by the field edit, rather than appended as another distant wall. The existing five depth forms and nine ridge accents remain unchanged.

| Selected form | Forward / screen-right metres | Uniform scale | Remaining scenery guard after 9.6 m craft and sampling debit | Visible actual-source crown probes, main / crest / descent |
| --- | --- | ---: | ---: | --- |
| West descent finger | 650 / −240 | 0.58 | 46.89 m | 5/9 · 0/9 · 5/9 |
| West inset spire | 880 / −400 | 0.47 | 199.35 m | 6/9 · 6/9 · 6/9 |
| East inner spire | 600 / 210 | 0.75 | 317.25 m | 9/9 · 5/9 · 0/9 |

These visibility results use exact ray/triangle intersection with the production terrain topology at the saved cameras, testing points from the actual source GLB vertices. They exclude industrial structures, other scans, the racer and HUD. They establish that the terrain does not hide every selected form; they do not establish whole-scene visibility or art quality. Rectangles crossing the camera near plane are explicitly `null`, and points behind the camera or outside the frame are rejected. Three other geometrically clear trial placements were omitted from the final selection because they did not contribute useful launch visibility. Four unsafe/overstretched sites were rejected independently.

## Protection and cost

Nine focused CPU guard groups pass without reducing the existing numeric thresholds:

- All **532,296** historical lane, ten-metre shoulder and 0.85/1.15 m normal samples keep SHA `8b719ceac7e26597a4c33989e6a1a036d2dcfb703812313436838b150d221b57`.
- The **1,909** central bowl samples and the entire finish field retain their historical hashes. Course signature and launch profile are unchanged; the field remains bounded to −170/+250 m.
- **5,978** near-west, central and rear authoring comparisons are identical; **12,889** bench/core checks pass with no footprint height delta.
- Connected-spine minimum height, near/middle/far separations, at least three substantial saddles at all four 48 m sampling phases, the prior deep-slot/unequal-ledge probes, five existing depth forms and the original 0.02 m-per-millimetre continuity limit remain satisfied.
- New placement checks use **16,384** main-route samples plus dense branch samples, including the full **0.489726 m** interval/width allowance, the complete enclosing source disk, founded yard margins and the 24-degree central panorama.
- Both actual shipped GLB variants were read through GLTFLoader. All sampled low source vertices remain buried. The three selected grounding scale ratios are approximately **1.20, 1.18 and 1.33**, under the existing 1.75 ceiling.

The incremental instance cost is exactly **10,248 triangles with all three high assets** or **5,409 with all three LOD assets**. They reuse the existing `fractured-spire` batches, source geometry, material, textures and LOD logic. There is no new draw family. Terrain topology remains unchanged. GPU cost must still be measured in the combined checkpoint.

Across the five saved terrain regions, the candidate changes **164** existing paired first-hit rays by more than 0.5 m and opens **21** previously terrain-covered rays. West-crest recession reaches **262.97 m**; main-west recession reaches **54.28 m**. East-face changes are smaller because the protected founded yards dominate that wall. Maximum physical-to-triangle interpolation error in this exact CPU ray sample set changes from **30.33 m to 23.56 m** overall; main-west changes from **10.19 m to 14.22 m**. Those local errors remain an actual-capture concern, not a solved geometry-quality claim.

## Completed integration and validation

1. Verified the old runtime landscape SHA `a0ab709353a86372c02e238feaa76083f171f9be85c0a3a9c58a9b21d60ac357`, then copied the exact staged replacement. Integrated landscape SHA: **`38235aaac16084e1a7c2e4c5e33a4673d0d68285591e65f4a3a2c81066f9765c`**.
2. Added exactly the three selected constants and guarded planner loop to `InkstormVista`, using a separate optional `compositionLayer` tag. The five earlier `depthLayer` forms and nine ridge accents retain their independent limits. The exclusive-classification test now accounts for all three groups, and a separate actual-GLB triangle/footprint budget covers the new group.
3. `InkstormWorld` now grounds **only** `fractured-spire` placements whose IDs start `launch-composition-` through the existing buttress helper. Both family and prefix are required. A CPU test exercises the actual World assembly/instance upload with a loader stub: the new matrices use the buried bases, while ordinary existing spires keep their former base and scale. Actual high/LOD vertices are separately checked for route/panorama/yard clearance and buried toes.
4. Retained the round27 normal shader unchanged. `authoredTerrainLightingRound27.ts` freezes **54 exact base-height and signed-field probes across six former failures**, from the preserved round27 field. The original normal-error thresholds remain unchanged. Current-field continuity and new physical toe/ledge/tooth behavior have separate coverage.
5. **60/60 focused tests across 14 files passed**, followed by typecheck and `git diff --check`. This includes the unchanged historical route/bowl/finish protection checks, founded yards, connected ridges, saddle phases, terrain interpolation, shadow bounds, old and new scenery groups, and grounding.

Actual main/crest/descent captures, fresh blind comparison and the combined full-race performance run remain root-owned pending work. This task is frozen after reporting these hashes; it performs no CPU studies or source/test writes during that checkpoint.

The staging `CourseGulfField.ts` is only an isolated import adapter for the CPU bake. **Do not copy it into runtime.** The original implementation is preserved as `CourseGulfField.round27.ts`; its only staging differences are module paths.

Exact staging sources, hashes, selected placements and visibility probes are preserved in `assets/source/inkstorm/launch-composition-round28/integration-receipt.json`; actual runtime hashes and checks are in `runtime-integration.json`. Reproduction scripts are `capture-field.ts`, `guards.ts`, `placement-study.ts`, and `project-terrain.ts`. The original pre-integration runtime/fixture sources remain under `runtime-before/`. No Blender, browser, GPU render, build or full test suite was run by this task.
