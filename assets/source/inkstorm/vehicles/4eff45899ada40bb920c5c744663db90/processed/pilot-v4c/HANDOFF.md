# Teemto V4C suit material candidate

V4C lifts the suit's blue-gray midtone while preserving V4B's exact mesh, pose and maps other than color. It is ready for fresh in-world review, not accepted art or performance evidence. The prior runtime critic preferred matte B at 6.3/10 over A at 6.0/10; neither reached 8/10.

## Artifact

- `teemto-pilot-v4c-runtime.glb`
- SHA256 `f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1`
- 6,774,412 bytes; 59,324 total triangles; 15,779 pilot triangles; nine primitives, eight materials, five textures.
- Six pilot material names are `Pilot atlas v4c runtime accent`, `hardware`, `rubber`, `shell`, `suit`, and `webbing`.
- All node names, world transforms, and body/group/attachment contracts are unchanged from V4B.

The public files, runtime source, manifest, root docs and V4B source artifacts were not changed by this subtask.

## Color-only authoring

The Blender study is `PodRacing — Teemto pilot material v4c`. It copies the baked V4B meshes and UVs without projection or geometry edits, restores original suit color/wear attributes from the construction source, then remaps nine suit color classes. The principal linear color changes from `(0.017,0.025,0.033)` to `(0.065,0.095,0.130)`. Dark seam and collar values are lifted separately; narrow topstitch color and wear are restrained cool gray. Fine textile modulation is retained. Gloves, webbing, orange accents, shell and hardware keep their existing authored treatment.

Only the suit object is baked into a byte-for-byte file copy of the V4B PNG atlas. No raster reference or output is painted or filtered programmatically. The existing tangent normal and roughness atlases are reused without baking or re-encoding. The new shared color atlas is encoded as lossless WebP during GLB packaging; its decoded pixels exactly equal Blender's PNG output. This lossless color encoding accounts for the file-size increase from V4B.

`color-bake-coverage.json` rasterizes triangle UV coverage only for measurement. All sampled non-suit surface texel centers are byte-identical between the two source PNG atlases: accent 25,777; hardware 49,615; rubber 245,687; shell 159,429; webbing 53,502. Suit mean sRGB bytes rise from approximately `(36.45,41.02,44.78)` to `(63.45,76.32,88.69)` over 958,577 covered texels. This is a source-atlas comparison; V4B's previous lossy WebP may have small decoding differences from its source PNG.

## Validation

`runtime-validation.json` establishes exact equality of every index and every POSITION, NORMAL, TEXCOORD_0 and TANGENT array to V4B, including all nine primitives. Nodes and transforms are identical. Material parameters are unchanged except the six names, and the color texture payload changes. Both body texture payloads and both pilot normal/roughness payloads remain byte-identical. All 43,545 body triangles also have zero world-space position/normal/UV error against the original public V1 hero.

`gltf-validator-runtime.json` reports **0 errors, 0 warnings**, with only the two historical body NPOT image infos. All 29 files in the V4B/public preservation snapshot retain their hashes. Python syntax compilation and `git diff --check` pass. No current frame-rate or in-world material acceptance is claimed.

## Review and context

`review/` contains the same side/front-quarter/full 1400×1000 source cameras as V4B, plus exact before-image copies. These source views expose the lifted blue-gray suit and darker gloves/harness. They do not establish the result under the runtime's per-material Cel responses. Image hashes are in `image-receipts.json`.

Blender receipts are preserved in `blender-mcp-receipts.json`, including two initial image-buffer failures. The final workflow loads an existing copied PNG as the writable bake target; the successful suit bake and all three source renders followed. The shared Cruise scene was restored exactly: `Cruise — Going Merry source 4b2cb678`, `ViewLayer`, active `Sketchfab_model.001`, the exact 15 selected objects, 17 objects unchanged. No unrelated scene was edited, no full `.blend` saved, and no configuration or credentials copied. Blender/GPU are released; no render or bake remains pending.

Reproduction sources: `scripts/blender/inkstorm-pilot-v4c-material.py`, `inkstorm-pilot-v4c-package.py`, and `inkstorm-pilot-v4c-validate.py`. Copy the unedited V4B color PNG to the new V4C target path before the Blender setup action. Send literal source through Blender MCP with the exact user's original prompt; coordinate GPU ownership before baking/rendering.
