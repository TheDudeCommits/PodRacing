# V5 stud seam — external measured diagnosis

The narrow dark stripe on the foreground ivory stud is consistent with texture wrapping across the atlas border. The measured surface is less than half a texel from that border; the opposite image edge is black. A sampler-only comparison is justified. No UV, paint, geometry or normal repair is indicated by this result.

This implementation-aware diagnosis uses the actual [V5 driver render](paint-v1-driver-20260908-round34-atlas-v5.png), its [camera receipt](mcp-safe/atlas-v5-driver-render-receipt.json), the [normalized V5 master GLB](exports/blockrunner-atlas-v5-round34-export-v1-normalized-master.glb), and preserved V2 topology/lineage. It is not a new blind review or a runtime acceptance result. No Blender/browser calls were made.

| Measured item | Result |
| --- | --- |
| Render pixel, top-left origin | (170, 615), pixel center |
| Body triangle / original object local polygon | 9326 / 398 |
| Original source object | `pasted__LegoTri19_pasted__Lego_White18_0` |
| Hit position in original Blender world | (-1.0727343, -20.8982662, 1.8947589) |
| Exported glTF UV | (0.8895200133, 0.9999885741) |
| Distance from nearest border, 2048 atlas | 0.0234003 texel |
| Sampled atlas last row / opposite first row | RGB (230,220,199) / (0,0,0) |
| Actual rendered pixel | RGB (87,83,72) |
| Bilinear sampling after sRGB decoding, then re-encoded: Repeat / Clamp | RGB (172.30,164.67,148.63) / (230,220,199) |

The decoded-linear comparison above changes only wrapping. It is not a reproduction of Cycles lighting or its full filtering footprint. The JSON also records an encoded-RGB interpolation diagnostic, which is useful for tracing the weights but is not physically equivalent to linear color filtering.

At y=615, x=170 lies 0.0234 texel from the border; x=177 lies 0.5126 texel from it and its bilinear color is full ivory. The actual render recovers from RGB (87,83,72) to (130,121,104) over that same narrow interval. The adjacent stud face samples a separate interior island more than 400 texels from a border. This explains a vertical line at the UV seam without a physical split.

The master sampler omits `wrapS` and `wrapT`. The installed Three.js loader explicitly assigns `RepeatWrapping` when either is absent (`node_modules/three/examples/jsm/loaders/GLTFLoader.js:3267`). The atlas finalizer creates the two linear image texture nodes without setting their extension mode. The first hit triangle has a UV vertex exactly at v=1. All 39,900 ordered body triangles in this GLB exactly match the preserved actual V2 topology after only the glTF-to-Blender basis conversion; maximum position difference is 0. Thus the source object/polygon lineage used here is verified, rather than inferred from triangle order alone.

Root can now clone the finalized V5 atlas scene/materials, set only the ten existing atlas image nodes (base color and roughness in five materials) to `EXTEND`, and render the same driver camera. Preserve V5 history and compare the stud stripe, pilot and ivory shading. On the resulting export copy, verify explicit glTF sampler `wrapS=33071`, `wrapT=33071` (ClampToEdge), unchanged embedded image hashes and exact geometry/UV/normals. If the stripe disappears, retain this bounded sampler correction through packaging. This does not require another bake or UV unwrap. Internal island padding and lower-resolution mip behavior remain separate checks.

Evidence: [36 ray samples and exact edge colors](v5-stud-seam-external-diagnosis.json), [reproducible external analysis](diagnose-v5-stud-seam.py). Master SHA256: `b1dafc9ae1aed46ae5ac9a590380796291e86ed35781aee944552cf38d101017`.

Subsequent actual result: root executed the guarded V6 copy and matched driver render. This reviewer inspected both PNGs individually; the stripe disappeared. The seam ROI's dark deficit fell from 22.073% to effectively zero, and the actual V6 master explicitly exports ClampToEdge in both axes. See [the executed review](V6_EXECUTED_SOURCE_REVIEW.md) for measurements, preservation receipts and the separate runtime-acceptance boundary.
