# Current geometry publication revision — 10 September 2026

This note supersedes **current-source metrics only** from [HANDOFF.md](HANDOFF.md) and [HANDOFF.json](HANDOFF.json). Those files remain byte-for-byte historical records of the rejected first pass (48,624 triangles, approximately 210 m sampled corridor clearance). Their source hashes, shadow-risk discussion and pending-review status must not be presented as the present implementation.

The revised source moves all six ranges farther away and lowers their relief. Its grid is **192 × 22**, with unequal coherent ridgelines. The current CPU-generated result is **58,392 triangles total**, divided into **three merged meshes of 19,464 triangles** (two ranges per mesh). These are geometry counts, not measured frame draw calls or a performance result.

Current `src/render/saltDusk/SaltDuskScenery.ts`: **7,636 bytes**, SHA-256 `493aec6e86cefec66f41d05c93a984896a61cc27a05e1f4386458847f3f25c98`.

| Source course seed | Minimum sampled corridor gap |
| --- | ---: |
| Canonical `0x494e4b53` / 1229867859 | 1,259.993026 m |
| Expedition 87223 | 1,260.000000 m |

The fresh check loaded the actual current source, used 8,192 main-route samples plus current branch arrays, and measured XZ distance to every complete oriented range footprint minus the corresponding source route width. It used a flat height callback only for horizontal placement/counts. It does **not** establish an exact continuous-spline minimum, present terrain seating, actual shadows, or visual acceptance. The temporary middleware owner closed; CPU geometries/materials were disposed. No browser, Blender, render, build or test suite ran for this publication audit. Full file hashes, per-range gaps and witnesses are in [current-revision-receipt.json](current-revision-receipt.json).

The current World preserves collision-bearing placements and now references the versioned refined arch/blade exports. The earlier stamped directional-shadow creator/call was removed by the root integration; the existing real shadow-caster path remains. This note does not assert shadow parity or repeat the old first-pass shadow-fit outcome.

The newly integrated `canyon-arch-dusk-v1.glb` (70,000 triangles) and `wind-blade-dusk-v1.glb` (10,000 triangles) retain the source lineage and CPU guards recorded in [the refinement handoff](../stone-refinement-v1/HANDOFF.md). Their **native visual acceptance remains pending**. Preserved component bounds, passage, sampled contact profiles, colors and closed topology do not mean unchanged geometry or establish visual/collision parity. The refinement deliberately changes surface positions and normals. No new in-world acceptance is claimed here.

Publication audit: **no blocker found in the two new geometry source folders and their public exports**. The arch retains the recorded Poly Haven `boulder_01` CC0 provenance; ranges and the wind-blade are project-authored. The only bulk additions are the two GLBs, 1,923,096 bytes per source/public pair; duplicate source and runtime copies are exact and purposeful. No `.blend`, research-media cache or texture pack is added by these folders. Existing ignored failure/build logs remain local; retained JSON and Markdown describe the failures and final source checks. Source scripts retain explicit local authoring-path/dependency assumptions. See [publication-audit.json](publication-audit.json) for the inventory and limits. No commit or runtime/test edit was performed.
