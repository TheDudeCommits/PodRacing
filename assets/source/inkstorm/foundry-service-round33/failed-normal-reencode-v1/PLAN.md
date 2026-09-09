# Foundry service gantry — round33 preparation

Status: **prepared source scripts only**. Neither Blender payload has run. There is no authored scene, candidate export, rendered evidence, runtime installation or visual acceptance from this preparation. The full-race timing window remains owned by root.

The construction follows supplementary [concept11](../../../../docs/inkstorm-overhaul/concepts/11-foundry-construction-round33.png) and the unchanged [original Foundry target06](../../../../docs/inkstorm-overhaul/concepts/06-foundry.png): a broad orange pressure main, dark structural truss, visibly separated flanges and seals, a working cable hoist, thin supported maintenance hardware, and sparse edge wear. The actual round32 Foundry image is scale/placement evidence, not a relaxed art target.

## Files and preserved lineage

- `author-service-gantry-mcp-safe.py` — new isolated scene authoring. `EXPORT_CANDIDATE=False`; authoring does not render, bake or save the shared blend.
- `export-render-service-gantry-mcp-safe.py` — separate post-authoring source export and three neutral technical views. Requires the authoring stage's successful preflight marker and rechecks the geometry/material contract before exporting.
- `validate-preparation.py` — local CPU-only AST, arithmetic, closure, clearance and preserved-input checks. This is not an MCP payload; its filesystem/hash imports stay outside Blender.
- `source-contract.json` — current GLB metadata, removal selectors, measured clearance, and hashes of the two source builders and both concepts.
- `preparation-receipt.json` — executed arithmetic/input checks, explicitly recording Blender/export/render as pending.
- `predecessors/foundry-gantry-round32.glb` — byte-exact snapshot of the current public asset, **438,724 bytes**, SHA256 `3d0cd999daf52b82ac0232c7316a5e4072c80bd83982f83cbaf4a1dcde11e862`.
- `v1/` — reserved future output directory. No candidate or PNG has been generated.

The predecessor is original Inkstorm authored geometry from `build_industrial_revision.py`, with the preserved round29 construction from `grid-construction-round29/build_grid_detail.py`. This derivative does not replace either builder or the public grid gantry. It adds original procedural geometry; it does not import third-party geometry or create textures.

## Exact source diagnosis and removal

The current GLB contains **6,300 triangles / 11,106 vertices / one mesh / one primitive / one material**, with `POSITION`, `NORMAL`, `COLOR_0` and no images/UVs. Its material is `Inkstorm_Industrial_Revision_Paint`, roughness approximately `.84`, metallic 0, double-sided. The source uses Blender X width, Y depth, Z up; front is −Y, while the existing road approach sees +Y.

The first builder's `build_gantry()` creates five signal heads at X `[-11,-5.5,0,5.5,11]`, including housing, front lens, flange, six flange bolts, and two hanger rods per head. The round29 `gantry_detail()` adds one reverse lens and one raised ring per head. These signal assemblies share the same material as structural machinery, so a material or color deletion would be unsafe.

The authoring script reconstructs connected components by positions rounded to five decimals **for classification only**. It never welds source vertices, normals or colors. For each center `c`, it removes whole components contained within Blender bounds:

```text
[c−1.401, −2.451, 39.599] … [c+1.401, 1.678, 44.501]
```

It fails closed unless every bank has exactly 13 components and 472 triangles, with sorted component counts `[12,12,20,20,20,20,20,20,44,52,60,60,112]`. Thus **2,360 triangles** are removed, including all ten otherwise orphaned hanger rods, and **3,940 triangles** remain. The two original utility pendants at X ±25 remain; they are separate working lights, not countdown lenses.

For this exact frozen GLB only, the equivalent zero-based half-open triangle ranges are `[2654,4194)` and `[5312,6132)`. The script intentionally uses whole components rather than relying on export indices. Independent source audit found the retained oriented-position FNV-1a32 checksum `b3cdf69d` and SHA256 `e808b073c39883a3a089cbbc85a19c34a7b5a2fa5291572404fa95d7c10291c9` after quantizing Blender coordinates to 1e−5, choosing each triangle's smallest cyclic rotation, sorting, and writing signed int32 little-endian coordinates. Normals/colors require the script's separate retained-loop checks.

## Authored first candidate

The existing frame is retained in full: open truss chords/diagonals, columns, repaired collars, exposed supply lines, machinery boxes, paint chips, rear catwalk, reverse-side joint plates, feet, and utility pendants. No post or support footprint moves.

The new construction is **2,560 triangles**, for a prospective total of **6,500**, one vertex-color material, no textures and no animations:

| Construction | New triangles | Purpose |
| --- | ---: | --- |
| Swept pressure main | 508 | 5-unit diameter orange main with continuous 16-sided skin and two six-segment elbows. |
| Paired repair flanges, gasket, through bolts | 376 | Separate metal lips around an open bore, dark seal, and six readable fasteners. |
| Two welded sleeves | 88 | Smaller pipe seams supporting the repair-joint hierarchy. |
| Two bolted blind service caps | 328 | Finished closed modular terminations above the original shoulders; no open dangling pipe mouths. |
| Saddles and anchors | 432 | Three load paths at original X −31, +1, +32 truss joints; bearing pedestals, closed straps, paired gusset webs and base bolts. |
| Maintenance deck, rail and brackets | 200 | A front strip above the original chord, toe-board, two rails, ten uprights and four closed cantilever brackets. |
| Offset hoist track and mechanism | 620 | An I-rail supported from existing cross-members, four flange-contact wheels, connected axles/cheek plates, drum, motor, cable wraps, paired cable legs, lower pulley and service hook. |
| Surface-projected edge chips | 8 | Sparse opaque paint losses near the repair; projected onto actual pipe facets with a 0.003 offset. |

The hoist is offset to X−18. Wheel centers are derived from the actual six-sided wheel silhouette so the bottoms meet the flange top at Z43.71. Axles connect the wheels to the side plates. All added mechanical groups are closed; only the eight explicitly authored paint flakes are open triangles. No alpha removal, dark occlusion plates or plain replacement frame is used.

The predecessor's paint is copied exactly for retained faces. Additions use the same original linear palette values: orange/coral `.80,.225,.10`, cobalt `.075,.18,.29`, steel `.19,.25,.29`, warm ivory `.86,.68,.40`, and dark structure. The existing one-draw material remains compatible with the runtime's shared machinery shading. No global shader or texture change is included.

## Bounds, clearance and known visual limits

The two original feet remain 12×14 in plan, centered at X ±46: X`[-52,-40]` and`[40,52]`, Y`[-7,7]`. The whole horizontal envelope remains X`[-52,52]`, Y`[-7,7]`; the original buried bottom remains Z−25. Every added vertex is inside that horizontal envelope.

Clipping all retained faces to the open central corridor `−39.999999<X<39.999999` gives minimum Z`39.66999816894531`, on the preserved +25 utility pendant. The new geometry's clipped minimum is `39.88758798064189`. Both exceed the former signal-head practical minimum 39.60. This is a local geometric clearance statement, not a proof of terrain-relative clearance on every seeded course.

The new upper bound is Z**61.45**, versus 54.30417 originally. Root's [actual-camera projection study](../../../../output/gauntlet/foundry-round33-view-study.json) has zero reconstructed camera-position error and places the proposed main center near y 28/900 px and its right section near y 11 px. The upper pipe radius may crop in that captured view. **Do not prematurely lower the structure or change the camera**; inspect actual approach/middle/exit views first. The same study excludes authored scenery from terrain rays, so it does not establish that terrain is the dominant road-corridor occluder.

Blind service caps are deliberate maintenance terminations, not claimed connections to the current world pressure banks. If connecting those mains later, use measured sockets and preserve this V1. One hoist is the first asymmetric construction candidate; concept11's second hoist and richer joint layering remain valid targets if actual views show the composition needs them.

The 6,500 cap is a first-candidate constraint, not a visual acceptance standard. Measured optional refinements, to decide after rendered review:

| Refinement | Increment | Prospective total |
| --- | ---: | ---: |
| Replace one welded sleeve with a second complete repair flange assembly | +332 | 6,832 |
| Increase main radial sides 16→24 at current bends | +256 | 6,756 |
| Increase both elbows 6→10 segments at current radial sides | +256 | 6,756 |
| Both main tessellation refinements together | +640 | 7,140 |
| Second complete hoist, extending the same track and adding two supports | +572 | 7,072 |

Those variants have not been authored or approved. A meaningful joint/silhouette should receive its measured cost if needed; actual sustained 40–60 FPS and visual review decide acceptance, not an arbitrary inherited cap.

## Post-release MCP sequence

1. Wait for root's explicit timing release and announce the source render before invoking it. Recheck the active shared Blender scene/view-layer/selection; previous verified context was the Cruise source scene. Both scripts capture live state and never assume it is safe to replace that scene.
2. Run the CPU preflight below. Reserve a fresh version/output path if `v1/foundry-service-gantry-v1-native.glb` or any V1 PNG already exists. MCP payloads deliberately contain no direct filesystem or hashing APIs, so the caller checks output collisions and source hashes outside Blender.
3. Send the **literal** `author-service-gantry-mcp-safe.py` to Blender MCP. It imports only the preserved predecessor into `PodRacing — Foundry service gantry round33 V1`, preserves all pre-existing scene/collection memberships, checks retained positions/winding/colors exactly relative to the imported predecessor and split normals within 3e−5, checks bounds/clearance/counts, and restores scene, view layer, active layer collection, active object and selection. Partial import failure data are tracked and cleaned only from the owned stage. It prints a compact receipt; it does not export by default.
4. Proceed only if that receipt and its context restoration pass. Then send the literal `export-render-service-gantry-mcp-safe.py`. It requires `sourcePreflightPassed`, exports the single authored object at its canonical name, restores the authored stage selection, and uses a copied mesh in a disposable review scene for neutral rendering. The source material is reused read-only, with white lights and Standard color management. There is no tint, fog, compositor, bloom, bake or shared blend save.
5. The second script writes the future V1 native GLB and three 1400×1000 CPU Cycles 16-sample views: `approach-three-quarter`, `rear-three-quarter`, and `side-depth`. Cameras fit the entire asset at a common orthographic scale with 14% margin. The original buried feet are intentionally exposed on a neutral floor for footprint inspection. The temporary review scene, mesh copy, floor, lights, camera and world are removed; every pre-existing membership and both source/shared selections are checked again. Save the returned receipt beside the outputs.
6. After export, independently inspect the actual GLB header and run Khronos validation. Require one referenced primitive/material, `POSITION/NORMAL/COLOR_0`, no textures/animations, total 6,500 triangles, finite normalized normals, matching bounds, retained geometry/paint evidence, absence of all five signals, and exact predecessor/public hashes. These export checks remain pending until the artifact exists.
7. Root reviews neutral source views against both concepts, then handles any source-only correction as V2. Root alone decides the later runtime installation and actual world A/B/critic/performance review. No technical or neutral-render pass is AAA acceptance.

CPU preparation command, safe during this preparation scope:

```sh
python3 assets/source/inkstorm/foundry-service-round33/validate-preparation.py --write-receipt
```

Planned output names:

```text
v1/foundry-service-gantry-v1-native.glb
v1/foundry-service-gantry-v1-approach-three-quarter.png
v1/foundry-service-gantry-v1-rear-three-quarter.png
v1/foundry-service-gantry-v1-side-depth.png
```

## Runtime handoff boundary

No runtime/public/dist/harness file is changed here. The industrial placement is currently `inkstorm-foundry-gantry-226` in the measured flagship layout, at progress `.54425`, scales `.78,1.05,1`; the start grid remains a separate placement at progress `.012`. A future service family must be selected only for the industrial placement. Do not replace the existing `foundry-gantry.glb` URL globally.

Root must preserve the actual placement transform and stable collision identity, extend the exact existing twin-support collider contract to the service appearance, and retain its X ±46 centers / 6×7 radii / 50×sy height. The family currently influences generated placement IDs, so a naive family rename can change IDs even when coordinates are unchanged. Use a deliberate appearance/family mapping that preserves the physical contract. Integrate through existing static instancing, shadow and disposal ownership, with no frame update or animation requirement. A separate render family can add a batch even though the source itself is one draw; measure the actual total instead of claiming zero draw-cost growth.
