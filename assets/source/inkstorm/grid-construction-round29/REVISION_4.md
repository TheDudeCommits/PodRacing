# Current staged candidate: revision 4

Cloth-only correction following `BLIND_WORKSHOP_GEOMETRY_ROUND29.md`. Ready for root-controlled actual-game comparison; not published and not visually or performance accepted. Complete revision 3 source, overlays, candidates, predecessors and receipts are preserved in `versions/v3-thick-cloth/`. Current authoritative hashes and budgets are in `candidate-receipt.json`.

The pit canopy now has a 3 cm shell instead of 25 cm, restores its original two-column cream end repair, and uses its own blue/orange/cream color at 68% intensity on the underside. District original cream repair columns and restrained worn front panels are restored similarly. All new stitched seams have 8 mm radius instead of 55 mm. The pit front hem is a 10 mm textile roll instead of 95 mm steel trim. The duplicate district front trim is removed; the preserved predecessor already has its fine hem. No equipment, fixtures, service rails, gantry or light anchors moved or changed color.

The unchanged original district cloth contains both possible diagonals of every nonplanar quad because its opposite faces were independently triangulated. A uniform parallel 3 cm overlay would intersect that existing geometry. The new outer skins follow the upper/lower original diagonal envelopes with a 15 mm vertical margin on each side. The perimeter remains 3 cm, while maximum thickness inside a few original warped cells is 19.5–20.3 cm. Volume tests explicitly account for this original fold envelope; this is not an assertion of uniform 3 cm district cloth. Pit cloth is uniformly 3 cm.

Actual export checks passed:

- `test_cloth_revision4.mjs`: all seven shells have closed directed edges, positive expected signed volumes, outward surface normals, restored repair colors and bounded colored undersides. 6,336 sampled predecessor points were checked against actual upper/lower FrontSide triangles (12,672 rays); the minimum vertical margin is 14.999 mm within float tolerance.
- Exact indexed triangle POSITION/NORMAL/COLOR_0 values remain unchanged for all 3,792 pit equipment/fixture triangles, 1,536 district equipment/rail/fixture triangles, and all 1,806 gantry overlay triangles. The merged gantry candidate remains byte-identical to revision 3.
- `test_frontfaces.mjs`: ring open-bore/frontface and signed-volume checks remain passing; the left pit shell volume is 10.080019 m³ against expected 10.08 m³.
- `test_task_fixtures.mjs`: all six emitter planes, lens areas, downward normals and actual support contacts still pass. `task-light-anchors.json` is byte-identical, SHA256 `2fafc4be49abd590acd62ff3a8c9e4672d6b27d6d929d334d5e5232584f8d8b1`.
- `test_district_light_paths.mjs`: all nine corrected emitter-to-engine/bench/aisle paths remain clear against the final candidate. These selected rays do not establish general shadowing or exhaustive receiver visibility.
- Packaging: all original predecessor attribute bytes and indices retained as exact prefixes after final GLB roundtrip, unchanged bounds/hierarchy/materials, one mesh/primitive/material per family, zero textures, unchanged no-UV contract, zero Khronos validator errors/warnings.
- Source AST comparison confirms only `cloth_shell` changed behavior; `export_overlay` only changes new object/material labels from v3 to v4. Python/JS syntax and `git diff --check` pass.

| Candidate | Triangles | Bytes | SHA256 |
| --- | ---: | ---: | --- |
| pit-complex | 12,012 | 897,776 | `ea94400e38bf6cf5998f84cbd2cffd342054760e17c43c0f4b75ac636212d1dc` |
| pit-district | 17,110 | 1,324,124 | `607ea30cc7563a0c07da20a21b25135055a7736adcc34527c057fa6216fba091` |
| foundry-gantry | 6,300 | 438,724 | `3d0cd999daf52b82ac0232c7316a5e4072c80bd83982f83cbaf4a1dcde11e862` |

Added delivery versus original predecessors is 839,948 bytes; all-placement added triangles are 33,976, with no added draws, materials, textures or colliders. District is now 390 triangles under its 17,500 cap.

The export-only Blender MCP call created three source meshes in `Inkstorm Grid Construction Round29 v4 thin repaired cloth`. All 92 pre-existing scene memberships were preserved; the Cruise / Going Merry scene, ViewLayer, active `Sketchfab_model.001`, and exact 15-object selection were restored. No rendering, full .blend save, downloads, browser, runtime source edits or public asset writes occurred. Blender was explicitly released to root after the export. Runtime SHA256 values captured in `revision4-before-public.json` still match at handoff.
