# Independent code review: shared gulf terrain

Reviewed 2026-09-07, read-only except for this report. This is a correctness review of the integrated source, not a blind art critique or an executed GPU conformance/performance test. The reviewer did not open a browser or run a build during integration.

The normal generated-course GameApp path has no outstanding high-severity mismatch identified by this review. The fallback landmark cache edge reported during review is also corrected.

## Findings and disposition

1. **Supplied-course physics mismatch — corrected.** Initially `RaceSimulation({ course })` added a gulf only to `race.terrain`, while the supplied `PodraceCourse` retained its original private terrain sampler for height and scenery collisions. Current code deliberately leaves supplied courses gulf-free, preserving their existing caller-owned contract. The new test covers this case. Generated flagship courses still share one field between `race.course.heightAt` and `race.terrain`.
2. **Historical-record wording — corrected.** The first version comment said earlier records stayed stored. The parser filters incompatible best-record and favorite versions, and subsequent persistence writes the filtered profile. Root changed the comment to the actual comparison boundary. Run history is retained under the existing parser rules. The new `inkstorm-course-4` / `inkstorm-drive-3` identity prevents previous bests and ghosts becoming comparable targets.
3. **Fallback landmark cache — corrected.** `DesertLandmarks.update` returns early while the camera stays in the same world cell. The injected height closure sees the new terrain, but previously built instance matrices are cached. A field switch can therefore leave fallback landmarks at their former heights until a cell crossing. Current `rebuildRaceForCourse` calls `landmarks.setHeightSampler` immediately after installing the new field; its existing setter invalidates the cell cache. The reviewer read this correction in GameApp before marking it resolved. The main `InkstormWorld` already rebuilds on every course change.

## Checked integration boundaries

- Generated routes use the base terrain during seed search, checkpoint construction and branch/deck generation. The instance-owned closure receives the gulf only afterward. No global terrain mutation is used.
- The field is restricted to the flagship seed. Rebuilding clears the prior field before generating the next course and reinstalls the new field before rebuilding visual course assets and clearing dust.
- CPU sampling and shader sampling use the same two `Float32Array` grids, explicit four-texel bilinear interpolation, identical outside-grid rejection and minimum-of-two composition. Nearest-filter R32F textures avoid requiring float-linear filtering support. This source audit does not prove zero CPU/GPU floating-point error.
- Beauty, depth, normal, GameApp MRT, racing surface, route guides and `InkstormShadows` receive the same stable uniform objects. Changing fields updates those objects; old textures are disposed. Null fields reset dimensions to zero before shaders can fetch them.
- Clipmap bounding boxes expand downward by the maximum field depth, including the actual Float32 skirt position. Bounding spheres are recentered and enlarged, and bounds restore when the field is removed.
- The main-lane protection field includes width, a ten-metre margin, bilinear reach and normal-stencil allowance. The test source samples 8,192 off-grid route fractions and every branch segment's width/joins. Those checks preserve physics and MRT normals; the deliberately broader art-lighting normal stencil remains a presentation choice.
- Dust consumers use the same injected sampler for rings, wake ground/camera clearance, spray and crest placement. The reviewer executed 15 focused dust tests earlier in this subtask, including raised/depressed surfaces, persistent field changes, course-clear redistribution and legacy defaults.
- The owning terrain agent reports its focused terrain tests and typecheck passed. This reviewer inspected the tests and implementation but did not independently re-execute that suite during the coordinated capture window.

Final browser shader compilation, actual route driving, clipmap appearance, same-build multiplayer, integrated frame time and the blind visual verdict remain separate acceptance evidence.
