# Current staged candidate: revision 3

No publication or visual/performance acceptance. Root controls integration. `candidate-receipt.json` is authoritative for current hashes/counts; the early `staged-geometry-audit.json` describes the initial draft and is superseded by actual export validation.

The original candidate is preserved in `versions/v1/`. Actual exported ring faces were inward, while the cloth top/bottom were reversed. Revision 2 corrected the ring surfaces and only the wrong cloth surfaces, preserving its outward edges. Matched explicit top/bottom triangle diagonals keep the authored cloth at its intended vertical thickness. The intermediate quad-diagonal diagnosis is preserved in `versions/v2a-quad-diagonal-audit/`.

Six tiny task fixtures add 72 triangles per workshop family. The first district fixture locations were above the awnings, despite correct crossbeam contact. They and their exact source/receipts are preserved in `versions/v2-blocked-fixtures/`. Actual candidate raycasts showed all nine selected engine/bench/aisle paths blocked by opaque cloth.

Revision 3 moves the district fixtures behind the cloth attachment, under the already-supported lower service rails. Exact shared anchors live in `task-light-anchors.json` (SHA256 `2fafc4be49abd590acd62ff3a8c9e4672d6b27d6d929d334d5e5232584f8d8b1`). Their GLB emitter positions are `[-36,8.08,-4]`, `[1,13.08,-8]`, `[41,9.88,-1]`. The three pit emitters remain unchanged. Lighting agent owns the staged shader using this shared contract.

Validated against actual exports:

- `test_frontfaces.mjs`: outward ring surfaces, positive signed volume, visible nearest FrontSide face and open bore; closed outward cloth, exact 84 m³ sampled-shell volume within float tolerance, and correct FrontSide top hit.
- `test_task_fixtures.mjs`: all six complete 1.428 m² emitting undersides match shared planes and downward normals. Bodies intersect real supporting beams; district overlap is approximately 0.046065 m. The district support source is the immutable pre-fixture v1 candidate, which already contains the joined and braced service rails.
- `test_district_light_paths.mjs`: rejected v2 positions have 0/9 clear source-to-work-area paths; final v3 positions have 9/9. These checks cover selected paths; the staged lighting model still has no general local occlusion/shadow computation.
- `merge_candidates.mjs`: zero Khronos validator errors/warnings, exact predecessor POSITION/NORMAL/COLOR_0 and index prefixes after GLB roundtrip, unchanged bounds/hierarchy/material, one primitive/material per family, no UV/texture contract change. Public asset SHAs remain unchanged.

Final candidate totals: pit-complex 12,012 triangles / 890,432 bytes; pit-district 17,494 / 1,337,732; foundry-gantry 6,300 / 438,724. Added delivery is 846,212 bytes, with 35,512 extra triangles if every relevant placement is visible. No additional runtime draws, materials, textures or colliders. District remains six triangles below its 17,500 cap.

Blender's final export created an isolated three-object scene and restored the exact Cruise scene, ViewLayer, active object and selected objects. All 91 pre-existing scene memberships were asserted unchanged. No render or full .blend save was performed.
