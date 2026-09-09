# Actual V7/V8 source checkpoint

Parent executed V7 authoring, one matched driver render, two color bakes and V8 atlas finalization. The current completed source checkpoint has154 scenes: V7 procedural contact-color scene153 and V8 clamped atlas scene154. Source/fit/V4B/V6/V7 guards passed at the relevant operations; the V8 receipt preserves all153 preexisting scenes and context. No runtime/public replacement or art acceptance is established by these source operations.

V7 adds short-range AO to the preserved pigment/wear color branch at0.16 source-world units, strength0.38 and16 AO samples. Existing roughness, geometry, authored pilot, controls, UVs, corner normals, source lineage and two mask arrays remain unchanged. The actual driver comparison showed subtle contact-depth changes; it compares V6 atlas to V7 procedural and cannot isolate AO from atlas filtering. See the [implementation-aware driver review](V7_DRIVER_ACTUAL_REVIEW.md).

The actual body2048 and pilot1024 color bakes route the **new AO-composited `Inkstorm Paint Color` output** through temporary EMIT nodes. Before rendering, an inverse graph record removes only the temporary emission/target and restores the original surface edge; after baking, another inverse record removes only the newly retained target/active-node delta. Exact15d shader graph, original packed images, other owner graph, source/fit/V4B, geometry/UV/material slots, masks, normals, selection/settings/context checks passed. Both owners stayed renderable. No roughness image was rebaked.

| Actual color master | Bytes | SHA256 |
| --- | ---: | --- |
| [Body](../blockrunner-body-color-v1-20260908-contact-v7.png) | 1,463,920 | `07243038165c77f64ecc3856a20a6e4d4e3baed3742dac394dc10fe3a5be7b72` |
| [Pilot](../blockrunner-pilot-color-v1-20260908-contact-v7.png) | 586,530 | `27d3ed1a8582ba6140b138ab0754d65faff586d04895ae166d768148548a1822` |

[Parent's actual color-master validation](actual-color-master-validation-v1.json) records unchanged coverage masks, no positive RGB changes, and darkening in the new color masters. Covered-channel median linear ratios include undersides and bake margins and do not establish visible improvement. Some fine AO grain was observed by parent in the masters. The already dark in-game pilot requires an actual visibility check after packaging; deeper contact alone is not an acceptance criterion.

V8 copies the unchanged44,028 triangles into two owners with one body and four pilot atlas materials. Pilot semantic slot indices remain exact; body indices become0 because all three palette roles are in the baked atlas. Its non-color Principled responses explicitly match the preserved V6 atlas. All ten texture nodes use EXTEND; all four source images are retained by identity/packed-byte checks. The two roughness channels explicitly reference their original V4B receipts and original bake scene. No synthetic V7 roughness receipt, new LOD calculation, normal map, UV change or shared `.blend` save was introduced.

Actual receipts: [author](../mcp-safe/contact-author-v7-receipt.json), [driver render](../mcp-safe/contact-v7-driver-render-receipt.json), [body color](../mcp-safe/bake-v7-body-color-receipt.json), [pilot color](../mcp-safe/bake-v7-pilot-color-receipt.json), [V8 atlas](../mcp-safe/contact-atlas-v8-receipt.json).

The [V8 normalized-export payload](../runtime-admission-preparation/export-atlas-v8-v1-prepared-input.py) is **prepared only** at this checkpoint:120,439 bytes, SHA256 `dc0c3f62952ff076bb49f826063ed768599ae31bd69d4c3a49cdb991785b77f6`. It uses the existing exactly-once1.6 normalization as positive object transforms, removes only the two named authoring masks on new export mesh copies and preserves V8/source/fit plus extended V7/V4B/V6 guards. No new LOD solve is performed. The reserved output is `exports/blockrunner-atlas-v8-v1-normalized-master.glb`. Parent owns later execution, private packaging, geometry/roughness/sampler comparison and in-game assessment.
