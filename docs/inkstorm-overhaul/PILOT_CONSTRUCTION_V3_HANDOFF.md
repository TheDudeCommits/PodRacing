# Inkstorm pilot construction V3 — isolated review candidate

Status: **ready for fresh blind visual review; not approved for public/runtime replacement**. This is a static Teemto seat study. Its renders and validation do not establish in-world acceptance, performance, collision correctness, or other-vehicle driver fit.

The candidate replaces the former separate tube sleeves with continuous bent garment surfaces. Localized signed crease fields shape the shoulder, elbow and wrist; torso folds shape the seated waist. Trouser legs continue through the knee. Reinforcement color shares the cloth mesh, surface-following felled seams carry small broken topstitch geometry, and the orange sleeve patches share the garment lattice. Harness webbing and flexible neck/cuff/glove parts have separate matte materials. Helmet and grasp geometry retain the v2 construction.

The first V3B draft had patch clipping and weak crease visibility; its source, atlas, and three renders remain under `processed/pilot-v3/draft-v3b/`. The corrected final scene is **PodRacing — Teemto pilot construction v3c**, with its baked review copy **PodRacing — Teemto pilot material v3c**. The discarded initial over-budget scene remains isolated as **PodRacing — Teemto pilot construction v3**; no source scene was removed or overwritten.

## Review images

All three are real Blender CPU Cycles renders, 1400×1000, 32 samples, using the same side/front/full camera positions as V2C:

- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-side-v3.png`
- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-front-quarter-v3.png`
- `assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/review/teemto-pilot-full-v3.png`

The reference is `docs/inkstorm-overhaul/concepts/vehicles/teemto-inkstorm.png`; the construction/material guide is `docs/inkstorm-overhaul/concepts/vehicles/pilot-material-guide.png`. These references informed the work and are not passed off as render evidence.

## Artifact contract

The asset directory below is abbreviated as `pilot-v3/`:

`assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/`

- `teemto-pilot-material-v3-normalized.glb`: native GLB, 10,117,208 bytes; no decoder or texture extension required.
- `teemto-pilot-v3-candidate.glb`: optimized GLB with three embedded WebP images; `EXT_texture_webp` required. No mesh decoder required. See `artifact-receipts.json` for the exact size and hash.
- `pilot-color-atlas-v3.png`: one 2048×2048 color atlas for all six pilot batches. No normal or roughness texture.
- `artifact-receipts.json`: GLB structure, mesh triangle counts, and SHA-256 hashes for final GLBs, atlas, source, and review images.
- `blender-mcp-receipts.json`: actual construction, setup, bake, render, preservation, export and context results.
- `teemto-pilot-*-validation.json`: Khronos glTF validator results.
- `v2c-preservation-receipt.json`: all seven recorded V2C artifacts match their prior SHA-256 hashes.

Pilot geometry totals **15,648 triangles** in six meshes/material batches: suit 9,188; shell 1,540; accent 252; hardware 1,552; webbing 1,008; rubber 2,108. The unchanged body contributes 43,545 triangles, so the assembled candidate totals **59,193 triangles**, nine mesh primitives and eight materials. The native and optimized exports preserve the same triangle counts and hierarchy.

The normalization is the existing 2.5 scale and 12.742-degree pitch around the same seat basis. Exported transforms are normalized; no skins, animation, extras, cameras or lights are present. All materials are opaque. No collider or LOD was authored in this bounded pilot study.

## Preservation and validation

A Blender comparison checked all 71 source body meshes against the construction copies. Maximum vertex error was **0**; polygon topology and material-slot identities were equal. This includes the actual seat, control grips and licensed hoses. Pelvis `[0,-0.130,-0.205]`, helmet center `[0,-0.160,0.143]`, inherited hand pose references and actual grip centers were retained. V2C source/export/atlas/renders remained byte-identical to their previous receipts.

Both final GLBs pass the Khronos validator with **zero errors and zero warnings**. Each has two informational notices for the unchanged 1254×1254 body paint images. Packaging used glTF Transform CLI 4.4.2 with deduplication, pruning and WebP compression; geometry compression, simplification, welding, flattening, joining, instancing and palette consolidation were disabled. Disabling welding preserves the original body vertex domains and avoids introducing degenerate body triangles.

Python compilation and `git diff --check` pass. Runtime files, public assets and dist were outside this task's ownership and were not changed by this work. No browser was opened by this subtask.

Every successful Blender mutation/bake/render/export restored **Cruise — Going Merry source 4b2cb678 / ViewLayer / Sketchfab_model.001**, the exact selected set of 15 objects, and its original 17-object count. State was held in ordinary local variables and restored in `finally`. No full `.blend` was saved, no unrelated scene properties or credentials were inspected or exported, and no namespace, handler, timer or temporary configuration was used. Blender/GPU work has been released to the parent task.

## Remaining acceptance

The author has inspected all three final images but does not assign an acceptance score. Fresh blind review must determine whether the changed cloth construction is sufficient. The simplified helmet, sparse fine fabric response, inherited dominant cockpit hoses and limited visible lap area remain relevant visual questions. In-world screenshots and the 40–60 FPS requirement remain untested for this candidate. Do not replace a public pilot asset from these study renders alone.
