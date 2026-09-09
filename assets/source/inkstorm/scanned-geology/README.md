# Scanned sandstone production experiment

7 September 2026. **Boulder variant 1 is integrated locally** as `public/assets/inkstorm/canyon-buttress.glb` and `canyon-buttress-lod.glb` after root review of the neutral comparison. Variant 2 stays staged. The earlier open-cliff assemblies are rejected experiments. This is asset-level acceptance only: actual game screenshots, blind critique and frame-rate acceptance remain the integrated game's next gate.

The final measured volume removes the earlier fabricated crown, regular horizontal shelves and thin seam strips. The source's irregular fractures continue around its crown and sides. The same single measured rock underlies both orientations, so these are two variants, not two independent scans. Vertex-only paint deliberately removes photographic microdetail. Repeating this silhouette throughout a course may still need more source variation.

## Current deliverables

| File | Purpose | Triangles | Bytes |
|---|---|---:|---:|
| `boulder-1-high.glb` | Published broad cliff; upright rock with slight lean | 28,000 | 1,291,464 |
| `boulder-1-lod.glb` | Published distant version | 4,200 | 247,284 |
| `boulder-2-high.glb` | Staged alternate long-axis wedge | 28,000 | 1,288,656 |
| `boulder-2-lod.glb` | Staged wedge LOD | 4,200 | 242,604 |

All four final GLBs have one mesh, primitive and material, no textures, finite position/color/normal data and unit normals. Every actual mesh shares exact glTF bounds **X[-40,40], Y[0,120], Z[-50,50]**. Every high and LOD is a single connected closed manifold component with zero boundary edges, non-manifold edges, inconsistent edge winding or degenerate triangles. Both Blender pre-export checks and an independent welded export-roundtrip topology check passed. Khronos glTF Validator reports zero errors, warnings, infos and hints for all four files.

`boulder-candidate-receipt.json` records exact hashes, topology, source, authoring and render settings. `public-geology-receipt.json` records publication, outgoing hashes, all 20 current public asset hashes and all 17 public GLB validations. The other 18 public files were unchanged during publication. Exact outgoing broad high/LOD bytes and the preceding publisher/receipt are preserved in `history-pre-scan-buttress/`. Existing round-13/14 archives remain untouched.

Neutral Blender renders: `boulder-1-preview.png`, `boulder-2-preview.png`, `boulder-1-lod-preview.png`, `boulder-2-lod-preview.png` and `procedural-boulder-comparison-preview.png`. All five use the same camera, orthographic framing and sun/fill lighting. `boulder-source-preview.png` shows the original textured source at its natural proportions, with automatic source framing. These are actual Blender renders, not generated concept images or game screenshots.

Variant 1 retains a low pointed basal corner. Assess planting approximately the bottom 10–15% into terrain if the first game capture exposes a floating edge. No placement, family, collision, renderer or gameplay code was changed by this publication. The 28k/4.2k budgets are **3.5× / 2.34×** the former 7,990/1,798 triangle broad pair. Existing LOD selection is unchanged. No new FPS claim is made.

## Verified source and license

The following assets are officially licensed **CC0**. Original file URLs are resolved from each public files manifest, never guessed. Downloads use the identifying user agent recorded in each receipt, and every original byte count and provider MD5 is verified before use. SHA-256 hashes additionally identify files and manifests. `originals/*-1k-original-files.zip` are deterministic local packages of unchanged downloads, **not official provider ZIP archives**.

| Source | Author | Downloaded glTF triangles | Receipt |
|---|---|---:|---|
| [Boulder 01](https://polyhaven.com/a/boulder_01) | Rico Cilliers | 66,122 | `boulder-source-download-receipt.json` |
| [Rock Face 01](https://polyhaven.com/a/rock_face_01) | Dario Barresi | 20,174 | `source-download-receipt.json` |
| [Rock Face 02](https://polyhaven.com/a/rock_face_02) | Dario Barresi; processing Rico Cilliers | 29,566 | `source-download-receipt.json` |

[Poly Haven's official license](https://polyhaven.com/license) permits use, modification and redistribution, including commercial use. The original downloaded glTF files validate with zero errors and one original tangent-space warning each: their normal maps require runtime-generated tangent space. Original bytes remain unchanged; the final vertex-only exports no longer use those maps and have zero warnings. The model page's 124K boulder count differs from the actual downloaded 66,122-triangle glTF; the latter is the measured source used here.

All three sources total **15 original files / 12,350,360 bytes**, plus manifest metadata. No Sketchfab vehicle was downloaded by this experiment and this work does not resolve the separately recorded Sketchfab download authorization blocker.

## Reproduction

The Node tools use an isolated existing dependency directory `/tmp/inkstorm-rock-lod-tools` with glTF Transform 4.5.0, meshoptimizer 1.2.0 and glTF Validator 2.0.0-dev.3.10. Pillow is run through `uv --with pillow`, without adding a project runtime dependency.

1. `download_boulder.py` reads `boulder_01-files-manifest.json`, downloads only its explicit 1k glTF dependency set and preserves/validates originals.
2. `prepare_boulder.mjs --extract` writes source UV coordinates. `bake_boulder_colors.py` bilinearly samples original diffuse luminance and ARM ambient occlusion into a restricted coral/ochre/cream/cool-shadow palette; it discards source chroma and does not edit a raster image. `prepare_boulder.mjs` writes a vertex-painted source GLB without photograph textures.
3. Supply the literal contents of `import_boulder.py`, then `build_boulder_candidates.py`, to Blender MCP. Import and topology inspect the original first. Only duplicate meshes in **Inkstorm Scanned Geology Lab** are transformed and decimated; unrelated scene objects remain intact. The complete source is closed before transformation, so no fabricated closure, Boolean or overlapping patch construction is needed.
4. `node assets/source/inkstorm/scanned-geology/validate_boulder_candidates.mjs` optimizes all four staged GLBs and asserts geometry, budgets, exact bounds, topology and glTF contracts.
5. Supply literal `render_boulder_candidates.py` through Blender MCP to render the five comparisons while restoring the previously active scene and settings afterward.
6. `node assets/source/inkstorm/scanned-geology/publish_scanned_geology.mjs --check` verifies current published hashes and validates every public Inkstorm GLB. Omitting `--check` publishes the reviewed fixed variant-1 hashes after preserving exact outgoing bytes.

The historical `publish_mixed_geology.mjs` now requires `--restore-round15` for its intentional old-byte rollback. Its `--check` remains a historical-byte check, not the current publisher check.

## Rejected stages and session preservation

`candidate-*` and `build_closed_masses.py` preserve the first curved scan-face/backing experiment. Its high meshes are closed, but the crown/flanks look manufactured. Its meshoptimizer LODs passed glTF validation yet Blender roundtrip exposed small collapsed microfaces: candidate 1 had 2 boundary / 3 non-manifold edges; candidate 2 had 7 / 16. **Do not publish those LODs.** Their geometric validation was superseded by the stronger topology checks in the final boulder pipeline.

`dressed-*` and `dress_scanned_crowns.py` preserve the 31,198-triangle crown/flank dressing experiment. Root requested opaque overlapping scan modules as an alternative to costly Boolean union. The resulting assembly still reads as torn layers on a cylinder and was rejected for public use. The individual scan patches are open sheets overlapping an opaque core; the joined assembly is not a watertight solid union. Earlier rejected flat/smooth closure versions remain in `rejected-extruded-slabs/` and `rejected-smooth-wrap/`.

`abandoned_combined_build_candidates.py` is a failed first combined build and must not be rerun. The independent background bpy host exited during that attempt; the exact failure cause is unproven. It was safely restarted with the same existing official bpy 5.2 integration configuration. The existing saved quarry project was reloaded without overwriting it. That saved scene contains 166 editable objects and precedes the previous unsaved seven-object batch reduction, so this was recovery of the saved editable state, not a claim of exact unsaved-state recovery. No native Blender app was closed or opened.

Subsequent Blender operations restore the prior active quarry scene and only add owned lab objects. Checkpoint `.blend` files are local session-recovery copies that also contain the unrelated pre-existing quarry data; they are **not game asset delivery or intended repository publication**. Preserve them locally for recovery. Only the task-owned scripts, receipts, source downloads, GLBs and review renders belong to this asset handoff. No browser was opened, no build/performance run was started, and no commit or deployment was made by this asset task.
