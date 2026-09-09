# Round30 road-level paddock study — V3 shared court remains declined

The original `docs/inkstorm-overhaul/concepts/01-grid.png` depicts a largely continuous service court: workshops open directly toward the race surface, with low thresholds rather than tall platforms and long stairs. Lowering the existing whole-kit Y anchors substantially reduces several central entrance height differences, but **does not produce that coherent paddock under the current fixed footprints and protected road**. The final top-level source/data is V3 with a shared courtyard for the overlapping pair. It passes the measured terrain-clearance checks but remains declined for the requested art. It must not be copied into runtime as an accepted replacement.

All work is staged in this directory. No runtime, public, source asset, layout, road, shader, terrain geometry, browser, GPU or Blender changes were made. CPU measurements began only after the parent's round29 benchmark release. The old round29 field is preserved as `round29-reference.ts`; V1, independent V2, shared V3 with the narrow fade, and its failed broad-fade check are preserved in the four `rejected-*` directories.

## Final bounded shared-court trial

The parent requested one common **walking-floor height**, accounting for the different source offsets, for pit 216 and district 218. V3 minimizes the worst endpoint grade over the two primary entrance strips plus the outer bay contacts, then applies the protected-floor feasibility bound. The common walking floor is **-15.9098131741 m**. Pit anchor = **-18.3598131741 m**; district anchor = **-17.4098131741 m**. Thus the actual pit slab top and district courtyard top coincide despite their 2.45 m and 1.5 m offsets. Source X/Z/yaw/scales and all road guards remain unchanged.

| Pair metric | Old29 | Independent V2 | Shared V3 |
| --- | ---: | ---: | ---: |
| Absolute walking-floor difference | 8.958 m | 13.690 m | 0 m |
| District 218 low-ground deficit below target | 9.919 m | 14.658 m | 0.968 m |
| Largest walking-floor-to-core-ground span | 10.519 m | 15.258 m | 1.579 m |
| Worst straight grade at the identical three bay contacts per kit | 99.5% | 62.1% | 54.3% |
| Pit 216 maximum central-front physical slope | 2.011 m/m | 1.324 m/m | 3.104 m/m |
| District 218 maximum central-front physical slope | 0.628 m/m | 1.072 m/m | 6.551 m/m |

The shared-floor optimizer's more densely sampled entrance strips impose a slightly stronger **56.37%** endpoint lower bound than the three-bay comparison's 54.3%. These are compatible measurements over different sets, not a 2% improvement claim. For the physical-slope comparison, `old29-front-profiles.json` resamples the frozen old29 field at exactly the same five entrance rays and quarter-metre stations used by V2/V3.

Relative to old29, V3 lowers pit 216 by **4.746 m** and district 218 by **13.704 m**. Relative to independent V2, it raises the pit **5.552 m** and lowers the district **8.138 m**. The district's three bay contacts are now 6.206 / 7.984 / 9.507 m above the courtyard. Pit contacts are 2.630 / 5.703 m below, and 1.278 m above its floor. This removes the incompatible shared edge, but turns the district frontage into a deep cut and worsens its approach substantially. It does not provide short, near-level entries.

All seven V3 physical cores and all 35 exact/phase indexed-mesh checks still clear. The pair's minimum indexed clearances are 0.527 m and 0.635 m. The other two seed float arrays remain byte-identical to V2 because this is an explicitly bounded flagship group, not a new procedural grouping policy. The atlas allocation is unchanged from V2.

One final profile check restored the original broad road-side fade with this same shared floor and unchanged zero-field band. It reduced the pair's maximum central-front physical slopes to **1.014 / 1.362 m/m**, but made terrain enter pit 216's indexed slab by up to **0.473 m** across phases. That version is preserved as `rejected-shared-v3-broad/` and is not the top-level candidate. The top level retains the mesh-clear narrow-fade V3 for exact review, with **art acceptance still declined**. No further searches or hidden source changes followed this bounded comparison.

`comparison.json` and `compare.mjs` provide the requested old29/V2/V3 comparison for every plot, using identical native-ground contacts. The figures below describe independent V2 as the historical baseline; the two shared V3 anchors above supersede only its pit216/district218 rows.

## V1/V2 implementation and retained V3 contracts

`PitPadField.ts` retains the existing factory/class, 1 m atlas, four-texel bilinear CPU sampler and the exact `PIT_PAD_GLSL` string. It keeps the original allocation limits: 1024 per dimension and 524,288 float texels / 2 MiB. No new sampler, GPU fetch or draw call follows from this field.

For each existing plot it traces five frontage rays across the primary entrance, at offsets -4/-2/0/+2/+4 m. It records ungraded ground where those rays first approach 13.5 m beyond the nearest main/branch road edge. This is inside the unchanged zero-field band, with sufficient room for the four texels to remain zero. The initial requested floor is the median of those five elevations +0.15 m. The actual pit floor is anchor +2.45 m; the district courtyard is anchor +1.5 m. The new rigid anchor subtracts the relevant floor offset. It never resamples its own graded center.

V1 used the old broad road-facing fade. This cleared six physical cores but produced +1.175 m indexed-mesh intrusion at pit 216 and +6.115 m physical intrusion at pit 217. The failed data is preserved; it is not hidden by a later anchor change.

V2 keeps the original protected radius of `10 + sqrt(2) + 4` m beyond the road edge and the original two-metre fade width. It holds the field nearer full influence until that band to preserve the terrain vertices beside lowered slabs. It also computes a minimum anchor from source-perimeter points where the protected field cannot fully lower the terrain, retaining a 0.3 m physical underside margin in that analytical constraint. These changes fix the measured burial but can leave sharp physical apron slopes; that is explicitly separate from visual or service-access acceptance.

The new field uses a 16 m front, 32 m side and 48 m back influence beyond its 3 m collar, shifting the larger excavation transitions toward the sides and rear. The old recursive pit-only field freeze is removed. All seven new anchors are chosen before the bake; their targets are blended without family priority and simultaneously cap upward neighboring influence within an 8 m guard, fading out to 24 m. This retains one atlas and avoids an old high or low pit field silently constraining the new district anchor. It cannot make conflicting overlapping floor planes identical.

`accepted` on a pad retains its old narrow meaning: footprint/allocation acceptance. It does **not** mean road-level art acceptance. In particular, pit 217's protected-floor lift and district 218's low strip remain visible design failures even though both stay below their slabs.

## Measured independent V2 baseline

| Plot | Requested floor Y | Retained floor Y | Rigid Y change | Smallest indexed-mesh underside clearance across five phases |
| --- | ---: | ---: | ---: | ---: |
| pit 215 | -6.953 | -6.953 | -15.484 m | 0.434 m |
| pit 216 | -21.462 | -21.462 | -10.298 m | 0.527 m |
| pit 217 | -15.323 | -8.729 | -4.362 m | 0.263 m |
| district 218 | -7.772 | -7.772 | -5.566 m | 0.635 m |
| district 219 | -16.796 | -16.796 | -8.048 m | 0.631 m |
| district 220 | -16.798 | -16.798 | -7.357 m | 0.625 m |
| district 221 | -7.015 | -7.015 | -1.737 m | 0.524 m |

- All seven flagship footprints have 9,362 physical probes each, including full edges: 65,534 samples, none above the source underside. Minimum physical clearance is 0.305 m at pit 217.
- The actual indexed terrain was clipped against every candidate-adjusted slab rectangle at the unchanged seven camera origins and four nearby mesh phases each: 35 checks, all clear by over 0.1 m. This is CPU evaluation of real indexed geometry, not an in-game screenshot or GPU render. Nonflagship indexed-mesh review is explicitly `null`, not passed.
- Every candidate matrix preserves all components except index 13, its Y translation. X/Z/yaw/scales and placement count remain unchanged. The original camera receipts are copied here as `camera-inputs-pits.json` and `camera-inputs-districts.json`.
- All 641,400 main/branch, ten-metre shoulder and ±1.15 m normal-offset probes over flagship, seed 42 and seed 1234 receive literal zero field offset. Both gulf arrays remain byte-exact. Seed 42's existing third-pit decline is retained; no new plot is invented.
- The new flagship atlas is 374×711 / 1,063,656 bytes, an increase of 97,704 bytes over the integrated district stage. Seed 42 uses 896,456 bytes; seed 1234 uses 1,353,820 bytes. All remain within the existing limits.
- The staged field passed strict isolated TypeScript checking. The final numerical probe completed with its invariant assertions. The copied sampler arithmetic agrees at 6,000 fractional points to below 4e-12 m; an actual GPU sampler run was not performed for this candidate.

The final receipt contains measured candidate-only generation timings, which are CPU study timings with other work present. They are not FPS acceptance. No full test/build/race suite was run by this subagent for the stage.

## Why the result remains declined for the requested art

**Pit 217 cannot use the intended lower floor under the retained guard.** At pad-local X=-75, Z=30.25, the original terrain is approximately -10.028 m and the actual course projection is only 15.489 m beyond the road edge. V1's requested floor was -15.323 m. V2 must raise that floor by 6.594 m to protect the corner; its central frontage remains about 6.69 m lower. The corner is still outside the legal racing shoulder, but inside the deliberately retained terrain-filter guard. The study did not narrow that guard.

**The actual pit 216 and district 218 foundation rectangles intersect.** Polygon clipping measures 4.1548 m² of overlap. In district 218's pad frame the overlap is the triangle approximately (-43.2,5.108), (-42.555,18), (-43.2,18). Their individually road-fitted floors differ by 13.690 m. Consequently, one shared terrain surface cannot be a flat plane close to both floors over the intersection. The conservative mesh ceiling leaves district 218 ground up to 14.658 m below its own target. Pit 217 also receives a low strip from a lower neighbor, up to 7.120 m below target. These are not uniformly filled pads.

**A single rigid Y plane does not match all three bays along several kits.** `constraints.json` measures the original ground at each bay's road-facing contact. The table below is a necessary lower bound on the steepest straight entrance grade even if the common floor could be placed at the mathematically best Y and all intervening terrain were favorable. Actual humps, floor undersides, corner constraints and adequate ramp width can only make it harder.

| Plot | Contact ground spread across three bays | Best possible maximum straight-entry grade | Best common floor from endpoints only |
| --- | ---: | ---: | ---: |
| pit 215 | 4.639 m | 14.7% | -8.861 m |
| pit 216 | 6.981 m | 32.5% | -18.204 m |
| pit 217 | 5.024 m | 27.9% | -13.687 m |
| district 218 | 3.301 m | 9.6% | -8.077 m |
| district 219 | 5.130 m | 15.1% | -14.407 m |
| district 220 | 13.489 m | 39.7% | -10.270 m |
| district 221 | 1.308 m | 4.0% | -7.117 m |

District 220 illustrates the problem particularly clearly: its central bay contact is near -17.014 m while its right bay contact is -3.525 m. A center-only anchor appears level at one door while leaving the other door more than thirteen metres below adjacent ground. That does not match the continuous court in the concept.

The physical apron itself also remains steep in places. The maximum sampled central-front slope reaches about 3.42 m/m at pit 217 after its protected corner lift. Several other central front samples exceed 1 m/m because of the sharper mesh-protection fade. The receipt's `centralStraightDeckFit` is only a test of one hypothetical narrow entrance deck; it is not a walkable terrain, complete frontage, racer access or art-parity result.

## Recommended next scope, not implemented here

Preserve the track and horizontal composition, but author the existing separate workshop bays with individual Y anchors rather than forcing three buildings and their court onto one rigid platform. `constraints.json` already supplies per-bay frontage ground values as starting data; they still need width, terrain-mesh and source hierarchy checks. This would let each entrance follow nearby ground while moving the larger transitions into deliberate side/rear terraces. Connecting cloth, pipework, platforms and collision surfaces would need explicit authoring; merely changing three transforms is not a finished solution.

The 4.15 m² intersection appears to lie in the district foundation's spare border, based on the previous source-bounds audit. A narrowly authored foundation trim could be checked without relocating the workshop meshes. It must be validated against the exact current source asset before use. Near that junction, locally finer terrain topology or a separately constructed side return could reduce the wide low strip required by the existing six-metre mesh. Neither change is part of the current authorized stage.

If whole-kit rigid anchoring and the full existing foundation rectangles remain mandatory, retain round29 and treat this study as evidence that a globally coherent low paddock needs a changed construction contract. Do not disguise these differences with extra stairs, scatter, overlay planes or a relaxed road guard.

## Reproduction and files

Run `probe.ts` through Vite SSR middleware after coordination with the parent; it performs the bounded three-seed field/route/mesh study and writes the receipt/floats. Run `constraints.ts` afterward for all-bay endpoint bounds and exact source-rectangle intersections. Both close their Vite wrapper in the documented caller pattern used by the round29 probes. They do not start a browser. `round29-reference.ts` is a source receipt, not an adapter to copy into runtime.

Current V3 files: `PitPadField.ts`, `probe.ts`, `receipt.json`, `seed-*.f32`, `constraints.ts`, `constraints.json`, `compare.mjs`, `comparison.json`, copied camera inputs and `verification.json`. Preserve all four rejected variant directories when reviewing or replacing this candidate. No runtime integration is recommended on the evidence above.
