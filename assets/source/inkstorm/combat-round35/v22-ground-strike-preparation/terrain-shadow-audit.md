# V22 read-only terrain and shadow causal audit

Verdict: no metre-scale rendered-floor mismatch is supported at the V21 wreck location. The existing moving-player shadow bias can erase a narrow contact patch at the admitted 0.10–0.18 m source support clearance. It is a plausible secondary contact-readability defect, not enough evidence to attribute the broad shell suspension to shadows alone.

## Inspected evidence and limits

Viewed both original 1440×900 files individually: `hold-pts9.60.png` and `settled-pts10.92.png`. Both show broad engine shells separated from their large directional shadows; the second shows a similar arrangement after early motion has ended. Those images establish the recurring visual symptom, not metric separation. Compared source control flow and ran one 0.79-second CPU analytic probe at two recorded native capture poses (frame 923 and frame 1145). The receipt labels the latter capture “restored,” but its six shadow casters still describe the damage presentation; this audit uses its numeric pose only. These native capture poses are not claimed to be exact PTS alignments for the two reviewed video images.

No browser, WebGL/GPU readback, Blender, build, simulation stepping, source edits, or test-suite run. Vite was used only as a temporary in-process TypeScript module loader with no listening server; it was closed in `finally`. No process remains active. The probe samples terrain triangles on the CPU and does not emulate shader float arithmetic. Its sampled extrema are not global continuous bounds or complete engine-support witnesses.

## Actual height chain

- `GameApp.ts:384,424` constructs `RaceSimulation` from `sampleTerrainHeight` and the flagship seed. `RaceSimulation.ts:324–343` installs gulf and pit-pad fields internally, then wraps the result in the bridge sampler. `GameApp.ts:3226` supplies `race.terrain` to both the pose cache and authored breakup.
- The actual-geometry test fixture constructs the same seed (`1229867859`) without a supplied course, so its `sim.terrain` also contains those fields. Passing the base height function into the constructor does not omit runtime foundation offsets.
- `GameApp.ts:583–584,1435–1436` installs the exact race gulf/pit objects in `TerrainSystem`. `CourseGulfTextures.ts` uploads their original Float32 grids and reconstructs the same bilinear interpolation. `terrainShaderChunks.ts:340–369` samples the same procedural field and adds that offset to zero-height ground vertices. No negative visual-only ground translation exists. `GameApp.ts:1022–1027` sets both render origins to zero; `TerrainSystem.ts:149–155` translates only X/Z by the actual camera position.
- The near ring has 1.5 m cells, half-width 96 m (`TerrainSystem.ts:107–122`). Its two triangles use the A–C diagonal (`createTerrainRingGeometry.ts:110–121`). The probe reproduces this exact triangle interpolation at the recorded camera offset.
- The non-elevated road is a separate transparent ribbon at `terrainFields + 0.45 m` (`InkstormRoad.ts:41`). This raises the visible receiving surface and reduces clearance; it cannot explain hover by lowering the visible floor. Elevated roads correspond to the explicit bridge sampler, and no bridge is present in the measured local patch.

## Local analytic comparison

Same generated course signature as native receipt: `2dacfc90`. Each row samples 1,681 points on a 1 m grid within ±20 m X/Z of the recorded player. All points lie within LOD0 (largest camera-relative Chebyshev distance 50.66 m).

| Recorded frame | Mesh height minus continuous field | Gulf/pit offset | Bridge height delta |
|---|---:|---:|---:|
| 923 | −0.068867 to +0.055381 m | 0 / 0 m throughout | 0 m throughout |
| 1145 | −0.060628 to +0.051567 m | 0 / 0 m throughout | 0 m throughout |

At each player position, base procedural height, rendered analytic field and simulation height agree exactly (−12.806213 m and −12.805717 m respectively). The sampled negative triangle interpolation can add about seven centimetres of visual clearance, but does not support a missing multi-metre terrain foundation. The CPU and GLSL hash constants, octave transforms and region height formulas were also compared; no discrete formula mismatch was found. GPU arithmetic remains unmeasured.

The receipt’s scenery `maxDownwardPad = 49.45 m` is irrelevant to visible ground: `InkstormTerrainShadow.ts:109–115` lowers a private coarse *static shadow caster* to prevent its triangles from shadowing empty space. It is not the beauty terrain mesh, player shadow source or physics height.

## Shadow bias: exact contributor and practical implication

`InkstormRacerShadow.ts:305–307` copies each selected beauty source’s current `matrixWorld` into its borrowed-geometry proxy after the player world matrices update. Both native samples report six casters, zero omitted, six draws, 42,845 triangles, and no failure/skip. There is no stale original-root-only shadow transform in this path.

`InkstormRacerShadow.ts:223–224` chooses depth-axis bias `max(0.025, texel × 0.5)` metres and receiver-normal bias `max(0.06, texel × 1.5)` metres. The receiver shader first moves the receiver along its normal, then subtracts depth bias (`:38–43`). Native values imply:

| Frame | Shadow texel | Receiver-normal offset | Depth-axis offset | Flat-ground vertical equivalent |
|---|---:|---:|---:|---:|
| 923 | 0.101615 m | 0.152423 m | 0.050808 m | 0.190960 m |
| 1145 | 0.099035 m | 0.148553 m | 0.049518 m | 0.186111 m |

The last column is `normalBias + depthBias × normalizedSun.y` for a flat receiver and broad parallel caster; it is an analytic limiting case, not an exact visibility threshold for irregular fin geometry, sloped terrain, broad shading normals or PCF. It demonstrates why a near-ground source point at 0.10 m can lack a dark contact patch: its clearance is inside the receiver displacement/bias budget. This is a credible reason the detached engine support witness may be visually unconvincing.

`GameApp.ts:1169–1171` hides the local player’s fallback contact-shadow instance whenever this real directional map succeeds. Therefore `GroundContactShadows.ts`’s three generic hover ellipses neither follow detached masses nor provide local contact darkening in these successful player-shadow captures. They are not a second misplaced shadow under the player. Non-player wrecks still use that generic fallback and would need a separate audit.

Actionable follow-up: after the parent’s source support/body clearance audit, compare a private shadow-only candidate with smaller world-space biases at settled damage contact. Preserve existing ordinary-driving bias and caster bounds if the change is scoped to wreck presentation, and inspect acne as well as contact darkness in the actual native sequence. Do not lower the terrain or ignore complete-source no-burial checks to compensate. Do not expect bias tuning to correct a shell held up by long appendages or poor support distribution.

## Reproduction and pinned inputs

Run from `/Users/amir/Projects/PodRacing`: `node assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/run-terrain-shadow-probe.mjs`. The private TypeScript module reads the frozen V21 native receipt, reconstructs the same course and samples the exact LOD0 connectivity. `terrain-shadow-probe.json` retains full positions, extrema locations, native shadow data and sampler comparisons. `terrain-shadow-inputs.json` pins all inspected source and media files by SHA-256. The additional flat-ground-equivalent column is a direct scalar calculation using the same `SUN` vector.
