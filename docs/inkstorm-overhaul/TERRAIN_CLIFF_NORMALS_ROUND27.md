# Local cliff lighting gradient — round27 candidate

Status: integrated local source candidate with actual static captures and fresh criticism. Moving-camera stability and full-race timing remain pending. This note does not award an art score or acceptance.

The previous terrain lighting gradient averaged the complete height field over a forward probe that widened from 9.5 to 48 metres with camera distance. That was useful for quieting fine procedural dunes in wide shots. It also averaged an authored cliff face together with the neighbouring ledge or ravine. Candidate2 launch geometry can therefore have a sharp face while its lighting suggests a rounded surface, or even lights the wrong side of a recess.

## Diagnosis

The CPU study reuses the saved round26 cameras and candidate2 terrain-only first-hit probes. It compares the existing lighting gradient with a 0.85 metre central-difference physical normal, then tries authored-only probe radii of 6, 9.5, 12 and 18 metres while preserving the broad procedural gradient.

The selected 6 metre candidate gives the following results on probes classified as cliffs by physical normal Y < 0.65 and absolute authored offset > 8 metres:

| Saved region | Cliff probes | Median original probe radius | Median angular error before | Median angular error with local authored gradient |
| --- | ---: | ---: | ---: | ---: |
| Main launch, west front | 98 | 22.45 m | 16.72° | 3.11° |
| Main launch, east front | 96 | 14.66 m | 17.99° | 5.71° |
| Crest, west front | 108 | 26.05 m | 25.72° | 5.73° |
| Crest, east front | 93 | 16.07 m | 17.75° | 5.55° |
| Descent, west front | 97 | 14.96 m | 10.21° | 3.77° |

Probe-radius medians above include all first hits in each region; error medians include the classified cliffs. There are 560 saved first hits and 492 classified cliff probes. The recorded radius range is 11.07–43.09 m. The median absolute change in sun-facing dot product is 0.065–0.115 depending on region, large enough to warrant actual visual comparison.

These are analytic samples at ray-hit positions. The study does not reproduce GPU vertex interpolation, full-scene occlusion, pixel shading or animation. Some tight features still have large error, up to 76.85°, with the selected forward stencil. These results support testing the cause; they do not establish visual parity or prove every face is corrected.

## Source change and limits

Only `src/render/terrain/terrainShaderChunks.ts` changes in runtime source. The existing full-height broad gradient is retained, its broad signed-field component is subtracted, and a local 6 m signed-field gradient is added. This matches the physical field's bake spacing. The material's authored-grade varying now uses that local gradient too, keeping stone across physical cut/fill zero crossings.

The untouched procedural dunes keep the original arithmetic when authored offsets are zero. The two added samples are bilinear and feed interpolated vertex normals; the change does not use flat triangle normals, quantized slope bands or a new noise layer. CPU continuity checks cover physical field texel boundaries. Actual moving-camera inspection is still needed to rule out an undesirable visible grid or phase effect.

The shared `TERRAIN_GLSL` displacement source is byte-identical to the saved predecessor. Field textures, physical heights, geometry, cameras, terrain shadows and course collision are unchanged. The custom MRT geometric normal in GameApp remains at its existing 1.15 m probe; it is intentionally independent of the beauty lighting normal. No GameApp edit is required. The standalone terrain normal/debug material uses the shared beauty vertex shader and therefore sees the improved lighting normal.

The added cost is two signed-field sampling calls per terrain vertex: up to 16 additional `texelFetch` reads if both field grids contain the sample, or 8 for one active grid. Out-of-grid samples return before fetching. There are no added meshes, draws, textures or render targets. Runtime cost has not been measured. Do not infer 40–60 fps from the absence of additional draws.

## Evidence and checks

- Source backup, CPU study, full per-probe diagnosis and receipt: `assets/source/inkstorm/terrain-cliff-normals-round27/`.
- Reproduce the read-only study: `npx --no-install tsx assets/source/inkstorm/terrain-cliff-normals-round27/study.ts`.
- 24/24 tests passed across authored lighting, terrain math, regions, physical gulf field and authored detail tests. Typecheck and `git diff --check` passed.
- New lighting tests cover unchanged natural dunes, six recorded shelf-crossing normal failures, continuity at field grid boundaries and shared terrain material shader wiring. They are CPU/reference and source-wiring checks, not GLSL execution tests.
- No browser, Blender, build, GPU capture or performance run was performed for this candidate by the terrain-normal task.

Next acceptance step: compare main launch, crest and descent in-world screenshots against the preserved candidate2 camera set, inspect a moving pass for grid/phase artifacts, then include the retained source in the final frozen race performance run. Revert only this candidate if it creates visible faceting or fails to materially improve the cliff forms.

## Root capture and independent review

Root captured `output/gauntlet/round27-cliff-normal/`: 12 actual images at bundle SHA `852a385778300327e717eef7eea3871265132fcad8abfa4bb01aa3b92e99cfe0`, including launch, crest and descent, with zero browser errors. `BLIND_ART_ROUND27_CURRENT.md` retains the candidate at 5.5 versus 5.0 for the preceding normal field, but fails the 8 target. Cliff edges read more clearly; broad scalloped walls, missing intermediate depth and sparse settlement remain. This paired review supports retaining the lighting change, not claiming the landscape is finished. The short initial GPU query probe is documented separately in `GPU_FRAME_PROBE_ROUND27.md`; it does not replace full-race or moving-cliff visual checks.
