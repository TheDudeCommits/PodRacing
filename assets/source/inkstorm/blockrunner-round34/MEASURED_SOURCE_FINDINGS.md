# Blockrunner measured source findings

2026-09-08. **Comprehensive external analysis complete; cleanup scripts prepared, not executed.** The successful live audit and four neutral PNGs were read; each image was inspected individually. All 59 source mesh occurrences were measured, with their bounds/counts compared with the live audit. Exact duplicate, authored-normal, diagnostic manifold/component and cross-occurrence checks are complete. No source/Blender/runtime/public geometry was changed. The earlier interim report is preserved as `MEASURED_SOURCE_FINDINGS_BEFORE_FULL_ANALYSIS.md`.

## Source and visual evidence

- Exact colour UID: `a6f14ae799ab40d7ac425f043f824ff8`; preserved source: `assets/source/inkstorm/vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb`, SHA-256 `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`. Each completed external analysis checked the source bytes unchanged.
- Root's `mcp-safe/audit-receipt.json` reports **268 scene objects, 59 mesh occurrences, 59 mesh datablocks and 48,384 actual occurrence triangles**. All 140 preexisting scenes/collections and context were restored. Source object FNV-1a-64 signature: `d85efeecc74d9485`; this is a structural signature, not a cryptographic proof.
- `source-driver-20260908-round34-source-v1.png` confirms the retained minifigure's helmet/head, torso, arms and hands. Both hands fall short of the two tall black control bars. Its leg/base surfaces show pronounced striped coplanar/shading artifacts.
- `source-front-20260908-round34-source-v1.png` shows two intact front fans, a physical connecting crossbeam and the open cockpit. `source-rear-20260908-round34-source-v1.png` exposes an actual small rear throat; its right counterpart is partly obscured in that view. `source-fullcraft-20260908-round34-source-v1.png` establishes the complete original silhouette. None is a runtime or styling acceptance image.
- The corrected camera script sets `sensor_fit = 'HORIZONTAL'` and `ortho_scale = max(width, height * aspect) * 1.22`, with landscape vertical coverage `ortho_scale / aspect`. The previous version is preserved as `mcp-safe/03-render-neutral-view-before-horizontal-fit.py`. Root subsequently rendered the complete driver successfully with the corrected fit.

## Driver geometry and anatomy candidates

The confirmed driver object is **`pasted__LegoTri36_lambert1_0`**, parent `pasted__LegoTri36`, with source material `lambert1.001`. It has **8,256 source triangles and 20,409 seam-split vertices**. World bounds are approximately `[-0.440407,-20.714108,1.735977]` to `[0.576303,-19.866472,3.174984]`, in original Blender source metres; no gameplay normalization is applied.

External-copy positional welding at 0.000001 / 0.00001 / 0.0001 m produces 41 / 32 / 29 connected components from the audit's 5,946 seam-split components. This tolerance sensitivity means those components cannot be blindly treated as semantic body parts or exported after a global weld. In the 0.00001 m analysis, the following are useful geometry-backed regions, pending exact derivative face selection:

| Region inferred from neutral PNG and position | Triangle count including opposing copies | Source bounds / datum |
| --- | ---: | --- |
| Upper head/helmet shell | 1,224 | X `-0.152354..0.306765`, Y `-20.328226..-19.866473`, Z `2.677440..3.174983`; centre approximately `[0.077206,-20.097349,2.926211]` |
| Front visor/rim candidate | 400 | X `-0.223538..0.377950`, Y `-20.444928..-20.013929`, Z `2.770112..3.068905` |
| Torso shell | 520 | X `-0.259130..0.413537`, Y `-20.282870..-19.923978`, Z `2.107620..2.678528` |
| Positive-X upper arm region | 892 | X `0.203471..0.572408`, Y `-20.456906..-19.986598`, Z `2.321297..2.607343` |
| Negative-X upper arm region | 892 | X `-0.405514..-0.060954`, Y `-20.461433..-19.988622`, Z `2.323703..2.624466` |
| Negative-X hand/grip region | 552 | X `-0.440407..-0.184345`, Y `-20.714109..-20.186573`, Z `2.302725..2.564642`; several nearby disconnected details remain |
| Negative-X leg shell | 748 | X `-0.268027..0.048734`, Y `-20.607904..-19.953016`, Z `1.738194..2.090588` |
| Positive-X leg shell | 748 | X `0.105678..0.422439`, Y `-20.607913..-19.953028`, Z `1.738192..2.090586` |

Positive-X hand fingers/cuff occupy several components; preserve the combined grip shape and original pose until an explicit component/face selection is reviewed. Do not invent eyes or a pelvis anchor from these bounding centres. Full component bounds and source triangle indices are in `measured-anatomy-analysis-v2.json`.

**Exact source defect:** all 8,256 driver triangles form **4,128 pairs of coordinate-identical triangles with opposing winding**, invariant at all three analysis tolerances. There are zero near-zero-area source triangles at the recorded double-area threshold of `1e-12 m²`. The leg/base region with triangle Z maximum ≤2.11 m contains **1,104 opposing pairs (2,208 faces)**. This is exact positional coincidence, not merely nearby surfaces introduced by analysis welding. The source material is double-sided. These pairs are strong evidence for the striped source rendering. Authored-normal analysis also found near-tangent/inconsistent directions, so duplicate removal alone is not yet a verified shading repair.

## Seat and controls

The paired floor candidates are `pasted__L4x8F_pasted__Lego_White8_0` and `pasted__pasted__L4x8F_pasted__pasted__Lego_White8_0`, with world Z range approximately `1.591..1.793`. Their bounds include studs; this range is **not** a single seat plane. The driver's lowest point at Z≈1.735977 does not by itself prove penetration or correct support. Vertical triangle-intersection samples give the following source-space separation; positive gaps at three points do not establish complete fit or contact.

| Sample XY | Floor top Z | Pilot lowest hit below Z 2.12 | Gap |
| --- | ---: | ---: | ---: |
| Left foot `[-0.109646,-20.280460]` | 1.728433297 | 1.738209275 | 0.009775978 m |
| Right foot `[0.264058,-20.280470]` | 1.728433516 | 1.738207161 | 0.009773644 m |
| Under pelvis `[0.077204,-20.103420]` | 1.728433564 | 1.737406247 | 0.008972684 m |

Control objects are `pasted__brick230_phongE2_0` and `pasted__pasted__brick230_phongE2_0`. The neutral view confirms both grips are detached from the bars. Bounds alone imply a longitudinal gap of approximately 0.239 m or more between the most forward driver geometry and the rear of the controls; exact surface contact and hand pivots remain unaccepted. The JSON also records nearest vertex samples, but the controls have end-ring vertices only; those sample distances must not be called exact hand-to-surface gaps. Prefer a later copied-arm/grip adjustment with the original driver retained; do not add a second pilot or change the whole source scale to hide the fit problem.

## Rear exhaust candidates

The actual rear pieces are `pasted__L1x1Stud5_Black_Jets_0` (negative X) and `pasted__pasted__L1x1Stud5_Black_Jets_0` (positive X). Neither contains exact opposing/duplicate triangles in the completed 0.00001 m study. Each rear-most plane has **40 vertices** forming two concentric rim bands. Measured candidates are:

| Side | Source centre `[X,Y,Z]` | Radial evidence |
| --- | --- | --- |
| Negative X | `[-2.204925,-25.205004,0.847100]` | Rear plane radial range approximately `0.216275..0.234784 m` |
| Positive X | `[2.253886,-25.205007,0.847100]` | Same radial range |

The next sampled ring, 0.004951 m forward of the rear plane, has 20 vertices and radius approximately 0.238973 m. The front engines point toward source −Y, so the rear exhaust candidate axis is source **+Y**. These are source-space candidate throat measurements, not runtime anchors; verify the actual opening's inner ring and transform them through the final gameplay normalization. Do not use intake fans, bounding-box tips or concept 12's invented rear inset. Preserve the real opening; no generated throat replacement or automatic cap filling is authorized by this analysis.

## Complete topology and normal findings

[All-mesh analysis JSON](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/all-mesh-topology-analysis.json) records every occurrence and each exact source triangle pair. **4,828 coordinate-identical opposing pairs occur in five meshes**, with no same-winding-only duplicate groups and no near-zero-area source faces at the recorded `1e-12 m²` double-area threshold. All 20 source materials are double-sided. Exact world-coordinate comparison across different mesh occurrences found **zero cross-occurrence groups**; near-coplanar intersections between separate objects were not tested.

| Exact source object | Source triangles | Unique coordinate triangles | Opposed copies removable in trial |
| --- | ---: | ---: | ---: |
| `pasted__LegoTri36_lambert1_0` | 8,256 | 4,128 | 4,128 |
| `pasted__LegoTri8_lambert1_0` | 548 | 274 | 274 |
| `pasted__pasted__LegoTri8_lambert1_0` | 548 | 274 | 274 |
| `pasted__LegoTri9_lambert1_0` | 152 | 76 | 76 |
| `pasted__pasted__LegoTri9_lambert1_0` | 152 | 76 | 76 |
| All 59 occurrences | **48,384** | **43,556** | **4,828** |

Only these five use the redundant paired topology; all five share `lambert1.001`. The other 54 mesh occurrences remain unaltered copies. Counts above are instantiated mesh occurrence totals, not counts of primitive definitions or all 268 scene nodes.

After exact deduplication and **external in-memory coordinate welding at 0.00001 m**, face-edge connectivity gives **74 closed manifold components and 470 open boundary components**, with zero nonmanifold components, orientation conflicts or triangles collapsed by that analysis weld. The pilot has 56 face-edge components (2 closed, 54 open). This differs deliberately from the 32 vertex-connected pilot components in the anatomy study: components that touch only at a vertex are separate under the face-edge definition. These are diagnostic arrays; no welded geometry is exported.

The normals require a separate decision. In the pilot, face geometric normals and mean source authored normals align above dot 0.9 on 4,672 of 8,256 faces; 3,584 have weaker/near-tangent alignment. Among 12,384 coincident-corner pair samples, only 540 have normal dot below −0.99, and none are aligned above 0.99. No zero-length source normals were found. Both `LegoTri8` occurrences have consistently opposed paired normals (822/822 corner samples each); both `LegoTri9` occurrences have mixed/near-orthogonal pairs (24/228 strongly opposed corners each). Numeric per-mesh evidence is in the JSON.

A topological orientation pass is feasible on orientable adjacency, but an open component has no reliable absolute outward direction from volume alone. The first-retained pilot head surface would require 64 flips for local consistency, and each large leg surface 88; **the current trial does not apply those flips**. Even the two closed pilot components do not justify treating the entire minifigure as a sealed volume. Do not fill boundaries, weld all source seams, or globally recalculate outward normals.

## Prepared cleanup and comparison

[Cleanup review instructions](/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/mcp-safe/CLEANUP_REVIEW.md) describe the two independently guarded MCP stages. Neither has been executed.

1. `mcp-safe/04-copy-exact-opposed-cleanup.py` copies all 59 meshes/materials into one isolated study scene. On the five proven meshes it keeps the lower original polygon index per exact opposed pair, retains every original vertex coordinate and the chosen face's source split normals, and records each kept/removed source polygon pair. This is a controlled duplicate-removal trial, not an accepted normal fix. All unique unoriented triangle surfaces remain exactly identical; no pose, palette, welding, hole filling or scale change is mixed in.
2. `mcp-safe/05-render-cleanup-comparison.py` renders one neutral view per call using the actual matching source-view receipt's exact camera. Source bounds, framing, neutral settings and source/cleanup signatures are guarded. Driver first, then rear/front/fullcraft; inspect each actual PNG individually for striped artifacts, remaining inverted/near-tangent shading, helmet/visor/fingers, cockpit walls, fans, real throats and silhouette. Four source PNGs are evidence of source appearance only.
3. If this controlled trial leaves normal defects, preserve it and prepare a separate oriented-normal derivative. Use recorded face adjacency and original corner normals as evidence; choose absolute side for open components from the original surfaces and inspected views. Keep intended holes and hard seams. Do not combine that decision with pose or palette authoring.
4. Once cleanup is visually accepted, fit the retained original hands to the controls, verify foot/seat contact and author driver/seat/throat anchors. Apply a measured source-to-game root normalization once. Root's concept 12 is a paint/readability target only; its invented rear inset supplies no geometry or anchor measurements.
5. Prepare the colour Blockrunner class appearance with preserved source palette provenance, then runtime hero/rival budgets and existing class registration. Registration, local gameplay/performance QA and art acceptance remain later work. No runtime/public changes or gameplay readiness are claimed here.
