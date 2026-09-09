# Ivory — exact opposing face cleanup preparation V1

**Prepared only. No cleanup, masks, Blender call, browser, public asset or runtime change was executed.** The existing Ivory original and successfully audited source copy remain the authorities. This prepares a later derivative; fleet counts stay four registered families and 22 pending.

[Operation inputs](operation-inputs.json) pin the 2,868,492-byte Ivory GLB (`2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576`), the actual source audit, the actual source-copy receipt, and the previously saved semantic correspondence. Their SHA256 is `8a0dc7a4f7bec7d8b48603d3ce508c9091e84fa4ecb4c7b79e3f8ea69883f25c`. The [bounded offline preparer](prepare-cleanup-inputs.py) uses one linear pass over the 48,384 own GLB triangles; it performs no nearest-surface search or new Colour geometry scan.

| Own Ivory result | Source | Proposed retained |
| --- | ---: | ---: |
| Whole source | 48,384 | 43,556 |
| `pasted__L2x3slope2_lambert1_0` container | 9,656 | 4,828 |
| Pilot subset within that container | 8,256 | 4,128 |
| Body remainder within that container | 1,400 | 700 |
| Helmet subset | 1,480 | 740 |
| Visor subset | 400 | 200 |
| Gloves subset | 1,360 | 680 |
| Suit subset | 5,016 | 2,508 |

These are independently computed Ivory candidate counts. Only the lambert1 container has candidates: **4,828 exact opposing pairs**, pair-list FNV-1a-64 `d1f9b1421c8d3801`. The other 50 meshes have none. The scan found no ambiguous coincident groups, same-winding duplicates, opposing pairs with different matched-corner UVs, or degenerate triangles. This is bounded to per-mesh comparisons; no coincident faces across different objects are merged.

An eligible pair has exactly equal own GLB coordinate triples, three distinct non-collinear corners, reversed cyclic winding, the same material, and identical UVs at corresponding positions. There is no coordinate tolerance or weld. Keep the lower **Ivory source polygon index**, including its own corner order, UVs, smoothing and normals. This deterministic choice is not a claim that every retained normal points outward.

The executed source-copy audit proved the full own GLB position/UV stream and live ordered polygon/loop/vertex mapping for all 51 meshes. A global GLB triangle is `firstGlobalTriangle + sourcePolygonIndex`; its source loop is `3 * sourcePolygonIndex + corner`. Normal encoding is separate: the original and source copy have exact own raw corner-normal FNV parity, while GLB/live normal streams differ. The 54-corner sample measured at most 0.00277668 degrees; that is a sample bound, not a whole-source tolerance or permission to replace normals.

Semantic membership is transferred through the saved one-to-one Colour-to-Ivory triangle map and then the executed own Ivory GLB-to-live bridge. No Colour polygon index is used directly as an Ivory index. The four disjoint pilot subsets cover exactly 8,256 Ivory polygons; a separately verified 1,400-polygon complement remains body. Every exact opposing pair stays within one semantic subset. **Never assign the whole named container to the pilot.** The input lists preserve source polygon IDs, proposed retained source IDs and proposed derivative IDs; no live masks have been applied.

The next operation must create another deep copy, preserving the already audited source-copy scene:

- Preserve `PodRacing — source e42fb924b344481ea013c58cb0f52ad7 retry 20260908` and `PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7` unchanged.
- Require the new scene name `PodRacing — Blockrunner Ivory exact opposing cleanup V1 e42fb924b344481ea013c58cb0f52ad7` absent. Use `Blockrunner Ivory cleanup V1 ` for new IDs. Copy all 55 objects, 51 meshes and 51 materials, remap copied parents, and preserve the complete hierarchy and every local/world transform.
- Before any cleanup mutation, recompute the **exact live** coordinate/winding/UV pair list on the audited source copy and compare every pair plus the own source signatures. The six-decimal GLB bridge alone does not certify exact live duplicate equality. Any mismatch stops the cleanup.
- Remove only the independently reverified upper-index face in each eligible pair on the new derivative. Retain the complete original vertex list, every surviving corner's UV and smooth flag, material slots, unique geometric surfaces, and explicit source-to-retained polygon/loop lineage. Do not change the other 50 meshes.
- Preserve both 828-triangle beam halves and their different positions exactly. Do not apply the comparison translation, a beam correction, normalization, fit or pose change.
- Keep Ivory's own original/source-copy normals as the authority. Do not recalculate normals, copy Colour normals or inherit Colour's encoding tolerance. If a reconstruction method re-encodes retained normals, first measure and review that behavior on a disposable Ivory derivative, then report the actual Ivory difference separately; do not claim exact parity without measuring it.
- Snapshot fresh all-scene/all-collection memberships/settings, all 12 guarded ID sets and the exact current scene/layer/active/selection. Do not hard-code a stale scene count. Restore context and verify both preserved Ivory scenes before/after. Roll back only newly owned derivative IDs on failure. Never save the shared blend.

After an actual successful cleanup receipt, review the surviving surfaces and orientation before applying any semantic masks or control fitting. Pilot extraction, authored paint/UVs, baking, normalization, LOD, export and runtime admission remain later work.
