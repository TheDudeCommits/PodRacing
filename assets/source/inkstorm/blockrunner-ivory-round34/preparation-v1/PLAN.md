# Ivory Blockrunner — bounded source preparation V1

Prepared 8 September 2026 from existing saved comparisons and metadata. **Fifth-family preparation only: not authored, exported, registered or visually accepted.** No MCP, browser, runtime/public edit, new download or expensive geometry scan occurred. Current fleet counts stay four families /22 pending.

Use the ivory source's own geometry and normals. [Exact operation inputs](operation-inputs.json) include all55 original object names, all51 mesh references, selected pilot/control/sidewall mappings, bounds and immutable input hashes.

| Input | Exact reference |
| --- | --- |
| Ivory UID / title | `e42fb924b344481ea013c58cb0f52ad7` / Pod Racer |
| Preserved GLB | `/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/e42fb924b344481ea013c58cb0f52ad7/source-imported.glb` |
| Bytes / SHA256 | 2,868,492 / `2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576` |
| Saved source scene | `PodRacing — source e42fb924b344481ea013c58cb0f52ad7 retry 20260908` |
| Author / licence | 20001748; CC BY4.0, saved official metadata at `/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/e42fb924b344481ea013c58cb0f52ad7/official-metadata-20260908.json` |
| Colour algorithm reference | `a6f14ae799ab40d7ac425f043f824ff8`; original SHA256 `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e` |

Retain independent UID/title/author/model URL, CC BY4.0 link and cleanup/control-fit/paint/LOD modification notice. Both are official MCP-imported source GLBs; no original vendor archives are claimed. The licence basis is saved official metadata, not a fresh network check.

## Reuse boundaries that affect implementation

Existing numeric evidence records **55 nodes,51 mesh occurrences,51 materials,48,384 actual triangles,zero textures and zero mirrored occurrences**. Colour instead has268/59/20 and nine mirrored occurrences. The shared source outlines do not make arrays, normals, hierarchies or polygon IDs identical. The analysis-only ivory→colour translation is `[0.02448349541776862, -22.557639647425383, -4.4192478032556437e-07]`; it was never applied to either original.

The saved30µm-tolerance mapping covers46,641 triangles (96.40%). Two828-triangle beam halves differ in original placement: ivory `pasted__L2x3slope2_pasted__Lego_White9_0` and `pasted__L2x3slope2_pasted__pasted__Lego_White9_0` would need extra X shifts +0.527285645 /−0.540431999m to match colour. **Preserve those ivory placements.** Another87 triangles have alternate triangulation: paired sidewalls7/8 and cylinder patches35/37. Keep their original topology; do not transfer raw face/UV indices or infer exact curved-surface equality from equal boundaries.

**The pilot is a subset, not the whole named object.** Ivory `pasted__L2x3slope2_lambert1_0` contains9,656 triangles:8,256 mapped pilot triangles plus1,400 body triangles. The body remainder corresponds to the colour paired `LegoTri8` (548+548) and `LegoTri9` (152+152) parts. Classifying the whole ivory container as pilot would hide body geometry at pilot LOD distance. Its existing UV array is all zero, so source UV presence is not an atlas.

Transfer the four source semantic roles through the saved original triangle/corner map: suit5,016, helmet1,480, visor400 and gloves1,360 original faces (total8,256). After **independently verified** opposite-face cleanup, colour retained2,508/740/200/680; these are expected role targets only, not yet measured ivory cleanup counts. Preserve ivory's own corner normals; even the mapped pilot differs by up to0.000638029 normal chord. No colour normal array or encoding budget is an ivory reference. The first audit must also bridge pinned GLB triangle/corner IDs to actual live Blender polygons before assigning masks; saved NPZ indices are not assumed Blender polygon IDs.

The two236-triangle controls map to ivory `pasted__L2x3slope2_pasted__LegoWhite4_0` and `pasted__L2x3slope2_pasted__pasted__LegoWhite4_0`. Their matching3800-triangle sidewalls are the four- and five-`pasted__` Lego_White11 containers listed exactly in the input JSON. That JSON supplies transformed **unverified fit seeds** for the0.35m grips and0.035m-radius side supports. Recheck full meshes, bevel ends, hand contact, leg clearance and2mm panel embed on ivory; never apply the colour world coordinates directly or move the pilot/seat to force contact.

## Next safe operations

1. **Read-only reference call first.** Select the exact saved ivory scene by name and validate55 objects/51 meshes/48,384 triangles. Record its own FNV hierarchy, geometry, UV/material and corner-normal references. Require the original GLB SHA above from the external caller. Snapshot actual current global memberships/context;152 scenes is the last recorded state, not a licence to ignore later scenes. Preserve all histories and restore exact original Cruise scene/layer/active object/selection in `finally`. Do not import a duplicate if the existing scene passes its own reference checks.
2. **One unchanged copy next.** Create only `PodRacing — Blockrunner Ivory source copy V1 e42fb924b344481ea013c58cb0f52ad7`, requiring that name absent. Deep-copy all55 objects and51 mesh datablocks/materials, remap copied parents, preserve original world matrices, triangle order, slot indices, UVs and corner normals. Use object prefix `Blockrunner Ivory source V1 `. No cleanup, paint, normalization or pose changes in this first call. Roll back only newly owned IDs on failure. Never save the shared `.blend`.
3. Audit exact opposed/duplicate faces on that copy, then produce an ivory-only cleanup lineage. Source holes, alternate triangulations, silhouette and beam positions stay intact. Extract the pilot by the saved correspondence subset; fit controls only after fresh full-mesh clearance measurements. Reuse the colour procedures and successful construction choices, with ivory-owned references.
4. Consolidate into two owners, target1body+4pilot draws, author fresh copy UVs/masks and a distinct ivory-shell/graphite-hardware palette. Bake readable wear/roughness at sizes that survive final hero1024/512 and rival512/256 color/roughness. Keep packed image identities and10 atlas image nodes EXTEND/ClampToEdge; remove masks only on export copies. Recompute anchors/normalization from ivory's own seat, bounds and nozzle apertures; retain the rigid crossbeam and avoid duplicate energy coupling/nozzle hardware.

## Budget and admission boundary

Existing limits are **hero≤60,000 triangles; rival≤30,000; body≤6 draws; pilot≤6; total≤12**. Target five total draws as in colour. If ivory cleanup independently yields the same4,128-triangle pilot, rival body must be≤25,872 with pilot untouched. Colour's44,028 hero/29,682 rival are useful calibration points, not imported ivory results. Keep all source surfaces through source preparation; any later rival reduction needs its own LOD lineage and evidence.

Proposed later appearance ID is `blockrunner-ivory`, garage label **Blockrunner Ivory**, existing `podracer` class. No registry, roster, source manifest counts or public files change in this preparation. The colour V3 partial technical checkpoint and6/10 visual rejection cannot accept ivory. Actual source views, reimport, public-byte/real-hero/rival loading, lifecycle/full races and independently scoped art review remain later gates.

[Existing numeric comparison](../../blockrunner-round34/IVORY_VARIANT_SOURCE_COMPARISON.md) · [Triangle/corner mapping](../../blockrunner-round34/original-variant-correspondence-analysis-copy.npz) · [Alternate-patch refinement](../../blockrunner-round34/original-variant-unmatched-refinement.json) · [Colour source authoring history](../../blockrunner-round34/SOURCE_PAINT_STAGE_SUMMARY_ROUND34.md).
