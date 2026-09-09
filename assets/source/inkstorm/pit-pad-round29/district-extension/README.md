# Staged district grading extension — not integrated

`PitPadField.ts` extends the existing atlas to `pit-district` foundations at centered local X[-60,60], Z[-18,18], respecting each placement's yaw and X/Z scales. The four flagship placements remain at .0085, .026, .044 and .048. Their exact pre-grade center heights are frozen, the target is anchor +0.9 m, and the district underside check uses the existing +1.55 m visual base. No layout, road, asset, runtime, public, dist or test file was modified for this extension.

The candidate is `dda4d4438e96733e726d55ae71226596d53362ddbadad86609d56c51434565fd`. `probe.ts`, `receipt.json` and three seed-specific float arrays preserve the evidence. The first straightforward extension is saved in `rejected-pit-mesh-intrusion/`: it cleared district physical samples but let a six-metre terrain triangle rise 4.51 m into the already accepted second pit. That candidate must not be integrated.

The current candidate first constructs the identical pit-only field, then prevents new district fill from raising that surface within eight metres of accepted pit footprints, fading the restriction out to 24 metres. This happens only during the bake. One final atlas and the existing four-fetch GPU sampler remain. The extra buffer preserves all existing pit core samples (exactly on the flagship, within 2.85e-14 m from double-coordinate arithmetic on the other studied seeds), and restores the previous pit mesh clearances.

The flagship atlas grows from 330×537 / 708,840 bytes to 344×702 / 965,952 bytes: +257,112 bytes, no extra samplers, draw calls or triangles. The existing 1024-per-axis and 2 MiB allocation guards remain. The separate measured candidate bake is approximately 237 ms on the flagship, 143 ms on seed 42 and 203 ms on seed 1234. It includes the temporary pit-only bake and buffer composition; these are CPU generation timings, not FPS evidence.

## Bounded evidence

- All four district foundations have 9,362 dense physical samples, including full edges, and every sample is below the underside. Minimum clearances are 0.635/0.632/0.627/0.514 m respectively.
- Actual indexed terrain geometry was clipped against every flagship pit/district rectangle at all seven exact captured poses and four nearby grid/camera phases each: 35 checks. All remain clear. District exact-pose clearances are 0.637/0.633/0.625/0.558 m. The prior pits retain their 0.457/0.133/0.462 m exact-pose clearances.
- All 641,400 main/branch, ten-metre shoulder and normal-offset probes across the three seeds receive literal zero pad offset. Both frozen gulf arrays remain byte-exact; the original signed-field combination is unchanged.
- Every district center had zero previous pit offset on all studied seeds, so the new saved anchors match the current rendered district anchors. No rigid transform adjustment is needed.
- The source passed strict isolated TypeScript checking. The probe assertions passed. No GPU/browser/Blender/build/full-suite run was performed for this candidate.

| Seed | Layout-generated districts | Graded districts | Other decline |
| --- | --- | --- | --- |
| Flagship | 4 | 4 | None |
| 42 | 2 | 2 | Existing third pit remains declined for shoulder conflict |
| 1234 | 3 | 3 | None |

This is coverage of existing placements on three seeds. It does not add missing districts to expedition layouts or claim complete procedural coverage.

## Remaining visual issues

The first district lies beside a much lower existing pit. The protective buffer leaves an existing low-ground strip beneath its foundation: 2,173 of 9,362 samples are over 0.5 m below the district target, 1,905 over 2 m, and 1,582 over 5 m; its lowest point is approximately 9.92 m below target. This keeps the neighboring pit clear but leaves substantial foundation exposure. It is not a uniformly filled district pad or an accepted service entrance. The other flagship district cores are within 0.14 m of target.

Road-facing banks and transitions between unequal pads also remain steep. The largest four-direction apron sample reaches 3.41 m/m on flagship district 2; individual expedition samples reach roughly 6.05 m/m. These need actual image critique and possibly authored retaining/step treatment. Do not claim smooth walkable ramps or target-art parity from these clearance checks.

## Proposed integration, only after root chooses this candidate

Copy the staged field implementation into the existing CPU module, preserving the earlier module in its receipt. The public class gains `family` and `slabBottomOffset` descriptor fields but retains its constructor/factory, atlas, sampler and anchor interfaces. RaceSimulation and the sampler/uniform binding need no further API change.

Root must expand the saved-anchor lookup in both `InkstormWorld` and `InkstormFoundations` to include `pit-district`. The current callback already reaches the field via GameApp; only its family restriction needs expansion. Otherwise, the raised district ground would lift the rigid district a second time. Keep diagnostic poses based on the saved old anchors and compare full camera arrays and instance matrices again.

Existing pit footprint tests must stay intact; add the centered district footprint case and the adjacent lower-pit regression. Re-run the focused CPU/render contracts, actual district and pit poses, the staged GLSL sampler diagnostic, then the independent visual review. This candidate is ready for that decision and has not been applied to runtime.
