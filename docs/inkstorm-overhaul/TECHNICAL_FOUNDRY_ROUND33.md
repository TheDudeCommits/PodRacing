# Round33 foundry technical review

Reviewed 2026-09-08 in `/Users/amir/Projects/PodRacing`, against `output/gauntlet/round32-frozen-runtime`. Scope: source, actual public GLB decoding, CPU geometry, and focused regression tests. No browser, Blender, build, full test run, performance measurement, or art acceptance was performed by this reviewer.

One concrete Round33 assembly regression was found and fixed at the coordinating agent's request. No additional new lifecycle, render-family, shader-palette, or physical-layout regression was established by this review. Browser validation remains open.

## Fixed: collars followed an endpoint ray past the pipe bend

The V4 code moved each new collar 4.9 metres along its endpoint control-segment direction, keeping that direction as its axis. Several actual flagship pipes have a much shorter vertical endpoint segment. Their collars overshot the segment and sat beside the tube, with approximately 90-degree axis errors. Original evidence is preserved in `output/gauntlet/round33-v4-before-curve-joint-fix/src/render/inkstorm/InkstormFoundry.ts:178-185`.

Measurements use flagship seed `0x494e4b53`, `createCourseGulfField`, and the actual signed terrain sampler. Before distances below are nearest-centerline estimates from 1,001 curve samples. After distances inspect the emitted Float32 geometry's bounds center against the requested arc position.

| Pipe / endpoint | Short endpoint segment | V4 centerline gap | Fixed center error |
| --- | ---: | ---: | ---: |
| `foundry-overhead-1` / end | 0.40845 m | 4.492 m | 0.000375 m |
| `foundry-side-1-header-2` / start | 0.43186 m | 4.468 m | 0.000213 m |
| `foundry-overhead-2` / end | 1.33106 m | 3.569 m | 0.000143 m |

`src/render/inkstorm/InkstormFoundry.ts:144-163` now samples offset collars on the same `CatmullRomCurve3` used by `TubeGeometry`, at the requested inward arc distance, clamped to half the curve length. The actual tangent supplies their axis. The assembly calls that helper at line 200. Unshifted socket flanges retain their previous rotation, nonuniform scale, and translation order.

`tests/render/inkstormFoundryJointPlacement.test.ts:21-98` checks the three actual failing pipes, emitted collar centers and face normals, byte-exact unshifted socket attributes, oversized-offset clamping, and finite position/normal/color data across the complete assembled mesh. The focused command `./node_modules/.bin/vitest run tests/render/inkstormFoundryJointPlacement.test.ts` passed **6/6 tests** in 741 ms. A separate CPU scan of all **96 shifted collars** measured a maximum center error of **0.0008952 m** and minimum axis/tangent dot product of **0.999999999999871**. Whitespace checks on the changed source and new test reported no errors.

The five reviewed V4 runtime sources and exact original hashes are preserved in `output/gauntlet/round33-v4-before-curve-joint-fix/receipt.json`; this is a scoped source snapshot, not a complete runtime freeze. Foundry SHA256 changed from `b694bfa2f430d847efa87dfc1f674e8eb3ee1674386b2f696f73600b35cac7d5` to `a97c0c6e99b43453da4fd3d50570aefd01c6889d82b2411b42bf286318570d47`. New test SHA256: `72c3192528de7940a861f2163c1a2f0305c27f4ac65b8ad7f693675947f6ee77`.

## Other inspected contracts

- **Physical layout:** `src/game/race/inkstormLayout.ts`, `course.ts`, and `RaceSimulation.ts` are byte-identical to the Round32 freeze. The original public gantry and pipe bank match their preserved Round32 predecessors. CPU comparison found the existing foundry pipe paths and service boxes unchanged, excluding the new joint-offset fields. The new collectors and collars remain scenery with no simulation authority.
- **Family selection:** `InkstormGantryAppearance.ts:8-10` keeps the exact `.012` grid gantry and selects the service asset for the industrial crossing. This agrees with layout construction at `inkstormLayout.ts:67,80` and was checked across four seeds. `InkstormWorld.ts:159-174` uses the render family consistently for upload and instance records; culling and shadow ownership consume those records at lines 186-191 and 211-222. The physical placement transform is preserved.
- **Actual assets and emission:** The decoded service GLB has 19,956 triangles, unchanged X/Z bounds of 104 × 14 m, and exactly 168 triangles fully matching the reserved warm-glass shader palette; no triangles mix reserved and ordinary vertices. The grid and both pipe-bank GLBs have zero reserved-palette triangles. `InkstormSurfaceMaterial.ts:39,213-215,270` confines this emission to `INKSTORM_FOUNDRY_EMISSION`, enabled only for the service batch at `InkstormWorld.ts:99-101`. This establishes the input/define contract, not successful GPU compilation or perceptual light quality.
- **Ownership:** Added procedural pieces are disposed after merge at `InkstormFoundry.ts:220-221`. The new family follows the existing settled asset-load cleanup and batch disposal at `InkstormWorld.ts:57-73,234`. Shadow clones share world geometry/materials and dispose only their instance buffers at `InkstormSunShadow.ts:120-124`. No new persistent texture or per-frame update was introduced by these additions.

## Required follow-up on the combined build

1. **Re-run resource cycles.** `scripts/inkstorm-resource-cycles.mjs:51-80` visits all seven sections and checks stable geometry/texture/program counts between cycles. The new family and emission define introduce a material/program path; the existing Round32 receipt does not cover it. Preserve the new frozen-build and asset hashes with the result.
2. **Re-run context recovery with the foundry visible.** The existing `scripts/inkstorm-context-recovery.mjs:34-57` loses context after only two seconds from the launch grid. That may never compile or render the new emission program. Stage the industrial gantry before the loss, verify it and the pipe bank after restore, and check both shader errors and atlas rebaking. A launch-only rerun is insufficient for this new family. Runtime recovery already invalidates both atlases at `GameApp.ts:3699-3705`; no additional source change is established as necessary.
3. **Measure workload and inspect the fixed joints in the next capture.** CPU triangle counts rose from 46,788 to 152,172 for the merged network, from 7,160 to 19,960 per pipe-bank instance, and from 6,300 to 19,956 for the industrial gantry. The flagship has 18 banks, producing **349,440 additional authored triangles** across those changes before camera culling. The merged network's position/normal/color arrays alone total **16,434,576 bytes**. Resource-count plateaus do not establish GPU cost or visual correctness; use the coordinating agent's combined performance and art review.

Current public asset SHA256: service gantry `58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba`; detailed pipe bank `7a28b2e2f3ce25b173ed21033cbe0d28e7341197407b5e86d2400848dba8d946`.

Coordinator update after the fix: the V5 combined run passed **637 tests in 115 files**, reported capture `errors: []`, and retained the correction in three inspected foundry shots. Reported frozen entry: `index-CQCm3676.js`, SHA256 `1071c747951e84a8954c94bff228b6edcebcce0b81d36920fa8770925c88feb8`. Those results were supplied by the coordinating agent; this reviewer did not rerun them. The performance window was still in progress when this report was completed.
