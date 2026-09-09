# V22 settled pose: support versus visible underside

The reconstructed rear engine has a source-vertex minimum clearance of **0.100 m**, but its own casing hides that point from the recorded camera origin. The ray meets that casing **0.894 m before the support point**. A selected lower-face centroid with an unobstructed vehicle-only ray is **0.633 m above terrain**. This supports a specific cause of the apparent separation: the rear engine's low support is behind its visible casing. It does not establish that the whole assembly is elevated, or that every engine's support is hidden.

| Engine mesh | Minimum source-vertex gap | Minimum-point ray | Vertices at gap ≤ 0.45 m | Unobstructed selected lower-face gaps |
| --- | ---: | --- | ---: | ---: |
| `teemto-engine-left-body` | 0.180 m | Unobstructed by vehicle | 352 | 0.299 m (1 of 12 candidates) |
| `teemto-damage-right-front-v16` | 0.180 m | Unobstructed by vehicle | 130 | 0.194–0.442 m (3 of 12) |
| `teemto-damage-right-rear-v16` | 0.100 m | Hidden by its own casing | 964 | 0.633 m (1 of 12) |

These counts describe source vertices and selected triangles, not supported area or the proportion of visible casing. Left and front minima have unobstructed vehicle-only rays, so the rear result must not be generalized to them. All clearances are against `race.terrain.heightAt` at the measured world X/Z.

## Pose and camera association

- Image: `output/playwright/round35-combat-v22/temporal-review/settled-pts12.24.png`.
- Closest associated native sample: frame **1067**, wall **12316.8 ms**, wrecked and effectively stationary. The image/native clock association is approximate: first visible cut PTS 10.40 versus estimated native wall 10467.1 ms. This is not an exact image-frame synchronization claim.
- Recorded simulation base position: `[18600.146944912514, -10.401951432896295, 15.075286382043856]`.
- Recorded camera position: `[18632.55712714071, -5.134568943024893, 43.17454624485601]`.
- Camera horizontal direction from base: `[0.7555686678424175, 0, 0.6550694529397891]`; elevation from that base is **7.001°**. This is a low view relative to the simulation base, not a measured screen angle to the ground-contact point.
- The deterministic fixture reproduced the recorded simulation base position with **0 m error**. Orientation and rendered wreck-parent pose were reconstructed from source because the native sample did not record the complete quaternion. The rendered parent is at `[18596.473731799586, -12.061554104096663, 16.392554518829755]`; confusing it with the recorded simulation base would misplace the casing.

## Bounded method and limits

One hero fixture was stepped once to frame 1067 using the existing brake-held schedule and seed. It loaded the original hero geometry and V16 authored damage geometry, with original binary geometry and transforms retained. Image/material references were removed only from an in-memory load copy. Current V23 source supplies the same V22 engine pose transforms; its additional cosmetic footprint edges do not change this geometry.

For each of the three major engine meshes, the probe measured every source vertex against the runtime terrain sampler. In each of six longitudinal source-axis bins it selected the two camera-facing triangle centroids having the lowest mean vertex gap, then measured each centroid's terrain clearance and cast a ray from the recorded camera. Twelve candidates plus one minimum-point ray per mesh produced **39 rays total**. Rays tested the visible vehicle meshes using their composed world transforms, ending 15 mm before the target to avoid numerical self-intersection.

This is a sparse lower-face diagnostic, not an exhaustive visible silhouette or global minimum over triangle interiors. An unobstructed vehicle-only ray does not establish visibility through scenery or terrain, or inclusion in the native camera's screen bounds. Camera orientation, rasterization, shadow-map sampling and exact pixel gaps were not measured. The prior terrain/shadow audit remains separate; no fresh shadow-bias or rendered-floor measurement was made at frame 1067. The result supports hidden rear support and a higher camera-facing casing sample without assigning the whole perceived gap to shadows or floor mismatch.

The isolated in-process Vite loader completed in approximately one second and closed. No browser, server listener, build, GPU work, live source change, new test suite or further sweep was performed. **CPU released.** Full measurements and occluder identities are in `result.json`; reproduction source is `probe.ts`, `fixture.ts`, and `run.mjs`.
