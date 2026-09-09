# Shared flagship terrain and playable launch basin

The flagship Inkstorm route now descends about **94 m over 600 m**, crosses a 250 m basin floor and climbs back to the original landscape over 700 m. This changes actual terrain and lane elevation; it is not a camera preset. The earlier 170 m off-road launch valley and 150 m outer finish basin remain part of the same field. Horizontal course geometry, checkpoint order, the three alternate routes and the supported bridge remain unchanged.

## Authored route profile

A 270 m approach blends out the original small crests before the descent. The shaped section begins at distance 1043.76 m (progress 0.1365), reaches the descent rim at 1313.76 m (0.1718), the basin floor at 1913.76 m (0.2503), starts climbing at 2163.76 m (0.2830), and rejoins the original ground at 2863.76 m (0.3745), before the canyon. Rim target is -12.38 m and basin floor target is -106.38 m in world coordinates. Terrain returns to its original -7.55 m at the exit.

The profile shapes the surrounding basin at full strength up to 220 m from the nearest route centerline and blends back across 220–420 m. This provides a broad descending landscape, rather than excavating only a road-width trench. The profile only lowers terrain. The cubic descent and climb transitions, short exit blend and existing six-metre field interpolation produce a measured maximum eight-metre centerline grade of **0.288** (about 16.1 degrees), sampled every two metres. A geometric sight line from ten metres above the route at progress 0.18 to the basin road remains above actual terrain throughout; this checks that a foreground crest no longer physically blocks that reveal, without changing a camera.

## Shared field and lifecycle

`src/game/race/CourseGulfField.ts` now bakes a 417 × 417 launch grid covering 2496 m and a 257 × 257 finish grid covering 1536 m, both at 6 m spacing. Total data is **959,752 bytes**, with the same two R32F GPU textures and no additional sampler. All contributions are combined using `min`, not addition: the tested combined displacement stays in [-170, 0] metres. The outer texel border is zero. On this machine a sampled construction/grade-audit pass took approximately 126 ms; this is setup CPU time, not a frame-rate measurement.

`RaceSimulation` generates the base horizontal plan with no modifier, then installs its instance-owned `courseGulfField` into the course-height closure and physical terrain sampler, before applying the existing bridge surface. `course.refreshTerrainHeights` updates cached checkpoint elevations and adjusts any affected branch point elevations without changing their X/Z, progress or deck clearance. All current branches are outside this profile, so their cached point data is unchanged. The course's `generationReport` remains the original base-plan/seed-search receipt; the runtime authored profile has the separate grade, continuity and driving verification described here.

Standalone simulations and multiplayer peers use the same field. Other seeds produce no field. Explicitly supplied `options.course` objects keep the caller's original height contract and get no automatic gulf or descent; no caller-owned course is mutated.

`GameApp` supplies the base sampler for generation and installs the simulation-owned field into `TerrainSystem`. Rebuild clears the previous field before generation, installs the next field before scenery creation, invalidates fallback landmark placement, and clears dust. There is no module-global terrain override.

The GPU uses the same Float32 data and explicit four-texel bilinear interpolation as the CPU. Nearest-filtered R32F textures require no float-linear extension. Stable uniform objects feed terrain beauty/depth/MRT, both route ribbons, the compacted road and projected ground shadows. Physics, surface sampling, scenery foundations, wakes, crest dust, contact rings and spray consume the same height field. Texture replacement/disable/disposal release both textures. Clipmap bounds include the full 170 m displacement and actual Float32 skirt depth; disabling restores original bounds.

## Protected routes and normal precision

The off-road kernels preserve capsules around all main and branch segments: larger endpoint half-width plus 10 m, a full six-metre texel diagonal, and four extra metres for **CPU physics (.85 m) and MRT (1.15 m)** normal probes plus dense spline error. The conservative margin beyond the lane is approximately 22.49 m, followed by a further 64 m shoulder blend. The launch elevation profile intentionally overrides this preservation in its authored section. Outside that section, the main lane and ten-metre margin retain their original physical heights. All alternate-route widths, bridge joins and the finish divider island remain protected.

The finish kernel is on `-sign(curvature)`, the outside of the hairpin. Its off-road mask preserves the canonical loop interior. The launch basin intentionally lowers part of the loop interior near the first sweeper; it does not reach the finish/shortcut island.

Beauty-lighting normals average the shared field over a wider **9.5–48 m stencil**. They can blend outside a protected lane and do not promise identical normals to physics/MRT. Rendered triangles also interpolate between clipmap vertices; distant 96 m cells remain a visual approximation of the same field. Integrated captures must check far road occlusion and cliff LOD appearance.

## Verification and remaining acceptance

**57 tests passed across nine terrain/course/bridge files**, including four new launch-profile tests and revised gulf-preservation tests. They cover sustained descent and floor width, maximum grade, physical sight-line clearance, smooth profile endpoints, checkpoint/branch/deck joins, independently differentiated physical normals, determinism, negative-only depth bounds, dense protected-lane samples, CPU/GPU bilinear formulas, standalone/peer consistency, nonflagship/supplied-course isolation, shared uniforms, texture disposal and clipmap/skirt bounds. Typecheck and `git diff --check` passed.

Input-only full-lap diagnostics use normal `RaceSimulation` with the installed profile. No pose, progress or race timer is edited. The script now supports `--no-boost` and `--launch-boost`; the latter reserves energy and requests boost in the launch section while respecting normal heat/energy/grounded conditions. Receipts include the field source hash and per-launch telemetry.

| Vehicle | Unboosted full lap | Launch-boost full lap | Peak launch boost speed |
| --- | ---: | ---: | ---: |
| Podracer | 60.32 s | 60.16 s | 645 km/h |
| Landspeeder | 66.82 s | 66.72 s | 642 km/h |
| Speeder bike | 57.60 s | 57.37 s | 647 km/h |
| Skim speeder | 62.56 s | 62.44 s | 668 km/h |

All eight solo laps completed naturally with **zero collisions and zero resets**, including the launch. Actual launch boost inputs ranged from 0.33–1.03 seconds across classes. The descent produces approximately 3.9–4.3 seconds of airborne traversal in these high-speed runs, followed by normal landing and continued racing; this is not a fully grounded descent claim.

The two-lap Canyon Cup diagnostic produced eight natural finishers and no launch resets or scenery collisions. Its only launch contact was Miri against Olan (one collision event for each). It still contains collisions and two AI Olan recoveries near progress 0.779, outside the new profile. The reported scenery collision hotspots are the hairpin roadside shard and one start-line shard. This does not establish a clean-race pass for every AI racer; the whole-course AI issues remain separate from the launch profile.

Evidence: `output/drive-balance/launch-descent-normal.json`, `launch-descent-boost.json`, and `launch-descent-ai.json`. These are automated controller tests, not human handling or visual acceptance. The parent bumped mastery identity to `inkstorm-course-5` / `inkstorm-drive-4` because valid racing-lane heights changed; old records and ghosts must remain isolated.

No browser or full build was run by this subtask. Still required: actual launch chase/aerial reveal and descent/landing video, fresh blind art review, and a combined 40–60 Hz performance run on the current world/material build. Unit tests and input-only laps do not establish concept-art parity.
