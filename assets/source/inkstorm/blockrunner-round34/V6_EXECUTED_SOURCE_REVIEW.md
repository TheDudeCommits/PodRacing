# V6 atlas wrapping correction — actual source review

2026-09-08. Implementation-aware review, not a fresh blind critique or runtime admission. Both actual matched V5 and V6 driver PNGs were opened individually. The foreground ivory stud's vertical dark stripe is gone in V6; the source pilot, fitted controls and vehicle surfaces remain visually intact. Existing disc-rim marks remain separate source/paint features.

| Bounded measured comparison | V5 | V6 |
| --- | --- | --- |
| Pixel (170,615), RGB | 87,83,72 | 131,123,107 |
| Seam-strip luma deficit relative to adjacent ivory | 22.073% darker | 0.232% brighter |
| Export sampler wrapping | Repeat by omitted flags | Explicit `wrapS=33071`, `wrapT=33071` |

The seam ROI is x=[169,177), y=[600,621); comparison flanks are x=[163,168) and [177,182) over the same rows. The metric uses weighted display RGB luma, not linear physical luminance. The actual camera records are exactly equal. Whole-frame mean absolute channel change is 0.01792 on the 0–255 scale; this average is only context, while the local ROI and individual images establish the correction. [Full measurements](v6-stud-seam-roi-assessment.json) include additional regions and row samples.

The [actual V6 author receipt](mcp-safe/atlas-clamp-v6-receipt.json) records two copied meshes, 44,028 triangles and five materials in scene 151. Exactly ten atlas image nodes changed `REPEAT` to `EXTEND`. All 150 earlier scenes/context, source/fit/V5 geometry, UVs, corner normals, mask values, shader graphs and packed atlas images were preserved. The [actual matched driver render receipt](mcp-safe/atlas-clamp-v6-driver-render-receipt.json) retains all 151 preceding scenes and reports exact extension-aware graph, packed-image, source/fit normal and mask guards.

The [actual private export receipt](runtime-admission-preparation/export-atlas-v6-v1-receipt.json) adds a separate normalized export scene 152, preserving all 151 previous scenes/context. External inspection of its [master GLB](exports/blockrunner-atlas-v6-round34-export-v1-normalized-master.glb) confirms explicit ClampToEdge in both axes. No atlas rebake, UV edit, geometry change or normal re-encoding was required. Packaging and gameplay acceptance remain separate root-owned work.

[Actual evidence inventory](source-clamp-v6-actual-inventory.json) hashes 14 artifacts: the two compared PNGs, V5/V6 source and render receipts, V6 export receipt/master, both numeric diagnoses and the four untouched atlas PNGs. Earlier preparation, failure and source-stage inventories remain preserved.
