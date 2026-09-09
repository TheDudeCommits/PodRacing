# Launch surface joins — round 31 source revision

Apply only `integration.diff` to `src/game/race/CourseGulfField.ts`. This is a source candidate inside the unaccepted course 9. Runtime, public assets and shared documentation were not edited by this task. No browser, GPU or Blender was used. Root owns actual-image comparison, fresh critic, driving and performance acceptance.

## Diagnosis from actual images and source

Inspected `output/gauntlet/round-31-launch-candidate/launch-descent.png` and `launch-approach.png`, plus the launch review. The current throat cut lowers the surrounding land over just 12 m beyond a protected road footprint on a 6 m R32F grid. That resolves the entire bank across roughly two grid cells. Actual physical cross sections in the descent reach 8.1234 m vertical change per horizontal metre, making the side bank an almost vertical trench. The 6 m field and farther 12 m clipmap triangles then expose a faceted edge; the directional terrain shading makes the sun-opposed face dark. This is a real field feature, not evidence of a hole between road and terrain.

The road shader samples the same `terrainFields` as the terrain and adds 0.45 m. Its outer ribbon is lane half-width+4 m, inside the throat's lane half-width+9.985 m protected radius. Widening the road or covering the cut with decorative objects would not correct this physical bank.

The visible blunt near-left scanned-rock termination is a separate mesh silhouette/grounding concern. This field-only candidate does not claim that shape is repaired. Capture and inspect it again after this correction before changing the rock placement or source geometry.

The existing salt 650 m continuation guard also fails in the first course 9 candidate. Its target lies 1307.079 m along the track, just beyond the new early lip. Lowering that target reduced ray clearance at a preceding legal-lane point to 0.312574 m. The obstruction lies near distance 1264 m, 16.015 m lateral from center, inside a 30.603 m half-width lane. An exclusively off-road correction cannot fix it while retaining every current legal-lane height. Root authorized a small additional lip revision within the same unaccepted course 9; the 0.9 m sightline guard is retained.

## Narrow correction

- Change the throat bank blend from 12 m to 48 m: eight field cells give a continuous rounded shoulder, while the original legal-lane/normal protection mask remains intact. The basin target, horizontal domain, core width, industrial benches and grid bounds remain unchanged.
- Give only the first 30 m of the escarpment a longer leading radius. Begin with a 72 m radius expression, blend back to the original descent between 12 m and 30 m, and retain the original profile beyond that. This raises the salt sightline's target without lifting the whole 600 m descent into the opened basin view.
- Preserve the 138 m total descent, crest location, floor, basin end, return, horizontal course plan and edition 9 identity. No vehicle integration constants, camera settings, meshes or textures change.

A broad 60 m lip was rejected because it repaired the salt guard but obscured the crest 450 m basin target. A longer local 48 m rejoin was also rejected for that occlusion. Their source and receipts are preserved in `rejected-broad-lip60/` and `rejected-local-lip48/`. `attempt-48-unchanged-lip/` preserves the first shoulder-only trial and its lane-exact result.

## Source evidence

`acceptance-source.json` is the compact acceptance receipt. `probe-result.json` contains physical cross sections and terrain sightlines. `probe.ts` reconstructs the actual captured camera from receipt position/yaw/speed/lookahead; candidate subject elevation follows the changed physical ground. Its `cameraError` field is the candidate camera displacement from the original screenshot, not a reconstruction error. Its `am` and `bm` values compare old/new terrain from that same candidate camera; only `bm` is the reported candidate ray margin.

- 205,785 discrete legal-lane/normal probes: 184,320 main and 21,465 branch.
- Only the intended lip changes on sampled legal lanes, at distance 1288.023–1330.958 m. Maximum sampled lane/normal change 1.132533 m. All other main and all branch samples remain exactly unchanged.
- Maximum centerline grade over 8 m windows sampled every 2 m stays 48.8754%, at 1357.759 m. This is not proof of landing feel or the maximum continuous derivative.
- Salt sightline margins for 150/250/350/500/650 m targets: 2.03891/2.38621/1.88344/1.58710/1.03923 m. Existing thresholds 1.4 m and 0.9 m remain unchanged and pass.
- Crest 450/600/800 m basin margins: 1.11063/3.65290/3.84424 m. Main 05: 3.14864/3.69473/3.79328 m. All six remain greater than 1 m.
- Sampled worst lateral grade at distance 1600 m falls from 8.12342 to 2.98250. Some other steep landform slopes remain; this does not claim a uniformly gentle off-road surface.
- 1307 launch texels change. The final launch field SHA256 is `e707c9c9a1774cb6ccd38fcfb32321ac841ae6a189eb15d7ed9c4426c4120f7d`. The finish field remains byte-identical, SHA256 `bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`.
- Grid origin/resolution/bytes unchanged. No new mesh, texture, draw call, shader fetch or per-frame work.
- Strict standalone TypeScript and `git apply --check` passed. The isolated source compile uses `CourseGulfField.typecheck.ts` with imports redirected to the original runtime types; do not install that mirror.

Commands run from the repository:

```sh
JOIN_CANDIDATE=1 node --no-warnings --loader ./assets/source/inkstorm/launch-surface-join-round31/cpu-loader.mjs assets/source/inkstorm/launch-surface-join-round31/probe.ts
JOIN_CANDIDATE=1 node --no-warnings --loader ./assets/source/inkstorm/launch-surface-join-round31/cpu-loader.mjs assets/source/inkstorm/launch-surface-join-round31/audit.ts
node_modules/.bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution bundler assets/source/inkstorm/launch-surface-join-round31/CourseGulfField.typecheck.ts
git apply --check assets/source/inkstorm/launch-surface-join-round31/integration.diff
```

Actual images, complete runtime tests, repeated input-only driving/landing, human feel and performance remain untested for this revision. Terrain rays exclude mesh occlusion and clipmap tessellation. Dense corridor probes are not a continuous swept-volume proof.
