# Blockrunner measured source findings

2026-09-08. **Interim: numerical work paused for root's performance window.** The successful live audit and four neutral PNGs were read; all images were inspected individually. External geometry analysis has completed for the driver and the two rear engine pieces, and all 59 source occurrence bounds/counts were compared with the live audit. The comprehensive per-mesh duplicate/normal/manifold pass is prepared but has not run. No source/Blender/runtime/public geometry was changed.

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

**Exact source defect:** all 8,256 driver triangles form **4,128 pairs of coordinate-identical triangles with opposing winding**, invariant at all three analysis tolerances. There are zero near-zero-area source triangles at the recorded double-area threshold of `1e-12 m²`. The leg/base region with triangle Z maximum ≤2.11 m contains **1,104 opposing pairs (2,208 faces)**. This is exact positional coincidence, not merely nearby surfaces introduced by analysis welding. The source material is double-sided. These pairs are strong evidence for the striped source rendering, but authored normal pairing and post-cleanup rendering still require verification.

## Seat and controls

The paired floor candidates are `pasted__L4x8F_pasted__Lego_White8_0` and `pasted__pasted__L4x8F_pasted__pasted__Lego_White8_0`, with world Z range approximately `1.591..1.793`. Their bounds include studs; this range is **not** a single seat plane. The driver's lowest point at Z≈1.735977 does not by itself prove penetration or correct support. Vertical surface samples under both feet and pelvis are queued in the comprehensive analyzer.

Control objects are `pasted__brick230_phongE2_0` and `pasted__pasted__brick230_phongE2_0`. The neutral view confirms both grips are detached from the bars. Bounds alone imply a longitudinal gap of approximately 0.239 m or more between the most forward driver geometry and the rear of the controls; exact surface contact and hand pivots remain unaccepted. Prefer a later copied-arm/grip adjustment with the original driver retained; do not add a second pilot or change the whole source scale to hide the fit problem.

## Rear exhaust candidates

The actual rear pieces are `pasted__L1x1Stud5_Black_Jets_0` (negative X) and `pasted__pasted__L1x1Stud5_Black_Jets_0` (positive X). Neither contains exact opposing/duplicate triangles in the completed 0.00001 m study. Each rear-most plane has **40 vertices** forming two concentric rim bands. Measured candidates are:

| Side | Source centre `[X,Y,Z]` | Radial evidence |
| --- | --- | --- |
| Negative X | `[-2.204925,-25.205004,0.847100]` | Rear plane radial range approximately `0.216275..0.234784 m` |
| Positive X | `[2.253886,-25.205007,0.847100]` | Same radial range |

The next sampled ring, 0.004951 m forward of the rear plane, has 20 vertices and radius approximately 0.238973 m. The front engines point toward source −Y, so the rear exhaust candidate axis is source **+Y**. These are source-space candidate throat measurements, not runtime anchors; verify the actual opening's inner ring and transform them through the final gameplay normalization. Do not use intake fans, bounding-box tips or concept 12's invented rear inset. Preserve the real opening; no generated throat replacement or automatic cap filling is authorized by this analysis.

## Non-destructive next steps

1. After root releases the performance window, run **external-only** `analyze-all-source-meshes.py`. It is prepared to cover all 59 occurrences: exact same/opposed coordinate triangle groups, authored normals and double-sided material flags, then manifold/components/orientation after in-memory exact deduplication and a bounded coordinate weld. It also samples seat support and hand-to-control separation. It has not run yet.
2. Use that evidence to make a separate derivative copy. Remove only proven coordinate-identical redundant faces while retaining an explicit source triangle lineage. The driver alone has a potential 8,256→4,128 face reduction without moving vertices, but no cleaned derivative has been made or accepted.
3. Establish consistent outward normals for closed manifold components using adjacency and signed volume. Preserve authored surfaces of open components and their intended holes until visually reviewed; do not fill every boundary, globally weld seams, or pick the first opposed face without checking orientation/normal evidence.
4. Render the copied cleanup at the same neutral driver/front/rear/fullcraft cameras to verify that striped artifacts disappear and silhouette, fans, real throats, cockpit walls, minifigure features and intended holes remain intact. Preserve original source and failed trials.
5. Only then fit the retained hands to controls, author exact seat/exhaust anchors and root normalization, map the original colour/material palette into a small number of copied surfaces, and prepare hero/rival packages within existing runtime budgets. No runtime/public registration or art acceptance is claimed here.
