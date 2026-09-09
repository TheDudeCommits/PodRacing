# Signed launch mountains — round 20 candidate

Status: source integrated after the round 19 performance freeze; 44 focused tests, typecheck and whitespace validation pass. Actual captures and the combined performance/visual gauntlet remain pending. The design responds to the actual round 19 launch frame: the below-zero shelves left a low, bare horizon and a distant, small refinery. More scan placements did not fix that composition.

## Physical composition

Three connected, unequal mountain spines replace the negative-only restoration ceiling. The near west rim peaks near 185m, the far west range near 246m, and the east industrial ridge near 238m absolute elevation. The interpolated field separately limits displacement to -170m / +250m. Three broad cross-section steps form talus, a lower ledge and an upper mesa, with unequal widths and eroded plan edges. Middle/far step transitions span roughly 48–90m so existing 24–48m clipmap cells can represent them. These are actual terrain elevations used by physics, beauty, depth, normal passes and conforming roads.

The shared launch-local domain is forward -230..1740m, right -840..760m. Influence fades through the final 72m of that domain and the existing 72m texture edge taper remains. The central floor remains open through forward 420..1380m and right +/-120m, with a further 64m lateral transition. Nearby mountains therefore frame the real trough.

The industrial centre is now forward 825m, right 360m, radius 300m. Its three physical benches are lower (650,385) at 75m, middle (815,325) at 110m, and upper (1000,405) at 145m. The 300m enclosing disk includes all three full padded terrace footprints. The shared plan is consumed by the integrated Vista centre and terrace placement.

## Preserved contracts

The existing launch and finish grids remain 417x417 and 257x257, 6m per cell, 959,752 data bytes total. There are still two R32F textures and eight terrain fetches. No clipmap geometry resolution, racing course points, branch topology, launch/salt/fork profile definitions, public asset, obstacle, or collision footprint is changed here.

The authoring mask retains the entire main and branch lane plus ten metres, one bilinear cell diagonal and the existing four-metre probe allowance. Source authoring does not touch any grid node inside that protected footprint. The historical 532,296-sample launch-grid SHA fixture remains unchanged as a strict test: it covers dense non-bake main stations, interpolated branches, shoulders, .85m physics and 1.15m MRT probes. The preserved SHA passes after integration, and an independent before/after receipt measures exactly zero difference at every one of these 532,296 samples.

CPU and shared GLSL use the same signed composition: minimum negative offset plus maximum positive offset. Two negative fields retain the old minimum. A zero second field no longer erases a positive mountain. Opposed fields combine continuously and retain the same -170m/+250m overall bound. The fixture tests exercise signed overlap and bilinear sampling without claiming a GPU execution comparison.

Terrain boxes and spheres expand both downwards and upwards. Switching to another course restores both original limits, including skirts. A focused test aims a narrow frustum above the former +72m bound, where an elevated mountain must remain renderable.

## Combined validation after release

1. Apply with the root Vista centre/bench update and the separate sampled physical-terrain shadow caster. Run typecheck and the focused terrain, salt, fork, launch ownership and Vista tests. Run the unchanged dense launch preservation SHA test and collect maximum physical height/probe differences against the frozen field. Finish-grid values must remain identical.
2. Verify actual peaks and physical bench seating after bilinear interpolation. Tune mountain authoring if a protected road shoulder or grid edge suppresses an intended peak; do not weaken lane evidence to force a pass. Full terrace and ridge-face footprint clearance remains required.
3. Capture launch approach, launch crest, launch descent and the selected launch camera. Review continuous mass, silhouette hierarchy, foreground/midground/background separation and a readable refinery. The source stations and scan triangle count are not proof of visual quality.
4. Inspect adjacent salt, canyon and route views. Check physical contact and normal probes on the unchanged racing surface and inspect positive terrain in depth, normals and static shadows.
5. Root runs the combined full build, real full-race FPS gauntlet and fresh blind visual critique. No performance or preview parity claim is made before that run.

## Risks and companion work

Existing scans may need lower crown placement against the newly elevated physical sides. Their draft test now compares relief against the full actual rotated footprint, instead of enforcing the old below-zero skyline. Root owns final Vista integration, rock response and camera captures; this patch intentionally avoids inkstormLayout and public assets. Shader height/slope shading and root/UI sampled static terrain shadows must be reviewed together: tall plain tan terrain alone would retain the previous material failure. Coarse clipmap triangles may soften some ledges at long range, and the physical route masks may create a visible notch beside a mountain; both need actual screenshots. Raised off-road ground becomes landable, while existing racing lanes and their small physics/MRT probes stay exact. Wide beauty-lighting probes intentionally see the neighboring new terrain.

## Post-freeze seam correction and measured evidence

The first draft placed the middle and upper flat-core rectangles over each other and selected a bench only when its weight dominated the ridge. Independent review correctly identified a potential 35m height seam. The integrated centres now leave 15m and 22m gaps between the padded cores in the forward axis. Plateau half-sizes and heights remain unchanged. Overlapping aprons use continuous, mutually suppressed weights: a neighboring bench contributes zero inside another full core, while both blend through the gap. Ridge segment heights also use continuous weights instead of dominant-segment selection. A 1mm perturbation across a 34k-point composition sweep produces a maximum 0.010854m effective height change; every padded bench core passes the full flatness test.

Expanded regression tests found a second issue at the existing launch basin floor, 120m from the canonical route. The mountain influence now preserves that real 240m-wide curved floor with the full bilinear/probe margin, smooth lateral apron and longitudinal entry/exit. The original launch profile test passes without changing its threshold.

Raw evidence is in `output/terrain/round20-terrain-final.json` (44/44 tests) and `output/terrain/round20-physical-receipt.json` (CPU measurements and actual source hashes). Initial failure reports are retained. `npm run typecheck` and `git diff --check` pass. The receipt records:

- 532,296 preserved samples; maximum before/after physical height difference **0m**; launch SHA **8b719ceac7e26597a4c33989e6a1a036d2dcfb703812313436838b150d221b57**.
- Actual interpolated sample summits: near west **169.56m**, far west **237.66m**, east **207.37m**. Far-west rise reaches the explicit +250m displacement ceiling; the authored absolute target is therefore locally lower after clamping.
- Lower yard actual range **74.39–75.78m**; middle **109.35–110.93m**; upper **144.49–145.67m**. Sub-metre residuals come from adding the continuous base terrain to the interpolated displacement. All three founded platforms pass independent dense footprint seating checks.
- The finish grid retains its exact pre-candidate byte hash; two texture sizes and their 959,752-byte data budget are unchanged.

Root also capped each scanned cliff crown against its own physical footprint, resolving a redundant industrial-side crown that stood 67.52m above a cut yard. The independent full-footprint relief test now passes. This is physical/correctness evidence only; the next in-world captures decide whether the composition succeeds visually.
