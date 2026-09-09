# Temporary Blender UV export audit

Current pit candidate: **UV PASS**, `pit-complex-xatlas-2048x2048-priority4-uv-export.glb`, SHA-256 `2d7c58e49e5257e93fce9fda425e669c7d8944fcb9c87b2f3556edcbeee34c00`. Canonical `pit-complex.uv-corners.json` and `pit-complex-uv-audit.json` point to it. All 12,012 triangles match, positions and normalized normals are exact, overlaps are zero, minimum per-chart padding is at least eight pixels, and atlas border is 9.2522 pixels. Priority density is 7.1985 texels/metre; the target of eight remains unmet. Texel-center occupancy is 21.1556%, with 1,271 triangles containing no texel center. This is UV acceptance for a pilot, not lighting or runtime acceptance.

The square texture costs 21.333 MiB as RGBA8 with mipmaps for this family alone. Global UV anisotropy is 1.003. `_SOURCE_NORMAL` was independently checked as an exact 69,606-component clone of `NORMAL`, in original GLB coordinates. The white bake shader must perform the documented GLB-to-Blender conversion. The root bake agent confirmed generic attributes retain their values on import.

`transfer-uv1.mjs pit-complex` completed successfully. Delivery: `candidates/pit-complex-workshop-lightmap.glb`, SHA-256 `e0a5a2260058876c14ede8f9f65c1268fa8dd4192e1b2c5a6e5b661da27a98e4`, 1,094,204 bytes, 23,202 vertices (+296 UV seam splits), 12,012 triangles. Every original POSITION/NORMAL/COLOR corner component survived exactly. glTF validation returned zero errors/warnings and two informational unused-UV notes. The UV-only transfer receipt is `pit-complex-uv-transfer.json`; no bake or runtime result is implied by it.

Optional district work is **UV FAIL and stopped**, pending the pit game comparison. `pit-district-xatlas-2048x2048-priority4-padding24-uv-export.glb` has SHA-256 `945f46f6afdd1820b739676bb759b864c76e6ece45a1d6397bfc581eedbb2a7a`. All 17,110 triangles map, positions/normals are exact, and overlap is zero, but minimum padding is 7.8994 pixels (15.7988-pixel gap), below eight. The gate was not rounded or relaxed. Priority density is 6.7824 texels/metre, occupancy 9.1484%, and chart count 5,952. Canonical district corners remain FAIL and no district transfer or bake was performed. This optional 2048² map would cost 21.333 MiB per scale variant if accepted later; the two district scale variants would require separately verified irradiance.

`validate-uv.mjs` owns only CPU validation and transfer metadata. It does not launch Blender, touch source GLBs, change materials, bake, or edit runtime/public assets.

Run after a UV export exists:

```sh
node assets/source/inkstorm/workshop-lighting-round30/validate-uv.mjs pit-complex /absolute/path/temporary.glb --width 2048 --height 1024 --padding 8
```

Use `pit-district` for the other frozen family. For a 1024 × 1024 district tile, audit that tile at its actual 1024 × 1024 dimensions; a two-tile runtime atlas does not double either tile's texel density. The temporary glTF export must contain original scalar `_SOURCE_ID` values and `TEXCOORD_0`. A different semantic can be selected explicitly with `--source-semantic` / `--uv-semantic`. `_SOURCE_ID` is the exact frozen accessor row, survives vertex splits, and must not be normalized. Blender custom attribute names are case sensitive in this check.

Inputs are `inputs/<family>.json`, `source-metrics.json`, and the hash-pinned frozen GLB. The exporter must retain all source triangles and their winding. Triangle matching tolerates cyclic corner rotations and arbitrary face order. It rejects reversed winding, missing/extra source triangles, invalid IDs, and changed positions or normals. Exported positions are transformed by the glTF node world matrix; normals use its inverse transpose. Position tolerance is 1e-5 metres (Euclidean), and normal tolerance is 1e-5 per normalized component. Original authored attributes are still copied from the frozen GLB by `transfer-uv1.mjs`; the temporary export is never the geometry delivery source.

The default normal check remains strict. If the owner explicitly accepts importer normal encoding drift, `--normal-angle-tolerance 0.05` applies a separate 0.05-degree limit for the temporary export, retaining the measured component drift and `normalsWithinStrictComponentTolerance` flag in the receipt. It emits a warning when the strict component tolerance was exceeded. This option never claims temporary normal equality or replaces the final transfer's exact authored normal check.

The validator outputs `<family>-uv-audit.json` and `<family>.uv-corners.json`. A failed audit still writes a FAIL receipt and available corners, returns exit code 1, and cannot pass the existing transfer script. A successful UV audit means correspondence, UV domain, nondegenerate triangles, positive-area overlap, measured spacing, and raster separation passed. It does not approve density, baking, physical lighting, texture decode, final UV orientation, or visual/runtime acceptance.

Use `--output-stem NAME` to preserve experimental receipts/corners separately from the canonical family files.

Chart connectivity follows shared source-space edges with matching UV endpoints. Exact source-position welding bridges the authored normal/color vertex splits. UV endpoints use 1e-8 normalized quantization; a rounding-boundary split is conservative because it creates an additional boundary. Source/UV edges with more than two incident faces are reported, and overlap testing still runs. A UV chart is not inferred from color, bounding boxes, or proximity alone.

Overlap candidates use a spatial grid, followed by actual triangle clipping. Shared edges/vertices with zero intersection area are excluded. Positive intersection area above 1e-6 pixel² fails, including overlaps within a chart. A candidate-pair cap is explicit: exhausting it marks the audit incomplete and FAIL, never zero overlap.

Padding measures actual cross-chart boundary segment distances and atlas-edge distance in pixels. Required eight pixels of dilation per chart means at least sixteen pixels between distinct chart interiors and eight pixels from any chart to the atlas border. If no edge pair lies within the search radius, the reported minimum is a conservative lower bound, not an invented exact distance. Eight-pixel spacing is a base-level geometric guard; it does not prove mip behavior. A diagnostic `--padding` below eight can report measurements but cannot produce a transfer PASS.

Density uses actual source triangle area in metres and UV triangle area in pixels. The report includes chart statistics, area-weighted density quantiles, and the same near-lamp/source-facing priority bucket used by the feasibility study. That bucket is not an occlusion test. Density does not silently alter the transfer result: failing to reach the art target must remain visible in the report and be reviewed before bake authorization. Texel-center raster occupancy and triangles with no covered texel center are separate measurements; neither substitutes for overlap or margin tests.

glTF UVs are read as top-left and converted back to Blender bottom-left in the corners JSON; the existing transfer performs the reverse conversion. The two conversions preserve the temporary export's UVs. A future known-orientation checker render still needs to verify the texture file and runtime `flipY=false` path.

`node validate-uv.mjs --self-test` exercises overlapping, shared-edge and clockwise triangles; cyclic face identity; crossing/parallel/collinear segment distances; position-welded source IDs; exact eight-pixel border/sixteen-pixel chart spacing; deliberately insufficient spacing; and texel-center coverage. These synthetic algorithm checks do not replace the real export audit.

First pit audit (initial Smart Project, 2048 × 1024): all 12,012 source triangles matched, positions exact, zero overlap pairs. FAIL: normal component difference 0.0004150563 (0.03081077 degrees); atlas border zero pixels; minimum inter-chart gap 12.132263 pixels. The 5,509 charts occupied only 1.0631% by summed UV area / 1.0723% by texel-center coverage, and 9,814 triangles contained no texel center. Priority area-equivalent density was 0.7103 texels/metre. This packing must be revised before a useful lighting bake; the low occupancy is not a valid density result for acceptance.

Second pit export (exact-position welding before unwrap, export SHA-256 `2ccc146f15669c45f6f2f18ef408df3a308f8f65862504bad3666f30d3af57d4`) failed identity before any UV conclusion: 35,997 of 36,036 corners had invalid/noninteger source IDs, zero triangles matched, and the accidental remaining integer IDs referred to wrong source positions. The bake agent found the cause: an RNA reference held across edit-mode toggles had become stale and the UV inset had modified `_SOURCE_ID`. The initial suspicion of export domain averaging was superseded by this direct cause. IDs were restored from original loop order and UV references reacquired. A failed identity export cannot be repaired by loosening normal tolerances.

Third pit export (restored IDs, welded zero-margin diagnostic, SHA-256 `6b6fe72e2c89d9723e9e57f5abbb0d583b55801f6cbb16d2c7d2f4b97aeab210`): all 12,012 triangles matched, exact positions, no invalid IDs. The 3,837 charts used 59.8441% summed UV area / 59.8155% raster occupancy. Priority density was 5.3292 texels/metre. Still FAIL: 251 positive-area overlaps, including 176 within a chart, summed 390.5030 pixel²; zero gap/border as expected from this diagnostic; 0.7243967-degree / 0.0125093-component normal drift. Within-chart overlaps must be corrected before packing. Overlap examples in the receipt are ordered by largest area and include source centroid distance and geometric-normal dot product for diagnosis.

## CPU xatlas route

`watlas@1.0.1` is installed only under this study's `tools/` directory using `--ignore-scripts`; the project package manifest and lockfile were not changed. Its package carries the MIT license. `uv-xatlas.mjs` uses its original-vertex references to copy source attributes and validates every returned triangle corner before writing a temporary export. This API behavior is documented in the [official watlas README](https://github.com/toji/watlas). Packing parameters and the distinction between requested and actual atlas dimensions are described by the [upstream xatlas API](https://raw.githubusercontent.com/jpcy/xatlas/master/source/xatlas/xatlas.h).

Final pit command:

```sh
node assets/source/inkstorm/workshop-lighting-round30/uv-xatlas.mjs pit-complex --width 2048 --height 2048 --priority-weight 4 --tag priority4
node assets/source/inkstorm/workshop-lighting-round30/validate-uv.mjs pit-complex assets/source/inkstorm/workshop-lighting-round30/pit-complex-xatlas-2048x2048-priority4-uv-export.glb --width 2048 --height 2048 --padding 8
```

The priority and remaining source-facing buckets are separate temporary packing meshes. A weight of four scales only the priority mesh's temporary parameterization coordinates; final positions/normals/colors remain authoritative. This gives roughly four times the linear density to priority faces relative to ordinary faces, before chart discretization and packing. The final receipt contains actual density rather than assuming the requested ratio.

The earlier weight-two square candidate also passed (priority density 6.0436 texels/metre); its `pit-complex-xatlas-2048x2048.*` receipts/corners remain preserved. A rectangular 2048 × 1024 trial failed padding at 5.0923 pixels and had only 2.8006 priority texels/metre with 2.021× global anisotropy. That experiment does not prove a rectangular atlas is impossible; it demonstrates that squeezing this square pack was not suitable. Packing experiments stopped when the root prioritized the actual pit bake.
