# Round29 workshop terrain grading

Status: CPU field and RaceSimulation integration are installed locally. Root owns the shared render uniforms, TerrainSystem sampling, explicit rigid anchors and actual in-game acceptance. No screenshot or performance result is claimed by this proposal.

## Observed defect and fixed source contract

The three actual diagnostic images under `output/gauntlet/grid-grounding-round29-before/` show procedural dunes entering the workshop interiors. Lifting the existing asset by 2.95 m and aligning its foundation exposes the authored repair equipment, but does not remove that terrain. Dense source-slab probes found ground as much as 9.834, 12.755 and 3.050 m above the corrected slab underside.

The slab is the existing rotated GLB footprint X[-71,79], Z[-32.5,28], centered at (4,-2.25), with local Y[0,1]. With the independent grounding fix, its underside is frozen center height +1.45 and its top is +2.45; the existing support top is +1.5. These are distinct planes. The grading target is frozen center height +0.9, leaving 0.55 m below the underside before interpolation. The rigid building, source assets, route, width, yaw, scale, checkpoint positions and camera positions are unchanged by this field.

Each pad stores the exact center height from the landscape before grading. Rendered buildings and foundations must use `field.anchorHeight(placement.id)`, including declined pads. The graded ground at an accepted center is approximately 0.9 m higher. Using that new height as a fresh rigid anchor would raise the whole workshop again; the explicit saved anchor prevents this feedback.

## Bounded shared field

`src/game/race/PitPadField.ts` creates one instance-owned, rectangular, one-metre R32F atlas. It is added after the unchanged signed combination of the two gulf fields. It never rewrites or resamples either gulf array. Bilinear CPU sampling and the GLSL twin read the same four float texels.

The full actual rotated source rectangle receives the core target. A three-metre collar and 32-metre quintic apron blend into the existing ground. The route mask has the same ten-metre lane margin and the existing four-metre normal/spline allowance, plus this atlas's cell diagonal. The remaining distance between slab and protected road determines the apron transition. The original fixed two-metre mask created nearly vertical banks and is preserved only in `rejected-steep-apron/`.

The route's full closing segment and all branches participate in protection. A separate check refuses a road entirely inside a slab; perimeter distance alone cannot detect that case. An unsafe pad is explicitly recorded as declined. Allocation is capped at 1024 texels per dimension and 524,288 texels total (2 MiB); an oversized atlas declines its eligible pads before allocating the field. Spatial buckets limit generation work to nearby route segments. Sampling after the bake never calls the original height function.

The flagship atlas is 330 × 537 (708,840 bytes / 0.676 MiB), with 68,179 nonzero texels and offsets from -14.548 to +14.647 m. It adds one sampler and four texture fetches per height query inside these small bounds, with an early bounds return everywhere else. It adds no geometry, draw calls or asset download. Existing broad dune lighting and local authored-normal sampling can consume the same combined offset. Beauty, depth, geometric MRT normals, roads, dust and shadow consumers must share the uniform objects. This is a cost budget, not measured GPU time.

The staged generation measurement including course and layout creation was approximately 110 ms for the flagship, 65 ms for seed 42 and 80 ms for seed 1234 in the final isolated run. These are local CPU timings, not race frame-rate evidence.

## Checks and their limits

`assets/source/inkstorm/pit-pad-round29/probe.ts` and `receipt.json` preserve the bounded study. Each pad has 9,362 source-slab samples, including its entire perimeter. All three flagship pads remain below the slab underside by at least 0.439, 0.527 and 0.446 m respectively. The diagnostic-camera study clips the actual indexed TerrainSystem triangles against each source slab and evaluates every resulting polygon vertex. Those existing rendered triangles remain below the underside by 0.457, 0.133 and 0.462 m respectively. Four additional camera/grid phases per view also remain clear. This is CPU displacement of actual geometry, not an actual GPU image; shader precision, material reading, foundation exposure and final visual quality still need root's captures.

All 619,800 original main-route, branch and normal-footprint probes across the three studied seeds receive exactly zero pad delta. The runtime tests additionally extend branch checks to their ten-metre shoulders plus all normal offsets. The preserved launch hash remains `0cb508909165f1c2fda5fbcd9c01c2a7b9db6915f78b8578b03571a8a96b649b`; finish remains `bd9da2b5038d659fc1622390f211ba5e42bacac2a90288b9aaf2656af03abffa`. Six thousand arbitrary atlas probes match the separate GLSL bilinear expression within 1e-8 m; all outer boundaries return exactly zero.

The road-facing banks are still steep. Their maximum sampled slopes fall from 8.97/6.07/5.75 to 2.89/1.96/1.66 m per metre. These are terrain banks, not accepted walkable service ramps. The fixed high rigid floor, nearby lower road and unchanged road shoulder limit how gentle this connection can become. Root should judge those edges in the actual workshop views before accepting them; physical grading alone does not establish a convincing service entrance.

Flagship pad 3 retains a protected low corner roughly four metres below its core target. It is clear of interior dune intrusion, but some foundation side remains exposed there. Seed 1234 pad 2 has a similar low-corner limitation. They must not be described as perfectly flat, fully filled pads.

| Seed | Accepted pads | Physical source coverage | Remaining limitation |
| --- | --- | --- | --- |
| 0x494e4b53 / flagship | 3 of 3 | All three full slabs clear; 15 exact/nearby camera mesh checks clear | Steep frontage banks; protected low corner on pad 3; actual rendering pending |
| 42 | 2 of 3 | First two full slabs clear | Third slab only 7.664 m from road edge, explicitly declined; its original interior dune remains |
| 1234 | 3 of 3 | All three full slabs clear | Pad 2 low-corner underfill; no actual camera mesh or GPU acceptance |

This is quantified coverage of three seeds, not complete expedition coverage.

## Integration boundaries and verification

CPU ownership: `src/game/race/PitPadField.ts`, `src/game/race/RaceSimulation.ts` and `tests/terrain/pitPadField.test.ts`. The simulator builds the original course first, installs its existing gulf, then freezes the pit descriptors against an explicitly pit-free height callback. `readonly pitPadField: PitPadField | null` is exposed separately. Caller-supplied courses receive null and retain their original height contract. No route or deck refresh follows the pad bake because every protected point receives zero offset.

Root render ownership: `CourseGulfTextures.ts` adds the new stable uniforms and texture lifecycle; `TerrainSystem.ts` adds `setPitPadField` and an allocation-free combined height-offset sampler; `GameApp.ts` installs/removes both fields together and preserves diagnostic camera anchors; `InkstormWorld.ts` and `InkstormFoundations.ts` use the saved rigid anchor. Shared offsets must reach both regular beauty normals and the existing geometric MRT/shadow contracts. No GameApp, TerrainSystem, uniform, foundation or world edit was made by the CPU task.

The focused CPU run passed 17/17 tests in `pitPadField.test.ts`, `courseGulfField.test.ts` and `inkstormPitDistrict.test.ts`; full project typecheck and `git diff --check` also passed. The isolated source additionally passed strict TypeScript checking and six synthetic guards for interior-road rejection, allocation caps, saved anchors, no callback recursion, determinism and bounds. No full test suite, build, browser, Blender or GPU job was run by this task. Original RaceSimulation source is preserved under `runtime-before/` and the two rejected grading candidates retain their receipts.

Before any freeze or performance claim, root must validate the combined render binding, recapture the exact workshop views with the saved original camera positions, obtain a fresh blind critique and measure the combined build. These CPU tests do not establish target-art parity or 40–60 fps.
