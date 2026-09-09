# Ivory palette copy V1 — executed source trial

A new **164th scene** now holds the Ivory variant's first actual palette copy. It has **57 objects, 53 meshes, 44,028 triangles and 9 new shared role materials**. Both matched driver and fullcraft previews were rendered and individually inspected. This is a source material trial: **artAccepted=false, runtimeReady=false**. No atlas, normalization, export, registry or public asset was created, and the shared `.blend` was never saved.

The actual Blender 5.2 calls preserved all 163 preexisting scenes and collections, the Going Merry window/view layer/active object/selection, all four original Ivory histories, and every original material. Each copied mesh retains its exact vertices, edges, ordered polygon corners, smooth flags, UV values, preexisting non-material attribute values, raw custom corner normals, hierarchy and local/world transforms. The only mesh additions are two explicit FACE attributes (`ivorySourcePolygon`, `ivoryPaintRole`) and new material-slot assignments. All original attributes remain on the histories. The new mount faces carry source index −1, with their exact fitted polygon order and own-profile authoring lineage retained; they are not falsely attributed to original GLB faces.

The source is `e42fb924b344481ea013c58cb0f52ad7` by **20001748**, under the preserved **CC BY 4.0** metadata. The immutable original GLB remains SHA256 `2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576`. The fit authority is [01-control-fit-executed-receipt.json](../control-fit-preparation-v1/01-control-fit-executed-receipt.json), SHA256 `1a923c7e156a1f3f440ab46c49690db6e4cc36db3dbb9cd72f974aaa5db49d8e`.

## Own surface roles

External analysis welded equal coordinates only in an analysis copy. Each existing engine resolves into 34 components: ten fan blades (80 triangles), separate nose/shaft/hub surfaces (560), casing and existing ring bands. The dark intake/throat role covers 320 further faces per engine; the orange front chamfer is a complete existing 40-face ring; rear metal is 120 faces. The Blender meshes were never welded, cut or regenerated. The executed own-source ordered position bridge and unchanged fitted mesh signatures bind these face indices to this variant. This does not borrow Colour's polygon or normal arrays.

The existing long rails and transverse beam are navy. The existing cockpit walls are navy, large discs and deck/backrest slopes are warm ivory, and seat hardware, controls, support profiles and engine-top accessories are petrol. In the common `lambert1` container, **700 body faces remain ivory** while the exact own retained pilot masks are **2,508 slate suit, 740 titanium helmet, 200 amber visor and 680 tan gloves**. The common container is still a single unchanged mesh; it was not misclassified wholly as pilot.

All 44,028 faces are accounted for: ivory 18,616; navy 13,888; petrol 5,396; orange 80; intake 800; titanium 1,860 (740 pilot + 1,120 engine); slate 2,508; amber 200; tan 680. [operation-inputs.json](operation-inputs.json) pins exact masks, color/roughness/metallic values and source references. There is no face-random noise or generic texture overpainting.

## Actual matched previews and remaining limits

- [Driver](ivory-palette-v1-driver.png): original pilot, glove/control contacts and source shapes remain visible. Titanium/slate/tan roles distinguish the pilot from the navy cockpit. The broad amber visor is still dark and visually plain.
- [Fullcraft](ivory-palette-v1-fullcraft.png): the ivory engine shells/discs now separate clearly from the navy frame. Intakes remain open, with metallic nose cones and dark original fan blades. Orange is currently a thin front ring and does not yet provide the stronger graphic accents of concept 14.

Both views reuse the **exact actual fitted neutral camera transforms and orthographic scale**, same 768×576 resolution, CPU Cycles 16 samples/seed 3401, same two white area lights and neutral world, and Standard/None exposure 0/gamma 1. Thus lighting does not supply the contrast of concept 14's warm staged scene. The palette is still flat and clean: no wear, contact bake, polished visor highlight, final atlas or game-lighting validation exists. Dark seams/notches on some disc edges remain visible as in the preserved source lineage; this stage performs no geometry or normal repair. Positive preservation checks establish source fidelity, not final material quality.

The first bounded follow-up is to review these two actual views, then develop source-owned worn-paint/contact and limited orange markings on an additional copy if requested. Any later body/pilot consolidation must separate the 700 body faces correctly, preserve effective mirrored parity and corner normals, and author usable copied UVs before baking. This stage deliberately stops before that later work.

## Evidence

[Author receipt](02-author-executed-receipt.json) SHA256 `20c2dc9853f8d75a0cd1a7686183e7075de414a6793bebacfda21e907d35261a`; executed author payload [02-author-composed.py](02-author-composed.py) SHA256 `171cfb4a0356010d9ca1ec2fa58478812b89335426f6aeb548bfb1e199f1fcea` (169,575 UTF-8 bytes). Authoring took about 26 seconds. The pinned original user prompt was used verbatim on every MCP invocation.

[Driver render receipt](03-render-driver-receipt.json) and [fullcraft render receipt](03-render-fullcraft-receipt.json) both passed: all 164 scene/context/ID sets restored, source/fit/paint structure/material/UV/normal/role/lineage checks exact, temporary objects/lights/cameras/world removed, empty Render Result state restored. Each render call took about 21 seconds. Render CPU/GPU was explicitly released to the parent immediately afterward.

See [REVIEW_COMPLETE.json](REVIEW_COMPLETE.json) and [inventory.json](inventory.json) for actual paths and byte hashes. This was implementation-aware source review, not a fresh blind critic.
