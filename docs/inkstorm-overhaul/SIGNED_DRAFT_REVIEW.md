# Signed mountain draft — independent source review

Reviewed the three `output/terrain/round20-*draft` source proposals on 2026-09-07. This review used their staged `after`/`src` files and source baselines. No implementation files were changed, and no tests, builds, benchmarks, browsers, or captures were run by this reviewer. Previous visual scores were not consulted.

**Recommendation: fix the refinery bench overlap before accepting this candidate.** One concrete blocking defect was found.

## P1 — Overlapping full-weight benches introduce a 35 m step inside the middle yard

Primary location: `output/terrain/round20-draft/after/src/game/race/LaunchBasinPlan.ts:104-109`; newly conflicting dimensions are at lines 62-63.

The middle bench's full-weight rectangle is forward **732..898**, right **246..404**. The later upper bench's full-weight rectangle is forward **865..1025**, right **310..500**. When the middle bench has set `weight = 1`, any upper-bench transition with `blend < 1` is completely ignored; the upper bench replaces the height as soon as its blend reaches 1. Thus at right 360, approaching forward 865 from below returns the middle target **110 m**, while forward 865 returns the upper target **145 m**. The overlap continues inside the actual middle yard, whose physical footprint is forward **744..886**, right **258..392**. The earlier lower and middle cores overlap as well, at forward 732..742/right 302..404.

This is not a continuous terrace transition. Baking the discontinuity into the 6 m grid turns it into an abrupt narrow slope. It also defeats the intended short founded refinery terraces: `output/terrain/round20-root-draft/after/src/render/inkstorm/InkstormVista.ts:204-209` samples the whole middle yard and sets the entire deck to its highest sample plus 6 m. Its forward-edge sample at forward 886/right 325 lies inside the upper bench's 145 m core, while its centre remains in the 110 m middle bench. Where the mountain mask is fully active, the middle deck consequently rises about **41 m above its centre**, rather than 6 m.

Fix the shared plan so each full refinery footprint, including interpolation padding, belongs to one level and its transition occurs outside the equipment footprint. Merely replacing the hard selection with a smooth height blend would remove the discontinuity but still slope the middle yard unless the overlapping footprints are also resolved.

The proposed tests do not catch this: `output/terrain/round20-draft/after/tests/terrain/signedCourseTerrain.test.ts:62-68` checks only each bench centre; the physical refinery test at `output/terrain/round20-root-draft/after/tests/render/inkstormVista.test.ts:112-115` only checks that the deck is above, and footing below, the centre. The denser footing test at lines 119-133 uses **base terrain without the signed field**. Add actual signed-field coverage across each complete yard, require short deck-to-ground separation, and check continuity across the bench boundaries. Keep the protected-lane fixture unchanged.

## Source checks with no additional blocking defect found

- **Independent coordinate signs:** the course defines right as `(tangentZ, -tangentX)`; a camera looking forward with +Y up has screen-right `(-tangentZ, tangentX)`. The negative-course-right transforms in staged `CourseGulfField.ts:254-256`, `InkstormTerrainShadow.ts:34-37,55-57`, and `InkstormVista.ts:129-131,193-198` therefore agree. Shadow triangles at `InkstormTerrainShadow.ts:102-103` wind toward +Y.
- **Signed CPU/GPU composition:** staged `CourseGulfField.ts:63-72` and `CourseGulfTextures.ts:65-70` use the same minimum-negative plus maximum-positive expression. Bilinear interpolation and the protection-mask early exit retain the existing lane/probe mechanism. The dense historical lane SHA fixture remains unchanged; source inspection does not establish that it passes.
- **Geometry bounds:** staged `TerrainSystem.ts:194-201` expands the lower limit by 170 m and upper limit by 250 m, recentres the sphere, and restores the stored limits on course exit. The existing geometry records its skirt-inclusive lower bound.
- **Material axes:** the geology projection uses world `.zy`, `.xz`, `.xy` with X/Y/Z normal weights, respectively. The current terrain world normal uses `(-dH/dX, 1, -dH/dZ)`. The instanced rock normal divides by each instance-axis squared length before applying its matrix; current placement uses yaw and scale without shear. No new mirrored-axis defect was found.
- **Shadow ownership:** staged `InkstormWorld.ts:87-93,133` builds the terrain source during the loaded course rebuild and advances the scenery revision. `InkstormTerrainShadow.ts:121-128` lends shared geometry/material to atlas clones and owns their disposal. The existing atlas disposes clone instance buffers only and bakes once per revision; context invalidation reuses the terrain source.

## Remaining acceptance evidence

The 18 m shadow mesh only measures its downward padding on the stated 6 m barycentric lattice (`InkstormTerrainShadow.ts:78-95`); it does not prove a continuous lower envelope between probes. Inspect steep bench/ridge shadow contact after the bench correction. CPU/GPU execution parity, final physical bench seating, shader compilation, distant geology stability, real launch composition, and performance remain for the root's combined runtime validation. This source review makes no visual-quality or performance acceptance claim.

## P1 resolution — current source re-review, 2026-09-07

**The original P1 is resolved in the current source.** The initial staged-draft finding above remains intact as the record of the defect. This follow-up used source inspection and the existing physical receipt only; this reviewer did not rerun tests, builds, benchmarks, or browsers.

`src/game/race/LaunchBasinPlan.ts:58-63` now places the lower, middle, and upper yards at forward 650, 815, and 1000. Their padded full-weight forward intervals are **583..717**, **732..898**, and **920..1080**, leaving **15 m** and **22 m** gaps. The flat cores therefore cannot overlap. Each actual yard remains 12 m inside its own full-weight core, covering the 6 m grid's bilinear footprint.

The new blend at `LaunchBasinPlan.ts:109-130` independently resolves the selection discontinuity. Writing each bench blend as `b_i`, its influence is `b_i * product(1 - b_j)` over the other benches. Because the cores are disjoint, at most one `b_i` equals 1. Inside that core, every other bench influence becomes zero and the owning influence remains positive, so the normalized target is exactly that bench's height. Outside the cores, the denominator is positive wherever a bench contributes, making the normalized height continuous. Where all bench blends vanish, the combined bench contribution also vanishes; a possibly undefined standalone average is never used. The ridge mixture at lines 100-108 likewise replaces dominant-segment selection with normalized continuous influences. Its influence tends to zero at the terrain boundary. The final signed composition at `src/game/race/CourseGulfField.ts:263-295` retains the protected-lane early exit and uses continuous clamping and masks; the extra curved-floor mask suppresses mountain rise through the playable basin.

Coverage now addresses the missed mechanism: `tests/terrain/signedCourseTerrain.test.ts:80-110` asserts disjoint padded cores, checks full core surfaces, and probes small perturbations across the composition. `tests/terrain/connectedLaunchRidge.test.ts:73-87` uses the actual signed field on a 17-by-17 lattice over every yard, checks short foundations, and verifies the footing/deck brackets sampled ground. The original 532,296-sample lane/probe SHA test remains at lines 18-44. These tests support the algebraic review; the millimetre lattice alone is not a proof of continuity.

The existing `output/terrain/round20-physical-receipt.json` reports maximum absolute bench errors of **0.785 m**, **0.929 m**, and **0.668 m**. Its deck heights are less than **7 m** above the respective minimum sampled ground heights, so it no longer records the original roughly 41 m middle-yard pedestal. It also records zero preserved-height difference across 532,296 samples and identical before/after finish-grid hashes. These are inspected receipt results, not new executions by this reviewer.

The receipt's source hashes were checked against the current files with a lightweight read-only hash operation and matched:

| Current source | SHA-256 |
| --- | --- |
| `src/game/race/LaunchBasinPlan.ts` | `5ac02f25f243fc10585f773bf72c4b413d6bbdd4688b387635639988b60a365a` |
| `src/game/race/CourseGulfField.ts` | `4804ca75b6003ad640b452c8cecbaa373d3f2df042a1574d7359a89b6a5f40f8` |
| `src/render/inkstorm/InkstormVista.ts` | `d88b3989c686570f904de2496652465c289746ff8d8a252b20a330254dae0e29` |

The scan-crown change at `InkstormVista.ts:183-194` also measures the accent's own rotated footprint before limiting its crown to the lower of the station crown and sampled ground plus 18 m. Its local X/Z rotation agrees with the existing placement transform. This is a sampled geometric limit, not a visual acceptance finding.

No new blocking defect was found in this focused re-review. The static shadow approximation and combined rendering/performance acceptance remain outside this resolution; no general visual-quality claim is made.
