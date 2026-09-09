# Launch reveal — round31 source candidate

**Decision:** replace the convex sand shoulder with one physical escarpment and an excavated bowl throat. This is a course9 candidate for an actual-camera A/B. It is not art acceptance or driving acceptance. No runtime, public, docs, browser, GPU or Blender writes/runs were used in this source study.

Integrate only `CourseGulfField.ts` and `events.ts`, using `integration.diff`. Do not copy `original/`, `control/`, typecheck mirrors, traces or earlier attempts into runtime. Root owns integration and actual-camera review after the frozen round30 verification.

## Actual-image diagnosis

Inspected `output/gauntlet/round-30-fork-foundry-v3-complete/{05-launch,launch-approach,launch-crest,launch-descent}.png` and the original `docs/inkstorm-overhaul/concepts/05-launch.png`.

The concept puts the viewer above a visible winding road and a deep, layered bowl. The runtime approach/crest keeps a broad sand foreground. The basin finally opens late in descent, with a smooth empty floor between two large side masses. This is predominantly real terrain occlusion, not a lack of small props or an incorrect screenshot preset.

`trace.ts` reconstructs `CinematicCamera.snap` with the actual receipt position, yaw, speed, real course lookahead and 1440/900 aspect. All four baseline eye positions match the captured receipts within 2.5e-14m. Existing chase eye height is approximately 7.3–8.5m above the subject; the live road preview is about 89m ahead at the captured 113.76m/s. The roadmap turns screen-left while the authored vista keeps a straight central 24-degree cone clear of added forms. The old road profile changes from zero grade into a 94m smoothstep descent over 600m, and its full-width 220m shoulder preserves a 440m-wide foreground shelf. Together these hide the center floor while leaving its unobstructed distant silhouette sparse.

The existing industrial district is intentionally off-center on three benches at launch-local forward 650/815/1000m and right 385/325/405m. This candidate leaves those sampled bench heights unchanged. It does not solve every remaining skyline/material/layering issue by adding more objects.

## One staged macro change

- Keep the horizontal route, checkpoint positions/progress, branches, start of the launch profile, basin end and final rejoin fixed.
- Move the physical rim 20m earlier: course distance 1313.759 → 1293.759m. This puts the actual `launch-crest` view at 1292.175m immediately before the drop.
- Replace the convex smoothstep descent with a concave profile, rounding its first 30m. The crest stays at -12.385m. The floor moves 44m lower, from -106.385 to -150.385m: a 138m descent over 600m, with the floor reached 20m earlier at 1893.759m.
- Excavate the straight bowl throat, launch-local forward(-100,1380)m, right(-250,250)m. The core is ±140m wide, with a 110m lateral fade and 12m transition beyond the protected route/normal footprint. Keep a full cell diagonal plus 1.5m beyond every legal lane/branch before the cut can start.
- Preserve the original 417×417 launch grid origin. Moving the grid center with the new rim would resample unrelated geology; this candidate explicitly prevents that. The 257×257 finish grid is byte-identical.

The rendered and physical ground remain the same field. `RaceSimulation` installs it in its course/terrain sampler; `TerrainSystem.setCourseGulfField` feeds the same Float32 arrays to `CourseGulfTextures`. Those stable R32F uniforms and the existing four-texel bilinear function are shared by terrain beauty, depth, normals and roads. No separate visual cliff, image panorama or collision exception is introduced.

## CPU evidence

See `cpu-receipt.json`, `baseline-trace.json`, `candidate-trace.json`, `longitudinal.json` and `profile.svg`. Positive margins mean the sampled terrain stays below a ray to a point 3m above the center floor.

| Actual view | Basin forward | Baseline margin | Candidate margin |
|---|---:|---:|---:|
| launch-crest |450m| -57.79m | +2.05m |
| launch-crest |600m| -28.49m | +3.73m |
| launch-crest |800m| -7.95m | +3.84m |
| 05-launch |450m| -51.35m | +3.15m |
| 05-launch |600m| -20.55m | +3.69m |
| 05-launch |800m| +1.76m | +3.79m |

Of 20 sampled road targets 150–1100m ahead, terrain-visible targets that are also in frame increase from 1 to 13 at the crest and 9 to 18 at main05. The earlier approach remains a pre-reveal view: its far bowl is still occluded. The nearest 300m floor is still hidden by the physical road lip. Some far floor targets remain marginal or occluded during descent; for example the 1000m target is -7.67m at `launch-descent`. These are explicit limits, not passed image gates.

The longitudinal trace samples every 2m through the launch/return and measures grade/curvature over 8m windows. Maximum absolute grade is **48.875%**, at 1357.759m. Maximum graph curvature in the entire measured region is 0.07304/m at 2869.759m, near the return to the existing base terrain. The full arrays retain the location and height of every sample so the launch curvature can be assessed separately from the rejoin. This is a much sharper launch than course8 and needs a real landing/recovery check.

The independent corridor audit used 4096 main stations, 477 branch stations at intervals ≤4m, five lane offsets and nine center/±0.85m/±1.15m normal taps: **205,785 probes**. Against baseline:

- Maximum delta outside the intended main-route range 1025.759–2881.759m: **0m**.
- Maximum delta on every sampled branch lane/normal footprint: **0m**.
- Actual changed main-route samples span 1204.022–2867.252m; maximum intended lane/normal delta 59.414m.
- Against the candidate profile with throat excavation omitted, the new throat causes **0m** change on all sampled legal lanes and normal taps.
- Three industrial benches, sampled at centers/corners/edge midpoints: **0m** height delta.

The main course signature remains `2dacfc90` because that identifies the horizontal plan. It does **not** make old ghosts compatible with the new physical heights.

## Edition and records

`events.ts` changes `MASTERY_GENERATOR_VERSION` from `inkstorm-course-8` to `inkstorm-course-9`. Keep `inkstorm-drive-4` and `inkstorm-rules-2`: this candidate changes authored terrain, not the vehicle integration constants or competition rules. If subsequent driving fixes alter those constants, bump the corresponding version too.

The existing storage migration retains old best times, lap/sector metadata and saved-course metadata in `archivedRecords`/`archivedFavorites`. It removes old ghost poses from active comparison and does not expose old favorites as new-edition events. It preserves historical results. `migration-audit.ts` verified old course8 and pre-existing course7 metadata, current course9 records, favorite migration and save/reload idempotence. This is the existing global generator-version gate, so it conservatively archives other event seeds as well. Existing 72-record/32-favorite archive retention limits remain in force; no storage format changes.

Apply the field and edition diff together, before starting any record-eligible run. Revert both if the A/B is rejected.

## Material/geometry/resource budget

No added mesh, vertex, triangle, material, draw call, light, texture, shader fetch or per-frame allocation. The same two R32F grids contain 959,752 bytes total. The launch grid changes 35,434 texels, with maximum absolute offset delta 142.667m; its final offset range remains [-170,250]m. The finish grid SHA is unchanged. CPU field bake was about 0.55s on this machine; this is an authoring measurement, not runtime performance acceptance.

Physical terrain displacement changes the existing road/surface normals and ground-dependent placement within the intended launch region. The byte-identical finish field and corridor guards preserve other sections; the actual vista/scanned forms still need camera review because grounding is derived from this field.

## Validation and next integration check

Completed before root's round30 timing quiet window: strict TypeScript candidate check, deterministic field bake, corridor/normal probes, same-origin/grid budget checks, camera reconstruction, terrain-only sightline tests, and archive migration audit. Source originals and all earlier CPU variants are preserved.

The ray tests step 3m and target road/floor +2/3m. They exclude existing meshes, racer, HUD and actual clipmap triangle interpolation. The corridor check is dense sampling, not a continuous swept-volume proof. GPU/MRT parity follows the unchanged shared-field topology but has not been newly read back for this candidate.

After the round30 freeze, root should take an isolated actual A/B at all four launch cameras and judge whether the opening is a material improvement before adding anything else. Then verify stock and tuned approach speeds, braking/boost at the lip, airborne duration, steering authority, landing contact/height error, damage/heat, AI recovery and return-to-road behavior through the 138m descent and 700m climb. Run CPU/render/MRT height-normal checks, the launch/branch/ownership regression suite, one record migration/reload flow, and performance/low-tier checks. Existing `launchElevationProfile.test.ts` 94m-drop and <31%-grade expectations are course8 assertions: do not silently weaken them; replace those expected course-profile values only after the new driving edition is accepted.

If actual A/B still lacks the concept's middle-depth hierarchy, reject or revise this macro opening as a whole. Do not treat these CPU margins as a reason to resume small prop-polish loops.

## Reproduce (CPU only, outside performance quiet windows)

From the repository root:

```sh
node --no-warnings --experimental-loader ./assets/source/inkstorm/launch-reveal-round31/cpu-loader.mjs assets/source/inkstorm/launch-reveal-round31/trace.ts
LAUNCH_CANDIDATE=1 node --no-warnings --experimental-loader ./assets/source/inkstorm/launch-reveal-round31/cpu-loader.mjs assets/source/inkstorm/launch-reveal-round31/trace.ts
node --no-warnings --experimental-loader ./assets/source/inkstorm/launch-reveal-round31/cpu-loader.mjs assets/source/inkstorm/launch-reveal-round31/audit.ts
LAUNCH_CANDIDATE=1 node --no-warnings --experimental-loader ./assets/source/inkstorm/launch-reveal-round31/cpu-loader.mjs assets/source/inkstorm/launch-reveal-round31/migration-audit.ts
node node_modules/typescript/bin/tsc --ignoreConfig --noEmit --target ES2023 --module ESNext --moduleResolution Bundler --strict --noUncheckedIndexedAccess --noUnusedLocals --noUnusedParameters --allowImportingTsExtensions --skipLibCheck assets/source/inkstorm/launch-reveal-round31/CourseGulfField.typecheck.ts assets/source/inkstorm/launch-reveal-round31/events.typecheck.ts
python3 assets/source/inkstorm/launch-reveal-round31/write-profile.py
```

The loader maps only candidate source imports. No runtime file replacement is required for this proof. Preserve the source hashes in `manifest.json`; the root workspace may advance while this candidate stays isolated.
