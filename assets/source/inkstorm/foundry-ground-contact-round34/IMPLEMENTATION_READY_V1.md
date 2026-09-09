# Foundry foundation/contact candidate — prepared and held

Prepared 2026-09-09 against the preserved V10 Foundry world with V13 vehicle shading. **Not applied, rendered, or visually accepted.** Parent has moved priority to HUD/UI, animation and combat; this checkpoint remains private for a later coordinated trial.

The [patch](foundation-contact-v1.patch) replaces 13 plain pipe-bank foundation boxes with closed concrete forms: a retained top slab, a recessed 0.30 m fascia transition, three real frontage joints, and a terrain-seated lower edge. It adds no rubble, lighting, shader, texture or GLB edits. Those limits narrow the earlier [construction plan](NEXT_CONSTRUCTION_CANDIDATE.md).

The helper generates five 31-point rings and two closed cap fans: **310 triangles per accepted bank**, below the allowed 512. The full candidate contains **4,030 triangles / 435,240 attribute bytes**, net **+3,874 triangles** after its 13 original 12-triangle boxes are removed. Geometry joins the existing single Foundry service mesh/material; no new draw or program is requested. An actual renderer/resource capture remains required to confirm that result in the game.

Only a successful merge supplies the old-box omission IDs. A rejected bank retains its complete old box. Null or thrown contact merges retain the original Foundry triangle attributes and all foundation instances. The transferred scratch geometry is disposed on success, failure and a course without a Foundry. Physics, course, terrain, module transforms, sockets, source GLBs and generic courses remain unchanged.

## Actual CPU evidence

[Geometry receipt](geometry-check-v1.json) and [private numeric copy](geometry-cpu-copy-v1.json) use the exact 18 placement tuples pinned in the earlier source manifest, reconstructed through current terrain/gulf/pit fields. All 13 accepted banks and three rotated synthetic cases have no boundary/nonmanifold edges, opposite incident edge directions, Euler characteristic 2, positive signed volume, finite outward face normals and no degenerate triangle. Every actual Float32 position stays within the old rotated 94 × 44 m footprint. No footprint enlargement is hidden in a double-precision calculation.

Runtime construction uses at most 2 m terrain probes without allocating a vertex per probe. Independent CPU probes at 0.25 m on the packed toe edges found **minimum 0.110899 m burial**. This is sampled evidence, not a mathematical proof over arbitrary terrain between probes. The retained bottom is unchanged; a steep profile that cannot fit rejects the whole bank. One measured construction call took 37.61 ms on this machine; this is initialization timing, **not FPS evidence**.

Accepted bank suffixes: **227, 229, 230, 231, 232, 234, 235, 236, 237, 239, 240, 241, 243**.

| Retained original bank | Guard |
| --- | --- |
| 228 | Terrain toe would exceed retained bottom |
| 233 | Whole-footprint residual route clearance −8.598 m |
| 238 | Residual clearance −0.364 m |
| 242 | Residual clearance 5.005 m, below required 7 m |
| 244 | Residual clearance 1.853 m, below required 7 m |

The conservative clearance calculation covers the full old rotated rectangle against all route segments, including width, a 10.5 m vehicle half-width and sampling allowance. Rejected values are candidate eligibility results; they do not establish a new collision in the unchanged game.

[Projection receipt](projection-check-v1.json) reconstructs all 11 V13 saved camera eyes within 1.5e-14 m. At the nearest accepted bank in approach, near-span, middle and exit views, a 0.6 m central joint projects to about 4.25 / 3.06 / 4.89 / 57.25 pixels; the 0.3 m recess to 0.87 / 5.34 / 3.01 / 10.88 pixels. Oblique/out-of-frame projections can be exaggerated, distant details can be subpixel, and these are **unoccluded projections**, without terrain, vehicle or scenery depth tests. They justify an actual capture, not a predicted visual pass.

## Validation and later use

- Isolated TypeScript check passed; **26 tests in four files passed**, including new closed-surface/envelope/toe checks, existing Foundry placement/collector/corridor tests and exact original geometry/instance retention under null and thrown merges.
- `git apply --check --whitespace=error-all` and live `git diff --check` passed. All three changed live-file baselines plus pinned course/layout/pipe-bank GLB hashes remained exact. [Validation receipt](validation-v1.json) records these checks.
- First isolated typecheck failed because the disposable test tree omitted existing fixture symlinks; its log is preserved. The corrected isolated tree passed and was removed. [Reconstruction script](prepare-isolated-check.py) recreates it without editing live files.

The patch changes three integration files, adds the geometry helper and adds one test file. For a later trial, recheck [baseline hashes](candidate-inputs.json), run the patch check again, then let the parent apply and run its normal verification and matched Foundry captures. Review seam visibility, the three joints, steep-terrain seating and any culling regression. No current document should describe this held private candidate as runtime progress.
