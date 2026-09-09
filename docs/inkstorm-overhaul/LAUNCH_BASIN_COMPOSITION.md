# Launch basin composition revision

The launch's actual descending race lane is retained. This revision removes the far off-road dune bank that hid the basin, moves the industrial destination to the right, and stages six cliff forms plus two smaller industrial terraces at different depths. It changes world terrain and geometry; it does not move the camera or edit capture poses.

## Physical landscape

The previous straight-ahead field returned to almost unmodified terrain around 800–1000 m beyond the launch. A broad fan now lowers that off-road sightline through approximately 1250 m, with a graded landscape return from 1280–1560 m. Three clipped-corner terrace masks interrupt the fan at unequal lateral positions and elevations. Existing lower terrain wins through `min`, so this operation never raises a previously excavated area to invent a platform.

| Distance along the real launch tangent | Previous physical height | Revised physical height |
| --- | ---: | ---: |
| 600 m | -132.56 m | -169.58 m |
| 800 m | -16.80 m | -160.55 m |
| 1000 m | -8.89 m | -168.89 m |
| 1200 m | 3.81 m | -156.19 m |
| 1400 m | -5.84 m | -106.96 m |

The field still uses the existing 417-square launch grid and 257-square finish grid at 6 m spacing: **959,752 bytes, two R32F textures, no new shader sampler or per-frame allocation**. Combined offsets remain in [-170, 0] m; outer border texels remain zero. Existing terrain/road/normal/shadow consumers receive the same field through their established shared uniforms. Existing bounding volumes and texture disposal remain valid. Beauty normal lighting continues to use its wider 9.5–48 m approximation; the exact normal-preservation statement below applies to CPU/MRT probes.

The new fan contribution is zero inside the original conservative protection capsules around **every main and branch lane**, including the authored descent. Protection contains the entire lane, a 10 m margin, a full texel diagonal and the extra normal/filter margin. Applying `min(existingOffset, zero)` therefore retains the previous physical value exactly, including nonzero offsets in the playable descent. The 94 m descent, basin crossing, return grade, horizontal route, checkpoints and bridge joins are unchanged.

An independent comparison against the saved pre-revision field sampled **532,296** main/branch positions across lane widths and their 10 m margins, including ±0.85 m and ±1.15 m normal probes. Maximum offset difference was exactly **0**. Both IEEE754 sample streams hashed to `03f5f2fffd8164c1d68e31a764f140c003ab6b360a8acc5f84d8c11f30718742`. The retained regression independently bakes the new contribution into an empty grid and asserts zero throughout these same protected regions.

## Scenic staging

The citadel now sits 1200 m along the representative launch tangent and 380 m to camera-screen right (negative course-right). Its enclosing 330 m disk still clears every canonical and branch corridor. Three unequal founded terraces replace the single large pedestal; the major tanks, gantry and process towers retain their established skyline. An interim actual frame exposed tall rectangular foundation walls. The revision shortens the metal bases to 17–66 m and raises four broad cliff cores from their sampled local ground to the stepped terrace undersides. This rock-supported revision still needs the next actual frame.

Six deliberately placed landforms occupy depths of 120, 300, 730, 820, 1110 and 1260 m. They alternate broad masses and split-spire accents through asymmetric positions and proportions. Each uses an enclosing disk derived from the existing GLB X/Z bounds; independently sampled full-route checks require at least 8 m clearance. Two of the middle/far broad forms support smaller service outposts, with real platforms and founded legs reaching local ground. Their geometry is merged into the citadel batch. The former circular ring of ten equal citadel rocks is replaced by four unequal founded cliff cores, including a lower front step; their enclosing footprint remains within the original 330 m citadel disk.

The new placements use the current `canyon-buttress` and `fractured-spire` families and the existing instanced LOD path. No public GLB, source scan, vehicle, material, camera, or capture script was changed. The scanned-geology owner confirmed that its proposed drop-in preserves canonical X[-40,40], Y[0,120], Z[-50,50] bounds; root owns any acceptance and public integration. The separate vista meshes, including both smaller outposts, total **10,724 triangles in three draw calls**. The four citadel rocks plus six new landforms replace ten prior citadel rocks, retaining the same count of those instanced cliff placements.

The broad basin is shared physical terrain. Cliff and settlement meshes follow the existing view-only vista contract outside the proven driving corridors; this is not a new driveable settlement or a claim that every off-road decorative mesh has a collider.

## Validation and remaining acceptance

**43 tests passed across six focused files**: launch composition, launch elevation profile, shared gulf field, vista geometry, bridge surface and course. They verify the low central physical sightline out to 1150 m, exact protected contribution, original grades and joins, CPU/GPU height agreement, texture lifecycle/bounds, deterministic seed behavior, projected right-side landmark position, six distinct depths, two outposts, actual primitive containment and geometry budgets. Typecheck and targeted diff checks passed.

Source and numeric evidence: [launch-basin-revision.json](../../output/terrain/launch-basin-revision.json). Its before/after comparison is a one-off audit against the saved source hash; the committed-style regression uses the independent empty-grid contribution check and does not depend on a temporary baseline file.

No browser or production build was run by this subtask. The parent made an interim build before the final outpost and rock-support adjustments. The interim image was inspected, and its exposed foundation defect directly prompted the shorter metal bases and founded cliff cores. Required next evidence is a fresh combined in-world launch frame, a moving descent/landing view, and blind composition review. Numeric sightline clearance and projected placement do not establish concept-art parity. The existing full-lap handling evidence is still relevant because the lane and local physics probes are exactly unchanged; this subtask did not claim a new input-driven lap or FPS run. Off-road recovery terrain has changed and should receive the parent's normal course-version review.
