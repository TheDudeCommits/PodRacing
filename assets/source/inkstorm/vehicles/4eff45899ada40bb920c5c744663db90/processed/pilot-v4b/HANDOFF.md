# Teemto pilot V4B review candidate

V4B is an isolated candidate for fresh blind and in-world review. V4 scored 6.1/10 and failed. No art acceptance or performance claim is made for V4B. The parent task owns runtime integration and the next critic gate.

## Runtime artifact

- `teemto-pilot-v4b-runtime.glb`
- SHA256: `838d71f3ac2e79dda66ada37ac367fe66f0d9885b166b7fe12829416befcfa6c`
- 5,518,932 bytes; 59,324 triangles in nine primitives and eight materials.
- The pilot uses 15,779 triangles in six primitives with six separate materials: suit 9,359; shell 1,444; accent 188; hardware 1,552; webbing 1,008; rubber 2,228.
- One 2K WebP pilot color atlas, one 1K PNG tangent normal atlas, and one 1K PNG roughness atlas. All use UV0 without transforms. `normalScale=1`; roughness factor 1, varying green channel 64–255, red/blue 255. Five total textures include the two existing body maps.
- All six pilot primitives carry valid authored MikkTSpace `TANGENT` vectors. Body primitives retain their original attributes without tangents. `EXT_texture_webp` is the only extension; no geometry decoder is needed.
- No skins, animation, extras, lights, or cameras are exported.

The native study remains `teemto-pilot-material-v4b-normalized.glb`, SHA256 `da971638d9d810fbfecf5a598c15b5fe4076eb7c7aa40ef149a77de7634b4fc4`.

## Construction changes

Sleeves, jacket, and trousers use an explicit fixed triangle diagonal. Accent shoulder/elbow panels replace actual garment faces rather than overlapping them. Visible seam strips are clipped to each rendered triangle in parameter space and projected barycentrically onto that exact face. This addresses the previous mismatch between bilinear quad sampling and rendered triangulation.

The collar is a compact rounded stand seal. The cuff transition fades the forearm crease before the overlap, and the floating cuff closure ribbon is removed. The suit retains directional compression around shoulders, elbows, waist, and wrists, with calmer grain. Small floating helmet wear tubes and hidden garment seam geometry were removed to keep the pilot below 16,000 triangles.

The driver remains static. Raw source anchors remain pelvis `[0,-0.130,-0.205]`, helmet center `[0,-0.160,0.143]`, inherited hand references `[-0.122,0.103,-0.071]` / `[0.122,0.103,-0.071]`, and grip centers `[-0.145,0.153,-0.096]` / `[0.130,0.153,-0.096]`. Glove contact and garment readability still need visual acceptance.

## Exact preservation and validation

`runtime-validation.json` decodes every indexed triangle corner in the current public `teemto-hero.glb` and the V4B runtime. Every hierarchy transform is asserted to be identity, so decoded vectors are world-space vectors. All 43,545 licensed body triangles compare in their original order with **zero absolute error** for positions, normals, and UVs. Cockpit: 19,965; left engine: 11,790; right engine: 11,790. This proves the same runtime world basis and body placement, not just equal bounds. Seat, controls, and licensed hoses are included in the unchanged body.

Only six body/group names changed from native Blender suffixes to the public contract: `teemto-cockpit-body`, `teemto-cockpit.001`, `teemto-engine-left-body`, `teemto-engine-left.001`, `teemto-engine-right-body`, `teemto-engine-right.001`. All six pilot mesh node names begin `teemto-pilot-`.

All 15,779 pilot triangles also compare exactly, including normals and UVs, between native export and runtime packaging. Tangent discontinuities may split vertices without altering triangles. A generic tangent CLI was rejected because it touched unmapped body geometry. The final generator works only on pilot primitives and keys each output vertex by its original index plus tangent, preventing position welding.

Twelve tiny rubber triangle corners required a stable perpendicular tangent fallback after MikkTSpace returned a zero vector. `tangent-zero-audit.json` records UV determinants around `0.9e-10`–`1.8e-10` and triangle areas around `3.2e-10`–`1.7e-9` at these corners. No geometry or normals were changed for this fallback.

Khronos glTF Validator reports **0 errors, 0 warnings**, and two informational notices for the existing 1254×1254 body images. `embedded-texture-validation.json` verifies the actual embedded image sizes and channel ranges. Python compilation, JavaScript syntax checking, and `git diff --check` passed.

All four old public vehicle GLB hashes are unchanged, recorded in `runtime-validation.json`. All 20 pre-existing V4 artifacts are unchanged against `v4-before-receipt.json`. This subtask did not modify runtime source, public assets, or dist.

## Review images and Blender state

The `review/` directory contains matching 1400×1000 side, front-quarter, and full views for V4B, plus byte-for-byte copies of the three V4 before views. `image-receipts.json` records their hashes. These are Blender study renders; they do not prove in-world shader behavior or frame rate.

Construction scene: `PodRacing — Teemto pilot construction v4b final`.
Material scene: `PodRacing — Teemto pilot material v4b`.
Export scene: `PodRacing — Teemto pilot material v4b normalized`.

`blender-mcp-receipts.json` contains construction, material setup, bake, all three views, and native export receipts. Each call restored the exact saved scene, view layer, active object, and selected-object set in `finally`: scene `Cruise — Going Merry source 4b2cb678`, layer `ViewLayer`, active `Sketchfab_model.001`, 15 selected. The unrelated source scene has 17 objects. No full `.blend` was saved, no unrelated scene was modified, and no credentials or configuration were copied.

Blender and GPU were released before CPU packaging. No further Blender render or bake is pending.

## Reproduction sources

- `scripts/blender/inkstorm-pilot-v4b.py`: isolated construction through Blender MCP.
- `scripts/blender/inkstorm-pilot-v4b-material.py`: separate `setup`, `bake`, `preview-side`, `preview-front`, `preview-full`, and `export` actions through Blender MCP. Pass literal source, not dynamic `exec` wrappers, and coordinate GPU ownership before baking/rendering.
- `scripts/blender/inkstorm-pilot-v4b-package.py`: exact node contract and texture packaging; invokes the pilot-only tangent generator.
- `scripts/blender/inkstorm-pilot-v4b-tangents.mjs`: MikkTSpace tangent generation without body edits or welding.
- `scripts/blender/inkstorm-pilot-v4b-validate.py`: decoded exact geometry, material contract, and preservation audit.

Use the supplied exact user goal in the Blender MCP `user_prompt`. Source files intentionally refuse to replace an existing named Blender study.
