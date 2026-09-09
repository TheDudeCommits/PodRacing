# Round 29 grid construction staging

Status updated after root GO: Phase A's grounding/support patches and slope test are applied and passed 18 focused tests plus typecheck. The A/B critic retained grounding but still failed target quality, with interior dune burial outstanding. Phase B source geometry was authored/exported through Blender MCP and merged into validated candidate copies under `candidates/`; see `candidate-receipt.json` and `blender-export-receipt.txt`. No Phase B public/runtime assets were published. No renders were run. Source completion is not visual or performance acceptance; root controls terrain work, integration, builds and in-game A/B.

## Phase A — grounding-only A/B first

Apply `grounding-only.patch` to `src/render/inkstorm/InkstormWorld.ts` after the freeze releases. It changes the pit-complex visual base offset from -1.5 to +1.45. The authored pad starts at local Y=0 and is 1 m thick. The foundation top is `heightAt(placement.x, placement.z)+1.5`, so the pad now overlaps that flat top by 5 cm. Current placement scales are sy=1. The slab, existing engines, crews and hoists all move together by 2.95 m; there is no lane, physics, X/Z, yaw, scale or asset change.

The separate `foundation-alignment.patch` belongs in this first grounding acceptance as well: the slab is centered at local GLB(4,-2.25), with bounds X[-71,79], Z[-32.5,28], while the old foundation is centered(0,0), X[-75,75], Z[-30.5,30.5]. Lifting alone would expose an unsupported4m/2m edge overhang. The second patch makes only this family's support match the existing slab exactly (150x60.5, center4/-2.25). It stays entirely inside the existing authored building footprint and retains the same top plane. No additional instances, draw calls or colliders result. Keep the two patches separate for diagnosing the lift-only A/B, but apply both before accepting grounded feet.

Evidence from actual frozen GLB headers is in `frozen-asset-audit.json`; SHA256 agrees with the existing industrial/pit receipts. Source details:

| Family | Authored lowest contact / GLB Y bounds | Current base and visible effect | Decision |
|---|---|---|---|
| pit-complex | Slab 0..1; GLB 0..47. Cradle 1..2, engine center3.3 radius1.3, crew feet1 | -1.5: slab/cradle fully hidden by foundation top+1.5; lower engine half and crew buried | Phase A +1.45 seats slab and exposes existing detail |
| pit-district | Apron0..0.4; GLB0..34.0522 | Existing+1.55 already aligns floor; source crews start0.05 | Preserve existing transform in Phase A |
| pipe-bank | Slab0..1.2; GLB0..51; crew feet1.2 | -1.5: slab hidden and most human-scale service detail below foundation | Similar defect, recorded only; outside implementation scope |
| finish-tower | Plinth0..5; GLB0..113; structural posts start3 | -1.5: plinth top remains2m above foundation; posts start at foundation top | Deliberate-looking embedded plinth; do not generalize pit correction |
| foundry-gantry | Explicit buried foot boxes -25..2; GLB-25..54.3042 | -1.5 intentionally buries support stock. Foot support collars/beam leg bases remain tied together | Retain offset; raising it would alter the established crossing |

All foundation tops use the placement center height, including sloping ground. Their bottoms are sampled at a rotated 3x3 footprint grid and extended below the lowest ground. With both Phase A patches, the full rigid pit slab overlaps a support with the same exact horizontal corners and constant top plane, including on a slope. Terrain already rising above that plane can still bury a portion of the apron; record that separately rather than inventing terrain changes here. `pitGrounding.test.ts.staged` checks the actual generated support against the four offset slab corners at three yaw angles and nonuniform scale over an analytic slope; copy it into tests/render only after GO.

Collision tops are `heightAt(center)+authoredHeight*sy+2`, independent of rendering. New pit maxY is ground+48.45, below the unchanged cutoff ground+49 by0.55m. Old pit maxY was ground+45.5. No collider code change is needed for the current scale. Pipe maxY would remain below its cutoff if later lifted, but it is not changed. Finish and gantry retain existing proxies and transforms.

`InkstormWorld.createShadowCasters()` reuses each complete instance matrix, so sun shadows follow the raised slab and equipment automatically. `shadowRevision` already changes on course rebuild. Legacy projected shadows use fixed family heights and remain approximate; no change to them is needed for this small visual lift.

Phase A verification after GO: typecheck; existing pit-layout/collision/route tests; inspect computed foundation/asset corner heights on fixed and expedition seeds (including slopes); capture exactly the original grid/side mouth viewpoints before and after under identical settings; confirm the visible floor seam, unburied gear and crew, sun shadow contact, no lane encroachment, and no new console failures. Close browser immediately after capture. Keep the A/B result separate from Phase B asset results.

## Phase B — original repair-yard geometry, only if Phase A still needs it

Use `build_grid_detail.py` through Blender MCP after root GO. It authors only new objects in an isolated `Inkstorm Grid Construction Round29` scene, exports selection-only overlay GLBs, and restores the exact prior scene, view layer, active object and selection in `finally`. It does not modify existing Blender scene objects or save a full .blend file. No downloaded geometry, textures, logos or source content. The original generated grid image is an interaction/art-direction reference.

The overlays will be merged into copies of the existing three owned GLBs using glTF Transform, retaining a single mesh, material and primitive per family. Existing family placement/instancing stays intact: **0 additional runtime draws, 0 new runtime materials, 0 textures, 0 extra collision bodies**. Merge verifies old bounds exactly and all attributes/normals/colors. Nothing is published before validation. Keep byte-identical copies of the frozen input assets in this staging directory before any later replacement.

Semantic construction, concentrated at visible workshop mouths:

- pit-complex: three unequal work clusters. One large open-turbine engine on a wheeled trestle with rings, cradle saddles and a short suspended chain; a second hoist and parts rack; a third service cart with twin gas cylinders, bent handle and connected hose. Strapped cargo cases sit on real pallet runners. Tool cabinet drawers and handles face the road. The clusters stay entirely inside the current slab and behind its road edge.
- pit-district: one mouth engine cradle, two small tool/cargo groups and short service rails close the largest holes without repeating an identical kit in all bays.
- gantry: rear-facing bolted gussets and visible lower beam wear, paired supply rails joined to upright collars, unequal hanging work lamps, and lenses on the approach side. The current source only paints circular lenses on Blender -Y / GLB +Z; the approach sees their dark backs. Both faces receive shallow lenses while the existing five-light rhythm remains legible. Do not add a sign wall across the sky.
- cloth: closed top/bottom/perimeter strips follow the already-authored tension curves. Bound seams and an irregular front hem give the sag actual thickness. The cloth remains cobalt/coral with limited cream seam marks; there is no new shader or cloth simulation. Existing awning triangles remain enclosed by the thickness overlay.

Hard initial triangle caps for merged replacements: pit-complex13,500 (old7,032), pit-district17,500 (old13,254), foundry-gantry6,500 (old4,494). This is a maximum ~38,200 extra triangles across all3 pit complexes,4 districts and2 gantries if every placement were drawn at once. The light local arithmetic audit of the staged source produced overlays4,908/4,168/1,806 triangles, projected merged totals11,940/17,422/6,300 and an all-placements upper bound of35,008 extra triangles; see `staged-geometry-audit.json`. This is source arithmetic, not Blender-export or runtime performance evidence. Aim below25,000 extra visible triangles at grid; decline nonessential fine bolts before exceeding budget. Cap optimized added delivery at1.5MB total. All assembly is at load time through existing GLB instance batches.

Expected changed paths after Phase B GO: this staging folder's source/export/receipt files, `public/assets/inkstorm/pit-complex.glb`, `public/assets/inkstorm/pit-district.glb`, `public/assets/inkstorm/foundry-gantry.glb`; Phase A's `InkstormWorld.ts` and `InkstormFoundations.ts` changes persist independently, plus `tests/render/pitGrounding.test.ts`. No `inkstormLayout.ts`, driving or camera changes. Root owns acceptance docs and final handover. The focused test checks the actual geometry contract, not implementation text.

User prompt retained for provenance: “Use Blender MCP and Codex imagegen skill to generate concept images of the target art style for each section. Keep Iterateing until in-world screenshots look as close as possible to those, at 40-60fps.”
