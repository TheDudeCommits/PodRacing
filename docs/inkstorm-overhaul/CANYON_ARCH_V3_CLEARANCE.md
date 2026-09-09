# Canyon arch v3 — normalized candidate and curved-route clearance

The normalized v3 candidate passed the requested pre-integration corridor study at all **18 placements**: both arches on flagship seed `0x494e4b53` and both arches on each of the eight representative seeds in `tests/race/inkstormCanyonComposition.test.ts`. No unsafe placements were found. This is a dense conservative sampled geometric study; it does not establish art acceptance or the 40–60 fps runtime gate.

Candidate: `assets/source/inkstorm/canyon-arch-v3/canyon-arch-v3-normalized.glb`, **1,260,384 bytes**, SHA-256 `1b950e08b0004fec5590b1167a7c1f7311c0389a2d48b2e43c387c1ef82d9b01`. The scan-based construction, CC0 provenance, topology, bounds, and inspected Blender renders are recorded in `CANYON_ARCH_V3_STAGING.md`. The earlier unnormalized GLB and renders remain intact.

`assets/source/inkstorm/canyon-arch-v3/normalize-values.mjs` multiplies every linear RGB vertex value by **0.5711521828682563**. This brings exported-vertex median luminance to **0.1900000054** without clipping and preserves relative color/AO variation. Position, normal, and index hashes are unchanged. The normalized GLB remains 37,800 triangles, one primitive/material, nine internally watertight components, and has zero Khronos errors, warnings, infos, or hints. Complete quantiles and attribute hashes are in `normalized-value-receipt.json`.

| Vertex luminance | Before | After |
|---|---:|---:|
| p0 | 0.144627 | 0.082604 |
| p5 | 0.179726 | 0.102651 |
| p25 | 0.266585 | 0.152260 |
| p50 | 0.332661 | 0.190000 |
| p75 | 0.411932 | 0.235276 |
| p95 | 0.593304 | 0.338867 |
| p100 | 0.742284 | 0.423957 |

`scripts/inkstorm-arch-clearance.ts` reads the exact normalized GLB and production course, terrain, field, and placement functions. It creates the base course, installs the instance gulf field, refreshes cached heights in the same ordering as `RaceSimulation`, and uses the existing arch transform with terrain height at its center minus 1.5 m. It changes no road, terrain, placement, or runtime source. The original public arch was hash-checked before and after the study.

Main routes are sampled directly with `samplePlanAtProgress`, at a requested 0.4 m interval and adaptive subdivision enforcing measured intervals at most 0.5 m. It never calls `getRenderData`. Every segment of all 27 branches is interpolated at at most 0.4 m; coincident endpoints with different directions or widths also sweep their corner fan. The study examines every main and branch against the full transformed arch depth, with no canonical-progress proximity filter. All 27 branch corridors are spatially outside these 18 arches and were conservatively rejected using transformed horizontal bounds.

The lateral halfwidth is the actual lane halfwidth plus **9.6 m craft halfwidth + 7 m guard**. Across-lane cells are at most 0.4 m wide. Each swept cell uses nine support samples across its start, midpoint, and end. Support is the higher of terrain +0.45 m and the elevated road height when applicable (+0.07 m construction offset +0.04 m shader offset). Cell tops include **12 m** headroom. Horizontal padding includes the entire center interval, lane width change, and lateral direction change. Vertical padding is **1 m plus the full support-height range inside that cell**, above and below the measured extrema.

The run evaluated **185,787 direct main points**, **41,768 branch points**, **455,056 route/arch segment pairs**, and **422,075 nearby swept cells**. The largest measured center interval was **0.413371 m**, largest across interval **0.399999 m**, largest local horizontal world-space padding **0.560536 m**, and largest vertical padding **1.419240 m**. Course signature, control points, checkpoints, branches, layout, and 4,096 direct plan samples have identical hashes before and after each seed. Source hashes are in the report.

The exact candidate is independently rechecked against the protected opening X [-44,44], Y [0,24] through its full depth before the sweep. There are zero triangle intersections. Of the swept cells, 383,369 are rejected by this verified empty volume. Remaining cells are outside the full asset bounds or separated from the bounding boxes of the actual 37,800 triangles. None require the final triangle/box SAT test, and none intersect. A triangle/box narrow test remains implemented for cells whose bounds do overlap triangle bounds.

The table reports minimum margins of the already padded corridor boxes to the canonical guaranteed opening, in **local asset metres**; these are not minimum Euclidean distances to the actual rocks. A negative roof margin means that the cell exceeds the guaranteed lower box and must instead clear the actual geometry bounds.

| Seed | Course signature | Arch suffix | Side margin | Roof margin | Result |
|---|---|---:|---:|---:|---|
| `0x494e4b53` | `2dacfc90` | 224 | 12.524 | 6.816 | Clear |
| `0x494e4b53` | `2dacfc90` | 225 | 11.986 | 3.637 | Clear |
| `0x00000000` | `bf9ec615` | 237 | 13.371 | 5.396 | Clear |
| `0x00000000` | `bf9ec615` | 238 | 11.998 | 9.619 | Clear |
| `0x00000001` | `2679afaa` | 236 | 11.386 | 9.309 | Clear |
| `0x00000001` | `2679afaa` | 237 | 11.784 | 10.774 | Clear |
| `0x0000002a` | `ad205743` | 192 | 12.209 | 5.973 | Clear |
| `0x0000002a` | `ad205743` | 193 | 12.534 | 7.492 | Clear |
| `0x000004d2` | `89d72497` | 259 | 12.976 | 5.823 | Clear |
| `0x000004d2` | `89d72497` | 260 | 12.818 | 7.866 | Clear |
| `0x3ade68b1` | `0ad81379` | 261 | 12.334 | 4.005 | Clear |
| `0x3ade68b1` | `0ad81379` | 262 | 9.755 | 7.937 | Clear |
| `0x494e4b52` | `0aa0de88` | 260 | 11.316 | 9.059 | Clear |
| `0x494e4b52` | `0aa0de88` | 261 | 11.541 | 6.512 | Clear |
| `0x494e4b54` | `ff15636c` | 253 | 12.427 | 9.075 | Clear |
| `0x494e4b54` | `ff15636c` | 254 | 12.328 | 7.730 | Clear |
| `0xffffffff` | `5594461d` | 222 | 13.389 | 0.578 | Clear |
| `0xffffffff` | `5594461d` | 223 | 11.380 | -5.098 | Clear |

Flagship arch roof margins are 6.816 m and 3.637 m, with side margins 12.524 m and 11.986 m. The tightest side margin anywhere is 9.755 m. Seed `0xffffffff`, arch 223, reaches 5.098 m above the guaranteed 24 m local opening, but its expanded cells remain below or beside every actual triangle bounding box. Its clearance therefore depends on this exact v3 geometry, not just the generic 88 m ×24 m opening contract.

This method deliberately expands the sampled corridor, but it is not an analytic global derivative proof for unsampled terrain between points. It covers these nine frozen generated courses and existing placements. It does not claim every possible seed is safe, certify arbitrary off-route flight, replace in-world driving review, or establish rendering performance. Any geometry, placement, terrain, or course change invalidates the recorded hashes and needs a new study. The actual Blender renders predate value normalization; geometry and normals are identical, but the production material appearance must be reviewed in-world.

Reproduce the normalized asset with `node assets/source/inkstorm/canyon-arch-v3/normalize-values.mjs`, then run `npx --no-install tsx scripts/inkstorm-arch-clearance.ts` from the repo. The latter is intentionally a pre-integration study and asserts that the original public arch still has SHA-256 `36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453`. Machine evidence is `output/arch-v3/clearance/clearance.json`. The existing regression suite `npx vitest run tests/race/inkstormCanyonComposition.test.ts` passed **11/11 tests**.

Status: normalized sibling and clearance evidence are ready for parent-agent review/integration. This subtask made no public/runtime edits and used no further GPU work for normalization or clearance.
