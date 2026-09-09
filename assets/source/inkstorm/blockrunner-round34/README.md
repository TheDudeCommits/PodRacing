# Blockrunner source inspection scripts — staged, not executed

Prepared 2026-09-08 using the web 3D asset pipeline skill. This folder contains scripts only. No Blender call, render, source scene edit, import/export, runtime/public edit or shared `.blend` save was made by preparation. Source GLB/receipts were read to construct the reference literal, and the GLB SHA was rechecked. The colour source retains its existing driver; source anatomy, seat/exhaust anchors, runtime normalization and gameplay acceptance remain open.

Run through the existing official Blender MCP connection only after root releases the shared Blender critical path. Keep the user's original prompt verbatim in MCP `user_prompt`. Read each result before the next stage. Do not execute two stages concurrently, call unrelated scene tools while a stage is running, or use the generated concept's rear inset to infer geometry.

## Stage 1: audit the exact existing source

Concatenate, in order, `00-source-reference.py`, `01-source-guard.py`, `02-audit-existing-source.py` into one MCP code payload. The first two fragments only define data/functions. The audit temporarily selects the exact source scene for dependency-graph evaluation and restores the previous scene/view layer; it never changes frame, selection, source geometry, materials or memberships.

Required source scene: `PodRacing — source a6f14ae799ab40d7ac425f043f824ff8 retry 20260908`. Guard pins all 268 names/parents/types by an exact hierarchy hash, all 59 named mesh bounds/triangle counts/material slots against the preserved GLB, source frame 1, no unexpected modifiers/constraints/animations/collection instances, and the shared session's minimum 139 scenes. Missing/drifted source stops the script without importing a substitute. The exact scene count remains dynamic; all preexisting scene/collection memberships are compared on exit, including Cruise and other isolated studies.

The reference GLB is `assets/source/inkstorm/vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb`, SHA-256 `1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e`. Complete source paths and metadata/download receipt hashes are in the reference literal. Source binary traversal found 59 mesh-node occurrences and 48,384 triangles; **that is header/binary reference evidence, not the not-yet-run live Blender occurrence audit**.

Capture the JSON between `BLOCKRUNNER_RECEIPT_BEGIN` / `BLOCKRUNNER_RECEIPT_END` to a new receipt file outside Blender. Require `status: measured`, `sourcePreservation: true`, no changed existing scenes/collections and restored context. It reports every named object/parent/local/world matrix and evaluated mesh topology, per-component bounds (without welding), unique-mesh versus actual scene-occurrence triangle totals, original node-based material palette and same-session source signatures. The guard does not claim full byte identity between live Blender meshes and the GLB.

There are no semantic pilot/seat names. Geometry plus the two existing source views nominate `pasted__LegoTri36_lambert1_0` as the central driver candidate, two named `brick230` meshes as controls, and the paired named `L4x8F` meshes as floor candidates. These remain unconfirmed roles in the receipt; do not assign pilot mesh prefixes or final anchors before inspecting the close view and topology. The importer already applied scale 2.329579 to a 12 m target; do not apply it again.

## Stage 2: one neutral PNG per call

After reviewing the audit, concatenate `00-source-reference.py` + `01-source-guard.py`, inject the successful audit as `BLOCKRUNNER_AUDIT` (a Python literal), inject a view and new token, then append `03-render-neutral-view.py`:

```python
BLOCKRUNNER_AUDIT = {...}  # Actual complete successful stage-1 receipt.
BLOCKRUNNER_VIEW = 'fullcraft'  # Then 'front', 'rear', 'driver' in separate calls.
BLOCKRUNNER_RENDER_TOKEN = '20260908-reviewed-unique-suffix'
```

Before each call, root must check that `assets/source/inkstorm/blockrunner-round34/source-<view>-<token>.png` does not exist. Use a fresh token on every retry; do not overwrite existing results. The render script intentionally does no filesystem reads or writes other than Blender's targeted PNG render. Capture its printed receipt alongside its PNG after each call, and inspect each PNG individually before drawing geometry conclusions.

Each call compares the current source signature to the reviewed audit, creates one temporary scene with separate copies of each mesh and material, renders one 1280×960 CPU Cycles PNG, removes only its own scene/objects/meshes/materials/lights/camera/world, and verifies source/context/membership preservation. No original object is linked into the temporary scene. Original hierarchy is represented by the copied world matrices, with no transform application or repaint. White key/fill lights, a grey world and Standard/None/exposure-0/gamma-1 color management give a neutral inspection baseline; this is not a stylized treatment or final perceptual acceptance. Blender's normal Render Result buffer receives the rendered image.

`fullcraft` is a full quarter view; `front` and `rear` fit the complete craft from intake and exhaust directions; `driver` fits the actual bounds of the named driver/control candidates while retaining all surrounding craft geometry for occlusion/fit judgment. The camera direction follows source engine geometry at negative Y. Every crop records exact source object names, target bounds and camera coordinates; no gameplay anchor is invented. Run at most one view while coordinating the shared Blender connection.

The supplemental concept at `docs/inkstorm-overhaul/concepts/12-blockrunner-round34.png` is a later styling/readability target. Its generated rear inset may compress perspective or invent throat details; it must not change the original geometry or supply exhaust anchors. The prepared scripts do not load it.

After source inspection, the next authored derivative can preserve the minifigure, normalize root/scale, measure seat/exhaust anchors, and merge a mapped vertex palette on copied geometry/materials. This script set performs none of those authoring operations.
