# Blockrunner source, packages and registration — round34

**Colour Blockrunner now has locally registered V6 hero/rival packages and retains its original minifigure pilot.** This is the fourth family, not a fourth project driver. Final in-game art remains unaccepted. Source work ends at152 preserved Blender scenes; the full runtime/performance checkpoint is recorded separately in [ROUND34](ROUND34.md).

Source UID `a6f14ae799ab40d7ac425f043f824ff8`, **Pod Racer Colour**, author **20001748**, **CC BY4.0**. The preserved2,667,212-byte [source GLB](../../assets/source/inkstorm/vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb) has SHA256 `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`. Official metadata, independent variant identities and licence restrictions remain in the [catalogue](VEHICLE_CATALOG.md) and manifest. No original vendor archive is claimed.

## Actual source stages

| Stage | Measured result | Evidence |
| --- | --- | --- |
| Original audit | 268 objects,59 mesh occurrences,48,384 instantiated triangles; four neutral views. | [Audit](../../assets/source/inkstorm/blockrunner-round34/mcp-safe/audit-receipt.json) |
| Exact opposing-face cleanup | Removes4,828 duplicate triangles only in five meshes;43,556 remain. Pilot8,256→4,128. Source coordinates, selected normals and holes preserved. | [Cleanup receipt](../../assets/source/inkstorm/blockrunner-round34/mcp-safe/cleanup-v1-receipt.json) |
| Control fit V1 | Two shortened source-profile grips and two side mounts;61 meshes/44,028 triangles. Original pilot and other56 objects unchanged. Full-length leg-intersecting trial preserved. | [Executed fit](../../assets/source/inkstorm/blockrunner-round34/CONTROL_FIT_V1_EXECUTED.md) |
| Paint V2/V4/V4B | Consolidates into two owners; effective winding for7,172 mirrored triangles retained; source-lineage masks and baked palette/roughness. V4B breaks repeated wear rings/stripes. | [Stage summary and failures](../../assets/source/inkstorm/blockrunner-round34/SOURCE_PAINT_STAGE_SUMMARY_ROUND34.md) |
| Atlas V5/V6 | One body/four pilot atlas materials. V6 changes only ten texture extension flags to fix a measured border-wrap stud seam; no rebake/UV/normal repair. | [Executed V6 review](../../assets/source/inkstorm/blockrunner-round34/V6_EXECUTED_SOURCE_REVIEW.md) |
| Private normalized V6 export |152 scenes; preserves all151 earlier scenes/context. Exactly-once artist scale1.6, game+Zforward/+Yup; no shared blend save. | [Export receipt](../../assets/source/inkstorm/blockrunner-round34/runtime-admission-preparation/export-atlas-v6-v1-receipt.json) |

The DCC consolidation uses an explicit0.1° normal-encoding budget after a preserved stricter failure; actual V2 maxima are approximately0.07174° body and0.03010° pilot. Original requested world normals were re-fed after UV authoring, and later exact-copy stages do not re-encode them. These limits are distinct from immutable original-source/fit signatures. Mask attributes are removed only from the export copy after baking to prevent unintended vertex-colour tint; authoring histories retain them.

The V6 driver seam ROI changed from22.073% darker than adjacent ivory to effectively no deficit; actual V5/V6 cameras match. The exported sampler is explicitly ClampToEdge in both axes. Source stage inventories record FNV structure/mask/packed-image guards separately from file SHA256 provenance. They do not claim byte identity of every Blender property or all-lighting art acceptance.

## Actual public packages

| Variant | Bytes | Triangles: body + original pilot | Base-colour / roughness sizes | SHA256 |
| --- | ---: | ---: | --- | --- |
| [Hero](../../public/assets/inkstorm/vehicles/blockrunner-hero-v1.glb) |3,693,000|39,900+4,128=44,028|Both owners1024² /512²|`7eeca075e2a8ea9b1b11e381ff447d6ec7bb83d8f73f6ddb41f843b4cbadfeb4`|
| [Rival](../../public/assets/inkstorm/vehicles/blockrunner-rival-v1.glb) |3,228,580|25,554+4,128=29,682|Both owners512² /256²|`ae90b8f56c2ebca7e128aeee14c6a6e5c59d473a6a0898f8fc64dfbfc283342a`|

Both packages have five material submissions before extra render passes, four images, no normal map and identity mesh-root transforms. Estimated RGBA8 full mip allocation is13,981,008 /3,495,248 bytes. Khronos validation reports zero errors/warnings for both, and the local public bytes match their actual package receipts. [Hero receipt](../../assets/source/inkstorm/blockrunner-round34/runtime-admission-preparation/packaged-atlas-v6-v1/blockrunner-hero-v1.package-receipt.json) · [Rival receipt](../../assets/source/inkstorm/blockrunner-round34/runtime-admission-preparation/packaged-atlas-v6-v1/blockrunner-rival-v1.package-receipt.json) · [Public admission](../../output/gauntlet/round34-blockrunner-admission-v1/public-admission.json).

The source pilot datum is positioned at game Z−5.2; exported bounds are approximately9.39×5.05×19.2m. This scale is an explicit presentation choice, not canonical vehicle size. The inner nozzle radius measures approximately0.346m; runtime metadata uses conservative0.34m. Existing physical crossbeam/nozzle hardware suppress duplicate coupling/lips. Geometry, anchors and the current game's visual performance must be assessed through their own evidence.

## Acceptance and preserved source identity

Narrow fresh source cleanup8.5PASS and static control fit8PASS remain bounded historical results. Earlier paint criticism, V4/V4B self-review and V6 seam verification are separately scoped; no self-score replaces a fresh blind final gate. The completed V1 in-game review remains **5.5/10 selected craft / 6/10 world, FAIL**. It is independent but **not fresh blind** because the reviewer previously saw limited aperture/catalogue implementation context; the agent limit prevented a new reviewer. V3 camera changes are captured; their final review is **PENDING ROOT FINAL FACTS**. No final art PASS is claimed.

The [current runtime gallery](CURRENT_VISUALS.md) and [round checkpoint](ROUND34.md) own current images/build/performance. The ivory source `e42fb924b344481ea013c58cb0f52ad7` remains one of22 pending families: its whole pilot maps, but two beam halves differ in placement and87 triangles use alternate triangulation. [Numeric comparison and reuse boundaries](../../assets/source/inkstorm/blockrunner-round34/IVORY_VARIANT_SOURCE_COMPARISON.md). Retain both original files and each source's own normals/lineage.

Restore the original Cruise scene/layer/active object/15-object selection after every Blender operation, remove temporary render data, and never save the shared `.blend`. All earlier source/cleanup/fit/paint revisions and failures are retained; [pre-admission source document](evidence/round-34/pre-blockrunner-admission-documentation/BLOCKRUNNER_CLEANUP_ROUND34.md) preserves the longer preceding chronology.
